package com.winter.wokkitokki.post.controller;

import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.service.PostService;
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

    // 피드 가져오기(팔로잉한 사람들 + 내 포스트)
    @GetMapping("/feed")
    public ResponseEntity<Page<PostResponseDto>> getFeedPosts(
            @RequestParam(defaultValue = "0")int page, @RequestParam(defaultValue = "10")int size, Authentication auth){
        try{
            Pageable pageable = PageRequest.of(page, size);
            String currentUsername = auth.getName(); // 로그인된 사용자만 피드 볼 수 있음

            Page<PostResponseDto> posts = postService.getFeedPosts(currentUsername, pageable);
            return ResponseEntity.ok(posts);
        }catch (Exception e){
            return ResponseEntity.badRequest().build();
        }
    }
    // 좋아요 누르기/취소하기
    @PostMapping("/{postId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable Long postId,
            Authentication auth) {
        try {
            String username = auth.getName();
            boolean isLiked = postService.toggleLike(postId, username);

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
            String username = auth.getName();
            boolean isReposted = postService.toggleRepost(postId, username);

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
