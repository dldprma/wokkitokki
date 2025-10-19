import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Reel } from "../types/reelsTypes";

interface ReelInfoProps {
  reel: Reel;
}

const ReelInfo: React.FC<ReelInfoProps> = ({ reel }) => {
  const navigate = useNavigate();
  const [showFullDescription, setShowFullDescription] = useState(false);

  // 해시태그 클릭 (백엔드 구조에 맞춰 단순화)
  const handleHashtagClick = (hashtag: string) => {
    navigate(`/reels?hashtag=${hashtag.substring(1)}`);
  };

  // 작성자 프로필 클릭
  const handleAuthorClick = () => {
    navigate(`/${reel.username}`);
  };

  // 더보기 토글
  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  // 설명이 긴지 확인 (3줄 이상)
  const isLongDescription = reel.description && reel.description.length > 100;

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

  return (
    <div className="reel-info">
      {/* 작성자 정보 */}
      <div className="reel-author" onClick={handleAuthorClick}>
        <div className="author-avatar">
          {reel.authorProfileImg ? (
            <img
              src={reel.authorProfileImg}
              alt={reel.authorFullName || reel.username}
              className="avatar-image"
              onError={(e) => {
                // 프로필 이미지 로드 실패 시 placeholder 표시
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const placeholder = target.nextElementSibling as HTMLElement;
                if (placeholder) placeholder.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="avatar-placeholder"
            style={{ display: reel.authorProfileImg ? "none" : "flex" }}
          >
            {(reel.authorFullName || reel.username).charAt(0)}
          </div>
        </div>
        <div className="author-details">
          <div className="author-name">
            {reel.authorFullName || reel.username}
          </div>
          <div className="author-username">@{reel.username}</div>
        </div>
      </div>

      {/* 제목 */}
      {reel.title && (
        <div className="reel-title">
          <h3>{reel.title}</h3>
        </div>
      )}

      {/* 설명 */}
      {reel.description && (
        <div className="reel-description-container">
          <div
            className={`reel-description ${
              showFullDescription ? "full" : "preview"
            }`}
          >
            {reel.description}
          </div>
          {isLongDescription && (
            <button
              className="more-button"
              onClick={toggleDescription}
              type="button"
            >
              {showFullDescription ? "접기" : "더보기"}
            </button>
          )}
        </div>
      )}

      {/* 메타 정보 */}
      <div className="reel-meta">
        <span className="reel-date">{formatDate(reel.createdAt)}</span>
        {reel.durationSeconds && (
          <span className="reel-duration">
            {Math.floor(reel.durationSeconds)}초
          </span>
        )}
        {reel.viewCount > 0 && (
          <span className="reel-views">
            조회수 {reel.viewCount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default ReelInfo;
