package com.winter.wokkitokki.search.repository;

import com.winter.wokkitokki.search.entity.SearchHistoryEntity;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SearchHistoryRepository extends JpaRepository<SearchHistoryEntity, Long> {
    // 사용자별 최근 검색어 조회 (최대 10개, 최신순)
    List<SearchHistoryEntity> findTop10ByUserIdOrderBySearchedAtDesc(Long userId);

    // 사용자별 검색 히스토리 삭제
    @Modifying
    @Query("DELETE FROM SearchHistoryEntity s WHERE s.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    // 특정 기간 이전 검색 히스토리 정리 (선택사항)
//    @Modifying
//    @Query("DELETE FROM SearchHistoryEntity s WHERE s.searchedAt < :cutoffDate")
//    void deleteOldSearchHistory(@Param("cutoffDate") java.time.LocalDateTime cutoffDate);
}
