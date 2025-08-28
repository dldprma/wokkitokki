package com.winter.wokkitokki.comment.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.winter.wokkitokki.post.entity.LikeEntity;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.entity.RepostEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "comments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    // 작성자 정보
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private UserEntity author;

    // 게시글 참조
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    @JsonIgnore
    private PostEntity post;

    // 이미지첨부
    @Column(name = "image_url")
    private String imageUrl;

    // 부모 댓글 (대댓글용)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private CommentEntity parentComment;

    // 자식 댓글들 (대댓글들)
    @OneToMany(mappedBy = "parentComment", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @Builder.Default
    private List<CommentEntity> replies = new ArrayList<>();

    // 좋아요 (기존 LikeEntity 재사용)
    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @Builder.Default
    private List<LikeEntity> likes = new ArrayList<>();

    // 리포스트 (기존 RepostEntity 재사용)
    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @Builder.Default
    private List<RepostEntity> reposts = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 편의 메서드들
    public int getLikeCount() {
        return likes != null ? likes.size() : 0;
    }

    public int getRepostCount() {
        return reposts != null ? reposts.size() : 0;
    }

    public int getReplyCount() {
        return replies != null ? replies.size() : 0;
    }

    // 좋아요 여부 확인
    public boolean isLikedBy(UserEntity user) {
        if (likes == null || user == null) return false;
        return likes.stream().anyMatch(like -> like.getUser().equals(user));
    }

    // 리포스트 여부 확인
    public boolean isRepostedBy(UserEntity user) {
        if (reposts == null || user == null) return false;
        return reposts.stream().anyMatch(repost -> repost.getUser().equals(user));
    }
}
