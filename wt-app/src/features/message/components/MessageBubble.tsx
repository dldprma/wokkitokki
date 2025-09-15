import React from "react";
import type { Message } from "../types/messageTypes";
import { getFullImageUrl } from "../../../utils/imageUtils";
import "../../../css/MessageBubble.css";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showTimestamp?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showTimestamp = true,
}) => {
  const formatTime = (createdAt: string) => {
    const now = new Date();
    const messageTime = new Date(createdAt);
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
      case "IMAGE":
        return (
          <div className="message-image">
            <img src={getFullImageUrl(message.imageUrl)} alt="전송된 이미지" />
          </div>
        );
      case "FILE":
        return (
          <div className="message-file">
            <div className="file-icon">📎</div>
            <div className="file-name">{message.content}</div>
          </div>
        );
      case "POST_SHARE":
        console.log("🔍 POST_SHARE 메시지:", message);
        console.log("🔍 sharedPost 데이터:", message.sharedPost);
        return (
          <div className="message-post-share">
            <div className="message-text">{message.content}</div>
            {message.sharedPost && (
              <div className="shared-post-preview">
                <div className="post-header">
                  <img
                    src={
                      message.sharedPost.authorProfileImg ||
                      "/default-avatar.png"
                    }
                    alt={message.sharedPost.authorFullName}
                    className="author-avatar"
                  />
                  <div className="author-info">
                    <div className="author-name">
                      {message.sharedPost.authorFullName}
                    </div>
                    <div className="author-username">
                      @{message.sharedPost.authorUsername}
                    </div>
                  </div>
                </div>
                <div className="post-content">{message.sharedPost.content}</div>
                {message.sharedPost.imgUrl && (
                  <img
                    src={message.sharedPost.imgUrl}
                    alt="공유된 게시글 이미지"
                    className="post-image"
                  />
                )}
                <div className="post-stats">
                  <span>❤️ {message.sharedPost.likeCount}</span>
                  <span>🔄 {message.sharedPost.repostCount}</span>
                  <span>💬 {message.sharedPost.commentCount}</span>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return <div className="message-text">{message.content}</div>;
    }
  };

  return (
    <div className={`message-bubble-container ${isOwn ? "own" : "other"}`}>
      <div className="message-content">
        {!isOwn && <div className="sender-name">{message.senderFullName}</div>}

        <div className={`message-bubble ${isOwn ? "own" : "other"}`}>
          {renderMessageContent()}
        </div>

        {showTimestamp && (
          <div className={`message-time ${isOwn ? "own" : "other"}`}>
            {formatTime(message.createdAt)}
            {isOwn && (
              <span
                className={`read-status ${message.read ? "read" : "unread"}`}
                title={`읽음 상태: ${message.read ? "읽음" : "읽지 않음"}`}
              >
                ✓
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
