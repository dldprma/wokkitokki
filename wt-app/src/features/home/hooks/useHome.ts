import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { fetchFeedPosts } from "../store/homeSlice";

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

  return {
    // homeSlice 상태
    ...home,
    getPosts,
    // postSlice 상태 (피드 포스트, 로딩, 에러 등)
    posts: post.feedPosts,
    loading: post.feedLoading,
    error: post.feedError,
    hasMore: post.feedHasMore,
    // 통합된 포스트 기능 제공 (createPost, toggleLike, toggleRepost, getFeedPosts 포함)
    ...postActions,
  };
};
