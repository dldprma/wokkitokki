package com.winter.wokkitokki.search.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SearchStatsDto {
    private long totalSearches;
    private long userSearches;
    private long postSearches;
    private String mostSearchedKeyword;
    private double averageResultsPerSearch;
}
