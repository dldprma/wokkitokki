import api from "../../../utils/axios";
import type { User, UpdateProfileData } from "../types/userTypes";

// 프로필 업데이트 API
export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const response = await api.put("/api/user/profile", data, {
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

  const response = await api.post("/api/user/upload-profile-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    withCredentials: true,
  });
  return response.data;
};

// 사용자 정보 조회 API
export const getUserProfile = async (): Promise<User> => {
  const response = await api.get("/api/user/profile", {
    withCredentials: true,
  });
  return response.data;
};
