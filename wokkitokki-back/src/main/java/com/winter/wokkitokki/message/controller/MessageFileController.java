package com.winter.wokkitokki.message.controller;

import com.winter.wokkitokki.user.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Slf4j
public class MessageFileController {

    @Value("${file.upload.path}")
    private String uploadPath;

    @Value("${file.base.url}")
    private String baseUrl;

    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserEntity currentUser = (UserEntity) authentication.getPrincipal();

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "파일이 비어있습니다."));
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            
            if (!isValidImageExtension(fileExtension)) {
                return ResponseEntity.badRequest().body(Map.of("error", "지원하지 않는 이미지 형식입니다."));
            }

            String filename = "message_" + UUID.randomUUID().toString() + fileExtension;
            Path uploadDir = Paths.get(uploadPath, "messages");
            
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            Path filePath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), filePath);

            String imageUrl = baseUrl + "/uploads/messages/" + filename;
            
            Map<String, String> response = new HashMap<>();
            response.put("imageUrl", imageUrl);
            response.put("fileName", originalFilename);
            
            log.info("Message image uploaded by user {}: {}", currentUser.getId(), imageUrl);
            
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("파일 업로드 실패", e);
            return ResponseEntity.badRequest().body(Map.of("error", "파일 업로드에 실패했습니다."));
        }
    }

    @PostMapping("/upload-file")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserEntity currentUser = (UserEntity) authentication.getPrincipal();

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "파일이 비어있습니다."));
        }

        if (file.getSize() > 10 * 1024 * 1024) { // 10MB 제한
            return ResponseEntity.badRequest().body(Map.of("error", "파일 크기는 10MB를 초과할 수 없습니다."));
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String filename = "file_" + UUID.randomUUID().toString() + fileExtension;
            
            Path uploadDir = Paths.get(uploadPath, "messages", "files");
            
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            Path filePath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), filePath);

            String fileUrl = baseUrl + "/uploads/messages/files/" + filename;
            
            Map<String, String> response = new HashMap<>();
            response.put("fileUrl", fileUrl);
            response.put("fileName", originalFilename);
            
            log.info("Message file uploaded by user {}: {}", currentUser.getId(), fileUrl);
            
            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("파일 업로드 실패", e);
            return ResponseEntity.badRequest().body(Map.of("error", "파일 업로드에 실패했습니다."));
        }
    }

    private boolean isValidImageExtension(String extension) {
        String[] validExtensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"};
        for (String validExt : validExtensions) {
            if (validExt.equalsIgnoreCase(extension)) {
                return true;
            }
        }
        return false;
    }
}