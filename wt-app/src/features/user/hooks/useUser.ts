import { useAppDispatch } from "../../../store/hooks";
import * as userAPI from "../api/userApi";
import { setUser } from "../store/userSlice";

export const useUser = () => {
  const dispatch = useAppDispatch();

  const getProfile = async (username: string) => {
    try {
      const response = await userAPI.getUserProfile(username);
      dispatch(setUser(response));
      return response;
    } catch (error) {
      console.error("프로필 조회 실패:", error);
      throw error;
    }
  };

  const uploadProfileImage = async (file: File) => {
    try {
      const response = await userAPI.uploadProfileImage(file);
      return response;
    } catch (error) {
      console.error("프로필 이미지 업로드 실패:", error);
      throw error;
    }
  };

  const toggleFollow = async (username: string) => {
    try {
      const response = await userAPI.toggleFollow(username);

      // 서버 응답에서 팔로우 상태 확인
      const isFollowing = response.isFollowing;
      const targetUserProfile = response.targetUserProfile;

      // 성공한 경우 Redux store 업데이트
      if (targetUserProfile) {
        dispatch(setUser(targetUserProfile));
      }

      return {
        isFollowing,
        targetUserProfile,
      };
    } catch (error: any) {
      console.error("팔로우 토글 실패:", error);

      const errorMessage =
        error.response?.data?.error || "팔로우 상태 변경에 실패했습니다.";

      throw {
        message: errorMessage,
      };
    }
  };

  const getFollowers = async (
    username: string,
    page: number = 0,
    size: number = 20
  ) => {
    try {
      const response = await userAPI.getFollowers(username, page, size);
      return response;
    } catch (error) {
      console.error("팔로워 조회 실패:", error);
      throw error;
    }
  };

  const getFollowing = async (
    username: string,
    page: number = 0,
    size: number = 20
  ) => {
    try {
      const response = await userAPI.getFollowing(username, page, size);
      return response;
    } catch (error) {
      console.error("팔로잉 조회 실패:", error);
      throw error;
    }
  };

  return {
    getProfile,
    uploadProfileImage,
    toggleFollow,
    getFollowers,
    getFollowing,
  };
};
