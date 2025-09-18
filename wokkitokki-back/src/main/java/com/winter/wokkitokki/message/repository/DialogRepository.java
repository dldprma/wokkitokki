package com.winter.wokkitokki.message.repository;

import com.winter.wokkitokki.message.entity.Dialog;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DialogRepository extends JpaRepository<Dialog, Long> {

    @Query("SELECT d FROM Dialog d WHERE d.owner = :owner AND d.archived = false ORDER BY d.lastMessageAt DESC")
    List<Dialog> findActiveDialogsByOwner(@Param("owner") UserEntity owner);

    @Query("SELECT d FROM Dialog d WHERE d.owner = :owner AND d.otherUser = :otherUser AND d.archived = false")
    Optional<Dialog> findActiveDialogByOwnerAndOtherUser(@Param("owner") UserEntity owner,
                                                        @Param("otherUser") UserEntity otherUser);

    @Query("SELECT d FROM Dialog d WHERE d.dialogId = :dialogId")
    Optional<Dialog> findByDialogId(@Param("dialogId") String dialogId);

    @Query("SELECT d FROM Dialog d WHERE d.owner = :owner AND d.pairId = :pairId AND d.archived = false")
    Optional<Dialog> findActiveDialogByOwnerAndPairId(@Param("owner") UserEntity owner,
                                                     @Param("pairId") String pairId);
}