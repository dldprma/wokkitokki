import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "../../user/hooks/useUser";
import "../../../css/Nav.css";
import ProfileImage from "../../user/components/ProfileImage";
import { useAuth } from "../../auth/hooks/useAuth";

const Nav: React.FC = () => {
  const location = useLocation();
  const { user } = useUser();
  const { logout } = useAuth();
  const isProfilePage = location.pathname.startsWith("/profile");

  const navItems = [
    {
      path: "/",
      icon: "🏠",
      label: "홈",
      subLabel: "최신 게시글",
    },
    {
      path: "/search",
      icon: "🔍",
      label: "검색",
      subLabel: "사용자 & 콘텐츠",
    },
    {
      path: "/reels",
      icon: "🎬",
      label: "Reels",
      subLabel: "짧은 영상",
    },
    {
      path: "/messages",
      icon: "💬",
      label: "메시지",
      subLabel: "다이렉트 메시지",
    },
    {
      path: "/profile",
      icon: "👤",
      label: "프로필",
      subLabel: "내 계정",
    },
  ];

  return (
    <nav className="nav-container">
      <div className="nav-logo">
        <img
          src="/public/logo.png"
          alt="로고"
          style={{ width: "100px", height: "auto" }}
        />
      </div>

      <div className="nav-items">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${
              location.pathname === item.path
                ? "nav-item-active"
                : "nav-item-inactive"
            }`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <div className="nav-item-content">
              <span className="nav-item-label">{item.label}</span>
              <span className="nav-item-sublabel">{item.subLabel}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <button className="nav-new-post-btn">
          <span className="nav-new-post-icon">✨</span>새 게시글
        </button>
      </div>

      {isProfilePage && (
        <div className="mt-4">
          <button onClick={() => logout()} className="nav-logout-btn">
            <span className="nav-logout-icon">🚪</span>
            로그아웃
          </button>
        </div>
      )}
    </nav>
  );
};

export default Nav;
