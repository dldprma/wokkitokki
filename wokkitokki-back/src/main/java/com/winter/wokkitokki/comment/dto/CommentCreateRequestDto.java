package com.winter.wokkitokki.comment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentCreateRequestDto {
    private String content;
    private Long parentCommentId; // 대댓글인 경우
}