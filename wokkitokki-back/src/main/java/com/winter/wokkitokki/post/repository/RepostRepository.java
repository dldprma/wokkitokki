package com.winter.wokkitokki.post.repository;

import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.entity.RepostEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RepostRepository extends JpaRepository<RepostEntity, Long> {
    // 특정 사용자가 특정 포스트를 리포스트 했는지 확인
    boolean existsByUserAndPost(UserEntity user, PostEntity post);
    // 리포스트 삭제를 위해 찾기
    RepostEntity findByUserAndPost(UserEntity user, PostEntity post);

    @Query("SELECT r.post.id FROM RepostEntity r WHERE r.user.id = :userId AND r.post.id IN :postIds")
    List<Long> findRepostedPostIdsByUserAndPostIds(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);
}
