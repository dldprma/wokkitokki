package com.winter.wokkitokki.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // uploads 폴더를 웹에서 접근 가능하게 만들기
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}