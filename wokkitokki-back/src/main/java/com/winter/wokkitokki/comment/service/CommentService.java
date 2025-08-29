package com.winter.wokkitokki.comment.service;

import com.winter.wokkitokki.comment.dto.*;
import com.winter.wokkitokki.comment.entity.CommentEntity;
import com.winter.wokkitokki.comment.repository.CommentRepository;
import com.winter.wokkitokki.common.service.FileService;
import com.winter.wokkitokki.post.entity.LikeEntity;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.entity.RepostEntity;
import com.winter.wokkitokki.post.repository.LikeRepository;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.post.repository.RepostRepository;
import com.winter.wokkitokki.post.service.RedisFeedIntegrationV2;
import com.winter.wokkitokki.search.service.SearchIndexService;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class CommentService {

    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final RepostRepository repostRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final FileService fileService;
    private final SearchIndexService searchIndexService;
    private final RedisFeedIntegrationV2 redisFeedIntegrationV2;

    // 게시글별 댓글 목록 조회
    public List<CommentResponseDto> getCommentsByPost(Long postId, int page, int size, Long currentUserId) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        Pageable pageable = PageRequest.of(page, size);
        Page<CommentEntity> commentPage = commentRepository.findByPostIdAndParentCommentIsNull(postId, pageable);

        return commentPage.getContent().stream()
                .map(comment -> convertToResponseDto(comment, currentUserId))
                .collect(Collectors.toList());
    }

    // 댓글별 대댓글 목록 조회
    public List<CommentResponseDto> getRepliesByComment(Long commentId, int page, int size, Long currentUserId) {
        CommentEntity parentComment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        Pageable pageable = PageRequest.of(page, size);
        Page<CommentEntity> replyPage = commentRepository.findByParentCommentId(commentId, pageable);

        return replyPage.getContent().stream()
                .map(reply -> convertToResponseDto(reply, currentUserId))
                .collect(Collectors.toList());
    }

    // 댓글 작성
    @Transactional
    public CommentResponseDto createComment(Long postId, CommentCreateRequestDto request, 
                                           MultipartFile imageFile, Long currentUserId) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        UserEntity author = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 내용과 이미지 둘 다 없으면 에러
        boolean hasContent = request.getContent() != null && !request.getContent().trim().isEmpty();
        boolean hasImage = imageFile != null && !imageFile.isEmpty();

        if (!hasContent && !hasImage) {
            throw new RuntimeException("댓글 내용 또는 이미지를 입력해주세요.");
        }

        // 내용 길이 제한
        if (request.getContent() != null && request.getContent().length() > 500) {
            throw new RuntimeException("댓글은 500자 이내로 작성해주세요.");
        }

        CommentEntity.CommentEntityBuilder commentBuilder = CommentEntity.builder()
                .content(hasContent ? request.getContent().trim() : "")
                .author(author)
                .post(post);

        // 이미지 업로드 처리
        if (hasImage) {
            fileService.validateImageFile(imageFile);
            fileService.validateFileSize(imageFile, 5 * 1024 * 1024); // 5MB

            try {
                String imageUrl = fileService.uploadFile(imageFile, "comments");
                commentBuilder.imageUrl(imageUrl);
            } catch (Exception e) {
                throw new RuntimeException("이미지 업로드에 실패했습니다.", e);
            }
        }

        // 대댓글인 경우 부모 댓글 설정
        if (request.getParentCommentId() != null) {
            CommentEntity parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new RuntimeException("부모 댓글을 찾을 수 없습니다."));
            commentBuilder.parentComment(parentComment);
        }

        CommentEntity savedComment = commentRepository.save(commentBuilder.build());
        
        // 게시글 댓글 수 증가
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);
        
        // ElasticSearch 인덱싱
        searchIndexService.indexComment(savedComment);
        
        // Redis 피드 캐싱
        redisFeedIntegrationV2.handleCommentCreated(savedComment);
        
        return convertToResponseDto(savedComment, currentUserId);
    }

    // 댓글 수정
    @Transactional
    public CommentResponseDto updateComment(Long commentId, CommentUpdateRequestDto request, 
                                           MultipartFile imageFile, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        // 작성자 본인인지 확인
        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new RuntimeException("댓글을 수정할 권한이 없습니다.");
        }

        // 내용 검증 및 업데이트
        if (request.getContent() == null || request.getContent().trim().isEmpty()) {
            throw new RuntimeException("댓글 내용을 입력해주세요");
        }
        if (request.getContent().length() > 500) {
            throw new RuntimeException("댓글은 500자 이내로 작성해주세요");
        }
        comment.setContent(request.getContent().trim());
        comment.setUpdatedAt(LocalDateTime.now());

        // 이미지 삭제 요청이 있는 경우
        if (Boolean.TRUE.equals(request.getRemoveImage())) {
            if (comment.getImageUrl() != null && !comment.getImageUrl().isEmpty()) {
                log.info("댓글 이미지 논리적 삭제: {}", comment.getImageUrl());
            }
            comment.setImageUrl(null);
        }
        // 새 이미지가 있는 경우
        else if (imageFile != null && !imageFile.isEmpty()) {
            if (comment.getImageUrl() != null && !comment.getImageUrl().isEmpty()) {
                log.info("기존 댓글 이미지 교체: {}", comment.getImageUrl());
            }

            fileService.validateImageFile(imageFile);
            fileService.validateFileSize(imageFile, 5 * 1024 * 1024); // 5MB

            try {
                String imageUrl = fileService.uploadFile(imageFile, "comments");
                comment.setImageUrl(imageUrl);
            } catch (Exception e) {
                throw new RuntimeException("이미지 업로드에 실패했습니다.", e);
            }
        }

        CommentEntity updatedComment = commentRepository.save(comment);
        
        // ElasticSearch 인덱스 업데이트
        searchIndexService.indexComment(updatedComment);
        
        return convertToResponseDto(updatedComment, currentUserId);
    }

    // 댓글 삭제
    @Transactional
    public void deleteComment(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        // 작성자 본인인지 확인
        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new RuntimeException("댓글을 삭제할 권한이 없습니다.");
        }

        // 게시글 댓글 수 감소
        PostEntity post = comment.getPost();
        post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
        postRepository.save(post);
        
        commentRepository.delete(comment);
        
        // ElasticSearch 인덱스 삭제
        searchIndexService.deleteCommentIndex(commentId);
        
        // Redis 피드 캐싱 - 댓글 삭제
        redisFeedIntegrationV2.handleCommentDeleted(commentId, currentUserId);
    }

    // 댓글 좋아요 토글
    @Transactional
    public CommentLikeResponseDto toggleLike(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        UserEntity currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 기존 좋아요 확인
        boolean alreadyLiked = likeRepository.existsByUserAndComment(currentUser, comment);

        if (alreadyLiked) {
            Optional<LikeEntity> likeOpt = likeRepository.findByUserAndComment(currentUser, comment);
            if (likeOpt.isPresent()) {
                likeRepository.delete(likeOpt.get());
            }
            
            // ElasticSearch 통계 업데이트
            searchIndexService.updateCommentStats(commentId);
            
            return CommentLikeResponseDto.builder()
                    .isLiked(false)
                    .likeCount(comment.getLikeCount())
                    .message("댓글 좋아요를 취소했습니다.")
                    .build();
        } else {
            LikeEntity like = new LikeEntity();
            like.setUser(currentUser);
            like.setComment(comment);
            likeRepository.save(like);
            
            // ElasticSearch 통계 업데이트
            searchIndexService.updateCommentStats(commentId);
            
            return CommentLikeResponseDto.builder()
                    .isLiked(true)
                    .likeCount(comment.getLikeCount())
                    .message("댓글에 좋아요를 눌렀습니다.")
                    .build();
        }
    }

    // 댓글 리포스트 토글
    @Transactional
    public CommentRepostResponseDto toggleRepost(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        UserEntity currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 기존 리포스트 확인
        boolean alreadyReposted = repostRepository.existsByUserAndComment(currentUser, comment);

        if (alreadyReposted) {
            Optional<RepostEntity> repostOpt = repostRepository.findByUserAndComment(currentUser, comment);
            if (repostOpt.isPresent()) {
                repostRepository.delete(repostOpt.get());
            }
            
            // ElasticSearch 통계 업데이트
            searchIndexService.updateCommentStats(commentId);
            
            // Redis 피드 캐싱 - 댓글 리포스트 제거
            redisFeedIntegrationV2.handleCommentRepostRemoved(commentId, currentUserId);
            
            return CommentRepostResponseDto.builder()
                    .isReposted(false)
                    .repostCount(comment.getRepostCount())
                    .message("댓글 리포스트를 취소했습니다.")
                    .build();
        } else {
            RepostEntity repost = new RepostEntity();
            repost.setUser(currentUser);
            repost.setComment(comment);
            repost.setRepostedAt(LocalDateTime.now());
            repostRepository.save(repost);
            
            // ElasticSearch 통계 업데이트
            searchIndexService.updateCommentStats(commentId);
            
            // Redis 피드 캐싱 - 댓글 리포스트 추가
            redisFeedIntegrationV2.handleCommentRepostCreated(commentId, currentUserId, repost.getRepostedAt());
            
            return CommentRepostResponseDto.builder()
                    .isReposted(true)
                    .repostCount(comment.getRepostCount())
                    .message("댓글을 리포스트했습니다.")
                    .build();
        }
    }

    // Entity -> Response DTO 변환
    private CommentResponseDto convertToResponseDto(CommentEntity comment, Long currentUserId) {
        // 현재 사용자의 좋아요/리포스트 여부 확인
        boolean isLiked = false;
        boolean isReposted = false;
        boolean canEdit = false;
        boolean canDelete = false;

        if (currentUserId != null) {
            UserEntity currentUser = userRepository.findById(currentUserId).orElse(null);
            if (currentUser != null) {
                isLiked = comment.isLikedBy(currentUser);
                isReposted = comment.isRepostedBy(currentUser);
                
                // 작성자 본인인지 확인
                boolean isOwner = comment.getAuthor().getId().equals(currentUserId);
                canEdit = isOwner;
                canDelete = isOwner;
            }
        }

        return CommentResponseDto.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .imageUrl(comment.getImageUrl())
                .authorId(comment.getAuthor().getId())
                .authorName(comment.getAuthor().getFullName())
                .authorUsername(comment.getAuthor().getUsername())
                .authorProfileImg(comment.getAuthor().getProfileImgUrl())
                .postId(comment.getPost().getId())
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .likeCount(comment.getLikeCount())
                .repostCount(comment.getRepostCount())
                .replyCount(comment.getReplyCount())
                .isLiked(isLiked)
                .isReposted(isReposted)
                .canEdit(canEdit)
                .canDelete(canDelete)
                .createdAt(comment.getCreatedAt().toString())
                .updatedAt(comment.getUpdatedAt().toString())
                .build();
    }
}