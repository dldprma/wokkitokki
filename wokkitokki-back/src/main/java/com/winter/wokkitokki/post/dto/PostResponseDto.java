package com.winter.wokkitokki.post.dto;

import lombok.*;

@Getter @Setter @Builder
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
    private int commentCount;
    private boolean isLiked;
    private boolean isReposted;
    private String createdAt;

    private boolean canEdit;
    private boolean canDelete;

    private boolean deleted;

    @Builder.Default
    private boolean isRepost = false;
    
    private String repostedBy;
    private String repostedAt;
    private String originalCreatedAt;

    // 리포스트인 경우 원본 정보
    private PostResponseDto originalPost;
}
