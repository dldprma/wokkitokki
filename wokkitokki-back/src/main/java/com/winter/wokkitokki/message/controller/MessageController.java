package com.winter.wokkitokki.message.controller;

import com.winter.wokkitokki.message.dto.ChatRoomDto;
import com.winter.wokkitokki.message.dto.MessageDto;
import com.winter.wokkitokki.message.dto.UserSearchDto;
import com.winter.wokkitokki.message.entity.MessageEntity;
import com.winter.wokkitokki.message.service.MessageCacheService;
import com.winter.wokkitokki.message.service.MessageService;
import com.winter.wokkitokki.message.service.MessageUserSearchService;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import com.winter.wokkitokki.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Slf4j
public class MessageController {

    private final MessageService messageService;
    private final MessageCacheService messageCacheService;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageUserSearchService messageUserSearchService;
    private final UserService userService;
    private final UserRepository userRepository;

    private UserEntity getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("인증되지 않은 사용자입니다");
        }

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String username = userDetails.getUsername();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
    }

    private UserEntity getUserFromWebSocket(SimpMessageHeaderAccessor headerAccessor) {
        try {
            Authentication auth = (Authentication) headerAccessor.getUser();
            if (auth == null || !auth.isAuthenticated()) {
                log.warn("WebSocket: 인증되지 않은 사용자");
                return null;
            }

            UserDetails userDetails = (UserDetails) auth.getPrincipal();
            String username = userDetails.getUsername();
            return userRepository.findByUsername(username).orElse(null);
        } catch (Exception e) {
            log.error("WebSocket에서 사용자 정보 가져오기 실패", e);
            return null;
        }
    }

    @MessageMapping("/send")
    public void sendMessage(@Payload Map<String, Object> messageData,
                           SimpMessageHeaderAccessor headerAccessor) {
        try {
            UserEntity currentUser = getUserFromWebSocket(headerAccessor);
            if (currentUser == null) return;
            String receiverUsername = messageData.get("receiverUsername").toString();
            Long receiverId = userService.getUserIdByUsername(receiverUsername);
            String content = messageData.get("content").toString();
            String imageUrl = (String) messageData.get("imageUrl");
            String fileUrl = (String) messageData.get("fileUrl");
            String fileName = (String) messageData.get("fileName");
            Long sharedPostId = messageData.get("sharedPostId") != null 
                ? Long.valueOf(messageData.get("sharedPostId").toString()) : null;
            String messageTypeStr = (String) messageData.getOrDefault("messageType", "TEXT");

            MessageEntity.MessageType messageType;
            try {
                messageType = MessageEntity.MessageType.valueOf(messageTypeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("잘못된 MessageType: {}. TEXT로 기본 설정", messageTypeStr);
                messageType = MessageEntity.MessageType.TEXT;
            }

            messageService.sendMessage(currentUser.getId(), receiverId, content, imageUrl, fileUrl, fileName, sharedPostId, messageType);
        } catch (Exception e) {
            log.error("WebSocket 메시지 전송 실패", e);
        }
    }

    @MessageMapping("/typing")
    public void handleTyping(@Payload Map<String, Object> typingData,
                           SimpMessageHeaderAccessor headerAccessor) {
        try {
            UserEntity currentUser = getUserFromWebSocket(headerAccessor);
            if (currentUser == null) return;
        String receiverUsername = typingData.get("receiverUsername").toString();
        Long receiverId = userService.getUserIdByUsername(receiverUsername);
        boolean isTyping = Boolean.parseBoolean(typingData.get("isTyping").toString());

        if (isTyping) {
            messageCacheService.setUserTyping(currentUser.getId(), receiverId);
        } else {
            messageCacheService.removeUserTyping(currentUser.getId(), receiverId);
        }

        Map<String, Object> typingStatus = Map.of(
            "type", "TYPING_STATUS",
            "senderId", currentUser.getId(),
            "senderUsername", currentUser.getUsername(),
            "receiverId", receiverId,
            "isTyping", isTyping
        );

        messagingTemplate.convertAndSendToUser(
            receiverId.toString(),
            "/queue/typing",
            typingStatus
        );

        } catch (Exception e) {
            log.error("WebSocket typing 처리 실패", e);
        }
    }

    @MessageMapping("/stop-typing")
    public void handleStopTyping(@Payload Map<String, Object> typingData,
                                SimpMessageHeaderAccessor headerAccessor) {
        try {
            UserEntity currentUser = getUserFromWebSocket(headerAccessor);
            if (currentUser == null) return;
        String receiverUsername = typingData.get("receiverUsername").toString();
        Long receiverId = userService.getUserIdByUsername(receiverUsername);

        messageCacheService.removeUserTyping(currentUser.getId(), receiverId);

        Map<String, Object> typingStatus = Map.of(
            "type", "TYPING_STATUS",
            "senderId", currentUser.getId(),
            "senderUsername", currentUser.getUsername(),
            "receiverId", receiverId,
            "isTyping", false
        );

        messagingTemplate.convertAndSendToUser(
            receiverId.toString(),
            "/queue/typing",
            typingStatus
        );

        } catch (Exception e) {
            log.error("WebSocket stop-typing 처리 실패", e);
        }
    }

    @GetMapping("/chat-rooms")
    public ResponseEntity<List<ChatRoomDto>> getChatRooms() {
        UserEntity currentUser = getCurrentUser();
        
        List<ChatRoomDto> chatRooms = messageService.getChatRooms(currentUser.getId());
        return ResponseEntity.ok(chatRooms);
    }

    @GetMapping("/with/{username}")
    public ResponseEntity<Page<MessageDto>> getMessages(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        UserEntity currentUser = getCurrentUser();
        
        Long otherUserId = userService.getUserIdByUsername(username);
        Page<MessageDto> messages = messageService.getMessages(currentUser.getId(), otherUserId, page, size);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/mark-read/{username}")
    public ResponseEntity<Void> markMessagesAsRead(@PathVariable String username) {
        UserEntity currentUser = getCurrentUser();
        Long otherUserId = userService.getUserIdByUsername(username);
        messageService.markMessagesAsRead(currentUser.getId(), otherUserId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/send")
    public ResponseEntity<MessageDto> sendDirectMessage(
            @RequestParam("receiverUsername") String receiverUsername,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "sharedPostId", required = false) Long sharedPostId) {

        try {
            UserEntity currentUser = getCurrentUser();
            Long receiverId = userService.getUserIdByUsername(receiverUsername);


            MessageDto message = messageService.sendMessageWithFiles(
                currentUser.getId(), receiverId, content, image, file, sharedPostId);
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("메시지 전송 실패: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/users/{username}/online-status")
    public ResponseEntity<Map<String, Object>> getUserOnlineStatus(@PathVariable String username) {
        Long userId = userService.getUserIdByUsername(username);
        boolean isOnline = messageCacheService.isUserOnline(userId);
        
        Map<String, Object> response = Map.of(
            "userId", userId,
            "username", username,
            "isOnline", isOnline
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/online-status")
    public ResponseEntity<Map<String, Object>> getMultipleUsersOnlineStatus(
            @RequestParam("userIds") List<Long> userIds) {
        
        Map<String, Boolean> onlineStatuses = userIds.stream()
                .collect(Collectors.toMap(
                    userId -> userId.toString(),
                    messageCacheService::isUserOnline
                ));
        
        Map<String, Object> response = Map.of(
            "onlineStatuses", onlineStatuses
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/{username}/typing-status")
    public ResponseEntity<Map<String, Object>> getTypingStatus(@PathVariable String username) {
        UserEntity currentUser = getCurrentUser();
        
        Long userId = userService.getUserIdByUsername(username);
        boolean isTyping = messageCacheService.isUserTyping(userId, currentUser.getId());
        
        Map<String, Object> response = Map.of(
            "userId", userId,
            "username", username,
            "isTyping", isTyping
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/{username}/last-seen")
    public ResponseEntity<Map<String, Object>> getUserLastSeen(@PathVariable String username) {
        Long userId = userService.getUserIdByUsername(username);
        Long lastSeen = messageCacheService.getUserLastSeen(userId);
        boolean isOnline = messageCacheService.isUserOnline(userId);
        
        Map<String, Object> response = Map.of(
            "userId", userId,
            "username", username,
            "lastSeen", lastSeen,
            "isOnline", isOnline
        );
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/chat-rooms")
    public ResponseEntity<ChatRoomDto> createOrGetChatRoom(@RequestBody Map<String, Object> requestData) {
        UserEntity currentUser = getCurrentUser();
        
        String otherUsername = (String) requestData.get("username");
        Long otherUserId = userService.getUserIdByUsername(otherUsername);
        
        ChatRoomDto chatRoom = messageService.createOrGetChatRoom(currentUser.getId(), otherUserId);
        return ResponseEntity.ok(chatRoom);
    }

    @DeleteMapping("/chat-rooms/{roomId}")
    public ResponseEntity<Void> deleteChatRoom(@PathVariable String roomId) {
        UserEntity currentUser = getCurrentUser();
        
        messageService.deleteChatRoom(roomId, currentUser.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search/users")
    public ResponseEntity<List<UserSearchDto>> searchUsers(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "10") int size) {
        
        UserEntity currentUser = getCurrentUser();
        
        List<UserSearchDto> users = messageUserSearchService.searchUsersForChat(keyword, currentUser.getId(), size);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/search/users/autocomplete")
    public ResponseEntity<List<UserSearchDto>> autocompleteUsers(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "5") int limit) {
        
        UserEntity currentUser = getCurrentUser();
        
        List<UserSearchDto> users = messageUserSearchService.searchUsersAutocomplete(keyword, currentUser.getId(), limit);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/recent-users")
    public ResponseEntity<List<UserSearchDto>> getRecentChatUsers(
            @RequestParam(defaultValue = "10") int limit) {
        
        UserEntity currentUser = getCurrentUser();
        
        List<UserSearchDto> recentUsers = messageUserSearchService.getRecentChatUsers(currentUser.getId(), limit);
        return ResponseEntity.ok(recentUsers);
    }

    @GetMapping("/search/following-users")
    public ResponseEntity<List<UserSearchDto>> searchFollowingUsersForShare(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "10") int size) {
        
        UserEntity currentUser = getCurrentUser();
        
        List<UserSearchDto> followingUsers = messageUserSearchService.searchFollowingUsersForShare(keyword, currentUser.getId(), size);
        return ResponseEntity.ok(followingUsers);
    }

    @GetMapping("/following-users")
    public ResponseEntity<List<UserSearchDto>> getFollowingUsers(
            @RequestParam(defaultValue = "20") int limit) {
        
        UserEntity currentUser = getCurrentUser();
        
        List<UserSearchDto> followingUsers = messageUserSearchService.getFollowingUsers(currentUser.getId(), limit);
        return ResponseEntity.ok(followingUsers);
    }

    @GetMapping("/can-message/{username}")
    public ResponseEntity<Map<String, Boolean>> canSendMessage(@PathVariable String username) {
        UserEntity currentUser = getCurrentUser();
        
        Long userId = userService.getUserIdByUsername(username);
        boolean canSend = messageUserSearchService.canSendMessageTo(currentUser.getId(), userId);
        
        Map<String, Boolean> response = Map.of("canSendMessage", canSend);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/share-post")
    public ResponseEntity<MessageDto> sharePost(@RequestBody Map<String, Object> shareData) {
        UserEntity currentUser = getCurrentUser();
        
        String receiverUsername = (String) shareData.get("receiverUsername");
        Long receiverId = userService.getUserIdByUsername(receiverUsername);
        Long postId = Long.valueOf(shareData.get("postId").toString());
        String message = (String) shareData.get("message");
        
        if (receiverId == null) {
            return ResponseEntity.badRequest().body(null);
        }

        boolean canSend = messageUserSearchService.canSendMessageTo(currentUser.getId(), receiverId);
        if (!canSend) {
            return ResponseEntity.badRequest().body(null);
        }
        
        MessageDto sharedMessage = messageService.sharePost(currentUser.getId(), receiverId, postId, message);
        return ResponseEntity.ok(sharedMessage);
    }

    @PostMapping("/share-post-multiple")
    public ResponseEntity<Map<String, Object>> sharePostToMultipleUsers(@RequestBody Map<String, Object> shareData) {
        UserEntity currentUser = getCurrentUser();
        
        @SuppressWarnings("unchecked")
        List<String> receiverUsernames = (List<String>) shareData.get("receiverUsernames");
        Long postId = Long.valueOf(shareData.get("postId").toString());
        String message = (String) shareData.get("message");
        
        int successCount = 0;
        int failureCount = 0;
        
        for (String receiverUsername : receiverUsernames) {
            try {
                Long receiverId = userService.getUserIdByUsername(receiverUsername);
                boolean canSend = messageUserSearchService.canSendMessageTo(currentUser.getId(), receiverId);
                if (canSend) {
                    messageService.sharePost(currentUser.getId(), receiverId, postId, message);
                    successCount++;
                } else {
                    failureCount++;
                }
            } catch (Exception e) {
                failureCount++;
            }
        }
        
        Map<String, Object> result = Map.of(
            "successCount", successCount,
            "failureCount", failureCount,
            "totalCount", receiverUsernames.size()
        );
        
        return ResponseEntity.ok(result);
    }

    @MessageMapping("/heartbeat")
    public void handleHeartbeat(SimpMessageHeaderAccessor headerAccessor) {
        try {
            UserEntity currentUser = getUserFromWebSocket(headerAccessor);
            if (currentUser == null) return;
            messageCacheService.cacheOnlineUser(currentUser.getId());
            messageCacheService.setUserLastSeen(currentUser.getId());
        } catch (Exception e) {
            log.error("Error handling heartbeat", e);
        }
    }

}