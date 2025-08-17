import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { CreatePostData, UpdatePostData, Post } from "../type/postTypes";
import {
  getFeedPosts,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleRepost,
  uploadPostImage,
  getProfilePosts,
  getProfilePhotos,
  getProfileReels,
} from "../api/postApi";

// 포스트 상태 인터페이스
interface PostState {
  // 피드 포스트
  feedPosts: Post[];
  feedLoading: boolean;
  feedError: string | null;
  feedHasMore: boolean;
  feedPage: number;

  // 프로필 포스트 (현재 사용자 + 다른 사용자 모두 사용)
  profilePosts: Post[];
  profileLoading: boolean;
  profileError: string | null;
  profileHasMore: boolean;
  profilePage: number;

  // 프로필 사진
  profilePhotos: any[];
  photosLoading: boolean;
  photosError: string | null;
  photosHasMore: boolean;
  photosPage: number;

  // 프로필 릴스
  profileReels: Post[];
  reelsLoading: boolean;
  reelsError: string | null;
  reelsHasMore: boolean;
  reelsPage: number;

  // 전역 상태
  globalLoading: boolean;
  globalError: string | null;
}

const initialState: PostState = {
  // 피드 포스트
  feedPosts: [],
  feedLoading: false,
  feedError: null,
  feedHasMore: true,
  feedPage: 0,

  // 프로필 포스트
  profilePosts: [],
  profileLoading: false,
  profileError: null,
  profileHasMore: true,
  profilePage: 0,

  // 프로필 사진
  profilePhotos: [],
  photosLoading: false,
  photosError: null,
  photosHasMore: true,
  photosPage: 0,

  // 프로필 릴스
  profileReels: [],
  reelsLoading: false,
  reelsError: null,
  reelsHasMore: true,
  reelsPage: 0,

  // 전역 상태
  globalLoading: false,
  globalError: null,
};

// ===== 피드 관련 액션 =====

// 피드 게시글 조회
export const fetchFeedPosts = createAsyncThunk(
  "post/fetchFeedPosts",
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

// ===== 포스트 CRUD 액션 =====

// 새 게시글 작성
export const createNewPost = createAsyncThunk(
  "post/createPost",
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

// 게시글 수정
export const updateExistingPost = createAsyncThunk(
  "post/updatePost",
  async (
    { postId, data }: { postId: number; data: UpdatePostData },
    { rejectWithValue }
  ) => {
    try {
      const response = await updatePost(postId, data);
      return { postId, data: response };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "게시글 수정에 실패했습니다."
      );
    }
  }
);

// 게시글 삭제
export const deleteExistingPost = createAsyncThunk(
  "post/deletePost",
  async (postId: number, { rejectWithValue }) => {
    try {
      await deletePost(postId);
      return postId;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "게시글 삭제에 실패했습니다."
      );
    }
  }
);

// ===== 상호작용 액션 =====

// 좋아요 토글
export const togglePostLike = createAsyncThunk(
  "post/toggleLike",
  async (postId: number, { rejectWithValue }) => {
    try {
      const response = await toggleLike(postId);
      return {
        postId,
        isLiked: response.isLiked,
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
  "post/togglePostRepost",
  async (postId: number, { rejectWithValue }) => {
    try {
      const response = await toggleRepost(postId);
      return {
        postId,
        isReposted: response.isReposted,
        repostCount: response.repostCount,
      };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "리포스트 처리에 실패했습니다."
      );
    }
  }
);

// ===== 이미지 업로드 액션 =====

// 포스트 이미지 업로드
export const uploadImageForPost = createAsyncThunk(
  "post/uploadImage",
  async (image: File, { rejectWithValue }) => {
    try {
      const response = await uploadPostImage(image);
      return response;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "이미지 업로드에 실패했습니다."
      );
    }
  }
);

// ===== 프로필 관련 액션 =====

// 프로필 포스트 조회
export const fetchProfilePosts = createAsyncThunk(
  "post/fetchProfilePosts",
  async (
    { page, size, username }: { page: number; size: number; username: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await getProfilePosts(page, size, username);
      return { ...response, page };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ||
          "프로필 게시글을 불러오는데 실패했습니다."
      );
    }
  }
);

// 프로필 사진 조회
export const fetchProfilePhotos = createAsyncThunk(
  "post/fetchProfilePhotos",
  async (
    { page, size, username }: { page: number; size: number; username: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await getProfilePhotos(page, size, username);
      return { ...response, page };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "프로필 사진을 불러오는데 실패했습니다."
      );
    }
  }
);

// 프로필 릴스 조회
export const fetchProfileReels = createAsyncThunk(
  "post/fetchProfileReels",
  async (
    { page, size, username }: { page: number; size: number; username: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await getProfileReels(page, size, username);
      return { ...response, page };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "프로필 릴스를 불러오는데 실패했습니다."
      );
    }
  }
);

// ===== 사용자별 포스트 액션 (프로필과 동일한 API 사용) =====

// 특정 사용자의 포스트 조회 (프로필과 동일)
export const fetchUserPosts = createAsyncThunk(
  "post/fetchUserPosts",
  async (
    { username, page, size }: { username: string; page: number; size: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await getProfilePosts(page, size, username);
      return { ...response, username, page };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message ||
          "사용자 게시글을 불러오는데 실패했습니다."
      );
    }
  }
);

// 특정 사용자의 사진 조회 (프로필과 동일)
export const fetchUserPhotos = createAsyncThunk(
  "post/fetchUserPhotos",
  async (
    { username, page, size }: { username: string; page: number; size: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await getProfilePhotos(page, size, username);
      return { ...response, username, page };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "사용자 사진을 불러오는데 실패했습니다."
      );
    }
  }
);

// ===== Redux Slice =====

const postSlice = createSlice({
  name: "post",
  initialState,
  reducers: {
    // 피드 관련 리듀서
    setFeedLoading: (state, action: PayloadAction<boolean>) => {
      state.feedLoading = action.payload;
    },
    setFeedError: (state, action: PayloadAction<string | null>) => {
      state.feedError = action.payload;
    },
    clearFeedError: (state) => {
      state.feedError = null;
    },
    resetFeed: (state) => {
      state.feedPosts = [];
      state.feedPage = 0;
      state.feedHasMore = true;
    },

    // 프로필 관련 리듀서
    setProfileLoading: (state, action: PayloadAction<boolean>) => {
      state.profileLoading = action.payload;
    },
    setProfileError: (state, action: PayloadAction<string | null>) => {
      state.profileError = action.payload;
    },
    clearProfileError: (state) => {
      state.profileError = null;
    },
    resetProfile: (state) => {
      state.profilePosts = [];
      state.profilePage = 0;
      state.profileHasMore = true;
    },

    // 전역 상태 리듀서
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.globalError = action.payload;
    },
    clearGlobalError: (state) => {
      state.globalError = null;
    },

    // 모든 상태 초기화
    resetAll: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // ===== 피드 관련 리듀서 =====

    // 피드 포스트 조회
    builder
      .addCase(fetchFeedPosts.pending, (state) => {
        state.feedLoading = true;
        state.feedError = null;
      })
      .addCase(fetchFeedPosts.fulfilled, (state, action) => {
        state.feedLoading = false;

        // 데이터 검증 및 정규화
        const normalized = action.payload.content.map((p: any) => {
          // 백엔드 데이터를 그대로 사용
          const normalizedPost = {
            ...p,
            likeCount: p.likeCount,
            repostCount: p.repostCount,
            isLiked: p.isLiked,
            isReposted: p.isReposted,
          };

          return normalizedPost;
        });

        if (action.payload.number === 0) {
          state.feedPosts = normalized;
        } else {
          state.feedPosts = [...state.feedPosts, ...normalized];
        }
        state.feedHasMore = !action.payload.last;
        state.feedPage = action.payload.number;
      })
      .addCase(fetchFeedPosts.rejected, (state, action) => {
        state.feedLoading = false;
        state.feedError = action.payload as string;
      });

    // ===== 포스트 CRUD 리듀서 =====

    // 새 게시글 작성
    builder
      .addCase(createNewPost.pending, (state) => {
        state.globalLoading = true;
        state.globalError = null;
      })
      .addCase(createNewPost.fulfilled, (state, action) => {
        state.globalLoading = false;
        const p = action.payload as any;
        const newPost = {
          ...p,
          likeCount: Math.max(0, Number(p.likeCount ?? 0)),
          repostCount: Math.max(0, Number(p.repostCount ?? 0)),
        };
        // 피드와 프로필 포스트에 모두 추가
        state.feedPosts.unshift(newPost);
        state.profilePosts.unshift(newPost);
      })
      .addCase(createNewPost.rejected, (state, action) => {
        state.globalLoading = false;
        state.globalError = action.payload as string;
      });

    // 게시글 수정
    builder.addCase(updateExistingPost.fulfilled, (state, action) => {
      const { postId, data } = action.payload;
      // 피드 포스트에서 수정
      const feedPost = state.feedPosts.find((p) => p.id === postId);
      if (feedPost) {
        Object.assign(feedPost, data);
      }
      // 프로필 포스트에서 수정
      const profilePost = state.profilePosts.find((p) => p.id === postId);
      if (profilePost) {
        Object.assign(profilePost, data);
      }
    });

    // 게시글 삭제
    builder.addCase(deleteExistingPost.fulfilled, (state, action) => {
      const postId = action.payload;
      // 피드 포스트에서 삭제
      state.feedPosts = state.feedPosts.filter((p) => p.id !== postId);
      // 프로필 포스트에서 삭제
      state.profilePosts = state.profilePosts.filter((p) => p.id !== postId);
    });

    // ===== 상호작용 리듀서 =====

    // 좋아요 토글
    builder.addCase(togglePostLike.fulfilled, (state, action) => {
      const { postId, isLiked } = action.payload;

      // 모든 포스트 배열에서 해당 게시글 찾아서 업데이트
      const updatePostInArray = (posts: any[]) => {
        const post = posts.find((p) => p.id === postId);
        if (post) {
          post.isLiked = isLiked;
          // 좋아요 상태에 따라 카운트 조정
          if (isLiked) {
            post.likeCount = Math.max(0, post.likeCount + 1);
          } else {
            post.likeCount = Math.max(0, post.likeCount - 1);
          }
        }
      };

      // 피드 포스트에서 업데이트
      updatePostInArray(state.feedPosts);
      // 프로필 포스트에서 업데이트
      updatePostInArray(state.profilePosts);
    });

    // 리포스트 토글
    builder.addCase(togglePostRepost.fulfilled, (state, action) => {
      const { postId, isReposted } = action.payload;

      // 모든 포스트 배열에서 해당 게시글 찾아서 업데이트
      const updatePostInArray = (posts: any[]) => {
        const post = posts.find((p) => p.id === postId);
        if (post) {
          post.isReposted = isReposted;
          // 리포스트 상태에 따라 카운트 조정
          if (isReposted) {
            post.repostCount = Math.max(0, post.repostCount + 1);
          } else {
            post.repostCount = Math.max(0, post.repostCount - 1);
          }
        }
      };

      // 피드 포스트에서 업데이트
      updatePostInArray(state.feedPosts);
      // 프로필 포스트에서 업데이트
      updatePostInArray(state.profilePosts);
    });

    // ===== 프로필 관련 리듀서 =====

    // 프로필 포스트 조회
    builder
      .addCase(fetchProfilePosts.pending, (state) => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(fetchProfilePosts.fulfilled, (state, action) => {
        state.profileLoading = false;
        const normalized = action.payload.content.map((p: any) => ({
          ...p,
          likeCount: Math.max(0, Number(p.likeCount ?? 0)),
          repostCount: Math.max(0, Number(p.repostCount ?? 0)),
        }));
        if (action.payload.number === 0) {
          state.profilePosts = normalized;
        } else {
          state.profilePosts = [...state.profilePosts, ...normalized];
        }
        state.profileHasMore = !action.payload.last;
        state.profilePage = action.payload.number;
      })
      .addCase(fetchProfilePosts.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload as string;
      });

    // 프로필 사진 조회
    builder
      .addCase(fetchProfilePhotos.pending, (state) => {
        state.photosLoading = true;
        state.photosError = null;
      })
      .addCase(fetchProfilePhotos.fulfilled, (state, action) => {
        state.photosLoading = false;
        if (action.payload.number === 0) {
          state.profilePhotos = action.payload.content;
        } else {
          state.profilePhotos = [
            ...state.profilePhotos,
            ...action.payload.content,
          ];
        }
        state.photosHasMore = !action.payload.last;
        state.photosPage = action.payload.number;
      })
      .addCase(fetchProfilePhotos.rejected, (state, action) => {
        state.photosLoading = false;
        state.photosError = action.payload as string;
      });

    // 프로필 릴스 조회
    builder
      .addCase(fetchProfileReels.pending, (state) => {
        state.reelsLoading = true;
        state.reelsError = null;
      })
      .addCase(fetchProfileReels.fulfilled, (state, action) => {
        state.reelsLoading = false;
        const normalized = action.payload.content.map((p: any) => ({
          ...p,
          likeCount: Math.max(0, Number(p.likeCount ?? 0)),
          repostCount: Math.max(0, Number(p.repostCount ?? 0)),
        }));
        if (action.payload.number === 0) {
          state.profileReels = normalized;
        } else {
          state.profileReels = [...state.profileReels, ...normalized];
        }
        state.reelsHasMore = !action.payload.last;
        state.reelsPage = action.payload.number;
      })
      .addCase(fetchProfileReels.rejected, (state, action) => {
        state.reelsLoading = false;
        state.reelsError = action.payload as string;
      });

    // ===== 사용자별 포스트 리듀서 =====

    // 특정 사용자의 포스트 조회
    builder
      .addCase(fetchUserPosts.pending, (state) => {
        // state.userPostsLoading = true; // Removed as per edit hint
        // state.userPostsError = null; // Removed as per edit hint
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        // state.userPostsLoading = false; // Removed as per edit hint
        // const normalized = action.payload.content.map((p: any) => ({ // Removed as per edit hint
        //   ...p, // Removed as per edit hint
        //   likeCount: Math.max(0, Number(p.likeCount ?? 0)), // Removed as per edit hint
        //   repostCount: Math.max(0, Number(p.repostCount ?? 0)), // Removed as per edit hint
        // })); // Removed as per edit hint
        // if (action.payload.number === 0) { // Removed as per edit hint
        //   state.userPosts = normalized; // Removed as per edit hint
        // } else { // Removed as per edit hint
        //   state.userPosts = [...state.userPosts, ...normalized]; // Removed as per edit hint
        // } // Removed as per edit hint
        // state.userPostsHasMore = !action.payload.last; // Removed as per edit hint
        // state.userPostsPage = action.payload.number; // Removed as per edit hint
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        // state.userPostsLoading = false; // Removed as per edit hint
        // state.userPostsError = action.payload as string; // Removed as per edit hint
      });
  },
});

export const {
  setFeedLoading,
  setFeedError,
  clearFeedError,
  resetFeed,
  setProfileLoading,
  setProfileError,
  clearProfileError,
  resetProfile,
  setGlobalLoading,
  setGlobalError,
  clearGlobalError,
  resetAll,
} = postSlice.actions;

export default postSlice.reducer;
