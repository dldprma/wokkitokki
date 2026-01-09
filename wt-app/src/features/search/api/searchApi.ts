import api from "../../../utils/axios";
import type {
  SearchRequest,
  SearchResponse,
  SearchSuggestion,
  SearchHistory,
  TrendingKeyword,
  QuickSearchResult,
  SearchStats,
  Page,
  UserSearchResult,
  PostSearchResult,
} from "../types/searchTypes";

// 통합 검색 API (POST /api/search)
export const search = async (
  request: SearchRequest,
  page: number = 0,
  size: number = 10
): Promise<SearchResponse> => {
  const response = await api.post(
    `/api/search?page=${page}&size=${size}`,
    request,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// 사용자 검색 API (GET /api/search/users)
export const searchUsers = async (
  keyword: string,
  page: number = 0,
  size: number = 10
): Promise<Page<UserSearchResult>> => {
  const response = await api.get(
    `/api/search/users?keyword=${encodeURIComponent(
      keyword
    )}&page=${page}&size=${size}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// 포스트 검색 API (GET /api/search/posts)
export const searchPosts = async (
  keyword: string,
  page: number = 0,
  size: number = 10
): Promise<Page<PostSearchResult>> => {
  const response = await api.get(
    `/api/search/posts?keyword=${encodeURIComponent(
      keyword
    )}&page=${page}&size=${size}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// 검색어 자동완성 API (GET /api/search/suggestions)
export const getSearchSuggestions = async (
  keyword: string,
  limit: number = 5
): Promise<SearchSuggestion[]> => {
  const response = await api.get(
    `/api/search/suggestions?keyword=${encodeURIComponent(
      keyword
    )}&limit=${limit}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// 최근 검색어 조회 API (GET /api/search/recent)
export const getSearchHistory = async (): Promise<SearchHistory[]> => {
  const response = await api.get("/api/search/recent", {
    withCredentials: true,
  });
  return response.data;
};

// 검색 히스토리 삭제 API (DELETE /api/search/recent)
export const clearSearchHistory = async (): Promise<void> => {
  await api.delete("/api/search/recent", {
    withCredentials: true,
  });
};

// 인기 검색어 조회 API (GET /api/search/trending)
export const getTrendingKeywords = async (
  limit: number = 10
): Promise<TrendingKeyword[]> => {
  const response = await api.get(`/api/search/trending?limit=${limit}`, {
    withCredentials: true,
  });
  return response.data;
};

// 빠른 검색 API (GET /api/search/quick)
export const quickSearch = async (
  keyword: string
): Promise<QuickSearchResult> => {
  const response = await api.get(
    `/api/search/quick?keyword=${encodeURIComponent(keyword)}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// 검색 통계 API (GET /api/search/stats)
export const getSearchStats = async (): Promise<SearchStats> => {
  const response = await api.get("/api/search/stats", {
    withCredentials: true,
  });
  return response.data;
};
