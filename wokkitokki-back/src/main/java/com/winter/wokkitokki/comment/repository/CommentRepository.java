package com.winter.wokkitokki.comment.repository;

import com.winter.wokkitokki.comment.entity.CommentEntity;
import com.winter.wokkitokki.post.dto.FeedItemDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<CommentEntity, Long> {
    // 특정 게시글의 최상위 댓글들만 조회 (parentComment가 null인 것들)
    @Query("SELECT c FROM CommentEntity c " +
            "LEFT JOIN FETCH c.author " +
            "WHERE c.post.id = :postId AND c.parentComment IS NULL " +
            "ORDER BY c.createdAt DESC")
    Page<CommentEntity> findByPostIdAndParentCommentIsNull(@Param("postId") Long postId, Pageable pageable);

    // 특정 댓글의 대댓글들 조회
    @Query("SELECT c FROM CommentEntity c " +
            "LEFT JOIN FETCH c.author " +
            "WHERE c.parentComment.id = :commentId " +
            "ORDER BY c.createdAt ASC")
    Page<CommentEntity> findByParentCommentId(@Param("commentId") Long commentId, Pageable pageable);

    // 댓글 상세 조회 (작성자 정보 포함)
    @Query("SELECT c FROM CommentEntity c " +
            "LEFT JOIN FETCH c.author " +
            "WHERE c.id = :commentId")
    CommentEntity findByIdWithAuthor(@Param("commentId") Long commentId);

    // 특정 게시글의 댓글 수 조회
    long countByPostId(Long postId);

    // 특정 댓글의 대댓글 수 조회
    long countByParentCommentId(Long parentCommentId);
    
    // 피드용: 내가 작성했거나 팔로우한 사람이 작성한 댓글 (게시글과 함께 표시용)
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(c.post.id, c.id, c.createdAt, 'COMMENT', null, null) " +
            "FROM CommentEntity c " +
            "WHERE (c.author.id = :userId " +
            "OR c.author.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId)) " +
            "ORDER BY c.createdAt DESC")
    List<FeedItemDto> findRelevantComments(@Param("userId") Long userId);

    // 피드용: 내가 리포스트했거나 팔로우한 사람이 리포스트한 댓글
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(c.post.id, c.id, r.repostedAt, 'COMMENT_REPOST', r.user.id, r.user.username) " +
            "FROM CommentEntity c " +
            "JOIN RepostEntity r ON r.comment.id = c.id " +
            "WHERE (r.user.id = :userId " +
            "OR r.user.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId)) " +
            "ORDER BY r.repostedAt DESC")
    List<FeedItemDto> findRelevantCommentReposts(@Param("userId") Long userId);

    // 특정 사용자의 원본 댓글들 조회 (팔로우/언팔로우시 사용)
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(" +
            "c.post.id, c.id, c.createdAt, 'COMMENT', null, null) " +
            "FROM CommentEntity c " +
            "WHERE c.author.id = :userId " +
            "ORDER BY c.createdAt DESC")
    List<FeedItemDto> findOriginalCommentsByUserId(@Param("userId") Long userId);

    // 사용자가 리포스트한 댓글들 조회
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(" +
            "r.comment.post.id, r.comment.id, r.repostedAt, 'COMMENT_REPOST', r.user.id, r.user.username) " +
            "FROM RepostEntity r " +
            "WHERE r.user.id = :userId AND r.comment IS NOT NULL " +
            "ORDER BY r.repostedAt DESC")
    List<FeedItemDto> findUserCommentReposts(@Param("userId") Long userId);

    // 특정 ID들로 댓글들 조회
    @Query("SELECT c FROM CommentEntity c WHERE c.id IN :commentIds")
    List<CommentEntity> findCommentsByIds(@Param("commentIds") List<Long> commentIds);
}
