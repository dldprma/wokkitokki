import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  fetchUserProfile,
  updateUserProfile,
  uploadUserProfileImage,
} from "../store/userSlice";
import type { UpdateProfileData } from "../types/userTypes";

// 통합된 포스트 기능도 사용할 수 있도록 추가
import { usePost } from "../../post/hooks/usePost";

export const useUser = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);

  // 통합된 포스트 기능 사용
  const postActions = usePost();

  const getProfile = async (username: string) => {
    return await dispatch(fetchUserProfile(username));
  };

  const updateProfile = async (data: UpdateProfileData) => {
    return await dispatch(updateUserProfile(data));
  };

  const uploadProfileImage = async (file: File) => {
    const result = await dispatch(uploadUserProfileImage(file));
    return result;
  };

  return {
    ...user,
    getProfile,
    updateProfile,
    uploadProfileImage,
    // 통합된 포스트 기능도 함께 제공
    ...postActions,
  };
};
