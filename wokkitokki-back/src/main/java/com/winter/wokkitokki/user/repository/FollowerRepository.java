package com.winter.wokkitokki.user.repository;

import com.winter.wokkitokki.user.entity.FollowEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FollowerRepository extends JpaRepository<FollowEntity, Long> {
    // 팔로우 관계 확인
    boolean existsByFollowerAndFollowing(UserEntity follower, UserEntity following);

    FollowEntity findByFollowerAndFollowing(UserEntity follower, UserEntity following);

    int countByFollowing(UserEntity following);
    int countByFollower(UserEntity follower);
}
