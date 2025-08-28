import React from "react";
import { useNavigate } from "react-router-dom";
import type { Comment } from "../type/commentTypes";
import "../../../css/comment.css";

interface CommentPreviewProps {
  comments: Comment[];
  postId: number;
  maxComments?: number;
}

const CommentPreview: React.FC<CommentPreviewProps> = ({
  comments,
  postId,
  maxComments = 2,
}) => {
  const navigate = useNavigate();

  if (!comments || comments.length === 0) {
    return null;
  }

  const visibleComments = comments.slice(0, maxComments);
  const hasMoreComments = comments.length > maxComments;

  const handleViewAllComments = () => {
    navigate(`/post/${postId}`);
  };

  const handleUserClick = (username: string) => {
    navigate(`/${username}`);
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="comment-preview">
      {visibleComments.map((comment) => (
        <div key={comment.id} className="comment-preview-item">
          <div className="comment-preview-header">
            <span className="comment-preview-author">{comment.authorName}</span>
            <span className="comment-preview-content">{comment.content}</span>
          </div>

          {/* 댓글 상호작용 미리보기 */}
          <div className="comment-preview-actions">
            {comment.replyCount > 0 && (
              <span className="comment-preview-action">
                💬 {formatCount(comment.replyCount)}
              </span>
            )}
            {comment.likeCount > 0 && (
              <span className="comment-preview-action">
                ♥ {formatCount(comment.likeCount)}
              </span>
            )}
          </div>
        </div>
      ))}

      {hasMoreComments && (
        <button
          onClick={handleViewAllComments}
          className="comment-preview-more"
        >
          댓글 {comments.length}개 모두 보기
        </button>
      )}
    </div>
  );
};

export default CommentPreview;
