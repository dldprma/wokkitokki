package com.winter.wokkitokki.post.service;

import com.winter.wokkitokki.common.service.FileService;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class PostService {
    private final PostRepository postRepository;
    private final LikeRepository likeRepository;
    private final RepostRepository repostRepository;
    private final UserRepository userRepository;
    private final SearchIndexService searchIndexService;
    private final FileService fileService;
    private final RedisFeedIntegrationV2 redisFeedIntegrationV2;

    // 게시글 작성
    @Transactional
    public PostResponseDto createPost(Long userId, String content, MultipartFile image) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 내용과 이미지 둘 다 없으면 에러
        boolean hasContent = content != null && !content.trim().isEmpty();
        boolean hasImage = image != null && !image.isEmpty();

        if (!hasContent && !hasImage) {
            throw new RuntimeException("게시글 내용 또는 이미지를 입력해주세요.");
        }

        // 내용 길이 제한
        if (content != null && content.length() > 1000) {
            throw new RuntimeException("게시글은 1000자 이내로 작성해주세요.");
        }

        PostEntity post = new PostEntity();
        post.setContent(hasContent ? content.trim() : "");
        post.setUser(user);
        post.setLikeCount(0);
        post.setRepostCount(0);
        post.setDeleted(false);
        post.setDeletedAt(null);

        // 이미지 업로드 처리
        if (hasImage) {
            fileService.validateImageFile(image);
            fileService.validateFileSize(image, 5 * 1024 * 1024); // 5MB

            try {
                String imageUrl = fileService.uploadFile(image, "posts");
                post.setImgUrl(imageUrl);
            } catch (Exception e) {
                throw new RuntimeException("이미지 업로드에 실패했습니다.", e);
            }
        }

        PostEntity savedPost = postRepository.save(post);
        searchIndexService.indexPost(savedPost);
        redisFeedIntegrationV2.handlePostCreated(savedPost);
        return convertToResponseDto(savedPost, user);
    }

    // 게시글 수정
    @Transactional
    public PostResponseDto updatePost(Long postId, Long userId, PostUpdateRequestDto requestDto,
                                      MultipartFile image, Boolean removeImage) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        // 삭제된 게시글인지 확인
        if (post.isDeleted()) {
            throw new RuntimeException("삭제된 게시글은 수정할 수 없습니다.");
        }

        UserEntity currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 본인 게시글인지 확인
        if (!post.getUser().getId().equals(userId)) {
            throw new RuntimeException("본인의 게시글만 수정할 수 있습니다.");
        }

        // 내용 검증 및 업데이트
        if (requestDto.getContent() == null || requestDto.getContent().trim().isEmpty()) {
            throw new RuntimeException("게시글 내용을 입력해주세요");
        }
        if (requestDto.getContent().length() > 1000) {
            throw new RuntimeException("게시글은 1000자 이내로 작성해주세요");
        }
        post.setContent(requestDto.getContent().trim());
        post.setUpdatedAt(LocalDateTime.now()); // 수정 시간 업데이트

        // 이미지 삭제 요청이 있는 경우
        if (Boolean.TRUE.equals(removeImage)) {
            if (post.getImgUrl() != null && !post.getImgUrl().isEmpty()) {
                log.info("이미지 논리적 삭제: {}", post.getImgUrl());
            }
            post.setImgUrl(null);
        }
        // 새 이미지가 있는 경우
        else if (image != null && !image.isEmpty()) {
            if (post.getImgUrl() != null && !post.getImgUrl().isEmpty()) {
                log.info("기존 이미지 교체: {}", post.getImgUrl());
            }

            fileService.validateImageFile(image);
            fileService.validateFileSize(image, 5 * 1024 * 1024); // 5MB

            try {
                String imageUrl = fileService.uploadFile(image, "posts");
                post.setImgUrl(imageUrl);
            } catch (Exception e) {
                throw new RuntimeException("이미지 업로드에 실패했습니다.", e);
            }
        }

        PostEntity updatedPost = postRepository.save(post);
        searchIndexService.indexPost(updatedPost);

        return convertToResponseDto(updatedPost, currentUser);
    }

    // 게시글 논리적 삭제 (본인만 가능)
    @Transactional
    public void deletePost(Long postId, Long userId) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다"));

        if (post.isDeleted()) {
            throw new RuntimeException("이미 삭제된 게시글입니다.");
        }

        if (!post.getUser().getId().equals(userId)) {
            throw new RuntimeException("본인의 게시글만 삭제할 수 있습니다");
        }

        // 논리적 삭제 처리
        post.setDeleted(true);
        post.setDeletedAt(LocalDateTime.now());
        post.setDeletedBy(userId);

        postRepository.save(post);
        searchIndexService.deletePostIndex(postId);
        redisFeedIntegrationV2.handlePostDeleted(postId, userId);

        log.info("게시글 논리적 삭제 완료 - PostId: {}, UserId: {}", postId, userId);
    }

    // 게시글 이미지 업로드 (별도 API용)
    @Transactional
    public String uploadPostImage(MultipartFile file) {
        fileService.validateImageFile(file);
        fileService.validateFileSize(file, 10 * 1024 * 1024); // 10MB

        try {
            return fileService.uploadFile(file, "posts");
        } catch (Exception e) {
            throw new RuntimeException("파일 업로드에 실패했습니다: " + e.getMessage(), e);
        }
    }

    // 홈 피드 (리포스트 시간 포함) - V2로 업데이트됨
    @Transactional(readOnly = true)
    public Page<Object> getFeedPosts(Long userId, Pageable pageable) {
        return redisFeedIntegrationV2.getFeedItems(userId, pageable);
    }

    // 특정 포스트 상세조회 (삭제된 게시글 제외)
    public PostResponseDto getPostDetail(Long postId, Long currentUserId) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("포스트를 찾을 수 없습니다."));

        if (post.isDeleted()) {
            throw new RuntimeException("삭제된 게시글입니다.");
        }

        UserEntity currentUser = null;
        if (currentUserId != null) {
            currentUser = userRepository.findById(currentUserId).orElse(null);
        }
        return convertToResponseDto(post, currentUser);
    }

    // 좋아요 토글 (삭제된 게시글에는 불가)
    @Transactional
    public LikeResponseDto toggleLike(Long postId, Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("포스트를 찾을 수 없습니다."));

        if (post.isDeleted()) {
            throw new RuntimeException("삭제된 게시글에는 좋아요를 할 수 없습니다.");
        }

        boolean alreadyLiked = likeRepository.existsByUserAndPost(user, post);

        if (alreadyLiked) {
            LikeEntity like = likeRepository.findByUserAndPost(user, post);
            likeRepository.delete(like);

            int currentCount = post.getLikeCount();
            int newCount = Math.max(0, currentCount - 1);
            post.setLikeCount(newCount);
            postRepository.save(post);
            searchIndexService.updatePostStats(postId);

            return new LikeResponseDto(false, post.getLikeCount());
        } else {
            LikeEntity like = new LikeEntity();
            like.setUser(user);
            like.setPost(post);
            likeRepository.save(like);

            post.setLikeCount(post.getLikeCount() + 1);
            postRepository.save(post);
            searchIndexService.updatePostStats(postId);

            return new LikeResponseDto(true, post.getLikeCount());
        }
    }

    // 리포스트 토글 (삭제된 게시글에는 불가)
    @Transactional
    public RepostResponseDto toggleRepost(Long postId, Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("포스트를 찾을 수 없습니다."));

        if (post.isDeleted()) {
            throw new RuntimeException("삭제된 게시글은 리포스트할 수 없습니다.");
        }

        boolean alreadyReposted = repostRepository.existsByUserAndPost(user, post);

        if (alreadyReposted) {
            RepostEntity repost = repostRepository.findByUserAndPost(user, post);
            repostRepository.delete(repost);

            int currentCount = post.getRepostCount();
            int newCount = Math.max(0, currentCount - 1);
            post.setRepostCount(newCount);
            postRepository.save(post);
            searchIndexService.updatePostStats(postId);
            redisFeedIntegrationV2.handlePostRepostRemoved(postId, userId);
//            redisFeedIntegration.invalidateUserFeedCache(userId);

            return new RepostResponseDto(false, post.getRepostCount());
        } else {
            RepostEntity repost = new RepostEntity();
            repost.setUser(user);
            repost.setPost(post);
            repost.setRepostedAt(LocalDateTime.now());
            repostRepository.save(repost);

            post.setRepostCount(post.getRepostCount() + 1);
            postRepository.save(post);
            searchIndexService.updatePostStats(postId);
            redisFeedIntegrationV2.handlePostRepostCreated(postId, userId, LocalDateTime.now());
//            redisFeedIntegration.invalidateUserFeedCache(userId);

            return new RepostResponseDto(true, post.getRepostCount());
        }
    }

    // DTO 변환 메서드들 (통일된 이름으로 정리)
    public PostResponseDto convertToResponseDto(PostEntity post, UserEntity currentUser) {
        return convertToResponseDtos(List.of(post), currentUser).get(0);
    }

    public List<PostResponseDto> convertToResponseDtos(List<PostEntity> posts, UserEntity currentUser) {
        if (posts.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> postIds = posts.stream()
                .map(PostEntity::getId)
                .collect(Collectors.toList());

        // 한번의 쿼리로 모든 좋아요/리포스트 상태 조회
        final Set<Long> likedPostIds;
        final Set<Long> repostedPostIds;

        if (currentUser != null) {
            likedPostIds = new HashSet<>(likeRepository.findLikedPostIdsByUserAndPostIds(currentUser.getId(), postIds));
            repostedPostIds = new HashSet<>(repostRepository.findRepostedPostIdsByUserAndPostIds(currentUser.getId(), postIds));
        } else {
            likedPostIds = Collections.emptySet();
            repostedPostIds = Collections.emptySet();
        }

        final UserEntity finalCurrentUser = currentUser;

        return posts.stream().map(post -> {
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

            if (finalCurrentUser != null) {
                dto.setLiked(likedPostIds.contains(post.getId()));
                dto.setReposted(repostedPostIds.contains(post.getId()));

                boolean isOwner = post.getUser().getId().equals(finalCurrentUser.getId());
                dto.setCanEdit(isOwner && !post.isDeleted());
                dto.setCanDelete(isOwner && !post.isDeleted());
            } else {
                dto.setLiked(false);
                dto.setReposted(false);
                dto.setCanEdit(false);
                dto.setCanDelete(false);
            }

            return dto;
        }).collect(Collectors.toList());
    }

    // 게시글 완전 삭제 (관리자용)
    @Transactional
    public void permanentDeletePost(Long postId) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다"));

        if (post.getImgUrl() != null && !post.getImgUrl().isEmpty()) {
            try {
                fileService.deleteFile(post.getImgUrl());
            } catch (Exception e) {
                log.warn("게시글 이미지 삭제 실패: " + post.getImgUrl(), e);
            }
        }

        postRepository.delete(post);
        searchIndexService.deletePostIndex(postId);

        log.info("게시글 완전 삭제 완료 - PostId: {}", postId);
    }

    // 삭제된 게시글 복구 (관리자용)
    @Transactional
    public PostResponseDto restorePost(Long postId) {
        PostEntity post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다"));

        if (!post.isDeleted()) {
            throw new RuntimeException("삭제되지 않은 게시글입니다.");
        }

        post.setDeleted(false);
        post.setDeletedAt(null);
        post.setDeletedBy(null);

        PostEntity restoredPost = postRepository.save(post);
        searchIndexService.indexPost(restoredPost);

        log.info("게시글 복구 완료 - PostId: {}", postId);
        return convertToResponseDto(restoredPost, post.getUser());
    }
}