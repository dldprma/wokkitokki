import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChatRoom, useChatRoom, useMessage } from "../features/message";
import { useAuth } from "../features/auth/hooks/useAuth";

const ChatRoomPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadChatRooms } = useMessage();

  const chatRoomData = useChatRoom(username || "");
  const {
    messages,
    pagination,
    roomId,
    loading,
    handleSendMessage,
    handleSendImage,
    handleSendImages,
    loadMoreMessages,
    handleTyping,
    typingUsers,
  } = chatRoomData;
  const currentRoom = (chatRoomData as any).currentRoom;

  // username이 없으면 메시지 목록으로 리다이렉트
  useEffect(() => {
    if (!username) {
      navigate("/messages");
    }
  }, [username, navigate]);

  const handleSendMessageWrapper = async (
    content: string,
    messageType: "text" | "image"
  ) => {
    if (messageType === "text" && username) {
      await handleSendMessage(content, messageType);
    }
  };

  const handleSendFileWrapper = async (file: File) => {
    if (username) {
      await handleSendImage(file);
    }
  };

  const handleSendFilesWrapper = async (files: File[]) => {
    if (username) {
      await handleSendImages(files);
    }
  };

  const handleLoadMoreWrapper = async () => {
    await loadMoreMessages();
  };

  // 타이핑 상태 전송
  useEffect(() => {
    const timer = setTimeout(() => {
      handleTyping();
    }, 1000);

    return () => clearTimeout(timer);
  }, [handleTyping]);

  if (!username) {
    return null;
  }

  // roomId가 없으면 로딩 중이거나 채팅방을 찾을 수 없음
  // 하지만 채팅방은 표시하고, 나가기 기능만 비활성화

  return (
    <div className="chat-room-page" style={{ height: "calc(100vh - 60px)" }}>
      <ChatRoom
        roomId={roomId}
        roomName={currentRoom?.name || "채팅방"}
        roomImage={currentRoom?.image || ""}
        currentUsername={user?.username || ""}
        messages={messages}
        onSendMessage={handleSendMessageWrapper}
        onSendFile={handleSendFileWrapper}
        onSendFiles={handleSendFilesWrapper}
        onLoadMoreMessages={handleLoadMoreWrapper}
        onChatRoomLeft={loadChatRooms}
        isLoading={loading.messages || loading.userInfo}
        hasMore={pagination?.hasMore || false}
        isOnline={currentRoom?.isOnline || false}
        lastSeen={currentRoom?.lastSeen || ""}
        typingUsers={typingUsers}
      />
    </div>
  );
};

export default ChatRoomPage;
