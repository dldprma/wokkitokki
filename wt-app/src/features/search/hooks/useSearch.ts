import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  performSearch,
  performUserSearch,
  performPostSearch,
  fetchSearchSuggestions,
  fetchSearchHistory,
  fetchTrendingKeywords,
  performQuickSearch,
  setKeyword,
  setSearchType,
  setSortBy,
  clearResults,
  clearQuickSearchResults,
  clearError,
  nextPage,
  removeFromHistory,
} from "../store/searchSlice";
import * as searchApi from "../api/searchApi";
import type { SearchRequest } from "../types/searchTypes";

export const useSearch = () => {
  const dispatch = useAppDispatch();
  const searchState = useAppSelector((state) => state.search);

  // 디바운스된 검색을 위한 상태
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [debounceTimeout, setDebounceTimeout] = useState<number | null>(null);

  // 통합 검색
  const search = useCallback(
    async (request: SearchRequest, page: number = 0, size: number = 20) => {
      return await dispatch(performSearch({ request, page, size }));
    },
    [dispatch]
  );

  // 사용자 검색
  const searchUsers = useCallback(
    async (keyword: string, page: number = 0, size: number = 20) => {
      return await dispatch(performUserSearch({ keyword, page, size }));
    },
    [dispatch]
  );

  // 포스트 검색
  const searchPosts = useCallback(
    async (keyword: string, page: number = 0, size: number = 20) => {
      return await dispatch(performPostSearch({ keyword, page, size }));
    },
    [dispatch]
  );

  // 검색어 제안
  const getSuggestions = useCallback(
    async (keyword: string) => {
      if (keyword.trim().length > 0) {
        return await dispatch(fetchSearchSuggestions(keyword));
      }
    },
    [dispatch]
  );

  // 검색 히스토리 조회
  const getHistory = useCallback(async () => {
    return await dispatch(fetchSearchHistory());
  }, [dispatch]);

  // 검색 히스토리 전체 삭제
  const clearHistory = useCallback(async () => {
    try {
      await searchApi.clearSearchHistory();
      // 삭제 후 히스토리 새로고침
      dispatch(fetchSearchHistory());
    } catch (error) {
      console.error("검색 히스토리 삭제 실패:", error);
    }
  }, [dispatch]);

  // 인기 검색어 조회
  const getTrending = useCallback(
    async (limit: number = 10) => {
      return await dispatch(fetchTrendingKeywords(limit));
    },
    [dispatch]
  );

  // 빠른 검색
  const quickSearch = useCallback(
    async (keyword: string) => {
      if (keyword.trim().length > 0) {
        return await dispatch(performQuickSearch(keyword));
      }
    },
    [dispatch]
  );

  // 디바운스된 빠른 검색
  const debouncedQuickSearch = useCallback(
    (keyword: string) => {
      // 기존 타이머 제거
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      // 새 타이머 설정 (300ms 후 실행)
      const timeout = setTimeout(() => {
        setDebouncedKeyword(keyword);
        if (keyword.trim().length > 0) {
          dispatch(performQuickSearch(keyword));
        } else {
          dispatch(clearQuickSearchResults());
        }
      }, 300);

      setDebounceTimeout(timeout);
    },
    [dispatch, debounceTimeout]
  );

  // 검색어 설정
  const updateKeyword = useCallback(
    (keyword: string) => {
      dispatch(setKeyword(keyword));
      debouncedQuickSearch(keyword);
    },
    [dispatch, debouncedQuickSearch]
  );

  // 검색 타입 설정
  const updateSearchType = useCallback(
    (type: string) => {
      dispatch(setSearchType(type));
    },
    [dispatch]
  );

  // 정렬 방식 설정
  const updateSortBy = useCallback(
    (sortBy: string) => {
      dispatch(setSortBy(sortBy));
    },
    [dispatch]
  );

  // 검색 결과 초기화
  const clearSearchResults = useCallback(() => {
    dispatch(clearResults());
  }, [dispatch]);

  // 빠른 검색 결과 초기화
  const clearQuickResults = useCallback(() => {
    dispatch(clearQuickSearchResults());
  }, [dispatch]);

  // 에러 초기화
  const clearSearchError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // 다음 페이지 로드
  const loadNextPage = useCallback(() => {
    dispatch(nextPage());
  }, [dispatch]);

  // 검색 히스토리에서 항목 제거
  const removeHistoryItem = useCallback(
    (historyId: number) => {
      dispatch(removeFromHistory(historyId));
    },
    [dispatch]
  );

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return {
    // 상태
    ...searchState,

    // 액션
    search,
    searchUsers,
    searchPosts,
    getSuggestions,
    getHistory,
    clearHistory,
    getTrending,
    quickSearch,
    debouncedQuickSearch,

    // 상태 업데이트
    updateKeyword,
    updateSearchType,
    updateSortBy,

    // 정리
    clearSearchResults,
    clearQuickResults,
    clearSearchError,

    // 페이지네이션
    loadNextPage,

    // 히스토리 관리
    removeHistoryItem,
  };
};
