import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  fetchFeedPosts,
  togglePostLike,
  togglePostRepost,
} from "../store/homeSlice";

// 통합된 포스트 기능도 사용할 수 있도록 추가
import { usePost } from "../../post/hooks/usePost";

export const useHome = () => {
  const dispatch = useAppDispatch();
  const home = useAppSelector((state) => state.home);
  const post = useAppSelector((state) => state.post);

  // 통합된 포스트 기능 사용
  const postActions = usePost();

  const getPosts = async (page: number = 0, size: number = 10) => {
    return await dispatch(fetchFeedPosts({ page, size }));
  };

  // 홈 피드 전용 좋아요/리포스트 함수
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

  // postActions에서 중복되는 함수들을 제외하고 필요한 것만 가져오기
  const { toggleLike: _, toggleRepost: __, ...otherPostActions } = postActions;

  return {
    // homeSlice 상태
    ...home,
    getPosts,
    toggleLike,
    toggleRepost,
    // 통합된 포스트 기능 제공 (createPost, getFeedPosts, feedPosts 등 포함)
    ...otherPostActions,
  };
};
