import api from "../../../utils/axios";
import type { CreatePostData, PostResponse } from "../types/homeTypes";

export const getPosts = async (page: number = 0): Promise<PostResponse> => {
  const response = await api.get(`/api/posts?page=${page}&size=10`);
  return response.data;
};

export const createPost = async (data: CreatePostData): Promise<any> => {
  const response = await api.post("/api/posts", data);
  return response.data;
};

export const likePost = async (postId: string): Promise<any> => {
  const response = await api.post(`/api/posts/${postId}/like`);
  return response.data;
};

export const unlikePost = async (postId: string): Promise<any> => {
  const response = await api.delete(`/api/posts/${postId}/like`);
  return response.data;
};

export const repost = async (postId: string): Promise<any> => {
  const response = await api.post(`/api/posts/${postId}/repost`);
  return response.data;
};

export const unRepost = async (postId: string): Promise<any> => {
  const response = await api.delete(`/api/posts/${postId}/repost`);
  return response.data;
};
