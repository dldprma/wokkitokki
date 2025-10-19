import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReelPlayer, { type ReelPlayerRef } from "./ReelPlayer";
import ReelActions from "./ReelActions";
import ReelInfo from "./ReelInfo";
import ReelCommentModal from "./ReelCommentModal";
import ReelShareModal from "./ReelShareModal";
import type { Reel } from "../types/reelsTypes";
import { reelsApi } from "../api/reelsApi";
import "../../../css/Reels.css";

const ReelsContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isMuted, setIsMuted] = useState(true);

  // 모달 상태
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<(ReelPlayerRef | null)[]>([]);
  const isLoadingRef = useRef(false);

  // 초기 로드 및 페이지 포커스 시 리로드
  useEffect(() => {
    loadReels();
  }, []);

  // 페이지가 다시 포커스될 때 릴스 목록 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        loadReels(0, false); // 첫 페이지부터 새로고침
      }
    };

    document.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // 사용자 정보 가져오기
  const fetchUserInfo = async (username: string) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/users/${username}`
      );
      if (response.ok) {
        const userData = await response.json();
        return {
          fullName: userData.fullName,
          profileImg: userData.profileImg,
        };
      }
    } catch (error) {
      console.error(`사용자 ${username} 정보 가져오기 실패:`, error);
    }
    return null;
  };

  // 릴스 목록 로드
  const loadReels = async (pageNum = 0, append = false) => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const keyword = searchParams.get("keyword");
      const hashtag = searchParams.get("hashtag");

      let response;

      // 검색어가 있으면 검색 API 사용
      if (keyword) {
        response = await reelsApi.searchReels(keyword, pageNum, 10);
      }
      // 해시태그가 있으면 해시태그로 검색 (검색 API 사용)
      else if (hashtag) {
        response = await reelsApi.searchReels(`#${hashtag}`, pageNum, 10);
      }
      // 기본은 전체 릴스 목록
      else {
        response = await reelsApi.getReels(pageNum, 10);
      }

      // 릴스별로 사용자 정보 가져오기
      const reelsWithUserInfo = await Promise.all(
        response.content.map(async (reel) => {
          const userInfo = await fetchUserInfo(reel.username);
          return {
            ...reel,
            authorFullName: userInfo?.fullName,
            authorProfileImg: userInfo?.profileImg,
          };
        })
      );

      // Spring Page 응답 구조에 맞게 처리
      if (append) {
        setReels((prev) => [...prev, ...reelsWithUserInfo]);
      } else {
        setReels(reelsWithUserInfo);
      }

      setHasMore(!response.last); // Spring Page의 last 필드 사용
      setPage(pageNum);
    } catch (error) {
      console.error("릴스 로드 실패:", error);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  // 다음 릴스로 이동
  const goToNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (hasMore) {
      loadReels(page + 1, true);
    }
  }, [currentIndex, reels.length, hasMore, page]);

  // 이전 릴스로 이동
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // 스크롤 이벤트 처리
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget;
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollHeight = container.scrollHeight;

      // 스크롤 위치에 따른 릴스 인덱스 계산
      const newIndex = Math.round(scrollTop / containerHeight);

      if (
        newIndex !== currentIndex &&
        newIndex >= 0 &&
        newIndex < reels.length
      ) {
        setCurrentIndex(newIndex);
      }

      // 하단 도달 시 다음 페이지 로드
      if (
        scrollTop + containerHeight >= scrollHeight - 100 &&
        hasMore &&
        !isLoading
      ) {
        loadReels(page + 1, true);
      }
    },
    [currentIndex, reels.length, hasMore, isLoading, page]
  );

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          goToPrevious();
          break;
        case "ArrowDown":
          e.preventDefault();
          goToNext();
          break;
        case " ":
          e.preventDefault();
          toggleMute();
          break;
        case "Escape":
          navigate(-1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, navigate]);

  // 음소거 토글
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // 댓글 모달 열기
  const handleComment = (reel: Reel) => {
    setSelectedReel(reel);
    setShowCommentModal(true);
  };

  // 공유 모달 열기
  const handleShare = (reel: Reel) => {
    setSelectedReel(reel);
    setShowShareModal(true);
  };

  // 모달 닫기
  const handleCloseModals = () => {
    setShowCommentModal(false);
    setShowShareModal(false);
    setSelectedReel(null);
  };

  // 릴스 만들기 페이지로 이동
  const handleOpenCreatePage = () => {
    navigate("/reels/create");
  };

  if (isLoading && reels.length === 0) {
    return (
      <div className="reels-loading">
        <div className="loading-spinner"></div>
        <p>릴스를 불러오는 중...</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="reels-empty">
        <div className="empty-icon">🎬</div>
        <h3>릴스가 없습니다</h3>
        <p>첫 번째 릴스를 만들어보세요!</p>
        <button className="create-reel-button" onClick={handleOpenCreatePage}>
          릴스 만들기
        </button>
      </div>
    );
  }

  return (
    <div className="reels-page">
      {/* 상단 네비게이션 */}
      <div className="reels-header">
        <div></div>
        <h2>릴스</h2>
        <div className="header-actions">
          <button
            className="create-reel-header-button"
            onClick={handleOpenCreatePage}
          >
            ➕ 만들기
          </button>
          <button className="mute-button" onClick={toggleMute}>
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      {/* 릴스 컨테이너 */}
      <div
        className="reels-container"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            className={`reel-item ${index === currentIndex ? "active" : ""}`}
            style={{ transform: `translateY(${index * 100}vh)` }}
          >
            <div className="reel-video-container">
              <ReelPlayer
                ref={(ref) => {
                  playerRefs.current[index] = ref;
                }}
                reel={reel}
                isActive={index === currentIndex}
                autoPlay={index === currentIndex}
                muted={isMuted}
                loop={true}
              />
            </div>

            <div className="reel-content">
              {/* 릴스 정보 */}
              <div className="reel-info-container">
                <ReelInfo reel={reel} />
              </div>

              {/* 액션 버튼들 */}
              <div className="reel-actions-container">
                <ReelActions
                  reel={reel}
                  onComment={() => handleComment(reel)}
                  onShare={() => handleShare(reel)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <div className="reels-loading-more">
          <div className="loading-spinner"></div>
        </div>
      )}

      {/* 댓글 모달 */}
      {selectedReel && (
        <ReelCommentModal
          reel={selectedReel}
          isOpen={showCommentModal}
          onClose={handleCloseModals}
        />
      )}

      {/* 공유 모달 */}
      {selectedReel && (
        <ReelShareModal
          reel={selectedReel}
          isOpen={showShareModal}
          onClose={handleCloseModals}
        />
      )}
    </div>
  );
};

export default ReelsContent;
