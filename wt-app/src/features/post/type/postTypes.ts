export interface Post {
  id: number;
  content: string;
  authorName: string;
  authorUsername: string;
  authorProfileImg?: string;
  imgUrl?: string;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  liked: boolean; // 백엔드에서 받는 필드명
  reposted: boolean; // 백엔드에서 받는 필드명
  isRepost: boolean;
  repostedBy?: string | null;
  repostedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: any[]; // 댓글 배열 (백엔드에서 받을 예정)
}

export interface PostImage {
  id: number;
  imageUrl: string;
  postId: number;
}

export interface CreatePostRequest {
  content: string;
  images?: File[];
}

export interface UpdatePostRequest {
  content: string;
  images?: File[];
}

export interface PostResponse {
  id: number;
  content: string;
  authorName: string;
  authorUsername: string;
  authorProfileImg?: string;
  imgUrl?: string;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  liked: boolean; // 백엔드에서 받는 필드명
  reposted: boolean; // 백엔드에서 받는 필드명
  isRepost: boolean;
  repostedBy?: string | null;
  repostedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LikeResponse {
  message: string;
  isLiked: boolean; // 백엔드에서 실제로 보내는 필드명
  likeCount: number;
}

export interface RepostResponse {
  message: string;
  isReposted: boolean; // 백엔드에서 실제로 보내는 필드명
  repostCount: number;
}

// 댓글이 포함된 게시글 DTO
// Comment 타입 import
import type { Comment } from "../../comment/type/commentTypes";

export interface PostWithCommentsDto {
  post: Post;
  relevantComments: Comment[];
  feedType: string;
  lastActivityAt: string;
  activitySummary: string;
}

// 홈 상태
export interface HomeState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}
