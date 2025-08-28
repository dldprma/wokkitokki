package com.winter.wokkitokki.comment.dto;

import lombok.*;

@Getter @Setter @Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentRepostResponseDto {
    private boolean isReposted;
    private int repostCount;
    private String message;
}