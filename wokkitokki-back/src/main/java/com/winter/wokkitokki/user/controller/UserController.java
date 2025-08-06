package com.winter.wokkitokki.user.controller;

import com.winter.wokkitokki.post.dto.PostImageResponseDto;
import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.service.PostService;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import com.winter.wokkitokki.user.dto.UserResponse;
import com.winter.wokkitokki.user.dto.UserUpdateRequestDto;
import com.winter.wokkitokki.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PostService postService;

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<UserResponse> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    // 프로필 보기
    @GetMapping("/{username}")
    public ResponseEntity<UserProfileResponseDto> getUserProfile(@PathVariable String username, Authentication auth){
        try{
            String currentUsername = auth!=null?auth.getName():null;
            UserProfileResponseDto profile = userService.getUserProfile(username, currentUsername);
            return ResponseEntity.ok(profile);
        }catch (Exception e){
            return ResponseEntity.badRequest().build();
        }
    }

    // 특정 사용자의 포스트 보기
    @GetMapping("/{username}/posts")
    public ResponseEntity<Page<PostResponseDto>> getUserPosts(@PathVariable String username, @RequestParam(defaultValue = "0")int page, @RequestParam(defaultValue = "10")int size, Authentication auth){
        try{
            Pageable pageable = PageRequest.of(page, size);
            String currentUsername = auth != null?auth.getName():null;
            Page<PostResponseDto> posts = postService.getUserPosts(username, pageable, currentUsername);
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
          return ResponseEntity.badRequest().build();
        }
    }

    // 특정 사용자의 이미지 포스트들 보기
    @GetMapping("/{username}/images")
    public ResponseEntity<Page<PostImageResponseDto>> getUserImagePosts(@PathVariable String username, @RequestParam(defaultValue = "0")int page, @RequestParam(defaultValue = "12")int size){
        try{
            Pageable pageable = PageRequest.of(page, size);
            Page<PostImageResponseDto> imagePosts = postService.getUserImagePosts(username, pageable);
            return ResponseEntity.ok(imagePosts);
        }catch(Exception e){
            return ResponseEntity.badRequest().build();
        }
    }

    // 팔로우/언팔로우
    @PostMapping("/{username}/follow")
    public ResponseEntity<Map<String, Object>> toggleFollow(@PathVariable String username, Authentication auth){
        try{
            String currentUsername = auth.getName();
            boolean isFollowing = userService.toggleFollow(currentUsername, username);

            String message = isFollowing ? "팔로우했습니다." : "언팔로우했습니다.";
            return ResponseEntity.ok(Map.of("message", message, "isFollowing", isFollowing));
        }catch (Exception e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 프로필 수정
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponseDto> updateProfile(Authentication auth, @RequestBody UserUpdateRequestDto requestDto){
        try{
            String currentUsername = auth.getName();
            UserProfileResponseDto updateProfile = userService.updateProfile(currentUsername, requestDto);
            return ResponseEntity.ok(updateProfile);
        }catch (Exception e){
            return ResponseEntity.badRequest().body(null);
        }
    }

    // 프로필 사진만 변경
    @PostMapping("/profile/image")
    public ResponseEntity<Map<String, String>> uploadProfileImg(Authentication auth, @RequestParam("file")MultipartFile file){
        try{
            String username = auth.getName();
            String imgUrl = userService.uploadProfileImage(username, file);

            return ResponseEntity.ok(Map.of("message","프로필 사진이 변경되었습니다", "imageUrl", imgUrl));
        }catch (Exception e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    // 프로필 사진 삭제
    @DeleteMapping("/profile/image")
    public ResponseEntity<Map<String, String>> deleteProfileImage(Authentication auth){
        try{
            String username = auth.getName();
            userService.deleteProfileImage(username);
            return ResponseEntity.ok(Map.of("message", "프로필 사진이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
