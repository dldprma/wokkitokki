package com.winter.wokkitokki.post.service;

import com.winter.wokkitokki.comment.dto.CommentResponseDto;
import com.winter.wokkitokki.comment.entity.CommentEntity;
import com.winter.wokkitokki.comment.repository.CommentRepository;
import com.winter.wokkitokki.post.dto.FeedItemDto;
import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.dto.PostWithCommentsDto;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.LikeRepository;
import com.winter.wokkitokki.post.repository.RepostRepository;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class RedisFeedIntegrationV2 {

    private final RedisFeedServiceV2 redisFeedServiceV2;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final RepostRepository repostRepository;
    private final CommentRepository commentRepository;

    /**
     * 통합 피드 조회 (Post + Comment)
     */
    public Page<Object> getFeedItems(Long userId, Pageable pageable) {
        try {
            Map<Object, FeedItemDto> itemsWithMetadata = redisFeedServiceV2.getFeedItemsWithMetadata(userId, pageable);
            UserEntity currentUser = userRepository.findById(userId).orElse(null);

            List<Object> feedItems = convertToResponseObjects(itemsWithMetadata, currentUser);
            return new PageImpl<>(feedItems, pageable, feedItems.size());
        } catch (Exception e) {
            log.error("Failed to get feed items from Redis for user: {}", userId, e);
            throw new RuntimeException("피드 조회에 실패했습니다.", e);
        }
    }

    /**
     * 피드용 DTO 변환 (Post + Comment 통합)
     */
    private List<Object> convertToResponseObjects(Map<Object, FeedItemDto> itemsWithMetadata, UserEntity currentUser) {
        if (itemsWithMetadata.isEmpty()) {
            return Collections.emptyList();
        }

        List<Object> entities = new ArrayList<>(itemsWithMetadata.keySet());
        List<Long> postIds = new ArrayList<>();
        List<Long> commentIds = new ArrayList<>();

        // 엔티티 타입별로 ID 수집
        for (Object entity : entities) {
            if (entity instanceof PostEntity) {
                postIds.add(((PostEntity) entity).getId());
            } else if (entity instanceof CommentEntity) {
                commentIds.add(((CommentEntity) entity).getId());
            }
        }

        // 좋아요/리포스트 상태 일괄 조회
        final Set<Long> likedPostIds;
        final Set<Long> repostedPostIds;
        final Set<Long> likedCommentIds;
        final Set<Long> repostedCommentIds;

        if (currentUser != null) {
            likedPostIds = postIds.isEmpty() ? Collections.emptySet() :
                    new HashSet<>(likeRepository.findLikedPostIdsByUserAndPostIds(currentUser.getId(), postIds));
            repostedPostIds = postIds.isEmpty() ? Collections.emptySet() :
                    new HashSet<>(repostRepository.findRepostedPostIdsByUserAndPostIds(currentUser.getId(), postIds));
            
            // Comment용 좋아요/리포스트 상태는 개별 조회 (repository에 batch 메서드 없음)
            likedCommentIds = new HashSet<>();
            repostedCommentIds = new HashSet<>();
            // 필요시 Comment용 배치 조회 메서드 추가
        } else {
            likedPostIds = Collections.emptySet();
            repostedPostIds = Collections.emptySet();
            likedCommentIds = Collections.emptySet();
            repostedCommentIds = Collections.emptySet();
        }

        // DTO 변환
        List<Object> result = new ArrayList<>();
        for (Map.Entry<Object, FeedItemDto> entry : itemsWithMetadata.entrySet()) {
            Object entity = entry.getKey();
            FeedItemDto feedItem = entry.getValue();

            if (entity instanceof PostEntity) {
                PostEntity post = (PostEntity) entity;
                
                if ("POST_WITH_COMMENT".equals(feedItem.getType())) {
                    // 게시글 + 관련 댓글 그룹화
                    PostWithCommentsDto groupDto = convertToPostWithCommentsDto(post, feedItem, currentUser, 
                            likedPostIds, repostedPostIds);
                    result.add(groupDto);
                } else {
                    // 일반 게시글
                    PostResponseDto dto = convertPostToResponseDto(post, feedItem, currentUser, 
                            likedPostIds, repostedPostIds);
                    result.add(dto);
                }
            } else if (entity instanceof CommentEntity) {
                CommentEntity comment = (CommentEntity) entity;
                CommentResponseDto dto = convertCommentToResponseDto(comment, feedItem, currentUser, 
                        likedCommentIds, repostedCommentIds);
                result.add(dto);
            }
        }

        return result;
    }

    private PostResponseDto convertPostToResponseDto(PostEntity post, FeedItemDto feedItem, 
                                                   UserEntity currentUser, Set<Long> likedPostIds, 
                                                   Set<Long> repostedPostIds) {
        PostResponseDto dto = PostResponseDto.builder()
                .id(post.getId())
                .content(post.getContent())
                .imgUrl(post.getImgUrl())
                .authorName(post.getUser().getFullName())
                .authorUsername(post.getUser().getUsername())
                .authorProfileImg(post.getUser().getProfileImgUrl())
                .likeCount(post.getLikeCount())
                .repostCount(post.getRepostCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt().toString())
                .deleted(post.isDeleted())
                .build();

        // 리포스트 정보 설정
        if ("REPOST".equals(feedItem.getType())) {
            dto.setRepost(true);
            dto.setRepostedBy(feedItem.getRepostUsername());
            dto.setRepostedAt(feedItem.getSortTime().toString());
            dto.setOriginalCreatedAt(post.getCreatedAt().toString());
        }

        if (currentUser != null) {
            dto.setLiked(likedPostIds.contains(post.getId()));
            dto.setReposted(repostedPostIds.contains(post.getId()));

            boolean isOwner = post.getUser().getId().equals(currentUser.getId());
            dto.setCanEdit(isOwner && !post.isDeleted());
            dto.setCanDelete(isOwner && !post.isDeleted());
        } else {
            dto.setLiked(false);
            dto.setReposted(false);
            dto.setCanEdit(false);
            dto.setCanDelete(false);
        }

        return dto;
    }

    private CommentResponseDto convertCommentToResponseDto(CommentEntity comment, FeedItemDto feedItem, 
                                                         UserEntity currentUser, Set<Long> likedCommentIds, 
                                                         Set<Long> repostedCommentIds) {
        boolean isLiked = currentUser != null && comment.isLikedBy(currentUser);
        boolean isReposted = currentUser != null && comment.isRepostedBy(currentUser);
        boolean isOwner = currentUser != null && comment.getAuthor().getId().equals(currentUser.getId());

        CommentResponseDto dto = CommentResponseDto.builder()
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
                .canEdit(isOwner)
                .canDelete(isOwner)
                .createdAt(comment.getCreatedAt().toString())
                .updatedAt(comment.getUpdatedAt() != null ? comment.getUpdatedAt().toString() : null)
                .build();

        return dto;
    }

    private PostWithCommentsDto convertToPostWithCommentsDto(PostEntity post, FeedItemDto feedItem, 
                                                           UserEntity currentUser, Set<Long> likedPostIds, 
                                                           Set<Long> repostedPostIds) {
        // 게시글 DTO 변환
        PostResponseDto postDto = convertPostToResponseDto(post, feedItem, currentUser, likedPostIds, repostedPostIds);
        
        // 해당 댓글 조회
        List<CommentResponseDto> relevantComments = new ArrayList<>();
        if (feedItem.getCommentId() != null) {
            CommentEntity comment = commentRepository.findById(feedItem.getCommentId()).orElse(null);
            if (comment != null) {
                CommentResponseDto commentDto = convertCommentToResponseDto(
                    comment, feedItem, currentUser, Collections.emptySet(), Collections.emptySet());
                relevantComments.add(commentDto);
            }
        }
        
        // 활동 요약 생성
        String activitySummary = "";
        if (!relevantComments.isEmpty()) {
            CommentResponseDto comment = relevantComments.get(0);
            if (currentUser != null && comment.getAuthorId().equals(currentUser.getId())) {
                activitySummary = "내가 댓글을 남겼습니다";
            } else {
                activitySummary = comment.getAuthorName() + "님이 댓글을 남겼습니다";
            }
        }
        
        return PostWithCommentsDto.builder()
                .post(postDto)
                .relevantComments(relevantComments)
                .feedType("POST_WITH_COMMENTS")
                .lastActivityAt(feedItem.getSortTime().toString())
                .activitySummary(activitySummary)
                .build();
    }

    // === 게시글 관련 이벤트 핸들러 ===
    
    public void handlePostCreated(PostEntity post) {
        try {
            redisFeedServiceV2.addPostToFollowerFeeds(
                    post.getId(),
                    post.getUser().getId(),
                    post.getCreatedAt()
            );
            log.debug("Redis feed updated for new post: {}", post.getId());
        } catch (Exception e) {
            log.error("Failed to update Redis feed for post creation: {}", post.getId(), e);
        }
    }

    public void handlePostRepostCreated(Long postId, Long userId, LocalDateTime repostedAt) {
        try {
            redisFeedServiceV2.addPostRepostToFollowerFeeds(postId, userId, repostedAt);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for post repost creation", e);
        }
    }

    public void handlePostRepostRemoved(Long postId, Long userId) {
        try {
            redisFeedServiceV2.removePostRepostFromFollowerFeeds(postId, userId);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for post repost removal", e);
        }
    }

    public void handlePostDeleted(Long postId, Long userId) {
        try {
            redisFeedServiceV2.removePostFromAllFeeds(postId, userId);
            log.debug("Redis feed updated for deleted post: {}", postId);
        } catch (Exception e) {
            log.error("Failed to remove post from Redis feed: {}", postId, e);
        }
    }

    // === 댓글 관련 이벤트 핸들러 ===
    
    public void handleCommentCreated(CommentEntity comment) {
        try {
            // 댓글이 달린 원본 게시글을 댓글 시간으로 피드에 다시 푸시
            // 단, 댓글 작성자나 팔로워들의 피드에만 나타남
            PostEntity originalPost = comment.getPost();
            Long commentAuthorId = comment.getAuthor().getId();
            
            // 원본 게시글을 댓글 시간으로 피드 상단에 올림 (댓글 정보와 함께)
            redisFeedServiceV2.addPostWithCommentToFollowerFeeds(
                    originalPost.getId(),
                    commentAuthorId,
                    comment.getCreatedAt(),
                    comment.getId()  // 관련 댓글 ID
            );
            
            log.debug("Redis feed updated for post {} with new comment: {}", originalPost.getId(), comment.getId());
        } catch (Exception e) {
            log.error("Failed to update Redis feed for comment creation: {}", comment.getId(), e);
        }
    }

    public void handleCommentRepostCreated(Long commentId, Long userId, LocalDateTime repostedAt) {
        try {
            redisFeedServiceV2.addCommentRepostToFollowerFeeds(commentId, userId, repostedAt);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for comment repost creation", e);
        }
    }

    public void handleCommentRepostRemoved(Long commentId, Long userId) {
        try {
            redisFeedServiceV2.removeCommentRepostFromFollowerFeeds(commentId, userId);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for comment repost removal", e);
        }
    }

    public void handleCommentDeleted(Long commentId, Long userId) {
        try {
            redisFeedServiceV2.removeCommentFromAllFeeds(commentId, userId);
            log.debug("Redis feed updated for deleted comment: {}", commentId);
        } catch (Exception e) {
            log.error("Failed to remove comment from Redis feed: {}", commentId, e);
        }
    }

    // === 사용자 관련 이벤트 핸들러 ===
    
    public void invalidateUserFeedCache(Long userId) {
        try {
            redisFeedServiceV2.invalidateFeedCache(userId);
            log.debug("Redis feed cache invalidated for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to invalidate Redis feed cache for user: {}", userId, e);
        }
    }
}