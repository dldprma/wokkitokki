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
    { rejectWithValue, getState }
  ) => {
    try {
      const response = await getFeedPosts(page, size);
      const state = getState() as any;
      const currentUsername = state.auth.user?.username || "알 수 없음";

      return { ...response, page, currentUsername };
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

// 상세조회에서 리포스트 시 사용할 액션
export const togglePostRepostFromDetail = createAsyncThunk(
  "home/toggleRepostFromDetail",
  async (
    { postId, postData }: { postId: number; postData: any },
    { rejectWithValue, getState }
  ) => {
    try {
      const response = await toggleRepost(postId);
      const state = getState() as any;
      const currentUsername = state.auth.user?.username || "알 수 없음";

      return {
        postId,
        isReposted: response.isReposted,
        repostCount: response.repostCount,
        currentUsername,
        postData, // 게시글 정보 포함
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
    // 댓글 리포스트 추가
    addCommentRepost: (
      state,
      action: PayloadAction<{ comment: any; username: string }>
    ) => {
      const { comment, username } = action.payload;
      // 댓글을 홈 피드 맨 위에 추가
      (state as any).posts.unshift({
        ...comment,
        id: `comment-${comment.id}`, // 댓글임을 구분하기 위한 ID
        isComment: true,
        reposted: true,
        repostedBy: username,
        repostedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    },
    // 댓글 리포스트 제거
    removeCommentRepost: (
      state,
      action: PayloadAction<{ commentId: number; username: string }>
    ) => {
      const { commentId, username } = action.payload;
      // 해당 사용자가 리포스트한 댓글을 찾아서 제거
      (state as any).posts = (state as any).posts.filter(
        (post: any) =>
          !(
            post.isComment &&
            post.id === `comment-${commentId}` &&
            post.repostedBy === username
          )
      );
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

        // 백엔드 응답 구조에 맞게 데이터 정규화
        const normalized = action.payload.content.map((item: any) => {
          // PostWithCommentsDto 구조인지 확인 (백엔드 구조와 정확히 일치)
          if (item.post && Array.isArray(item.relevantComments)) {
            // PostWithCommentsDto 구조인 경우 - 안정적 고유 id 주입 및 리포스트 정보 확인
            const stableId = `pwc-${item.post.id}-${
              item.relevantComments?.[0]?.id ?? "none"
            }`;

            if (item.post.repostedBy) {
              // 리포스트된 게시글인 경우 리포스트 정보 표시
              return {
                ...item,
                id: stableId,
                post: {
                  ...item.post,
                  isRepost: true,
                  reposted: true,
                  repostedBy: item.post.repostedBy,
                  repostedAt: item.post.repostedAt,
                },
              };
            } else if (item.post.reposted) {
              // reposted가 true인데 repostedBy가 없는 경우, 임시로 설정
              return {
                ...item,
                id: stableId,
                post: {
                  ...item.post,
                  isRepost: true,
                  reposted: true,
                  repostedBy: "알 수 없음",
                  repostedAt: item.post.repostedAt,
                },
              };
            }
            return { ...item, id: stableId };
          } else if (item.content && item.authorName) {
            // 일반 Post 구조인 경우 (리포스트 정보 포함)
            const normalizedPost = {
              ...item,
              likeCount: Math.max(0, Number(item.likeCount ?? 0)),
              repostCount: Math.max(0, Number(item.repostCount ?? 0)),
              commentCount: Math.max(0, Number(item.commentCount ?? 0)),
              liked: Boolean(item.liked ?? false),
              reposted: Boolean(item.reposted ?? false),
              isRepost: Boolean(item.isRepost ?? false),
              repostedBy: item.repostedBy || null,
              repostedAt: item.repostedAt || null,
            };

            // 리포스트된 게시글인 경우 리포스트 정보 표시
            if (normalizedPost.repostedBy) {
              normalizedPost.isRepost = true;
              normalizedPost.reposted = true;
            } else if (normalizedPost.reposted) {
              // reposted가 true인데 repostedBy가 없는 경우, 임시로 설정
              normalizedPost.repostedBy = "알 수 없음";
              normalizedPost.isRepost = true;
            }

            return normalizedPost as any;
          } else {
            // 기타 구조 (Comment 등)
            return item;
          }
        });

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
    builder
      .addCase(togglePostRepost.fulfilled, (state, action) => {
        const { postId, isReposted, currentUsername } = action.payload;

        // 홈 피드에서 해당 게시글 찾기 (리포스트된 게시글 제외)
        let originalPost = (state as any).posts.find(
          (p: any) => p.id === postId && !p.isRepost
        );

        // 홈 피드에 원본 게시글이 없는 경우, 상세조회에서 리포스트한 것으로 간주
        if (!originalPost) {
          // 상세조회에서 리포스트한 경우, 홈 피드에 원본 게시글을 추가
          originalPost = {
            id: postId,
            content: "게시글 내용을 불러올 수 없습니다", // 임시 내용
            authorName: "알 수 없음",
            authorUsername: "unknown",
            authorProfileImg: null,
            imgUrl: null,
            likeCount: 0,
            repostCount: 0,
            commentCount: 0,
            liked: false,
            reposted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // 홈 피드 맨 위에 원본 게시글 추가
          (state as any).posts.unshift(originalPost);
        }

        if (isReposted) {
          // 원본 게시글의 원래 위치 저장 (리포스트 취소 시 복원용)
          const originalPostIndex = (state as any).posts.findIndex(
            (p: any) => p.id === postId
          );

          // 리포스트 추가 시: 새로운 리포스트 게시글을 피드 상단에 추가
          const repostedPost = {
            ...originalPost,
            id: `repost-${postId}-${currentUsername}`, // 고유한 리포스트 ID 생성
            reposted: true,
            repostCount: originalPost.repostCount, // 카운트는 원래대로 유지
            isRepost: true,
            repostedBy: currentUsername,
            repostedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            originalPostId: postId, // 원본 게시글 ID 저장
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
              p.originalPostId === postId
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
          // 리포스트 추가 시: 원본 게시글 상태 업데이트 (리포스트된 게시글은 제외)
          if (!originalPost.isRepost) {
            originalPost.reposted = true;
            originalPost.repostCount = Math.max(
              0,
              originalPost.repostCount + 1
            );
          }
        }
      })

      // 상세조회에서 리포스트 토글
      .addCase(togglePostRepostFromDetail.fulfilled, (state, action) => {
        const { postId, isReposted, currentUsername, postData } =
          action.payload;

        if (isReposted) {
          // 리포스트 추가 시: 게시글을 홈 피드 맨 위에 추가
          // postData가 유효한지 확인하고 기본값 설정
          if (postData && postData.content) {
            const repostedPost = {
              ...postData,
              id: `repost-${postId}-${currentUsername}`, // 고유한 리포스트 ID 생성
              reposted: true,
              isRepost: true,
              repostedBy: currentUsername,
              repostedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              originalPostId: postId, // 원본 게시글 ID 저장
            };

            // 홈 피드 맨 위에 추가
            (state as any).posts.unshift(repostedPost);
          } else {
            // postData가 유효하지 않은 경우 기본 게시글 데이터로 생성
            const repostedPost = {
              id: `repost-${postId}-${currentUsername}`,
              content: "리포스트된 게시글입니다",
              authorName: "알 수 없음",
              authorUsername: "unknown",
              authorProfileImg: null,
              imgUrl: null,
              likeCount: 0,
              repostCount: 0,
              commentCount: 0,
              liked: false,
              reposted: true,
              isRepost: true,
              repostedBy: currentUsername,
              repostedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              originalPostId: postId,
            };

            // 홈 피드 맨 위에 추가
            (state as any).posts.unshift(repostedPost);
          }
        } else {
          // 리포스트 취소 시: 해당 게시글을 홈 피드에서 제거
          (state as any).posts = (state as any).posts.filter(
            (post: any) =>
              !(
                post.originalPostId === postId &&
                post.repostedBy === currentUsername
              )
          );
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
  addCommentRepost,
  removeCommentRepost,
} = homeSlice.actions;
export default homeSlice.reducer;
