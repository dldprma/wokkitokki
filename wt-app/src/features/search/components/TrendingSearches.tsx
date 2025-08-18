import React from "react";
import type { TrendingKeyword } from "../types/searchTypes";

interface TrendingSearchesProps {
  trending: TrendingKeyword[];
  onSelect: (keyword: string) => void;
}

const TrendingSearches: React.FC<TrendingSearchesProps> = ({
  trending,
  onSelect,
}) => {
  const getTrendIcon = (isRising: boolean) => {
    if (isRising) {
      return (
        <svg
          className="h-4 w-4 text-green-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L12 7z"
            clipRule="evenodd"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="h-4 w-4 text-gray-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
  };

  const getTrendColor = (isRising: boolean) => {
    return isRising ? "text-green-600" : "text-gray-600";
  };

  return (
    <div className="border-b border-gray-100">
      <div className="px-4 py-2 bg-gray-50">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          인기 검색어
        </h3>
      </div>
      <div className="py-2">
        {trending.slice(0, 5).map((item, index) => (
          <button
            key={item.keyword}
            onClick={() => onSelect(item.keyword)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`font-medium ${getTrendColor(item.isRising)}`}>
                  #{item.rank}
                </span>
                <span className="truncate">{item.keyword}</span>
                {getTrendIcon(item.isRising)}
              </div>
              <div className="text-xs text-gray-400">
                {item.searchCount.toLocaleString()}회
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TrendingSearches;
