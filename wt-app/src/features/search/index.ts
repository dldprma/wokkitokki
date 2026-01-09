// Components
export { default as SearchBar } from "./components/SearchBar";
export { default as SearchSuggestions } from "./components/SearchSuggestions";
export { default as SearchHistory } from "./components/SearchHistory";
export { default as TrendingSearches } from "./components/TrendingSearches";

// Hooks
export { useSearch } from "./hooks/useSearch";

// Types
export type {
  SearchRequest,
  SearchResponse,
  UserSearchResult,
  PostSearchResult,
  SearchSuggestion,
  TrendingKeyword,
  QuickSearchResult,
  SearchStats,
} from "./types/searchTypes";

// Store
export { default as searchReducer } from "./store/searchSlice";
export {
  performSearch,
  performUserSearch,
  performPostSearch,
  performQuickSearch,
  fetchSearchSuggestions,
  fetchSearchHistory,
  fetchTrendingKeywords,
  setKeyword,
  setSearchType,
  setSortBy,
  clearResults,
  clearQuickSearchResults,
  clearError,
  nextPage,
  removeFromHistory,
} from "./store/searchSlice";
