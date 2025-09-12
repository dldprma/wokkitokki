package com.winter.wokkitokki.message.repository;

import com.winter.wokkitokki.message.entity.MessageEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<MessageEntity, Long> {
    
    @Query("SELECT m FROM MessageEntity m WHERE " +
           "(m.sender = :user1 AND m.receiver = :user2) OR " +
           "(m.sender = :user2 AND m.receiver = :user1) " +
           "AND m.deleted = false " +
           "ORDER BY m.createdAt DESC")
    Page<MessageEntity> findMessagesBetweenUsers(@Param("user1") UserEntity user1, 
                                                @Param("user2") UserEntity user2, 
                                                Pageable pageable);
    
    @Query("SELECT COUNT(m) FROM MessageEntity m WHERE " +
           "m.receiver = :receiver AND m.sender = :sender AND " +
           "m.isRead = false AND m.deleted = false")
    int countUnreadMessages(@Param("receiver") UserEntity receiver, 
                           @Param("sender") UserEntity sender);
    
    @Modifying
    @Query("UPDATE MessageEntity m SET m.isRead = true WHERE " +
           "m.receiver = :receiver AND m.sender = :sender AND m.isRead = false")
    void markMessagesAsRead(@Param("receiver") UserEntity receiver, 
                           @Param("sender") UserEntity sender);
    
    @Query("SELECT m FROM MessageEntity m WHERE " +
           "(m.sender = :user1 AND m.receiver = :user2) OR " +
           "(m.sender = :user2 AND m.receiver = :user1) " +
           "AND m.deleted = false " +
           "ORDER BY m.createdAt DESC")
    List<MessageEntity> findLatestMessageBetweenUsers(@Param("user1") UserEntity user1, 
                                                     @Param("user2") UserEntity user2, 
                                                     Pageable pageable);
}