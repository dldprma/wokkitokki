package com.winter.wokkitokki.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter @Setter @Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponseDto {
    private Long id;
    private String fullName;
    private String username;
    private String email;
    private String profileImgUrl;
    private String bio;
    private int postCount;
    private int imagePostCount;
    private int followersCount;
    private int followingCount;
    @JsonProperty("isFollowing")
    private boolean isFollowing;
}
