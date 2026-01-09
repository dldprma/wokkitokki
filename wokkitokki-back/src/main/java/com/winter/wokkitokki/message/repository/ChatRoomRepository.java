package com.winter.wokkitokki.message.repository;

import com.winter.wokkitokki.message.entity.ChatRoomEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoomEntity, Long> {
    
    @Query("SELECT c FROM ChatRoomEntity c WHERE " +
           "(c.user1 = :user1 AND c.user2 = :user2) OR " +
           "(c.user1 = :user2 AND c.user2 = :user1) " +
           "ORDER BY c.createdAt DESC")
    List<ChatRoomEntity> findByUsers(@Param("user1") UserEntity user1,
                                     @Param("user2") UserEntity user2);

    // 정규화된 조회 (낮은 ID를 user1으로)
    @Query("SELECT c FROM ChatRoomEntity c WHERE " +
           "c.user1 = :userLow AND c.user2 = :userHigh " +
           "ORDER BY c.createdAt DESC")
    List<ChatRoomEntity> findByUsersNormalized(@Param("userLow") UserEntity userLow,
                                              @Param("userHigh") UserEntity userHigh);

    // 유틸리티 메서드
    default List<ChatRoomEntity> findByTwoUsers(UserEntity userA, UserEntity userB) {
        UserEntity userLow = userA.getId() < userB.getId() ? userA : userB;
        UserEntity userHigh = userA.getId() < userB.getId() ? userB : userA;
        return findByUsersNormalized(userLow, userHigh);
    }

    // 기존 방식과 호환성 유지
    default Optional<ChatRoomEntity> findActiveByUsers(UserEntity user1, UserEntity user2) {
        return findByUsers(user1, user2).stream()
                .filter(ChatRoomEntity::isActive)
                .findFirst();
    }
    
    @Query("SELECT c FROM ChatRoomEntity c WHERE " +
           "(c.user1 = :user OR c.user2 = :user) AND c.active = true " +
           "ORDER BY c.lastMessageAt DESC")
    List<ChatRoomEntity> findByUser(@Param("user") UserEntity user);
    
    Optional<ChatRoomEntity> findByRoomId(String roomId);
}