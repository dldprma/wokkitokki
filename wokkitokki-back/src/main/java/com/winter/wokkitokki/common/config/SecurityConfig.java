package com.winter.wokkitokki.common.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    @Lazy  // 지연 로딩으로 순환참조 방지
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // 완전히 공개된 엔드포인트 (인증 처리 안함)
                        .requestMatchers("/api/auth/**").permitAll()  // 로그인, 회원가입
                        .requestMatchers("/ws/**").permitAll()  // WebSocket

                        // 조회 API들 - 토큰 있으면 처리, 없어도 접근 가능 (선택적 인증)
                        .requestMatchers("GET", "/api/users/**").permitAll()
                        .requestMatchers("GET", "/api/posts/**").permitAll()
                        .requestMatchers("GET", "/api/comments/**").permitAll()
                        .requestMatchers("GET", "/api/reels/**").permitAll()

                        // 액션 API들 - 인증 필수
                        .requestMatchers("POST", "/api/users/**").authenticated()
                        .requestMatchers("PUT", "/api/users/**").authenticated()
                        .requestMatchers("DELETE", "/api/users/**").authenticated()
                        .requestMatchers("POST", "/api/posts/**").authenticated()
                        .requestMatchers("PUT", "/api/posts/**").authenticated()
                        .requestMatchers("DELETE", "/api/posts/**").authenticated()
                        .requestMatchers("POST", "/api/comments/**").authenticated()
                        .requestMatchers("PUT", "/api/comments/**").authenticated()
                        .requestMatchers("DELETE", "/api/comments/**").authenticated()
                        .requestMatchers("POST", "/api/reels/**").authenticated()
                        .requestMatchers("PUT", "/api/reels/**").authenticated()
                        .requestMatchers("DELETE", "/api/reels/**").authenticated()

                        // 기본값: 인증 필수
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("http://localhost:*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
