package com.winter.wokkitokki.auth.service;

import com.winter.wokkitokki.auth.dto.AuthRequest;
import com.winter.wokkitokki.auth.dto.AuthResponse;
import com.winter.wokkitokki.auth.entity.RefreshToken;
import com.winter.wokkitokki.auth.repository.AuthRepository;
import com.winter.wokkitokki.common.util.JwtUtils;
import com.winter.wokkitokki.post.service.RedisFeedIntegration;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService implements UserDetailsService {
    private final UserRepository userRepository;
    private final AuthRepository authRepository;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;
    private final JwtBlacklistService jwtBlacklistService;
    private final RedisFeedIntegration redisFeedIntegration;

    @Transactional
    public AuthResponse register(AuthRequest request, HttpServletResponse response){
        if(userRepository.existsByUsername(request.getUsername()))
            throw new RuntimeException("이미 존재하는 계정입니다.");
        if(userRepository.existsByEmail(request.getEmail()))
            throw new RuntimeException("이미 존재하는 이메일입니다.");

        UserEntity user = UserEntity.builder()
                .fullName(request.getFullName())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);

        // 토큰생성
        String accessToken = jwtUtils.generateAccessToken(user);
        String refreshToken = jwtUtils.generateRefreshToken(user);

        // refreshToken 저장
        saveRefreshToken(user, refreshToken);

        // refreshToken을 HttpOnly 쿠키로 설정
        jwtUtils.setRefreshTokenCookie(response, refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build();
    }

    @Transactional
    public AuthResponse login(AuthRequest request, HttpServletResponse response){
        // 사용자 검증
        UserEntity user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 비밀번호 검증
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("비밀번호가 일치하지 않습니다.");
        }

        authRepository.deleteByUserId(user.getId());

        // 토큰생성
        String accessToken = jwtUtils.generateAccessToken(user);
        String refreshToken = jwtUtils.generateRefreshToken(user);

        saveRefreshToken(user, refreshToken);

        // refreshToken을 HttpOnly 쿠키로 설정
        jwtUtils.setRefreshTokenCookie(response, refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .bio(user.getBio())
                .profileImgUrl(user.getProfileImgUrl())
                .build();
    }

    @Transactional
    public AuthResponse refreshToken(HttpServletRequest request, HttpServletResponse response) {
        // 쿠키에서 refreshToken 추출
        String refreshToken = jwtUtils.extractRefreshTokenFromCookie(request);

        if (refreshToken == null) {
            throw new RuntimeException("RefreshToken이 없습니다.");
        }

        // refreshToken 검증
        RefreshToken tokenEntity = authRepository.findByToken(refreshToken)
                .orElseThrow(() -> new RuntimeException("유효하지 않은 refresh Token입니다."));

        if (tokenEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            authRepository.delete(tokenEntity);
            jwtUtils.clearRefreshTokenCookie(response);
            throw new RuntimeException("만료된 refresh token 입니다.");
        }

        // 새로운 token 생성
        UserEntity user = tokenEntity.getUser();
        String newAccessToken = jwtUtils.generateAccessToken(user);
        String newRefreshToken = refreshToken;

        // 만료 임박시에만 새 refresh Token 발급
        if(tokenEntity.getExpiresAt().isBefore(LocalDateTime.now().plusDays(2))){
            newRefreshToken = jwtUtils.generateRefreshToken(user);

            // 기존 토큰 업데이트
            tokenEntity.setToken(newRefreshToken);
            tokenEntity.setExpiresAt(LocalDateTime.now().plusDays(7));
            authRepository.save(tokenEntity);

            jwtUtils.setRefreshTokenCookie(response, newRefreshToken);
        }

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build();
    }

    @Transactional
    public void logout(Long userId, String token, HttpServletResponse response) {
        try {
            log.info("사용자 {} 로그아웃 시작", userId);

            // 1. Refresh Token DB에서 삭제
            authRepository.deleteByUserId(userId);
            log.info("Refresh Token DB 삭제 완료");

            // 2. Refresh Token 쿠키 삭제
            jwtUtils.clearRefreshTokenCookie(response);
            log.info("Refresh Token 쿠키 삭제 완료");

            // 3. Access Token 블랙리스트 추가
            if (token != null && !token.isEmpty()) {
                long expirationTime = jwtUtils.getExpirationFromToken(token);
                jwtBlacklistService.addToBlacklist(token, expirationTime);
                log.info("Access Token 블랙리스트 추가 완료");
            }

            // 4. Redis 피드 캐시 무효화
            redisFeedIntegration.invalidateUserFeedCache(userId);
            log.info("피드 캐시 무효화 완료");

            log.info("사용자 {}의 로그아웃 처리 완료", userId);

        } catch (Exception e) {
            log.error("사용자 {} 로그아웃 처리 중 오류 발생", userId, e);
        }
    }

    public boolean checkUsernameExists(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean checkEmailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    private void saveRefreshToken(UserEntity user, String token){
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(token)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        authRepository.save(refreshToken);
    }

    // UserDetailsService
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException{
        return userRepository.findByUsername(username)
                .orElseThrow(()->new UsernameNotFoundException("사용자를 찾을 수 없습니다. : " + username));
    }

}
