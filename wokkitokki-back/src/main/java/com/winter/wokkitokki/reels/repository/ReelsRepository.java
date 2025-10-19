package com.winter.wokkitokki.reels.repository;

import com.winter.wokkitokki.reels.entity.ReelsEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.entity.FollowEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReelsRepository extends JpaRepository<ReelsEntity, Long> {

    Page<ReelsEntity> findByDeletedFalseOrderByCreatedAtDesc(Pageable pageable);

    Page<ReelsEntity> findByUserAndDeletedFalseOrderByCreatedAtDesc(UserEntity user, Pageable pageable);

    Optional<ReelsEntity> findByIdAndDeletedFalse(Long id);


}