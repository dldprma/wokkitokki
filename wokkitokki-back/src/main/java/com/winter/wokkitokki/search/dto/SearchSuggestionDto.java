package com.winter.wokkitokki.search.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class SearchSuggestionDto {
    private String text;
    private String type;
    private String description;
}
