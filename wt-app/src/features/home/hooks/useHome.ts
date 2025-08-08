import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  createNewPost,
  fetchFeedPosts,
  togglePostLike,
  togglePostRepost,
} from "../store/homeSlice";
import type { CreatePostData } from "../types/homeTypes";

export const useHome = () => {
  const dispatch = useAppDispatch();
  const home = useAppSelector((state) => state.home);

  const getPosts = async (page: number = 0, size: number = 10) => {
    return await dispatch(fetchFeedPosts({ page, size }));
  };

  const createPost = async (data: CreatePostData) => {
    return await dispatch(createNewPost(data));
  };

  const toggleLike = async (postId: number) => {
    return await dispatch(togglePostLike(postId));
  };

  const toggleRepost = async (postId: number) => {
    return await dispatch(togglePostRepost(postId));
  };

  return {
    ...home,
    getPosts,
    createPost,
    toggleLike,
    toggleRepost,
  };
};
