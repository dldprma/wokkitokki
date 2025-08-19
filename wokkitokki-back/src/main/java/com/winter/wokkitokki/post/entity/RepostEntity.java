package com.winter.wokkitokki.post.entity;

import com.winter.wokkitokki.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name="reposts", uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "post_id"})})
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class RepostEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name="user_id")
    private UserEntity user;

    @ManyToOne
    @JoinColumn(name = "post_id")
    private PostEntity post;

    @Column(name = "reposted_at")
    private LocalDateTime repostedAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        repostedAt = LocalDateTime.now();
    }
}
