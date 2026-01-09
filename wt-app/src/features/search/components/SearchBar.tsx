import React, { useState, useRef, useEffect } from "react";
import { useSearch } from "../hooks/useSearch";
import SearchSuggestions from "./SearchSuggestions";
import SearchHistory from "./SearchHistory";
import TrendingSearches from "./TrendingSearches";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  showSuggestions?: boolean;
  showHistory?: boolean;
  showTrending?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "검색어를 입력하세요.",
  className = "",
  onSearch,
  showSuggestions = true,
  showHistory = true,
  showTrending = true,
}) => {
  const {
    currentKeyword,
    updateKeyword,
    suggestions,
    suggestionsLoading,
    searchHistory,
    trendingKeywords,
    getHistory,
    getTrending,
    clearQuickResults,
    removeHistoryItem,
    clearHistory,
  } = useSearch();

  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 검색 히스토리와 인기 검색어 로드
  useEffect(() => {
    if (showHistory) {
      getHistory();
    }
    if (showTrending) {
      getTrending();
    }
  }, [showHistory, showTrending, getHistory, getTrending]);

  // 검색어 변경 처리
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    updateKeyword(keyword);

    if (onSearch) {
      onSearch(keyword);
    }
  };

  // 검색 실행
  const handleSearch = (keyword: string) => {
    updateKeyword(keyword);
    setShowDropdown(false);
    setIsFocused(false);

    if (onSearch) {
      onSearch(keyword);
    }
  };

  // Enter 키 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(currentKeyword);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  // 포커스 처리
  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
  };

  // 포커스 해제 처리
  const handleBlur = () => {
    // 약간의 지연을 두어 드롭다운 클릭이 가능하도록 함
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      clearQuickResults();
    }, 200);
  };

  // 검색어 클리어
  const handleClear = () => {
    updateKeyword("");
    setShowDropdown(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* 검색 입력 필드 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={currentKeyword}
          onChange={handleKeywordChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 pr-12 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />

        {/* 검색 아이콘 */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 검색어 클리어 버튼 */}
        {currentKeyword && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg
              className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 드롭다운 메뉴 */}
      {showDropdown && isFocused && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {/* 검색어 제안 */}
          {currentKeyword && (
            <SearchSuggestions
              suggestions={suggestions}
              loading={suggestionsLoading}
              keyword={currentKeyword}
              onSelect={handleSearch}
            />
          )}

          {/* 검색 히스토리 */}
          {!currentKeyword && showHistory && searchHistory.length > 0 && (
            <SearchHistory
              history={searchHistory}
              onSelect={handleSearch}
              onRemove={removeHistoryItem}
              onClearAll={clearHistory}
            />
          )}

          {/* 인기 검색어 */}
          {!currentKeyword && showTrending && trendingKeywords.length > 0 && (
            <TrendingSearches
              trending={trendingKeywords}
              onSelect={handleSearch}
            />
          )}

          {/* 검색어가 없고 히스토리나 인기 검색어도 없는 경우 */}
          {!currentKeyword &&
            (!showHistory || searchHistory.length === 0) &&
            (!showTrending || trendingKeywords.length === 0) && (
              <div className="p-4 text-center text-gray-500">
                검색어를 입력하거나 검색 히스토리를 확인해보세요
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
