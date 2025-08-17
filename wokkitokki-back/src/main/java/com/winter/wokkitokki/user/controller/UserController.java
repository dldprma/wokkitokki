package com.winter.wokkitokki.user.controller;

import com.winter.wokkitokki.post.dto.PostImageResponseDto;
import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.service.PostService;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import com.winter.wokkitokki.user.dto.UserUpdateRequestDto;
import com.winter.wokkitokki.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // 프로필 정보 조회 (모든 사용자)
    @GetMapping("/{username}")
    public ResponseEntity<UserProfileResponseDto> getUserProfile(@PathVariable String username, Authentication auth){
        try{
            // username → ID 변환
            Long userId = userService.getUserIdByUsername(username);
            Long currentUserId = null;

            if (auth != null) {
                currentUserId = userService.getUserIdByUsername(auth.getName());
            }
            UserProfileResponseDto profile = userService.getUserProfile(userId, currentUserId);
            return ResponseEntity.ok(profile);
        }catch (Exception e){
            return ResponseEntity.badRequest().build();
        }
    }

    // 특정 사용자의 모든 포스트 조회
    @GetMapping("/{username}/posts")
    public ResponseEntity<Page<PostResponseDto>> getUserPosts(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth){
        try{
            Pageable pageable = PageRequest.of(page, size);
            // username → ID 변환
            Long userId = userService.getUserIdByUsername(username);
            Long currentUserId = null;

            if (auth != null) {
                currentUserId = userService.getUserIdByUsername(auth.getName());
            }
            Page<PostResponseDto> posts = userService.getUserPosts(userId, currentUserId, pageable);
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 특정 사용자의 이미지 포스트만 조회
    @GetMapping("/{username}/images")
    public ResponseEntity<Page<PostImageResponseDto>> getUserImagePosts(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size){
        try{
            Pageable pageable = PageRequest.of(page, size);
            Long userId = userService.getUserIdByUsername(username);
            Page<PostImageResponseDto> imagePosts = userService.getUserImagePosts(userId, pageable);
            return ResponseEntity.ok(imagePosts);
        }catch(Exception e){
            return ResponseEntity.badRequest().build();
        }
    }

    // 팔로우/언팔로우
    @PostMapping("/{username}/follow")
    public ResponseEntity<Map<String, Object>> toggleFollow(@PathVariable String username, Authentication auth){
        try{
            // username → ID 변환
            Long followerId = userService.getUserIdByUsername(auth.getName());
            Long followingId = userService.getUserIdByUsername(username);

            boolean isFollowing = userService.toggleFollow(followerId, followingId);

            String message = isFollowing ? "팔로우했습니다." : "언팔로우했습니다.";
            return ResponseEntity.ok(Map.of("message", message, "isFollowing", isFollowing));
        }catch (Exception e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 내 프로필 수정
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponseDto> updateProfile(Authentication auth, @RequestBody UserUpdateRequestDto requestDto){
        try{
            Long userId = userService.getUserIdByUsername(auth.getName());
            UserProfileResponseDto updateProfile = userService.updateProfile(userId, requestDto);
            return ResponseEntity.ok(updateProfile);
        }catch (Exception e){
            return ResponseEntity.badRequest().body(null);
        }
    }

    // 내 프로필 사진 변경
    @PostMapping("/profile/image")
    public ResponseEntity<Map<String, String>> uploadProfileImg(Authentication auth, @RequestParam("image") MultipartFile file){
        try{
            Long userId = userService.getUserIdByUsername(auth.getName());
            String imgUrl = userService.uploadProfileImage(userId, file);

            return ResponseEntity.ok(Map.of("message","프로필 사진이 변경되었습니다", "imageUrl", imgUrl));
        }catch (Exception e){
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 내 프로필 사진 삭제
    @DeleteMapping("/profile/image")
    public ResponseEntity<Map<String, String>> deleteProfileImage(Authentication auth){
        try{
            Long userId = userService.getUserIdByUsername(auth.getName());
            userService.deleteProfileImage(userId);
            return ResponseEntity.ok(Map.of("message", "프로필 사진이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
