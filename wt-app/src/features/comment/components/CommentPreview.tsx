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
      {/* 연결선 시작 */}
      <div className="comment-preview-connector">
        <div className="comment-preview-connector-line"></div>
      </div>

      {visibleComments.map((comment, index) => (
        <div key={comment.id} className="comment-preview-item">
          {/* 댓글 연결선 */}
          <div className="comment-preview-item-connector">
            <div className="comment-preview-item-line"></div>
          </div>

          <div className="comment-preview-content-wrapper">
            <div className="comment-preview-header">
              <div className="comment-preview-author-info">
                <img
                  src={comment.authorProfileImg || "/default-avatar.png"}
                  alt={comment.authorName}
                  className="comment-preview-avatar"
                  onClick={() => handleUserClick(comment.authorUsername)}
                />
                <div className="comment-preview-author-details">
                  <span className="comment-preview-author-name">
                    {comment.authorName}
                  </span>
                  <span className="comment-preview-author-username">
                    @{comment.authorUsername}
                  </span>
                </div>
              </div>
            </div>

            <div className="comment-preview-text">
              <span className="comment-preview-content">{comment.content}</span>
            </div>

            {/* 댓글 이미지가 있는 경우 */}
            {comment.imageUrl && (
              <div className="comment-preview-image">
                <img
                  src={comment.imageUrl}
                  alt="댓글 이미지"
                  className="comment-preview-image-content"
                />
              </div>
            )}

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
