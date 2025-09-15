package com.winter.wokkitokki.message.service;

import com.winter.wokkitokki.common.service.FileService;
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
import org.springframework.web.multipart.MultipartFile;

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
    private final FileService fileService;

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
        // MessageType 자동 결정
        MessageEntity.MessageType finalMessageType = determineMessageType(imageUrl, fileUrl, sharedPostId, messageType);
        message.setMessageType(finalMessageType);
        
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
    public MessageDto sendMessageWithFiles(Long senderId, Long receiverId, String content,
                                           MultipartFile image, MultipartFile file, Long sharedPostId,
                                           MessageEntity.MessageType requestedType) {
        String imageUrl = null;
        String fileUrl = null;
        String fileName = null;

        try {
            // 이미지 파일 처리
            if (image != null && !image.isEmpty()) {
                imageUrl = uploadMessageImage(image);
            }

            // 일반 파일 처리
            if (file != null && !file.isEmpty()) {
                fileUrl = uploadMessageFile(file);
                fileName = file.getOriginalFilename();
            }

            // 메시지 전송 (requestedType을 전달하여 서버에서 최종 검증)
            return sendMessage(senderId, receiverId, content, imageUrl, fileUrl, fileName, sharedPostId, requestedType);

        } catch (Exception e) {
            // 업로드 실패 시 이미 업로드된 파일들 정리
            if (imageUrl != null) deleteMessageFile(imageUrl);
            if (fileUrl != null) deleteMessageFile(fileUrl);
            throw new RuntimeException("메시지 전송 실패: " + e.getMessage(), e);
        }
    }

    @Transactional
    public MessageDto sharePost(Long senderId, Long receiverId, Long postId, String message) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        String content = message != null && !message.trim().isEmpty()
                ? message : "게시글을 공유했습니다.";

        return sendMessage(senderId, receiverId, content, null, null, null, postId, MessageEntity.MessageType.POST_SHARE);
    }

    @Transactional
    public Page<MessageDto> getMessages(Long userId, Long otherUserId, int page, int size) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserEntity otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("Other user not found"));

        ChatRoomEntity chatRoom = findOrCreateChatRoom(user, otherUser);

        Pageable pageable = PageRequest.of(page, size);

        // 사용자가 채팅방을 나간 상태인지 확인
        boolean userLeft = (chatRoom.getUser1().getId().equals(userId) && chatRoom.isUser1Left()) ||
                          (chatRoom.getUser2().getId().equals(userId) && chatRoom.isUser2Left());

        Page<MessageEntity> messages;
        if (userLeft) {
            // 나간 사용자는 채팅방 생성 시점 이후의 메시지만 보기 (즉, 빈 메시지)
            // 실제로는 나간 시점 이후의 메시지만 보여야 하지만, 일단은 모든 메시지를 숨김
            messages = messageRepository.findMessagesBetweenUsersAfterDate(user, otherUser, LocalDateTime.now(), pageable);
        } else {
            // 나가지 않은 사용자는 모든 메시지 보기
            messages = messageRepository.findMessagesBetweenUsers(user, otherUser, pageable);
        }

        // 메시지 조회 시 자동으로 읽음 처리
        markMessagesAsRead(userId, otherUserId);

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
                .filter(chatRoom -> {
                    // 사용자가 나간 채팅방은 제외
                    if (chatRoom.getUser1().getId().equals(userId)) {
                        return !chatRoom.isUser1Left();
                    } else {
                        return !chatRoom.isUser2Left();
                    }
                })
                .map(chatRoom -> {
                    ChatRoomDto dto = ChatRoomDto.fromEntity(chatRoom);
                    
                    UserEntity otherUser = chatRoom.getUser1().getId().equals(userId) 
                            ? chatRoom.getUser2() : chatRoom.getUser1();
                    
                    // 최신 메시지 가져오기
                    List<MessageEntity> latestMessages = messageRepository.findLatestMessageBetweenUsers(
                            user, otherUser, PageRequest.of(0, 1));
                    
                    if (!latestMessages.isEmpty()) {
                        MessageEntity lastMessage = latestMessages.get(0);
                        String messagePreview = getMessagePreview(lastMessage);
                        dto.setLastMessage(messagePreview);
                        dto.setLastMessageTime(lastMessage.getCreatedAt().toString());
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
                    // Entity의 실제 시간을 사용해서 정렬
                    ChatRoomEntity chatRoomA = chatRooms.stream()
                            .filter(cr -> cr.getRoomId().equals(a.getRoomId()))
                            .findFirst().orElse(null);
                    ChatRoomEntity chatRoomB = chatRooms.stream()
                            .filter(cr -> cr.getRoomId().equals(b.getRoomId()))
                            .findFirst().orElse(null);
                    
                    if (chatRoomA == null || chatRoomB == null) return 0;
                    
                    LocalDateTime timeA = chatRoomA.getLastMessageAt() != null ? 
                            chatRoomA.getLastMessageAt() : chatRoomA.getCreatedAt();
                    LocalDateTime timeB = chatRoomB.getLastMessageAt() != null ? 
                            chatRoomB.getLastMessageAt() : chatRoomB.getCreatedAt();
                    
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
        // 기존 채팅방이 있는지 확인 (최신순으로 정렬된 리스트)
        List<ChatRoomEntity> existingChatRooms = chatRoomRepository.findByUsers(user1, user2);

        // 활성 상태인 채팅방이 있으면 그대로 사용 (나간 사용자 상태는 변경하지 않음)
        for (ChatRoomEntity chatRoom : existingChatRooms) {
            if (chatRoom.isActive()) {
                return chatRoom;
            }
        }

        // 활성 채팅방이 없으면 새로운 채팅방 생성
        ChatRoomEntity newChatRoom = new ChatRoomEntity();
        newChatRoom.setRoomId(UUID.randomUUID().toString());
        newChatRoom.setUser1(user1);
        newChatRoom.setUser2(user2);
        newChatRoom.setCreatedAt(LocalDateTime.now());
        newChatRoom.setLastMessageAt(LocalDateTime.now());
        newChatRoom.setActive(true);
        newChatRoom.setUser1Left(false);
        newChatRoom.setUser2Left(false);
        return chatRoomRepository.save(newChatRoom);
    }


    private MessageEntity.MessageType determineMessageType(String imageUrl, String fileUrl, Long sharedPostId, MessageEntity.MessageType requestedType) {
        // 요청된 타입이 있고 그에 맞는 데이터가 있으면 우선 사용
        if (requestedType != null && requestedType != MessageEntity.MessageType.TEXT) {
            return requestedType;
        }

        // 자동 결정 로직
        if (sharedPostId != null) {
            return MessageEntity.MessageType.POST_SHARE;
        } else if (imageUrl != null && !imageUrl.trim().isEmpty()) {
            return MessageEntity.MessageType.IMAGE;
        } else if (fileUrl != null && !fileUrl.trim().isEmpty()) {
            return MessageEntity.MessageType.FILE;
        } else {
            return MessageEntity.MessageType.TEXT;
        }
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
                    return "메시지";
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

        // 사용자별로 나가기 상태 설정
        if (chatRoom.getUser1().getId().equals(userId)) {
            chatRoom.setUser1Left(true);
        } else {
            chatRoom.setUser2Left(true);
        }

        // 두 사용자 모두 나갔다면 채팅방을 비활성화
        if (chatRoom.isUser1Left() && chatRoom.isUser2Left()) {
            chatRoom.setActive(false);
        }

        chatRoomRepository.save(chatRoom);

        messageCacheService.invalidateChatRoomsCache(chatRoom.getUser1().getId());
        messageCacheService.invalidateChatRoomsCache(chatRoom.getUser2().getId());
    }

    @Transactional
    public void deleteChatRoomByUsers(Long userId, Long otherUserId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserEntity otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("Other user not found"));

        List<ChatRoomEntity> chatRooms = chatRoomRepository.findByUsers(user, otherUser);

        // 활성 채팅방 중에서 사용자가 참여 중인 방 찾기
        ChatRoomEntity activeChatRoom = chatRooms.stream()
                .filter(chatRoom -> chatRoom.isActive())
                .filter(chatRoom -> {
                    // 현재 사용자가 나가지 않은 방만 대상으로 함
                    if (chatRoom.getUser1().getId().equals(userId)) {
                        return !chatRoom.isUser1Left();
                    } else {
                        return !chatRoom.isUser2Left();
                    }
                })
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // 사용자별로 나가기 상태 설정
        if (activeChatRoom.getUser1().getId().equals(userId)) {
            activeChatRoom.setUser1Left(true);
        } else {
            activeChatRoom.setUser2Left(true);
        }

        // 두 사용자 모두 나갔다면 채팅방을 비활성화
        if (activeChatRoom.isUser1Left() && activeChatRoom.isUser2Left()) {
            activeChatRoom.setActive(false);
        }

        chatRoomRepository.save(activeChatRoom);

        messageCacheService.invalidateChatRoomsCache(userId);
        messageCacheService.invalidateChatRoomsCache(otherUserId);
    }

    @Transactional
    public String uploadMessageImage(MultipartFile file) {
        fileService.validateImageFile(file);
        fileService.validateFileSize(file, 10 * 1024 * 1024); // 10MB

        try {
            return fileService.uploadFile(file, "messages");
        } catch (Exception e) {
            throw new RuntimeException("이미지 업로드에 실패했습니다: " + e.getMessage(), e);
        }
    }

    @Transactional
    public String uploadMessageFile(MultipartFile file) {
        fileService.validateFileSize(file, 50 * 1024 * 1024); // 50MB

        try {
            return fileService.uploadFile(file, "messages");
        } catch (Exception e) {
            throw new RuntimeException("파일 업로드에 실패했습니다: " + e.getMessage(), e);
        }
    }

    public void deleteMessageFile(String fileUrl) {
        if (fileUrl != null && !fileUrl.isEmpty()) {
            try {
                fileService.deleteFile(fileUrl);
            } catch (Exception e) {
                log.warn("메시지 파일 삭제 실패: " + fileUrl, e);
            }
        }
    }
}