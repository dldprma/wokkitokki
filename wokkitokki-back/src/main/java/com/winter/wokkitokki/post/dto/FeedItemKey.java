package com.winter.wokkitokki.post.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 피드 아이템의 복합 키
 * Format: contentId:type:repostUserId
 * 예시:
 * - "123:POST:null" (원본 게시글)
 * - "123:REPOST:456" (사용자 456이 리포스트한 게시글 123)
 * - "789:COMMENT:null" (원본 댓글) 
 * - "789:COMMENT_REPOST:456" (사용자 456이 리포스트한 댓글 789)
 * - "123:POST_WITH_COMMENT:456" (사용자 456이 댓글 단 게시글 123)
 */
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class FeedItemKey {
    private Long contentId; // postId 또는 commentId
    private String type; // POST, REPOST, COMMENT, COMMENT_REPOST
    private Long repostUserId; // 리포스트한 사용자 ID (원본인 경우 null)
    
    public String toRedisKey() {
        return contentId + ":" + type + ":" + (repostUserId != null ? repostUserId : "null");
    }
    
    public static FeedItemKey fromRedisKey(String redisKey) {
        String[] parts = redisKey.split(":");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid redis key format: " + redisKey);
        }
        
        Long contentId = Long.valueOf(parts[0]);
        String type = parts[1];
        Long repostUserId = "null".equals(parts[2]) ? null : Long.valueOf(parts[2]);
        
        return new FeedItemKey(contentId, type, repostUserId);
    }
    
    // 원본 게시글용 생성자
    public static FeedItemKey forOriginalPost(Long postId) {
        return new FeedItemKey(postId, "POST", null);
    }
    
    // 리포스트용 생성자
    public static FeedItemKey forRepost(Long postId, Long repostUserId) {
        return new FeedItemKey(postId, "REPOST", repostUserId);
    }
    
    // 원본 댓글용 생성자
    public static FeedItemKey forOriginalComment(Long commentId) {
        return new FeedItemKey(commentId, "COMMENT", null);
    }
    
    // 댓글 리포스트용 생성자
    public static FeedItemKey forCommentRepost(Long commentId, Long repostUserId) {
        return new FeedItemKey(commentId, "COMMENT_REPOST", repostUserId);
    }
    
    // 댓글이 달린 게시글용 생성자 (댓글 시간으로 피드에 재등장)
    public static FeedItemKey forPostWithComment(Long postId, Long commentId, Long commentAuthorId) {
        return new FeedItemKey(postId, "POST_WITH_COMMENT", commentAuthorId);
    }
}