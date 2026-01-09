package com.winter.wokkitokki.search.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class SearchHistoryDto {
    private Long id;
    private String keyword;
    private LocalDateTime searchedAt;
}
