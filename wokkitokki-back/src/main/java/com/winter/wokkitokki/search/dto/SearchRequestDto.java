package com.winter.wokkitokki.search.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SearchRequestDto {
    private String keyword;
    private String type;
    private String sortBy;
}
