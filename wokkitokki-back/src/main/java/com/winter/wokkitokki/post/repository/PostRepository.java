package com.winter.wokkitokki.post.repository;

import com.winter.wokkitokki.post.dto.FeedItemDto;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostRepository extends JpaRepository<PostEntity, Long> {
    // 특정사용자의 모든 포스트 가져오기 (기존)
    Page<PostEntity> findByUserOrderByCreatedAtDesc(UserEntity user, Pageable pageable);

    // 특정사용자의 삭제되지 않은 포스트만 가져오기 (새로 추가)
    Page<PostEntity> findByUserAndDeletedFalseOrderByCreatedAtDesc(UserEntity user, Pageable pageable);

    // 특정사용자의 이미지가 있는 포스트 가져오기 (기존)
    Page<PostEntity> findByUserAndImgUrlIsNotNullOrderByCreatedAtDesc(UserEntity user, Pageable pageable);

    // 특정사용자의 삭제되지 않은 이미지 포스트만 가져오기 (새로 추가)
    Page<PostEntity> findByUserAndImgUrlIsNotNullAndDeletedFalseOrderByCreatedAtDesc(UserEntity user, Pageable pageable);

    // 특정 사용자의 포스트 갯수 (기존)
    Long countByUser(UserEntity user);

    // 특정 사용자의 삭제되지 않은 포스트 갯수 (새로 추가)
    int countByUserAndDeletedFalse(UserEntity user);

    // 특정 사용자의 이미지 포스트 갯수 (기존)
    int countByUserAndImgUrlIsNotNull(UserEntity user);

    // 특정 사용자의 삭제되지 않은 이미지 포스트 갯수 (새로 추가)
    int countByUserAndImgUrlIsNotNullAndDeletedFalse(UserEntity user);

    // 삭제되지 않은 게시글만 조회 (기본 피드)
    @Query("SELECT p FROM PostEntity p WHERE p.deleted = false AND " +
            "(p.user.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId) " +
            "OR p.user.id = :userId) " +
            "ORDER BY p.createdAt DESC")
    Page<PostEntity> findFeedPostsNotDeleted(@Param("userId") Long userId, Pageable pageable);

    // 내가 팔로우한 사람들의 게시글 (원본)
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(p.id, p.createdAt, 'POST', null, null) " +
            "FROM PostEntity p " +
            "WHERE p.deleted = false AND " +
            "(p.user.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId) " +
            "OR p.user.id = :userId)")
    List<FeedItemDto> findOriginalPosts(@Param("userId") Long userId);

    // 내가 팔로우한 사람들의 리포스트
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(p.id, r.repostedAt, 'REPOST', r.user.id, r.user.username) " +
            "FROM PostEntity p " +
            "JOIN RepostEntity r ON r.post.id = p.id " +
            "WHERE p.deleted = false AND " +
            "(r.user.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId) " +
            "OR r.user.id = :userId)")
    List<FeedItemDto> findRepostedPosts(@Param("userId") Long userId);

    // 특정 게시글들을 ID로 조회
    @Query("SELECT p FROM PostEntity p WHERE p.id IN :postIds AND p.deleted = false")
    List<PostEntity> findPostsByIds(@Param("postIds") List<Long> postIds);

    // 사용자의 원본 게시글 조회 (리포스트가 아닌)
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(" +
            "p.id, p.createdAt, 'POST', null, null) " +
            "FROM PostEntity p " +
            "WHERE p.user.id = :userId AND p.originalPost IS NULL " +
            "ORDER BY p.createdAt DESC")
    List<FeedItemDto> findUserOriginalPosts(@Param("userId") Long userId);

    // 사용자가 리포스트한 게시글 조회
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(" +
            "p.originalPost.id, p.createdAt, 'REPOST', p.user.id, p.user.username) " +
            "FROM PostEntity p " +
            "WHERE p.user.id = :userId AND p.originalPost IS NOT NULL " +
            "ORDER BY p.createdAt DESC")
    List<FeedItemDto> findUserReposts(@Param("userId") Long userId);

    // 사용자의 전체 활동 개수 (원본 게시글 + 리포스트)
    @Query("SELECT COUNT(p) FROM PostEntity p WHERE p.user.id = :userId")  // Post → PostEntity
    Long countUserAllActivity(@Param("userId") Long userId);
}