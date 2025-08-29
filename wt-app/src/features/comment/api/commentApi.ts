import api from "../../../utils/axios";
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentResponse,
  CommentLikeResponse,
  CommentRepostResponse,
  CommentListResponse,
  CommentDetailResponseDto,
} from "../type/commentTypes";

// 댓글 목록 조회 (게시글별)
export const getCommentsByPost = async (
  postId: number,
  page: number = 0,
  size: number = 20
): Promise<CommentListResponse> => {
  const response = await api.get(
    `/api/posts/${postId}/comments?page=${page}&size=${size}`
  );
  return response.data;
};

// 단일 댓글 조회
export const getCommentById = async (
  commentId: number
): Promise<CommentResponse> => {
  const response = await api.get(`/api/comments/${commentId}`);
  return response.data;
};

// 댓글 상세 조회 (대댓글 포함)
export const getCommentDetail = async (
  commentId: number
): Promise<CommentDetailResponseDto> => {
  const response = await api.get(`/api/comments/${commentId}`);
  return response.data;
};

// 댓글 목록 조회 (부모 댓글별 - 대댓글용)
export const getRepliesByComment = async (
  commentId: number,
  page: number = 0,
  size: number = 20
): Promise<CommentListResponse> => {
  const response = await api.get(
    `/api/comments/${commentId}/replies?page=${page}&size=${size}`
  );
  return response.data;
};

// 댓글 작성
export const createComment = async (
  postId: number,
  data: CreateCommentRequest,
  image?: File
): Promise<CommentResponse> => {
  if (image) {
    // 이미지가 있는 경우 FormData로 전송
    const formData = new FormData();
    formData.append("content", data.content);
    if (data.parentCommentId) {
      formData.append("parentCommentId", data.parentCommentId.toString());
    }
    formData.append("image", image);

    const response = await api.post(`/api/posts/${postId}/comments`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } else {
    // 이미지가 없는 경우에도 FormData로 전송 (백엔드 @RequestPart와 맞추기)
    const formData = new FormData();
    formData.append("content", data.content);
    if (data.parentCommentId) {
      formData.append("parentCommentId", data.parentCommentId.toString());
    }

    const response = await api.post(`/api/posts/${postId}/comments`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
};

// 댓글 수정
export const updateComment = async (
  commentId: number,
  data: UpdateCommentRequest
): Promise<CommentResponse> => {
  const response = await api.put(`/api/comments/${commentId}`, data);
  return response.data;
};

// 댓글 삭제
export const deleteComment = async (
  commentId: number
): Promise<{ message: string }> => {
  const response = await api.delete(`/api/comments/${commentId}`);
  return response.data;
};

// 댓글 좋아요 토글
export const toggleCommentLike = async (
  commentId: number
): Promise<CommentLikeResponse> => {
  const response = await api.post(`/api/comments/${commentId}/like`);
  return response.data;
};

// 댓글 리포스트 토글
export const toggleCommentRepost = async (
  commentId: number
): Promise<CommentRepostResponse> => {
  const response = await api.post(`/api/comments/${commentId}/repost`);
  return response.data;
};
