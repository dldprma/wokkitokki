package com.winter.wokkitokki.common.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaUploadService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket.raw}")
    private String rawBucket;

    @Value("${aws.s3.bucket.media}")
    private String mediaBucket;

    @Value("${aws.s3.cloudfront.domain:}")
    private String cloudFrontDomain;

    public String uploadImage(MultipartFile file, String category, Long userId) {
        validateImageFile(file);
        return uploadFile(file, category, userId, mediaBucket);
    }

    public String uploadVideo(MultipartFile file, String category, Long userId) {
        validateVideoFile(file);
        return uploadFile(file, category, userId, rawBucket);
    }

    private String uploadFile(MultipartFile file, String category, Long userId, String bucket) {
        try {
            String key = generateFileKey(file.getOriginalFilename(), category, userId);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest,
                RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String fileUrl = getFileUrl(key, bucket);
            log.info("File uploaded successfully: {}", fileUrl);
            return fileUrl;

        } catch (IOException e) {
            log.error("Error uploading file", e);
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    public String generatePreSignedUrl(String fileName, String contentType, String category, Long userId) {
        // 이미지는 media 버킷, 비디오는 raw 버킷
        String bucket = isVideoCategory(category) ? rawBucket : mediaBucket;
        return generatePreSignedUrl(fileName, contentType, category, userId, bucket);
    }

    public String generateVideoPreSignedUrl(String fileName, String contentType, String category, Long userId) {
        return generatePreSignedUrl(fileName, contentType, category, userId, rawBucket);
    }

    private String generatePreSignedUrl(String fileName, String contentType, String category, Long userId, String bucket) {
        try {
            String key = generateFileKey(fileName, category, userId);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15))
                    .putObjectRequest(putObjectRequest)
                    .build();

            PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);

            log.info("Generated pre-signed URL for key: {}", key);
            return presignedRequest.url().toString();

        } catch (Exception e) {
            log.error("Error generating pre-signed URL", e);
            throw new RuntimeException("Failed to generate pre-signed URL", e);
        }
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        try {
            String key = extractKeyFromUrl(fileUrl);
            String bucket = determineBucketFromUrl(fileUrl);

            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            s3Client.deleteObject(deleteRequest);
            log.info("File deleted successfully: {}", fileUrl);

        } catch (Exception e) {
            log.error("Error deleting file: {}", fileUrl, e);
        }
    }

    public boolean fileExists(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return false;
        }

        try {
            String key = extractKeyFromUrl(fileUrl);
            String bucket = determineBucketFromUrl(fileUrl);

            s3Client.headObject(builder -> builder.bucket(bucket).key(key));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String generateFileKey(String originalFileName, String category, Long userId) {
        String uuid = UUID.randomUUID().toString();
        String extension = getFileExtension(originalFileName);

        // 최적화된 폴더 구조
        if (isVideoCategory(category)) {
            // 비디오는 raw 버킷 - 처리 필요
            return String.format("reels/uploads/%d/%s%s", userId, uuid, extension);
        } else if (category.equals("posts") || category.equals("comments") || category.equals("dm")) {
            // 이미지는 media 버킷 - 바로 서비스
            return String.format("images/%s/%d/%s%s", category, userId, uuid, extension);
        } else {
            // 기본 구조 (하위 호환성)
            return String.format("%s/%d/%s%s", category, userId, uuid, extension);
        }
    }

    private String getFileUrl(String key, String bucket) {
        if (cloudFrontDomain != null && !cloudFrontDomain.isEmpty() && bucket.equals(mediaBucket)) {
            return String.format("https://%s/%s", cloudFrontDomain, key);
        }
        return String.format("https://%s.s3.amazonaws.com/%s", bucket, key);
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf("."));
    }

    private String extractKeyFromUrl(String fileUrl) {
        if (fileUrl.contains("amazonaws.com/")) {
            return fileUrl.substring(fileUrl.indexOf("amazonaws.com/") + "amazonaws.com/".length());
        }
        if (cloudFrontDomain != null && fileUrl.contains(cloudFrontDomain)) {
            return fileUrl.substring(fileUrl.indexOf(cloudFrontDomain) + cloudFrontDomain.length() + 1);
        }
        return fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
    }

    private String determineBucketFromUrl(String fileUrl) {
        if (fileUrl.contains(rawBucket)) {
            return rawBucket;
        }
        return mediaBucket;
    }

    private void validateImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !isValidImageType(contentType)) {
            throw new RuntimeException("지원하지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다.");
        }
    }

    private void validateVideoFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !isValidVideoType(contentType)) {
            throw new RuntimeException("지원하지 않는 비디오 형식입니다. MP4, MOV, AVI 형식만 업로드 가능합니다.");
        }
    }

    private boolean isValidImageType(String contentType) {
        return contentType.equals("image/jpeg") ||
                contentType.equals("image/jpg") ||
                contentType.equals("image/png") ||
                contentType.equals("image/gif") ||
                contentType.equals("image/webp");
    }

    private boolean isValidVideoType(String contentType) {
        return contentType.equals("video/mp4") ||
                contentType.equals("video/quicktime") ||
                contentType.equals("video/avi") ||
                contentType.equals("video/x-msvideo");
    }

    private boolean isVideoCategory(String category) {
        return "videos".equals(category) || "reels".equals(category);
    }

    public void validateFileSize(MultipartFile file, long maxSizeInBytes) {
        if (file.getSize() > maxSizeInBytes) {
            throw new RuntimeException("파일 크기가 너무 큽니다. 최대 " +
                    (maxSizeInBytes / 1024 / 1024) + "MB까지 업로드 가능합니다.");
        }
    }

    public String generateVideoKey(String originalFileName, Long userId) {
        String uuid = UUID.randomUUID().toString();
        String extension = getFileExtension(originalFileName);
        return String.format("reels/uploads/%d/%s%s", userId, uuid, extension);
    }

    public String getVideoUrl(String key) {
        return String.format("https://%s.s3.amazonaws.com/%s", rawBucket, key);
    }

    public String getOutputVideoUrl(String key) {
        return getFileUrl(key, mediaBucket);
    }

    public boolean verifyVideoUpload(String key) {
        try {
            log.info("=== S3 파일 존재 확인 ===");
            log.info("Bucket: {}", rawBucket);
            log.info("Key: {}", key);

            var response = s3Client.headObject(builder -> builder.bucket(rawBucket).key(key));

            log.info("파일 존재 확인 성공");
            log.info("파일 크기: {} bytes", response.contentLength());
            log.info("콘텐츠 타입: {}", response.contentType());
            log.info("마지막 수정: {}", response.lastModified());

            return true;
        } catch (Exception e) {
            log.warn("=== S3 파일 존재 확인 실패 ===");
            log.warn("Bucket: {}", rawBucket);
            log.warn("Key: {}", key);
            log.warn("오류: {}", e.getMessage());

            return false;
        }
    }

    public Map<String, Object> getFileDetails(String key) {
        Map<String, Object> details = new HashMap<>();
        try {
            var response = s3Client.headObject(builder -> builder.bucket(rawBucket).key(key));

            details.put("exists", true);
            details.put("contentLength", response.contentLength());
            details.put("contentType", response.contentType());
            details.put("lastModified", response.lastModified());
            details.put("bucket", rawBucket);
            details.put("key", key);

        } catch (Exception e) {
            details.put("exists", false);
            details.put("error", e.getMessage());
            details.put("bucket", rawBucket);
            details.put("key", key);
        }
        return details;
    }
}