package com.winter.wokkitokki.reels.controller;

import com.winter.wokkitokki.comment.dto.CommentCreateRequestDto;
import com.winter.wokkitokki.comment.dto.CommentResponseDto;
import com.winter.wokkitokki.comment.service.CommentService;
import com.winter.wokkitokki.common.service.S3PresignedUrlService;
import com.winter.wokkitokki.reels.dto.*;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import com.winter.wokkitokki.reels.service.ReelsService;
import com.winter.wokkitokki.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.Map;

@RestController
@RequestMapping("/api/reels")
@RequiredArgsConstructor
public class ReelsController {

    private final ReelsService reelsService;
    private final UserService userService;
    private final CommentService commentService;
    private final S3PresignedUrlService s3PresignedUrlService;

    @PostMapping("/upload-url")
    public ResponseEntity<ReelsUploadResponseDto> generatePreSignedUrl(
            @Valid @RequestBody ReelsUploadRequestDto request,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());

            // ReelsEntity 생성 및 Pre-signed URL 생성
            ReelsUploadResponseDto response = reelsService.createReelsWithPreSignedUrl(
                    request.getOriginalFilename(),
                    request.getContentType(),
                    request.getTitle(),
                    request.getDescription(),
                    userId
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }





    @GetMapping
    public ResponseEntity<Page<ReelsResponseDto>> getAllReels(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<ReelsResponseDto> reels = reelsService.getAllReels(pageable);
            return ResponseEntity.ok(reels);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/lambda-callback")
    public ResponseEntity<Void> lambdaCallback(
            @RequestBody ReelsLambdaCallbackDto request) {
        try {
            reelsService.updateFromLambda(request);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }


    @GetMapping("/{id}")
    public ResponseEntity<ReelsResponseDto> getReelsById(@PathVariable Long id) {
        try {
            ReelsResponseDto reels = reelsService.getReelsById(id);
            return ResponseEntity.ok(reels);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReelsResponseDto> updateReels(
            @PathVariable Long id,
            @RequestBody ReelsUpdateRequestDto request,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            ReelsResponseDto response = reelsService.updateReels(id, request, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReels(
            @PathVariable Long id,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            reelsService.deleteReels(id, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }




    @PostMapping("/{id}/like")
    public ResponseEntity<Void> likeReels(@PathVariable Long id, Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            reelsService.toggleLike(id, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<Void> shareReels(
            @PathVariable Long id,
            @Valid @RequestBody ShareReelsRequestDto request,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            reelsService.shareReels(id, userId, request.getTargetUserIds());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/share/following")
    public ResponseEntity<Page<UserProfileResponseDto>> getFollowingForShare(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            Pageable pageable = PageRequest.of(page, size);
            Page<UserProfileResponseDto> following = userService.getFollowing(userId, userId, pageable);
            return ResponseEntity.ok(following);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<Page<CommentResponseDto>> getReelsComments(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        try {
            Long userId = auth != null ? userService.getUserIdByUsername(auth.getName()) : null;
            Page<CommentResponseDto> comments = commentService.getCommentsByReels(id, page, size, userId);
            return ResponseEntity.ok(comments);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponseDto> createReelsComment(
            @PathVariable Long id,
            @RequestBody CommentCreateRequestDto request,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            CommentResponseDto comment = commentService.createCommentOnReels(id, request, userId);
            return ResponseEntity.ok(comment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/comments/{commentId}/reply")
    public ResponseEntity<CommentResponseDto> createReelsReply(
            @PathVariable Long id,
            @PathVariable Long commentId,
            @RequestBody CommentCreateRequestDto request,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            CommentResponseDto reply = commentService.createReplyOnReels(id, commentId, request, userId);
            return ResponseEntity.ok(reply);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

}