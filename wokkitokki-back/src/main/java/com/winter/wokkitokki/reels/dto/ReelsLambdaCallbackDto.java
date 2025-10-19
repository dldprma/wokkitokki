package com.winter.wokkitokki.reels.dto;

import lombok.Data;

@Data
public class ReelsLambdaCallbackDto {

    private Long reelsId;             // 릴스 ID
    private String hlsPlaylistUrl;    // HLS URL (성공 시)
}