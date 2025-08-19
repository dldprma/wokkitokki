package com.winter.wokkitokki.post.service;

import com.winter.wokkitokki.post.dto.*;
import com.winter.wokkitokki.post.entity.LikeEntity;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.entity.RepostEntity;
import com.winter.wokkitokki.post.repository.LikeRepository;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.post.repository.RepostRepository;
import com.winter.wokkitokki.search.service.SearchIndexService;
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
    private final SearchIndexService searchIndexService;

    // 게시글 작성
    @Transactional
    public PostResponseDto createPost(Long userId, PostCreateRequestDto requestDto){
        UserEntity user = userRepository.findById(userId).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        // 내용과 이미지 둘 다 없으면 에러
        boolean hasContent = requestDto.getContent() != null && !requestDto.getContent().trim().isEmpty();
        boolean hasImage = requestDto.getImgUrl() != null && !requestDto.getImgUrl().trim().isEmpty();

        if (!hasContent && !hasImage) {
            throw new RuntimeException("게시글 내용 또는 이미지를 입력해주세요.");
        }

        // 내용 길이 제한
        if(requestDto.getContent() != null && requestDto.getContent().length() > 1000){
            throw new RuntimeException("게시글은 1000자 이내로 작성해주세요.");
        }

        PostEntity post = new PostEntity();
        post.setContent(hasContent ? requestDto.getContent().trim() : "");
        post.setImgUrl(requestDto.getImgUrl());
        post.setUser(user);
        post.setLikeCount(0);
        post.setRepostCount(0);

        PostEntity savedPost = postRepository.save(post);
        searchIndexService.indexPost(savedPost);
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
        searchIndexService.indexPost(updatedPost);

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
        searchIndexService.deletePostIndex(postId);
    }

    // 홈 피드 (팔로잉한 사람들 + 내 포스트)
    public Page<PostResponseDto> getFeedPosts(Long userId, Pageable pageable){
        UserEntity user = userRepository.findById(userId).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));
        Page<PostEntity> posts = postRepository.findFeedPosts(userId, pageable);
        return posts.map(post -> convertToResponseDto(post, user));
    }

    // 특정 포스트 상세조회
    public PostResponseDto getPostDetail(Long postId, Long currentUserId){
        PostEntity post = postRepository.findById(postId).orElseThrow(()->new RuntimeException("포스트를 찾을 수 없습니다."));

        UserEntity currentUser = null;
        if(currentUserId != null){
            currentUser = userRepository.findById(currentUserId).orElse(null);
        }
        return convertToResponseDto(post, currentUser);
    }

    // 좋아요 토글
    @Transactional
    public LikeResponseDto toggleLike(Long postId, Long userId){
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(()->new RuntimeException("포스트를 찾을 수 없습니다."));

        // 이미 좋아요 했는지 확인
        boolean alreadyLiked = likeRepository.existsByUserAndPost(user, post);

        if(alreadyLiked){
            LikeEntity like = likeRepository.findByUserAndPost(user, post);
            likeRepository.delete(like);

            // 음수값 방지 로직
            int currentCount = post.getLikeCount();
            int newCount = Math.max(0, currentCount -1);
            post.setLikeCount(newCount);
            postRepository.save(post);
            searchIndexService.updatePostStats(postId);

            return new LikeResponseDto(false, post.getLikeCount());
        }else{
            LikeEntity like = new LikeEntity();
            like.setUser(user);
            like.setPost(post);
            likeRepository.save(like);

            // 좋아요 증가
            post.setLikeCount(post.getLikeCount() + 1);
            postRepository.save(post);
            searchIndexService.updatePostStats(postId);

            return new LikeResponseDto(true, post.getLikeCount());
        }
    }

    // 리포스트 토글
    @Transactional
    public RepostResponseDto toggleRepost(Long postId, Long userId){
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        PostEntity post = postRepository.findById(postId)
                .orElseThrow(()->new RuntimeException("포스트를 찾을 수 없습니다."));

        // 이미 리포스트 했는지 확인
        boolean alreadyReposted = repostRepository.existsByUserAndPost(user, post);

        if(alreadyReposted){
            // 리포스트 취소
            RepostEntity repost = repostRepository.findByUserAndPost(user, post);
            repostRepository.delete(repost);

            // 음수값 방지 로직
            int currentCount = post.getRepostCount();
            int newCount = Math.max(0, currentCount - 1);
            post.setRepostCount(newCount);
            postRepository.save(post);
            searchIndexService.updatePostStats(postId);

            return new RepostResponseDto(false, post.getRepostCount());
        }else{
            RepostEntity repost = new RepostEntity();
            repost.setUser(user);
            repost.setPost(post);
            repostRepository.save(repost);

            post.setRepostCount(post.getRepostCount() + 1);
            postRepository.save(post);
            searchIndexService.updatePostStats(postId);

            return new RepostResponseDto(true, post.getRepostCount());
        }
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
            throw new RuntimeException("이미지 파일만 업로드 가능합니다.");
        }

        String originalFilename = file.getOriginalFilename();
        if(originalFilename == null){
            throw new RuntimeException("파일명이 없습니다.");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        if(!extension.equals(".jpg") && !extension.equals(".jpeg") && !extension.equals(".png")){
            throw new RuntimeException("JPG, JPEG, PNG 파일만 업로드 가능합니다.");
        }

        // 파일 크기 검증 (10MB)
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new RuntimeException("파일 크기는 10MB 이하로 해주세요");
        }

        try {
            // 프론트엔드 public/uploads 폴더에 저장
            String projectRoot = System.getProperty("user.dir");
            String frontendPath = projectRoot.replace("wokkitokki-back", "wt-app");
            File uploadDir = new File(frontendPath, "public/uploads/posts");

            // 디렉토리가 없으면 생성
            if (!uploadDir.exists()) {
                boolean created = uploadDir.mkdirs();
            }

            // 파일 이름 만들기 (UUID 사용)
            String filename = UUID.randomUUID().toString() + extension;

            // 파일 저장
            File saveFile = new File(uploadDir, filename);

            file.transferTo(saveFile);

            // 프론트엔드에서 접근 가능한 URL 반환
            return "/uploads/posts/" + filename;

        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("파일 업로드에 실패했습니다: " + e.getMessage());
        }
    }

    // PostEntity -> PostResponseDto 변환 (단일 메서드로 통일)
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

            boolean isOwner = post.getUser().getId().equals(currentUser.getId());
            dto.setCanEdit(isOwner);
            dto.setCanDelete(isOwner);
        }else{
            dto.setLiked(false);
            dto.setReposted(false);
            dto.setCanEdit(false);
            dto.setCanDelete(false);
        }
        return dto;
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
}