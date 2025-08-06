package com.winter.wokkitokki.post.service;

import com.winter.wokkitokki.post.dto.PostDto;
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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {
    private final PostRepository postRepository;
    private final LikeRepository likeRepository;
    private final RepostRepository repostRepository;
    private final UserRepository userRepository;

    // 홈 피드
    public Page<PostDto> getFeedPost(Pageable pageable, String currentUsername){
        UserEntity currentUser = userRepository.findByUsername(currentUsername).orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));
        Page<PostEntity> posts = postRepository.findFeedPosts(currentUser.getId(), pageable);
        return posts.map(post -> convertToDto(post, currentUser));
    }

    // 특정 사용자 포스트(프로필)
    public Page<PostDto> getUserPosts(String username, Pageable pageable, String currentUsername){
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(()->new RuntimeException("사용자를 찾을 수 없습니다."));

        Page<PostEntity> posts = postRepository.findByUserOrderByCreatedAtDesc(user, pageable);

        UserEntity currentUser = null;
        if(currentUsername != null){
            currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        }
        return posts.map(post->convertToDto(post, currentUser));
    }

    // 좋아요
    public boolean toggleLike(Long postId, String username){
        UserEntity user = userRepository.findByUsername(username)
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
    public boolean toggleRepost(Long postId, String username){
        UserEntity user = userRepository.findByUsername(username)
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
    private PostDto convertToDto(PostEntity post, UserEntity currentUser){
        PostDto dto = new PostDto();
        dto.setId(post.getId());
        dto.setContent(post.getContent());
        dto.setImgUrl(post.getImgUrl());
        dto.setAuthorName(post.getUser().getFullName());
        dto.setAuthorUsername(post.getUser().getUsername());
        dto.setAuthorProfileImg(post.getUser().getProfileImgUrl());
        dto.setLikeCount(post.getLikeCount());
        dto.setRepostCount(post.getRepostCount());
        dto.setCreatedAt(post.getCreatedAt().toString());

        if(currentUser != null){
            dto.setLiked(likeRepository.existsByUserAndPost(currentUser, post));
            dto.setReposted(repostRepository.existsByUserAndPost(currentUser, post));
        }
        return dto;
    }
}
