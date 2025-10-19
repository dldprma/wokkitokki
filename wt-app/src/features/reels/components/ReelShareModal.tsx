import React, { useState, useEffect } from "react";
import { reelsApi } from "../api/reelsApi";
import type { Reel } from "../types/reelsTypes";

interface ReelShareModalProps {
  reel: Reel;
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: number;
  username: string;
  fullName?: string;
  profileImg?: string;
}

const ReelShareModal: React.FC<ReelShareModalProps> = ({
  reel,
  isOpen,
  onClose,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 사용자 목록 로드 (팔로우한 사용자들)
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // 실제로는 팔로우한 사용자 목록 API를 호출해야 함
      // 임시로 더미 데이터 사용
      const dummyUsers: User[] = [
        { id: 1, username: "user1", fullName: "사용자1", profileImg: "" },
        { id: 2, username: "user2", fullName: "사용자2", profileImg: "" },
        { id: 3, username: "user3", fullName: "사용자3", profileImg: "" },
      ];
      setUsers(dummyUsers);
    } catch (error) {
      console.error("사용자 목록 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 사용자 선택/해제
  const toggleUserSelection = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 릴스 공유
  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      alert("공유할 사용자를 선택해주세요.");
      return;
    }

    setIsSharing(true);
    try {
      // 각 선택된 사용자에게 릴스 공유
      for (const userId of selectedUsers) {
        const user = users.find((u) => u.id === userId);
        if (user) {
          await reelsApi.shareReel(
            reel.id,
            [userId] // targetUserIds 배열로 전달
          );
        }
      }

      alert("릴스가 공유되었습니다!");
      onClose();
    } catch (error) {
      console.error("릴스 공유 실패:", error);
      alert("릴스 공유에 실패했습니다.");
    } finally {
      setIsSharing(false);
    }
  };

  // 검색된 사용자 필터링
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.fullName &&
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>릴스 공유</h3>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="share-modal-content">
          {/* 검색 */}
          <div className="share-search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="사용자 검색..."
              className="share-search-input"
            />
          </div>

          {/* 사용자 목록 */}
          <div className="share-user-list">
            {isLoading ? (
              <div className="share-loading">
                <div className="loading-spinner"></div>
                <p>사용자 목록을 불러오는 중...</p>
              </div>
            ) : (
              <>
                {filteredUsers.length === 0 ? (
                  <div className="share-empty">
                    <p>검색 결과가 없습니다.</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`share-user-item ${
                        selectedUsers.includes(user.id) ? "selected" : ""
                      }`}
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <div className="user-avatar">
                        {user.profileImg ? (
                          <img
                            src={user.profileImg}
                            alt={user.fullName || user.username}
                            className="avatar-image"
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            {(user.fullName || user.username).charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="user-info">
                        <div className="user-name">
                          {user.fullName || user.username}
                        </div>
                        <div className="user-username">@{user.username}</div>
                      </div>
                      <div className="user-checkbox">
                        {selectedUsers.includes(user.id) ? "✓" : ""}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* 메시지 입력 */}
          <div className="share-message">
            <label>메시지 (선택사항)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="릴스와 함께 보낼 메시지를 입력하세요..."
              maxLength={500}
              rows={3}
              className="share-message-input"
            />
            <div className="char-count">{message.length}/500</div>
          </div>
        </div>

        <div className="share-modal-footer">
          <button
            className="share-cancel-button"
            onClick={onClose}
            disabled={isSharing}
          >
            취소
          </button>
          <button
            className="share-confirm-button"
            onClick={handleShare}
            disabled={isSharing || selectedUsers.length === 0}
          >
            {isSharing ? "공유 중..." : `공유하기 (${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReelShareModal;
