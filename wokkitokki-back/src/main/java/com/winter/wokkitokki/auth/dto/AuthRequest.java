package com.winter.wokkitokki.auth.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String fullName;
    private String username;
    private String email;
    private String password;
}
