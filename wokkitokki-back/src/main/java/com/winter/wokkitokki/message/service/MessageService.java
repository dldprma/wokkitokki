package com.winter.wokkitokki.message.service;

import com.winter.wokkitokki.common.service.FileService;
import com.winter.wokkitokki.message.dto.ChatRoomDto;
import com.winter.wokkitokki.message.dto.MessageDto;
import com.winter.wokkitokki.message.dto.PostShareDto;
import com.winter.wokkitokki.message.entity.ChatRoomEntity;
import com.winter.wokkitokki.message.entity.MessageEntity;
import com.winter.wokkitokki.message.entity.ParticipantState;
import com.winter.wokkitokki.message.entity.Dialog;
import com.winter.wokkitokki.message.repository.ChatRoomRepository;
import com.winter.wokkitokki.message.repository.MessageRepository;
import com.winter.wokkitokki.message.repository.ParticipantStateRepository;
import com.winter.wokkitokki.message.repository.DialogRepository;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
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
    private final ParticipantStateRepository participantStateRepository;
    private final DialogRepository dialogRepository;
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

        // Pair 기반 시스템: 항상 하나의 ChatRoom을 사용
        ChatRoomEntity chatRoom = findOrCreateChatRoom(sender, receiver);
        String pairId = chatRoom.getPairId();

        MessageEntity message = new MessageEntity();
        message.setContent(content);
        message.setImageUrl(imageUrl);
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

        // 양쪽 사용자의 ParticipantState 확인/생성
        participantStateRepository.findOrCreateByUserAndPairId(sender, pairId);
        participantStateRepository.findOrCreateByUserAndPairId(receiver, pairId);

        // Dialog 확인/생성 (UI용)
        ensureDialogExists(sender, receiver, pairId);
        ensureDialogExists(receiver, sender, pairId);

        MessageDto messageDto = MessageDto.fromEntity(savedMessage, chatRoom.getRoomId());

        if (sharedPostId != null) {
            PostEntity post = postRepository.findById(sharedPostId).orElse(null);
            messageDto.setSharedPost(PostShareDto.fromEntity(post));
        }

        // Pair 기반 채널로 발행 (pair:{pairId})
        redisMessagePublisher.publishMessage("pair:" + pairId, messageDto);
        
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

        System.out.println("=== getMessages Debug ===");
        System.out.println("userId: " + userId + ", otherUserId: " + otherUserId);
        System.out.println("user: " + user.getUsername() + ", otherUser: " + otherUser.getUsername());

        ChatRoomEntity chatRoom = findOrCreateChatRoom(user, otherUser);
        String pairId = chatRoom.getPairId();

        // 사용자의 reset_at 확인
        ParticipantState participantState = participantStateRepository.findOrCreateByUserAndPairId(user, pairId);
        LocalDateTime resetAt = participantState.getResetAt();
        
        System.out.println("pairId: " + pairId);
        System.out.println("resetAt: " + resetAt);

        final ChatRoomEntity finalChatRoom = chatRoom;

        Pageable pageable = PageRequest.of(page, size);
        Page<MessageEntity> messages;

        // 모든 메시지를 가져온 후 애플리케이션에서 필터링
        Page<MessageEntity> originalMessages = messageRepository.findMessagesBetweenUsers(user, otherUser, pageable);

        System.out.println("Total messages found: " + originalMessages.getTotalElements());
        System.out.println("Messages in current page: " + originalMessages.getContent().size());
        System.out.println("resetAt: " + resetAt);

        // resetAt이 null이 아니고, 실제로 "나가기"를 통해 설정된 경우에만 필터링
        if (resetAt != null && isValidResetTime(resetAt)) {
            // reset_at 이후의 메시지만 필터링
            final LocalDateTime finalResetAt = resetAt;
            System.out.println("Filtering messages after: " + finalResetAt);

            // 필터링된 메시지 리스트 생성
            List<MessageEntity> filteredMessages = originalMessages.getContent().stream()
                    .filter(message -> message.getCreatedAt().isAfter(finalResetAt))
                    .collect(Collectors.toList());

            System.out.println("Messages after filtering: " + filteredMessages.size());

            // 새로운 Page 객체 생성 (필터링된 결과로)
            messages = new PageImpl<>(
                    filteredMessages,
                    pageable,
                    filteredMessages.size()
            );
        } else {
            // resetAt이 null이거나 잘못된 값이면 모든 메시지 표시
            System.out.println("No filtering applied - showing all messages");
            messages = originalMessages;
        }

        // 메시지 조회 시 자동으로 읽음 처리
        markMessagesAsRead(userId, otherUserId);

        return messages.map(message -> {
            MessageDto dto = MessageDto.fromEntity(message, finalChatRoom.getRoomId());

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

        // 기존 ChatRoom 기반으로 조회 (하위 호환성)
        List<ChatRoomEntity> chatRooms = chatRoomRepository.findByUser(user);
        
        List<ChatRoomDto> chatRoomDtos = chatRooms.stream()
                .map(chatRoom -> {
                    UserEntity otherUser = chatRoom.getOtherUser(userId);
                    String pairId = chatRoom.getPairId();

                    // ParticipantState를 통해 reset_at 확인
                    ParticipantState participantState = participantStateRepository.findOrCreateByUserAndPairId(user, pairId);
                    LocalDateTime resetAt = participantState.getResetAt();

                    // Dialog 확인 (있으면 dialogId 사용, 없으면 chatRoom roomId 사용)
                    Dialog dialog = dialogRepository.findActiveDialogByOwnerAndPairId(user, pairId).orElse(null);
                    String roomId = dialog != null ? dialog.getDialogId() : chatRoom.getRoomId();

                    ChatRoomDto dto = ChatRoomDto.fromEntity(chatRoom);
                    dto.setRoomId(roomId); // Dialog가 있으면 dialogId, 없으면 기존 roomId

                    // 최신 메시지 가져오기
                    List<MessageEntity> latestMessages = messageRepository.findLatestMessageBetweenUsers(
                            user, otherUser, PageRequest.of(0, 1));

                    // reset_at 이후 메시지만 필터링
                    if (resetAt != null) {
                        final LocalDateTime finalResetAt = resetAt;
                        latestMessages = latestMessages.stream()
                                .filter(m -> m.getCreatedAt().isAfter(finalResetAt))
                                .collect(Collectors.toList());
                    }

                    if (!latestMessages.isEmpty()) {
                        MessageEntity lastMessage = latestMessages.get(0);
                        String messagePreview = getMessagePreview(lastMessage);
                        dto.setLastMessage(messagePreview);
                        dto.setLastMessageTime(lastMessage.getCreatedAt().toString());
                    }

                    // 읽지 않은 메시지 수 (reset_at 기반)
                    Integer cachedUnreadCount = messageCacheService.getCachedUnreadCount(userId, otherUser.getId());
                    if (cachedUnreadCount != null) {
                        dto.setUnreadCount(cachedUnreadCount);
                    } else {
                        // 읽지 않은 메시지 수 계산 (간단하게 기존 방식 사용)
                        int unreadCount = messageRepository.countUnreadMessages(user, otherUser);
                        dto.setUnreadCount(unreadCount);
                        messageCacheService.cacheUnreadCount(userId, otherUser.getId(), unreadCount);
                    }

                    dto.setOtherUserOnline(messageCacheService.isUserOnline(otherUser.getId()));
                    dto.setLastSeenTime(messageCacheService.getUserLastSeen(otherUser.getId()));

                    return dto;
                })
                .sorted((a, b) -> {
                    // lastMessageTime으로 정렬
                    if (a.getLastMessageTime() == null && b.getLastMessageTime() == null) return 0;
                    if (a.getLastMessageTime() == null) return 1;
                    if (b.getLastMessageTime() == null) return -1;

                    LocalDateTime timeA = LocalDateTime.parse(a.getLastMessageTime());
                    LocalDateTime timeB = LocalDateTime.parse(b.getLastMessageTime());
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
        // 정규화된 방식으로 기존 채팅방 조회 (user1은 항상 낮은 ID)
        List<ChatRoomEntity> existingChatRooms = chatRoomRepository.findByTwoUsers(user1, user2);

        // Pair 기반 시스템에서는 활성 채팅방이 있으면 항상 재사용
        for (ChatRoomEntity chatRoom : existingChatRooms) {
            if (chatRoom.isActive()) {
                return chatRoom;
            }
        }

        // 활성 채팅방이 없으면 새로운 채팅방 생성 (정규화된 방식)
        ChatRoomEntity newChatRoom = ChatRoomEntity.createNormalized(user1, user2);
        newChatRoom.setRoomId(UUID.randomUUID().toString());
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
        } else {
            return MessageEntity.MessageType.TEXT;
        }
    }

    private String getMessagePreview(MessageEntity message) {
        switch (message.getMessageType()) {
            case IMAGE:
                return "📷 이미지";
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

        // Pair 기반 ChatRoom 확보
        ChatRoomEntity chatRoom = findOrCreateChatRoom(user, otherUser);
        String pairId = chatRoom.getPairId();

        // ParticipantState 확인/생성
        ParticipantState participantState = participantStateRepository.findOrCreateByUserAndPairId(user, pairId);

        // 활성 Dialog 찾기 또는 생성
        Dialog dialog = dialogRepository.findActiveDialogByOwnerAndPairId(user, pairId)
                .orElseGet(() -> {
                    Dialog newDialog = Dialog.create(user, otherUser, pairId, participantState.getResetAt());
                    return dialogRepository.save(newDialog);
                });

        // ChatRoomDto 생성 (Dialog 기반)
        ChatRoomDto dto = new ChatRoomDto();
        dto.setRoomId(dialog.getDialogId());
        dto.setUser1Id(user.getId());
        dto.setUser1Username(user.getUsername());
        dto.setUser1FullName(user.getFullName());
        dto.setUser1ProfileImg(user.getProfileImgUrl());
        dto.setUser2Id(otherUser.getId());
        dto.setUser2Username(otherUser.getUsername());
        dto.setUser2FullName(otherUser.getFullName());
        dto.setUser2ProfileImg(otherUser.getProfileImgUrl());
        dto.setCreatedAt(dialog.getStartedAt().toString());
        dto.setActive(true);

        dto.setOtherUserOnline(messageCacheService.isUserOnline(otherUserId));
        dto.setLastSeenTime(messageCacheService.getUserLastSeen(otherUserId));

        messageCacheService.invalidateChatRoomsCache(userId);
        messageCacheService.invalidateChatRoomsCache(otherUserId);

        return dto;
    }

    /**
     * Dialog 존재 확인/생성 (UI용 가짜 방)
     */
    private void ensureDialogExists(UserEntity owner, UserEntity otherUser, String pairId) {
        ParticipantState participantState = participantStateRepository.findOrCreateByUserAndPairId(owner, pairId);

        // 활성 Dialog가 없으면 생성
        if (!dialogRepository.findActiveDialogByOwnerAndPairId(owner, pairId).isPresent()) {
            Dialog dialog = Dialog.create(owner, otherUser, pairId, participantState.getResetAt());
            dialogRepository.save(dialog);
        }
    }

    /**
     * 사용자가 채팅방을 "나가기" (Pair 기반 시스템)
     * - reset_at 업데이트
     * - 기존 Dialog를 아카이브
     * - 실제 ChatRoom/Message는 유지
     */
    @Transactional
    public void leaveChatRoomByDialogId(String dialogId, Long userId) {
        Dialog dialog = dialogRepository.findByDialogId(dialogId)
                .orElseThrow(() -> new RuntimeException("Dialog not found"));

        if (!dialog.getOwner().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to leave this dialog");
        }

        UserEntity user = dialog.getOwner();
        String pairId = dialog.getPairId();
        LocalDateTime now = LocalDateTime.now();

        // ParticipantState의 reset_at 업데이트
        ParticipantState participantState = participantStateRepository.findOrCreateByUserAndPairId(user, pairId);
        participantState.updateResetAt(now);
        participantStateRepository.save(participantState);

        // 기존 Dialog 아카이브
        dialog.archive();
        dialogRepository.save(dialog);

        messageCacheService.invalidateChatRoomsCache(userId);
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

    /**
     * resetAt이 유효한 시간인지 확인
     * 2000-01-01 00:00:00 같은 기본값이나 과거 시간이면 무시
     */
    private boolean isValidResetTime(LocalDateTime resetAt) {
        if (resetAt == null) {
            return false;
        }

        // 2010년 이전의 시간이면 무효한 resetAt으로 간주
        LocalDateTime minValidTime = LocalDateTime.of(2010, 1, 1, 0, 0);

        return resetAt.isAfter(minValidTime);
    }
}