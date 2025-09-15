package com.winter.wokkitokki.common.config;

import com.winter.wokkitokki.common.util.JwtUtils;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Collections;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
                .withSockJS();
        
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // WebSocket 연결 시 JWT 토큰 검증 (필수)
                    String token = accessor.getFirstNativeHeader("Authorization");
                    if (token == null || !token.startsWith("Bearer ")) {
                        // 토큰이 없으면 연결 거부
                        throw new RuntimeException("Missing or invalid Authorization header");
                    }
                    
                    token = token.substring(7);
                    try {
                        String username = jwtUtils.extractUsername(token);
                        if (username == null || !jwtUtils.validateToken(token, createUserDetails(username))) {
                            // 토큰이 유효하지 않으면 연결 거부
                            throw new RuntimeException("Invalid JWT token");
                        }
                        
                        UserDetails userDetails = createUserDetails(username);
                        UsernamePasswordAuthenticationToken authentication = 
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        accessor.setUser(authentication);
                        
                    } catch (Exception e) {
                        // 모든 예외는 연결 거부로 처리
                        throw new RuntimeException("WebSocket authentication failed: " + e.getMessage());
                    }
                }
                return message;
            }
        });
    }
    
    private UserDetails createUserDetails(String username) {
        return User.builder()
            .username(username)
            .password("")
            .authorities(Collections.emptyList())
            .build();
    }
}