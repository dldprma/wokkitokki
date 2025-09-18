package com.winter.wokkitokki.message.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.winter.wokkitokki.message.dto.MessageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisMessageSubscriber implements MessageListener {

    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String channel = new String(message.getChannel());
            String messageBody = new String(message.getBody());
            MessageDto messageDto = objectMapper.readValue(messageBody, MessageDto.class);

            log.info("Received message from Redis channel: {} - {}", channel, messageBody);

            // Pair 기반 시스템: 양쪽 사용자에게 모두 전송
            String senderDestination = "/queue/messages/" + messageDto.getSenderId();
            String receiverDestination = "/queue/messages/" + messageDto.getReceiverId();

            // 발신자에게 전송 (자기가 보낸 메시지 확인용)
            messagingTemplate.convertAndSend(senderDestination, messageDto);
            log.info("Message sent via WebSocket to sender: {}", senderDestination);

            // 수신자에게 전송
            messagingTemplate.convertAndSend(receiverDestination, messageDto);
            log.info("Message sent via WebSocket to receiver: {}", receiverDestination);

        } catch (Exception e) {
            log.error("Error processing Redis message", e);
        }
    }
}