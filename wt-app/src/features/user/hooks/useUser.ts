import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  fetchUserProfile,
  updateUserProfile,
  uploadUserProfileImage,
} from "../store/userSlice";
import type { UpdateProfileData } from "../types/userTypes";

export const useUser = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);

  const getProfile = async () => {
    return await dispatch(fetchUserProfile());
  };

  const updateProfile = async (data: UpdateProfileData) => {
    return await dispatch(updateUserProfile(data));
  };

  const uploadProfileImage = async (file: File) => {
    return await dispatch(uploadUserProfileImage(file));
  };

  return {
    ...user,
    getProfile,
    updateProfile,
    uploadProfileImage,
  };
};
