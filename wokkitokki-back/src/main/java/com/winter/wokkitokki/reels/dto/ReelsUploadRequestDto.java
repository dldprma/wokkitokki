package com.winter.wokkitokki.reels.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReelsUploadRequestDto {

    @NotBlank(message = "원본 파일명은 필수입니다")
    private String originalFilename;

    @NotBlank(message = "콘텐츠 타입은 필수입니다")
    private String contentType;

    @Size(max = 100, message = "제목은 100자 이내여야 합니다")
    private String title;

    @Size(max = 1000, message = "설명은 1000자 이내여야 합니다")
    private String description;
}