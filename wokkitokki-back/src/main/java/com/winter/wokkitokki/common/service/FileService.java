package com.winter.wokkitokki.common.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Slf4j
@Service
public class FileService {

    /**
     * 파일 업로드
     * @param file 업로드할 파일
     * @param category 카테고리 (posts, profiles 등)
     * @return 업로드된 파일의 URL
     */
    public String uploadFile(MultipartFile file, String category) {
        if (file.isEmpty()) {
            throw new RuntimeException("업로드할 파일이 없습니다.");
        }

        try {
            // 파일 이름 생성 (UUID + 원본 확장자)
            String originalFilename = file.getOriginalFilename();
            String extension = getFileExtension(originalFilename);
            String filename = UUID.randomUUID().toString() + extension;

            // 프론트엔드 public 폴더에 저장
            String projectRoot = System.getProperty("user.dir");
            String frontendPath = projectRoot.replace("wokkitokki-back", "wt-app");
            Path uploadDir = Paths.get(frontendPath, "public", "uploads", category);

            // 디렉토리가 없으면 생성
            createDirectoryIfNotExists(uploadDir);

            // 파일 저장
            Path filePath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // 프론트엔드에서 접근 가능한 URL 반환
            String fileUrl = "/uploads/" + category + "/" + filename;

            log.info("파일 업로드 성공: {}", fileUrl);
            return fileUrl;

        } catch (IOException e) {
            log.error("파일 업로드 실패: {}", e.getMessage());
            throw new RuntimeException("파일 업로드에 실패했습니다.", e);
        }
    }

    /**
     * 파일 삭제
     * @param fileUrl 삭제할 파일의 URL
     */
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        try {
            // URL에서 파일명 추출 (예: /uploads/posts/filename.jpg)
            String filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            String category = extractCategoryFromUrl(fileUrl); // posts, profiles 등

            // 프론트엔드 파일 경로
            String projectRoot = System.getProperty("user.dir");
            String frontendPath = projectRoot.replace("wokkitokki-back", "wt-app");
            Path filePath = Paths.get(frontendPath, "public", "uploads", category, filename);

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("파일 삭제 성공: {}", fileUrl);
            } else {
                log.warn("삭제할 파일이 존재하지 않음: {}", fileUrl);
            }

        } catch (Exception e) {
            log.error("파일 삭제 실패: {}", e.getMessage());
            // 파일 삭제 실패해도 예외를 던지지 않음 (서비스 중단 방지)
        }
    }

    /**
     * URL에서 카테고리 추출
     */
    private String extractCategoryFromUrl(String fileUrl) {
        // /uploads/posts/filename.jpg -> posts
        String[] parts = fileUrl.split("/");
        if (parts.length >= 3 && "uploads".equals(parts[1])) {
            return parts[2];
        }
        return "posts"; // 기본값
    }

    /**
     * 파일 확장자 추출
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf(".") == -1) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }

    /**
     * 디렉토리 생성
     */
    private void createDirectoryIfNotExists(Path path) throws IOException {
        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }
    }

    /**
     * 파일 존재 여부 확인
     */
    public boolean fileExists(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return false;
        }

        try {
            String filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            String category = extractCategoryFromUrl(fileUrl);

            String projectRoot = System.getProperty("user.dir");
            String frontendPath = projectRoot.replace("wokkitokki-back", "wt-app");
            Path filePath = Paths.get(frontendPath, "public", "uploads", category, filename);

            return Files.exists(filePath);

        } catch (Exception e) {
            log.error("파일 존재 여부 확인 실패: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 파일 크기 검증
     */
    public void validateFileSize(MultipartFile file, long maxSizeInBytes) {
        if (file.getSize() > maxSizeInBytes) {
            throw new RuntimeException("파일 크기가 너무 큽니다. 최대 " +
                    (maxSizeInBytes / 1024 / 1024) + "MB까지 업로드 가능합니다.");
        }
    }

    /**
     * 이미지 파일 검증
     */
    public void validateImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !isValidImageType(contentType)) {
            throw new RuntimeException("지원하지 않는 이미지 형식입니다. " +
                    "JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다.");
        }
    }

    /**
     * 유효한 이미지 타입인지 확인
     */
    private boolean isValidImageType(String contentType) {
        return contentType.equals("image/jpeg") ||
                contentType.equals("image/jpg") ||
                contentType.equals("image/png") ||
                contentType.equals("image/gif") ||
                contentType.equals("image/webp");
    }
}
