import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { CreatePostData, HomeState } from "../types/homeTypes";
import {
  createPost,
  getFeedPosts,
  toggleLike,
  toggleRepost,
} from "../api/homeApi";

const initialState: HomeState = {
  posts: [],
  loading: false,
  error: null,
  hasMore: true,
  page: 0,
};

// 피드 게시글 조회
export const fetchFeedPosts = createAsyncThunk(
  "home/fetchFeedPosts",
  async (
    { page, size }: { page: number; size: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await getFeedPosts(page, size);
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

// 좋아요 토글
export const togglePostLike = createAsyncThunk(
  "home/toggleLike",
  async (postId: number, { rejectWithValue }) => {
    try {
      const response = await toggleLike(postId);
      return { postId, isLiked: response.isLiked };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "좋아요 처리에 실패했습니다."
      );
    }
  }
);

// 리포스트 토글
export const togglePostRepost = createAsyncThunk(
  "home/toggleRepost",
  async (postId: number, { rejectWithValue }) => {
    try {
      const response = await toggleRepost(postId);
      return { postId, isReposted: response.isReposted };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "리포스트 처리에 실패했습니다."
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
    // 피드 게시글 조회
    builder
      .addCase(fetchFeedPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeedPosts.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.number === 0) {
          state.posts = action.payload.content;
        } else {
          state.posts = [...state.posts, ...action.payload.content];
        }
        state.hasMore = action.payload.hasNext;
        state.page = action.payload.number;
      })
      .addCase(fetchFeedPosts.rejected, (state, action) => {
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
      .addCase(togglePostLike.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p.id === action.payload.postId);
        if (post) {
          post.isLiked = action.payload.isLiked;
          if (action.payload.isLiked) {
            post.likeCount += 1;
          } else {
            post.likeCount = Math.max(0, post.likeCount - 1);
          }
        }
      })
      // 리포스트
      .addCase(togglePostRepost.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p.id === action.payload.postId);
        if (post) {
          post.isReposted = action.payload.isReposted;
          if (action.payload.isReposted) {
            post.repostCount += 1;
          } else {
            post.repostCount = Math.max(0, post.repostCount - 1);
          }
        }
      });
  },
});

export const { setLoading, setError, clearError, resetHome } =
  homeSlice.actions;
export default homeSlice.reducer;
