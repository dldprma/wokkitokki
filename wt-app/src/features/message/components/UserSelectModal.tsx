import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMessage } from "../hooks/useMessage";
import { useAuth } from "../../auth/hooks/useAuth";
import { getFollowing } from "../../user/api/userApi";
import { searchUsers } from "../../search/api/searchApi";
import type { User } from "../types/messageTypes";
import type { UserProfile } from "../../user/types/userTypes";
import type { UserSearchResult } from "../../search/types/searchTypes";
import "../../../css/UserSelectModal.css";

interface UserSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareContent?: {
    type: "post" | "comment";
    content: string;
    imageUrl?: string;
    authorName: string;
    postId?: string;
  };
}

const UserSelectModal: React.FC<UserSelectModalProps> = ({
  isOpen,
  onClose,
  shareContent,
}) => {
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const navigate = useNavigate();
  const { createRoom } = useMessage();
  const { user } = useAuth();

  // 팔로잉 사용자 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadFollowingUsers();
    }
  }, [isOpen]);

  // 검색어 변경 시 검색 실행
  useEffect(() => {
    if (searchQuery.trim()) {
      setShowSearchResults(true);
      const timeoutId = setTimeout(() => {
        performUserSearch(searchQuery.trim());
      }, 300); // 300ms 디바운스
      return () => clearTimeout(timeoutId);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadFollowingUsers = async () => {
    if (!user?.username) {
      console.error("사용자 정보가 없습니다.");
      return;
    }

    setLoading(true);
    try {
      const response = await getFollowing(user.username, 0, 50);
      const users: User[] = response.content.map(
        (userProfile: UserProfile) => ({
          id: userProfile.id.toString(),
          username: userProfile.username,
          name: userProfile.fullName || userProfile.username,
          profileImage: userProfile.profileImgUrl,
          isOnline: false, // 온라인 상태는 별도 API가 필요
          lastSeen: new Date().toISOString(), // 마지막 접속 시간도 별도 API 필요
        })
      );
      setFollowingUsers(users);
    } catch (error) {
      console.error("팔로잉 사용자 목록 로드 실패:", error);

      // API 실패 시 데모 데이터 사용
      const demoUsers: User[] = [
        {
          id: "user1",
          username: "kimcheolsu",
          name: "김철수",
          profileImage:
            "/uploads/profiles/5bf502c0-bf6a-4115-82f0-d7312120c2dc.jpg",
          isOnline: true,
          lastSeen: new Date().toISOString(),
        },
        {
          id: "user2",
          username: "parkyounghee",
          name: "박영희",
          profileImage:
            "/uploads/profiles/30420fe2-38d4-41ce-9a60-35ee35e1ac81.png",
          isOnline: false,
          lastSeen: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "user3",
          username: "leeminsu",
          name: "이민수",
          profileImage:
            "/uploads/profiles/47e29840-a6d0-4fb9-8c0e-43f8aae2f7ca.jpg",
          isOnline: true,
          lastSeen: new Date().toISOString(),
        },
      ];
      setFollowingUsers(demoUsers);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 검색 함수
  const performUserSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setSearchLoading(true);
    try {
      const response = await searchUsers(query, 0, 20);
      const users: User[] = response.content.map(
        (searchResult: UserSearchResult) => ({
          id: searchResult.id.toString(),
          username: searchResult.username,
          name: searchResult.fullName || searchResult.username,
          profileImage: searchResult.profileImgUrl,
          isOnline: false, // 온라인 상태는 별도 API가 필요
          lastSeen: new Date().toISOString(), // 마지막 접속 시간도 별도 API 필요
        })
      );
      setSearchResults(users);
    } catch (error) {
      console.error("사용자 검색 실패:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleUserSelect = async (user: User) => {
    console.log("선택된 사용자:", user);
    console.log("사용자 ID:", user.id);
    console.log("사용자 username:", user.username);

    try {
      // 채팅방 생성 또는 기존 채팅방으로 이동 (username 사용)
      const roomId = await createRoom(user.username);
      console.log("생성된 roomId:", roomId);

      // 임시 채팅방인 경우 사용자 정보를 추가로 저장
      if (roomId.startsWith("temp-")) {
        const userInfo = {
          id: user.id,
          username: user.username,
          name: user.name,
          profileImage: user.profileImage,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        };
        localStorage.setItem(`temp-user-${roomId}`, JSON.stringify(userInfo));
      }

      onClose();
      navigate(`/messages/${roomId}`);
    } catch (error) {
      console.error("채팅방 생성 실패:", error);
      alert("채팅방 생성에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 검색 기능 개선 - 이름과 사용자명 모두 검색 가능
  const filteredUsers = followingUsers.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-select-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {shareContent
              ? `${shareContent.authorName}님의 ${
                  shareContent.type === "post" ? "게시글" : "댓글"
                } 공유`
              : "메시지 보낼 사람 선택"}
          </h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 공유할 내용 미리보기 */}
        {shareContent && (
          <div className="share-preview">
            <div className="share-preview-header">
              <span className="share-preview-label">공유할 내용:</span>
            </div>
            <div className="share-preview-content">
              <div className="share-preview-text">
                <strong>{shareContent.authorName}</strong>:{" "}
                {shareContent.content}
              </div>
              {shareContent.imageUrl && (
                <div className="share-preview-image">
                  <img
                    src={shareContent.imageUrl}
                    alt="공유할 이미지"
                    className="share-preview-img"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="search-container">
          <input
            type="text"
            placeholder="사용자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="users-list">
          {showSearchResults ? (
            // 검색 결과 표시
            <>
              {searchLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>검색 중...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p>`"${searchQuery}"에 대한 검색 결과가 없습니다`</p>
                  <p className="search-suggestion">
                    다른 검색어를 시도해보세요
                  </p>
                </div>
              ) : (
                <>
                  <div className="section-header">
                    <h4>검색 결과 ({searchResults.length})</h4>
                  </div>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="user-item"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="user-avatar-container">
                        <img
                          src={user.profileImage || "/default-avatar.png"}
                          alt={user.name}
                          className="user-avatar"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/default-avatar.png";
                          }}
                        />
                        {user.isOnline && (
                          <div className="online-indicator"></div>
                        )}
                      </div>
                      <div className="user-info">
                        <h3 className="user-name">{user.name}</h3>
                        <p className="user-status">
                          {user.isOnline ? "온라인" : "오프라인"}
                        </p>
                      </div>
                      <div className="message-icon">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            // 팔로잉 목록 표시
            <>
              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>팔로잉 목록을 불러오는 중...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <p>팔로잉한 사용자가 없습니다</p>
                  <p className="search-suggestion">
                    검색창에 사용자 이름을 입력해보세요
                  </p>
                </div>
              ) : (
                <>
                  <div className="section-header">
                    <h4>팔로잉 ({filteredUsers.length})</h4>
                  </div>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="user-item"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="user-avatar-container">
                        <img
                          src={user.profileImage || "/default-avatar.png"}
                          alt={user.name}
                          className="user-avatar"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/default-avatar.png";
                          }}
                        />
                        {user.isOnline && (
                          <div className="online-indicator"></div>
                        )}
                      </div>

                      <div className="user-info">
                        <h3 className="user-name">{user.name}</h3>
                        <p className="user-status">
                          {user.isOnline ? "온라인" : "오프라인"}
                        </p>
                      </div>

                      <div className="message-icon">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSelectModal;
