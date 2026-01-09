import React, { useEffect, useRef, useState } from "react";
import {
  HlsPlayer,
  hlsUtils,
  type HlsPlayerOptions,
} from "../../../utils/hlsPlayer";

interface HlsVideoPlayerProps {
  playUrl: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export const HlsVideoPlayer: React.FC<HlsVideoPlayerProps> = ({
  playUrl,
  poster,
  autoplay = false,
  muted = true,
  loop = false,
  controls = true,
  className = "",
  onLoadStart,
  onCanPlay,
  onPlay,
  onPause,
  onEnded,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HlsPlayer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // HLS 지원 여부 확인
  const isHlsSupported = hlsUtils.isSupported();
  const isNativeHlsSupported = hlsUtils.isNativeHlsSupported();

  // 플레이어 초기화
  useEffect(() => {
    if (videoRef.current && !isInitialized) {
      playerRef.current = hlsUtils.createPlayer(videoRef.current, {
        autoplay,
        muted,
        loop,
        controls,
        onLoadStart: () => {
          setIsLoading(true);
          setHasError(false);
          setErrorMessage(null);
          onLoadStart?.();
        },
        onCanPlay: () => {
          setIsLoading(false);
          onCanPlay?.();
        },
        onPlay: () => {
          onPlay?.();
        },
        onPause: () => {
          onPause?.();
        },
        onEnded: () => {
          onEnded?.();
        },
        onError: (error) => {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(error.message);
          onError?.(error);
        },
      });
      setIsInitialized(true);
    }
  }, [
    isInitialized,
    autoplay,
    muted,
    loop,
    controls,
    onLoadStart,
    onCanPlay,
    onPlay,
    onPause,
    onEnded,
    onError,
  ]);

  // 스트림 로드
  useEffect(() => {
    if (isInitialized && playUrl && playerRef.current) {
      playerRef.current.loadStream(playUrl).catch((error) => {
        console.error("스트림 로드 실패:", error);
        setHasError(true);
        setErrorMessage(error.message);
        onError?.(error);
      });
    }
  }, [isInitialized, playUrl, onError]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // HLS 지원하지 않는 경우
  if (!isHlsSupported && !isNativeHlsSupported) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
      >
        <div className="text-center p-8">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            비디오 재생 불가
          </h3>
          <p className="text-sm text-gray-600">
            이 브라우저는 HLS 비디오를 지원하지 않습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
    >
      {/* 비디오 엘리먼트 */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        webkit-playsinline="true"
        className="w-full h-full object-cover"
        style={{ aspectRatio: "9/16" }}
      />

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
            <p className="text-white text-sm">로딩 중...</p>
          </div>
        </div>
      )}

      {/* 에러 오버레이 */}
      {hasError && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto mb-4">
              <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
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
            <h3 className="text-lg font-semibold text-white mb-2">재생 오류</h3>
            <p className="text-sm text-gray-300 mb-4">
              {errorMessage || "비디오를 재생할 수 없습니다."}
            </p>
            <button
              onClick={() => {
                if (playUrl && playerRef.current) {
                  playerRef.current.loadStream(playUrl).catch(console.error);
                }
              }}
              className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 디버그 정보 (개발 모드에서만) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>HLS: {isNativeHlsSupported ? "Native" : "hls.js"}</div>
          <div>URL: {playUrl.substring(0, 30)}...</div>
        </div>
      )}
    </div>
  );
};
