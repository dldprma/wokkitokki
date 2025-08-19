// 백엔드 DTO와 일치하는 타입 정의

// 검색 요청 타입 (SearchRequestDto)
export interface SearchRequest {
  keyword: string;
  type?: string;
  sortBy?: string;
  page?: number;
  size?: number;
}

// 페이지 타입 정의
export interface Page<T> {
  content: T[];
  hasNext: boolean;
  hasPrevious: boolean;
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
}

// 검색 응답 타입 (SearchResponseDto)
export interface SearchResponse {
  keyword: string;
  totalResults: number;
  users: Page<UserSearchResult>;
  posts: Page<PostSearchResult>;
}

// 사용자 검색 결과 타입 (UserProfileResponseDto)
export interface UserSearchResult {
  id: number;
  username: string;
  fullName: string;
  email: string;
  profileImgUrl?: string;
  bio?: string;
  postCount: number;
  imagePostCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

// 포스트 검색 결과 타입 (PostResponseDto)
export interface PostSearchResult {
  id: number;
  content: string;
  imgUrl?: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
  authorName: string;
  authorUsername: string;
  authorProfileImg?: string;
  canEdit: boolean;
  canDelete: boolean;
  originalPost?: PostSearchResult;
}

// 검색어 제안 타입 (SearchSuggestionDto)
export interface SearchSuggestion {
  text: string;
  type: string;
  description: string;
}

// 인기 검색어 타입 (TrendingKeywordDto)
export interface TrendingKeyword {
  keyword: string;
  searchCount: number;
  rank: number;
  lastSearchedAt: string;
  isRising: boolean;
}

// 검색 히스토리 타입 (SearchHistoryDto)
export interface SearchHistory {
  id: number;
  keyword: string;
  searchedAt: string;
}

// 빠른 검색 결과 타입 (quickSearch 응답)
export interface QuickSearchResult {
  keyword: string;
  users: UserSearchResult[];
  posts: PostSearchResult[];
  hasMoreUsers: boolean;
  hasMorePosts: boolean;
}

// 검색 통계 타입 (SearchStatsDto)
export interface SearchStats {
  totalSearches: number;
  uniqueUsers: number;
  popularKeywords: string[];
  searchTrends: {
    date: string;
    count: number;
  }[];
}
