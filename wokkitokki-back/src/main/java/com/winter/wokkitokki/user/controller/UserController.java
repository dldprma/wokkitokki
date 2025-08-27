package com.winter.wokkitokki.user.controller;

import com.winter.wokkitokki.common.util.JwtUtils;
import com.winter.wokkitokki.post.dto.PostImageResponseDto;
import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.service.PostService;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import com.winter.wokkitokki.user.dto.UserUpdateRequestDto;
import com.winter.wokkitokki.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    // 프로필 정보 조회 (모든 사용자)
    @GetMapping("/{username}")
    public ResponseEntity<UserProfileResponseDto> getUserProfile(
            @PathVariable String username, 
            @RequestParam(required = false) String currentUser,
            Authentication auth){
        try{
            // username → ID 변환
            Long userId = userService.getUserIdByUsername(username);
            Long currentUserId = null;

            // currentUser 쿼리 파라미터가 있으면 우선 사용, 없으면 auth에서 가져오기
            if (currentUser != null && !currentUser.isEmpty()) {
                currentUserId = userService.getUserIdByUsername(currentUser);
            } else if (auth != null) {
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

            // 업데이트된 프로필 정보 가져오기
            UserProfileResponseDto updatedProfile = userService.getUserProfile(followingId, followerId);

            Map<String, Object> response = new HashMap<>();
            response.put("isFollowing", isFollowing);
            response.put("action", isFollowing ? "followed" : "unfollowed");
            response.put("message", isFollowing ? "팔로우했습니다." : "언팔로우했습니다.");
            response.put("targetUserProfile", updatedProfile);

            return ResponseEntity.ok(response);
        }catch (Exception e){
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 팔로워 목록 조회
    @GetMapping("/{username}/followers")
    public ResponseEntity<Page<UserProfileResponseDto>> getFollowers(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth){
        try{
            Pageable pageable = PageRequest.of(page, size);
            Long userId = userService.getUserIdByUsername(username);
            Long currentUserId = null;

            if (auth != null) {
                currentUserId = userService.getUserIdByUsername(auth.getName());
            }

            Page<UserProfileResponseDto> followers = userService.getFollowers(userId, currentUserId, pageable);
            return ResponseEntity.ok(followers);
        }catch (Exception e){
            return ResponseEntity.badRequest().build();
        }
    }

    // 팔로잉 목록 조회
    @GetMapping("/{username}/following")
    public ResponseEntity<Page<UserProfileResponseDto>> getFollowing(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth){
        try{
            Pageable pageable = PageRequest.of(page, size);
            Long userId = userService.getUserIdByUsername(username);
            Long currentUserId = null;

            if (auth != null) {
                currentUserId = userService.getUserIdByUsername(auth.getName());
            }

            Page<UserProfileResponseDto> following = userService.getFollowing(userId, currentUserId, pageable);
            return ResponseEntity.ok(following);
        }catch (Exception e){
            return ResponseEntity.badRequest().build();
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
