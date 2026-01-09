package com.winter.wokkitokki.message.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisMessagePublisher {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    // 기존 MessageDto 지원
    public void publishMessage(String channel, com.winter.wokkitokki.message.dto.MessageDto message) {
        try {
            String messageJson = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(channel, messageJson);
            log.info("Message published to channel: {} - {}", channel, messageJson);
        } catch (JsonProcessingException e) {
            log.error("Error publishing message to Redis", e);
        }
    }


    // 제네릭 메서드 추가
    public void publishMessage(String channel, Object message) {
        try {
            String messageJson = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(channel, messageJson);
            log.info("Generic message published to channel: {} - {}", channel, messageJson);
        } catch (JsonProcessingException e) {
            log.error("Error publishing generic message to Redis", e);
        }
    }
}