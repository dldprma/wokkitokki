export interface Post {
  id: string;
  username: string;
  content: string;
  images?: string[]; // 이미지 URL 배열
  createdAt: string;
  likes: number;
  comments: number;
  reposts: number;
  isLiked?: boolean;
  isReposted?: boolean;
}

export interface CreatePostData {
  content: string;
  images?: File[]; // 이미지 파일 배열
}

export interface HomeState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

export interface PostResponse {
  posts: Post[];
  hasMore: boolean;
  totalPages: number;
}
