import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  SearchRequest,
  SearchResponse,
  SearchSuggestion,
  SearchHistory,
  TrendingKeyword,
  QuickSearchResult,
  UserSearchResult,
  PostSearchResult,
} from "../types/searchTypes";
import * as searchApi from "../api/searchApi";

// 검색 상태 인터페이스
interface SearchState {
  // 검색 결과
  searchResponse: SearchResponse | null;
  users: UserSearchResult[];
  posts: PostSearchResult[];
  totalResults: number;
  page: number;
  size: number;
  hasMore: boolean;

  // 검색 상태
  loading: boolean;
  error: string | null;

  // 검색어
  currentKeyword: string;
  searchType: string;
  sortBy: string;

  // 검색 제안
  suggestions: SearchSuggestion[];
  suggestionsLoading: boolean;

  // 검색 히스토리
  searchHistory: SearchHistory[];

  // 인기 검색어
  trendingKeywords: TrendingKeyword[];

  // 빠른 검색 결과
  quickSearchResult: QuickSearchResult | null;
}

// 초기 상태
const initialState: SearchState = {
  searchResponse: null,
  users: [],
  posts: [],
  totalResults: 0,
  page: 0,
  size: 20,
  hasMore: false,
  loading: false,
  error: null,
  currentKeyword: "",
  searchType: "all",
  sortBy: "relevance",
  suggestions: [],
  suggestionsLoading: false,
  searchHistory: [],
  trendingKeywords: [],
  quickSearchResult: null,
};

// 통합 검색 액션
export const performSearch = createAsyncThunk(
  "search/performSearch",
  async (
    {
      request,
      page,
      size,
    }: { request: SearchRequest; page: number; size: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await searchApi.search(request, page, size);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "검색에 실패했습니다."
      );
    }
  }
);

// 사용자 검색 액션
export const performUserSearch = createAsyncThunk(
  "search/performUserSearch",
  async (
    { keyword, page, size }: { keyword: string; page: number; size: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await searchApi.searchUsers(keyword, page, size);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "사용자 검색에 실패했습니다."
      );
    }
  }
);

// 포스트 검색 액션
export const performPostSearch = createAsyncThunk(
  "search/performPostSearch",
  async (
    { keyword, page, size }: { keyword: string; page: number; size: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await searchApi.searchPosts(keyword, page, size);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "포스트 검색에 실패했습니다."
      );
    }
  }
);

// 검색어 제안 액션
export const fetchSearchSuggestions = createAsyncThunk(
  "search/fetchSuggestions",
  async (keyword: string, { rejectWithValue }) => {
    try {
      const suggestions = await searchApi.getSearchSuggestions(keyword);
      return suggestions;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "검색어 제안을 가져오는데 실패했습니다."
      );
    }
  }
);

// 검색 히스토리 액션
export const fetchSearchHistory = createAsyncThunk(
  "search/fetchHistory",
  async (_, { rejectWithValue }) => {
    try {
      const history = await searchApi.getSearchHistory();
      return history;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "검색 히스토리를 가져오는데 실패했습니다."
      );
    }
  }
);

// 인기 검색어 액션
export const fetchTrendingKeywords = createAsyncThunk(
  "search/fetchTrending",
  async (limit: number, { rejectWithValue }) => {
    try {
      const trending = await searchApi.getTrendingKeywords(limit);
      return trending;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ||
          "인기 검색어를 가져오는데 실패했습니다."
      );
    }
  }
);

// 빠른 검색 액션
export const performQuickSearch = createAsyncThunk(
  "search/quickSearch",
  async (keyword: string, { rejectWithValue }) => {
    try {
      const response = await searchApi.quickSearch(keyword);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "빠른 검색에 실패했습니다."
      );
    }
  }
);

// 검색 slice
const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    // 검색어 설정
    setKeyword: (state, action: PayloadAction<string>) => {
      state.currentKeyword = action.payload;
    },

    // 검색 타입 설정
    setSearchType: (state, action: PayloadAction<string>) => {
      state.searchType = action.payload;
    },

    // 정렬 방식 설정
    setSortBy: (state, action: PayloadAction<string>) => {
      state.sortBy = action.payload;
    },

    // 검색 결과 초기화
    clearResults: (state) => {
      state.searchResponse = null;
      state.users = [];
      state.posts = [];
      state.totalResults = 0;
      state.page = 0;
      state.hasMore = false;
    },

    // 빠른 검색 결과 초기화
    clearQuickSearchResults: (state) => {
      state.quickSearchResult = null;
    },

    // 에러 초기화
    clearError: (state) => {
      state.error = null;
    },

    // 페이지 증가
    nextPage: (state) => {
      state.page += 1;
    },

    // 검색 히스토리에서 항목 제거
    removeFromHistory: (state, action: PayloadAction<number>) => {
      state.searchHistory = state.searchHistory.filter(
        (item) => item.id !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    // 통합 검색
    builder
      .addCase(performSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(performSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResponse = action.payload;
        // 백엔드 응답에서 Page 구조로 users와 posts를 받아옴
        state.users = action.payload.users?.content || [];
        state.posts = action.payload.posts?.content || [];
        state.totalResults = action.payload.totalResults;
        state.currentKeyword = action.payload.keyword;
        // hasMore는 users 또는 posts 중 하나라도 다음 페이지가 있으면 true
        state.hasMore =
          action.payload.users?.hasNext ||
          action.payload.posts?.hasNext ||
          false;
      })
      .addCase(performSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 사용자 검색
      .addCase(performUserSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(performUserSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.content || [];
        state.hasMore = action.payload.hasNext || false;
      })
      .addCase(performUserSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 포스트 검색
      .addCase(performPostSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(performPostSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.content || [];
        state.hasMore = action.payload.hasNext || false;
      })
      .addCase(performPostSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 검색어 제안
      .addCase(fetchSearchSuggestions.pending, (state) => {
        state.suggestionsLoading = true;
      })
      .addCase(fetchSearchSuggestions.fulfilled, (state, action) => {
        state.suggestionsLoading = false;
        state.suggestions = action.payload;
      })
      .addCase(fetchSearchSuggestions.rejected, (state) => {
        state.suggestionsLoading = false;
        state.suggestions = [];
      })

      // 검색 히스토리
      .addCase(fetchSearchHistory.fulfilled, (state, action) => {
        state.searchHistory = action.payload;
      })

      // 인기 검색어
      .addCase(fetchTrendingKeywords.fulfilled, (state, action) => {
        state.trendingKeywords = action.payload;
      })

      // 빠른 검색
      .addCase(performQuickSearch.fulfilled, (state, action) => {
        state.quickSearchResult = action.payload;
      });
  },
});

export const {
  setKeyword,
  setSearchType,
  setSortBy,
  clearResults,
  clearQuickSearchResults,
  clearError,
  nextPage,
  removeFromHistory,
} = searchSlice.actions;

export default searchSlice.reducer;
