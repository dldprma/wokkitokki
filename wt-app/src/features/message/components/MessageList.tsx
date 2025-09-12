import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { Message } from "../types/messageTypes";
import "../../../css/MessageList.css";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading = false,
  onLoadMore,
  hasMore = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 추가될 때 자동으로 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 무한 스크롤을 위한 스크롤 이벤트 핸들러
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  // 메시지를 그룹화 (연속된 같은 사용자의 메시지를 그룹화)
  const groupMessages = (messages: Message[]) => {
    if (messages.length === 0) return [];

    const grouped: Message[][] = [];
    let currentGroup: Message[] = [messages[0]];

    for (let i = 1; i < messages.length; i++) {
      const currentMessage = messages[i];
      const previousMessage = messages[i - 1];

      // 같은 사용자이고 5분 이내의 메시지면 같은 그룹
      const isSameUser = currentMessage.senderId === previousMessage.senderId;
      const timeDiff =
        new Date(currentMessage.timestamp).getTime() -
        new Date(previousMessage.timestamp).getTime();
      const isWithinTimeLimit = timeDiff < 5 * 60 * 1000; // 5분

      if (isSameUser && isWithinTimeLimit) {
        currentGroup.push(currentMessage);
      } else {
        grouped.push(currentGroup);
        currentGroup = [currentMessage];
      }
    }
    grouped.push(currentGroup);
    return grouped;
  };

  const groupedMessages = groupMessages(messages);

  const renderMessageGroup = (messageGroup: Message[], index: number) => {
    const firstMessage = messageGroup[0];
    const isOwn = firstMessage.senderId === currentUserId;

    return (
      <div key={index} className={`message-group ${isOwn ? "own" : "other"}`}>
        {messageGroup.map((message, messageIndex) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={isOwn}
            showAvatar={messageIndex === messageGroup.length - 1}
            showTimestamp={messageIndex === messageGroup.length - 1}
          />
        ))}
      </div>
    );
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="message-list-container">
        <div className="empty-messages">
          <div className="empty-icon">💬</div>
          <p>아직 메시지가 없습니다.</p>
          <p>첫 메시지를 보내보세요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list-container">
      <div
        ref={messagesContainerRef}
        className="message-list"
        onScroll={handleScroll}
      >
        {isLoading && hasMore && (
          <div className="loading-messages">
            <div className="loading-spinner"></div>
            <span>이전 메시지를 불러오는 중...</span>
          </div>
        )}

        {groupedMessages.map((messageGroup, index) =>
          renderMessageGroup(messageGroup, index)
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
