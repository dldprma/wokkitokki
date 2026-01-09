// 릴스 비디오 타입 (백엔드 ReelsResponseDto 기반)
export interface Reel {
  id: number;
  title: string;
  description: string;
  userId: number;
  username: string;
  hlsPlaylistUrl: string;
  videoId: string; // CloudFront videoId (JSON 폴링용) - 백엔드에서 필수로 제공
  playUrl?: string; // 실제 재생 URL (JSON 폴링 결과)
  processingStatus?: "PENDING" | "PROCESSING" | "COMPLETE" | "ERROR"; // 처리 상태
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
}

// 릴스 목록 조회 응답 (Spring Page 기반)
export interface GetReelsResponse {
  content: Reel[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  empty: boolean;
}

// 릴스 업로드 요청 (백엔드 ReelsUploadRequestDto 기반)
export interface ReelsUploadRequest {
  originalFilename: string;
  contentType: string;
  title?: string;
  description?: string;
}

// 릴스 업로드 응답 (백엔드 ReelsUploadResponseDto 기반)
export interface ReelsUploadResponse {
  presignedUrl: string;
  reelsId: number;
  videoId: string;
  s3ObjectKey: string;
  expiresIn: number;
  message: string;
}

// 릴스 수정 요청 (백엔드 ReelsUpdateRequestDto 기반)
export interface ReelsUpdateRequest {
  title?: string;
  description?: string;
}

// 릴스 공유 요청 (백엔드 ShareReelsRequestDto 기반)
export interface ShareReelsRequest {
  targetUserIds: number[];
}

// CloudFront 상태 폴링 관련 타입들
export interface VideoProcessingStatus {
  status: "PENDING" | "PROCESSING" | "COMPLETE" | "ERROR";
  playUrl?: string;
  errorMessage?: string;
  progress?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface VideoUploadState {
  isUploading: boolean;
  isProcessing: boolean;
  uploadProgress: UploadProgress;
  processingStatus: VideoProcessingStatus | null;
  error: string | null;
}

// HLS 재생 관련 타입들
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
