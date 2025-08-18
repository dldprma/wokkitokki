import React from "react";

interface SearchSuggestionsProps {
  suggestions: any[];
  loading: boolean;
  keyword: string;
  onSelect: (suggestion: string) => void;
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  loading,
  keyword,
  onSelect,
}) => {
  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm text-gray-500">
            검색어 제안을 불러오는 중...
          </span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        "{keyword}"에 대한 검색어 제안이 없습니다
      </div>
    );
  }

  return (
    <div className="border-b border-gray-100">
      <div className="px-4 py-2 bg-gray-50">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          검색어 제안
        </h3>
      </div>
      <div className="py-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
          >
            <div className="flex items-center space-x-2">
              <svg
                className="h-4 w-4 text-gray-400"
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
              <span>{suggestion}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchSuggestions;
