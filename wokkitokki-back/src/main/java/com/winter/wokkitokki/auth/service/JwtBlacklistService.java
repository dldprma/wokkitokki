package com.winter.wokkitokki.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class JwtBlacklistService {
    private final RedisTemplate<String, Object> redisTemplate;
    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";

    /**
     * 토큰을 블랙리스트에 추가
     * @param token JWT 토큰
     * @param expirationTime 토큰 만료 시간 (초)
     */
    public void addToBlacklist(String token, long expirationTime) {
        try {
            String key = BLACKLIST_PREFIX + token;

            // 토큰의 남은 유효시간만큼 Redis에 저장
            long remainingTime = expirationTime - System.currentTimeMillis() / 1000;

            if (remainingTime > 0) {
                redisTemplate.opsForValue().set(key, "blacklisted", Duration.ofSeconds(remainingTime));
                log.info("토큰이 블랙리스트에 추가되었습니다. 만료까지 {}초", remainingTime);
            }
        } catch (Exception e) {
            log.error("토큰 블랙리스트 추가 실패", e);
            throw new RuntimeException("토큰 블랙리스트 처리에 실패했습니다.", e);
        }
    }

    /**
     * 토큰이 블랙리스트에 있는지 확인
     * @param token JWT 토큰
     * @return 블랙리스트에 있으면 true
     */
    public boolean isTokenBlacklisted(String token) {
        try {
            String key = BLACKLIST_PREFIX + token;
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            log.error("토큰 블랙리스트 확인 실패", e);
            // Redis 오류 시 안전을 위해 false 반환 (서비스 중단 방지)
            return false;
        }
    }

    /**
     * 특정 사용자의 모든 토큰을 블랙리스트에 추가 (전체 로그아웃용)
     * @param userId 사용자 ID
     * @param expirationTime 토큰 만료 시간
     */
    public void addUserTokensToBlacklist(Long userId, long expirationTime) {
        try {
            String userKey = BLACKLIST_PREFIX + "user:" + userId;
            long remainingTime = expirationTime - System.currentTimeMillis() / 1000;

            if (remainingTime > 0) {
                redisTemplate.opsForValue().set(userKey, "user_logged_out", Duration.ofSeconds(remainingTime));
                log.info("사용자 {}의 모든 토큰이 블랙리스트에 추가되었습니다.", userId);
            }
        } catch (Exception e) {
            log.error("사용자 토큰 블랙리스트 추가 실패: {}", userId, e);
        }
    }

    /**
     * 특정 사용자가 전체 로그아웃 되었는지 확인
     */
    public boolean isUserLoggedOut(Long userId) {
        try {
            String userKey = BLACKLIST_PREFIX + "user:" + userId;
            return Boolean.TRUE.equals(redisTemplate.hasKey(userKey));
        } catch (Exception e) {
            log.error("사용자 로그아웃 상태 확인 실패: {}", userId, e);
            return false;
        }
    }
}
