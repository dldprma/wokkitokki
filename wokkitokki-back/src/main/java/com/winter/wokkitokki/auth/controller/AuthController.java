package com.winter.wokkitokki.auth.controller;

import com.winter.wokkitokki.auth.dto.AuthRequest;
import com.winter.wokkitokki.auth.dto.AuthResponse;
import com.winter.wokkitokki.auth.service.AuthService;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody AuthRequest request, HttpServletResponse response) {
        try {
            AuthResponse authResponse = authService.register(request, response);
            return ResponseEntity.ok(authResponse);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request, HttpServletResponse response) {
        try {
            AuthResponse authResponse = authService.login(request, response);
            return ResponseEntity.ok(authResponse);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        try {
            AuthResponse authResponse = authService.refreshToken(request, response);
            return ResponseEntity.ok(authResponse);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication, HttpServletResponse response) {
        try {
            if (authentication != null && authentication.isAuthenticated()) {
                UserEntity user = (UserEntity) authentication.getPrincipal();
                authService.logout(user.getId(), response);
            }
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/check-username/{username}")
    public ResponseEntity<Map<String, Boolean>> checkUsername(@PathVariable String username) {
        boolean exists = authService.checkUsernameExists(username);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @GetMapping("/check-email/{email}")
    public ResponseEntity<Map<String, Boolean>> checkEmail(@PathVariable String email) {
        boolean exists = authService.checkEmailExists(email);
        return ResponseEntity.ok(Map.of("exists", exists));
    }
}
