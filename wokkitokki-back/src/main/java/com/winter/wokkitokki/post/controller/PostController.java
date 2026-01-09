package com.winter.wokkitokki.post.controller;

import com.winter.wokkitokki.post.dto.*;
import com.winter.wokkitokki.post.service.PostService;
import com.winter.wokkitokki.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {
    private final PostService postService;
    private final UserService userService;

    // 피드 가져오기(팔로잉한 사람들 + 내 포스트 + 댓글)
    @GetMapping("/feed")
    public ResponseEntity<Page<Object>> getFeedPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Long userId = null;
            if (auth != null) {
                userId = userService.getUserIdByUsername(auth.getName());
            } else {
                // 인증되지 않은 사용자를 위한 기본 userId (임시로 12 사용)
                userId = 12L;
            }
            
            Page<Object> feedItems = postService.getFeedPosts(userId, pageable);
            
            return ResponseEntity.ok(feedItems);
        } catch (Exception e) {
            e.printStackTrace();
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

    // 게시글 작성 (개선된 버전 - 직접 MultipartFile 처리)
    @PostMapping
    public ResponseEntity<PostResponseDto> createPost(
            Authentication auth,
            @RequestPart(value = "content", required = false) String content,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());

            // 개선된 Service 메서드 사용
            PostResponseDto post = postService.createPost(userId, content, image);
            return ResponseEntity.ok(post);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }

    // 게시글 수정 (이미지 포함)
    @PutMapping("/{postId}")
    public ResponseEntity<PostResponseDto> updatePost(
            @PathVariable Long postId,
            Authentication auth,
            @RequestPart(value = "content") String content,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "removeImage", required = false, defaultValue = "false") Boolean removeImage) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());

            PostUpdateRequestDto requestDto = new PostUpdateRequestDto();
            requestDto.setContent(content);

            PostResponseDto updatedPost = postService.updatePost(postId, userId, requestDto, image, removeImage);
            return ResponseEntity.ok(updatedPost);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 게시글 삭제 (논리적 삭제)
    @DeleteMapping("/{postId}")
    public ResponseEntity<Map<String, String>> deletePost(
            @PathVariable Long postId,
            Authentication auth) {
        try {
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

    // 이미지 업로드 (별도 API - 필요한 경우)
    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("image") MultipartFile file) {
        try {
            String imageUrl = postService.uploadPostImage(file);
            return ResponseEntity.ok(Map.of(
                    "imageUrl", imageUrl,
                    "message", "이미지 업로드 성공"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 게시글 완전 삭제 (관리자용)
//    @DeleteMapping("/{postId}/permanent")
//    public ResponseEntity<Map<String, String>> permanentDeletePost(
//            @PathVariable Long postId,
//            Authentication auth) {
//        try {
//            // 관리자 권한 확인 로직 필요
//            // if (!userService.isAdmin(auth.getName())) {
//            //     return ResponseEntity.status(403).body(Map.of("error", "관리자만 접근 가능합니다"));
//            // }
//
//            postService.permanentDeletePost(postId);
//
//            return ResponseEntity.ok(Map.of(
//                    "message", "게시글이 완전히 삭제되었습니다"
//            ));
//        } catch (Exception e) {
//            return ResponseEntity.badRequest()
//                    .body(Map.of("error", e.getMessage()));
//        }
//    }

    // 게시글 복구 (관리자용)
//    @PostMapping("/{postId}/restore")
//    public ResponseEntity<PostResponseDto> restorePost(
//            @PathVariable Long postId,
//            Authentication auth) {
//        try {
//            // 관리자 권한 확인 로직 필요
//            // if (!userService.isAdmin(auth.getName())) {
//            //     return ResponseEntity.status(403).build();
//            // }
//
//            PostResponseDto restoredPost = postService.restorePost(postId);
//            return ResponseEntity.ok(restoredPost);
//        } catch (Exception e) {
//            return ResponseEntity.badRequest().build();
//        }
//    }

    // 좋아요 누르기/취소하기
    @PostMapping("/{postId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable Long postId,
            Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            LikeResponseDto result = postService.toggleLike(postId, userId);

            String message = result.isLiked() ? "좋아요를 눌렀습니다" : "좋아요를 취소했습니다";
            return ResponseEntity.ok(Map.of(
                    "message", message,
                    "isLiked", result.isLiked(),
                    "likeCount", result.getLikeCount()
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
            RepostResponseDto result = postService.toggleRepost(postId, userId);

            String message = result.isReposted() ? "리포스트했습니다" : "리포스트를 취소했습니다";
            return ResponseEntity.ok(Map.of(
                    "message", message,
                    "isReposted", result.isReposted(),
                    "repostCount", result.getRepostCount()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
