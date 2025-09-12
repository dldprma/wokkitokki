import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import type { Message } from "../types/messageTypes";
import "../../../css/ChatRoom.css";

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  roomImage?: string;
  currentUserId: string;
  messages: Message[];
  onSendMessage: (content: string, messageType: "text" | "image") => void;
  onSendFile?: (file: File) => void;
  onSendFiles?: (files: File[]) => void;
  onLoadMoreMessages?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  roomId,
  roomName,
  roomImage,
  currentUserId,
  messages,
  onSendMessage,
  onSendFile,
  onSendFiles,
  onLoadMoreMessages,
  isLoading = false,
  hasMore = false,
  isOnline = false,
  lastSeen,
}) => {
  const [typingUsers] = useState<string[]>([]);
  const navigate = useNavigate();
  const [displayRoomName, setDisplayRoomName] = useState(roomName);
  const [displayRoomImage, setDisplayRoomImage] = useState(roomImage);

  // 임시 채팅방인 경우 로컬 스토리지에서 사용자 정보 가져오기
  useEffect(() => {
    if (roomId && roomId.startsWith("temp-")) {
      const userInfo = localStorage.getItem(`temp-user-${roomId}`);
      if (userInfo) {
        try {
          const user = JSON.parse(userInfo);
          setDisplayRoomName(user.name || roomName);
          setDisplayRoomImage(user.profileImage || roomImage);
        } catch (error) {
          console.error("사용자 정보 파싱 실패:", error);
        }
      }
    }
  }, [roomId, roomName, roomImage]);

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const handleSendMessage = (
    content: string,
    messageType: "text" | "image"
  ) => {
    onSendMessage(content, messageType);
  };

  const handleSendFile = (file: File) => {
    if (onSendFile) {
      onSendFile(file);
    }
  };

  const handleSendFiles = (files: File[]) => {
    if (onSendFiles) {
      onSendFiles(files);
    }
  };

  const renderHeader = () => (
    <div className="chat-room-header">
      <div className="header-left">
        <div className="back-button" onClick={() => navigate("/messages")}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5m7-7l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="room-info">
          <div className="room-avatar">
            <img
              src={displayRoomImage || "/default-avatar.png"}
              alt={displayRoomName}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-avatar.png";
              }}
            />
            {isOnline && <div className="online-indicator"></div>}
          </div>
          <div className="room-details">
            <h3 className="room-name">{displayRoomName}</h3>
            <p className="room-status">
              {isOnline
                ? "온라인"
                : lastSeen
                ? `마지막 접속: ${formatLastSeen(lastSeen)}`
                : "오프라인"}
            </p>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button className="header-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <div className="typing-indicator-container">
        <div className="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className="typing-text">
          {typingUsers.length === 1
            ? `${typingUsers[0]}님이 입력 중...`
            : `${typingUsers.length}명이 입력 중...`}
        </span>
      </div>
    );
  };

  return (
    <div className="chat-room">
      {renderHeader()}

      <div className="chat-room-content">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoading}
          onLoadMore={onLoadMoreMessages}
          hasMore={hasMore}
        />

        {renderTypingIndicator()}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        onSendFiles={handleSendFiles}
        disabled={isLoading}
      />
    </div>
  );
};

export default ChatRoom;
