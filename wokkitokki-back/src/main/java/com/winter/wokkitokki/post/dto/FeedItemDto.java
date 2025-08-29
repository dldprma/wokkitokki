package com.winter.wokkitokki.post.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
public class FeedItemDto {
    private Long postId;
    private Long commentId;
    private LocalDateTime sortTime;
    private String type;
    private Long repostUserId;
    private String repostUsername;
    
    // Post용 생성자 (기존 호환)
    public FeedItemDto(Long postId, LocalDateTime sortTime, String type, Long repostUserId, String repostUsername) {
        this.postId = postId;
        this.sortTime = sortTime;
        this.type = type;
        this.repostUserId = repostUserId;
        this.repostUsername = repostUsername;
    }
    
    // Post용 생성자 (새로운 형태 - Repository에서 사용)
    public FeedItemDto(Long postId, Long commentId, LocalDateTime sortTime, String type, Long repostUserId, String repostUsername) {
        this.postId = postId;
        this.commentId = commentId;
        this.sortTime = sortTime;
        this.type = type;
        this.repostUserId = repostUserId;
        this.repostUsername = repostUsername;
    }
}