package com.winter.wokkitokki.reels.service;

import com.winter.wokkitokki.post.entity.LikeEntity;
import com.winter.wokkitokki.post.repository.LikeRepository;
import com.winter.wokkitokki.common.service.S3PresignedUrlService;
import com.winter.wokkitokki.reels.dto.ReelsLambdaCallbackDto;
import com.winter.wokkitokki.reels.dto.ReelsResponseDto;
import com.winter.wokkitokki.reels.dto.ReelsUpdateRequestDto;
import com.winter.wokkitokki.reels.dto.ReelsUploadResponseDto;
import com.winter.wokkitokki.reels.entity.ReelsEntity;
import com.winter.wokkitokki.reels.repository.ReelsRepository;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import com.winter.wokkitokki.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReelsService {

    private final ReelsRepository reelsRepository;
    private final UserRepository userRepository;
    private final LikeRepository likeRepository;
    private final S3PresignedUrlService s3PresignedUrlService;
    private final MessageService messageService;

    public ReelsUploadResponseDto createReelsWithPreSignedUrl(String originalFilename, String contentType, String title, String description, Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // S3 Pre-signed URL 생성
        S3PresignedUrlService.S3PresignedUrlResponse s3Response =
                s3PresignedUrlService.generateVideoUploadUrl(originalFilename, contentType, userId);

        // ReelsEntity 생성 (처음엔 HLS URL 없음)
        ReelsEntity reels = new ReelsEntity();
        reels.setTitle(title);
        reels.setDescription(description);
        reels.setUser(user);
        reels.setVideoId(s3Response.getVideoId()); // videoId 저장
        reels.setCreatedAt(LocalDateTime.now());

        ReelsEntity savedReels = reelsRepository.save(reels);
        log.info("ReelsEntity 생성 및 Pre-signed URL 생성 완료 - ReelsID: {}", savedReels.getId());

        return ReelsUploadResponseDto.builder()
                .presignedUrl(s3Response.getPresignedUrl())
                .reelsId(savedReels.getId())
                .videoId(s3Response.getVideoId()) // videoId 추가
                .s3ObjectKey(s3Response.getS3ObjectKey())
                .expiresIn(s3Response.getExpiresIn())
                .message("Pre-signed URL 생성 완료. 1시간 내에 업로드를 완료해주세요.")
                .build();
    }

    public void updateFromLambda(ReelsLambdaCallbackDto request) {
        ReelsEntity reels = reelsRepository.findByIdAndDeletedFalse(request.getReelsId())
                .orElseThrow(() -> new RuntimeException("Reels not found: " + request.getReelsId()));

        // HLS URL 업데이트 (처리 완료)
        if (request.getHlsPlaylistUrl() != null) {
            reels.setHlsPlaylistUrl(request.getHlsPlaylistUrl());
            reelsRepository.save(reels);
            log.info("Lambda 콜백 처리 완료 - ReelsID: {}", reels.getId());
        }
    }

    @Transactional(readOnly = true)
    public Page<ReelsResponseDto> getAllReels(Pageable pageable) {
        return reelsRepository.findByDeletedFalseOrderByCreatedAtDesc(pageable)
                .map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public ReelsResponseDto getReelsById(Long id) {
        ReelsEntity reels = reelsRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Reels not found"));

        return convertToDto(reels);
    }

    public ReelsResponseDto updateReels(Long id, ReelsUpdateRequestDto request, Long userId) {
        ReelsEntity reels = reelsRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Reels not found"));

        if (!reels.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to update this reels");
        }

        if (request.getTitle() != null) {
            reels.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            reels.setDescription(request.getDescription());
        }

        ReelsEntity updatedReels = reelsRepository.save(reels);
        return convertToDto(updatedReels);
    }

    public void deleteReels(Long id, Long userId) {
        ReelsEntity reels = reelsRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Reels not found"));

        if (!reels.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to delete this reels");
        }

        reels.setDeleted(true);
        reelsRepository.save(reels);
    }






    private ReelsResponseDto convertToDto(ReelsEntity reels) {
        return ReelsResponseDto.builder()
                .id(reels.getId())
                .title(reels.getTitle())
                .description(reels.getDescription())
                .userId(reels.getUser().getId())
                .username(reels.getUser().getUsername())
                .hlsPlaylistUrl(reels.getHlsPlaylistUrl())
                .videoId(reels.getVideoId()) // videoId 추가
                .likeCount(reels.getLikeCount())
                .commentCount(reels.getCommentCount())
                .shareCount(reels.getShareCount())
                .createdAt(reels.getCreatedAt())
                .build();
    }

    public void toggleLike(Long reelsId, Long userId) {
        ReelsEntity reels = reelsRepository.findByIdAndDeletedFalse(reelsId)
                .orElseThrow(() -> new RuntimeException("Reels not found"));
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (likeRepository.existsByUserAndReels(user, reels)) {
            // 좋아요 취소
            likeRepository.deleteByUserAndReels(user, reels);
            reels.setLikeCount(Math.max(0, reels.getLikeCount() - 1));
        } else {
            // 좋아요 추가
            LikeEntity like = new LikeEntity();
            like.setUser(user);
            like.setReels(reels);
            likeRepository.save(like);
            reels.setLikeCount(reels.getLikeCount() + 1);
        }

        reelsRepository.save(reels);
    }

    public void shareReels(Long reelsId, Long senderId, List<Long> targetUserIds) {
        ReelsEntity reels = reelsRepository.findByIdAndDeletedFalse(reelsId)
                .orElseThrow(() -> new RuntimeException("Reels not found"));

        // 각 대상 사용자에게 릴스 공유 메시지 전송
        for (Long targetUserId : targetUserIds) {
            try {
                String shareMessage = String.format("릴스를 공유했습니다: %s",
                    reels.getTitle() != null ? reels.getTitle() : "제목 없음");
                messageService.sendMessage(senderId, targetUserId, shareMessage);
                log.info("릴스 공유 완료 - ReelsID: {}, SenderId: {}, TargetUserId: {}",
                    reelsId, senderId, targetUserId);
            } catch (Exception e) {
                log.error("릴스 공유 실패 - ReelsID: {}, SenderId: {}, TargetUserId: {}, Error: {}",
                    reelsId, senderId, targetUserId, e.getMessage());
            }
        }

        // 공유 횟수 증가
        reels.setShareCount(reels.getShareCount() + targetUserIds.size());
        reelsRepository.save(reels);
    }
}