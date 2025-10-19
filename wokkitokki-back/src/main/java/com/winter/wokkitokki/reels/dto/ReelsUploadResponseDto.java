package com.winter.wokkitokki.reels.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReelsUploadResponseDto {

    private String presignedUrl;
    private Long reelsId;
    private String videoId;
    private String s3ObjectKey;
    private int expiresIn;
    private String message;
}