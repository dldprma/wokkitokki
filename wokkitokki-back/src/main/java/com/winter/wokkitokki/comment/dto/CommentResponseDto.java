package com.winter.wokkitokki.comment.dto;

import lombok.*;

@Getter @Setter @Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponseDto {
    private Long id;
    private String content;
    private String imageUrl;
    private Long authorId;
    private String authorName;
    private String authorUsername;
    private String authorProfileImg;
    private Long postId;
    private Long parentCommentId;
    private int likeCount;
    private int repostCount;
    private int replyCount;
    private boolean isLiked;
    private boolean isReposted;
    private boolean canEdit;
    private boolean canDelete;
    private String createdAt;
    private String updatedAt;
}