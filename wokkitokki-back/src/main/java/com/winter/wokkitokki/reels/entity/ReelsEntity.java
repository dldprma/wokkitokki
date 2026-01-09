package com.winter.wokkitokki.reels.entity;

import com.winter.wokkitokki.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "reels")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReelsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(length = 1000)
    private String description;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(name = "hls_playlist_url")
    private String hlsPlaylistUrl;

    @Column(name = "video_id")
    private String videoId;

    private int likeCount = 0;
    private int commentCount = 0;
    private int shareCount = 0;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    private LocalDateTime createdAt = LocalDateTime.now();

    public void setLikeCount(int likeCount) {
        this.likeCount = Math.max(0, likeCount);
    }

    public void setCommentCount(int commentCount) {
        this.commentCount = Math.max(0, commentCount);
    }

    public void setShareCount(int shareCount) {
        this.shareCount = Math.max(0, shareCount);
    }
}