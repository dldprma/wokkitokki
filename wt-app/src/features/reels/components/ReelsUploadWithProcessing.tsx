import React, { useState, useRef } from "react";
import { reelsApi } from "../api/reelsApi";
import { VideoUploadProgress } from "./VideoUploadProgress";
import { HlsVideoPlayer } from "./HlsVideoPlayer";
import type {
  VideoUploadState,
  UploadProgress,
  VideoProcessingStatus,
} from "../types/reelsTypes";

interface ReelsUploadWithProcessingProps {
  cfDomain: string;
  onUploadSuccess?: (result: {
    reelsId: number;
    playUrl: string;
    message: string;
  }) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

export const ReelsUploadWithProcessing: React.FC<
  ReelsUploadWithProcessingProps
> = ({ cfDomain, onUploadSuccess, onUploadError, className = "" }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<VideoUploadState>({
    isUploading: false,
    isProcessing: false,
    uploadProgress: { loaded: 0, total: 0, percentage: 0 },
    processingStatus: null,
    error: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 타입 검증
      if (!file.type.startsWith("video/")) {
        alert("비디오 파일만 업로드할 수 있습니다.");
        return;
      }

      // 파일 크기 검증 (100MB 제한)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        alert("파일 크기는 100MB를 초과할 수 없습니다.");
        return;
      }

      setSelectedFile(file);
      resetUpload();
    }
  };

  // 업로드 시작
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState({
      isUploading: true,
      isProcessing: false,
      uploadProgress: { loaded: 0, total: 0, percentage: 0 },
      processingStatus: null,
      error: null,
    });

    try {
      const result = await reelsApi.uploadReelsWithProcessing(
        selectedFile,
        cfDomain,
        "릴스 제목", // 실제로는 사용자 입력 받아야 함
        "릴스 설명", // 실제로는 사용자 입력 받아야 함
        // 업로드 진행률 콜백
        (progress: UploadProgress) => {
          setUploadState((prev) => ({
            ...prev,
            uploadProgress: progress,
          }));
        },
        // 처리 상태 업데이트 콜백
        (status: VideoProcessingStatus) => {
          setUploadState((prev) => ({
            ...prev,
            isUploading: false,
            isProcessing:
              status.status !== "COMPLETE" && status.status !== "ERROR",
            processingStatus: status,
          }));
        }
      );

      // 성공 상태로 업데이트
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        isProcessing: false,
        processingStatus: { status: "COMPLETE", playUrl: result.playUrl },
        error: null,
      }));

      setPlayUrl(result.playUrl);
      onUploadSuccess?.(result);
    } catch (error) {
      console.error("업로드 실패:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "업로드 중 오류가 발생했습니다.";

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        isProcessing: false,
        error: errorMessage,
      }));

      onUploadError?.(error as Error);
    }
  };

  // 재시도
  const handleRetry = async () => {
    if (!selectedFile) return;
    await handleUpload();
  };

  // 업로드 취소
  const handleCancel = () => {
    setUploadState((prev) => ({
      ...prev,
      isUploading: false,
      isProcessing: false,
      error: "업로드가 취소되었습니다.",
    }));
  };

  // 새 파일 선택
  const handleNewFile = () => {
    setSelectedFile(null);
    setPlayUrl(null);
    resetUpload();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 상태 초기화
  const resetUpload = () => {
    setUploadState({
      isUploading: false,
      isProcessing: false,
      uploadProgress: { loaded: 0, total: 0, percentage: 0 },
      processingStatus: null,
      error: null,
    });
  };

  // 업로드 중이거나 처리 중인 경우
  if (uploadState.isUploading || uploadState.isProcessing) {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <VideoUploadProgress
          uploadState={uploadState}
          onCancel={uploadState.isUploading ? handleCancel : undefined}
        />
      </div>
    );
  }

  // 에러 상태
  if (uploadState.error) {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <VideoUploadProgress uploadState={uploadState} onRetry={handleRetry} />
      </div>
    );
  }

  // 재생 가능한 상태
  if (playUrl) {
    return (
      <div className={`max-w-md mx-auto ${className}`}>
        <div className="space-y-4">
          {/* 비디오 플레이어 */}
          <HlsVideoPlayer
            playUrl={playUrl}
            autoplay={false}
            muted={true}
            loop={false}
            controls={true}
            className="w-full"
          />

          {/* 새 파일 선택 버튼 */}
          <button
            onClick={handleNewFile}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            새 비디오 업로드
          </button>
        </div>
      </div>
    );
  }

  // 파일 선택 화면
  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white rounded-lg p-8 shadow-lg">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4">
              <div className="rounded-full h-20 w-20 bg-blue-100 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 8h6m-6 4h6m-6 4h6"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              릴스 업로드
            </h3>
            <p className="text-sm text-gray-600">
              MP4, MOV, AVI 등 비디오 파일을 선택하세요
            </p>
          </div>

          {/* 파일 선택 */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!selectedFile ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <svg
                    className="w-8 h-8 text-gray-400 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm text-gray-600">파일 선택</p>
                </div>
              </button>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleNewFile}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-5 h-5"
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
                </div>
              </div>
            )}
          </div>

          {/* 업로드 버튼 */}
          {selectedFile && (
            <button
              onClick={handleUpload}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              업로드 시작
            </button>
          )}

          {/* 안내 메시지 */}
          <div className="mt-6 text-xs text-gray-500">
            <p>• 최대 파일 크기: 100MB</p>
            <p>• 지원 형식: MP4, MOV, AVI, MKV</p>
            <p>• 업로드 후 자동으로 HLS로 변환됩니다</p>
            <p>• CloudFront: {cfDomain}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 파일 크기 포맷팅 유틸리티
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
