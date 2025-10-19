import React, { useState, useRef } from "react";
import { reelsApi } from "../api/reelsApi";

interface SimpleReelsUploadProps {
  onUploadSuccess?: (result: { reelsId: number; message: string }) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

export const SimpleReelsUpload: React.FC<SimpleReelsUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  className = "",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await reelsApi.uploadReels(
        selectedFile,
        "릴스 제목", // 실제로는 사용자 입력 받아야 함
        "릴스 설명" // 실제로는 사용자 입력 받아야 함
      );

      onUploadSuccess?.(result);

      // 성공 후 초기화
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("업로드 실패:", error);
      onUploadError?.(error as Error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleNewFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            릴스 업로드
          </h3>

          {/* 파일 선택 */}
          <div className="mb-4">
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
                  <p className="text-sm text-gray-600">비디오 파일 선택</p>
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
              disabled={isUploading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isUploading ? "업로드 중..." : "업로드 시작"}
            </button>
          )}

          {/* 업로드 진행률 */}
          {isUploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                업로드 중... {uploadProgress}%
              </p>
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="mt-4 text-xs text-gray-500">
            <p>• 최대 파일 크기: 100MB</p>
            <p>• 지원 형식: MP4, MOV, AVI, MKV</p>
            <p>• 업로드 후 자동으로 HLS로 변환됩니다</p>
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
