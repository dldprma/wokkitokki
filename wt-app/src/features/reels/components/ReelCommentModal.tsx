import React, { useState, useEffect } from "react";
import { reelsApi } from "../api/reelsApi";
import type { Reel } from "../types/reelsTypes";

interface ReelCommentModalProps {
  reel: Reel;
  isOpen: boolean;
  onClose: () => void;
}

interface Comment {
  id: number;
  content: string;
  userId: number;
  username: string;
  authorFullName?: string;
  authorProfileImg?: string;
  createdAt: string;
  parentCommentId?: number;
  replies?: Comment[];
}

const ReelCommentModal: React.FC<ReelCommentModalProps> = ({
  reel,
  isOpen,
  onClose,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 댓글 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, reel.id]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await reelsApi.getReelComments(reel.id);
      setComments(response.content || []);
    } catch (error) {
      console.error("댓글 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 댓글 작성
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await reelsApi.commentReel(reel.id, newComment.trim());
      setNewComment("");
      loadComments(); // 댓글 목록 새로고침
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      alert("댓글 작성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "방금 전";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)}일 전`;

    return date.toLocaleDateString("ko-KR");
  };

  if (!isOpen) return null;

  return (
    <div className="comment-modal-overlay" onClick={onClose}>
      <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="comment-modal-header">
          <h3>댓글 {reel.commentCount}</h3>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="comment-modal-content">
          {isLoading ? (
            <div className="comment-loading">
              <div className="loading-spinner"></div>
              <p>댓글을 불러오는 중...</p>
            </div>
          ) : (
            <div className="comment-list">
              {comments.length === 0 ? (
                <div className="comment-empty">
                  <p>첫 번째 댓글을 작성해보세요!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.authorProfileImg ? (
                        <img
                          src={comment.authorProfileImg}
                          alt={comment.authorFullName || comment.username}
                          className="avatar-image"
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          {(comment.authorFullName || comment.username).charAt(
                            0
                          )}
                        </div>
                      )}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author">
                          {comment.authorFullName || comment.username}
                        </span>
                        <span className="comment-date">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div className="comment-text">{comment.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="comment-modal-footer">
          <form onSubmit={handleSubmitComment} className="comment-form">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              maxLength={500}
              disabled={isSubmitting}
              className="comment-input"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="comment-submit-button"
            >
              {isSubmitting ? "작성 중..." : "게시"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReelCommentModal;

