package com.winter.wokkitokki.message.service;

import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final MessageCacheService messageCacheService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        if (headerAccessor.getUser() instanceof UsernamePasswordAuthenticationToken auth) {
            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            UserEntity user = userRepository.findByUsername(userDetails.getUsername()).orElse(null);

            if (user != null) {
                Long userId = user.getId();

                messageCacheService.cacheOnlineUser(userId);
                messageCacheService.setUserLastSeen(userId);

                Map<String, Object> statusMessage = Map.of(
                    "type", "USER_ONLINE",
                    "userId", userId,
                    "username", user.getUsername(),
                    "isOnline", true
                );

                messagingTemplate.convertAndSend("/topic/user-status", statusMessage);

            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        if (headerAccessor.getUser() instanceof UsernamePasswordAuthenticationToken auth) {
            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            UserEntity user = userRepository.findByUsername(userDetails.getUsername()).orElse(null);

            if (user != null) {
                Long userId = user.getId();

                messageCacheService.removeOnlineUser(userId);
                messageCacheService.setUserLastSeen(userId);

                Map<String, Object> statusMessage = Map.of(
                    "type", "USER_OFFLINE",
                    "userId", userId,
                    "username", user.getUsername(),
                    "isOnline", false
                );

                messagingTemplate.convertAndSend("/topic/user-status", statusMessage);

            }
        }
    }
}