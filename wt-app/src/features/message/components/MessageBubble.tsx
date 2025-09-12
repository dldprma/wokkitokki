import React from "react";
import type { Message } from "../types/messageTypes";
import "../../../css/MessageBubble.css";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = true,
  showTimestamp = true,
}) => {
  const formatTime = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - messageTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "방금 전";
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;

    return messageTime.toLocaleDateString("ko-KR");
  };

  const renderMessageContent = () => {
    switch (message.messageType) {
      case "image":
        return (
          <div className="message-image">
            <img src={message.content} alt="전송된 이미지" />
          </div>
        );
      case "file":
        return (
          <div className="message-file">
            <div className="file-icon">📎</div>
            <div className="file-name">{message.content}</div>
          </div>
        );
      default:
        return <div className="message-text">{message.content}</div>;
    }
  };

  return (
    <div className={`message-bubble-container ${isOwn ? "own" : "other"}`}>
      {!isOwn && showAvatar && (
        <div className="message-avatar">
          <img
            src={message.senderProfileImage || "/default-avatar.png"}
            alt={message.senderName}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-avatar.png";
            }}
          />
        </div>
      )}

      <div className="message-content">
        {!isOwn && <div className="sender-name">{message.senderName}</div>}

        <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
          {renderMessageContent()}
        </div>

        {showTimestamp && (
          <div className={`message-time ${isOwn ? "own" : "other"}`}>
            {formatTime(message.timestamp)}
            {isOwn && (
              <span
                className={`read-status ${message.isRead ? "read" : "unread"}`}
              >
                {message.isRead ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
