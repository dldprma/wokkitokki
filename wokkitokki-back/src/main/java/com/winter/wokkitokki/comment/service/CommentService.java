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
import com.winter.wokkitokki.post.service.RedisFeedIntegration;
import com.winter.wokkitokki.reels.entity.ReelsEntity;
import com.winter.wokkitokki.reels.repository.ReelsRepository;
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
    private final ReelsRepository reelsRepository;
    private final UserRepository userRepository;
    private final FileService fileService;
    private final SearchIndexService searchIndexService;
    private final RedisFeedIntegration redisFeedIntegration;

    // 게시글별 댓글 목록 조회
    public Page<CommentResponseDto> getCommentsByPost(Long postId, int page, int size, Long currentUserId) {
        postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        Pageable pageable = PageRequest.of(page, size);
        Page<CommentEntity> commentPage = commentRepository.findByPostIdAndParentCommentIsNull(postId, pageable);

        return commentPage.map(comment -> convertToResponseDto(comment, currentUserId));
    }

    // 댓글별 대댓글 목록 조회
    public Page<CommentResponseDto> getRepliesByComment(Long commentId, int page, int size, Long currentUserId) {
        commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        Pageable pageable = PageRequest.of(page, size);
        Page<CommentEntity> replyPage = commentRepository.findByParentCommentId(commentId, pageable);

        return replyPage.map(reply -> convertToResponseDto(reply, currentUserId));
    }

    // 댓글 작성
    @Transactional
    public CommentResponseDto createComment(Long postId, CommentCreateRequestDto request,
                                           MultipartFile imageFile, Long currentUserId) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        UserEntity author = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        boolean hasContent = request.getContent() != null && !request.getContent().trim().isEmpty();
        boolean hasImage = imageFile != null && !imageFile.isEmpty();

        if (!hasContent && !hasImage) {
            throw new RuntimeException("댓글 내용 또는 이미지를 입력해주세요.");
        }

        if (request.getContent() != null && request.getContent().length() > 500) {
            throw new RuntimeException("댓글은 500자 이내로 작성해주세요.");
        }

        CommentEntity.CommentEntityBuilder commentBuilder = CommentEntity.builder()
                .content(hasContent ? request.getContent().trim() : "")
                .author(author)
                .post(post);

        if (hasImage) {
            try {
                // 이미지 파일 검증
                String originalFilename = imageFile.getOriginalFilename();
                if (originalFilename == null) {
                    throw new RuntimeException("파일 이름이 유효하지 않습니다.");
                }

                String fileExtension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
                if (!List.of(".jpg", ".jpeg", ".png", ".gif", ".webp").contains(fileExtension)) {
                    throw new RuntimeException("지원되지 않는 이미지 형식입니다. (jpg, jpeg, png, gif, webp만 가능)");
                }

                // 파일 크기 검증 (5MB 제한)
                if (imageFile.getSize() > 5 * 1024 * 1024) {
                    throw new RuntimeException("이미지 크기는 5MB를 초과할 수 없습니다.");
                }

                // 이미지 업로드
                String imageUrl = fileService.uploadFile(imageFile, "comments", currentUserId);
                commentBuilder.imageUrl(imageUrl);
                
                log.info("댓글 이미지 업로드 완료: {}", imageUrl);
            } catch (Exception e) {
                log.error("댓글 이미지 업로드 실패", e);
                throw new RuntimeException("이미지 업로드에 실패했습니다: " + e.getMessage());
            }
        }

        if (request.getParentCommentId() != null) {
            CommentEntity parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new RuntimeException("부모 댓글을 찾을 수 없습니다."));
            commentBuilder.parentComment(parentComment);
        }

        CommentEntity savedComment = commentRepository.save(commentBuilder.build());

        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

         searchIndexService.indexComment(savedComment);
        redisFeedIntegration.handleCommentCreated(savedComment);

        return convertToResponseDto(savedComment, currentUserId);
    }

    // 댓글 수정
    @Transactional
    public CommentResponseDto updateComment(Long commentId, CommentUpdateRequestDto request,
                                           MultipartFile imageFile, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new RuntimeException("댓글을 수정할 권한이 없습니다.");
        }

        // 내용 업데이트
        boolean hasContent = request.getContent() != null && !request.getContent().trim().isEmpty();
        boolean hasImage = imageFile != null && !imageFile.isEmpty();
        
        if (!hasContent && !hasImage && comment.getImageUrl() == null) {
            throw new RuntimeException("댓글 내용 또는 이미지를 입력해주세요.");
        }

        if (request.getContent() != null && request.getContent().length() > 500) {
            throw new RuntimeException("댓글은 500자 이내로 작성해주세요.");
        }

        // 내용 업데이트
        if (hasContent) {
            comment.setContent(request.getContent().trim());
        }

        // 이미지 처리
        if (hasImage) {
            try {
                // 이미지 파일 검증
                String originalFilename = imageFile.getOriginalFilename();
                if (originalFilename == null) {
                    throw new RuntimeException("파일 이름이 유효하지 않습니다.");
                }

                String fileExtension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
                if (!List.of(".jpg", ".jpeg", ".png", ".gif", ".webp").contains(fileExtension)) {
                    throw new RuntimeException("지원되지 않는 이미지 형식입니다. (jpg, jpeg, png, gif, webp만 가능)");
                }

                // 파일 크기 검증 (5MB 제한)
                if (imageFile.getSize() > 5 * 1024 * 1024) {
                    throw new RuntimeException("이미지 크기는 5MB를 초과할 수 없습니다.");
                }

                // 기존 이미지 삭제 (있는 경우)
                if (comment.getImageUrl() != null) {
                    try {
                        fileService.deleteFile(comment.getImageUrl());
                    } catch (Exception e) {
                        log.warn("기존 댓글 이미지 삭제 실패: {}", e.getMessage());
                    }
                }

                // 새 이미지 업로드
                String imageUrl = fileService.uploadFile(imageFile, "comments", currentUserId);
                comment.setImageUrl(imageUrl);
                
                log.info("댓글 이미지 업데이트 완료: {}", imageUrl);
            } catch (Exception e) {
                log.error("댓글 이미지 업데이트 실패", e);
                throw new RuntimeException("이미지 업로드에 실패했습니다: " + e.getMessage());
            }
        }

        // 이미지 삭제 요청 처리 (removeImage가 true인 경우)
        if (Boolean.TRUE.equals(request.getRemoveImage()) && comment.getImageUrl() != null) {
            try {
                fileService.deleteFile(comment.getImageUrl());
                comment.setImageUrl(null);
                log.info("댓글 이미지 삭제 완료");
            } catch (Exception e) {
                log.warn("댓글 이미지 삭제 실패: {}", e.getMessage());
                comment.setImageUrl(null); // 삭제 실패해도 URL은 제거
            }
        }

        CommentEntity updatedComment = commentRepository.save(comment);
         searchIndexService.indexComment(updatedComment);
        return convertToResponseDto(updatedComment, currentUserId);
    }

    // 댓글 수정 (이미지 포함 - 멀티파트 전용)
    @Transactional
    public CommentResponseDto updateCommentWithImage(Long commentId, CommentUpdateRequestDto request, 
                                                   MultipartFile imageFile, boolean removeImage, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new RuntimeException("댓글을 수정할 권한이 없습니다.");
        }

        // 내용 업데이트
        if (request.getContent() != null) {
            comment.setContent(request.getContent());
        }

        // 이미지 제거 요청 처리
        if (removeImage && comment.getImageUrl() != null) {
            try {
                fileService.deleteFile(comment.getImageUrl());
                comment.setImageUrl(null);
                log.info("댓글 이미지 삭제 완료");
            } catch (Exception e) {
                log.warn("댓글 이미지 삭제 실패: {}", e.getMessage());
                comment.setImageUrl(null); // 삭제 실패해도 URL은 제거
            }
        }

        // 새 이미지 업로드 처리
        if (imageFile != null && !imageFile.isEmpty()) {
            try {
                // 기존 이미지가 있으면 삭제
                if (comment.getImageUrl() != null) {
                    fileService.deleteFile(comment.getImageUrl());
                }
                
                String imageUrl = fileService.uploadFile(imageFile, "comments", currentUserId);
                comment.setImageUrl(imageUrl);
                log.info("댓글 이미지 업데이트 완료: {}", imageUrl);
            } catch (Exception e) {
                log.error("댓글 이미지 업데이트 실패", e);
                throw new RuntimeException("이미지 업로드에 실패했습니다: " + e.getMessage());
            }
        }

        CommentEntity updatedComment = commentRepository.save(comment);
         searchIndexService.indexComment(updatedComment);
        return convertToResponseDto(updatedComment, currentUserId);
    }

    // 댓글 삭제 (논리적 삭제)
    @Transactional
    public void deleteComment(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new RuntimeException("댓글을 삭제할 권한이 없습니다.");
        }

        // 이미 삭제된 댓글인지 확인
        if (comment.isDeleted()) {
            throw new RuntimeException("이미 삭제된 댓글입니다.");
        }

        // 논리적 삭제 처리 (이미지는 유지)
        comment.markAsDeleted(currentUserId);
        
        // 게시글의 댓글 수 감소
        PostEntity post = comment.getPost();
        post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
        postRepository.save(post);

        // 댓글 저장 (논리적 삭제 상태로)
        commentRepository.save(comment);
        
        // 검색 인덱스에서 제거
         searchIndexService.deleteCommentIndex(commentId);
        
        // Redis 피드에서 제거
        redisFeedIntegration.handleCommentDeleted(commentId, currentUserId);
        
        log.info("댓글 논리적 삭제 완료: commentId={}, deletedBy={}", commentId, currentUserId);
    }

    // 댓글 완전 삭제 (관리자용 또는 내부 사용)
    @Transactional
    public void permanentDeleteComment(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new RuntimeException("댓글을 삭제할 권한이 없습니다.");
        }

        // 댓글에 첨부된 이미지 삭제
        if (comment.getImageUrl() != null) {
            try {
                fileService.deleteFile(comment.getImageUrl());
                log.info("댓글 완전 삭제 시 이미지 삭제 완료: {}", comment.getImageUrl());
            } catch (Exception e) {
                log.warn("댓글 완전 삭제 시 이미지 삭제 실패: {}", e.getMessage());
            }
        }

        PostEntity post = comment.getPost();
        if (!comment.isDeleted()) {
            // 논리적 삭제되지 않은 댓글의 경우만 카운트 감소
            post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
            postRepository.save(post);
        }

        commentRepository.delete(comment);
         searchIndexService.deleteCommentIndex(commentId);
        redisFeedIntegration.handleCommentDeleted(commentId, currentUserId);
        
        log.info("댓글 완전 삭제 완료: commentId={}, deletedBy={}", commentId, currentUserId);
    }

    // 댓글 복구 (관리자용)
    @Transactional
    public CommentResponseDto restoreComment(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        if (!comment.isDeleted()) {
            throw new RuntimeException("삭제되지 않은 댓글입니다.");
        }

        // 댓글 복구
        comment.restore();
        
        // 게시글의 댓글 수 증가
        PostEntity post = comment.getPost();
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        // 댓글 저장 (복구된 상태로)
        CommentEntity restoredComment = commentRepository.save(comment);
        
        // 검색 인덱스에 다시 추가
         searchIndexService.indexComment(restoredComment);
        
        log.info("댓글 복구 완료: commentId={}, restoredBy={}", commentId, currentUserId);
        return convertToResponseDto(restoredComment, currentUserId);
    }

    // 댓글 좋아요 토글
    @Transactional
    public CommentLikeResponseDto toggleLike(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));
        UserEntity currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Optional<LikeEntity> likeOpt = likeRepository.findByUserAndComment(currentUser, comment);

        if (likeOpt.isPresent()) {
            likeRepository.delete(likeOpt.get());
            
            // 댓글 좋아요 카운트 감소
            int currentCount = comment.getLikeCount();
            int newCount = Math.max(0, currentCount - 1);
            comment.setLikeCount(newCount);
            commentRepository.save(comment);
            
             searchIndexService.updateCommentStats(commentId);
            return new CommentLikeResponseDto(false, comment.getLikeCount(), "댓글 좋아요를 취소했습니다.");
        } else {
            LikeEntity like = new LikeEntity();
            like.setUser(currentUser);
            like.setComment(comment);
            likeRepository.save(like);
            
            // 댓글 좋아요 카운트 증가
            comment.setLikeCount(comment.getLikeCount() + 1);
            commentRepository.save(comment);
            
             searchIndexService.updateCommentStats(commentId);
            return new CommentLikeResponseDto(true, comment.getLikeCount(), "댓글에 좋아요를 눌렀습니다.");
        }
    }

    // 댓글 리포스트 토글
    @Transactional
    public CommentRepostResponseDto toggleRepost(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));
        UserEntity currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Optional<RepostEntity> repostOpt = repostRepository.findByUserAndComment(currentUser, comment);

        if (repostOpt.isPresent()) {
            repostRepository.delete(repostOpt.get());
            
            // 댓글 리포스트 카운트 감소
            int currentCount = comment.getRepostCount();
            int newCount = Math.max(0, currentCount - 1);
            comment.setRepostCount(newCount);
            commentRepository.save(comment);
            
             searchIndexService.updateCommentStats(commentId);
            redisFeedIntegration.handleCommentRepostRemoved(commentId, currentUserId);
            return new CommentRepostResponseDto(false, comment.getRepostCount(), "댓글 리포스트를 취소했습니다.");
        } else {
            RepostEntity repost = new RepostEntity();
            repost.setUser(currentUser);
            repost.setComment(comment);
            repost.setRepostedAt(LocalDateTime.now());
            repostRepository.save(repost);
            
            // 댓글 리포스트 카운트 증가
            comment.setRepostCount(comment.getRepostCount() + 1);
            commentRepository.save(comment);
            
             searchIndexService.updateCommentStats(commentId);
            redisFeedIntegration.handleCommentRepostCreated(commentId, currentUserId, repost.getRepostedAt());
            return new CommentRepostResponseDto(true, comment.getRepostCount(), "댓글을 리포스트했습니다.");
        }
    }

    // 댓글 상세조회 (대댓글 포함)
    public CommentDetailResponseDto getCommentDetail(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        // 댓글 정보 변환
        CommentResponseDto commentDto = convertToResponseDto(comment, currentUserId);

        // 대댓글들 조회 (페이징 없이 모든 대댓글)
        List<CommentEntity> replyEntities = commentRepository.findByParentCommentId(commentId, Pageable.unpaged()).getContent();
        List<CommentResponseDto> replies = replyEntities.stream()
                .map(reply -> convertToResponseDto(reply, currentUserId))
                .collect(Collectors.toList());

        return CommentDetailResponseDto.builder()
                .comment(commentDto)
                .replies(replies)
                .hasReplies(!replies.isEmpty())
                .replyCount(replies.size())
                .build();
    }

    private CommentResponseDto convertToResponseDto(CommentEntity comment, Long currentUserId) {
        boolean isLiked = false;
        boolean isReposted = false;
        boolean canEdit = false;
        boolean canDelete = false;

        if (currentUserId != null) {
            UserEntity currentUser = userRepository.findById(currentUserId).orElse(null);
            if (currentUser != null) {
                // 더 효율적으로 findBy 메서드로 존재 여부 확인
                isLiked = likeRepository.findByUserAndComment(currentUser, comment).isPresent();
                isReposted = repostRepository.findByUserAndComment(currentUser, comment).isPresent();
                boolean isOwner = comment.getAuthor().getId().equals(currentUserId);
                canEdit = isOwner;
                canDelete = isOwner;
            }
        }

        // 리포스트 정보 확인
        String repostedBy = null;
        String repostedAt = null;
        if (isReposted && currentUserId != null) {
            UserEntity currentUser = userRepository.findById(currentUserId).orElse(null);
            if (currentUser != null) {
                Optional<RepostEntity> repostOpt = repostRepository.findByUserAndComment(currentUser, comment);
                if (repostOpt.isPresent()) {
                    repostedBy = currentUser.getUsername();
                    repostedAt = repostOpt.get().getRepostedAt().toString();
                }
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
                .repostedBy(repostedBy)
                .repostedAt(repostedAt)
                .createdAt(comment.getCreatedAt().toString())
                .updatedAt(comment.getUpdatedAt() != null ? comment.getUpdatedAt().toString() : null)
                .build();
    }

    // 릴스별 댓글 목록 조회
    public Page<CommentResponseDto> getCommentsByReels(Long reelsId, int page, int size, Long currentUserId) {
        reelsRepository.findByIdAndDeletedFalse(reelsId)
                .orElseThrow(() -> new RuntimeException("릴스를 찾을 수 없습니다."));

        Pageable pageable = PageRequest.of(page, size);
        Page<CommentEntity> comments = commentRepository.findByReelsIdAndParentCommentIsNull(reelsId, pageable);

        return comments.map(comment -> convertToResponseDto(comment, currentUserId));
    }

    // 릴스에 댓글 작성
    @Transactional
    public CommentResponseDto createCommentOnReels(Long reelsId, CommentCreateRequestDto request, Long authorId) {
        ReelsEntity reels = reelsRepository.findByIdAndDeletedFalse(reelsId)
                .orElseThrow(() -> new RuntimeException("릴스를 찾을 수 없습니다."));

        UserEntity author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("작성자를 찾을 수 없습니다."));

        CommentEntity comment = CommentEntity.builder()
                .content(request.getContent())
                .author(author)
                .reels(reels)
                .parentComment(null)
                .imageUrl(null)
                .deleted(false)
                .likeCount(0)
                .repostCount(0)
                .replyCount(0)
                .build();

        CommentEntity savedComment = commentRepository.save(comment);

        // 릴스의 댓글 수 업데이트
        reels.setCommentCount(reels.getCommentCount() + 1);
        reelsRepository.save(reels);

        // 검색 인덱싱
        searchIndexService.indexComment(savedComment);

        log.info("릴스 댓글 작성 완료: 릴스ID={}, 댓글ID={}", reelsId, savedComment.getId());

        return convertToReelsCommentResponseDto(savedComment, authorId);
    }

    // 릴스에 대댓글 작성
    @Transactional
    public CommentResponseDto createReplyOnReels(Long reelsId, Long parentCommentId, CommentCreateRequestDto request, Long authorId) {
        ReelsEntity reels = reelsRepository.findByIdAndDeletedFalse(reelsId)
                .orElseThrow(() -> new RuntimeException("릴스를 찾을 수 없습니다."));

        CommentEntity parentComment = commentRepository.findById(parentCommentId)
                .orElseThrow(() -> new RuntimeException("부모 댓글을 찾을 수 없습니다."));

        if (!parentComment.getReels().getId().equals(reelsId)) {
            throw new RuntimeException("해당 릴스의 댓글이 아닙니다.");
        }

        UserEntity author = userRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("작성자를 찾을 수 없습니다."));

        CommentEntity reply = CommentEntity.builder()
                .content(request.getContent())
                .author(author)
                .reels(reels)
                .parentComment(parentComment)
                .imageUrl(null)
                .deleted(false)
                .likeCount(0)
                .repostCount(0)
                .replyCount(0)
                .build();

        CommentEntity savedReply = commentRepository.save(reply);

        // 부모 댓글의 대댓글 수 업데이트
        parentComment.setReplyCount(parentComment.getReplyCount() + 1);
        commentRepository.save(parentComment);

        // 릴스의 댓글 수 업데이트
        reels.setCommentCount(reels.getCommentCount() + 1);
        reelsRepository.save(reels);

        // 검색 인덱싱
        searchIndexService.indexComment(savedReply);

        log.info("릴스 대댓글 작성 완료: 릴스ID={}, 부모댓글ID={}, 대댓글ID={}", reelsId, parentCommentId, savedReply.getId());

        return convertToReelsCommentResponseDto(savedReply, authorId);
    }

    // 릴스 댓글용 DTO 변환 메서드
    private CommentResponseDto convertToReelsCommentResponseDto(CommentEntity comment, Long currentUserId) {
        boolean isLiked = false;
        boolean isReposted = false;
        boolean canEdit = false;
        boolean canDelete = false;

        if (currentUserId != null) {
            UserEntity currentUser = userRepository.findById(currentUserId).orElse(null);
            if (currentUser != null) {
                isLiked = likeRepository.existsByUserAndComment(currentUser, comment);
                isReposted = repostRepository.existsByUserAndComment(currentUser, comment);
                canEdit = comment.getAuthor().getId().equals(currentUserId);
                canDelete = comment.getAuthor().getId().equals(currentUserId);
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
                .postId(null) // 릴스 댓글이므로 null
                .reelsId(comment.getReels().getId()) // 릴스 ID 추가
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .likeCount(comment.getLikeCount())
                .repostCount(comment.getRepostCount())
                .replyCount(comment.getReplyCount())
                .isLiked(isLiked)
                .isReposted(isReposted)
                .canEdit(canEdit)
                .canDelete(canDelete)
                .createdAt(comment.getCreatedAt().toString())
                .updatedAt(comment.getUpdatedAt() != null ? comment.getUpdatedAt().toString() : null)
                .build();
    }
}
