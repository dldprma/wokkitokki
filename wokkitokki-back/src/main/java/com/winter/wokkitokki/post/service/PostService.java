package com.winter.wokkitokki.post.service;

import com.winter.wokkitokki.post.dto.PostCreateRequestDto;
import com.winter.wokkitokki.post.dto.PostImageResponseDto;
import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.dto.PostUpdateRequestDto;
import com.winter.wokkitokki.post.entity.LikeEntity;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.entity.RepostEntity;
import com.winter.wokkitokki.post.repository.LikeRepository;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.post.repository.RepostRepository;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {
    private final PostRepository postRepository;
    private final LikeRepository likeRepository;
    private final RepostRepository repostRepository;
    private final UserRepository userRepository;

    // 게시글 작성
    @Transactional
    public PostResponseDto createPost(Long userId, PostCreateRequestDto requestDto){
        UserEntity user = userRepository.findById(userId).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        // 내용이 비었는지 확인
        if(requestDto.getContent()==null || requestDto.getContent().trim().isEmpty()){
            throw new RuntimeException("게시글 내용을 입력해주세요.");
        }

        // 내용 길이 제한
        if(requestDto.getContent().length() > 1000){
            throw new RuntimeException("게시글은 1000자 이내로 작성해주세요.");
        }

        PostEntity post = new PostEntity();
        post.setContent(requestDto.getContent().trim());
        post.setImgUrl(requestDto.getImgUrl());
        post.setUser(user);
        post.setLikeCount(0);
        post.setRepostCount(0);

        PostEntity savedPost = postRepository.save(post);
        return convertToResponseDto(savedPost, user);
    }

    // 게시글 수정
    @Transactional
    public PostResponseDto updatePost(Long postId, Long userId, PostUpdateRequestDto requestDto){
        PostEntity post = postRepository.findById(postId).orElseThrow(()->new RuntimeException("게시글을 찾을 수 없습니다."));
        UserEntity currentUser = userRepository.findById(userId).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        // 본인 게시글인지 확인
        if(!post.getUser().getId().equals(userId)){
            throw new RuntimeException("본인의 게시글만 수정할 수 있습니다.");
        }

        // 내용이 비었는지 확인
        if(requestDto.getContent() == null || requestDto.getContent().trim().isEmpty()){
            throw new RuntimeException("게시글 내용을 입력해주세요");
        }

        // 내용 길이 제한
        if(requestDto.getContent().length() > 1000){
            throw new RuntimeException("게시글은 1000자 이내로 작성해주세요");
        }

        // 내용 업데이트
        post.setContent(requestDto.getContent().trim());
        PostEntity updatedPost = postRepository.save(post);

        return convertToResponseDto(updatedPost, currentUser);
    }

// 게시글 삭제 (본인만 가능)
@Transactional
public void deletePost(Long postId, Long userId) {
    PostEntity post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다"));

    // 본인 게시글인지 확인
    if (!post.getUser().getId().equals(userId)) {
        throw new RuntimeException("본인의 게시글만 삭제할 수 있습니다");
    }

    // 게시글에 이미지가 있다면 파일도 삭제
    if (post.getImgUrl() != null && !post.getImgUrl().isEmpty()) {
        deletePostImage(post.getImgUrl());
    }

    // 관련된 좋아요, 리포스트 데이터도 자동으로 삭제됨
    postRepository.delete(post);
}

// 게시글 이미지 업로드
@Transactional
public String uploadPostImage(MultipartFile file) {
    // 파일이 비어있는지 확인
    if (file.isEmpty()) {
        throw new RuntimeException("파일이 비어있습니다");
    }

    // 이미지 파일인지 확인
    String contentType = file.getContentType();
    if (contentType == null || !contentType.startsWith("image/")) {
        throw new RuntimeException("이미지 파일만 업로드 가능합니다");
    }

    // 파일 크기 검증 (10MB)
    if (file.getSize() > 10 * 1024 * 1024) {
        throw new RuntimeException("파일 크기는 10MB 이하로 해주세요");
    }

    try {
        // uploads 폴더가 없으면 만들기
        File uploadDir = new File("uploads/posts");
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        // 파일 이름 만들기 (UUID 사용)
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String filename = UUID.randomUUID().toString() + extension;

        // 파일 저장
        File saveFile = new File(uploadDir, filename);
        file.transferTo(saveFile);

        return "/uploads/posts/" + filename;

    } catch (IOException e) {
        throw new RuntimeException("파일 업로드에 실패했습니다");
    }
}

// 게시글 이미지 파일 삭제하는 private 메서드
private void deletePostImage(String imageUrl) {
    try {
        String filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
        File filePath = new File("uploads/posts", filename);
        if (filePath.exists()) {
            filePath.delete();
        }
    } catch (Exception e) {
        // 로그 기록만 하고 예외는 던지지 않음
        System.err.println("게시글 이미지 삭제 실패: " + e.getMessage());
    }
}

    // 홈 피드
    public Page<PostResponseDto> getFeedPosts(Long userId, Pageable pageable){
        UserEntity user = userRepository.findById(userId).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));
        Page<PostEntity> posts = postRepository.findFeedPosts(userId, pageable);
        return posts.map(post -> convertToResponseDto(post, user));
    }

    // 특정 사용자 포스트(프로필)
    public Page<PostResponseDto> getUserPosts(Long userId, Long currentUserId,Pageable pageable){
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        Page<PostEntity> posts = postRepository.findByUserOrderByCreatedAtDesc(user, pageable);

        UserEntity currentUser = null;
        if(currentUserId != null){
            currentUser = userRepository.findById(currentUserId).orElse(null);
        }
        final UserEntity finalCurrentUser = currentUser;
        return posts.map(post->convertToResponseDto(post, finalCurrentUser));
    }

    // 특정 사용자의 이미지 포스트만 가져오기
    public Page<PostImageResponseDto> getUserImagePosts(Long userId, Pageable pageable){
        UserEntity user = userRepository.findById(userId).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));
        Page<PostEntity> imagePosts = postRepository.findByUserAndImgUrlIsNotNullOrderByCreatedAtDesc(user, pageable);
        return imagePosts.map(this::convertToImageResponseDto);
    }

    // 특정 포스트 상세조회
    public PostResponseDto getPostDetail(Long postId, Long currentUserId){
        PostEntity post = postRepository.findById(postId).orElseThrow(()->new RuntimeException("포스트를 찾을 수 없습니다."));

        UserEntity currentUser = null;
        if(currentUserId != null){
            currentUser = userRepository.findById(currentUserId).orElse(null);
        }
        final UserEntity finalCurrentUser = currentUser;
        return convertToResponseDto(post, finalCurrentUser);
    }

    // 좋아요
    @Transactional
    public boolean toggleLike(Long postId, Long userId){
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(()->new RuntimeException("포스트를 찾을 수 없습니다."));

        // 이미 좋아요 했는지 확인
        boolean alreadyLiked = likeRepository.existsByUserAndPost(user, post);

        if(alreadyLiked){
            LikeEntity like = likeRepository.findByUserAndPost(user, post);
            likeRepository.save(like);
            // 포스트 좋아요 수 감소
            post.setLikeCount(post.getLikeCount() -1);
            postRepository.save(post);

            return false;
        }else{
            LikeEntity like = new LikeEntity();
            like.setUser(user);
            like.setPost(post);
            likeRepository.save(like);

            // 좋아요 증가
            post.setLikeCount(post.getLikeCount() +1);
            postRepository.save(post);

            return true;
        }
    }
    // 리포스트
    @Transactional
    public boolean toggleRepost(Long postId, Long userId){
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        PostEntity post = postRepository.findById(postId)
                .orElseThrow(()->new RuntimeException("포스트를 찾을 수 없습니다."));

        // 자기 포스트는 리포스트 불가
        if(post.getUser().getId().equals(user.getId())){
            throw new RuntimeException("자신의 포스트는 리포스트 할 수 없습니다.");
        }

        // 이미 리포스트 했는지 확인
        boolean alreadyReposted = repostRepository.existsByUserAndPost(user, post);

        if(alreadyReposted){
            // 리포스트 취소
            RepostEntity repost = repostRepository.findByUserAndPost(user, post);
            repostRepository.delete(repost);

            post.setRepostCount(post.getRepostCount() -1);
            postRepository.save(post);
            return false;
        }else{
            RepostEntity repost = new RepostEntity();
            repost.setUser(user);
            repost.setPost(post);
            repostRepository.save(repost);

            post.setRepostCount(post.getRepostCount() +1);
            postRepository.save(post);
            return true;
        }
    }

    // postEntity -> postDto
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
        dto.setCreatedAt(post.getCreatedAt().toString());

        // 현재 사용자가 좋아요/리포스트 했는지 확인
        if(currentUser != null){
            dto.setLiked(likeRepository.existsByUserAndPost(currentUser, post));
            dto.setReposted(repostRepository.existsByUserAndPost(currentUser, post));
        }
        return dto;
    }

    // PostEntity를 PostImgDto로 변환
    private PostImageResponseDto convertToImageResponseDto(PostEntity post){
        PostImageResponseDto dto = new PostImageResponseDto();
        dto.setId(post.getId());
        dto.setImgUrl(post.getImgUrl());
        dto.setLikeCount(post.getLikeCount());
        dto.setRepostCount(post.getRepostCount());
        dto.setCreatedAt(post.getCreatedAt().toString());
        return dto;
    }
}
