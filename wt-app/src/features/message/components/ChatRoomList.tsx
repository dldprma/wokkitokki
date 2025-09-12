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

    const { content, messageType, senderName } = room.lastMessage;

    if (messageType === "image") {
      return `${senderName}: 사진을 보냈습니다.`;
    } else if (messageType === "file") {
      return `${senderName}: 파일을 보냈습니다.`;
    } else {
      const preview =
        content.length > 50 ? `${content.substring(0, 50)}...` : content;
      return `${senderName}: ${preview}`;
    }
  };

  return (
    <Link to={`/messages/${room.id}`} className="chat-room-item">
      <div className="room-avatar-container">
        <img
          src={room.image || "/default-avatar.png"}
          alt={room.name}
          className="room-avatar"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/default-avatar.png";
          }}
        />
        {room.isOnline && <div className="online-indicator"></div>}
        {room.unreadCount > 0 && (
          <div className="unread-badge">
            {room.unreadCount > 99 ? "99+" : room.unreadCount}
          </div>
        )}
      </div>

      <div className="room-content">
        <div className="room-header">
          <h3 className="room-name">{room.name}</h3>
          <span className="room-time">
            {room.lastMessage
              ? formatLastMessageTime(room.lastMessage.timestamp)
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
