import React, { useState } from "react";
import type { Reel } from "../types/reelsTypes";
import { reelsApi } from "../api/reelsApi";

interface ReelActionsProps {
  reel: Reel;
  onLikeChange?: (isLiked: boolean, likeCount: number) => void;
  onComment?: () => void;
  onShare?: () => void;
}

const ReelActions: React.FC<ReelActionsProps> = ({
  reel,
  onLikeChange,
  onComment,
  onShare,
}) => {
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [isLoading, setIsLoading] = useState(false);

  // 좋아요 토글
  const handleLike = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await reelsApi.likeReel(reel.id);
      // 백엔드 API는 void를 반환하므로 프론트엔드에서 상태 토글
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);
      setLikeCount((prev) => (newIsLiked ? prev + 1 : prev - 1));
      onLikeChange?.(newIsLiked, likeCount + (newIsLiked ? 1 : -1));
    } catch (error) {
      console.error("좋아요 처리 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // DM 공유
  const handleShare = () => {
    onShare?.();
  };

  // 댓글
  const handleComment = () => {
    onComment?.();
  };

  return (
    <div className="reel-actions">
      {/* 좋아요 */}
      <div className="action-item">
        <button
          className={`action-button like ${isLiked ? "active" : ""}`}
          onClick={handleLike}
          disabled={isLoading}
          title="좋아요"
        >
          <span className="action-icon">{isLiked ? "❤️" : "🤍"}</span>
        </button>
        <span className="action-count">{likeCount.toLocaleString()}</span>
      </div>

      {/* 댓글 */}
      <div className="action-item">
        <button
          className="action-button comment"
          onClick={handleComment}
          title="댓글"
        >
          <span className="action-icon">💬</span>
        </button>
        <span className="action-count">
          {(reel.commentCount || 0).toLocaleString()}
        </span>
      </div>

      {/* DM 공유 */}
      <div className="action-item">
        <button
          className="action-button share"
          onClick={handleShare}
          title="DM으로 공유"
        >
          <span className="action-icon">📤</span>
        </button>
        <span className="action-count">{reel.shareCount.toLocaleString()}</span>
      </div>

      {/* 더보기 메뉴 */}
      <div className="action-item">
        <button className="action-button more" title="더보기">
          <span className="action-icon">⋯</span>
        </button>
      </div>
    </div>
  );
};

export default ReelActions;
