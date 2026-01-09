package com.winter.wokkitokki.message.entity;

import com.winter.wokkitokki.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "participant_states")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "pair_id", nullable = false)
    private String pairId;

    @Column(name = "reset_at")
    private LocalDateTime resetAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    /**
     * 정규화된 ParticipantState 생성
     * resetAt은 명시적으로 null로 설정 (사용자가 채팅방을 나갈 때만 설정됨)
     */
    public static ParticipantState create(UserEntity user, String pairId) {
        ParticipantState state = new ParticipantState();
        state.setUser(user);
        state.setPairId(pairId);
        state.setResetAt(null); // 명시적으로 null 설정
        state.setCreatedAt(LocalDateTime.now());
        state.setUpdatedAt(LocalDateTime.now());
        return state;
    }

    /**
     * reset_at 업데이트 (사용자가 방을 "나간" 시점 기록)
     */
    public void updateResetAt(LocalDateTime resetAt) {
        this.resetAt = resetAt;
        this.updatedAt = LocalDateTime.now();
    }
}