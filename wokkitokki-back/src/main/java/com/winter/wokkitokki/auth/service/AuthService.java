package com.winter.wokkitokki.auth.service;

import com.winter.wokkitokki.auth.dto.AuthRequest;
import com.winter.wokkitokki.auth.dto.AuthResponse;
import com.winter.wokkitokki.auth.entity.RefreshToken;
import com.winter.wokkitokki.auth.repository.AuthRepository;
import com.winter.wokkitokki.common.util.JwtUtils;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService implements UserDetailsService {
    private final UserRepository userRepository;
    private final AuthRepository authRepository;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;

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
    public void logout(Long userId, HttpServletResponse response) {
        authRepository.deleteByUserId(userId);
        jwtUtils.clearRefreshTokenCookie(response);
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
