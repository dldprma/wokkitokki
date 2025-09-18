package com.winter.wokkitokki.message.dto;

import com.winter.wokkitokki.message.entity.MessageEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class MessageDto {
    private Long id;
    private String content;
    private String imageUrl;
    private String fileUrl;
    private String fileName;
    private Long sharedPostId;
    private PostShareDto sharedPost;
    private Long senderId;
    private String senderUsername;
    private String senderFullName;
    private Long receiverId;
    private String receiverUsername;
    private String receiverFullName;
    private String createdAt;
    private boolean isRead;
    private MessageEntity.MessageType messageType;
    private String roomId;
    
    public static MessageDto fromEntity(MessageEntity message, String roomId) {
        MessageDto dto = new MessageDto();
        dto.setId(message.getId());
        dto.setContent(message.getContent());
        dto.setImageUrl(message.getImageUrl());
        dto.setSharedPostId(message.getSharedPostId());
        dto.setSenderId(message.getSender().getId());
        dto.setSenderUsername(message.getSender().getUsername());
        dto.setSenderFullName(message.getSender().getFullName());
        dto.setReceiverId(message.getReceiver().getId());
        dto.setReceiverUsername(message.getReceiver().getUsername());
        dto.setReceiverFullName(message.getReceiver().getFullName());
        dto.setCreatedAt(message.getCreatedAt().toString());
        dto.setRead(message.isRead());
        dto.setMessageType(message.getMessageType());
        dto.setRoomId(roomId);
        return dto;
    }
}