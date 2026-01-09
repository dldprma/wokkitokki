package com.winter.wokkitokki.user.dto;

import lombok.Data;

@Data
public class UserLoginRequest {
    private String username;
    private String password;
}
