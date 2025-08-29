package com.winter.wokkitokki.comment.controller;

import com.winter.wokkitokki.comment.dto.*;
import com.winter.wokkitokki.comment.service.CommentService;
import com.winter.wokkitokki.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;
    private final UserService userService;

    // 게시글별 댓글 목록 조회
    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommentResponseDto>> getCommentsByPost(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {

        Long currentUserId = auth != null ? userService.getUserIdByUsername(auth.getName()) : null;
        List<CommentResponseDto> response = commentService.getCommentsByPost(postId, page, size, currentUserId);
        return ResponseEntity.ok(response);
    }

    // 댓글별 대댓글 목록 조회
    @GetMapping("/comments/{commentId}/replies")
    public ResponseEntity<List<CommentResponseDto>> getRepliesByComment(
            @PathVariable Long commentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {

        Long currentUserId = auth != null ? userService.getUserIdByUsername(auth.getName()) : null;
        List<CommentResponseDto> response = commentService.getRepliesByComment(commentId, page, size, currentUserId);
        return ResponseEntity.ok(response);
    }

    // 댓글 작성 (이미지 포함/미포함)
    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentResponseDto> createComment(
            @PathVariable Long postId,
            Authentication auth,
            @RequestPart(value = "content", required = false) String content,
            @RequestPart(value = "parentCommentId", required = false) String parentCommentId,
            @RequestPart(value = "image", required = false) MultipartFile imageFile) {

        Long currentUserId = userService.getUserIdByUsername(auth.getName());
        
        // DTO 생성
        CommentCreateRequestDto request = new CommentCreateRequestDto();
        request.setContent(content);
        if (parentCommentId != null && !parentCommentId.isEmpty()) {
            request.setParentCommentId(Long.parseLong(parentCommentId));
        }
        
        CommentResponseDto response = commentService.createComment(postId, request, imageFile, currentUserId);
        return ResponseEntity.ok(response);
    }

    // 댓글 수정 (이미지 포함)
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<CommentResponseDto> updateComment(
            @PathVariable Long commentId,
            @RequestPart("comment") CommentUpdateRequestDto request,
            @RequestPart(value = "image", required = false) MultipartFile imageFile,
            Authentication auth) {

        Long currentUserId = userService.getUserIdByUsername(auth.getName());
        CommentResponseDto response = commentService.updateComment(commentId, request, imageFile, currentUserId);
        return ResponseEntity.ok(response);
    }

    // 댓글 삭제
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<String> deleteComment(
            @PathVariable Long commentId,
            Authentication auth) {

        Long currentUserId = userService.getUserIdByUsername(auth.getName());
        commentService.deleteComment(commentId, currentUserId);
        return ResponseEntity.ok("댓글이 삭제되었습니다.");
    }

    // 댓글 좋아요 토글
    @PostMapping("/comments/{commentId}/like")
    public ResponseEntity<CommentLikeResponseDto> toggleLike(
            @PathVariable Long commentId,
            Authentication auth) {

        Long currentUserId = userService.getUserIdByUsername(auth.getName());
        CommentLikeResponseDto response = commentService.toggleLike(commentId, currentUserId);
        return ResponseEntity.ok(response);
    }

    // 댓글 리포스트 토글
    @PostMapping("/comments/{commentId}/repost")
    public ResponseEntity<CommentRepostResponseDto> toggleRepost(
            @PathVariable Long commentId,
            Authentication auth) {

        Long currentUserId = userService.getUserIdByUsername(auth.getName());
        CommentRepostResponseDto response = commentService.toggleRepost(commentId, currentUserId);
        return ResponseEntity.ok(response);
    }
}
