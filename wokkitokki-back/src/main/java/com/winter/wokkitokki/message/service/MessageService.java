package com.winter.wokkitokki.message.service;

import com.winter.wokkitokki.message.dto.ChatRoomDto;
import com.winter.wokkitokki.message.dto.MessageDto;
import com.winter.wokkitokki.message.dto.PostShareDto;
import com.winter.wokkitokki.message.entity.ChatRoomEntity;
import com.winter.wokkitokki.message.entity.MessageEntity;
import com.winter.wokkitokki.message.repository.ChatRoomRepository;
import com.winter.wokkitokki.message.repository.MessageRepository;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final RedisMessagePublisher redisMessagePublisher;
    private final MessageCacheService messageCacheService;

    @Transactional
    public MessageDto sendMessage(Long senderId, Long receiverId, String content) {
        return sendMessage(senderId, receiverId, content, null, null, null, MessageEntity.MessageType.TEXT);
    }

    @Transactional
    public MessageDto sendMessage(Long senderId, Long receiverId, String content, 
                                 String imageUrl, String fileUrl, String fileName, 
                                 MessageEntity.MessageType messageType) {
        return sendMessage(senderId, receiverId, content, imageUrl, fileUrl, fileName, null, messageType);
    }

    @Transactional
    public MessageDto sendMessage(Long senderId, Long receiverId, String content, 
                                 String imageUrl, String fileUrl, String fileName, 
                                 Long sharedPostId, MessageEntity.MessageType messageType) {
        UserEntity sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        UserEntity receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        ChatRoomEntity chatRoom = findOrCreateChatRoom(sender, receiver);
        
        MessageEntity message = new MessageEntity();
        message.setContent(content);
        message.setImageUrl(imageUrl);
        message.setFileUrl(fileUrl);
        message.setFileName(fileName);
        message.setSharedPostId(sharedPostId);
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setCreatedAt(LocalDateTime.now());
        message.setRead(false);
        message.setMessageType(messageType);
        
        MessageEntity savedMessage = messageRepository.save(message);
        
        chatRoom.setLastMessageAt(LocalDateTime.now());
        chatRoomRepository.save(chatRoom);
        
        MessageDto messageDto = MessageDto.fromEntity(savedMessage, chatRoom.getRoomId());
        
        if (sharedPostId != null) {
            PostEntity post = postRepository.findById(sharedPostId).orElse(null);
            messageDto.setSharedPost(PostShareDto.fromEntity(post));
        }
        
        redisMessagePublisher.publishMessage("message", messageDto);
        
        messageCacheService.invalidateChatRoomsCache(senderId);
        messageCacheService.invalidateChatRoomsCache(receiverId);
        messageCacheService.invalidateUnreadCountCache(senderId, receiverId);
        
        return messageDto;
    }

    @Transactional
    public MessageDto sharePost(Long senderId, Long receiverId, Long postId, String message) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        String content = message != null && !message.trim().isEmpty() 
                ? message : "게시글을 공유했습니다.";
        
        return sendMessage(senderId, receiverId, content, null, null, null, postId, MessageEntity.MessageType.POST_SHARE);
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> getMessages(Long userId, Long otherUserId, int page, int size) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserEntity otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("Other user not found"));

        Pageable pageable = PageRequest.of(page, size);
        Page<MessageEntity> messages = messageRepository.findMessagesBetweenUsers(user, otherUser, pageable);
        
        ChatRoomEntity chatRoom = findOrCreateChatRoom(user, otherUser);
        
        return messages.map(message -> {
            MessageDto dto = MessageDto.fromEntity(message, chatRoom.getRoomId());
            
            if (message.getSharedPostId() != null) {
                PostEntity post = postRepository.findById(message.getSharedPostId()).orElse(null);
                dto.setSharedPost(PostShareDto.fromEntity(post));
            }
            
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public List<ChatRoomDto> getChatRooms(Long userId) {
        List<ChatRoomDto> cachedChatRooms = messageCacheService.getCachedChatRooms(userId);
        if (cachedChatRooms != null) {
            return cachedChatRooms;
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ChatRoomEntity> chatRooms = chatRoomRepository.findByUser(user);
        
        List<ChatRoomDto> chatRoomDtos = chatRooms.stream()
                .map(chatRoom -> {
                    ChatRoomDto dto = ChatRoomDto.fromEntity(chatRoom);
                    
                    UserEntity otherUser = chatRoom.getUser1().getId().equals(userId) 
                            ? chatRoom.getUser2() : chatRoom.getUser1();
                    
                    List<MessageEntity> latestMessages = messageRepository.findLatestMessageBetweenUsers(
                            user, otherUser, PageRequest.of(0, 1));
                    
                    if (!latestMessages.isEmpty()) {
                        MessageEntity lastMessage = latestMessages.get(0);
                        String messagePreview = getMessagePreview(lastMessage);
                        dto.setLastMessage(messagePreview);
                        dto.setLastMessageTime(lastMessage.getCreatedAt());
                    }
                    
                    Integer cachedUnreadCount = messageCacheService.getCachedUnreadCount(userId, otherUser.getId());
                    if (cachedUnreadCount != null) {
                        dto.setUnreadCount(cachedUnreadCount);
                    } else {
                        int unreadCount = messageRepository.countUnreadMessages(user, otherUser);
                        dto.setUnreadCount(unreadCount);
                        messageCacheService.cacheUnreadCount(userId, otherUser.getId(), unreadCount);
                    }
                    
                    dto.setOtherUserOnline(messageCacheService.isUserOnline(otherUser.getId()));
                    dto.setLastSeenTime(messageCacheService.getUserLastSeen(otherUser.getId()));
                    
                    return dto;
                })
                .sorted((a, b) -> {
                    LocalDateTime timeA = a.getLastMessageTime() != null ? a.getLastMessageTime() : a.getCreatedAt();
                    LocalDateTime timeB = b.getLastMessageTime() != null ? b.getLastMessageTime() : b.getCreatedAt();
                    return timeB.compareTo(timeA);
                })
                .collect(Collectors.toList());
        
        messageCacheService.cacheChatRooms(userId, chatRoomDtos);
        return chatRoomDtos;
    }

    @Transactional
    public void markMessagesAsRead(Long userId, Long otherUserId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserEntity otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("Other user not found"));

        messageRepository.markMessagesAsRead(user, otherUser);
        
        messageCacheService.invalidateUnreadCountCache(userId, otherUserId);
        messageCacheService.invalidateChatRoomsCache(userId);
    }

    private ChatRoomEntity findOrCreateChatRoom(UserEntity user1, UserEntity user2) {
        return chatRoomRepository.findByUsers(user1, user2)
                .orElseGet(() -> {
                    ChatRoomEntity newChatRoom = new ChatRoomEntity();
                    newChatRoom.setRoomId(UUID.randomUUID().toString());
                    newChatRoom.setUser1(user1);
                    newChatRoom.setUser2(user2);
                    newChatRoom.setCreatedAt(LocalDateTime.now());
                    newChatRoom.setLastMessageAt(LocalDateTime.now());
                    newChatRoom.setActive(true);
                    return chatRoomRepository.save(newChatRoom);
                });
    }

    private String getMessagePreview(MessageEntity message) {
        switch (message.getMessageType()) {
            case IMAGE:
                return "📷 이미지";
            case FILE:
                return "📎 " + (message.getFileName() != null ? message.getFileName() : "파일");
            case POST_SHARE:
                return "🔗 게시글을 공유했습니다";
            case TEXT:
            default:
                String content = message.getContent();
                if (content == null || content.trim().isEmpty()) {
                    return "메시지를 보냈습니다.";
                }
                return content.length() > 50 ? content.substring(0, 50) + "..." : content;
        }
    }

    @Transactional
    public ChatRoomDto createOrGetChatRoom(Long userId, Long otherUserId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserEntity otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("Other user not found"));

        ChatRoomEntity chatRoom = findOrCreateChatRoom(user, otherUser);
        ChatRoomDto dto = ChatRoomDto.fromEntity(chatRoom);
        
        dto.setOtherUserOnline(messageCacheService.isUserOnline(otherUserId));
        dto.setLastSeenTime(messageCacheService.getUserLastSeen(otherUserId));
        
        messageCacheService.invalidateChatRoomsCache(userId);
        messageCacheService.invalidateChatRoomsCache(otherUserId);
        
        return dto;
    }

    @Transactional
    public void deleteChatRoom(String roomId, Long userId) {
        ChatRoomEntity chatRoom = chatRoomRepository.findByRoomId(roomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        if (!chatRoom.getUser1().getId().equals(userId) && !chatRoom.getUser2().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to delete this chat room");
        }
        
        chatRoom.setActive(false);
        chatRoomRepository.save(chatRoom);
        
        messageCacheService.invalidateChatRoomsCache(chatRoom.getUser1().getId());
        messageCacheService.invalidateChatRoomsCache(chatRoom.getUser2().getId());
    }
}