import api from "../../../utils/axios";
import type { CreatePostData, PostResponse } from "../types/homeTypes";

// 피드 게시글 조회
export const getFeedPosts = async (
  page: number = 0,
  size: number = 10
): Promise<PostResponse> => {
  const response = await api.get(`/api/posts/feed?page=${page}&size=${size}`);
  return response.data;
};

// 게시글 작성
export const createPost = async (data: CreatePostData): Promise<any> => {
  const response = await api.post("/api/posts", data);
  return response.data;
};

// 좋아요 토글
export const toggleLike = async (
  postId: number
): Promise<{ message: string; isLiked: boolean }> => {
  const response = await api.post(`/api/posts/${postId}/like`);
  return response.data;
};

// 리포스트 토글
export const toggleRepost = async (
  postId: number
): Promise<{ message: string; isReposted: boolean }> => {
  const response = await api.post(`/api/posts/${postId}/repost`);
  return response.data;
};
