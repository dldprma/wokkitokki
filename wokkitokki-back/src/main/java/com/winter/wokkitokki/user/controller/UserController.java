package com.winter.wokkitokki.user.controller;

import com.winter.wokkitokki.post.dto.PostDto;
import com.winter.wokkitokki.post.service.PostService;
import com.winter.wokkitokki.user.dto.UserProfileDto;
import com.winter.wokkitokki.user.dto.UserResponse;
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

    @GetMapping("/{username}")
    public ResponseEntity<UserProfileDto> getUserProfile(@PathVariable String username){
        try{
            UserProfileDto profile = userService.getUserProfile(username);
            return ResponseEntity.ok(profile);
        }catch (Exception e){
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{username}/posts")
    public ResponseEntity<Page<PostDto>> getUserPosts(@PathVariable String username, @RequestParam(defaultValue = "0")int page, @RequestParam(defaultValue = "10")int size, Authentication auth){
        try{
            Pageable pageable = PageRequest.of(page, size);
            String currentUsername = auth != null?auth.getName():null;
            Page<PostDto> posts = postService.getUserPosts(username, pageable, currentUsername);
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
          return ResponseEntity.badRequest().build();
        }
    }

    // 프로필 수정
    @PutMapping("/profile")
    public ResponseEntity<UserProfileDto> updateProfile(Authentication auth, @RequestBody Map<String, String> request){
        try{
            String username = auth.getName();
            String newFullName = request.get("fullName");

            UserProfileDto updateProfile = userService.updateProfile(username, newFullName);
            return ResponseEntity.ok(updateProfile);
        }catch (Exception e){
            return ResponseEntity.badRequest().build();
        }
    }

    // 프로필 사진 업로드
    @PostMapping("/profile/img")
    public ResponseEntity<Map<String, String>> uploadProfileImg(Authentication auth, @RequestParam("file")MultipartFile file){
        try{
            String username = auth.getName();
            String imgUrl = userService.uploadProfileImage(username, file);

            return ResponseEntity.ok(Map.of("imageUrl", imgUrl));
        }catch (Exception e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
