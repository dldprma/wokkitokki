package com.winter.wokkitokki.message.entity;

import com.winter.wokkitokki.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dialogs")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Dialog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dialog_id", nullable = false, unique = true)
    private String dialogId = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserEntity owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "other_user_id", nullable = false)
    private UserEntity otherUser;

    @Column(name = "pair_id", nullable = false)
    private String pairId;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "archived", nullable = false)
    private boolean archived = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * 새 Dialog 생성
     */
    public static Dialog create(UserEntity owner, UserEntity otherUser, String pairId, LocalDateTime startedAt) {
        Dialog dialog = new Dialog();
        dialog.setOwner(owner);
        dialog.setOtherUser(otherUser);
        dialog.setPairId(pairId);
        dialog.setStartedAt(startedAt != null ? startedAt : LocalDateTime.now());
        dialog.setLastMessageAt(LocalDateTime.now());
        dialog.setArchived(false);
        dialog.setCreatedAt(LocalDateTime.now());
        return dialog;
    }

    /**
     * Dialog 아카이브 처리
     */
    public void archive() {
        this.archived = true;
    }

    /**
     * 마지막 메시지 시간 업데이트
     */
    public void updateLastMessageAt(LocalDateTime lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
    }
}