import api from "../../../utils/axios";
import type {
  CreatePostData,
  UpdatePostData,
  Post,
  PostResponse,
  ProfilePostsResponse,
  ProfilePhotosResponse,
  ProfileReelsResponse,
  LikeResponse,
  RepostResponse,
  ImageUploadResponse,
} from "../type/postTypes";

// 피드 게시글 조회 (Post + Comment 혼합)
export const getFeedPosts = async (
  page: number = 0,
  size: number = 10
): Promise<any> => {
  try {
    const response = await api.get(`/api/posts/feed?page=${page}&size=${size}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 게시글 상세 조회
export const getPostDetail = async (postId: string): Promise<Post> => {
  try {
    const response = await api.get(`/api/posts/${postId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 게시글 작성
export const createPost = async (data: CreatePostData): Promise<any> => {
  const formData = new FormData();
  formData.append("content", data.content || ""); // content가 없으면 빈 문자열

  if (data.imgUrl && data.imgUrl instanceof File) {
    formData.append("image", data.imgUrl);
  }

  try {
    const response = await api.post("/api/posts", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 게시글 수정
export const updatePost = async (
  postId: number,
  data: UpdatePostData
): Promise<any> => {
  const formData = new FormData();
  formData.append("content", data.content);

  if (data.imgUrl instanceof File) {
    formData.append("image", data.imgUrl);
  } else if (data.imgUrl === undefined) {
    formData.append("removeImage", "true");
  }

  const response = await api.put(`/api/posts/${postId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// 게시글 삭제
export const deletePost = async (postId: number): Promise<any> => {
  const response = await api.delete(`/api/posts/${postId}`);
  return response.data;
};

// 좋아요 토글
export const toggleLike = async (postId: number): Promise<LikeResponse> => {
  const response = await api.post(`/api/posts/${postId}/like`);
  return response.data;
};

// 리포스트 토글
export const toggleRepost = async (postId: number): Promise<RepostResponse> => {
  const response = await api.post(`/api/posts/${postId}/repost`);
  return response.data;
};

// 포스트 이미지 업로드
export const uploadPostImage = async (
  file: File
): Promise<ImageUploadResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await api.post("/api/posts/upload-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// 내 프로필 포스트 조회 (모든 게시글)
export const getProfilePosts = async (
  page: number = 0,
  size: number = 10,
  username?: string
): Promise<ProfilePostsResponse> => {
  try {
    const response = await api.get(
      `/api/users/${username}/posts?page=${page}&size=${size}`
    );
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// 내 프로필 사진 조회 (이미지만)
export const getProfilePhotos = async (
  page: number = 0,
  size: number = 10,
  username?: string
): Promise<ProfilePhotosResponse> => {
  const response = await api.get(
    `/api/users/${username}/images?page=${page}&size=${size}`
  );
  return response.data;
};

// 내 프로필 릴스 조회 (동영상만)
export const getProfileReels = async (
  page: number = 0,
  size: number = 10,
  username?: string
): Promise<ProfileReelsResponse> => {
  const response = await api.get(
    `/api/users/${username}/reels?page=${page}&size=${size}`
  );
  return response.data;
};

// 특정 사용자의 포스트 조회
export const getUserPosts = async (
  username: string,
  page: number = 0,
  size: number = 10
): Promise<ProfilePostsResponse> => {
  const response = await api.get(
    `/api/users/${username}/posts?page=${page}&size=${size}`
  );
  return response.data;
};

// 특정 사용자의 사진 조회
export const getUserPhotos = async (
  username: string,
  page: number = 0,
  size: number = 10
): Promise<ProfilePhotosResponse> => {
  const response = await api.get(
    `/api/users/${username}/images?page=${page}&size=${size}`
  );
  return response.data;
};
