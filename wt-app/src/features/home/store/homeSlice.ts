import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { CreatePostData, HomeState } from "../types/homeTypes";
import { createPost, getFeedPosts } from "../api/homeApi";

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
        const normalized = action.payload.content.map((p: any) => ({
          ...p,
          likeCount: Math.max(0, Number(p.likeCount ?? 0)),
          repostCount: Math.max(0, Number(p.repostCount ?? 0)),
        }));
        if (action.payload.number === 0) {
          state.posts = normalized;
        } else {
          state.posts = [...state.posts, ...normalized];
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
        const p = action.payload as any;
        state.posts.unshift({
          ...p,
          likeCount: Math.max(0, Number(p.likeCount ?? 0)),
          repostCount: Math.max(0, Number(p.repostCount ?? 0)),
        });
      })
      .addCase(createNewPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setLoading, setError, clearError, resetHome } =
  homeSlice.actions;
export default homeSlice.reducer;
