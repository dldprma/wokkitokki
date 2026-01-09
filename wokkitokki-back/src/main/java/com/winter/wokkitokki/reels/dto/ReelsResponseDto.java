package com.winter.wokkitokki.reels.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReelsResponseDto {
    private Long id;
    private String title;
    private String description;
    private Long userId;
    private String username;
    private String hlsPlaylistUrl;
    private String videoId;
    private int likeCount;
    private int commentCount;
    private int shareCount;
    private LocalDateTime createdAt;
}