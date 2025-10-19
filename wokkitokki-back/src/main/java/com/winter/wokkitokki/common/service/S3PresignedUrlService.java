package com.winter.wokkitokki.common.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3PresignedUrlService {

    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket.raw}")
    private String rawBucket;

    @Value("${aws.s3.bucket.media}")
    private String mediaBucket;

    public S3PresignedUrlResponse generateVideoUploadUrl(String originalFilename, String contentType, Long userId) {
        // UUID 생성
        String videoId = UUID.randomUUID().toString();

        // 파일 확장자 추출
        String extension = extractFileExtension(originalFilename);

        // S3 객체 키 생성: uploads/userId/UUID.확장자
        String s3ObjectKey = String.format("uploads/%d/%s%s", userId, videoId, extension);

        try {
            // PutObjectRequest 생성
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(rawBucket)
                    .key(s3ObjectKey)
                    .contentType(contentType)
                    .build();

            // Pre-signed URL 생성 (1시간 유효)
            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofHours(1))
                    .putObjectRequest(putObjectRequest)
                    .build();

            PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
            String presignedUrl = presignedRequest.url().toString();

            log.info("Pre-signed URL 생성 완료 - VideoID: {}, Key: {}", videoId, s3ObjectKey);

            return S3PresignedUrlResponse.builder()
                    .presignedUrl(presignedUrl)
                    .videoId(videoId)
                    .s3ObjectKey(s3ObjectKey)
                    .bucket(rawBucket)
                    .expiresIn(3600) // 1시간
                    .build();

        } catch (Exception e) {
            log.error("Pre-signed URL 생성 실패 - VideoID: {}, Key: {}", videoId, s3ObjectKey, e);
            throw new RuntimeException("Pre-signed URL 생성에 실패했습니다: " + e.getMessage(), e);
        }
    }

    private String extractFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }

    public static class S3PresignedUrlResponse {
        private String presignedUrl;
        private String videoId;
        private String s3ObjectKey;
        private String bucket;
        private int expiresIn;

        public static S3PresignedUrlResponseBuilder builder() {
            return new S3PresignedUrlResponseBuilder();
        }

        // Getters
        public String getPresignedUrl() { return presignedUrl; }
        public String getVideoId() { return videoId; }
        public String getS3ObjectKey() { return s3ObjectKey; }
        public String getBucket() { return bucket; }
        public int getExpiresIn() { return expiresIn; }

        // Builder
        public static class S3PresignedUrlResponseBuilder {
            private String presignedUrl;
            private String videoId;
            private String s3ObjectKey;
            private String bucket;
            private int expiresIn;

            public S3PresignedUrlResponseBuilder presignedUrl(String presignedUrl) {
                this.presignedUrl = presignedUrl;
                return this;
            }

            public S3PresignedUrlResponseBuilder videoId(String videoId) {
                this.videoId = videoId;
                return this;
            }

            public S3PresignedUrlResponseBuilder s3ObjectKey(String s3ObjectKey) {
                this.s3ObjectKey = s3ObjectKey;
                return this;
            }

            public S3PresignedUrlResponseBuilder bucket(String bucket) {
                this.bucket = bucket;
                return this;
            }

            public S3PresignedUrlResponseBuilder expiresIn(int expiresIn) {
                this.expiresIn = expiresIn;
                return this;
            }

            public S3PresignedUrlResponse build() {
                S3PresignedUrlResponse response = new S3PresignedUrlResponse();
                response.presignedUrl = this.presignedUrl;
                response.videoId = this.videoId;
                response.s3ObjectKey = this.s3ObjectKey;
                response.bucket = this.bucket;
                response.expiresIn = this.expiresIn;
                return response;
            }
        }
    }
}