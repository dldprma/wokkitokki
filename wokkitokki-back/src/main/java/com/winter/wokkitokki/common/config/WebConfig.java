package com.winter.wokkitokki.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 프로필 이미지 경로
        registry.addResourceHandler("/uploads/profiles/**")
                .addResourceLocations("file:uploads/profiles/");

        // 게시글 이미지 경로
        registry.addResourceHandler("/uploads/posts/**")
                .addResourceLocations("file:uploads/posts/");
    }
}