import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  // 피드 관련 액션
  fetchFeedPosts,

  // 포스트 CRUD 액션
  createNewPost,
  updateExistingPost,
  deleteExistingPost,

  // 상호작용 액션
  togglePostLike,
  togglePostRepost,

  // 이미지 업로드 액션
  uploadImageForPost,

  // 프로필 관련 액션
  fetchProfilePosts,
  fetchProfilePhotos,
  fetchProfileReels,

  // 사용자별 포스트 액션
  fetchUserPosts,
  fetchUserPhotos,

  // 리듀서 액션
  resetFeed,
  resetProfile,
  setGlobalLoading,
  setGlobalError,
  resetAll,
} from "../store/postSlice";
import type { CreatePostData, UpdatePostData } from "../type/postTypes";
import { useCallback } from "react";

export const usePost = () => {
  const dispatch = useAppDispatch();
  const postState = useAppSelector((state) => state.post);

  // ===== 피드 관련 훅 =====

  const getFeedPosts = async (page: number = 0, size: number = 10) => {
    return await dispatch(fetchFeedPosts({ page, size }));
  };

  const resetFeedPosts = () => {
    dispatch(resetFeed());
  };

  // ===== 포스트 CRUD 훅 =====

  const createPost = async (data: CreatePostData) => {
    return await dispatch(createNewPost(data));
  };

  const updatePost = async (postId: number, data: UpdatePostData) => {
    return await dispatch(updateExistingPost({ postId, data }));
  };

  const deletePost = async (postId: number) => {
    return await dispatch(deleteExistingPost(postId));
  };

  // ===== 상호작용 훅 =====

  const toggleLike = async (postId: number) => {
    try {
      const result = await dispatch(togglePostLike(postId));
      // postSlice에서 이미 상태를 업데이트하므로 새로고침 불필요
      return result;
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
      throw error;
    }
  };

  const toggleRepost = async (postId: number) => {
    try {
      const result = await dispatch(togglePostRepost(postId));
      // postSlice에서 이미 상태를 업데이트하므로 새로고침 불필요
      return result;
    } catch (error) {
      console.error("리포스트 처리 실패:", error);
      throw error;
    }
  };

  // ===== 이미지 업로드 훅 =====

  const uploadImage = async (file: File) => {
    return await dispatch(uploadImageForPost(file));
  };

  // ===== 프로필 관련 훅 =====

  // 프로필 포스트 조회
  const getProfilePosts = useCallback(
    async (page: number, size: number, username: string) => {
      try {
        await dispatch(fetchProfilePosts({ page, size, username })).unwrap();
      } catch (error) {
        console.error("프로필 포스트 조회 실패:", error);
        throw error;
      }
    },
    [dispatch]
  );

  // 프로필 사진 조회
  const getProfilePhotos = useCallback(
    async (page: number, size: number, username: string) => {
      try {
        await dispatch(fetchProfilePhotos({ page, size, username })).unwrap();
      } catch (error) {
        console.error("프로필 사진 조회 실패:", error);
        throw error;
      }
    },
    [dispatch]
  );

  // 프로필 릴스 조회
  const getProfileReels = useCallback(
    async (page: number, size: number, username: string) => {
      try {
        await dispatch(fetchProfileReels({ page, size, username })).unwrap();
      } catch (error) {
        console.error("프로필 릴스 조회 실패:", error);
        throw error;
      }
    },
    [dispatch]
  );

  const resetProfilePosts = () => {
    dispatch(resetProfile());
  };

  // ===== 사용자별 포스트 훅 =====

  // 사용자별 포스트 조회 (프로필과 동일한 API 사용)
  const getUserPosts = useCallback(
    async (page: number, size: number, username: string) => {
      try {
        await dispatch(fetchUserPosts({ username, page, size })).unwrap();
      } catch (error) {
        console.error("사용자 포스트 조회 실패:", error);
        throw error;
      }
    },
    [dispatch]
  );

  // 사용자별 사진 조회 (프로필과 동일한 API 사용)
  const getUserPhotos = useCallback(
    async (page: number, size: number, username: string) => {
      try {
        await dispatch(fetchUserPhotos({ username, page, size })).unwrap();
      } catch (error) {
        console.error("사용자 사진 조회 실패:", error);
        throw error;
      }
    },
    [dispatch]
  );

  // ===== 상태 관리 훅 =====

  const setLoading = (loading: boolean) => {
    dispatch(setGlobalLoading(loading));
  };

  const setError = (error: string | null) => {
    dispatch(setGlobalError(error));
  };

  const clearError = () => {
    dispatch(setGlobalError(null));
  };

  const resetAllPosts = () => {
    dispatch(resetAll());
  };

  // ===== 편의 함수들 =====

  // 특정 포스트 찾기 (피드에서)
  const findFeedPost = (postId: number) => {
    return postState.feedPosts.find((post: any) => post.id === postId);
  };

  // 특정 포스트 찾기 (프로필에서)
  const findProfilePost = (postId: number) => {
    return postState.profilePosts.find((post: any) => post.id === postId);
  };

  // 특정 포스트 찾기 (사용자별에서)
  const findUserPost = (postId: number) => {
    return postState.userPosts.find((post: any) => post.id === postId);
  };

  // 모든 포스트에서 특정 포스트 찾기
  const findPost = (postId: number) => {
    return (
      findFeedPost(postId) || findProfilePost(postId) || findUserPost(postId)
    );
  };

  return {
    // 상태
    ...postState,

    // 피드 관련
    getFeedPosts,
    resetFeedPosts,

    // 포스트 CRUD
    createPost,
    updatePost,
    deletePost,

    // 상호작용
    toggleLike,
    toggleRepost,

    // 이미지 업로드
    uploadImage,

    // 프로필 관련
    getProfilePosts,
    getProfilePhotos,
    getProfileReels,
    resetProfilePosts,

    // 사용자별 포스트
    getUserPosts,
    getUserPhotos,

    // 상태 관리
    setLoading,
    setError,
    clearError,
    resetAllPosts,

    // 편의 함수
    findFeedPost,
    findProfilePost,
    findUserPost,
    findPost,
  };
};
