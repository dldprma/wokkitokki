import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../../store/hooks";
import { toggleLike, toggleRepost, removeComment } from "../store/commentSlice";
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
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isMyComment = user?.id === comment.authorId.toString();

  const handleUserClick = (username: string) => {
    navigate(`/${username}`);
  };

  const handleCommentClick = () => {
    navigate(`/comment/${comment.id}`);
  };

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
            src={comment.authorProfileImg || "/default-avatar.png"}
            alt={comment.authorName}
            className="comment-item-avatar cursor-pointer hover:opacity-80"
            onClick={() => handleUserClick(comment.authorUsername)}
          />
          <div className="comment-item-author-info">
            <span
              className="comment-item-author-name cursor-pointer hover:underline"
              onClick={() => handleUserClick(comment.authorUsername)}
            >
              {comment.authorName}
            </span>
            <span
              className="comment-item-author-username cursor-pointer hover:underline"
              onClick={() => handleUserClick(comment.authorUsername)}
            >
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
        <div
          className="comment-item-content cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
          onClick={handleCommentClick}
        >
          {comment.content}
        </div>
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
          {comment.isReposted ? "↪️" : "🔄"}{" "}
          {comment.repostCount > 0 && formatCount(comment.repostCount)}
        </button>

        <button
          onClick={handleLike}
          className={`comment-item-action-btn like ${
            comment.isLiked ? "active" : ""
          }`}
          aria-label="좋아요"
        >
          {comment.isLiked ? "❤️" : "🤍"}{" "}
          {comment.likeCount > 0 && formatCount(comment.likeCount)}
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
