package com.winter.wokkitokki.post.repository;

import com.winter.wokkitokki.post.entity.LikeEntity;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LikeRepository extends JpaRepository<LikeEntity, Long> {
    boolean existsByUserAndPost(UserEntity user, PostEntity post);

    LikeEntity findByUserAndPost(UserEntity user, PostEntity post);
}
