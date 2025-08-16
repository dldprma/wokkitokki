package com.winter.wokkitokki.post.entity;

import com.winter.wokkitokki.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class PostEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String content;

    private String imgUrl;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private UserEntity user;

    private int likeCount = 0;
    private int repostCount = 0;

    @ManyToOne
    @JoinColumn(name = "original_post_id")
    private PostEntity originalPost;

    private LocalDateTime createdAt = LocalDateTime.now();

    public void setLikeCount(int likeCount){
        this.likeCount = Math.max(0, likeCount);
    }

    public void setRepostCount(int repostCount){
        this.repostCount = Math.max(0, repostCount);
    }
}
