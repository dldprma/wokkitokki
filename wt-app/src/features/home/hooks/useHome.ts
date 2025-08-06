import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  fetchPosts,
  createNewPost,
  likePostAction,
  unlikePostAction,
  repostAction,
  unRepostAction,
} from "../store/homeSlice";
import type { CreatePostData } from "../types/homeTypes";

export const useHome = () => {
  const dispatch = useAppDispatch();
  const home = useAppSelector((state) => state.home);

  const getPosts = async (page: number = 0) => {
    return await dispatch(fetchPosts(page));
  };

  const createPost = async (data: CreatePostData) => {
    return await dispatch(createNewPost(data));
  };

  const likePost = async (postId: string) => {
    return await dispatch(likePostAction(postId));
  };

  const unlikePost = async (postId: string) => {
    return await dispatch(unlikePostAction(postId));
  };

  const repost = async (postId: string) => {
    return await dispatch(repostAction(postId));
  };

  const unRepost = async (postId: string) => {
    return await dispatch(unRepostAction(postId));
  };

  return {
    ...home,
    getPosts,
    createPost,
    likePost,
    unlikePost,
    repost,
    unRepost,
  };
};
