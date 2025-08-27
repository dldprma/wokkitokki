package com.winter.wokkitokki.search.service;

import com.winter.wokkitokki.post.dto.PostResponseDto;
import com.winter.wokkitokki.post.entity.PostEntity;
import com.winter.wokkitokki.post.repository.LikeRepository;
import com.winter.wokkitokki.post.repository.PostRepository;
import com.winter.wokkitokki.post.repository.RepostRepository;
import com.winter.wokkitokki.search.document.PostDocument;
import com.winter.wokkitokki.search.document.UserDocument;
import com.winter.wokkitokki.search.dto.*;
import com.winter.wokkitokki.search.entity.SearchHistoryEntity;
import com.winter.wokkitokki.search.entity.TrendingKeywordEntity;
import com.winter.wokkitokki.search.repository.PostSearchRepository;
import com.winter.wokkitokki.search.repository.SearchHistoryRepository;
import com.winter.wokkitokki.search.repository.TrendingKeywordRepository;
import com.winter.wokkitokki.search.repository.UserSearchRepository;
import com.winter.wokkitokki.user.dto.UserProfileResponseDto;
import com.winter.wokkitokki.user.entity.UserEntity;
import com.winter.wokkitokki.user.repository.FollowRepository;
import com.winter.wokkitokki.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ElasticsearchSearchService {
    // Elastic Search
    private final UserSearchRepository userSearchRepository;
    private final PostSearchRepository postSearchRepository;

    // JPA (DB)
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final SearchHistoryRepository searchHistoryRepository;
    private final TrendingKeywordRepository trendingKeywordRepository;
    private final LikeRepository likeRepository;
    private final RepostRepository repostRepository;
    private final FollowRepository followRepository;

        // 통합검색 (우선순위 적용)
        public SearchResponseDto search(String keyword, Long currentUserId, Pageable pageable){
            SearchResponseDto response = new SearchResponseDto();
            response.setKeyword(keyword);

            // 우선순위가 적용된 검색 사용
            Pageable limitedPage = PageRequest.of(0, 5);

            Page<UserProfileResponseDto> users = searchUsersWithPriority(keyword, currentUserId, limitedPage);
            Page<PostResponseDto> posts = searchPostsWithPriority(keyword, currentUserId, limitedPage);

            response.setUsers(users);
            response.setPosts(posts);
            response.setTotalResults((int) (users.getTotalElements() + posts.getTotalElements()));

            return response;
        }

        // 사용자 검색 (우선순위 적용)
        public Page<UserProfileResponseDto> searchUsers(String keyword, Long currentUserId, Pageable pageable){
            return searchUsersWithPriority(keyword, currentUserId, pageable);
        }

        // 포스트 검색 (우선순위 적용)
        public Page<PostResponseDto> searchPosts(String keyword, Long currentUserId, Pageable pageable){
            return searchPostsWithPriority(keyword, currentUserId, pageable);
        }

        // 검색어 자동완성 (우선순위 적용)
        public List<SearchSuggestionDto> getSearchSuggestions(String keyword, int limit){
            return getSearchSuggestionsWithPriority(keyword, limit);
        }

        // 우선순위가 적용된 사용자 검색
        public Page<UserProfileResponseDto> searchUsersWithPriority(String keyword, Long currentUserId, Pageable pageable) {
            List<UserDocument> allResults = new ArrayList<>();

            // 1단계: 정확한 username 매칭 (최고 우선순위)
            try {
                List<UserDocument> exactUsers = userSearchRepository.findByUsernameIgnoreCase(keyword);
                allResults.addAll(exactUsers);
            } catch (Exception e) {
                // 메서드가 없으면 기존 방식 사용
            }

            // 2단계: 기존 방식으로 검색 (fallback)
            if (allResults.isEmpty()) {
                Page<UserDocument> userDocs = userSearchRepository.findByUsernameOrFullName(keyword, pageable);
                allResults.addAll(userDocs.getContent());
            }

            // 페이징 처리
            int start = (int) pageable.getOffset();
            int end = Math.min(start + pageable.getPageSize(), allResults.size());

            if (start >= allResults.size()) {
                return new PageImpl<>(new ArrayList<>(), pageable, allResults.size());
            }

            List<UserDocument> pagedResults = allResults.subList(start, end);
            List<UserProfileResponseDto> dtoResults = pagedResults.stream()
                    .map(doc -> convertToUserProfileDto(doc, currentUserId))
                    .collect(Collectors.toList());

            return new PageImpl<>(dtoResults, pageable, allResults.size());
        }

        // 우선순위가 적용된 포스트 검색
        public Page<PostResponseDto> searchPostsWithPriority(String keyword, Long currentUserId, Pageable pageable) {
            // 기존 방식으로 검색하되, 좋아요 많은 순으로 정렬
            Page<PostDocument> postDocs = postSearchRepository.findByContentContainingOrderByCreatedAtDesc(keyword, pageable);

            // 결과를 좋아요 순으로 재정렬
            List<PostDocument> sortedPosts = postDocs.getContent().stream()
                    .sorted((a, b) -> {
                        // 좋아요 수 비교 (내림차순)
                        int likeCompare = Integer.compare(b.getLikeCount(), a.getLikeCount());
                        if (likeCompare != 0) return likeCompare;

                        // 좋아요가 같으면 최신순
                        return b.getCreatedAt().compareTo(a.getCreatedAt());
                    })
                    .collect(Collectors.toList());

            List<PostResponseDto> dtoResults = sortedPosts.stream()
                    .map(doc -> convertToPostDto(doc, currentUserId))
                    .filter(dto->dto != null)
                    .collect(Collectors.toList());

            return new PageImpl<>(dtoResults, pageable, postDocs.getTotalElements());
        }

        // 개선된 자동완성
        public List<SearchSuggestionDto> getSearchSuggestionsWithPriority(String keyword, int limit) {
            List<UserDocument> userDocs = userSearchRepository.findByUsernameOrFullNameStartingWith(keyword);

            return userDocs.stream()
                    .sorted((a, b) -> {
                        // username 정확 매칭 우선
                        boolean aExact = a.getUsername().equalsIgnoreCase(keyword);
                        boolean bExact = b.getUsername().equalsIgnoreCase(keyword);

                        if (aExact && !bExact) return -1;
                        if (!aExact && bExact) return 1;

                        // username 시작 매칭 우선
                        boolean aPrefix = a.getUsername().toLowerCase().startsWith(keyword.toLowerCase());
                        boolean bPrefix = b.getUsername().toLowerCase().startsWith(keyword.toLowerCase());

                        if (aPrefix && !bPrefix) return -1;
                        if (!aPrefix && bPrefix) return 1;

                        // 팔로워 수로 정렬
                        return Integer.compare(b.getFollowersCount(), a.getFollowersCount());
                    })
                    .limit(limit)
                    .map(doc -> new SearchSuggestionDto(
                            doc.getUsername(),
                            "user",
                            doc.getFullName() + " • " + doc.getFollowersCount() + " Followers"
                    ))
                    .collect(Collectors.toList());
        }

        // ========== 기타 검색 관련 메서드들 ==========

        // 최근 검색어 조회
        public List<SearchHistoryDto> getRecentSearches(Long userId){
            List<SearchHistoryEntity> recent = searchHistoryRepository.findTop10ByUserIdOrderBySearchedAtDesc(userId);
            return recent.stream()
                    .map(entity -> new SearchHistoryDto(
                            entity.getId(),
                            entity.getKeyword(),
                            entity.getSearchedAt()
                    ))
                    .distinct()
                    .collect(Collectors.toList());
        }

        // 검색어 히스토리 저장
        @Transactional
        public void saveSearchHistory(Long userId, String keyword){
            if(keyword == null || keyword.trim().isEmpty()){
                return;
            }

            UserEntity user = userRepository.findById(userId).orElse(null);
            if(user == null){
                return;
            }

            // 히스토리 저장
            SearchHistoryEntity history = new SearchHistoryEntity();
            history.setUser(user);
            history.setKeyword(keyword.trim());
            history.setSearchedAt(LocalDateTime.now());
            searchHistoryRepository.save(history);

            // 트렌딩 키워드 업데이트
            updateTrendingKeyword(keyword.trim());
        }

        // 검색 히스토리 삭제
        @Transactional
        public void clearSearchHistory(Long userId){
            searchHistoryRepository.deleteByUserId(userId);
        }

        // 인기검색어
        public List<TrendingKeywordDto> getTrendingKeywords(int limit){
            List<TrendingKeywordEntity> trending = trendingKeywordRepository.findTopByOrderByLastSearchedAtDesc(PageRequest.of(0, limit));
            AtomicInteger rank = new AtomicInteger(1);
            return trending.stream()
                    .map(entity -> new TrendingKeywordDto(
                            entity.getKeyword(),
                            entity.getSearchCount(),
                            rank.getAndIncrement(),
                            entity.getLastSearchedAt(),
                            false
                    ))
                    .collect(Collectors.toList());
        }

        // 검색 통계 조회
        public SearchStatsDto getSearchStats(){
            SearchStatsDto stats = new SearchStatsDto();

            // 전체 검색 수
            stats.setTotalSearches(searchHistoryRepository.count());

            // 가장 많이 검색된 키워드
            List<TrendingKeywordEntity> topKeywords = trendingKeywordRepository.findTopByOrderBySearchCountDesc(PageRequest.of(0,1));
            if(!topKeywords.isEmpty()){
                stats.setMostSearchedKeyword(topKeywords.get(0).getKeyword());
            }
            return stats;
        }

        // 트렌딩 키워드 업데이트
        @Transactional
        protected void updateTrendingKeyword(String keyword){
            TrendingKeywordEntity trending = trendingKeywordRepository.findByKeyword(keyword).orElse(null);

            if(trending == null){
                trending = new TrendingKeywordEntity();
                trending.setKeyword(keyword);
                trending.setSearchCount(1);
                trending.setCreatedAt(LocalDateTime.now());
            }else{
                trending.setSearchCount(trending.getSearchCount() + 1);
            }
            trending.setLastSearchedAt(LocalDateTime.now());
            trendingKeywordRepository.save(trending);
        }

        private UserProfileResponseDto convertToUserProfileDto(UserDocument doc, Long currentUserId){
            UserProfileResponseDto dto = new UserProfileResponseDto();
            dto.setId(Long.parseLong(doc.getId()));
            dto.setUsername(doc.getUsername());
            dto.setFullName(doc.getFullName());
            dto.setProfileImgUrl(doc.getProfileImgUrl());
            dto.setBio(doc.getBio());
            dto.setPostCount(doc.getPostCount());
            dto.setFollowersCount(doc.getFollowersCount());
            dto.setFollowingCount(doc.getFollowingCount());

            // 팔로우 상태는 DB에서 실시간 조회
            if (currentUserId != null && !currentUserId.equals(Long.parseLong(doc.getId()))) {
                UserEntity currentUser = userRepository.findById(currentUserId).orElse(null);
                UserEntity targetUser = userRepository.findById(Long.parseLong(doc.getId())).orElse(null);
                if (currentUser != null && targetUser != null) {
                    boolean isFollowing = followRepository.existsByFollowerAndFollowing(currentUser, targetUser);
                    dto.setFollowing(isFollowing);
                }
            }

            return dto;
        }

        private PostResponseDto convertToPostDto(PostDocument doc, Long currentUserId) {
            PostEntity post = postRepository.findById(Long.parseLong(doc.getId())).orElse(null);
            // 게시글이 없거나 삭제된 경우 null 반환
            if (post == null || post.isDeleted()) {
                return null;
            }
            PostResponseDto dto = new PostResponseDto();
            dto.setId(Long.parseLong(doc.getId()));
            dto.setContent(doc.getContent());
            dto.setImgUrl(doc.getImgUrl());
            dto.setAuthorName(doc.getAuthorFullName());
            dto.setAuthorUsername(doc.getAuthorUsername());
            dto.setAuthorProfileImg(doc.getAuthorProfileImg());
            dto.setLikeCount(doc.getLikeCount());
            dto.setRepostCount(doc.getRepostCount());
            dto.setCreatedAt(doc.getCreatedAt());


            // 좋아요/리포스트 상태는 DB에서 실시간 조회
            if (currentUserId != null) {
                UserEntity currentUser = userRepository.findById(currentUserId).orElse(null);

                if (currentUser != null) {
                    dto.setLiked(likeRepository.existsByUserAndPost(currentUser, post));
                    dto.setReposted(repostRepository.existsByUserAndPost(currentUser, post));

                    boolean isOwner = post.getUser().getId().equals(currentUser.getId());
                    dto.setCanEdit(isOwner);
                    dto.setCanDelete(isOwner);
                }
            } else {
                dto.setLiked(false);
                dto.setReposted(false);
                dto.setCanEdit(false);
                dto.setCanDelete(false);
            }

            return dto;
        }
}
