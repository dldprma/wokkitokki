package com.winter.wokkitokki.post.service;

import com.winter.wokkitokki.post.dto.FeedItemDto;
import com.winter.wokkitokki.post.dto.PostResponseDto;
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
public class RedisFeedIntegration {

    private final RedisFeedService redisFeedService;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final RepostRepository repostRepository;

    /**
     * 피드 조회 (Redis 기반) - PostService 의존성 제거
     */
    public Page<PostResponseDto> getFeedPosts(Long userId, Pageable pageable) {
        try {
            Map<PostEntity, FeedItemDto> postsWithMetadata = redisFeedService.getFeedPostsWithMetadata(userId, pageable);
            UserEntity currentUser = userRepository.findById(userId).orElse(null);

            // PostService 의존성 없이 직접 DTO 변환
            List<PostResponseDto> feedPosts = convertToResponseDtos(postsWithMetadata, currentUser);

            return new PageImpl<>(feedPosts, pageable, feedPosts.size());
        } catch (Exception e) {
            log.error("Failed to get feed posts from Redis for user: {}", userId, e);
            throw new RuntimeException("피드 조회에 실패했습니다.", e);
        }
    }

    /**
     * 피드용 DTO 변환 (PostService와 독립적)
     */
    private List<PostResponseDto> convertToResponseDtos(Map<PostEntity, FeedItemDto> postsWithMetadata, UserEntity currentUser) {
        if (postsWithMetadata.isEmpty()) {
            return Collections.emptyList();
        }

        List<PostEntity> posts = new ArrayList<>(postsWithMetadata.keySet());
        List<Long> postIds = posts.stream()
                .map(PostEntity::getId)
                .collect(Collectors.toList());

        // 한번의 쿼리로 모든 좋아요/리포스트 상태 조회
        final Set<Long> likedPostIds;
        final Set<Long> repostedPostIds;

        if (currentUser != null) {
            likedPostIds = new HashSet<>(likeRepository.findLikedPostIdsByUserAndPostIds(currentUser.getId(), postIds));
            repostedPostIds = new HashSet<>(repostRepository.findRepostedPostIdsByUserAndPostIds(currentUser.getId(), postIds));

        } else {
            likedPostIds = Collections.emptySet();
            repostedPostIds = Collections.emptySet();
        }

        // DTO 변환 (순서 유지)
        List<PostResponseDto> result = new ArrayList<>();
        for (Map.Entry<PostEntity, FeedItemDto> entry : postsWithMetadata.entrySet()) {
            PostEntity post = entry.getKey();
            FeedItemDto feedItem = entry.getValue();

            PostResponseDto dto = new PostResponseDto();
            dto.setId(post.getId());
            dto.setContent(post.getContent());
            dto.setImgUrl(post.getImgUrl());
            dto.setAuthorName(post.getUser().getFullName());
            dto.setAuthorUsername(post.getUser().getUsername());
            dto.setAuthorProfileImg(post.getUser().getProfileImgUrl());
            dto.setLikeCount(post.getLikeCount());
            dto.setRepostCount(post.getRepostCount());
            dto.setCreatedAt(post.getCreatedAt().toString());
            dto.setDeleted(post.isDeleted());

            // 리포스트 정보 설정
            if ("REPOST".equals(feedItem.getType())) {
                dto.setRepost(true);
                dto.setRepostedBy(feedItem.getRepostUsername());
                dto.setRepostedAt(feedItem.getSortTime().toString());
                dto.setOriginalCreatedAt(post.getCreatedAt().toString());
            }

            if (currentUser != null) {
                boolean isLiked = likedPostIds.contains(post.getId());
                boolean isReposted = repostedPostIds.contains(post.getId());

                dto.setLiked(isLiked);
                dto.setReposted(isReposted);

                boolean isOwner = post.getUser().getId().equals(currentUser.getId());
                dto.setCanEdit(isOwner && !post.isDeleted());
                dto.setCanDelete(isOwner && !post.isDeleted());
            } else {
                dto.setLiked(false);
                dto.setReposted(false);
                dto.setCanEdit(false);
                dto.setCanDelete(false);
            }

            result.add(dto);
        }
        return result;
    }

    public void handleRepostCreated(Long postId, Long userId, LocalDateTime repostedAt){
        try{
            redisFeedService.addRepostToFollowerFeeds(postId, userId, repostedAt);
        }catch (Exception e){
            log.error("Failed to update Redis feed for repost creation", e);
        }
    }

    public void handleRepostRemoved(Long postId, Long userId) {
        try {
            redisFeedService.removeRepostFromFollowerFeeds(postId, userId);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for repost removal", e);
        }
    }

    /**
     * 게시글 작성 후 Redis 피드 업데이트
     */
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

    /**
     * 게시글 삭제 후 Redis 피드에서 제거
     */
    public void handlePostDeleted(Long postId, Long userId) {
        try {
            redisFeedService.removePostFromAllFeeds(postId, userId);
            log.debug("Redis feed updated for deleted post: {}", postId);
        } catch (Exception e) {
            log.error("Failed to remove post from Redis feed: {}", postId, e);
        }
    }

    /**
     * 팔로우 후 Redis 피드 업데이트
     */
    public void handleUserFollowed(Long followerId, Long followingId) {
        try {
            redisFeedService.addUserPostsToFeed(followerId, followingId);
            log.debug("Redis feed updated for follow: {} -> {}", followerId, followingId);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for follow: {} -> {}", followerId, followingId, e);
        }
    }

    /**
     * 언팔로우 후 Redis 피드에서 제거
     */
    public void handleUserUnfollowed(Long followerId, Long unfollowingId) {
        try {
            redisFeedService.removeUserPostsFromFeed(followerId, unfollowingId);
            log.debug("Redis feed updated for unfollow: {} -> {}", followerId, unfollowingId);
        } catch (Exception e) {
            log.error("Failed to update Redis feed for unfollow: {} -> {}", followerId, unfollowingId, e);
        }
    }

    /**
     * 사용자 피드 캐시 무효화
     */
    public void invalidateUserFeedCache(Long userId) {
        try {
            redisFeedService.invalidateFeedCache(userId);
            log.debug("Redis feed cache invalidated for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to invalidate Redis feed cache for user: {}", userId, e);
        }
    }
}