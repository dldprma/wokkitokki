package com.winter.wokkitokki.post.service;

import com.winter.wokkitokki.comment.dto.CommentResponseDto;
import com.winter.wokkitokki.comment.entity.CommentEntity;
import com.winter.wokkitokki.comment.repository.CommentRepository;
import com.winter.wokkitokki.post.dto.FeedItemDto;
import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.dto.PostWithCommentsDto;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.entity.RepostEntity;
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
public class RedisFeedIntegration {

    private final RedisFeedService redisFeedService;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final RepostRepository repostRepository;
    private final CommentRepository commentRepository;

    /**
     * 통합 피드 조회 (Post + Comment)
     */
    public Page<Object> getFeedItems(Long userId, Pageable pageable) {
        try {
            // 먼저 전체 피드 개수를 조회
            long totalElements = redisFeedService.getTotalFeedCount(userId);
            
            Map<Object, FeedItemDto> itemsWithMetadata = redisFeedService.getFeedItemsWithMetadata(userId, pageable);
            UserEntity currentUser = userRepository.findById(userId).orElse(null);

            List<Object> feedItems = convertToResponseObjects(itemsWithMetadata, currentUser);


            return new PageImpl<>(feedItems, pageable, totalElements);
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
                
                if ("POST_WITH_COMMENT".equals(feedItem.getType()) || "POST_WITH_REPLY".equals(feedItem.getType())) {
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
                .authorId(post.getUser().getId())
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
            // repostUsername이 null인 경우 repostUserId로 사용자명 조회
            String repostedBy = feedItem.getRepostUsername();
            if (repostedBy == null && feedItem.getRepostUserId() != null) {
                UserEntity repostUser = userRepository.findById(feedItem.getRepostUserId()).orElse(null);
                if (repostUser != null) {
                    repostedBy = repostUser.getUsername();
                }
            }
            dto.setRepostedBy(repostedBy);
            dto.setRepostedAt(feedItem.getSortTime().toString());
            dto.setOriginalCreatedAt(post.getCreatedAt().toString());
        }

        if (currentUser != null) {
            dto.setLiked(likedPostIds.contains(post.getId()));
            dto.setReposted(repostedPostIds.contains(post.getId()));

            // REPOST 타입이 아닌 경우에만 현재 사용자의 리포스트 상태를 확인
            if (repostedPostIds.contains(post.getId()) && !"REPOST".equals(feedItem.getType()) && dto.getRepostedBy() == null) {
                // 현재 사용자가 이 게시글을 리포스트한 경우만
                RepostEntity repost = repostRepository.findByUserAndPost(currentUser, post);
                if (repost != null) {
                    dto.setRepostedBy(currentUser.getUsername());
                    dto.setRepostedAt(repost.getRepostedAt().toString());
                }
            }

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

        // 리포스트 정보 확인
        String repostedBy = null;
        String repostedAt = null;
        if (isReposted && currentUser != null) {
            // FeedItem에서 리포스트 정보 가져오기
            if (feedItem != null && feedItem.getRepostUserId() != null) {
                UserEntity repostUser = userRepository.findById(feedItem.getRepostUserId()).orElse(null);
                if (repostUser != null) {
                    repostedBy = repostUser.getUsername();
                    // FeedItem의 sortTime을 리포스트 시간으로 사용
                    repostedAt = feedItem.getSortTime().toString();
                }
            }
        }

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
                .repostedBy(repostedBy)
                .repostedAt(repostedAt)
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
                
                // 대댓글인 경우 상위 댓글도 먼저 추가
                if ("POST_WITH_REPLY".equals(feedItem.getType()) && feedItem.getParentCommentId() != null) {
                    CommentEntity parentComment = commentRepository.findById(feedItem.getParentCommentId()).orElse(null);
                    if (parentComment != null) {
                        CommentResponseDto parentCommentDto = convertCommentToResponseDto(
                            parentComment, feedItem, currentUser, Collections.emptySet(), Collections.emptySet());
                        relevantComments.add(parentCommentDto);
                    }
                }
                
                // 현재 댓글(대댓글) 추가
                CommentResponseDto commentDto = convertCommentToResponseDto(
                    comment, feedItem, currentUser, Collections.emptySet(), Collections.emptySet());
                relevantComments.add(commentDto);
            }
        }
        
        // 활동 요약 및 최신 활동 시간 생성
        String activitySummary = "";
        String lastActivityAt = post.getCreatedAt().toString(); // 기본값은 게시글 생성시간

        if (!relevantComments.isEmpty()) {
            CommentResponseDto targetComment = relevantComments.get(relevantComments.size() - 1); // 마지막 댓글(실제 활동한 댓글)
            lastActivityAt = targetComment.getCreatedAt(); // 최신 활동 시간은 댓글 생성시간으로 업데이트

            if (currentUser != null && targetComment.getAuthorId().equals(currentUser.getId())) {
                if ("POST_WITH_REPLY".equals(feedItem.getType())) {
                    activitySummary = "내가 대댓글을 남겼습니다";
                } else {
                    activitySummary = "내가 댓글을 남겼습니다";
                }
            } else {
                if ("POST_WITH_REPLY".equals(feedItem.getType())) {
                    activitySummary = targetComment.getAuthorName() + "님이 대댓글을 남겼습니다";
                } else {
                    activitySummary = targetComment.getAuthorName() + "님이 댓글을 남겼습니다";
                }
            }
        }
        
        PostWithCommentsDto resultDto = PostWithCommentsDto.builder()
                .post(postDto)
                .relevantComments(relevantComments)
                .feedType("POST_WITH_COMMENTS")
                .lastActivityAt(lastActivityAt)
                .activitySummary(activitySummary)
                .build();


        return resultDto;
    }

    // === 게시글 관련 이벤트 핸들러 ===
    
    public void handlePostCreated(PostEntity post) {
        try {
            redisFeedService.addPostToFollowerFeeds(
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
            redisFeedService.addPostRepostToFollowerFeeds(postId, userId, repostedAt);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for post repost creation", e);
        }
    }

    public void handlePostRepostRemoved(Long postId, Long userId) {
        try {
            redisFeedService.removePostRepostFromFollowerFeeds(postId, userId);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for post repost removal", e);
        }
    }

    public void handlePostDeleted(Long postId, Long userId) {
        try {
            redisFeedService.removePostFromAllFeeds(postId, userId);
            log.debug("Redis feed updated for deleted post: {}", postId);
        } catch (Exception e) {
            log.error("Failed to remove post from Redis feed: {}", postId, e);
        }
    }

    // === 댓글 관련 이벤트 핸들러 ===
    
    public void handleCommentCreated(CommentEntity comment) {
        try {
            PostEntity originalPost = comment.getPost();
            Long commentAuthorId = comment.getAuthor().getId();
            Long postAuthorId = originalPost.getUser().getId();
            
            // 1. 댓글 작성자의 팔로워들에게 알림 (기존 로직)
            redisFeedService.addPostWithCommentToFollowerFeeds(
                    originalPost.getId(),
                    commentAuthorId,
                    comment.getCreatedAt(),
                    comment.getId()
            );
            
            // 2. 게시글 작성자의 피드에도 추가 (댓글 작성자와 다른 경우만)
            if (!commentAuthorId.equals(postAuthorId)) {
                redisFeedService.addPostWithCommentToUserFeed(
                        originalPost.getId(),
                        commentAuthorId,
                        comment.getCreatedAt(),
                        comment.getId(),
                        postAuthorId  // 게시글 작성자의 피드에 추가
                );
            }
            
            log.debug("Redis feed updated for post {} with new comment: {}", originalPost.getId(), comment.getId());
        } catch (Exception e) {
            log.error("Failed to update Redis feed for comment creation: {}", comment.getId(), e);
        }
    }

    public void handleCommentRepostCreated(Long commentId, Long userId, LocalDateTime repostedAt) {
        try {
            redisFeedService.addCommentRepostToFollowerFeeds(commentId, userId, repostedAt);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for comment repost creation", e);
        }
    }

    public void handleCommentRepostRemoved(Long commentId, Long userId) {
        try {
            redisFeedService.removeCommentRepostFromFollowerFeeds(commentId, userId);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for comment repost removal", e);
        }
    }

    public void handleCommentDeleted(Long commentId, Long userId) {
        try {
            redisFeedService.removeCommentFromAllFeeds(commentId, userId);
            log.debug("Redis feed updated for deleted comment: {}", commentId);
        } catch (Exception e) {
            log.error("Failed to remove comment from Redis feed: {}", commentId, e);
        }
    }

    // === 사용자 관련 이벤트 핸들러 ===
    
    public void invalidateUserFeedCache(Long userId) {
        try {
            redisFeedService.invalidateFeedCache(userId);
            log.debug("Redis feed cache invalidated for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to invalidate Redis feed cache for user: {}", userId, e);
        }
    }
    
    public void handleUserDeleted(Long userId) {
        try {
            // 1. 해당 사용자의 피드 캐시 완전 삭제
            redisFeedService.deleteFeedCache(userId);
            
            // 2. 해당 사용자가 작성한 모든 게시글과 댓글을 다른 사용자들의 피드에서 제거
            redisFeedService.removeUserContentFromAllFeeds(userId);
            
            // 3. 해당 사용자의 팔로워들의 피드 캐시 무효화 (재구성 필요)
            redisFeedService.invalidateFollowerFeedCaches(userId);
        } catch (Exception e) {
            log.error("Failed to cleanup Redis feed data for deleted user: {}", userId, e);
        }
    }
}
