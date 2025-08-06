package com.winter.wokkitokki.post.repository;

import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.entity.RepostEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepostRepository extends JpaRepository<RepostEntity, Long> {
    boolean existsByUserAndPost(UserEntity user, PostEntity post);
    RepostEntity findByUserAndPost(UserEntity user, PostEntity post);
}
