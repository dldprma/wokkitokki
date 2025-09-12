package com.winter.wokkitokki.message.service;

import com.winter.wokkitokki.message.dto.ChatRoomDto;
import com.winter.wokkitokki.message.dto.MessageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageCacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    
    private static final String CHAT_ROOMS_KEY = "chat_rooms:user:";
    private static final String MESSAGES_KEY = "messages:";
    private static final String UNREAD_COUNT_KEY = "unread_count:";
    private static final int CACHE_TTL_MINUTES = 30;

    public void cacheChatRooms(Long userId, List<ChatRoomDto> chatRooms) {
        try {
            String key = CHAT_ROOMS_KEY + userId;
            redisTemplate.opsForValue().set(key, chatRooms, CACHE_TTL_MINUTES, TimeUnit.MINUTES);
            log.debug("Cached chat rooms for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to cache chat rooms for user: {}", userId, e);
        }
    }

    @SuppressWarnings("unchecked")
    public List<ChatRoomDto> getCachedChatRooms(Long userId) {
        try {
            String key = CHAT_ROOMS_KEY + userId;
            return (List<ChatRoomDto>) redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.error("Failed to get cached chat rooms for user: {}", userId, e);
            return null;
        }
    }

    public void cacheUnreadCount(Long userId, Long otherUserId, int count) {
        try {
            String key = UNREAD_COUNT_KEY + userId + ":" + otherUserId;
            redisTemplate.opsForValue().set(key, count, CACHE_TTL_MINUTES, TimeUnit.MINUTES);
            log.debug("Cached unread count: {} for user: {} from: {}", count, userId, otherUserId);
        } catch (Exception e) {
            log.error("Failed to cache unread count", e);
        }
    }

    public Integer getCachedUnreadCount(Long userId, Long otherUserId) {
        try {
            String key = UNREAD_COUNT_KEY + userId + ":" + otherUserId;
            return (Integer) redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.error("Failed to get cached unread count", e);
            return null;
        }
    }

    public void invalidateChatRoomsCache(Long userId) {
        try {
            String key = CHAT_ROOMS_KEY + userId;
            redisTemplate.delete(key);
            log.debug("Invalidated chat rooms cache for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to invalidate chat rooms cache for user: {}", userId, e);
        }
    }

    public void invalidateUnreadCountCache(Long userId, Long otherUserId) {
        try {
            String key1 = UNREAD_COUNT_KEY + userId + ":" + otherUserId;
            String key2 = UNREAD_COUNT_KEY + otherUserId + ":" + userId;
            redisTemplate.delete(key1);
            redisTemplate.delete(key2);
            log.debug("Invalidated unread count cache between users: {} and {}", userId, otherUserId);
        } catch (Exception e) {
            log.error("Failed to invalidate unread count cache", e);
        }
    }

    public void cacheOnlineUser(Long userId) {
        try {
            String key = "online_user:" + userId;
            redisTemplate.opsForValue().set(key, true, 5, TimeUnit.MINUTES);
            log.debug("Marked user as online: {}", userId);
        } catch (Exception e) {
            log.error("Failed to cache online user: {}", userId, e);
        }
    }

    public boolean isUserOnline(Long userId) {
        try {
            String key = "online_user:" + userId;
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            log.error("Failed to check if user is online: {}", userId, e);
            return false;
        }
    }

    public void removeOnlineUser(Long userId) {
        try {
            String key = "online_user:" + userId;
            redisTemplate.delete(key);
            log.debug("Removed online user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to remove online user: {}", userId, e);
        }
    }

    public void setUserTyping(Long userId, Long receiverId) {
        try {
            String key = "typing:" + userId + ":" + receiverId;
            redisTemplate.opsForValue().set(key, true, 5, TimeUnit.SECONDS);
            log.debug("User {} is typing to user {}", userId, receiverId);
        } catch (Exception e) {
            log.error("Failed to set user typing status", e);
        }
    }

    public boolean isUserTyping(Long userId, Long receiverId) {
        try {
            String key = "typing:" + userId + ":" + receiverId;
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            log.error("Failed to check if user is typing", e);
            return false;
        }
    }

    public void removeUserTyping(Long userId, Long receiverId) {
        try {
            String key = "typing:" + userId + ":" + receiverId;
            redisTemplate.delete(key);
            log.debug("Removed typing status for user {} to user {}", userId, receiverId);
        } catch (Exception e) {
            log.error("Failed to remove user typing status", e);
        }
    }

    public void setUserLastSeen(Long userId) {
        try {
            String key = "last_seen:" + userId;
            redisTemplate.opsForValue().set(key, System.currentTimeMillis(), 24, TimeUnit.HOURS);
            log.debug("Updated last seen for user: {}", userId);
        } catch (Exception e) {
            log.error("Failed to update last seen for user: {}", userId, e);
        }
    }

    public Long getUserLastSeen(Long userId) {
        try {
            String key = "last_seen:" + userId;
            return (Long) redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.error("Failed to get last seen for user: {}", userId, e);
            return null;
        }
    }
}