package com.winter.wokkitokki.post.repository;

import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.entity.RepostEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepostRepository extends JpaRepository<RepostEntity, Long> {
    // 특정 사용자가 특정 포스트를 리포스트 했는지 확인
    boolean existsByUserAndPost(UserEntity user, PostEntity post);
    // 리포스트 삭제를 위해 찾기
    RepostEntity findByUserAndPost(UserEntity user, PostEntity post);
}
