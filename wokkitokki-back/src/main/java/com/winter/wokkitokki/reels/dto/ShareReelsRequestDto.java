package com.winter.wokkitokki.reels.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ShareReelsRequestDto {

    @NotEmpty(message = "공유할 사용자 목록은 필수입니다")
    private List<Long> targetUserIds;
}