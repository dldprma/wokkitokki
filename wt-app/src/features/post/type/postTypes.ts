// 기본 포스트 인터페이스
export interface Post {
  id: number;
  content: string;
  imgUrl?: string;
  authorName: string;
  authorUsername: string;
  authorProfileImg?: string;
  likeCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
  createdAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
  isDeleted?: boolean; // 삭제 상태
  originalPost?: Post; // 리포스트인 경우
}

// 포스트 생성/수정 데이터
export interface CreatePostData {
  content?: string; // content를 선택적으로 변경
  imgUrl?: File | string;
}

export interface UpdatePostData {
  content: string;
  imgUrl?: File | string;
}

// 포스트 응답 (페이지네이션 포함)
export interface PostResponse {
  content: Post[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
  hasNext?: boolean;
}

// 홈 상태 (기존 homeTypes에서 통합)
export interface HomeState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

// 이미지 업로드 응답
export interface ImageUploadResponse {
  imageUrl: string;
  message: string;
}

// 좋아요 응답
export interface LikeResponse {
  isLiked: boolean;
  likeCount: number;
  message: string;
}

// 리포스트 응답
export interface RepostResponse {
  isReposted: boolean;
  repostCount: number;
  message: string;
}

// 프로필 포스트 응답 (기존 userTypes에서 통합)
export interface ProfilePostsResponse {
  content: Post[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// 프로필 사진 응답
export interface ProfilePhotosResponse {
  content: PostImage[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// 프로필 릴스 응답
export interface ProfileReelsResponse {
  content: Post[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// 포스트 이미지 (프로필 사진 탭용)
export interface PostImage {
  id: number;
  imgUrl: string;
  createdAt: string;
}

// 페이지 응답 제네릭 타입
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
