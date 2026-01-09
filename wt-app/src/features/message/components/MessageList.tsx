import React, { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import MessageBubble from "./MessageBubble";
import { messageApi } from "../api/messageApi";
import { markMessagesAsReadLocal } from "../store/messageSlice";
import type { Message } from "../types/messageTypes";
import "../../../css/MessageList.css";

interface MessageListProps {
  messages: Message[];
  currentUsername: string; // username만 사용
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onMarkAsRead?: (messageIds: number[]) => void; // 읽음 처리 콜백
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUsername,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  onMarkAsRead,
}) => {
  const dispatch = useDispatch();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 추가될 때 자동으로 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 읽음 처리 - 상대방이 보낸 메시지를 읽음 처리
  useEffect(() => {
    if (messages.length > 0) {
      // 상대방이 보낸 메시지 중 읽지 않은 메시지가 있으면 읽음 처리
      const unreadMessages = messages.filter(
        (message) => message.senderUsername !== currentUsername && !message.read
      );

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map((msg) => msg.id);

        // API 호출로 읽음 처리
        const markAsRead = async () => {
          try {
            // 상대방 username 추출 (첫 번째 읽지 않은 메시지의 senderUsername 사용)
            const otherUsername = unreadMessages[0].senderUsername;
            await messageApi.markAsRead(otherUsername);
            dispatch(markMessagesAsReadLocal({ messageIds }));

            // 부모 컴포넌트에 읽음 처리 알림
            if (onMarkAsRead) {
              onMarkAsRead(messageIds);
            }
          } catch (error) {
            console.error("❌ 메시지 읽음 처리 실패:", error);
          }
        };

        markAsRead();
      }
    }
  }, [messages, currentUsername, onMarkAsRead, dispatch]);

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
      const isSameUser =
        currentMessage.senderUsername === previousMessage.senderUsername;
      const timeDiff =
        new Date(currentMessage.createdAt).getTime() -
        new Date(previousMessage.createdAt).getTime();
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
    // username으로 비교 (백엔드에서 senderUsername을 제공)
    const isOwn = firstMessage.senderUsername === currentUsername;

    return (
      <div key={index} className={`message-group ${isOwn ? "own" : "other"}`}>
        {messageGroup.map((message, messageIndex) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={isOwn}
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
