import React, { useState } from "react";
import { useAppDispatch } from "../../../store/hooks";
import {
  toggleLike,
  toggleRepost,
  toggleDm,
  removeComment,
} from "../store/commentSlice";
import { useAuth } from "../../auth/hooks/useAuth";
import CommentComposer from "./CommentComposer";
import type { Comment } from "../type/commentTypes";
import "../../../css/comment.css";

interface CommentItemProps {
  comment: Comment;
  postId: number;
  onReplySuccess?: () => void;
  onEditSuccess?: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  onReplySuccess,
  onEditSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isMyComment = user?.id === comment.authorId;

  const handleLike = async () => {
    if (!user) return;
    try {
      await dispatch(toggleLike(comment.id)).unwrap();
    } catch (error) {
      console.error("댓글 좋아요 실패:", error);
    }
  };

  const handleRepost = async () => {
    if (!user) return;
    try {
      await dispatch(toggleRepost(comment.id)).unwrap();
    } catch (error) {
      console.error("댓글 리포스트 실패:", error);
    }
  };

  const handleDm = async () => {
    if (!user) return;
    try {
      await dispatch(toggleDm(comment.id)).unwrap();
    } catch (error) {
      console.error("댓글 DM 실패:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await dispatch(removeComment(comment.id)).unwrap();
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return "방금 전";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}시간 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div className="comment-item">
      {/* 댓글 헤더 */}
      <div className="comment-item-header">
        <div className="comment-item-author">
          <img
            src={comment.authorProfileImgUrl || "/default-avatar.png"}
            alt={comment.authorName}
            className="comment-item-avatar"
          />
          <div className="comment-item-author-info">
            <span className="comment-item-author-name">
              {comment.authorName}
            </span>
            <span className="comment-item-author-username">
              @{comment.authorUsername}
            </span>
            <span className="comment-item-time">
              {formatTime(comment.createdAt)}
            </span>
          </div>
        </div>

        {/* 내 댓글이면 점 세 개 메뉴 */}
        {isMyComment && (
          <div className="comment-item-menu">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="comment-item-menu-btn"
              aria-label="메뉴"
            >
              ⋯
            </button>

            {isMenuOpen && (
              <div className="comment-item-dropdown">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setIsMenuOpen(false);
                  }}
                  className="comment-item-menu-option edit"
                >
                  ✏️ 수정하기
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setIsMenuOpen(false);
                  }}
                  className="comment-item-menu-option delete"
                >
                  🗑️ 삭제하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 댓글 내용 */}
      {isEditing ? (
        <CommentComposer
          postId={postId}
          commentToEdit={comment}
          onSuccess={() => {
            setIsEditing(false);
            onEditSuccess?.();
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="comment-item-content">{comment.content}</div>
      )}

      {/* 댓글 액션바 */}
      <div className="comment-item-actions">
        <button
          onClick={() => setIsReplying(!isReplying)}
          className="comment-item-action-btn reply"
          aria-label="답글"
        >
          💬 {comment.replyCount > 0 && formatCount(comment.replyCount)}
        </button>

        <button
          onClick={handleRepost}
          className={`comment-item-action-btn repost ${
            comment.isReposted ? "active" : ""
          }`}
          aria-label="리포스트"
        >
          🔄 {comment.repostCount > 0 && formatCount(comment.repostCount)}
        </button>

        <button
          onClick={handleLike}
          className={`comment-item-action-btn like ${
            comment.isLiked ? "active" : ""
          }`}
          aria-label="좋아요"
        >
          ♥ {comment.likeCount > 0 && formatCount(comment.likeCount)}
        </button>

        <button
          onClick={handleDm}
          className={`comment-item-action-btn dm ${
            comment.isDmSent ? "active" : ""
          }`}
          aria-label="DM"
        >
          ✉ {comment.dmCount > 0 && formatCount(comment.dmCount)}
        </button>
      </div>

      {/* 답글 작성 폼 */}
      {isReplying && (
        <div className="comment-item-reply-form">
          <CommentComposer
            postId={postId}
            parentCommentId={comment.id}
            onSuccess={() => {
              setIsReplying(false);
              onReplySuccess?.();
            }}
            onCancel={() => setIsReplying(false)}
            placeholder={`@${comment.authorUsername}에게 답글 달기`}
          />
        </div>
      )}

      {/* 대댓글 목록 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-item-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onReplySuccess={onReplySuccess}
              onEditSuccess={onEditSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
