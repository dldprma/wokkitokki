package com.winter.wokkitokki.search.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class TrendingKeywordDto {
    private String keyword;
    private int searchCount;
    private int rank;
    private LocalDateTime lastSearchedAt;
    private boolean isRising;
}
