import React, { useState } from "react";
import type { SearchFilters as SearchFiltersType } from "../types/searchTypes";

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [localFilters, setLocalFilters] = useState<SearchFiltersType>(filters);

  const handleFilterChange = (key: keyof SearchFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleResetFilters = () => {
    const resetFilters: SearchFiltersType = {};
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const handleDateChange = (field: "from" | "to", value: string) => {
    const newDateRange = { ...localFilters.dateRange, [field]: value };
    handleFilterChange("dateRange", newDateRange);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">고급 필터</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            필터 초기화
          </button>
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            필터 적용
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 날짜 범위 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            날짜 범위
          </label>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">시작일</label>
              <input
                type="date"
                value={localFilters.dateRange?.from || ""}
                onChange={(e) => handleDateChange("from", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">종료일</label>
              <input
                type="date"
                value={localFilters.dateRange?.to || ""}
                onChange={(e) => handleDateChange("to", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 콘텐츠 타입 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            콘텐츠 타입
          </label>
          <select
            value={localFilters.contentType || ""}
            onChange={(e) =>
              handleFilterChange("contentType", e.target.value || undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">전체</option>
            <option value="text">텍스트만</option>
            <option value="image">이미지 포함</option>
            <option value="video">동영상 포함</option>
          </select>
        </div>

        {/* 사용자 타입 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            사용자 타입
          </label>
          <select
            value={localFilters.userType || ""}
            onChange={(e) =>
              handleFilterChange("userType", e.target.value || undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">전체</option>
            <option value="verified">인증된 사용자</option>
            <option value="all">모든 사용자</option>
          </select>
        </div>

        {/* 언어 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            언어
          </label>
          <select
            value={localFilters.language || ""}
            onChange={(e) =>
              handleFilterChange("language", e.target.value || undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">전체</option>
            <option value="ko">한국어</option>
            <option value="en">영어</option>
            <option value="ja">일본어</option>
            <option value="zh">중국어</option>
          </select>
        </div>
      </div>

      {/* 활성 필터 표시 */}
      {Object.keys(localFilters).some(
        (key) =>
          localFilters[key as keyof SearchFiltersType] !== undefined &&
          localFilters[key as keyof SearchFiltersType] !== null &&
          (typeof localFilters[key as keyof SearchFiltersType] !== "object" ||
            Object.keys(localFilters[key as keyof SearchFiltersType] as any)
              .length > 0)
      ) && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">활성 필터:</h4>
          <div className="flex flex-wrap gap-2">
            {localFilters.dateRange?.from && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                시작일: {localFilters.dateRange.from}
                <button
                  onClick={() => handleDateChange("from", "")}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {localFilters.dateRange?.to && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                종료일: {localFilters.dateRange.to}
                <button
                  onClick={() => handleDateChange("to", "")}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {localFilters.contentType && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                콘텐츠:{" "}
                {localFilters.contentType === "text"
                  ? "텍스트"
                  : localFilters.contentType === "image"
                  ? "이미지"
                  : "동영상"}
                <button
                  onClick={() => handleFilterChange("contentType", undefined)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            {localFilters.userType && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                사용자:{" "}
                {localFilters.userType === "verified"
                  ? "인증된 사용자"
                  : "모든 사용자"}
                <button
                  onClick={() => handleFilterChange("userType", undefined)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
            {localFilters.language && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                언어:{" "}
                {localFilters.language === "ko"
                  ? "한국어"
                  : localFilters.language === "en"
                  ? "영어"
                  : localFilters.language === "ja"
                  ? "일본어"
                  : "중국어"}
                <button
                  onClick={() => handleFilterChange("language", undefined)}
                  className="ml-2 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
