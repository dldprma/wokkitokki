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
    // 특정 게시글의 최상위 댓글들만 조회 (parentComment가 null이고 삭제되지 않은 것들)
    @Query("SELECT c FROM CommentEntity c " +
            "LEFT JOIN FETCH c.author " +
            "WHERE c.post.id = :postId AND c.parentComment IS NULL AND (c.deleted = false OR c.deleted IS NULL) " +
            "ORDER BY c.createdAt DESC")
    Page<CommentEntity> findByPostIdAndParentCommentIsNull(@Param("postId") Long postId, Pageable pageable);

    // 특정 댓글의 대댓글들 조회 (삭제되지 않은 것들)
    @Query("SELECT c FROM CommentEntity c " +
            "LEFT JOIN FETCH c.author " +
            "WHERE c.parentComment.id = :commentId AND (c.deleted = false OR c.deleted IS NULL) " +
            "ORDER BY c.createdAt ASC")
    Page<CommentEntity> findByParentCommentId(@Param("commentId") Long commentId, Pageable pageable);

    // 댓글 상세 조회 (작성자 정보 포함)
    @Query("SELECT c FROM CommentEntity c " +
            "LEFT JOIN FETCH c.author " +
            "WHERE c.id = :commentId")
    CommentEntity findByIdWithAuthor(@Param("commentId") Long commentId);

    // 특정 게시글의 댓글 수 조회 (삭제되지 않은 것들)
    @Query("SELECT COUNT(c) FROM CommentEntity c WHERE c.post.id = :postId AND (c.deleted = false OR c.deleted IS NULL)")
    long countByPostId(@Param("postId") Long postId);

    // 특정 댓글의 대댓글 수 조회 (삭제되지 않은 것들)
    @Query("SELECT COUNT(c) FROM CommentEntity c WHERE c.parentComment.id = :parentCommentId AND (c.deleted = false OR c.deleted IS NULL)")
    long countByParentCommentId(@Param("parentCommentId") Long parentCommentId);
    
    // 피드용: 내가 작성했거나 팔로우한 사람이 작성한 댓글만 (게시글과 함께 표시용)
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(" +
           "c.post.id, c.id, c.createdAt, " +
           "'POST_WITH_COMMENT', c.author.id, null) " +
           "FROM CommentEntity c " +
           "WHERE (c.author.id = :userId " +
           "OR c.author.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId)) " +
           "AND (c.deleted = false OR c.deleted IS NULL) " +
           "ORDER BY c.createdAt DESC")
    List<FeedItemDto> findRelevantComments(@Param("userId") Long userId);
    
    // 내가 쓴 게시글에 내가 단 댓글만 조회 (중복 방지용)
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(" +
           "c.post.id, c.id, c.createdAt, " +
           "'POST_WITH_COMMENT', c.author.id, null) " +
           "FROM CommentEntity c " +
           "WHERE c.author.id = :userId " +
           "AND c.post.user.id = :userId " +
           "AND (c.deleted = false OR c.deleted IS NULL) " +
           "ORDER BY c.createdAt DESC")
    List<FeedItemDto> findMyCommentsOnMyPosts(@Param("userId") Long userId);

    // 피드용: 내가 리포스트했거나 팔로우한 사람이 리포스트한 댓글 (삭제되지 않은 것들)
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(c.post.id, c.id, r.repostedAt, 'COMMENT_REPOST', r.user.id, r.user.username) " +
            "FROM CommentEntity c " +
            "JOIN RepostEntity r ON r.comment.id = c.id " +
            "WHERE (r.user.id = :userId " +
            "OR r.user.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId)) " +
            "AND (c.deleted = false OR c.deleted IS NULL) " +
            "ORDER BY r.repostedAt DESC")
    List<FeedItemDto> findRelevantCommentReposts(@Param("userId") Long userId);

    // 특정 사용자의 원본 댓글들 조회 (팔로우/언팔로우시 사용) (삭제되지 않은 것들)
    @Query("SELECT new com.winter.wokkitokki.post.dto.FeedItemDto(" +
            "c.post.id, c.id, c.createdAt, 'COMMENT', null, null) " +
            "FROM CommentEntity c " +
            "WHERE c.author.id = :userId " +
            "AND (c.deleted = false OR c.deleted IS NULL) " +
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
    
    // 특정 사용자가 작성한 댓글들 조회 (최신순) (삭제되지 않은 것들)
    @Query("SELECT c FROM CommentEntity c " +
           "LEFT JOIN FETCH c.author " +
           "LEFT JOIN FETCH c.post " +
           "WHERE c.author.id = :authorId " +
           "AND (c.deleted = false OR c.deleted IS NULL) " +
           "ORDER BY c.createdAt DESC")
    List<CommentEntity> findByAuthorIdOrderByCreatedAtDesc(@Param("authorId") Long authorId);
    
    // 특정 사용자가 작성한 댓글 수 조회 (삭제되지 않은 것들)
    @Query("SELECT COUNT(c) FROM CommentEntity c WHERE c.author.id = :authorId AND (c.deleted = false OR c.deleted IS NULL)")
    Long countByAuthorId(@Param("authorId") Long authorId);

    // 피드용 카운트 쿼리들
    @Query("SELECT COUNT(c) FROM CommentEntity c " +
           "WHERE (c.author.id = :userId " +
           "OR c.author.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId)) " +
           "AND (c.deleted = false OR c.deleted IS NULL)")
    long countRelevantComments(@Param("userId") Long userId);
    
    // 내가 쓴 게시글에 내가 단 댓글 수 조회
    @Query("SELECT COUNT(c) FROM CommentEntity c " +
           "WHERE c.author.id = :userId " +
           "AND c.post.user.id = :userId " +
           "AND (c.deleted = false OR c.deleted IS NULL)")
    long countMyCommentsOnMyPosts(@Param("userId") Long userId);

    @Query("SELECT COUNT(DISTINCT r.comment.id) FROM RepostEntity r " +
           "JOIN CommentEntity c ON r.comment.id = c.id " +
           "WHERE (r.user.id = :userId " +
           "OR r.user.id IN (SELECT f.following.id FROM FollowEntity f WHERE f.follower.id = :userId)) " +
           "AND (c.deleted = false OR c.deleted IS NULL)")
    long countRelevantCommentReposts(@Param("userId") Long userId);
}
