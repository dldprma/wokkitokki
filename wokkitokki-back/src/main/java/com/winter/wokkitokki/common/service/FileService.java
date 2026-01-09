package com.winter.wokkitokki.common.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

    private final MediaUploadService mediaUploadService;

    /**
     * 파일 업로드 (S3 기반)
     * @param file 업로드할 파일
     * @param category 카테고리 (posts, profiles 등)
     * @param userId 사용자 ID
     * @return 업로드된 파일의 URL
     */
    public String uploadFile(MultipartFile file, String category, Long userId) {
        if (file.isEmpty()) {
            throw new RuntimeException("업로드할 파일이 없습니다.");
        }

        try {
            return mediaUploadService.uploadImage(file, category, userId);
        } catch (Exception e) {
            log.error("파일 업로드 실패: {}", e.getMessage());
            throw new RuntimeException("파일 업로드에 실패했습니다.", e);
        }
    }

    /**
     * 기존 호환성을 위한 메서드 (userId 없는 버전)
     * @deprecated userId와 함께 uploadFile(MultipartFile, String, Long)을 사용하세요
     */
    @Deprecated
    public String uploadFile(MultipartFile file, String category) {
        return uploadFile(file, category, 0L); // 기본값으로 0L 사용
    }

    /**
     * 파일 삭제 (S3 기반)
     * @param fileUrl 삭제할 파일의 URL
     */
    public void deleteFile(String fileUrl) {
        try {
            mediaUploadService.deleteFile(fileUrl);
            log.info("파일 삭제 성공: {}", fileUrl);
        } catch (Exception e) {
            log.error("파일 삭제 실패: {}", e.getMessage());
            // 파일 삭제 실패해도 예외를 던지지 않음 (서비스 중단 방지)
        }
    }

    /**
     * 파일 존재 여부 확인 (S3 기반)
     */
    public boolean fileExists(String fileUrl) {
        try {
            return mediaUploadService.fileExists(fileUrl);
        } catch (Exception e) {
            log.error("파일 존재 여부 확인 실패: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 파일 크기 검증
     */
    public void validateFileSize(MultipartFile file, long maxSizeInBytes) {
        mediaUploadService.validateFileSize(file, maxSizeInBytes);
    }

    /**
     * Pre-signed URL 생성 (이미지용)
     */
    public String generatePreSignedUrl(String fileName, String contentType, String category, Long userId) {
        return mediaUploadService.generatePreSignedUrl(fileName, contentType, category, userId);
    }

    /**
     * Pre-signed URL 생성 (비디오용)
     */
    public String generateVideoPreSignedUrl(String fileName, String contentType, String category, Long userId) {
        return mediaUploadService.generateVideoPreSignedUrl(fileName, contentType, category, userId);
    }

    /**
     * 이미지 파일 검증
     */
    public void validateImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !isValidImageType(contentType)) {
            throw new RuntimeException("지원하지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다.");
        }
    }

    private boolean isValidImageType(String contentType) {
        return contentType.equals("image/jpeg") ||
                contentType.equals("image/jpg") ||
                contentType.equals("image/png") ||
                contentType.equals("image/gif") ||
                contentType.equals("image/webp");
    }
}
