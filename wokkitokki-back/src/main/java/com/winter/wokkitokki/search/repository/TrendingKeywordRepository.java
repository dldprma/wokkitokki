package com.winter.wokkitokki.search.repository;

import com.winter.wokkitokki.search.entity.TrendingKeywordEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrendingKeywordRepository extends JpaRepository<TrendingKeywordEntity, Long> {
    // 키워드로 찾기
    Optional<TrendingKeywordEntity> findByKeyword(String keyword);

    // 검색 횟수 순으로 인기 키워드 조회
    @Query("SELECT t FROM TrendingKeywordEntity t ORDER BY t.searchCount DESC")
    List<TrendingKeywordEntity> findTopByOrderBySearchCountDesc(Pageable pageable);

    // 최근 검색된 순으로 트렌딩 키워드 조회 (선택사항)
    @Query("SELECT t FROM TrendingKeywordEntity t ORDER BY t.lastSearchedAt DESC")
    List<TrendingKeywordEntity> findTopByOrderByLastSearchedAtDesc(Pageable pageable);
}
