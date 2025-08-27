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
      return {
        postId,
        liked: response.liked,
        likeCount: response.likeCount,
      };
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
      return {
        postId,
        reposted: response.reposted,
        repostCount: response.repostCount,
      };
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
        const normalized = action.payload.content.map(
          (p: any) =>
            ({
              ...p,
              likeCount: Math.max(0, Number(p.likeCount ?? 0)),
              repostCount: Math.max(0, Number(p.repostCount ?? 0)),
              // 백엔드에서 받는 필드명 사용
              liked: Boolean(p.liked ?? false),
              reposted: Boolean(p.reposted ?? false),
              // 리포스트 관련 필드도 명시적으로 설정
              isRepost: Boolean(p.isRepost ?? false),
              repostedBy: p.repostedBy || null,
            } as any)
        );

        if (action.payload.number === 0) {
          // 첫 페이지인 경우 기존 데이터 교체
          (state as any).posts = normalized;
        } else {
          // 추가 페이지인 경우 중복 제거 후 추가
          const existingIds = new Set(
            (state as any).posts.map((p: any) => p.id)
          );
          const newPosts = normalized.filter(
            (p: any) => !existingIds.has(p.id)
          );
          (state as any).posts = [...(state as any).posts, ...newPosts];
        }

        state.hasMore = action.payload.hasNext;
        state.page = action.payload.number;
      })
      .addCase(fetchFeedPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // 새 게시글 작성
    builder
      .addCase(createNewPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewPost.fulfilled, (state, action) => {
        state.loading = false;
        // 새 게시글을 피드 맨 위에 추가
        state.posts.unshift(action.payload);
      })
      .addCase(createNewPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // 좋아요 토글
    builder.addCase(togglePostLike.fulfilled, (state, action) => {
      const { postId, liked, likeCount } = action.payload;
      const post = (state as any).posts.find((p: any) => p.id === postId);
      if (post) {
        post.liked = liked;
        post.likeCount = likeCount;
      }
    });

    // 리포스트 토글
    builder.addCase(togglePostRepost.fulfilled, (state, action) => {
      const { postId, reposted, repostCount } = action.payload;

      // 모든 포스트 배열에서 해당 게시글 찾아서 상태 업데이트
      const post = (state as any).posts.find((p: any) => p.id === postId);
      if (post) {
        (post as any).reposted = reposted;
        // 리포스트 상태에 따라 카운트 조정
        if (reposted) {
          (post as any).repostCount = Math.max(
            0,
            (post as any).repostCount + 1
          );
        } else {
          (post as any).repostCount = Math.max(
            0,
            (post as any).repostCount - 1
          );
        }
        // repostedBy는 백엔드에서 관리되므로 프론트엔드에서 수정하지 않음
      }
    });
  },
});

export const { setLoading, setError, clearError, resetHome } =
  homeSlice.actions;
export default homeSlice.reducer;
