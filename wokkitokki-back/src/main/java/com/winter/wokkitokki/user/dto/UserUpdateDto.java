package com.winter.wokkitokki.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateDto {
    private String fullName;
    private String username;
    private String bio;
}
