package com.winter.wokkitokki.user.repository;

import com.winter.wokkitokki.user.entity.FollowEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FollowRepository extends JpaRepository<FollowEntity, Long> {
    // 팔로우 관계 확인
    boolean existsByFollowerAndFollowing(UserEntity follower, UserEntity following);
    // 팔로우 관계 찾기
    Optional<FollowEntity> findByFollowerAndFollowing(UserEntity follower, UserEntity following);

    // 팔로워 수 세기(나를 팔로우하는 사람 수)
    int countByFollowing(UserEntity following);
    // 팔로잉 수 세기(내가 팔로우하는 사람 수)
    int countByFollower(UserEntity follower);
    
    // 팔로워 목록 가져오기 (나를 팔로우하는 사람들)
    Page<FollowEntity> findByFollowing(UserEntity following, Pageable pageable);
    
    // 팔로잉 목록 가져오기 (내가 팔로우하는 사람들)
    Page<FollowEntity> findByFollower(UserEntity follower, Pageable pageable);

    // 특정 사용자를 팔로우하는 사람들의 ID 목록 (팔로워 목록)
    @Query("SELECT f.follower.id FROM FollowEntity f WHERE f.following.id = :userId")
    List<Long> findFollowerIdsByFollowingId(@Param("userId") Long userId);

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    @Query("SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :followerId")
    List<Long> findFollowingIdsByFollowerId(@Param("followerId") Long followerId);
}
