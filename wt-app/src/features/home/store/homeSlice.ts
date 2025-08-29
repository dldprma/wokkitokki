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
        liked: response.isLiked, // ✅ response.liked가 아니라 response.isLiked 사용
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
  async (postId: number, { rejectWithValue, getState }) => {
    try {
      const response = await toggleRepost(postId);
      const state = getState() as any;
      const currentUsername = state.auth.user?.username || "알 수 없음";

      return {
        postId,
        isReposted: response.isReposted,
        repostCount: response.repostCount,
        currentUsername,
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
    // 댓글 작성 후 카운트 증가
    incrementCommentCount: (state, action: PayloadAction<number>) => {
      const post = (state as any).posts.find(
        (p: any) => p.id === action.payload
      );
      if (post) {
        post.commentCount = (post.commentCount || 0) + 1;
      }
    },
    // 댓글 삭제 후 카운트 감소
    decrementCommentCount: (state, action: PayloadAction<number>) => {
      const post = (state as any).posts.find(
        (p: any) => p.id === action.payload
      );
      if (post && post.commentCount > 0) {
        post.commentCount = post.commentCount - 1;
      }
    },
  },
  extraReducers: (builder) => {
    // 피드 게시글 조회
    builder
      .addCase(fetchFeedPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeedPosts.fulfilled, (state, action: any) => {
        state.loading = false;
        const normalized = action.payload.content.map(
          (p: any) =>
            ({
              ...p,
              likeCount: Math.max(0, Number(p.likeCount ?? 0)),
              repostCount: Math.max(0, Number(p.repostCount ?? 0)),
              commentCount: Math.max(0, Number(p.commentCount ?? 0)),
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
        post.liked = liked; // ✅ isLiked가 아니라 liked 사용
        post.likeCount = likeCount;
      }
    });

    // 리포스트 토글
    builder.addCase(togglePostRepost.fulfilled, (state, action) => {
      const { postId, isReposted, currentUsername } = action.payload;

      // 홈 피드에서 해당 게시글 찾기
      const originalPost = (state as any).posts.find(
        (p: any) => p.id === postId
      );
      if (!originalPost) {
        return;
      }

      if (isReposted) {
        // 원본 게시글의 원래 위치 저장 (리포스트 취소 시 복원용)
        const originalPostIndex = (state as any).posts.findIndex(
          (p: any) => p.id === postId
        );

        // 리포스트 추가 시: 새로운 리포스트 게시글을 피드 상단에 추가
        const repostedPost = {
          ...originalPost,
          id: postId, // 임시 ID 대신 원본 ID 사용 (400 에러 해결)
          reposted: true,
          repostCount: originalPost.repostCount, // 카운트는 원래대로 유지
          isRepost: true,
          repostedBy: currentUsername,
          repostedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          // 원래 위치 정보 저장
          originalIndex: originalPostIndex,
        };

        // 홈 피드 맨 위에 추가
        (state as any).posts.unshift(repostedPost);

        // 원본 게시글을 피드에서 제거 (중복 방지)
        if (originalPostIndex !== -1) {
          (state as any).posts.splice(originalPostIndex + 1, 1); // +1은 unshift로 인한 인덱스 변화 고려
        }

        // 백엔드에서 받은 repostCount로 업데이트
        repostedPost.repostCount = action.payload.repostCount;
      } else {
        // 리포스트 취소 시: 리포스트된 게시글을 피드에서 제거하고 원본 게시글을 원래 위치에 복원
        const repostedPostIndex = (state as any).posts.findIndex(
          (p: any) =>
            p.isRepost &&
            p.repostedBy === currentUsername &&
            p.content === originalPost.content
        );

        if (repostedPostIndex !== -1) {
          // 리포스트된 게시글에서 원래 위치 정보 가져오기
          const repostedPost = (state as any).posts[repostedPostIndex];
          const originalIndex = repostedPost.originalIndex || 0;

          // 불변성을 보장하기 위해 새로운 배열 생성
          const newPosts = [...(state as any).posts];

          // 리포스트된 게시글을 피드에서 완전히 제거
          newPosts.splice(repostedPostIndex, 1);

          // 원본 게시글을 원래 위치에 삽입
          const restoredPost = {
            ...originalPost,
            reposted: false, // 리포스트 상태 해제
            isRepost: false,
            repostedBy: null,
            repostedAt: null,
          };

          // 원래 위치에 삽입 (원본 게시글이 있던 정확한 위치)
          newPosts.splice(originalIndex, 0, restoredPost);

          // 완전히 새로운 상태 객체 생성
          (state as any).posts = newPosts;
        }

        // 백엔드에서 받은 repostCount로 업데이트 (리포스트 취소 시)
        if (action.payload.repostCount !== undefined) {
          // 원본 게시글의 repostCount도 업데이트
          originalPost.repostCount = action.payload.repostCount;
        }
      }

      // 리포스트 취소 시: 실제 피드에 있는 게시글의 상태를 직접 업데이트
      if (!isReposted) {
        // 리포스트 취소 시: 피드에 있는 게시글의 모든 리포스트 관련 상태를 완전히 초기화
        const feedPost = (state as any).posts.find(
          (p: any) =>
            p.id === postId ||
            (p.content === originalPost.content && !p.isRepost)
        );
        if (feedPost) {
          // 모든 리포스트 관련 상태를 완전히 초기화
          feedPost.reposted = false;
          feedPost.isRepost = false;
          feedPost.repostedBy = null;
          feedPost.repostedAt = null;
          feedPost.repostCount = Math.max(0, feedPost.repostCount - 1);
        }
      } else {
        // 리포스트 추가 시: 원본 게시글 상태 업데이트
        originalPost.reposted = true;
        originalPost.repostCount = Math.max(0, originalPost.repostCount + 1);
      }
    });
  },
});

export const {
  setLoading,
  setError,
  clearError,
  resetHome,
  incrementCommentCount,
  decrementCommentCount,
} = homeSlice.actions;
export default homeSlice.reducer;
