package com.winter.wokkitokki.user.service;

import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import com.winter.wokkitokki.user.dto.UserResponse;
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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final FollowRepository followRepository;


    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertToUserResponse)
                .collect(Collectors.toList());
    }


    public UserResponse getUserById(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        return convertToUserResponse(user);
    }


    public UserResponse getUserByUsername(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        return convertToUserResponse(user);
    }

    private UserResponse convertToUserResponse(UserEntity user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }

    // 프로필 보기
    public UserProfileResponseDto getUserProfile(String username, String currentUsername){
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        int postCount = postRepository.countByUser(user);
        int imgCount = postRepository.countByUserAndImgUrlIsNotNull(user);
        int followersCnt = followRepository.countByFollowing(user);
        int followingCnt = followRepository.countByFollower(user);

        boolean isFollowing = false;
        if(currentUsername != null && !currentUsername.equals(username)){
            UserEntity currentUser = userRepository.findByUsername(currentUsername).orElse(null);
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
    public UserProfileResponseDto updateProfile(String currentUsername, UserUpdateRequestDto updateDto){
        UserEntity user = userRepository.findByUsername(currentUsername)
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
        userRepository.save(user);

        return getUserProfile(user.getUsername(), user.getUsername());
    }

    // 프로필 사진 업로드
    @Transactional
    public String uploadProfileImage(String username, MultipartFile file){
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
            UserEntity user = userRepository.findByUsername(username)
                    .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

            String imageUrl = "/uploads/profiles/"+filename;
            user.setProfileImgUrl(imageUrl);
            userRepository.save(user);

            return imageUrl;
        }catch (IOException e){
            throw new RuntimeException("파일 업로드에 실패했습니다.");
        }
    }

    // 팔로우 / 언팔로우
    @Transactional
    public boolean toggleFollow(String followerUsername, String followingUsername){
        UserEntity follower = userRepository.findByUsername(followerUsername).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));
        UserEntity following = userRepository.findByUsername(followingUsername).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        if(follower.getId().equals(following.getId())){
            throw new RuntimeException("본인은 팔로잉 할 수 없습니다.");
        }

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

}
