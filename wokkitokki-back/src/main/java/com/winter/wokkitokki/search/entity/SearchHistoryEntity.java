package com.winter.wokkitokki.search.entity;

import com.winter.wokkitokki.user.entity.UserEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "search_history")
@Getter @Setter
public class SearchHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "keyword", nullable = false, length = 255)
    private String keyword;

    @CreatedDate
    @Column(name = "searched_at", nullable = false)
    private LocalDateTime searchedAt;
}
