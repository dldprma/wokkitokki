package com.winter.wokkitokki.message.dto;

import com.winter.wokkitokki.message.entity.ChatRoomEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomDto {
    private Long id;
    private String roomId;
    private Long user1Id;
    private String user1Username;
    private String user1FullName;
    private String user1ProfileImg;
    private Long user2Id;
    private String user2Username;
    private String user2FullName;
    private String user2ProfileImg;
    private LocalDateTime createdAt;
    private LocalDateTime lastMessageAt;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private boolean active;
    private int unreadCount;
    private boolean isOtherUserOnline;
    private Long lastSeenTime;
    
    public static ChatRoomDto fromEntity(ChatRoomEntity chatRoom) {
        ChatRoomDto dto = new ChatRoomDto();
        dto.setId(chatRoom.getId());
        dto.setRoomId(chatRoom.getRoomId());
        dto.setUser1Id(chatRoom.getUser1().getId());
        dto.setUser1Username(chatRoom.getUser1().getUsername());
        dto.setUser1FullName(chatRoom.getUser1().getFullName());
        dto.setUser1ProfileImg(chatRoom.getUser1().getProfileImgUrl());
        dto.setUser2Id(chatRoom.getUser2().getId());
        dto.setUser2Username(chatRoom.getUser2().getUsername());
        dto.setUser2FullName(chatRoom.getUser2().getFullName());
        dto.setUser2ProfileImg(chatRoom.getUser2().getProfileImgUrl());
        dto.setCreatedAt(chatRoom.getCreatedAt());
        dto.setLastMessageAt(chatRoom.getLastMessageAt());
        dto.setActive(chatRoom.isActive());
        return dto;
    }
    
    public Long getOtherUserId(Long currentUserId) {
        return currentUserId.equals(user1Id) ? user2Id : user1Id;
    }
    
    public String getOtherUserName(Long currentUserId) {
        return currentUserId.equals(user1Id) ? user2FullName : user1FullName;
    }
    
    public String getOtherUserUsername(Long currentUserId) {
        return currentUserId.equals(user1Id) ? user2Username : user1Username;
    }
    
    public String getOtherUserProfileImg(Long currentUserId) {
        return currentUserId.equals(user1Id) ? user2ProfileImg : user1ProfileImg;
    }
}