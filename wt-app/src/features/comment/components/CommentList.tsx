import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { fetchCommentsByPost, clearComments } from "../store/commentSlice";
import CommentItem from "./CommentItem";
import CommentComposer from "./CommentComposer";
import type { Comment } from "../type/commentTypes";
import "../../../css/comment.css";

interface CommentListProps {
  postId: number;
  parentCommentId?: number | null;
  maxComments?: number;
  showComposer?: boolean;
  showCommentForm?: boolean;
  onCommentUpdate?: () => void;
}

const CommentList: React.FC<CommentListProps> = ({
  postId,
  parentCommentId = null,
  maxComments,
  showComposer = true,
  showCommentForm: externalShowCommentForm = false,
  onCommentUpdate,
}) => {
  const dispatch = useAppDispatch();
  const { comments, loading, error, hasMore, page } = useAppSelector(
    (state) => state.comment
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [internalShowCommentForm, setInternalShowCommentForm] = useState(false);

  // 외부에서 전달받은 showCommentForm이 있으면 사용, 없으면 내부 상태 사용
  const showCommentForm =
    externalShowCommentForm !== undefined
      ? externalShowCommentForm
      : internalShowCommentForm;

  useEffect(() => {
    // 댓글 목록 조회
    dispatch(fetchCommentsByPost({ postId, page: 0 }));

    return () => {
      // 컴포넌트 언마운트 시 댓글 상태 초기화
      dispatch(clearComments());
    };
  }, [dispatch, postId]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      await dispatch(fetchCommentsByPost({ postId, page: page + 1 })).unwrap();
    } catch (error) {
      console.error("댓글 추가 로드 실패:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleCommentSuccess = () => {
    onCommentUpdate?.();
  };

  const displayedComments = maxComments
    ? comments.slice(0, maxComments)
    : comments;

  // 댓글이 없거나 에러가 있는 경우 - 댓글 작성 폼은 여전히 표시
  const shouldShowEmptyMessage = error || comments.length === 0;

  return (
    <div className="comment-list">
      {/* 댓글 작성 폼 */}
      {showComposer && showCommentForm && (
        <div className="mb-6">
          <CommentComposer
            postId={postId}
            parentCommentId={parentCommentId}
            onSuccess={() => {
              handleCommentSuccess();
              setInternalShowCommentForm(false); // 작성 완료 후 폼 숨김
            }}
            onCancel={() => setInternalShowCommentForm(false)}
          />
        </div>
      )}

      {/* 댓글 목록 */}
      <div className="comment-list-items">
        {shouldShowEmptyMessage ? (
          <div className="comment-list-empty">
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-3">💬</div>
              <p className="text-gray-500 text-lg mb-2">아직 댓글이 없습니다</p>
              <p className="text-gray-400 text-sm">
                첫 번째 댓글을 작성해보세요!
              </p>
            </div>
          </div>
        ) : (
          displayedComments.map((comment) => (
            <div key={comment.id}>
              {/* 리포스트 정보 표시 */}
              {comment.repostedBy && (
                <div className="repost-info text-sm text-gray-500 mb-2">
                  🔄 {comment.repostedBy}님이 리포스트했습니다
                </div>
              )}
              <CommentItem
                comment={comment}
                postId={postId}
                onReplySuccess={handleCommentSuccess}
                onEditSuccess={handleCommentSuccess}
              />
            </div>
          ))
        )}
      </div>

      {/* 더 보기 버튼 */}
      {hasMore && !maxComments && (
        <div className="comment-list-load-more">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="comment-list-load-more-btn"
          >
            {isLoadingMore ? "로딩 중..." : "댓글 더 보기"}
          </button>
        </div>
      )}

      {/* 제한된 댓글 표시 시 전체 보기 링크 */}
      {maxComments && comments.length > maxComments && (
        <div className="comment-list-view-all">
          <button className="comment-list-view-all-btn">
            댓글 {comments.length}개 모두 보기
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentList;
