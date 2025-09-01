package com.winter.wokkitokki.post.service;

import com.winter.wokkitokki.comment.entity.CommentEntity;
import com.winter.wokkitokki.comment.repository.CommentRepository;
import com.winter.wokkitokki.post.dto.FeedItemDto;
import com.winter.wokkitokki.post.dto.FeedItemKey;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.user.repository.FollowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
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
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;

    private static final String FEED_KEY_PREFIX = "user:feed:";
    private static final int FEED_CACHE_SIZE = 10000;  // 10,000개로 증가
    private static final long FEED_TTL = 24 * 60 * 60;

    private double calculateScore(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    // 피드 조회 (Post + Comment 통합)
    public Map<Object, FeedItemDto> getFeedItemsWithMetadata(Long userId, Pageable pageable) {
        String cacheKey = FEED_KEY_PREFIX + userId;

        // 캐시에서 전체 개수 확인
        Long cachedCount = redisTemplate.opsForZSet().zCard(cacheKey);
        
        // 캐시가 비어있거나 요청한 페이지가 캐시 범위를 벗어나면 DB에서 전체 데이터를 다시 로드
        if (cachedCount == null || cachedCount == 0 || pageable.getOffset() >= cachedCount) {
            // DB에서 전체 피드 조회하여 캐시 갱신
            refreshFeedCache(userId);
        }

        // 캐시에서 요청된 페이지 조회
        Set<Object> cachedKeys = redisTemplate.opsForZSet()
                .reverseRangeByScore(cacheKey, 0, Double.MAX_VALUE,
                        pageable.getOffset(), pageable.getPageSize());

        if (cachedKeys != null && !cachedKeys.isEmpty()) {
            return buildFeedItemsFromCache(cachedKeys);
        }

        // 캐시에서도 데이터가 없으면 DB에서 해당 페이지만 조회
        return getFeedItemsFromDB(userId, pageable);
    }

    // 피드 캐시 새로고침 (전체 피드를 DB에서 조회하여 캐시에 저장)
    private void refreshFeedCache(Long userId) {
        // 무제한 페이지로 전체 데이터 조회
        Pageable unlimitedPageable = PageRequest.of(0, Integer.MAX_VALUE);
        Map<Object, FeedItemDto> allItems = getFeedItemsFromDB(userId, unlimitedPageable);
        
        // 기존 캐시 삭제 후 새로 저장
        String cacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.delete(cacheKey);
        cacheFeedToRedis(userId, allItems);
    }

    // DB에서 피드 조회 (Post + Comment 통합)
    private Map<Object, FeedItemDto> getFeedItemsFromDB(Long userId, Pageable pageable) {
        Map<String, FeedItemDto> feedItemMap = new LinkedHashMap<>();

        // 1. 원본 게시글들
        List<FeedItemDto> originalPosts = postRepository.findOriginalPosts(userId);
        for (FeedItemDto item : originalPosts) {
            FeedItemKey key = FeedItemKey.forOriginalPost(item.getPostId());
            feedItemMap.put(key.toRedisKey(), item);
        }

        // 2. 리포스트된 게시글들
        List<FeedItemDto> repostedPosts = postRepository.findRepostedPosts(userId);
        for (FeedItemDto item : repostedPosts) {
            FeedItemKey key = FeedItemKey.forRepost(item.getPostId(), item.getRepostUserId());
            String keyStr = key.toRedisKey();
            
            // 같은 게시글의 여러 리포스트 중 최신 것만 유지
            FeedItemDto existing = feedItemMap.get(keyStr);
            if (existing == null || item.getSortTime().isAfter(existing.getSortTime())) {
                feedItemMap.put(keyStr, item);
            }
        }

        // 3. 관련 댓글들 (내가 작성하거나 팔로우한 사람이 작성한 댓글)
        List<FeedItemDto> relevantComments = commentRepository.findRelevantComments(userId);
        for (FeedItemDto item : relevantComments) {
            // 댓글이 달린 게시글을 댓글 시간으로 피드에 표시
            FeedItemKey key = FeedItemKey.forPostWithComment(item.getPostId(), item.getCommentId(), item.getRepostUserId());
            String keyStr = key.toRedisKey();
            
            // 댓글 시간으로 정렬되도록 하지만 타입은 POST_WITH_COMMENT로 설정
            FeedItemDto commentFeedItem = new FeedItemDto(
                item.getPostId(), // 게시글 ID
                item.getCommentId(), // 댓글 ID  
                item.getSortTime(), // 댓글 시간
                "POST_WITH_COMMENT", // 특별 타입
                item.getRepostUserId(), // 댓글 작성자 ID
                null  // repostUsername
            );
            feedItemMap.put(keyStr, commentFeedItem);
        }
        
        // findRelevantComments에서 내 댓글들이 모두 포함되므로 별도 처리 불필요

        // 4. 관련 댓글 리포스트들
        List<FeedItemDto> relevantCommentReposts = commentRepository.findRelevantCommentReposts(userId);
        for (FeedItemDto item : relevantCommentReposts) {
            FeedItemKey key = FeedItemKey.forCommentRepost(item.getCommentId(), item.getRepostUserId());
            String keyStr = key.toRedisKey();
            
            FeedItemDto existing = feedItemMap.get(keyStr);
            if (existing == null || item.getSortTime().isAfter(existing.getSortTime())) {
                feedItemMap.put(keyStr, item);
            }
        }

        // 5. 시간순 정렬 및 페이징
        List<FeedItemDto> sortedItems = feedItemMap.values() 
                .stream()
                .sorted((a, b) -> b.getSortTime().compareTo(a.getSortTime()))
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), sortedItems.size());
        List<FeedItemDto> pagedItems = sortedItems.subList(start, end);

        // 6. 결과 매핑
        Map<Object, FeedItemDto> result = new LinkedHashMap<>();
        for (FeedItemDto item : pagedItems) {
            if ("POST".equals(item.getType()) || "REPOST".equals(item.getType())) {
                PostEntity post = postRepository.findById(item.getPostId()).orElse(null);
                if (post != null) {
                    result.put(post, item);
                }
            } else if ("POST_WITH_COMMENT".equals(item.getType())) {
                // 댓글이 달린 게시글 + 해당 댓글을 그룹화해서 리턴
                PostEntity post = postRepository.findById(item.getPostId()).orElse(null);
                if (post != null) {
                    result.put(post, item);
                }
            } else if ("COMMENT_REPOST".equals(item.getType())) {
                CommentEntity comment = commentRepository.findById(item.getCommentId()).orElse(null);
                if (comment != null) {
                    result.put(comment, item);
                }
            }
        }

        return result;
    }

    // 특정 사용자의 전체 피드 개수 조회
    public long getTotalFeedCount(Long userId) {
        String cacheKey = FEED_KEY_PREFIX + userId;
        
        // Redis에 캐시된 피드가 있으면 그 개수를 반환
        Long cachedCount = redisTemplate.opsForZSet().zCard(cacheKey);
        if (cachedCount != null && cachedCount > 0) {
            return cachedCount;
        }
        
        // Redis에 캐시가 없으면 DB에서 전체 개수 조회
        return getTotalFeedCountFromDB(userId);
    }
    
    // DB에서 전체 피드 개수 조회
    private long getTotalFeedCountFromDB(Long userId) {
        try {
            // 1. 원본 게시글 개수
            long originalPostCount = postRepository.countOriginalPosts(userId);
            
            // 2. 리포스트된 게시글 개수 (중복 제거)
            long repostedPostCount = postRepository.countRepostedPosts(userId);
            
            // 3. 관련 댓글 개수 (내가 작성했거나 팔로우한 사람이 작성한 댓글)
            long relevantCommentCount = commentRepository.countRelevantComments(userId);
            
            // 4. 관련 댓글 리포스트 개수 (중복 제거)
            long relevantCommentRepostCount = commentRepository.countRelevantCommentReposts(userId);
            
            return originalPostCount + repostedPostCount + relevantCommentCount + relevantCommentRepostCount;
        } catch (Exception e) {
            log.warn("Failed to get total feed count from DB for user: {}", userId, e);
            // 실패 시 기본값 반환 (무한스크롤이 계속 동작하도록)
            return 1000;
        }
    }

    // 캐시에서 피드 아이템 구성
    private Map<Object, FeedItemDto> buildFeedItemsFromCache(Set<Object> redisKeys) {
        Map<Object, FeedItemDto> result = new LinkedHashMap<>();

        for (Object keyObj : redisKeys) {
            String keyStr = keyObj.toString();
            try {
                FeedItemKey feedKey = FeedItemKey.fromRedisKey(keyStr);
                
                if ("POST_WITH_COMMENT".equals(feedKey.getType())) {
                    PostEntity post = postRepository.findById(feedKey.getContentId()).orElse(null);
                    if (post != null) {
                        // commentId는 feedKey에 포함되어 있음
                        FeedItemDto feedItem = new FeedItemDto(
                            feedKey.getContentId(), // postId
                            feedKey.getCommentId(), // commentId
                            null, // sortTime은 나중에 integration에서 설정
                            feedKey.getType(),
                            feedKey.getRepostUserId(), // commentAuthorId
                            null // repostUsername은 나중에 조회
                        );
                        result.put(post, feedItem);
                    }
                } else if ("POST".equals(feedKey.getType()) || "REPOST".equals(feedKey.getType())) {
                    PostEntity post = postRepository.findById(feedKey.getContentId()).orElse(null);
                    if (post != null) {
                        FeedItemDto feedItem = new FeedItemDto(
                            feedKey.getContentId(),
                            null, // commentId는 null
                            null, // sortTime은 나중에 integration에서 설정
                            feedKey.getType(),
                            feedKey.getRepostUserId(),
                            null // repostUsername은 나중에 조회
                        );
                        result.put(post, feedItem);
                    }
                } else if ("COMMENT".equals(feedKey.getType()) || "COMMENT_REPOST".equals(feedKey.getType())) {
                    CommentEntity comment = commentRepository.findById(feedKey.getContentId()).orElse(null);
                    if (comment != null) {
                        FeedItemDto feedItem = new FeedItemDto(
                            comment.getPost().getId(),
                            feedKey.getContentId(),
                            null, // sortTime은 나중에 integration에서 설정
                            feedKey.getType(),
                            feedKey.getRepostUserId(),
                            null
                        );
                        result.put(comment, feedItem);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse redis key: {}", keyStr, e);
            }
        }

        return result;
    }

    // Redis에 피드 캐시 저장
    private void cacheFeedToRedis(Long userId, Map<Object, FeedItemDto> feedItems) {
        String cacheKey = FEED_KEY_PREFIX + userId;

        for (Map.Entry<Object, FeedItemDto> entry : feedItems.entrySet()) {
            FeedItemDto item = entry.getValue();
            String redisKey;
            double score = calculateScore(item.getSortTime());
            
            if ("POST_WITH_COMMENT".equals(item.getType())) {
                redisKey = FeedItemKey.forPostWithComment(item.getPostId(), item.getCommentId(), item.getRepostUserId()).toRedisKey();
            } else if ("POST".equals(item.getType())) {
                redisKey = FeedItemKey.forOriginalPost(item.getPostId()).toRedisKey();
            } else if ("REPOST".equals(item.getType())) {
                redisKey = FeedItemKey.forRepost(item.getPostId(), item.getRepostUserId()).toRedisKey();
            } else if ("COMMENT".equals(item.getType())) {
                redisKey = FeedItemKey.forOriginalComment(item.getCommentId()).toRedisKey();
            } else if ("COMMENT_REPOST".equals(item.getType())) {
                redisKey = FeedItemKey.forCommentRepost(item.getCommentId(), item.getRepostUserId()).toRedisKey();
            } else {
                continue;
            }
            
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
        }

        redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
    }

    // 게시글 작성 시 팔로워 피드에 추가
    @Async
    public void addPostToFollowerFeeds(Long postId, Long authorId, LocalDateTime createdAt) {
        List<Long> followerIds = getFollowerIds(authorId);
        followerIds.add(authorId); // 작성자 본인 피드에도 추가
        double score = calculateScore(createdAt);
        String redisKey = FeedItemKey.forOriginalPost(postId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        }
    }

    // 댓글 작성 시 팔로워 피드에 추가
    @Async
    public void addCommentToFollowerFeeds(Long commentId, Long authorId, LocalDateTime createdAt) {
        // 이 메소드는 이제 직접 사용되지 않고, addPostWithCommentToFollowerFeeds로 대체됨
    }

    // 게시글 리포스트 시 팔로워 피드에 추가
    @Async
    public void addPostRepostToFollowerFeeds(Long postId, Long userId, LocalDateTime repostedAt) {
        List<Long> followerIds = getFollowerIds(userId);
        followerIds.add(userId);
        double score = calculateScore(repostedAt);
        String redisKey = FeedItemKey.forRepost(postId, userId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        }
    }

    // 댓글 리포스트 시 팔로워 피드에 추가
    @Async
    public void addCommentRepostToFollowerFeeds(Long commentId, Long userId, LocalDateTime repostedAt) {
        List<Long> followerIds = getFollowerIds(userId);
        followerIds.add(userId);
        double score = calculateScore(repostedAt);
        String redisKey = FeedItemKey.forCommentRepost(commentId, userId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        }
    }

    // 게시글 리포스트 제거
    @Async
    public void removePostRepostFromFollowerFeeds(Long postId, Long userId) {
        List<Long> followerIds = getFollowerIds(userId);
        followerIds.add(userId);
        String redisKey = FeedItemKey.forRepost(postId, userId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().remove(cacheKey, redisKey);
        }
    }

    // 댓글 리포스트 제거
    @Async
    public void removeCommentRepostFromFollowerFeeds(Long commentId, Long userId) {
        List<Long> followerIds = getFollowerIds(userId);
        followerIds.add(userId);
        String redisKey = FeedItemKey.forCommentRepost(commentId, userId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().remove(cacheKey, redisKey);
        }
    }

    // 게시글 삭제 시 작성자와 팔로워들의 피드에서 관련 항목 제거
    @Async
    public void removePostFromAllFeeds(Long postId, Long authorId) {
        List<Long> followerIds = getFollowerIds(authorId);
        List<Long> allAffectedUsers = new ArrayList<>(followerIds);
        allAffectedUsers.add(authorId);
        
        for (Long userId : allAffectedUsers) {
            String cacheKey = FEED_KEY_PREFIX + userId;
            removePostRelatedKeys(cacheKey, postId);
        }
    }
    
    // 댓글 삭제 시 관련 항목 제거
    @Async
    public void removeCommentFromAllFeeds(Long commentId, Long authorId) {
        List<Long> followerIds = getFollowerIds(authorId);
        List<Long> allAffectedUsers = new ArrayList<>(followerIds);
        allAffectedUsers.add(authorId);
        
        for (Long userId : allAffectedUsers) {
            String cacheKey = FEED_KEY_PREFIX + userId;
            removeCommentRelatedKeys(cacheKey, commentId);
        }
    }
    
    private void removePostRelatedKeys(String cacheKey, Long postId) {
        Set<Object> allMembers = redisTemplate.opsForZSet().range(cacheKey, 0, -1);
        if (allMembers != null) {
            List<Object> keysToRemove = allMembers.stream()
                .filter(key -> {
                    try {
                        return FeedItemKey.fromRedisKey(key.toString()).getContentId().equals(postId);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .collect(Collectors.toList());
            
            if (!keysToRemove.isEmpty()) {
                redisTemplate.opsForZSet().remove(cacheKey, keysToRemove.toArray());
            }
        }
    }
    
    private void removeCommentRelatedKeys(String cacheKey, Long commentId) {
        Set<Object> allMembers = redisTemplate.opsForZSet().range(cacheKey, 0, -1);
        if (allMembers != null) {
            List<Object> keysToRemove = allMembers.stream()
                .filter(key -> {
                    try {
                        FeedItemKey feedKey = FeedItemKey.fromRedisKey(key.toString());
                        return (feedKey.getCommentId() != null && feedKey.getCommentId().equals(commentId)) ||
                               (feedKey.getContentId().equals(commentId) && !"POST".equals(feedKey.getType()) && !"REPOST".equals(feedKey.getType()));
                    } catch (Exception e) {
                        return false;
                    }
                })
                .collect(Collectors.toList());
            
            if (!keysToRemove.isEmpty()) {
                redisTemplate.opsForZSet().remove(cacheKey, keysToRemove.toArray());
            }
        }
    }

    public void invalidateFeedCache(Long userId) {
        String cacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.delete(cacheKey);
    }

    private List<Long> getFollowerIds(Long userId) {
        return followRepository.findFollowerIdsByFollowingId(userId);
    }

    @Async
    public void addPostWithCommentToFollowerFeeds(Long postId, Long commentAuthorId, 
                                                LocalDateTime commentTime, Long commentId) {
        List<Long> followerIds = getFollowerIds(commentAuthorId);
        followerIds.add(commentAuthorId);
        
        double score = calculateScore(commentTime);
        String redisKey = FeedItemKey.forPostWithComment(postId, commentId, commentAuthorId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        }
    }
    
    @Async
    public void addPostWithCommentToUserFeed(Long postId, Long commentAuthorId, 
                                           LocalDateTime commentTime, Long commentId, Long targetUserId) {
        double score = calculateScore(commentTime);
        String redisKey = FeedItemKey.forPostWithComment(postId, commentId, commentAuthorId).toRedisKey();
        
        String cacheKey = FEED_KEY_PREFIX + targetUserId;
        redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
        redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
        redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        
        log.debug("Added post with comment to user feed: postId={}, commentId={}, userId={}", 
                  postId, commentId, targetUserId);
    }
    
    // === 회원 탈퇴 관련 피드 정리 메서드 ===
    
    public void deleteFeedCache(Long userId) {
        String cacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.delete(cacheKey);
        log.debug("Deleted feed cache for user: {}", userId);
    }
    
    public void removeUserContentFromAllFeeds(Long userId) {
        // Redis에서 모든 피드 키 패턴을 가져와서 해당 사용자의 컨텐츠를 제거
        Set<String> feedKeys = redisTemplate.keys(FEED_KEY_PREFIX + "*");
        
        if (feedKeys != null && !feedKeys.isEmpty()) {
            for (String feedKey : feedKeys) {
                removeUserContentFromFeed(feedKey, userId);
            }
        }
        
        log.debug("Removed user content from all feeds for user: {}", userId);
    }
    
    private void removeUserContentFromFeed(String feedKey, Long userId) {
        Set<Object> allKeys = redisTemplate.opsForZSet().range(feedKey, 0, -1);
        
        if (allKeys != null && !allKeys.isEmpty()) {
            List<Object> keysToRemove = allKeys.stream()
                    .filter(key -> {
                        try {
                            FeedItemKey feedItemKey = FeedItemKey.fromRedisKey(key.toString());
                            // 해당 사용자가 작성한 게시글, 댓글, 리포스트인지 확인
                            return userId.equals(feedItemKey.getUserId());
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .collect(Collectors.toList());
            
            if (!keysToRemove.isEmpty()) {
                redisTemplate.opsForZSet().remove(feedKey, keysToRemove.toArray());
                log.debug("Removed {} items from feed: {}", keysToRemove.size(), feedKey);
            }
        }
    }
    
    public void invalidateFollowerFeedCaches(Long userId) {
        // 해당 사용자의 팔로워들 목록을 가져와서 피드 캐시 무효화
        List<Long> followerIds = getFollowerIds(userId);
        
        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.delete(cacheKey);
        }
        
        log.debug("Invalidated feed caches for {} followers of user: {}", followerIds.size(), userId);
    }
}