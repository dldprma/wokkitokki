package com.winter.wokkitokki.comment.dto;

import lombok.*;

@Getter @Setter @Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentLikeResponseDto {
    private boolean isLiked;
    private int likeCount;
    private String message;
}