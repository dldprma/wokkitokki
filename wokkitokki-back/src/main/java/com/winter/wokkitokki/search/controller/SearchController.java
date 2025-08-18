package com.winter.wokkitokki.search.controller;

import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.search.dto.*;
import com.winter.wokkitokki.search.service.ElasticsearchSearchService;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import com.winter.wokkitokki.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {
    private final ElasticsearchSearchService searchService;
    private final UserService userService;

    // 통합 검색 (사용자 + 포스트)
    @PostMapping
    public ResponseEntity<SearchResponseDto> search(
            @RequestBody SearchRequestDto requestDto,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Long currentUserId = auth != null ? userService.getUserIdByUsername(auth.getName()) : null;

            SearchResponseDto result = searchService.search(requestDto.getKeyword(), currentUserId, pageable);

            // 검색어 히스토리 저장
            if (currentUserId != null) {
                searchService.saveSearchHistory(currentUserId, requestDto.getKeyword());
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 사용자 검색
    @GetMapping("/users")
    public ResponseEntity<Page<UserProfileResponseDto>> searchUsers(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Long currentUserId = auth != null ? userService.getUserIdByUsername(auth.getName()) : null;

            Page<UserProfileResponseDto> users = searchService.searchUsers(keyword, currentUserId, pageable);

            // 검색어 히스토리 저장
            if (currentUserId != null) {
                searchService.saveSearchHistory(currentUserId, keyword);
            }

            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 포스트 내용 검색
    @GetMapping("/posts")
    public ResponseEntity<Page<PostResponseDto>> searchPosts(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Long currentUserId = auth != null ? userService.getUserIdByUsername(auth.getName()) : null;

            Page<PostResponseDto> posts = searchService.searchPosts(keyword, currentUserId, pageable);

            // 검색어 히스토리 저장
            if (currentUserId != null) {
                searchService.saveSearchHistory(currentUserId, keyword);
            }

            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 검색어 자동완성 (향상된 버전)
    @GetMapping("/suggestions")
    public ResponseEntity<List<SearchSuggestionDto>> getSearchSuggestions(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "5") int limit) {
        try {
            List<SearchSuggestionDto> suggestions = searchService.getSearchSuggestions(keyword, limit);
            return ResponseEntity.ok(suggestions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 최근 검색어 (DTO 버전)
    @GetMapping("/recent")
    public ResponseEntity<List<SearchHistoryDto>> getRecentSearches(Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            List<SearchHistoryDto> recent = searchService.getRecentSearches(userId);
            return ResponseEntity.ok(recent);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 검색 히스토리 삭제
    @DeleteMapping("/recent")
    public ResponseEntity<Map<String, String>> clearRecentSearches(Authentication auth) {
        try {
            Long userId = userService.getUserIdByUsername(auth.getName());
            searchService.clearSearchHistory(userId);
            return ResponseEntity.ok(Map.of("message", "최근 검색어가 삭제되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 인기 검색어 (DTO 버전)
    @GetMapping("/trending")
    public ResponseEntity<List<TrendingKeywordDto>> getTrendingKeywords(
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<TrendingKeywordDto> trending = searchService.getTrendingKeywords(limit);
            return ResponseEntity.ok(trending);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 검색 통계 (관리자용 - 선택사항)
    @GetMapping("/stats")
    public ResponseEntity<SearchStatsDto> getSearchStats(Authentication auth) {
        try {
            // 관리자 권한 체크 로직 추가 가능
            SearchStatsDto stats = searchService.getSearchStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 빠른 검색 (간단한 키워드 검색)
    @GetMapping("/quick")
    public ResponseEntity<Map<String, Object>> quickSearch(
            @RequestParam String keyword,
            Authentication auth) {
        try {
            Long currentUserId = auth != null ? userService.getUserIdByUsername(auth.getName()) : null;

            // 각각 3개씩만 가져오기
            Pageable limitedPage = PageRequest.of(0, 3);

            Page<UserProfileResponseDto> users = searchService.searchUsers(keyword, currentUserId, limitedPage);
            Page<PostResponseDto> posts = searchService.searchPosts(keyword, currentUserId, limitedPage);

            Map<String, Object> result = Map.of(
                    "keyword", keyword,
                    "users", users.getContent(),
                    "posts", posts.getContent(),
                    "hasMoreUsers", users.hasNext(),
                    "hasMorePosts", posts.hasNext()
            );

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
