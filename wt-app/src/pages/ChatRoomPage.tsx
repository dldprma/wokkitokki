import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChatRoom, useChatRoom } from "../features/message";
import { useAuth } from "../features/auth/hooks/useAuth";

const ChatRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const chatRoomData = useChatRoom(roomId || "");
  const {
    messages,
    pagination,
    loading,
    handleSendMessage,
    handleSendImage,
    handleSendImages,
    loadMoreMessages,
    handleTyping,
  } = chatRoomData;
  const currentRoom = (chatRoomData as any).currentRoom;

  // roomId가 없으면 메시지 목록으로 리다이렉트
  useEffect(() => {
    if (!roomId) {
      navigate("/messages");
    }
  }, [roomId, navigate]);

  const handleSendMessageWrapper = async (
    content: string,
    messageType: "text" | "image"
  ) => {
    if (messageType === "text" && roomId) {
      await handleSendMessage(content, messageType);
    }
  };

  const handleSendFileWrapper = async (file: File) => {
    if (roomId) {
      await handleSendImage(file);
    }
  };

  const handleSendFilesWrapper = async (files: File[]) => {
    if (roomId) {
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

  if (!roomId) {
    return null;
  }

  return (
    <div className="chat-room-page" style={{ height: "calc(100vh - 60px)" }}>
      <ChatRoom
        roomId={roomId}
        roomName={currentRoom?.name || "채팅방"}
        roomImage={currentRoom?.image || ""}
        currentUserId={user?.id || ""}
        messages={messages}
        onSendMessage={handleSendMessageWrapper}
        onSendFile={handleSendFileWrapper}
        onSendFiles={handleSendFilesWrapper}
        onLoadMoreMessages={handleLoadMoreWrapper}
        isLoading={loading.messages}
        hasMore={pagination?.hasMore || false}
        isOnline={currentRoom?.isOnline || false}
        lastSeen={currentRoom?.lastSeen || ""}
      />
    </div>
  );
};

export default ChatRoomPage;
