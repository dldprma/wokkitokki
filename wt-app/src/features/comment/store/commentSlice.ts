import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentState,
} from "../type/commentTypes";
import {
  getCommentsByPost,
  getRepliesByComment,
  createComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  toggleCommentRepost,
  toggleCommentDm,
} from "../api/commentApi";

// 댓글 목록 조회 (게시글별)
export const fetchCommentsByPost = createAsyncThunk(
  "comment/fetchCommentsByPost",
  async ({ postId, page = 0 }: { postId: number; page?: number }) => {
    const response = await getCommentsByPost(postId, page);
    return response;
  }
);

// 대댓글 목록 조회
export const fetchRepliesByComment = createAsyncThunk(
  "comment/fetchRepliesByComment",
  async ({ commentId, page = 0 }: { commentId: number; page?: number }) => {
    const response = await getRepliesByComment(commentId, page);
    return response;
  }
);

// 댓글 작성
export const addComment = createAsyncThunk(
  "comment/addComment",
  async (data: CreateCommentRequest) => {
    const response = await createComment(data);
    return response;
  }
);

// 댓글 수정
export const editComment = createAsyncThunk(
  "comment/editComment",
  async ({
    commentId,
    data,
  }: {
    commentId: number;
    data: UpdateCommentRequest;
  }) => {
    const response = await updateComment(commentId, data);
    return { commentId, ...response };
  }
);

// 댓글 삭제
export const removeComment = createAsyncThunk(
  "comment/removeComment",
  async (commentId: number) => {
    await deleteComment(commentId);
    return commentId;
  }
);

// 댓글 좋아요 토글
export const toggleLike = createAsyncThunk(
  "comment/toggleLike",
  async (commentId: number) => {
    const response = await toggleCommentLike(commentId);
    return { commentId, ...response };
  }
);

// 댓글 리포스트 토글
export const toggleRepost = createAsyncThunk(
  "comment/toggleRepost",
  async (commentId: number) => {
    const response = await toggleCommentRepost(commentId);
    return { commentId, ...response };
  }
);

// 댓글 DM 토글
export const toggleDm = createAsyncThunk(
  "comment/toggleDm",
  async (commentId: number) => {
    const response = await toggleCommentDm(commentId);
    return { commentId, ...response };
  }
);

const initialState: CommentState = {
  comments: [],
  loading: false,
  error: null,
  hasMore: false,
  page: 0,
};

const commentSlice = createSlice({
  name: "comment",
  initialState,
  reducers: {
    clearComments: (state) => {
      state.comments = [];
      state.page = 0;
      state.hasMore = false;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // 댓글 목록 조회
    builder
      .addCase(fetchCommentsByPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommentsByPost.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.number === 0) {
          // 첫 페이지면 기존 댓글 교체
          state.comments = action.payload.content;
        } else {
          // 추가 페이지면 기존 댓글에 추가
          state.comments.push(...action.payload.content);
        }
        state.hasMore = action.payload.hasNext;
        state.page = action.payload.number;
      })
      .addCase(fetchCommentsByPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "댓글을 불러오는데 실패했습니다.";
      });

    // 대댓글 목록 조회
    builder.addCase(fetchRepliesByComment.fulfilled, (state, action) => {
      const { content, hasNext } = action.payload;
      // 부모 댓글을 찾아서 replies 업데이트
      const updateReplies = (
        comments: Comment[],
        parentId: number
      ): Comment[] => {
        return comments.map((comment) => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: content,
              hasMoreReplies: hasNext,
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateReplies(comment.replies, parentId),
            };
          }
          return comment;
        });
      };
      state.comments = updateReplies(state.comments, action.meta.arg.commentId);
    });

    // 댓글 작성
    builder.addCase(addComment.fulfilled, (state, action) => {
      const newComment = action.payload;
      if (newComment.parentCommentId) {
        // 대댓글인 경우
        const updateReplies = (
          comments: Comment[],
          parentId: number
        ): Comment[] => {
          return comments.map((comment) => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment],
                replyCount: (comment.replyCount || 0) + 1,
              };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: updateReplies(comment.replies, parentId),
              };
            }
            return comment;
          });
        };
        state.comments = updateReplies(
          state.comments,
          newComment.parentCommentId as number
        );
      } else {
        // 최상위 댓글인 경우 맨 위에 추가
        state.comments.unshift(newComment);
      }
    });

    // 댓글 수정
    builder.addCase(editComment.fulfilled, (state, action) => {
      const { commentId, ...updatedComment } = action.payload;
      const updateCommentInList = (
        comments: Comment[],
        targetId: number
      ): Comment[] => {
        return comments.map((comment) => {
          if (comment.id === targetId) {
            return { ...comment, ...updatedComment };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateCommentInList(comment.replies, targetId),
            };
          }
          return comment;
        });
      };
      state.comments = updateCommentInList(state.comments, commentId);
    });

    // 댓글 삭제
    builder.addCase(removeComment.fulfilled, (state, action) => {
      const commentId = action.payload;
      const removeCommentFromList = (
        comments: Comment[],
        targetId: number
      ): Comment[] => {
        return comments
          .map((comment) => {
            if (comment.id === targetId) {
              return null; // 삭제할 댓글
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: removeCommentFromList(comment.replies, targetId),
              };
            }
            return comment;
          })
          .filter((comment): comment is Comment => comment !== null);
      };
      state.comments = removeCommentFromList(state.comments, commentId);
    });

    // 댓글 좋아요 토글
    builder.addCase(toggleLike.fulfilled, (state, action) => {
      const { commentId, isLiked, likeCount } = action.payload;
      const updateLikeInList = (
        comments: Comment[],
        targetId: number
      ): Comment[] => {
        return comments.map((comment) => {
          if (comment.id === targetId) {
            return { ...comment, isLiked, likeCount };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateLikeInList(comment.replies, targetId),
            };
          }
          return comment;
        });
      };
      state.comments = updateLikeInList(state.comments, commentId);
    });

    // 댓글 리포스트 토글
    builder.addCase(toggleRepost.fulfilled, (state, action) => {
      const { commentId, isReposted, repostCount } = action.payload;
      const updateRepostInList = (
        comments: Comment[],
        targetId: number
      ): Comment[] => {
        return comments.map((comment) => {
          if (comment.id === targetId) {
            return { ...comment, isReposted, repostCount };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateRepostInList(comment.replies, targetId),
            };
          }
          return comment;
        });
      };
      state.comments = updateRepostInList(state.comments, commentId);
    });

    // 댓글 DM 토글
    builder.addCase(toggleDm.fulfilled, (state, action) => {
      const { commentId, isDmSent, dmCount } = action.payload;
      const updateDmInList = (
        comments: Comment[],
        targetId: number
      ): Comment[] => {
        return comments.map((comment) => {
          if (comment.id === targetId) {
            return { ...comment, isDmSent, dmCount };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateDmInList(comment.replies, targetId),
            };
          }
          return comment;
        });
      };
      state.comments = updateDmInList(state.comments, commentId);
    });
  },
});

export const { clearComments, setError } = commentSlice.actions;
export default commentSlice.reducer;
