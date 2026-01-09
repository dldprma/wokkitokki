import React from "react";
import type { SearchHistory as SearchHistoryType } from "../types/searchTypes";

interface SearchHistoryProps {
  history: SearchHistoryType[];
  onSelect: (query: string) => void;
  onRemove?: (id: number) => void;
  onClearAll?: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelect,
  onRemove,
  onClearAll,
}) => {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "방금 전";
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else {
      return date.toLocaleDateString("ko-KR");
    }
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-100">
      <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          최근 검색어
        </h3>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-red-500 hover:text-red-700 transition-colors"
            title="전체 삭제"
          >
            전체 삭제
          </button>
        )}
      </div>
      <div className="py-2">
        {history.slice(0, 5).map((item) => (
          <div
            key={`search-history-${item.id}`}
            className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <button
              onClick={() => onSelect(item.keyword)}
              className="flex-1 text-left text-sm text-gray-700 focus:outline-none"
            >
              <div className="flex items-center justify-between">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="truncate">{item.keyword}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>{formatDate(item.searchedAt)}</span>
                </div>
              </div>
            </button>
            {onRemove && (
              <button
                onClick={() => onRemove(item.id)}
                className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="삭제"
              >
                <svg
                  className="h-4 w-4"
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
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;
