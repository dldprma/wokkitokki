import api from "../../../utils/axios";
import type { UserProfile, UpdateProfileData } from "../types/userTypes";
import type { Page } from "../../search/types/searchTypes";

// User 타입을 UserProfile로 별칭
type User = UserProfile;

// 프로필 업데이트 API
export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const response = await api.put("/api/users/profile", data, {
    withCredentials: true,
  });
  return response.data;
};

// 프로필 이미지 업로드 API
export const uploadProfileImage = async (
  file: File
): Promise<{ imageUrl: string }> => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await api.post("/api/users/profile/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    withCredentials: true,
  });
  return response.data;
};

// 사용자 정보 조회 API
export const getUserProfile = async (
  username: string,
  currentUsername?: string
): Promise<User> => {
  const params = currentUsername ? { currentUser: currentUsername } : {};
  const response = await api.get(`/api/users/${username}`, {
    params,
    withCredentials: true,
  });
  return response.data;
};

// 팔로우/언팔로우 API
export const toggleFollow = async (
  username: string
): Promise<{
  message: string;
  isFollowing: boolean;
  action: string;
  targetUserProfile: UserProfile;
}> => {
  const response = await api.post(
    `/api/users/${username}/follow`,
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
};

// 팔로워 목록 조회 API
export const getFollowers = async (
  username: string,
  page: number = 0,
  size: number = 20
): Promise<Page<UserProfile>> => {
  const response = await api.get(`/api/users/${username}/followers`, {
    params: { page, size },
    withCredentials: true,
  });
  return response.data;
};

// 팔로잉 목록 조회 API
export const getFollowing = async (
  username: string,
  page: number = 0,
  size: number = 20
): Promise<Page<UserProfile>> => {
  const response = await api.get(`/api/users/${username}/following`, {
    params: { page, size },
    withCredentials: true,
  });
  return response.data;
};

// 포스트 관련 API는 통합된 postApi에서 import
export {
  getProfilePosts,
  getProfilePhotos,
  getProfileReels,
  getUserPosts,
  getUserPhotos,
} from "../../post/api/postApi";
