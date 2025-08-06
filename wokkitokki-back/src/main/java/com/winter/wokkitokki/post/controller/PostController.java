package com.winter.wokkitokki.post.controller;

import com.winter.wokkitokki.post.dto.PostCreateRequestDto;
import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.dto.PostUpdateRequestDto;
import com.winter.wokkitokki.post.service.PostService;
import com.winter.wokkitokki.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {
    private final PostService postService;
    private final UserService userService;

    // 피드 가져오기(팔로잉한 사람들 + 내 포스트)
    @GetMapping("/feed")
    public ResponseEntity<Page<PostResponseDto>> getFeedPosts(
            @RequestParam(defaultValue = "0")int page, @RequestParam(defaultValue = "10")int size, Authentication auth){
        try{
            Pageable pageable = PageRequest.of(page, size);
            Long userId = userService.getUserIdByUsername(auth.getName());

            Page<PostResponseDto> posts = postService.getFeedPosts(userId, pageable);
            return ResponseEntity.ok(posts);
        }catch (Exception e){
            return ResponseEntity.badRequest().build();
        }
    }
    // 포스트 상세조회
    @GetMapping("/{postId}")
    public ResponseEntity<PostResponseDto> getPostDetail(
            @PathVariable Long postId,
            Authentication auth) {
        try {
            Long currentUserId = null;
            if (auth != null) {
                currentUserId = userService.getUserIdByUsername(auth.getName());
            }

            PostResponseDto post = postService.getPostDetail(postId, currentUserId);
            return ResponseEntity.ok(post);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 게시글 작성 (ID 기반)
    @PostMapping
    public ResponseEntity<PostResponseDto> createPost(
            Authentication auth,
            @RequestBody PostCreateRequestDto requestDto) {
        try {
            // username → ID 변환
            Long userId = userService.getUserIdByUsername(auth.getName());

            PostResponseDto post = postService.createPost(userId, requestDto);
            return ResponseEntity.ok(post);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 게시글 수정 (본인만 가능 - ID 기반)
    @PutMapping("/{postId}")
    public ResponseEntity<PostResponseDto> updatePost(
            @PathVariable Long postId,
            Authentication auth,
            @RequestBody PostUpdateRequestDto requestDto) {
        try {
            // username → ID 변환
            Long userId = userService.getUserIdByUsername(auth.getName());

            PostResponseDto updatedPost = postService.updatePost(postId, userId, requestDto);
            return ResponseEntity.ok(updatedPost);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 게시글 삭제 (본인만 가능 - ID 기반)
    @DeleteMapping("/{postId}")
    public ResponseEntity<Map<String, String>> deletePost(
            @PathVariable Long postId,
            Authentication auth) {
        try {
            // username → ID 변환
            Long userId = userService.getUserIdByUsername(auth.getName());

            postService.deletePost(postId, userId);

            return ResponseEntity.ok(Map.of(
                    "message", "게시글이 삭제되었습니다"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 좋아요 누르기/취소하기
    @PostMapping("/{postId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable Long postId,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            boolean isLiked = postService.toggleLike(postId, userId);

            String message = isLiked ? "좋아요를 눌렀습니다" : "좋아요를 취소했습니다";
            return ResponseEntity.ok(Map.of(
                    "message", message,
                    "isLiked", isLiked
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 리포스트 하기/취소하기
    @PostMapping("/{postId}/repost")
    public ResponseEntity<Map<String, Object>> toggleRepost(
            @PathVariable Long postId,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            boolean isReposted = postService.toggleRepost(postId, userId);

            String message = isReposted ? "리포스트했습니다" : "리포스트를 취소했습니다";
            return ResponseEntity.ok(Map.of(
                    "message", message,
                    "isReposted", isReposted
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
