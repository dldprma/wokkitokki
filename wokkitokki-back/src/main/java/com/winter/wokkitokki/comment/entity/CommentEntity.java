package com.winter.wokkitokki.comment.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.winter.wokkitokki.post.entity.LikeEntity;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.entity.RepostEntity;
import com.winter.wokkitokki.reels.entity.ReelsEntity;
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
    @JoinColumn(name = "post_id")
    @JsonIgnore
    private PostEntity post;

    // 릴스 참조
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reels_id")
    @JsonIgnore
    private ReelsEntity reels;

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

    // 논리적 삭제 필드들
    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private Long deletedBy;

    // 제약 조건: post 또는 reels 중 하나만 값을 가져야 함
    @PrePersist
    @PreUpdate
    private void validateTarget() {
        if ((post == null && reels == null) || (post != null && reels != null)) {
            throw new IllegalStateException("Comment must target either a post or a reels, but not both");
        }
    }

    // 캐싱된 카운트 필드들 (성능 최적화) - nullable로 처리
    @Column(name = "like_count")
    private Integer likeCount;

    @Column(name = "repost_count")
    private Integer repostCount;

    @Column(name = "reply_count")
    private Integer replyCount;

    // 편의 메서드들 - NULL 값 안전 처리
    public int getLikeCount() {
        return likeCount != null ? likeCount : 0;
    }

    public int getRepostCount() {
        return repostCount != null ? repostCount : 0;
    }

    public int getReplyCount() {
        return replyCount != null ? replyCount : 0;
    }

    public void setLikeCount(int likeCount) {
        this.likeCount = Math.max(0, likeCount);
    }

    public void setRepostCount(int repostCount) {
        this.repostCount = Math.max(0, repostCount);
    }

    public void setReplyCount(int replyCount) {
        this.replyCount = Math.max(0, replyCount);
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

    // 논리적 삭제 편의 메서드들
    public boolean isDeleted() {
        return deleted != null && deleted;
    }

    public void markAsDeleted(Long deletedByUserId) {
        this.deleted = true;
        this.deletedAt = LocalDateTime.now();
        this.deletedBy = deletedByUserId;
    }

    public void restore() {
        this.deleted = false;
        this.deletedAt = null;
        this.deletedBy = null;
    }
}
