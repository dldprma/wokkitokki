package com.winter.wokkitokki.search.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "trending_keywords")
@Getter @Setter
public class TrendingKeywordEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "keyword", nullable = false, unique = true, length = 255)
    private String keyword;

    @Column(name = "search_count", nullable = false)
    private Integer searchCount = 0;

    @Column(name = "last_searched_at")
    private LocalDateTime lastSearchedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
