import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { messageApi } from "../api/messageApi";
import type { Message } from "../types/messageTypes";
import "../../../css/ChatRoom.css";

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  roomImage?: string;
  currentUsername: string; // username만 사용
  messages: Message[];
  onSendMessage: (content: string, messageType: "text" | "image") => void;
  onSendFile?: (file: File) => void;
  onSendFiles?: (files: File[]) => void;
  onLoadMoreMessages?: () => void;
  onMarkAsRead?: (messageIds: number[]) => void;
  onChatRoomLeft?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  typingUsers?: string[];
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  roomId,
  roomName,
  roomImage,
  currentUsername,
  messages,
  onSendMessage,
  onSendFile,
  onSendFiles,
  onLoadMoreMessages,
  onMarkAsRead,
  onChatRoomLeft,
  isLoading = false,
  hasMore = false,
  isOnline = false,
  lastSeen,
  typingUsers = [],
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  // props로 전달받은 값들을 직접 사용
  const displayRoomName = roomName;
  const displayRoomImage = roomImage;

  const formatLastSeen = (timestamp: string | number) => {
    if (!timestamp) return "오프라인";

    let date: Date;

    // timestamp가 숫자인 경우 (밀리초)
    if (typeof timestamp === "number") {
      date = new Date(timestamp);
    } else {
      // 문자열인 경우
      date = new Date(timestamp);
    }

    // 유효하지 않은 날짜인 경우
    if (isNaN(date.getTime())) {
      return "오프라인";
    }

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
        <div
          className="room-info"
          onClick={() => {
            // roomId에서 상대방 username 추출 (현재는 roomId가 username)
            const otherUsername = roomId;
            navigate(`/${otherUsername}`);
          }}
          style={{ cursor: "pointer" }}
        >
          <div className="room-avatar">
            <img
              src={displayRoomImage || "/default-avatar.png"}
              alt={displayRoomName}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-avatar.png";
              }}
            />
            {isOnline && !roomId?.startsWith("temp-") && (
              <div className="online-indicator"></div>
            )}
          </div>
          <div className="room-details">
            <h3 className="room-name">{displayRoomName}</h3>
            <p className="room-status">
              {roomId && roomId.startsWith("temp-")
                ? "오프라인"
                : isOnline
                ? "온라인"
                : lastSeen
                ? `마지막 접속: ${formatLastSeen(lastSeen)}`
                : "오프라인"}
            </p>
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="dropdown">
          <button
            className="header-button"
            onClick={() => setShowMenu(!showMenu)}
          >
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
          {showMenu && (
            <div className="dropdown-menu">
              <button
                className="dropdown-item"
                disabled={!roomId}
                onClick={async () => {
                  if (!roomId) {
                    alert(
                      "채팅방 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요."
                    );
                    setShowMenu(false);
                    return;
                  }

                  try {
                    await messageApi.deleteChatRoom(roomId);
                    // 채팅방 목록 새로고침
                    if (onChatRoomLeft) {
                      onChatRoomLeft();
                    }
                    // 메시지 페이지로 이동
                    navigate("/messages");
                  } catch (error) {
                    console.error("대화방 나가기 실패:", error);
                    console.error("에러 응답:", error.response?.data);
                    console.error("에러 상태:", error.response?.status);
                    alert("대화방 나가기에 실패했습니다. 다시 시도해주세요.");
                  }
                  setShowMenu(false);
                }}
              >
                대화방 나가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTypingIndicator = () => {
    if (!typingUsers || typingUsers.length === 0) return null;

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
          currentUsername={currentUsername}
          isLoading={isLoading}
          onLoadMore={onLoadMoreMessages}
          onMarkAsRead={onMarkAsRead}
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
