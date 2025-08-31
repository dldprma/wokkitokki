export interface Comment {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  authorUsername: string;
  authorProfileImg?: string; // 백엔드와 일치
  imageUrl?: string; // 댓글 이미지 URL
  postId: number;
  parentCommentId?: number | null;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  liked: boolean;
  reposted: boolean;
  repostedBy?: string | null;
  repostedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  hasMoreReplies?: boolean;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: number | null;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentResponse {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  authorUsername: string;
  authorProfileImg?: string; // 백엔드와 일치
  imageUrl?: string; // 댓글 이미지 URL
  postId: number;
  parentCommentId?: number | null;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  liked: boolean;
  reposted: boolean;
  repostedBy?: string | null;
  repostedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  hasMoreReplies?: boolean;
}

export interface CommentLikeResponse {
  message: string;
  liked: boolean;
  likeCount: number;
}

export interface CommentRepostResponse {
  message: string;
  reposted: boolean;
  repostCount: number;
}

export interface CommentListResponse {
  content: Comment[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  hasNext: boolean;
}

export interface CommentDetailResponseDto {
  comment: CommentResponse;
  replies: CommentResponse[];
  hasReplies: boolean;
  replyCount: number;
  message?: string;
}

export interface CommentState {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}
