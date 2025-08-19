package com.winter.wokkitokki.post.repository;

import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


public interface PostRepository extends JpaRepository<PostEntity, Long> {
    // 특정사용자의 모든 포스트 가져오기
    Page<PostEntity> findByUserOrderByCreatedAtDesc(UserEntity user, Pageable pageable);
    // 특정사용자의 이미지가 있는 포스트 가져오기
    Page<PostEntity> findByUserAndImgUrlIsNotNullOrderByCreatedAtDesc(UserEntity user, Pageable pageable);

    // 특정 사용자의 포스트 갯수
    int countByUser(UserEntity user);

    // 특정 사용자의 이미지 포스트 갯수
    int countByUserAndImgUrlIsNotNull(UserEntity user);

    // 피드용
    @Query("SELECT p FROM PostEntity p WHERE p.deleted = false AND " +
            "(p.user.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId) " +
            "OR p.user.id = :userId) " +
            "ORDER BY p.createdAt DESC")
    Page<PostEntity> findFeedPosts(@Param("userId") Long userId, Pageable pageable);

    // 삭제되지 않은 게시글만 조회
    @Query("SELECT p FROM PostEntity p WHERE p.deleted = false AND " +
            "(p.user.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId) " +
            "OR p.user.id = :userId) " +
            "ORDER BY p.createdAt DESC")
    Page<PostEntity> findFeedPostsNotDeleted(Long userId, Pageable pageable);

    // 삭제된 게시글 조회 (관리자용)
//    @Query("SELECT p FROM PostEntity p WHERE p.deleted = true")
//    Page<PostEntity> findDeletedPosts(Pageable pageable);
}
