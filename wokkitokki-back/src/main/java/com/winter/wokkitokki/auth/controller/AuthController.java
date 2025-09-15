package com.winter.wokkitokki.auth.controller;

import com.winter.wokkitokki.auth.dto.AuthRequest;
import com.winter.wokkitokki.auth.dto.AuthResponse;
import com.winter.wokkitokki.auth.service.AuthService;
import com.winter.wokkitokki.common.util.JwtUtils;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    private final AuthService authService;
    private final JwtUtils jwtUtils;

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
    public ResponseEntity<Map<String, String>> logout(
            HttpServletRequest request,
            Authentication authentication,
            HttpServletResponse response) {
        try {
            if (authentication != null && authentication.isAuthenticated()) {
                UserEntity user = (UserEntity) authentication.getPrincipal();

                // 현재 Access Token 추출
                String token = jwtUtils.extractTokenFromRequest(request);

                // 완전한 로그아웃 처리
                authService.logout(user.getId(), response);

                return ResponseEntity.ok(Map.of(
                        "message", "로그아웃이 완료되었습니다.",
                        "success", "true"
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "message", "로그아웃이 완료되었습니다.",
                    "success", "true"
            ));
        } catch (Exception e) {
            log.error("로그아웃 처리 중 오류", e);
            // 로그아웃은 항상 성공으로 응답 (클라이언트 로그아웃 진행)
            return ResponseEntity.ok(Map.of(
                    "message", "로그아웃이 완료되었습니다.",
                    "success", "true"
            ));
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
