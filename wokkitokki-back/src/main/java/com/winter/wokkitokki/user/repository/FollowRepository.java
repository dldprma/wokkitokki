package com.winter.wokkitokki.user.repository;

import com.winter.wokkitokki.user.entity.FollowEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FollowRepository extends JpaRepository<FollowEntity, Long> {
    // 팔로우 관계 확인
    boolean existsByFollowerAndFollowing(UserEntity follower, UserEntity following);
    // 팔로우 관계 찾기(삭제)
    FollowEntity findByFollowerAndFollowing(UserEntity follower, UserEntity following);

    // 팔로워 수 세기(나를 팔로우하는 사람 수)
    int countByFollowing(UserEntity following);
    // 팔로잉 수 세기(내가 팔로우하는 사람 수)
    int countByFollower(UserEntity follower);
}
