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
            // Image validation and upload logic...
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

        // Update logic...
        comment.setContent(request.getContent());

        CommentEntity updatedComment = commentRepository.save(comment);
        searchIndexService.indexComment(updatedComment);
        return convertToResponseDto(updatedComment, currentUserId);
    }

    // 댓글 삭제
    @Transactional
    public void deleteComment(Long commentId, Long currentUserId) {
        CommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new RuntimeException("댓글을 삭제할 권한이 없습니다.");
        }

        PostEntity post = comment.getPost();
        post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
        postRepository.save(post);

        commentRepository.delete(comment);
        searchIndexService.deleteCommentIndex(commentId);
        redisFeedIntegration.handleCommentDeleted(commentId, currentUserId);
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
                .updatedAt(comment.getUpdatedAt() != null ? comment.getUpdatedAt().toString() : null)
                .build();
    }
}
