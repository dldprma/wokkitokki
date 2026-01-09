import React from "react";
import type { VideoUploadState } from "../types/reelsTypes";

interface VideoUploadProgressProps {
  uploadState: VideoUploadState;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const VideoUploadProgress: React.FC<VideoUploadProgressProps> = ({
  uploadState,
  onRetry,
  onCancel,
  className = "",
}) => {
  const { isUploading, isProcessing, uploadProgress, processingStatus, error } =
    uploadState;

  // 업로드 중
  if (isUploading) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-lg ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              비디오 업로드 중...
            </h3>
            <p className="text-sm text-gray-600">
              {uploadProgress.percentage}% 완료
            </p>
          </div>

          {/* 진행률 바 */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress.percentage}%` }}
            ></div>
          </div>

          {/* 파일 크기 정보 */}
          <div className="text-xs text-gray-500">
            {formatBytes(uploadProgress.loaded)} /{" "}
            {formatBytes(uploadProgress.total)}
          </div>

          {/* 취소 버튼 */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              업로드 취소
            </button>
          )}
        </div>
      </div>
    );
  }

  // 처리 중
  if (isProcessing) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-lg ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="animate-pulse rounded-full h-16 w-16 bg-blue-100"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              비디오 처리 중...
            </h3>
            <p className="text-sm text-gray-600">
              {processingStatus?.status === "PENDING" && "처리 대기 중..."}
              {processingStatus?.status === "PROCESSING" && "인코딩 중..."}
            </p>
          </div>

          {/* 처리 진행률 (있는 경우) */}
          {processingStatus?.progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${processingStatus.progress}%` }}
              ></div>
            </div>
          )}

          {/* 처리 상태 표시 */}
          <div className="text-xs text-gray-500">
            잠시만 기다려주세요. 처리 완료까지 1-2분 소요될 수 있습니다.
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-lg ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="rounded-full h-16 w-16 bg-red-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
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
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              업로드 실패
            </h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
          </div>

          {/* 재시도 버튼 */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              다시 시도
            </button>
          )}
        </div>
      </div>
    );
  }

  // 완료 상태
  if (processingStatus?.status === "COMPLETE") {
    return (
      <div className={`bg-white rounded-lg p-6 shadow-lg ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="rounded-full h-16 w-16 bg-green-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              업로드 완료!
            </h3>
            <p className="text-sm text-gray-600">
              비디오가 성공적으로 업로드되었습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// 파일 크기 포맷팅 유틸리티
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
