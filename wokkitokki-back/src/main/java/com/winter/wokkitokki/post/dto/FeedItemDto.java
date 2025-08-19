package com.winter.wokkitokki.post.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class FeedItemDto {
    private Long postId;
    private LocalDateTime sortTime;  // 게시글 생성 시간 또는 리포스트 시간
    private String type; // "POST" 또는 "REPOST"
    private Long repostUserId; // 리포스트한 사용자 ID (리포스트인 경우만)
    private String repostUsername; // 리포스트한 사용자명 (리포스트인 경우만)
}