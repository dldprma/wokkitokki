import React, {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { Reel, VideoProcessingStatus } from "../types/reelsTypes";
import { reelsApi } from "../api/reelsApi";
import Hls from "hls.js";

interface ReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export interface ReelPlayerRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

const ReelPlayer = forwardRef<ReelPlayerRef, ReelPlayerProps>(
  (
    {
      reel,
      isActive,
      onPlay,
      onPause,
      onEnded,
      autoPlay = true,
      muted = true,
      loop = true,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(muted ? 0 : 1);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [playUrl, setPlayUrl] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    useImperativeHandle(ref, () => ({
      play: () => {
        if (videoRef.current) {
          videoRef.current.play();
        }
      },
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      setVolume: (vol: number) => {
        setVolumeState(vol);
        if (videoRef.current) {
          videoRef.current.volume = vol;
          videoRef.current.muted = vol === 0;
        }
      },
      getCurrentTime: () => currentTime,
      getDuration: () => duration,
    }));

    // 비디오 로드 완료
    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration);
        setIsLoading(false);
      }
    };

    // 재생 시작
    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    // 재생 일시정지
    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    // 재생 시간 업데이트
    const handleTimeUpdate = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
    };

    // 재생 종료
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    // 에러 처리
    const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      console.error("비디오 로드 에러:", {
        reelId: reel.id,
        videoUrl: playUrl || reel.hlsPlaylistUrl,
        error: e.currentTarget.error,
        networkState: e.currentTarget.networkState,
        readyState: e.currentTarget.readyState,
      });
      setHasError(true);
      setIsLoading(false);
    };

    // 활성 상태에 따른 자동 재생
    useEffect(() => {
      if (videoRef.current) {
        if (isActive && autoPlay) {
          videoRef.current.play().catch(() => {
            // 자동 재생 실패 시 무음으로 재시도
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {
                setHasError(true);
              });
            }
          });
        } else {
          videoRef.current.pause();
        }
      }
    }, [isActive, autoPlay]);

    // 음소거 상태 변경
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.muted = muted;
        videoRef.current.volume = muted ? 0 : volume;
      }
    }, [muted, volume]);

    // JSON 폴링을 통한 playUrl 가져오기
    useEffect(() => {
      const pollVideoStatus = async () => {
        if (!reel.videoId || isPolling) return;

        setIsPolling(true);
        setIsLoading(true);
        setHasError(false);

        try {
          const status = await reelsApi.pollVideoStatus(
            reel.videoId,
            "dceqn5cujj4m6.cloudfront.net",
            (status: VideoProcessingStatus) => {
              if (status.status === "COMPLETE" && status.playUrl) {
                setPlayUrl(status.playUrl);
                setIsLoading(false);
                setIsPolling(false);
              } else if (status.status === "ERROR") {
                setHasError(true);
                setIsLoading(false);
                setIsPolling(false);
                console.error("❌ 비디오 처리 실패:", status.errorMessage);
              }
            }
          );

          if (status.status === "COMPLETE" && status.playUrl) {
            setPlayUrl(status.playUrl);
            setIsLoading(false);
          }
        } catch (error) {
          console.error("❌ JSON 폴링 실패:", error);
          setHasError(true);
          setIsLoading(false);
        } finally {
          setIsPolling(false);
        }
      };

      // videoId가 있으면 폴링 시작
      if (reel.videoId) {
        pollVideoStatus();
      } else if (reel.hlsPlaylistUrl) {
        // 기존 방식 (videoId가 없는 경우)
        setPlayUrl(reel.hlsPlaylistUrl);
        setIsLoading(false);
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    }, [reel.videoId, reel.hlsPlaylistUrl, isPolling]);

    // HLS 재생 로직
    useEffect(() => {
      if (!playUrl || !videoRef.current) return;

      const video = videoRef.current;

      // HLS.js 지원 확인
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hls.loadSource(playUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("HLS manifest parsed, ready to play");
          setIsLoading(false);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error("HLS error:", data);
          if (data.fatal) {
            setHasError(true);
            setIsLoading(false);
          }
        });

        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari 네이티브 HLS 지원
        video.src = playUrl;
        video.addEventListener("loadedmetadata", () => {
          setIsLoading(false);
        });
        video.addEventListener("error", () => {
          setHasError(true);
          setIsLoading(false);
        });
      } else {
        console.error("HLS is not supported in this browser");
        setHasError(true);
        setIsLoading(false);
      }
    }, [playUrl]);

    // 비디오 URL 변경 시 로딩 상태 리셋
    useEffect(() => {
      setIsLoading(true);
      setHasError(false);
      setCurrentTime(0);
    }, [playUrl]);

    return (
      <div className="reel-player-container">
        {isLoading && (
          <div className="reel-loading">
            <div className="loading-spinner"></div>
            <p>비디오를 불러오는 중...</p>
          </div>
        )}

        {/* JSON 폴링 처리 상태 표시 */}
        {isPolling && (
          <div className="reel-processing">
            <div className="processing-spinner"></div>
            <p>비디오 처리 중...</p>
            <small>잠시만 기다려주세요</small>
          </div>
        )}

        {reel.processingStatus === "PROCESSING" && !isPolling && (
          <div className="reel-processing">
            <div className="processing-spinner"></div>
            <p>비디오 처리 중...</p>
            <small>잠시만 기다려주세요</small>
          </div>
        )}

        {reel.processingStatus === "ERROR" && (
          <div className="reel-error">
            <div className="error-icon">⚠️</div>
            <p>비디오 처리에 실패했습니다</p>
            <small>원본 비디오를 재생합니다</small>
          </div>
        )}

        {hasError && (
          <div className="reel-error">
            <div className="error-icon">⚠️</div>
            <p>비디오를 불러올 수 없습니다</p>
            <small>처리 상태: {reel.processingStatus}</small>
            <button
              className="retry-button"
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          className="reel-video"
          poster={undefined}
          muted={muted}
          loop={loop}
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
          style={{
            opacity: isLoading || hasError ? 0 : 1,
          }}
        />

        {/* 비디오 컨트롤 오버레이 */}
        {!hasError && (
          <div className="reel-overlay">
            {/* 재생/일시정지 버튼 */}
            <button
              className={`play-pause-button ${
                isPlaying ? "playing" : "paused"
              }`}
              onClick={() => {
                if (videoRef.current) {
                  if (isPlaying) {
                    videoRef.current.pause();
                  } else {
                    videoRef.current.play();
                  }
                }
              }}
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>

            {/* 진행률 표시 (선택적) */}
            {duration > 0 && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

ReelPlayer.displayName = "ReelPlayer";

export default ReelPlayer;
