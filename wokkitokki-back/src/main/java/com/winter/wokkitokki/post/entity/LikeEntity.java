package com.winter.wokkitokki.post.entity;

import com.winter.wokkitokki.comment.entity.CommentEntity;
import com.winter.wokkitokki.reels.entity.ReelsEntity;
import com.winter.wokkitokki.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "likes", uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "post_id"})})
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class LikeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @ManyToOne
    @JoinColumn(name = "post_id")
    private PostEntity post;

    @ManyToOne
    @JoinColumn(name = "comment_id")
    private CommentEntity comment;

    @ManyToOne
    @JoinColumn(name = "reels_id")
    private ReelsEntity reels;

    // 제약 조건: post, comment, reels 중 하나만 값을 가져야 함
    @PrePersist
    @PreUpdate
    private void validateTarget() {
        int nonNullCount = 0;
        if (post != null) nonNullCount++;
        if (comment != null) nonNullCount++;
        if (reels != null) nonNullCount++;

        if (nonNullCount != 1) {
            throw new IllegalStateException("Like must target exactly one of: post, comment, or reels");
        }
    }
}
