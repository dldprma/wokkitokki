package com.winter.wokkitokki.search.service;

import com.winter.wokkitokki.comment.entity.CommentEntity;
import com.winter.wokkitokki.comment.repository.CommentRepository;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.search.document.CommentDocument;
import com.winter.wokkitokki.search.document.PostDocument;
import com.winter.wokkitokki.search.document.UserDocument;
import com.winter.wokkitokki.search.repository.CommentSearchRepository;
import com.winter.wokkitokki.search.repository.PostSearchRepository;
import com.winter.wokkitokki.search.repository.UserSearchRepository;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.FollowRepository;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SearchIndexService {
    private final UserSearchRepository userSearchRepository;
    private final PostSearchRepository postSearchRepository;
    private final CommentSearchRepository commentSearchRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final FollowRepository followRepository;

    // 사용자 인덱싱(회원가입, 프로필 수정 시 호출)
    public void indexUser(UserEntity user){
        UserDocument doc = new UserDocument();
        doc.setId(user.getId().toString());
        doc.setUsername(user.getUsername());
        doc.setFullName(user.getFullName());
        doc.setBio(user.getBio());
        doc.setProfileImgUrl(user.getProfileImgUrl());
        doc.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);

        // 통계 정보 계산
        doc.setFollowersCount(followRepository.countByFollowing(user));
        doc.setFollowingCount(followRepository.countByFollower(user));
        doc.setPostCount(postRepository.countByUser(user));

        userSearchRepository.save(doc);
    }
    // 포스트 인덱싱 (포스트 작성, 수정 시 호출)
    public void indexPost(PostEntity post) {
        PostDocument doc = new PostDocument();
        doc.setId(post.getId().toString());
        doc.setContent(post.getContent());
        doc.setImgUrl(post.getImgUrl());
        doc.setAuthorId(post.getUser().getId());
        doc.setAuthorUsername(post.getUser().getUsername());
        doc.setAuthorFullName(post.getUser().getFullName());
        doc.setAuthorProfileImg(post.getUser().getProfileImgUrl());
        doc.setLikeCount(post.getLikeCount());
        doc.setRepostCount(post.getRepostCount());
        doc.setCreatedAt(post.getCreatedAt().toString());

        postSearchRepository.save(doc);
    }

    // 사용자 인덱스 삭제 (회원탈퇴 시 호출)
    public void deleteUserIndex(Long userId) {
        userSearchRepository.deleteById(userId.toString());
    }

    // 포스트 인덱스 삭제 (포스트 삭제 시 호출)
    public void deletePostIndex(Long postId) {
        postSearchRepository.deleteById(postId.toString());
    }

    // 전체 사용자 재인덱싱 (초기 설정 또는 마이그레이션 시)
    public void reindexAllUsers() {
        userSearchRepository.deleteAll();

        userRepository.findAll().forEach(this::indexUser);
    }

    // 전체 포스트 재인덱싱 (초기 설정 또는 마이그레이션 시)
    public void reindexAllPosts() {
        postSearchRepository.deleteAll();

        postRepository.findAll().forEach(this::indexPost);
    }

    // 사용자 통계 업데이트 (팔로우/언팔로우 시 호출)
    public void updateUserStats(Long userId) {
        UserEntity user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            indexUser(user); // 기존 인덱스 업데이트
        }
    }

    // 포스트 통계 업데이트 (좋아요/리포스트 시 호출)
    public void updatePostStats(Long postId) {
        PostEntity post = postRepository.findById(postId).orElse(null);
        if (post != null) {
            indexPost(post); // 기존 인덱스 업데이트
        }
    }

    // 댓글 인덱싱 (댓글 작성, 수정 시 호출)
    public void indexComment(CommentEntity comment) {
        CommentDocument doc = new CommentDocument();
        doc.setId(comment.getId().toString());
        doc.setContent(comment.getContent());
        doc.setImageUrl(comment.getImageUrl());
        doc.setAuthorId(comment.getAuthor().getId());
        doc.setAuthorUsername(comment.getAuthor().getUsername());
        doc.setAuthorFullName(comment.getAuthor().getFullName());
        doc.setAuthorProfileImg(comment.getAuthor().getProfileImgUrl());
        doc.setPostId(comment.getPost().getId());
        doc.setParentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null);
        doc.setLikeCount(comment.getLikeCount());
        doc.setRepostCount(comment.getRepostCount());
        doc.setReplyCount(comment.getReplyCount());
        doc.setCreatedAt(comment.getCreatedAt().toString());
        doc.setUpdatedAt(comment.getUpdatedAt() != null ? comment.getUpdatedAt().toString() : null);

        commentSearchRepository.save(doc);
    }

    // 댓글 인덱스 삭제 (댓글 삭제 시 호출)
    public void deleteCommentIndex(Long commentId) {
        commentSearchRepository.deleteById(commentId.toString());
    }

    // 댓글 통계 업데이트 (좋아요/리포스트 시 호출)
    public void updateCommentStats(Long commentId) {
        CommentEntity comment = commentRepository.findById(commentId).orElse(null);
        if (comment != null) {
            indexComment(comment); // 기존 인덱스 업데이트
        }
    }

    // 전체 댓글 재인덱싱 (초기 설정 또는 마이그레이션 시)
    public void reindexAllComments() {
        commentSearchRepository.deleteAll();
        commentRepository.findAll().forEach(this::indexComment);
    }
}
