package com.winter.wokkitokki.comment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentUpdateRequestDto {
    private String content;
    private Boolean removeImage;
}