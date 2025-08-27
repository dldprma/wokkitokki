package com.winter.wokkitokki.post.repository;

import com.winter.wokkitokki.post.entity.LikeEntity;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LikeRepository extends JpaRepository<LikeEntity, Long> {
    // 특정 사용자가 특정 포스트를 좋아요 했는지 확인
    boolean existsByUserAndPost(UserEntity user, PostEntity post);

    // 좋아요 삭제를 위해 찾기
    LikeEntity findByUserAndPost(UserEntity user, PostEntity post);

    @Query("SELECT l.post.id FROM LikeEntity l WHERE l.user.id = :userId AND l.post.id IN :postIds")
    List<Long> findLikedPostIdsByUserAndPostIds(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);
}
