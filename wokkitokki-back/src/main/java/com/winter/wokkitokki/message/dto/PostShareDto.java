package com.winter.wokkitokki.message.dto;

import com.winter.wokkitokki.post.entity.PostEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class PostShareDto {
    private Long id;
    private String content;
    private String imgUrl;
    private Long authorId;
    private String authorUsername;
    private String authorFullName;
    private String authorProfileImg;
    private int likeCount;
    private int repostCount;
    private int commentCount;
    private LocalDateTime createdAt;
    private boolean deleted;
    
    public static PostShareDto fromEntity(PostEntity post) {
        if (post == null) return null;
        
        PostShareDto dto = new PostShareDto();
        dto.setId(post.getId());
        dto.setContent(post.getContent());
        dto.setImgUrl(post.getImgUrl());
        dto.setAuthorId(post.getUser().getId());
        dto.setAuthorUsername(post.getUser().getUsername());
        dto.setAuthorFullName(post.getUser().getFullName());
        dto.setAuthorProfileImg(post.getUser().getProfileImgUrl());
        dto.setLikeCount(post.getLikeCount());
        dto.setRepostCount(post.getRepostCount());
        dto.setCommentCount(post.getCommentCount());
        dto.setCreatedAt(post.getCreatedAt());
        dto.setDeleted(post.isDeleted());
        return dto;
    }
}