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
    private boolean isLiked;
    private boolean isReposted;
    private String createdAt;

    private boolean canEdit;
    private boolean canDelete;

    private boolean deleted;

    private boolean isRepost = false;
    private String repostedBy;
    private String repostedAt;
    private String originalCreatedAt;

    // 리포스트인 경우 원본 정보
    private PostResponseDto originalPost;
    
    // 수동으로 setter 메서드 추가 (Lombok 문제 해결)
    public void setRepost(boolean repost) {
        this.isRepost = repost;
    }
    
    public void setRepostedBy(String repostedBy) {
        this.repostedBy = repostedBy;
    }
    
    public void setRepostedAt(String repostedAt) {
        this.repostedAt = repostedAt;
    }
    
    public void setOriginalCreatedAt(String originalCreatedAt) {
        this.originalCreatedAt = originalCreatedAt;
    }
    
    public void setOriginalPost(PostResponseDto originalPost) {
        this.originalPost = originalPost;
    }
}
