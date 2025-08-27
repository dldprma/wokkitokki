package com.winter.wokkitokki.post.service;

import com.winter.wokkitokki.post.dto.FeedItemDto;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.post.repository.RepostRepository;
import com.winter.wokkitokki.user.repository.FollowRepository;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisFeedService {
    private final RedisTemplate<String, Object> redisTemplate;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final RepostRepository repostRepository;

    private static final String FEED_KEY_PREFIX = "user:feed:";
    private static final int FEED_CACHE_SIZE = 1000;
    private static final long FEED_TTL = 24 * 60 * 60;

    // 모든 메서드에서 일관된 score 계산 사용
    private double calculateScore(LocalDateTime dateTime) {
        // 시간이 최근일수록 높은 score (내림차순 정렬)
        return dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    // 메타데이터를 포함한 피드 조회 (메인 메서드)
    public Map<PostEntity, FeedItemDto> getFeedPostsWithMetadata(Long userId, Pageable pageable) {
        String cacheKey = FEED_KEY_PREFIX + userId;

        // Redis에서 피드 조회
        Set<Object> cachedPostIds = redisTemplate.opsForZSet()
                .reverseRangeByScore(cacheKey, 0, Double.MAX_VALUE,
                        pageable.getOffset(), pageable.getPageSize());

        if (cachedPostIds != null && !cachedPostIds.isEmpty()) {
            log.info("Cache Hit - UserId: {}, Size: {}", userId, cachedPostIds.size());
            return buildPostEntitiesFromCacheWithMetadata(cachedPostIds, userId);
        }

        // Cache Miss - DB에서 조회
        log.info("Cache Miss - UserId: {}", userId);
        Map<PostEntity, FeedItemDto> dbPosts = getFeedPostsFromDBWithMetadata(userId, pageable);

        // Redis에 캐시 저장
        cacheFeedToRedis(userId, dbPosts);

        return dbPosts;
    }

    // 새 게시글 작성시 팔로워들 피드에 추가
    @Async
    public void addPostToFollowerFeeds(Long postId, Long authorId, LocalDateTime createdAt) {
        try {
            List<Long> followerIds = getFollowerIds(authorId);
            double score = calculateScore(createdAt); // 일관된 계산 방식

            for (Long followerId : followerIds) {
                String cacheKey = FEED_KEY_PREFIX + followerId;
                redisTemplate.opsForZSet().add(cacheKey, postId, score);
                redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
                redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
            }

            // 작성자 본인 피드에도 추가
            String authorCacheKey = FEED_KEY_PREFIX + authorId;
            redisTemplate.opsForZSet().add(authorCacheKey, postId, score);
            redisTemplate.opsForZSet().removeRange(authorCacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(authorCacheKey, Duration.ofSeconds(FEED_TTL));

            log.info("게시글 추가 - PostId: {}, AuthorId: {}, Score: {}, 시간: {}",
                    postId, authorId, score, createdAt);

        } catch (Exception e) {
            log.error("Failed to add post to follower feeds", e);
        }
    }

    // 게시글 삭제시 모든 피드에서 제거
    @Async
    public void removePostFromAllFeeds(Long postId, Long authorId) {
        try {
            // 팔로워 목록 조회
            List<Long> followerIds = getFollowerIds(authorId);

            // 각 팔로워의 피드에서 제거
            for (Long followerId : followerIds) {
                String cacheKey = FEED_KEY_PREFIX + followerId;
                redisTemplate.opsForZSet().remove(cacheKey, postId);
            }

            // 작성자 본인 피드에서도 제거
            String authorCacheKey = FEED_KEY_PREFIX + authorId;
            redisTemplate.opsForZSet().remove(authorCacheKey, postId);

            log.info("Post removed from feeds - PostId: {}, AuthorId: {}", postId, authorId);

        } catch (Exception e) {
            log.error("Failed to remove post from feeds", e);
        }
    }

    // 팔로우시 해당 사용자의 게시글들을 피드에 추가
    @Async
    public void addUserPostsToFeed(Long followerId, Long followingId) {
        try {
            String followerCacheKey = FEED_KEY_PREFIX + followerId;

            // 1. 팔로우한 사용자의 원본 게시글들 추가
            List<FeedItemDto> originalPosts = postRepository.findOriginalPostsByUserId(followingId);

            // 2. 팔로우한 사용자의 리포스트들도 추가
            List<FeedItemDto> userReposts = postRepository.findUserReposts(followingId);

            // 3. 모든 활동을 시간순으로 정렬
            List<FeedItemDto> allActivity = new ArrayList<>();
            allActivity.addAll(originalPosts);
            allActivity.addAll(userReposts);
            allActivity.sort((a, b) -> b.getSortTime().compareTo(a.getSortTime()));

            // 4. 인덱스 기반 score로 추가
            long baseScore = System.currentTimeMillis();
            for (FeedItemDto item : allActivity) {
                redisTemplate.opsForZSet().add(followerCacheKey, item.getPostId(), baseScore--);
            }

            // 피드 크기 제한
            redisTemplate.opsForZSet().removeRange(followerCacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(followerCacheKey, Duration.ofSeconds(FEED_TTL));

        } catch (Exception e) {
            log.error("Failed to add user posts to feed", e);
        }
    }

    // 언팔로우시 해당 사용자의 게시글들을 피드에서 제거
    @Async
    public void removeUserPostsFromFeed(Long followerId, Long unfollowingId) {
        try {
            String followerCacheKey = FEED_KEY_PREFIX + followerId;

            // 1. 언팔로우한 사용자의 원본 게시글들 제거
            List<FeedItemDto> originalPosts = postRepository.findOriginalPostsByUserId(unfollowingId);
            for (FeedItemDto item : originalPosts) {
                redisTemplate.opsForZSet().remove(followerCacheKey, item.getPostId());
            }

            // 2. 언팔로우한 사용자의 리포스트들도 제거
            List<FeedItemDto> userReposts = postRepository.findUserReposts(unfollowingId);
            for (FeedItemDto item : userReposts) {
                redisTemplate.opsForZSet().remove(followerCacheKey, item.getPostId());
            }

            log.info("Removed user posts and reposts from feed - FollowerId: {}, UnfollowingId: {}",
                    followerId, unfollowingId);

        } catch (Exception e) {
            log.error("Failed to remove user posts from feed", e);
        }
    }

    // 피드 캐시 무효화
    public void invalidateFeedCache(Long userId) {
        String cacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.delete(cacheKey);
        log.info("Feed cache invalidated - UserId: {}", userId);
    }

    // DB에서 피드 조회 (메타데이터 포함) - 중복 제거 로직 개선
    private Map<PostEntity, FeedItemDto> getFeedPostsFromDBWithMetadata(Long userId, Pageable pageable) {
        // 1. 현재 존재하는 원본 게시글 조회
        List<FeedItemDto> originalPosts = postRepository.findOriginalPosts(userId);

        // 2. 현재 존재하는 리포스트 조회
        List<FeedItemDto> repostedPosts = postRepository.findRepostedPosts(userId);

        // 3. 모든 활동을 합치고 중복 제거
        Map<Long, FeedItemDto> feedItemMap = new LinkedHashMap<>();

        // 원본 게시글 먼저 추가
        for (FeedItemDto item : originalPosts) {
            feedItemMap.put(item.getPostId(), item);
        }

        // 리포스트는 더 최근 것만 유지
        for (FeedItemDto item : repostedPosts) {
            FeedItemDto existing = feedItemMap.get(item.getPostId());
            if (existing == null || item.getSortTime().isAfter(existing.getSortTime())) {
                feedItemMap.put(item.getPostId(), item);
            }
        }

        // 4. 시간순 정렬
        List<FeedItemDto> sortedItems = feedItemMap.values()
                .stream()
                .sorted((a, b) -> b.getSortTime().compareTo(a.getSortTime()))
                .collect(Collectors.toList());

        // 5. 페이징 (수정된 부분)
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), sortedItems.size()); // sortedItems 사용
        List<FeedItemDto> pagedItems = sortedItems.subList(start, end); // 올바른 리스트 사용

        log.info("페이징 후 아이템 수: {}", pagedItems.size());

        // 6. PostEntity 조회
        List<Long> postIds = pagedItems.stream()
                .map(FeedItemDto::getPostId)
                .toList();

        List<PostEntity> posts = postRepository.findPostsByIds(postIds);

        // 7. 최종 결과 매핑 (순서 보장)
        Map<PostEntity, FeedItemDto> result = new LinkedHashMap<>();

        for (FeedItemDto feedItem : pagedItems) {
            PostEntity matchingPost = posts.stream()
                    .filter(post -> post.getId().equals(feedItem.getPostId()))
                    .findFirst()
                    .orElse(null);

            if (matchingPost != null) {
                result.put(matchingPost, feedItem);
            }
        }

        return result;
    }


    // 캐시에서 조회시 메타데이터 포함하여 반환
    private Map<PostEntity, FeedItemDto> buildPostEntitiesFromCacheWithMetadata(Set<Object> postIds, Long userId) {
        // Redis 순서 유지
        List<Long> orderedIds = new ArrayList<>();
        for (Object postId : postIds) {
            orderedIds.add(Long.valueOf(postId.toString()));
        }

        List<PostEntity> posts = postRepository.findPostsByIds(orderedIds);
        Map<Long, PostEntity> postMap = posts.stream()
                .collect(Collectors.toMap(PostEntity::getId, post -> post));

        // 피드에 나타나는 모든 리포스트 정보 조회 (현재 사용자 기준이 아닌 전체)
        List<FeedItemDto> allReposts = postRepository.findRepostedPosts(userId); // 이미 팔로우 기준으로 조회됨
        Map<Long, FeedItemDto> repostInfoMap = new HashMap<>();

        for (FeedItemDto repost : allReposts) {
            // 같은 게시글의 여러 리포스트 중 가장 최근 것만 사용
            FeedItemDto existing = repostInfoMap.get(repost.getPostId());
            if (existing == null || repost.getSortTime().isAfter(existing.getSortTime())) {
                repostInfoMap.put(repost.getPostId(), repost);
            }
        }

        // 원본 게시글 정보도 조회
        List<FeedItemDto> originalPosts = postRepository.findOriginalPosts(userId);
        Map<Long, FeedItemDto> originalPostMap = originalPosts.stream()
                .collect(Collectors.toMap(FeedItemDto::getPostId, item -> item));

        // Redis 순서대로 결과 생성
        Map<PostEntity, FeedItemDto> result = new LinkedHashMap<>();

        for (Long postId : orderedIds) {
            PostEntity post = postMap.get(postId);
            if (post != null) {
                // 리포스트 정보가 있으면 리포스트로, 없으면 원본으로
                FeedItemDto repostInfo = repostInfoMap.get(postId);
                if (repostInfo != null) {
                    result.put(post, repostInfo);
                } else {
                    // 원본 게시글로 처리
                    FeedItemDto originalInfo = originalPostMap.get(postId);
                    if (originalInfo != null) {
                        result.put(post, originalInfo);
                    } else {
                        // fallback
                        FeedItemDto feedItem = new FeedItemDto(postId, post.getCreatedAt(), "POST", null, null);
                        result.put(post, feedItem);
                    }
                }
            }
        }

        return result;
    }

    // Redis에 피드 캐시 저장
    private void cacheFeedToRedis(Long userId, Map<PostEntity, FeedItemDto> feedPostsWithMetadata) {
        String cacheKey = FEED_KEY_PREFIX + userId;

        long index = System.currentTimeMillis(); // 기준 시간
        for (Map.Entry<PostEntity, FeedItemDto> entry : feedPostsWithMetadata.entrySet()) {
            PostEntity post = entry.getKey();
            redisTemplate.opsForZSet().add(cacheKey, post.getId(), index--); // 순서 보장
        }

        redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
    }

    // 팔로워 ID 목록 조회
    private List<Long> getFollowerIds(Long userId) {
        return followRepository.findFollowerIdsByFollowingId(userId);
    }

    // 리포스트 팔로워
    @Async
    public void addRepostToFollowerFeeds(Long postId, Long userId, LocalDateTime repostedAt) {
        List<Long> followerIds = getFollowerIds(userId);
        double repostScore = calculateScore(repostedAt); // 리포스트 시간으로 score 계산

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;

            // 기존 항목 제거 후 리포스트 시간으로 추가
            redisTemplate.opsForZSet().remove(cacheKey, postId);
            redisTemplate.opsForZSet().add(cacheKey, postId, repostScore);

            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));

            log.debug("리포스트 추가 - FollowerId: {}, PostId: {}, RepostScore: {}",
                    followerId, postId, repostScore);
        }

        // 본인 피드에도 리포스트 시간으로 추가
        String userCacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.opsForZSet().remove(userCacheKey, postId);
        redisTemplate.opsForZSet().add(userCacheKey, postId, repostScore);
        redisTemplate.opsForZSet().removeRange(userCacheKey, 0, -FEED_CACHE_SIZE - 1);
        redisTemplate.expire(userCacheKey, Duration.ofSeconds(FEED_TTL));

        log.info("리포스트 생성 완료 - PostId: {}, UserId: {}, RepostScore: {}",
                postId, userId, repostScore);
    }


    @Async
    public void removeRepostFromFollowerFeeds(Long postId, Long userId) {
        List<Long> followerIds = getFollowerIds(userId);

        // 원본 게시글 정보 조회
        PostEntity post = postRepository.findById(postId).orElse(null);
        if (post == null) return;

        // 원본 게시글 작성 시간으로 score 계산
        double originalScore = calculateScore(post.getCreatedAt());

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;

            // 1. 리포스트 항목 제거
            redisTemplate.opsForZSet().remove(cacheKey, postId);

            // 1. 리포스트 항목 제거
            redisTemplate.opsForZSet().remove(cacheKey, postId);

            // 2. 게시글이 팔로워 피드에 남아있어야 하는지 확인
            boolean shouldKeepInFeed = shouldPostRemainInFeed(followerId, postId, post.getUser().getId());

            if (shouldKeepInFeed) {
                // 가장 최근 활동 시간으로 복구
                double restoreScore = getMostRecentActivityScore(followerId, postId, post);
                redisTemplate.opsForZSet().add(cacheKey, postId, restoreScore);

                log.debug("게시글 복구 - FollowerId: {}, PostId: {}, RestoreScore: {}",
                        followerId, postId, restoreScore);
            }
        }

        // 본인 피드 처리
        String userCacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.opsForZSet().remove(userCacheKey, postId);

        // 본인이 원본 작성자이거나 원본 작성자를 팔로우하고 있거나 다른 팔로우 중인 사용자가 리포스트했다면 복구
        boolean shouldKeepInUserFeed = shouldPostRemainInFeed(userId, postId, post.getUser().getId());

        if (shouldKeepInUserFeed) {
            double restoreScore = getMostRecentActivityScore(userId, postId, post);
            redisTemplate.opsForZSet().add(userCacheKey, postId, restoreScore);
            log.debug("본인 피드 게시글 복구 - UserId: {}, PostId: {}, RestoreScore: {}",
                    userId, postId, restoreScore);
        }

        log.info("리포스트 취소 및 선택적 복구 완료 - PostId: {}, UserId: {}", postId, userId);
    }

    /**
     * 특정 사용자의 피드에 게시글이 남아있어야 하는지 확인
     */
    private boolean shouldPostRemainInFeed(Long userId, Long postId, Long originalAuthorId) {
        // 1. 본인이 원본 작성자인 경우
        if (userId.equals(originalAuthorId)) {
            return true;
        }

        // 2. 원본 작성자를 팔로우하고 있는 경우
        if (isFollowing(userId, originalAuthorId)) {
            return true;
        }

        // 3. 팔로우 중인 다른 사용자가 이 게시글을 리포스트했는지 확인
        return hasFollowingUserReposted(userId, postId);
    }

    /**
     * 팔로우 중인 사용자 중 누군가가 해당 게시글을 리포스트했는지 확인
     */
    private boolean hasFollowingUserReposted(Long userId, Long postId) {
        // 현재 사용자가 팔로우하고 있는 사용자들 조회
        List<Long> followingIds = followRepository.findFollowingIdsByFollowerId(userId);

        if (followingIds.isEmpty()) {
            return false;
        }

        // 해당 게시글을 리포스트한 사용자들 중 팔로우 중인 사용자가 있는지 확인
        return repostRepository.existsByPostIdAndUserIdIn(postId, followingIds);
    }

    /**
     * 가장 최근 활동 시간으로 score 계산
     */
    private double getMostRecentActivityScore(Long userId, Long postId, PostEntity post) {
        // 1. 원본 게시글 시간
        double originalScore = calculateScore(post.getCreatedAt());

        // 2. 팔로우 중인 사용자들의 리포스트 시간 중 가장 최근 것
        List<Long> followingIds = followRepository.findFollowingIdsByFollowerId(userId);
        if (!followingIds.isEmpty()) {
            Optional<LocalDateTime> mostRecentRepost = repostRepository
                    .findMostRecentRepostTimeByPostIdAndUserIdIn(postId, followingIds);

            if (mostRecentRepost.isPresent()) {
                double repostScore = calculateScore(mostRecentRepost.get());
                return Math.max(originalScore, repostScore);
            }
        }

        return originalScore;
    }

    // 팔로우 관계 확인 메서드 (캐시 추가로 성능 개선)
    private boolean isFollowing(Long followerId, Long followingId) {
        if (followerId.equals(followingId)) {
            return true; // 본인 게시글
        }

        // 팔로우 관계 확인 (DB 조회)
        return followRepository.existsByFollowerIdAndFollowingId(followerId, followingId);
    }


    private boolean isOriginalAuthor(Long postId, Long userId) {
        return postRepository.findById(postId)
                .map(post -> post.getUser().getId().equals(userId))
                .orElse(false);
    }

    // 캐시에서 PostEntity 목록만 반환 (하위 호환성)
    private List<PostEntity> buildPostEntitiesFromCache(Set<Object> postIds) {
        List<Long> ids = postIds.stream()
                .map(id -> Long.valueOf(id.toString()))
                .collect(Collectors.toList());

        return postRepository.findPostsByIds(ids);
    }
    public void rebuildFeedCache(Long userId) {
        log.info("피드 캐시 재구성 시작 - UserId: {}", userId);

        // 기존 캐시 삭제
        invalidateFeedCache(userId);

        // DB에서 최신 피드 조회
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, FEED_CACHE_SIZE);
        Map<PostEntity, FeedItemDto> feedData = getFeedPostsFromDBWithMetadata(userId, pageable);

        // Redis에 저장
        String cacheKey = FEED_KEY_PREFIX + userId;
        long score = System.currentTimeMillis();

        for (Map.Entry<PostEntity, FeedItemDto> entry : feedData.entrySet()) {
            redisTemplate.opsForZSet().add(cacheKey, entry.getKey().getId(), score--);
        }

        redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));

        log.info("피드 캐시 재구성 완료 - UserId: {}, 아이템 수: {}", userId, feedData.size());
    }
}