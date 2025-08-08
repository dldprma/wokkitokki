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
  originalPost?: Post; // 리포스트인 경우
}

export interface CreatePostData {
  content: string;
  imgUrl?: string;
}

export interface HomeState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

export interface PostResponse {
  content: Post[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  hasNext: boolean;
}
