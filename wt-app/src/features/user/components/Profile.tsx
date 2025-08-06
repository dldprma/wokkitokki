import React, { useState, useEffect } from "react";
import { useUser } from "../../user/hooks/useUser";
import { useAuth } from "../../auth/hooks/useAuth";
import "../../../css/Profile.css";
import ProfileImage from "./ProfileImage";

const Profile: React.FC = () => {
  const { user, loading, getProfile } = useUser();
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts");

  useEffect(() => {
    if (authUser) {
      getProfile();
    }
  }, [authUser]);

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}년 ${month}월에 가입`;
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* 프로필 카드 */}
      <div className="profile-card">
        <div className="profile-header">
          <ProfileImage
            imageUrl={user?.profileImage}
            username={user?.username || ""}
            size="lg"
            className="profile-avatar"
          />
          <div className="profile-info">
            <h1 className="profile-name">{user?.fullName}</h1>
            <p className="profile-join-date">
              📅{" "}
              {user?.createdAt
                ? formatJoinDate(user.createdAt)
                : "가입일 정보 없음"}
            </p>
          </div>
        </div>

        {/* 통계 */}
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-number">{user?.postsCount || 0}</span>
            <span className="stat-label">게시글</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{user?.followersCount || 0}</span>
            <span className="stat-label">팔로워</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{user?.followingCount || 0}</span>
            <span className="stat-label">팔로잉</span>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="profile-actions">
          <button className="profile-action-btn">
            <span className="action-icon">✏️</span>
            프로필 편집
          </button>
          <button className="profile-action-btn">
            <span className="action-icon">⚙️</span>
            설정
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === "posts" ? "active" : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          게시글 ({user?.postsCount || 0})
        </button>
        <button
          className={`profile-tab ${activeTab === "reels" ? "active" : ""}`}
          onClick={() => setActiveTab("reels")}
        >
          Reels ({user?.reelsCount || 0})
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="profile-content">
        {activeTab === "posts" && (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3 className="empty-title">아직 게시글이 없습니다</h3>
            <p className="empty-description">첫 번째 게시글을 작성해보세요!</p>
            <button className="empty-action-btn">
              <span className="action-icon">✨</span>
              게시글 작성하기
            </button>
          </div>
        )}

        {activeTab === "reels" && (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <h3 className="empty-title">아직 Reels가 없습니다</h3>
            <p className="empty-description">첫 번째 Reels를 만들어보세요!</p>
            <button className="empty-action-btn">
              <span className="action-icon">✨</span>
              Reels 만들기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
