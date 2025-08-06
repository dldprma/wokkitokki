import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  getPosts,
  createPost,
  likePost,
  unlikePost,
  repost,
  unRepost,
} from "../api/homeApi";
import type { HomeState, Post, CreatePostData } from "../types/homeTypes";

const initialState: HomeState = {
  posts: [],
  loading: false,
  error: null,
  hasMore: true,
  page: 0,
};

// 게시글 목록 조회
export const fetchPosts = createAsyncThunk(
  "home/fetchPosts",
  async (page: number, { rejectWithValue }) => {
    try {
      const response = await getPosts(page);
      return { ...response, page };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "게시글을 불러오는데 실패했습니다."
      );
    }
  }
);

// 새 게시글 작성
export const createNewPost = createAsyncThunk(
  "home/createPost",
  async (data: CreatePostData, { rejectWithValue }) => {
    try {
      const response = await createPost(data);
      return response;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "게시글 작성에 실패했습니다."
      );
    }
  }
);

// 좋아요
export const likePostAction = createAsyncThunk(
  "home/likePost",
  async (postId: string, { rejectWithValue }) => {
    try {
      const response = await likePost(postId);
      return { postId, response };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "좋아요 처리에 실패했습니다."
      );
    }
  }
);

// 좋아요 취소
export const unlikePostAction = createAsyncThunk(
  "home/unlikePost",
  async (postId: string, { rejectWithValue }) => {
    try {
      const response = await unlikePost(postId);
      return { postId, response };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "좋아요 취소에 실패했습니다."
      );
    }
  }
);

// 리포스트
export const repostAction = createAsyncThunk(
  "home/repost",
  async (postId: string, { rejectWithValue }) => {
    try {
      const response = await repost(postId);
      return { postId, response };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "리포스트에 실패했습니다."
      );
    }
  }
);

// 리포스트 취소
export const unRepostAction = createAsyncThunk(
  "home/unRepost",
  async (postId: string, { rejectWithValue }) => {
    try {
      const response = await unRepost(postId);
      return { postId, response };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "리포스트 취소에 실패했습니다."
      );
    }
  }
);

const homeSlice = createSlice({
  name: "home",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetHome: (state) => {
      state.posts = [];
      state.page = 0;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    // 게시글 목록 조회
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.page === 0) {
          state.posts = action.payload.posts;
        } else {
          state.posts = [...state.posts, ...action.payload.posts];
        }
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 새 게시글 작성
      .addCase(createNewPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewPost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts.unshift(action.payload);
      })
      .addCase(createNewPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 좋아요
      .addCase(likePostAction.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p.id === action.payload.postId);
        if (post) {
          post.likes += 1;
          post.isLiked = true;
        }
      })
      .addCase(unlikePostAction.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p.id === action.payload.postId);
        if (post) {
          post.likes -= 1;
          post.isLiked = false;
        }
      })

      // 리포스트
      .addCase(repostAction.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p.id === action.payload.postId);
        if (post) {
          post.reposts += 1;
          post.isReposted = true;
        }
      })
      .addCase(unRepostAction.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p.id === action.payload.postId);
        if (post) {
          post.reposts -= 1;
          post.isReposted = false;
        }
      });
  },
});

export const { setLoading, setError, clearError, resetHome } =
  homeSlice.actions;
export default homeSlice.reducer;
