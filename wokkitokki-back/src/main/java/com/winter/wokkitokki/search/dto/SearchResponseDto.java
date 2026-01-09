package com.winter.wokkitokki.search.dto;

import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.domain.Page;

@Getter @Setter
public class SearchResponseDto {
    private String keyword;
    private int totalResults;
    private Page<UserProfileResponseDto> users;
    private Page<PostResponseDto> posts;
}
