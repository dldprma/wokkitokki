import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMessage } from "../hooks/useMessage";
import type { ChatRoomInfo } from "../types/messageTypes";
import UserSelectModal from "./UserSelectModal";
import "../../../css/ChatRoomList.css";

interface ChatRoomItemProps {
  room: ChatRoomInfo;
}

const ChatRoomItem: React.FC<ChatRoomItemProps> = ({ room }) => {
  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;

    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const getLastMessagePreview = () => {
    if (!room.lastMessage) return "메시지가 없습니다.";

    // lastMessage가 string 타입이므로 직접 사용
    const preview =
      room.lastMessage.length > 50
        ? `${room.lastMessage.substring(0, 50)}...`
        : room.lastMessage;
    return preview;
  };

  // 현재 사용자 정보 가져오기
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  // 상대방 정보 결정
  const isUser1 = room.user1Username === currentUser.username;
  const otherUserName = isUser1 ? room.user2FullName : room.user1FullName;
  const otherUserUsername = isUser1 ? room.user2Username : room.user1Username;
  const otherUserProfileImg = isUser1
    ? room.user2ProfileImg
    : room.user1ProfileImg;
  const isOtherUserOnline = room.isOtherUserOnline;

  return (
    <Link to={`/messages/${otherUserUsername}`} className="chat-room-item">
      <div className="room-avatar-container">
        <img
          src={otherUserProfileImg || "/default-avatar.png"}
          alt={otherUserName}
          className="room-avatar"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/default-avatar.png";
          }}
        />
        {isOtherUserOnline && <div className="online-indicator"></div>}
        {room.unreadCount > 0 && (
          <div className="unread-badge">
            {room.unreadCount > 99 ? "99+" : room.unreadCount}
          </div>
        )}
      </div>

      <div className="room-content">
        <div className="room-header">
          <h3 className="room-name">{otherUserName}</h3>
          <span className="room-time">
            {room.lastMessageTime
              ? formatLastMessageTime(room.lastMessageTime)
              : ""}
          </span>
        </div>

        <div className="room-footer">
          <p className="room-preview">{getLastMessagePreview()}</p>
        </div>
      </div>
    </Link>
  );
};

const ChatRoomList: React.FC = () => {
  const { chatRooms, loading, loadChatRooms } = useMessage();
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);

  useEffect(() => {
    loadChatRooms();
  }, [loadChatRooms]);

  const handleNewChatClick = () => {
    setShowUserSelectModal(true);
  };

  if (loading.chatRooms) {
    return (
      <div className="chat-room-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>채팅방 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (chatRooms.length === 0) {
    return (
      <div className="chat-room-list-container">
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>아직 채팅방이 없습니다</h3>
          <p>새로운 대화를 시작해보세요!</p>
          <button className="new-chat-button" onClick={handleNewChatClick}>
            새 채팅 시작
          </button>
        </div>

        {/* 사용자 선택 모달 */}
        <UserSelectModal
          isOpen={showUserSelectModal}
          onClose={() => setShowUserSelectModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="chat-room-list-container">
      <div className="chat-room-header">
        <h2>메시지</h2>
        <button className="new-chat-button" onClick={handleNewChatClick}>
          <span>✏️</span>
        </button>
      </div>

      <div className="chat-room-list">
        {chatRooms.map((room) => (
          <ChatRoomItem key={room.id} room={room} />
        ))}
      </div>

      {/* 사용자 선택 모달 */}
      <UserSelectModal
        isOpen={showUserSelectModal}
        onClose={() => setShowUserSelectModal(false)}
      />
    </div>
  );
};

export default ChatRoomList;
