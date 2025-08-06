package com.winter.wokkitokki.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDto {
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
    private boolean isFollowing;
}
