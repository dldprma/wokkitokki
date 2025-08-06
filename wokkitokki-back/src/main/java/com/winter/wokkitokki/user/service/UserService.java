package com.winter.wokkitokki.user.service;

import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import com.winter.wokkitokki.user.dto.UserUpdateRequestDto;
import com.winter.wokkitokki.user.entity.FollowEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.FollowRepository;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final FollowRepository followRepository;

    // username → ID 변환 메서드
    public Long getUserIdByUsername(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
        return user.getId();
    }

    // 프로필 조회
    public UserProfileResponseDto getUserProfile(Long userId, Long currentUserId){
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        int postCount = postRepository.countByUser(user);
        int imgCount = postRepository.countByUserAndImgUrlIsNotNull(user);
        int followersCnt = followRepository.countByFollowing(user);
        int followingCnt = followRepository.countByFollower(user);

        boolean isFollowing = false;
        if(currentUserId != null && !currentUserId.equals(currentUserId)){
            UserEntity currentUser = userRepository.findById(currentUserId).orElse(null);
            if(currentUser != null){
                isFollowing = followRepository.existsByFollowerAndFollowing(currentUser, user);
            }
        }

        UserProfileResponseDto profile = new UserProfileResponseDto();
        profile.setId(user.getId());
        profile.setFullName(user.getFullName());
        profile.setUsername(user.getUsername());
        profile.setEmail(user.getEmail());
        profile.setProfileImgUrl(user.getProfileImgUrl());
        profile.setBio(user.getBio());
        profile.setPostCount(postCount);
        profile.setImagePostCount(imgCount);
        profile.setFollowersCount(followersCnt);
        profile.setFollowingCount(followingCnt);
        profile.setFollowing(isFollowing);

        return profile;
    }

    // 프로필 수정
    @Transactional
    public UserProfileResponseDto updateProfile(Long userId, UserUpdateRequestDto updateDto){
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        // 이름수정
        if(updateDto.getFullName() != null && !updateDto.getFullName().trim().isEmpty()){
            user.setFullName(updateDto.getFullName().trim());
        }
        // 유저네임 수정(중복체크)
        if(updateDto.getUsername() != null && !updateDto.getUsername().trim().isEmpty()){
            String newUsername = updateDto.getUsername().trim();

            // 현재 유저네임과 다른 경우에만 중복 검사
            if(!newUsername.equals(user.getUsername())){
                boolean exists = userRepository.existsByUsername(newUsername);
                if(exists){
                    throw new RuntimeException("이미 사용중인 유저네임입니다.");
                }
                user.setUsername(newUsername);
            }
        }
        // 한줄 소개 수정
        if(updateDto.getBio()!=null){
            String bio = updateDto.getBio().trim();
            if(bio.length() > 300){
                throw new RuntimeException("한줄소개는 500자 이내로 작성해주세요.");
            }
            user.setBio(bio.isEmpty()?null:bio);
        }
        UserEntity savedUser = userRepository.save(user);

        return getUserProfile(savedUser.getId(), savedUser.getId());
    }

    // 프로필 사진 업로드
    @Transactional
    public String uploadProfileImage(Long userId, MultipartFile file){
        // 파일이 비어있는지 확인
        if(file.isEmpty()){
            throw new RuntimeException("파일이 비었습니다.");
        }
        // 이미지 파일인지 확인
        String contentType = file.getContentType();
        if(contentType == null || !contentType.startsWith("image/")){
            throw new RuntimeException("이미지 파일만 업로드 가능합니다.");
        }

        try{
            File uploadDir = new File("uploads/profiles");
            if(!uploadDir.exists()){
                uploadDir.mkdirs();
            }
            // 파일 이름 생성
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String filename = UUID.randomUUID().toString() + extension;

            // 파일 저장
            File saveFile = new File(uploadDir, filename);
            file.transferTo(saveFile);

            // 사용자 프로필 이미지 URL 업데이트
            UserEntity user = userRepository.findById(userId)
                    .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

            String imageUrl = "/uploads/profiles/"+filename;
            user.setProfileImgUrl(imageUrl);
            userRepository.save(user);

            return imageUrl;
        }catch (IOException e){
            throw new RuntimeException("파일 업로드에 실패했습니다.");
        }
    }

    // 프로필 사진 삭제
    @Transactional
    public void deleteProfileImage(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        // 기존 파일이 있다면 삭제
        if (user.getProfileImgUrl() != null && !user.getProfileImgUrl().isEmpty()) {
            deleteExistingProfileImage(user.getProfileImgUrl());
        }

        // DB에서 프로필 이미지 URL 제거
        user.setProfileImgUrl(null);
        userRepository.save(user);
    }

    // 팔로우 / 언팔로우
    @Transactional
    public boolean toggleFollow(Long followerId, Long followingId){

        if(followerId.equals(followingId)){
            throw new RuntimeException("본인은 팔로잉 할 수 없습니다.");
        }
        UserEntity follower = userRepository.findById(followerId).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));
        UserEntity following = userRepository.findById(followingId).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        // 이미 팔로잉 했는지
        boolean alreadyFollowing = followRepository.existsByFollowerAndFollowing(follower, following);

        if(alreadyFollowing){
            FollowEntity follow = followRepository.findByFollowerAndFollowing(follower, following);
            followRepository.delete(follow);
            return false;
        }else{
            FollowEntity follow = new FollowEntity();
            follow.setFollower(follower);
            follow.setFollowing(following);
            followRepository.save(follow);
            return true;
        }
    }

    // 기존 프로필 이미지 파일 삭제하는 private 메서드
    private void deleteExistingProfileImage(String imageUrl) {
        try {
            String filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
            File filePath = new File("uploads/profiles", filename);
            if (filePath.exists()) {
                filePath.delete();
            }
        } catch (Exception e) {
            // 로그 기록만 하고 예외는 던지지 않음 (파일 삭제 실패해도 DB는 업데이트)
            System.err.println("기존 프로필 이미지 삭제 실패: " + e.getMessage());
        }
    }
}
