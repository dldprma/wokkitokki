package com.winter.wokkitokki.post.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class PostResponseDto {
    private Long id;
    private String content;
    private String imgUrl;
    private String authorName;
    private String authorUsername;
    private String authorProfileImg;
    private int likeCount;
    private int repostCount;
    private boolean isLiked;
    private boolean isReposted;
    private String createdAt;

    // 리포스트인 경우 원본 정보
    private PostResponseDto originalPost;
}
