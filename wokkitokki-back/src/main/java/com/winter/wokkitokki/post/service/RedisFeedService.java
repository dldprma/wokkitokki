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
    private static final int FEED_CACHE_SIZE = 1000;
    private static final long FEED_TTL = 24 * 60 * 60;

    private double calculateScore(LocalDateTime dateTime) {
        return dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    // 피드 조회 (Post + Comment 통합)
    public Map<Object, FeedItemDto> getFeedItemsWithMetadata(Long userId, Pageable pageable) {
        String cacheKey = FEED_KEY_PREFIX + userId;

        Set<Object> cachedKeys = redisTemplate.opsForZSet()
                .reverseRangeByScore(cacheKey, 0, Double.MAX_VALUE,
                        pageable.getOffset(), pageable.getPageSize());

        if (cachedKeys != null && !cachedKeys.isEmpty()) {
            log.info("Cache Hit - UserId: {}, Size: {}", userId, cachedKeys.size());
            return buildFeedItemsFromCache(cachedKeys);
        }

        log.info("Cache Miss - UserId: {}", userId);
        Map<Object, FeedItemDto> dbItems = getFeedItemsFromDB(userId, pageable);
        cacheFeedToRedis(userId, dbItems);
        return dbItems;
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
        // -> 이런 경우 원본 게시글을 댓글 시간으로 피드에 다시 표시
        List<FeedItemDto> relevantComments = commentRepository.findRelevantComments(userId);
        for (FeedItemDto item : relevantComments) {
            // 댓글이 달린 게시글을 댓글 시간으로 피드에 표시
            FeedItemKey key = FeedItemKey.forOriginalPost(item.getPostId()); // postId로 표시
            String keyStr = key.toRedisKey() + ":comment:" + item.getCommentId(); // 고유키 생성
            
            // 대댓글인지 일반 댓글인지에 따라 처리
            String feedType = "REPLY".equals(item.getType()) ? "POST_WITH_REPLY" : "POST_WITH_COMMENT";
            
            // 댓글 시간으로 정렬되도록 하지만 타입은 POST_WITH_COMMENT 또는 POST_WITH_REPLY로 설정
            FeedItemDto commentFeedItem = new FeedItemDto(
                item.getPostId(), // 게시글 ID
                item.getCommentId(), // 댓글 ID  
                item.getSortTime(), // 댓글 시간
                feedType, // 특별 타입
                item.getParentCommentId(), // 대댓글인 경우 상위 댓글 ID
                item.getRepostUsername(),  // 댓글 작성자 이름
                true  // 댓글 여부
            );
            feedItemMap.put(keyStr, commentFeedItem);
        }

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
            } else if ("POST_WITH_COMMENT".equals(item.getType()) || "POST_WITH_REPLY".equals(item.getType())) {
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

    // 캐시에서 피드 아이템 구성
    private Map<Object, FeedItemDto> buildFeedItemsFromCache(Set<Object> redisKeys) {
        Map<Object, FeedItemDto> result = new LinkedHashMap<>();

        for (Object keyObj : redisKeys) {
            String keyStr = keyObj.toString();
            try {
                FeedItemKey feedKey = FeedItemKey.fromRedisKey(keyStr);
                
                if ("POST".equals(feedKey.getType()) || "REPOST".equals(feedKey.getType())) {
                    PostEntity post = postRepository.findById(feedKey.getContentId()).orElse(null);
                    if (post != null) {
                        FeedItemDto feedItem = new FeedItemDto(
                            feedKey.getContentId(),
                            null, // commentId는 null
                            post.getCreatedAt(), // 임시로 원본 시간 사용
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
                            feedKey.getContentId(),
                            comment.getPost().getId(),
                            comment.getCreatedAt(),
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

        long score = System.currentTimeMillis();
        for (Map.Entry<Object, FeedItemDto> entry : feedItems.entrySet()) {
            FeedItemDto item = entry.getValue();
            String redisKey;
            
            if ("POST".equals(item.getType())) {
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
            
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score--);
        }

        redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
    }

    // 게시글 작성 시 팔로워 피드에 추가
    @Async
    public void addPostToFollowerFeeds(Long postId, Long authorId, LocalDateTime createdAt) {
        List<Long> followerIds = getFollowerIds(authorId);
        double score = calculateScore(createdAt);
        String redisKey = FeedItemKey.forOriginalPost(postId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        }

        // 작성자 본인 피드에도 추가
        String authorCacheKey = FEED_KEY_PREFIX + authorId;
        redisTemplate.opsForZSet().add(authorCacheKey, redisKey, score);
        redisTemplate.opsForZSet().removeRange(authorCacheKey, 0, -FEED_CACHE_SIZE - 1);
        redisTemplate.expire(authorCacheKey, Duration.ofSeconds(FEED_TTL));

        log.info("게시글 추가 - PostId: {}, AuthorId: {}", postId, authorId);
    }

    // 댓글 작성 시 팔로워 피드에 추가
    @Async
    public void addCommentToFollowerFeeds(Long commentId, Long authorId, LocalDateTime createdAt) {
        List<Long> followerIds = getFollowerIds(authorId);
        double score = calculateScore(createdAt);
        String redisKey = FeedItemKey.forOriginalComment(commentId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        }

        // 작성자 본인 피드에도 추가
        String authorCacheKey = FEED_KEY_PREFIX + authorId;
        redisTemplate.opsForZSet().add(authorCacheKey, redisKey, score);
        redisTemplate.opsForZSet().removeRange(authorCacheKey, 0, -FEED_CACHE_SIZE - 1);
        redisTemplate.expire(authorCacheKey, Duration.ofSeconds(FEED_TTL));

        log.info("댓글 추가 - CommentId: {}, AuthorId: {}", commentId, authorId);
    }

    // 게시글 리포스트 시 팔로워 피드에 추가
    @Async
    public void addPostRepostToFollowerFeeds(Long postId, Long userId, LocalDateTime repostedAt) {
        List<Long> followerIds = getFollowerIds(userId);
        double score = calculateScore(repostedAt);
        String redisKey = FeedItemKey.forRepost(postId, userId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        }

        // 본인 피드에도 추가
        String userCacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.opsForZSet().add(userCacheKey, redisKey, score);
        redisTemplate.opsForZSet().removeRange(userCacheKey, 0, -FEED_CACHE_SIZE - 1);
        redisTemplate.expire(userCacheKey, Duration.ofSeconds(FEED_TTL));

        log.info("게시글 리포스트 추가 - PostId: {}, UserId: {}", postId, userId);
    }

    // 댓글 리포스트 시 팔로워 피드에 추가
    @Async
    public void addCommentRepostToFollowerFeeds(Long commentId, Long userId, LocalDateTime repostedAt) {
        List<Long> followerIds = getFollowerIds(userId);
        double score = calculateScore(repostedAt);
        String redisKey = FeedItemKey.forCommentRepost(commentId, userId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        }

        // 본인 피드에도 추가
        String userCacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.opsForZSet().add(userCacheKey, redisKey, score);
        redisTemplate.opsForZSet().removeRange(userCacheKey, 0, -FEED_CACHE_SIZE - 1);
        redisTemplate.expire(userCacheKey, Duration.ofSeconds(FEED_TTL));

        log.info("댓글 리포스트 추가 - CommentId: {}, UserId: {}", commentId, userId);
    }

    // 게시글 리포스트 제거
    @Async
    public void removePostRepostFromFollowerFeeds(Long postId, Long userId) {
        List<Long> followerIds = getFollowerIds(userId);
        String redisKey = FeedItemKey.forRepost(postId, userId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().remove(cacheKey, redisKey);
        }

        // 본인 피드에서도 제거
        String userCacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.opsForZSet().remove(userCacheKey, redisKey);

        log.info("게시글 리포스트 제거 - PostId: {}, UserId: {}", postId, userId);
    }

    // 댓글 리포스트 제거
    @Async
    public void removeCommentRepostFromFollowerFeeds(Long commentId, Long userId) {
        List<Long> followerIds = getFollowerIds(userId);
        String redisKey = FeedItemKey.forCommentRepost(commentId, userId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().remove(cacheKey, redisKey);
        }

        // 본인 피드에서도 제거
        String userCacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.opsForZSet().remove(userCacheKey, redisKey);

        log.info("댓글 리포스트 제거 - CommentId: {}, UserId: {}", commentId, userId);
    }

    // 게시글 삭제 시 작성자와 팔로워들의 피드에서 관련 항목 제거
    @Async
    public void removePostFromAllFeeds(Long postId, Long authorId) {
        // 1. 작성자의 팔로워들 조회
        List<Long> followerIds = getFollowerIds(authorId);
        List<Long> allAffectedUsers = new ArrayList<>(followerIds);
        allAffectedUsers.add(authorId); // 작성자도 포함
        
        for (Long userId : allAffectedUsers) {
            String cacheKey = FEED_KEY_PREFIX + userId;
            
            // 원본 게시글 제거
            String originalKey = FeedItemKey.forOriginalPost(postId).toRedisKey();
            redisTemplate.opsForZSet().remove(cacheKey, originalKey);
            
            // 해당 게시글과 관련된 모든 키 패턴으로 제거
            // postId:*:* 형태의 모든 키 제거 (리포스트, 댓글 등)
            removePostRelatedKeys(cacheKey, postId);
        }

        log.info("게시글 관련 항목 제거 완료 - PostId: {}, 영향받은 사용자 수: {}", postId, allAffectedUsers.size());
    }
    
    // 댓글 삭제 시 관련 항목 제거
    @Async
    public void removeCommentFromAllFeeds(Long commentId, Long authorId) {
        List<Long> followerIds = getFollowerIds(authorId);
        List<Long> allAffectedUsers = new ArrayList<>(followerIds);
        allAffectedUsers.add(authorId);
        
        for (Long userId : allAffectedUsers) {
            String cacheKey = FEED_KEY_PREFIX + userId;
            
            // 댓글 관련 모든 키 제거
            removeCommentRelatedKeys(cacheKey, commentId);
        }

        log.info("댓글 관련 항목 제거 완료 - CommentId: {}, 영향받은 사용자 수: {}", commentId, allAffectedUsers.size());
    }
    
    // Redis에서 특정 게시글과 관련된 모든 키 제거
    private void removePostRelatedKeys(String cacheKey, Long postId) {
        try {
            Set<Object> allMembers = redisTemplate.opsForZSet().range(cacheKey, 0, -1);
            if (allMembers != null) {
                List<Object> keysToRemove = allMembers.stream()
                    .filter(key -> key.toString().startsWith(postId + ":"))
                    .collect(Collectors.toList());
                
                if (!keysToRemove.isEmpty()) {
                    redisTemplate.opsForZSet().remove(cacheKey, keysToRemove.toArray());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to remove post related keys for postId: {}", postId, e);
        }
    }
    
    // Redis에서 특정 댓글과 관련된 모든 키 제거  
    private void removeCommentRelatedKeys(String cacheKey, Long commentId) {
        try {
            Set<Object> allMembers = redisTemplate.opsForZSet().range(cacheKey, 0, -1);
            if (allMembers != null) {
                List<Object> keysToRemove = allMembers.stream()
                    .filter(key -> {
                        String keyStr = key.toString();
                        // commentId로 시작하는 키들과 :comment:commentId를 포함하는 키들 제거
                        return keyStr.startsWith(commentId + ":") || keyStr.contains(":comment:" + commentId);
                    })
                    .collect(Collectors.toList());
                
                if (!keysToRemove.isEmpty()) {
                    redisTemplate.opsForZSet().remove(cacheKey, keysToRemove.toArray());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to remove comment related keys for commentId: {}", commentId, e);
        }
    }

    public void invalidateFeedCache(Long userId) {
        String cacheKey = FEED_KEY_PREFIX + userId;
        redisTemplate.delete(cacheKey);
        log.info("Feed cache invalidated - UserId: {}", userId);
    }

    private List<Long> getFollowerIds(Long userId) {
        return followRepository.findFollowerIdsByFollowingId(userId);
    }

    /**
     * 댓글이 달린 게시글을 댓글 시간으로 피드에 다시 푸시
     * Twitter/Threads 방식: 댓글 달리면 원본 게시글이 상단으로 올라옴
     */
    @Async
    public void addPostWithCommentToFollowerFeeds(Long postId, Long commentAuthorId, 
                                                LocalDateTime commentTime, Long commentId) {
        List<Long> followerIds = getFollowerIds(commentAuthorId);
        followerIds.add(commentAuthorId); // 댓글 작성자 자신의 피드에도 추가
        
        double score = calculateScore(commentTime);
        // POST_WITH_COMMENT 타입으로 저장 (게시글 + 관련 댓글 정보)
        String redisKey = FeedItemKey.forPostWithComment(postId, commentId, commentAuthorId).toRedisKey();

        for (Long followerId : followerIds) {
            String cacheKey = FEED_KEY_PREFIX + followerId;
            redisTemplate.opsForZSet().add(cacheKey, redisKey, score);
            redisTemplate.opsForZSet().removeRange(cacheKey, 0, -FEED_CACHE_SIZE - 1);
            redisTemplate.expire(cacheKey, Duration.ofSeconds(FEED_TTL));
        }
    }
}