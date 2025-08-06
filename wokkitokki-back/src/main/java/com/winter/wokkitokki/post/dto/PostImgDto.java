package com.winter.wokkitokki.post.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class PostImgDto {
    private Long id;
    private String imageUrl;
    private int likeCount;
    private int repostCount;
    private String createdAt;
}
