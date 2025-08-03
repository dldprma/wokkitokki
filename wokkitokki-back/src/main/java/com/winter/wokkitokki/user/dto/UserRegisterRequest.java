package com.winter.wokkitokki.user.dto;

import lombok.Data;

@Data
public class UserRegisterRequest {
    private String fullName;
    private String username;
    private String email;
    private String password;
}
