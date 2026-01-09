package com.winter.wokkitokki.post.repository;

import com.winter.wokkitokki.comment.entity.CommentEntity;
import com.winter.wokkitokki.post.entity.LikeEntity;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.reels.entity.ReelsEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LikeRepository extends JpaRepository<LikeEntity, Long> {
    // 특정 사용자가 특정 포스트를 좋아요 했는지 확인
    boolean existsByUserAndPost(UserEntity user, PostEntity post);

    // 좋아요 삭제를 위해 찾기
    LikeEntity findByUserAndPost(UserEntity user, PostEntity post);

    @Query("SELECT l.post.id FROM LikeEntity l WHERE l.user.id = :userId AND l.post.id IN :postIds")
    List<Long> findLikedPostIdsByUserAndPostIds(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);

    Optional<LikeEntity> findByUserAndComment(UserEntity user, CommentEntity comment);
    boolean existsByUserAndComment(UserEntity user, CommentEntity comment);
    long countByComment(CommentEntity comment);
    void deleteByUserAndComment(UserEntity user, CommentEntity comment);

    // 릴스 좋아요 관련 메서드
    boolean existsByUserAndReels(UserEntity user, ReelsEntity reels);
    Optional<LikeEntity> findByUserAndReels(UserEntity user, ReelsEntity reels);
    long countByReels(ReelsEntity reels);
    void deleteByUserAndReels(UserEntity user, ReelsEntity reels);
}
