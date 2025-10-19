import Hls from "hls.js";

export interface HlsPlayerOptions {
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export class HlsPlayer {
  private videoElement: HTMLVideoElement;
  private hls: Hls | null = null;
  private options: HlsPlayerOptions;

  constructor(videoElement: HTMLVideoElement, options: HlsPlayerOptions = {}) {
    this.videoElement = videoElement;
    this.options = {
      autoplay: false,
      muted: true,
      loop: false,
      controls: true,
      ...options,
    };
  }

  // HLS 지원 여부 확인
  static isSupported(): boolean {
    return Hls.isSupported();
  }

  // 네이티브 HLS 지원 여부 확인 (Safari)
  static isNativeHlsSupported(): boolean {
    const video = document.createElement("video");
    return video.canPlayType("application/vnd.apple.mpegurl") !== "";
  }

  // HLS 스트림 로드 및 재생
  async loadStream(playUrl: string): Promise<void> {
    console.log("🎬 HLS 스트림 로드 시작:", playUrl);

    try {
      // 기존 HLS 인스턴스 정리
      this.destroy();

      // 네이티브 HLS 지원 (Safari)
      if (HlsPlayer.isNativeHlsSupported()) {
        console.log("🍎 Safari 네이티브 HLS 사용");
        this.videoElement.src = playUrl;
        this.setupNativeEventListeners();
        return;
      }

      // hls.js 사용 (Chrome, Firefox 등)
      if (Hls.isSupported()) {
        console.log("🌐 hls.js 사용");
        this.hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        this.setupHlsEventListeners();
        this.hls.loadSource(playUrl);
        this.hls.attachMedia(this.videoElement);
        return;
      }

      throw new Error("HLS를 지원하지 않는 브라우저입니다.");
    } catch (error) {
      console.error("❌ HLS 스트림 로드 실패:", error);
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  // 네이티브 HLS 이벤트 리스너 설정
  private setupNativeEventListeners(): void {
    this.videoElement.addEventListener("loadstart", () => {
      console.log("📡 네이티브 HLS 로드 시작");
      this.options.onLoadStart?.();
    });

    this.videoElement.addEventListener("canplay", () => {
      console.log("▶️ 네이티브 HLS 재생 준비 완료");
      this.options.onCanPlay?.();
    });

    this.videoElement.addEventListener("play", () => {
      console.log("▶️ 네이티브 HLS 재생 시작");
      this.options.onPlay?.();
    });

    this.videoElement.addEventListener("pause", () => {
      console.log("⏸️ 네이티브 HLS 일시정지");
      this.options.onPause?.();
    });

    this.videoElement.addEventListener("ended", () => {
      console.log("🏁 네이티브 HLS 재생 완료");
      this.options.onEnded?.();
    });

    this.videoElement.addEventListener("error", (event) => {
      console.error("❌ 네이티브 HLS 에러:", event);
      this.options.onError?.(new Error("네이티브 HLS 재생 에러"));
    });
  }

  // hls.js 이벤트 리스너 설정
  private setupHlsEventListeners(): void {
    if (!this.hls) return;

    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log("📋 HLS 매니페스트 파싱 완료");
      this.options.onLoadStart?.();
    });

    this.hls.on(Hls.Events.LEVEL_LOADED, () => {
      console.log("📊 HLS 레벨 로드 완료");
      this.options.onCanPlay?.();
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
      console.error("❌ HLS 에러:", data);

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error("네트워크 에러:", data);
            this.options.onError?.(new Error("네트워크 에러가 발생했습니다."));
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error("미디어 에러:", data);
            this.hls?.recoverMediaError();
            break;
          default:
            console.error("치명적 에러:", data);
            this.options.onError?.(
              new Error("비디오 재생 중 치명적 에러가 발생했습니다.")
            );
            break;
        }
      }
    });

    // 비디오 이벤트 리스너
    this.videoElement.addEventListener("play", () => {
      console.log("▶️ HLS 재생 시작");
      this.options.onPlay?.();
    });

    this.videoElement.addEventListener("pause", () => {
      console.log("⏸️ HLS 일시정지");
      this.options.onPause?.();
    });

    this.videoElement.addEventListener("ended", () => {
      console.log("🏁 HLS 재생 완료");
      this.options.onEnded?.();
    });
  }

  // 재생 시작
  async play(): Promise<void> {
    try {
      await this.videoElement.play();
    } catch (error) {
      console.error("❌ 재생 실패:", error);
      throw error;
    }
  }

  // 일시정지
  pause(): void {
    this.videoElement.pause();
  }

  // 정지
  stop(): void {
    this.videoElement.pause();
    this.videoElement.currentTime = 0;
  }

  // 볼륨 설정
  setVolume(volume: number): void {
    this.videoElement.volume = Math.max(0, Math.min(1, volume));
  }

  // 음소거 설정
  setMuted(muted: boolean): void {
    this.videoElement.muted = muted;
  }

  // 현재 시간 설정
  setCurrentTime(time: number): void {
    this.videoElement.currentTime = time;
  }

  // 현재 시간 가져오기
  getCurrentTime(): number {
    return this.videoElement.currentTime;
  }

  // 총 재생 시간 가져오기
  getDuration(): number {
    return this.videoElement.duration || 0;
  }

  // 재생 상태 확인
  isPlaying(): boolean {
    return !this.videoElement.paused && !this.videoElement.ended;
  }

  // 일시정지 상태 확인
  isPaused(): boolean {
    return this.videoElement.paused;
  }

  // 리소스 정리
  destroy(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    this.videoElement.src = "";
    this.videoElement.load();
  }
}

// 편의 함수들
export const hlsUtils = {
  // HLS 지원 여부 확인
  isSupported: HlsPlayer.isSupported,
  isNativeHlsSupported: HlsPlayer.isNativeHlsSupported,

  // 비디오 엘리먼트에 HLS 플레이어 생성
  createPlayer: (
    videoElement: HTMLVideoElement,
    options?: HlsPlayerOptions
  ) => {
    return new HlsPlayer(videoElement, options);
  },

  // 자동 재생 가능 여부 확인 (브라우저 정책)
  canAutoplay: async (): Promise<boolean> => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;

    try {
      await video.play();
      video.pause();
      return true;
    } catch {
      return false;
    }
  },
};
