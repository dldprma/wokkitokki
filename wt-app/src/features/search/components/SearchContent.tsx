import React, { useState, useEffect } from "react";
import { useSearch } from "../hooks/useSearch";
import SearchBar from "./SearchBar";
import SearchResults from "./SearchResults";

const SearchContent: React.FC = () => {
  const {
    currentKeyword,
    searchType,
    sortBy,
    searchResponse,
    users,
    posts,
    loading,
    error,
    hasMore,
    updateSearchType,
    updateSortBy,
    search,
    clearSearchResults,
    clearSearchError,
    loadNextPage,
  } = useSearch();

  // 검색 실행
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) return;

    clearSearchResults();

    const request = {
      keyword: keyword.trim(),
      type: searchType,
      page: 0,
      size: 20,
      sortBy,
    };

    try {
      await search(request);
    } catch (error) {
      console.error("검색 실패:", error);
    }
  };

  // 검색 타입 변경 시 검색 재실행
  const handleSearchTypeChange = (type: "all" | "post" | "user") => {
    updateSearchType(type);

    if (currentKeyword.trim()) {
      const request = {
        keyword: currentKeyword.trim(),
        type,
        page: 0,
        size: 20,
        sortBy,
      };

      clearSearchResults();
      search(request);
    }
  };

  // 정렬 방식 변경 시 검색 재실행
  const handleSortByChange = (sort: "relevance" | "date" | "popularity") => {
    updateSortBy(sort);

    if (currentKeyword.trim()) {
      const request = {
        keyword: currentKeyword.trim(),
        type: searchType,
        page: 0,
        size: 20,
        sortBy: sort,
      };

      clearSearchResults();
      search(request);
    }
  };

  // 더 보기 로드
  const handleLoadMore = () => {
    if (currentKeyword.trim() && hasMore && !loading) {
      loadNextPage();
      const request = {
        keyword: currentKeyword.trim(),
        type: searchType,
        page: Math.ceil((users.length + posts.length) / 20),
        size: 20,
        sortBy,
      };
      search(request);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* 검색 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">검색</h1>
          <SearchBar
            placeholder="게시글, 사용자를 검색해보세요..."
            className="max-w-2xl"
            onSearch={handleSearch}
          />
        </div>

        {/* 검색 결과가 있는 경우에만 필터와 결과 표시 */}
        {currentKeyword && (
          <>
            {/* 검색 옵션 */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* 검색 타입 선택 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    검색 범위:
                  </span>
                  <div className="flex space-x-1">
                    {(["all", "post", "user"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => handleSearchTypeChange(type)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          searchType === type
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {type === "all" && "전체"}
                        {type === "post" && "게시글"}
                        {type === "user" && "사용자"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 정렬 방식 선택 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    정렬:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortByChange(e.target.value as any)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="relevance">관련도순</option>
                    <option value="date">최신순</option>
                    <option value="popularity">인기순</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 검색 결과 */}
            <SearchResults
              users={users}
              posts={posts}
              loading={loading}
              error={error}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />
          </>
        )}

        {/* 검색어가 없는 경우 안내 메시지 */}
        {!currentKeyword && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-16 w-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              검색을 시작해보세요
            </h3>
            <p className="text-gray-500">
              게시글, 사용자를 검색하여 원하는 내용을 찾아보세요
            </p>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={clearSearchError}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              에러 메시지 닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchContent;
