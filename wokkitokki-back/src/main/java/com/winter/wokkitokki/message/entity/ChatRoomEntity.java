package com.winter.wokkitokki.message.entity;

import com.winter.wokkitokki.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_rooms")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String roomId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user1_id", nullable = false)
    private UserEntity user1;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user2_id", nullable = false)
    private UserEntity user2;
    
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(nullable = false)
    private LocalDateTime lastMessageAt = LocalDateTime.now();
    
    @Column(name = "is_active", nullable = false)
    private boolean active = true;


    // Pair 기반 시스템을 위한 유틸리티 메서드들

    /**
     * 두 사용자로부터 정규화된 ChatRoom 생성 (항상 낮은 ID를 user1으로)
     */
    public static ChatRoomEntity createNormalized(UserEntity userA, UserEntity userB) {
        ChatRoomEntity chatRoom = new ChatRoomEntity();
        if (userA.getId() < userB.getId()) {
            chatRoom.setUser1(userA);
            chatRoom.setUser2(userB);
        } else {
            chatRoom.setUser1(userB);
            chatRoom.setUser2(userA);
        }
        chatRoom.setCreatedAt(LocalDateTime.now());
        chatRoom.setLastMessageAt(LocalDateTime.now());
        chatRoom.setActive(true);
        return chatRoom;
    }

    /**
     * 특정 사용자의 상대방 반환
     */
    public UserEntity getOtherUser(Long userId) {
        return user1.getId().equals(userId) ? user2 : user1;
    }

    /**
     * Pair ID 생성 (정규화된 형태: "userId1-userId2")
     */
    public String getPairId() {
        return user1.getId() + "-" + user2.getId();
    }
}