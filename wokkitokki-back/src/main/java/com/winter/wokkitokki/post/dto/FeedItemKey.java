package com.winter.wokkitokki.post.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 피드 아이템의 복합 키
 * Format:
 * - "contentId:type:repostUserId" (일반)
 * - "postId:POST_WITH_COMMENT:commentAuthorId:comment:commentId" (댓글 달린 게시글)
 */
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class FeedItemKey {
    private Long contentId; // postId 또는 commentId
    private String type;
    private Long repostUserId; // 리포스트 또는 댓글 작성자 ID
    private Long commentId; // POST_WITH_COMMENT 타입일 경우 사용

    public String toRedisKey() {
        if ("POST_WITH_COMMENT".equals(type)) {
            return contentId + ":" + type + ":" + (repostUserId != null ? repostUserId : "null") + ":comment:" + commentId;
        }
        return contentId + ":" + type + ":" + (repostUserId != null ? repostUserId : "null");
    }

    public static FeedItemKey fromRedisKey(String redisKey) {
        String[] parts = redisKey.split(":");
        
        if (parts.length > 1 && "POST_WITH_COMMENT".equals(parts[1])) {
            if (parts.length != 5 || !"comment".equals(parts[3])) {
                throw new IllegalArgumentException("Invalid POST_WITH_COMMENT key format: " + redisKey);
            }
            Long postId = Long.valueOf(parts[0]);
            String type = parts[1];
            Long commentAuthorId = "null".equals(parts[2]) ? null : Long.valueOf(parts[2]);
            Long commentId = Long.valueOf(parts[4]);
            return new FeedItemKey(postId, type, commentAuthorId, commentId);
        }

        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid redis key format: " + redisKey);
        }
        
        Long contentId = Long.valueOf(parts[0]);
        String type = parts[1];
        Long repostUserId = "null".equals(parts[2]) ? null : Long.valueOf(parts[2]);
        
        return new FeedItemKey(contentId, type, repostUserId, null);
    }
    
    // 원본 게시글용 생성자
    public static FeedItemKey forOriginalPost(Long postId) {
        return new FeedItemKey(postId, "POST", null, null);
    }
    
    // 리포스트용 생성자
    public static FeedItemKey forRepost(Long postId, Long repostUserId) {
        return new FeedItemKey(postId, "REPOST", repostUserId, null);
    }
    
    // 원본 댓글용 생성자
    public static FeedItemKey forOriginalComment(Long commentId) {
        return new FeedItemKey(commentId, "COMMENT", null, null);
    }
    
    // 댓글 리포스트용 생성자
    public static FeedItemKey forCommentRepost(Long commentId, Long repostUserId) {
        return new FeedItemKey(commentId, "COMMENT_REPOST", repostUserId, null);
    }
    
    // 댓글이 달린 게시글용 생성자
    public static FeedItemKey forPostWithComment(Long postId, Long commentId, Long commentAuthorId) {
        return new FeedItemKey(postId, "POST_WITH_COMMENT", commentAuthorId, commentId);
    }
    
    // 해당 피드 아이템의 작성자 ID를 반환
    public Long getUserId() {
        // repostUserId가 있으면 리포스트/댓글 작성자, 없으면 원본 게시글 작성자를 의미
        // POST_WITH_COMMENT의 경우 commentAuthorId가 repostUserId에 저장됨
        return repostUserId;
    }
}