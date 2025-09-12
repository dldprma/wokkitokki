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
            String messageBody = new String(message.getBody());
            MessageDto messageDto = objectMapper.readValue(messageBody, MessageDto.class);
            
            String destination = "/queue/messages/" + messageDto.getReceiverId();
            messagingTemplate.convertAndSend(destination, messageDto);
            
            log.info("Message sent via WebSocket to: {} - {}", destination, messageBody);
        } catch (Exception e) {
            log.error("Error processing Redis message", e);
        }
    }
}