package com.winter.wokkitokki.user.service;

import com.winter.wokkitokki.auth.service.JwtBlacklistService;
import com.winter.wokkitokki.common.util.JwtUtils;
import com.winter.wokkitokki.post.dto.FeedItemDto;
import com.winter.wokkitokki.post.dto.PostImageResponseDto;
import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.dto.PostWithCommentsDto;
import com.winter.wokkitokki.comment.dto.CommentResponseDto;
import com.winter.wokkitokki.comment.entity.CommentEntity;
import com.winter.wokkitokki.comment.repository.CommentRepository;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.LikeRepository;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.post.repository.RepostRepository;
import com.winter.wokkitokki.post.service.RedisFeedIntegration;
import com.winter.wokkitokki.search.service.SearchIndexService;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import com.winter.wokkitokki.user.dto.UserUpdateRequestDto;
import com.winter.wokkitokki.user.entity.FollowEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.FollowRepository;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final FollowRepository followRepository;
    private final LikeRepository likeRepository;
    private final RepostRepository repostRepository;
    private final CommentRepository commentRepository;
    private final SearchIndexService searchIndexService;
    private final RedisFeedIntegration redisFeedIntegration;

    // username → ID 변환 메서드
    public Long getUserIdByUsername(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
        return user.getId();
    }

    // 프로필 조회
    public UserProfileResponseDto getUserProfile(Long userId, Long currentUserId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 작성글갯수, 댓글갯수 각각 조회
        Long originalPostCount = postRepository.countUserOriginalPosts(userId);
        Long commentCount = commentRepository.countByAuthorId(userId);
        
        // 직접 작성한 이미지 게시글 개수 (리포스트 제외)
        int imgCount = postRepository.countByUserAndImgUrlIsNotNullAndDeletedFalse(user);

        int followersCnt = followRepository.countByFollowing(user);
        int followingCnt = followRepository.countByFollower(user);

        boolean isFollowing = false;
        if (currentUserId != null && !currentUserId.equals(userId)) {
            UserEntity currentUser = userRepository.findById(currentUserId).orElse(null);
            if (currentUser != null) {
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
        profile.setPostCount(originalPostCount);
        profile.setCommentCount(commentCount);
        profile.setImagePostCount(imgCount);
        profile.setFollowersCount(followersCnt);
        profile.setFollowingCount(followingCnt);
        profile.setFollowing(isFollowing);

        return profile;
    }


    // 특정 사용자의 모든 포스트 조회
    public Page<PostResponseDto> getUserPosts(Long userId, Long currentUserId, Pageable pageable) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 1. 사용자가 작성한 게시글 조회
        List<FeedItemDto> originalPosts = postRepository.findOriginalPostsByUserId(userId);

        // 2. 사용자가 리포스트한 게시글 조회
        List<FeedItemDto> userReposts = postRepository.findUserReposts(userId);

        // 3. 모든 활동 합치기
        List<FeedItemDto> allActivity = new ArrayList<>();
        allActivity.addAll(originalPosts);
        allActivity.addAll(userReposts);

        // 4. 시간순 정렬 (최신순)
        allActivity.sort((a, b) -> b.getSortTime().compareTo(a.getSortTime()));

        // 5. 페이징 처리
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), allActivity.size());
        List<FeedItemDto> pagedItems = allActivity.subList(start, end);

        // 6. 게시글 ID 추출 및 실제 게시글 조회
        List<Long> postIds = pagedItems.stream()
                .map(FeedItemDto::getPostId)
                .toList();

        List<PostEntity> posts = postRepository.findPostsByIds(postIds);
        Map<Long, PostEntity> postMap = posts.stream()
                .collect(Collectors.toMap(PostEntity::getId, p -> p));

        // 7. 현재 사용자 정보
        UserEntity currentUser = null;
        if (currentUserId != null) {
            currentUser = userRepository.findById(currentUserId).orElse(null);
        }
        final UserEntity finalCurrentUser = currentUser;

        // 8. DTO 변환
        List<PostResponseDto> userPosts = pagedItems.stream()
                .map(item -> {
                    PostEntity post = postMap.get(item.getPostId());
                    if (post != null && !post.isDeleted()) {
                        PostResponseDto dto = convertToResponseDto(post, finalCurrentUser);

                        // 리포스트 정보 설정
                        if ("REPOST".equals(item.getType())) {
                            dto.setRepost(true);
                            dto.setRepostedBy(item.getRepostUsername());
                            dto.setRepostedAt(item.getSortTime().toString());
                            dto.setOriginalCreatedAt(post.getCreatedAt().toString());
                        }

                        return dto;
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .toList();

        // 9. Page 객체 생성
        return new PageImpl<>(userPosts, pageable, allActivity.size());
    }

    public Page<PostImageResponseDto> getUserImagePosts(Long userId, Pageable pageable) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 직접 작성한 이미지 게시글만 (리포스트한 이미지는 제외)
        Page<PostEntity> imagePosts = postRepository.findByUserAndImgUrlIsNotNullAndDeletedFalseOrderByCreatedAtDesc(user, pageable);
        return imagePosts.map(this::convertToImageResponseDto);
    }

    // 특정 사용자가 댓글 단 게시글들 조회 (Threads 방식)
    public Page<PostWithCommentsDto> getUserCommentedPosts(Long userId, Long currentUserId, Pageable pageable) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 1. 해당 사용자가 댓글 단 게시글들을 댓글 시간순으로 조회
        List<CommentEntity> userComments = commentRepository.findByAuthorIdOrderByCreatedAtDesc(userId);
        
        // 2. 게시글별 최신 댓글로 그룹화
        Map<Long, List<CommentEntity>> commentsByPost = userComments.stream()
                .collect(Collectors.groupingBy(c -> c.getPost().getId()));
        
        // 3. 게시글별로 가장 최신 댓글 시간으로 정렬
        List<Map.Entry<Long, List<CommentEntity>>> sortedEntries = commentsByPost.entrySet()
                .stream()
                .sorted((a, b) -> {
                    LocalDateTime timeA = a.getValue().get(0).getCreatedAt();
                    LocalDateTime timeB = b.getValue().get(0).getCreatedAt(); 
                    return timeB.compareTo(timeA);
                })
                .collect(Collectors.toList());

        // 4. 페이징 처리
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), sortedEntries.size());
        List<Map.Entry<Long, List<CommentEntity>>> pagedEntries = sortedEntries.subList(start, end);

        // 5. PostWithCommentsDto로 변환
        List<PostWithCommentsDto> results = new ArrayList<>();
        
        UserEntity currentUser = currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;
        
        for (Map.Entry<Long, List<CommentEntity>> entry : pagedEntries) {
            Long postId = entry.getKey();
            List<CommentEntity> comments = entry.getValue();
            
            PostEntity post = postRepository.findById(postId).orElse(null);
            if (post != null && !post.isDeleted()) {
                PostResponseDto postDto = convertToResponseDto(post, currentUser);
                
                // 해당 사용자의 댓글들만 변환
                List<CommentResponseDto> userCommentsDto = comments.stream()
                        .map(comment -> convertCommentToResponseDto(comment, currentUser))
                        .collect(Collectors.toList());

                PostWithCommentsDto postWithComments = PostWithCommentsDto.builder()
                        .post(postDto)
                        .relevantComments(userCommentsDto)
                        .activitySummary(user.getUsername() + "님이 댓글을 남겼습니다")
                        .build();
                        
                results.add(postWithComments);
            }
        }

        return new PageImpl<>(results, pageable, sortedEntries.size());
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
                throw new RuntimeException("한줄소개는 300자 이내로 작성해주세요."); // 500자→300자 수정
            }
            user.setBio(bio.isEmpty()?null:bio);
        }
        UserEntity savedUser = userRepository.save(user);
        searchIndexService.indexUser(savedUser);

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
            // 프론트엔드 public/uploads 폴더에 저장
            String projectRoot = System.getProperty("user.dir");
            String frontendPath = projectRoot.replace("wokkitokki-back", "wt-app");
            File uploadDir = new File(frontendPath, "public/uploads/profiles");

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

            String imageUrl = "http://localhost:5173/uploads/profiles/"+filename;
            user.setProfileImgUrl(imageUrl);
            userRepository.save(user);
            searchIndexService.indexUser(user);

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

        if (alreadyFollowing) {
            // 언팔로우
            followRepository.findByFollowerAndFollowing(follower, following)
                    .ifPresent(followRepository::delete);

            searchIndexService.updateUserStats(followerId);
            searchIndexService.updateUserStats(followingId);

            // Redis 피드 업데이트 추가 - V2 사용
            redisFeedIntegration.invalidateUserFeedCache(followerId);
            redisFeedIntegration.invalidateUserFeedCache(followingId);

            return false;
        } else {
            // 팔로우
            FollowEntity follow = new FollowEntity();
            follow.setFollower(follower);
            follow.setFollowing(following);
            followRepository.save(follow);

            searchIndexService.updateUserStats(followerId);
            searchIndexService.updateUserStats(followingId);

            // Redis 피드 업데이트 추가 - V2 사용  
            redisFeedIntegration.invalidateUserFeedCache(followerId);
            redisFeedIntegration.invalidateUserFeedCache(followingId);

            return true;
        }
    }

    // 팔로잉 목록 조회
    public Page<UserProfileResponseDto> getFollowing(Long userId, Long currentUserId, Pageable pageable) {
        UserEntity user = getUserById(userId);
        UserEntity currentUser = getCurrentUser(currentUserId);

        Page<FollowEntity> followEntities = followRepository.findByFollower(user, pageable);

        return followEntities.map(follow ->
                convertToUserProfileDto(follow.getFollowing(), currentUser)
        );
    }


    // 팔로워 목록 조회
    public Page<UserProfileResponseDto> getFollowers(Long userId, Long currentUserId, Pageable pageable) {
        UserEntity user = getUserById(userId);
        UserEntity currentUser = getCurrentUser(currentUserId);

        Page<FollowEntity> followEntities = followRepository.findByFollowing(user, pageable);

        return followEntities.map(follow ->
                convertToUserProfileDto(follow.getFollower(), currentUser)
        );
    }

    private UserEntity getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
    }

    private UserEntity getCurrentUser(Long currentUserId) {
        return currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;
    }

    // PostEntity -> PostResponseDto 변환
    private PostResponseDto convertToResponseDto(PostEntity post, UserEntity currentUser){
        PostResponseDto dto = new PostResponseDto();
        dto.setId(post.getId());
        dto.setContent(post.getContent());
        dto.setImgUrl(post.getImgUrl());
        dto.setAuthorName(post.getUser().getFullName());
        dto.setAuthorUsername(post.getUser().getUsername());
        dto.setAuthorProfileImg(post.getUser().getProfileImgUrl());
        dto.setLikeCount(post.getLikeCount());
        dto.setRepostCount(post.getRepostCount());
        dto.setCommentCount(post.getCommentCount());
        dto.setCreatedAt(post.getCreatedAt().toString());
        dto.setDeleted(post.isDeleted());

        // 현재 사용자가 좋아요/리포스트 했는지 확인
        if(currentUser != null){
            boolean isLiked = likeRepository.existsByUserAndPost(currentUser, post);
            boolean isReposted = repostRepository.existsByUserAndPost(currentUser, post);
            dto.setLiked(isLiked);
            dto.setReposted(isReposted);

            boolean isOwner = post.getUser().getId().equals(currentUser.getId());
            dto.setCanEdit(isOwner && !post.isDeleted());
            dto.setCanDelete(isOwner && !post.isDeleted());
        }else{
            dto.setLiked(false);
            dto.setReposted(false);
            dto.setCanEdit(false);
            dto.setCanDelete(false);
        }
        return dto;
    }

    // PostEntity -> PostImageResponseDto 변환
    private PostImageResponseDto convertToImageResponseDto(PostEntity post){
        PostImageResponseDto dto = new PostImageResponseDto();
        dto.setId(post.getId());
        dto.setImgUrl(post.getImgUrl());
        dto.setLikeCount(post.getLikeCount());
        dto.setRepostCount(post.getRepostCount());
        dto.setCreatedAt(post.getCreatedAt().toString());

        return dto;
    }

    // UserEntity -> UserProfileResponseDto 변환 (단일 메서드로 통일)
    private UserProfileResponseDto convertToUserProfileDto(UserEntity user, UserEntity currentUser) {
        UserProfileResponseDto dto = new UserProfileResponseDto();
        dto.setId(user.getId());
        dto.setFullName(user.getFullName());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setProfileImgUrl(user.getProfileImgUrl());
        dto.setBio(user.getBio());

        // 작성글, 댓글 조회 (원본 게시글만 카운트)
        Long originalPostCount = postRepository.countUserOriginalPosts(user.getId());
        Long commentCount = commentRepository.countByAuthorId(user.getId());
        dto.setPostCount(originalPostCount); // 원본 게시글만
        dto.setCommentCount(commentCount);

        // 직접 작성한 이미지 게시글만
        dto.setImagePostCount(postRepository.countByUserAndImgUrlIsNotNullAndDeletedFalse(user));
        dto.setFollowersCount(followRepository.countByFollowing(user));
        dto.setFollowingCount(followRepository.countByFollower(user));
        dto.setFollowing(isFollowing(currentUser, user));
        return dto;
    }

    // 팔로잉 여부 확인
    private boolean isFollowing(UserEntity currentUser, UserEntity targetUser) {
        return currentUser != null &&
                followRepository.existsByFollowerAndFollowing(currentUser, targetUser);
    }

    // CommentEntity -> CommentResponseDto 변환
    private CommentResponseDto convertCommentToResponseDto(CommentEntity comment, UserEntity currentUser) {
        boolean isLiked = false;
        boolean isReposted = false;
        boolean canEdit = false;
        boolean canDelete = false;

        if (currentUser != null) {
            isLiked = likeRepository.existsByUserAndComment(currentUser, comment);
            isReposted = repostRepository.existsByUserAndComment(currentUser, comment);
            boolean isOwner = comment.getAuthor().getId().equals(currentUser.getId());
            canEdit = isOwner;
            canDelete = isOwner;
        }

        return CommentResponseDto.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .imageUrl(comment.getImageUrl())
                .authorId(comment.getAuthor().getId())
                .authorName(comment.getAuthor().getFullName())
                .authorUsername(comment.getAuthor().getUsername())
                .authorProfileImg(comment.getAuthor().getProfileImgUrl())
                .postId(comment.getPost().getId())
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .likeCount(comment.getLikeCount())
                .repostCount(comment.getRepostCount())
                .replyCount(comment.getReplyCount())
                .isLiked(isLiked)
                .isReposted(isReposted)
                .canEdit(canEdit)
                .canDelete(canDelete)
                .createdAt(comment.getCreatedAt().toString())
                .updatedAt(comment.getUpdatedAt() != null ? comment.getUpdatedAt().toString() : null)
                .build();
    }

    // 회원 탈퇴 (Soft Delete)
    @Transactional
    public void withdrawUser(Long userId) {
        UserEntity user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        // Soft Delete 처리
        user.setDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);
        
        // Elasticsearch에서 사용자 인덱스 삭제
        searchIndexService.deleteUserIndex(userId);
        
        // Redis 피드에서 사용자 관련 데이터 정리
        redisFeedIntegration.handleUserDeleted(userId);
        
        log.info("사용자 탈퇴 처리 완료: userId={}", userId);
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