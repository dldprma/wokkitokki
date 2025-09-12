import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  fetchChatRooms,
  fetchMessages,
  sendMessage,
  sendImageMessage,
  sendMultipleImages,
  markMessagesAsRead,
  deleteMessage,
  createChatRoom,
  fetchChatRoomInfo,
  searchMessages,
  setCurrentRoom,
  addNewMessage,
  updateMessage,
  updateTypingStatus,
  updateOnlineUsers,
  setSelectedImages,
  setImagePreviewUrls,
  clearError,
  clearAllErrors,
} from "../store/messageSlice";
import type {
  Message,
  ChatRoomInfo,
  MessageFilter,
} from "../types/messageTypes";

// 메시지 관련 훅
export const useMessage = () => {
  const dispatch = useAppDispatch();
  const messageState = useAppSelector((state) => state.message);
  const typingTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // 채팅방 목록 조회
  const loadChatRooms = useCallback(
    async (page = 1, limit = 20) => {
      await dispatch(fetchChatRooms({ page, limit }));
    },
    [dispatch]
  );

  // 현재 채팅방 설정
  const setCurrentRoomId = useCallback(
    (roomId: string | null) => {
      dispatch(setCurrentRoom(roomId));
    },
    [dispatch]
  );

  // 채팅방 정보 조회
  const loadChatRoomInfo = useCallback(
    async (roomId: string) => {
      await dispatch(fetchChatRoomInfo(roomId));
    },
    [dispatch]
  );

  // 메시지 조회
  const loadMessages = useCallback(
    async (roomId: string, page = 1, limit = 50, filter?: MessageFilter) => {
      await dispatch(fetchMessages({ roomId, page, limit }));
    },
    [dispatch]
  );

  // 메시지 전송
  const sendTextMessage = useCallback(
    async (roomId: string, content: string, replyToMessageId?: string) => {
      await dispatch(
        sendMessage({
          roomId,
          content,
          messageType: "text",
          replyToMessageId,
        })
      );
    },
    [dispatch]
  );

  // 이미지 메시지 전송
  const sendImage = useCallback(
    async (roomId: string, image: File, replyToMessageId?: string) => {
      await dispatch(
        sendImageMessage({
          roomId,
          image,
          replyToMessageId,
        })
      );
    },
    [dispatch]
  );

  // 여러 이미지 전송
  const sendImages = useCallback(
    async (roomId: string, images: File[], replyToMessageId?: string) => {
      await dispatch(
        sendMultipleImages({
          roomId,
          images,
          replyToMessageId,
        })
      );
    },
    [dispatch]
  );

  // 메시지 읽음 처리
  const markAsRead = useCallback(
    async (roomId: string, messageIds: string[]) => {
      await dispatch(markMessagesAsRead({ roomId, messageIds }));
    },
    [dispatch]
  );

  // 메시지 삭제
  const deleteMessageById = useCallback(
    async (roomId: string, messageId: string) => {
      await dispatch(deleteMessage({ roomId, messageId }));
    },
    [dispatch]
  );

  // 채팅방 생성
  const createRoom = useCallback(
    async (username: string) => {
      try {
        const result = await dispatch(createChatRoom(username));
        console.log("createChatRoom result:", result);

        if (result.payload && result.payload.roomId) {
          return result.payload.roomId;
        }

        // 백엔드가 준비되지 않았을 때 임시 roomId 생성
        console.warn(
          "백엔드에서 roomId를 받지 못했습니다. 임시 roomId를 생성합니다."
        );
        // username을 포함한 임시 roomId 생성
        const tempRoomId = `temp-${username}-${Date.now()}`;

        // 임시 채팅방 정보를 로컬 스토리지에 저장
        const tempRoomInfo = {
          roomId: tempRoomId,
          username: username,
          createdAt: new Date().toISOString(),
          isTemporary: true,
        };
        localStorage.setItem(
          `temp-room-${tempRoomId}`,
          JSON.stringify(tempRoomInfo)
        );

        return tempRoomId;
      } catch (error) {
        console.error("채팅방 생성 에러:", error);
        // 에러가 발생해도 임시 roomId 생성
        const tempRoomId = `temp-${username}-${Date.now()}`;

        // 임시 채팅방 정보를 로컬 스토리지에 저장
        const tempRoomInfo = {
          roomId: tempRoomId,
          username: username,
          createdAt: new Date().toISOString(),
          isTemporary: true,
        };
        localStorage.setItem(
          `temp-room-${tempRoomId}`,
          JSON.stringify(tempRoomInfo)
        );

        return tempRoomId;
      }
    },
    [dispatch]
  );

  // 메시지 검색
  const searchMessagesInRoom = useCallback(
    async (query: string, roomId?: string, page = 1, limit = 20) => {
      await dispatch(searchMessages({ query, roomId, page, limit }));
    },
    [dispatch]
  );

  // 타이핑 상태 전송
  const sendTypingStatus = useCallback(
    (roomId: string, isTyping: boolean) => {
      // 기존 타이머 클리어
      if (typingTimeoutRef.current[roomId]) {
        clearTimeout(typingTimeoutRef.current[roomId]);
      }

      // 타이핑 상태 전송
      dispatch(
        updateTypingStatus({
          roomId,
          userId: "currentUser", // 실제로는 현재 사용자 ID
          userName: "나",
          isTyping,
          timestamp: new Date().toISOString(),
        })
      );

      // 타이핑 중지 타이머 설정
      if (isTyping) {
        typingTimeoutRef.current[roomId] = setTimeout(() => {
          dispatch(
            updateTypingStatus({
              roomId,
              userId: "currentUser",
              userName: "나",
              isTyping: false,
              timestamp: new Date().toISOString(),
            })
          );
        }, 3000); // 3초 후 자동으로 타이핑 중지
      }
    },
    [dispatch]
  );

  // 새 메시지 추가 (실시간)
  const addMessage = useCallback(
    (message: Message) => {
      dispatch(addNewMessage(message));
    },
    [dispatch]
  );

  // 메시지 업데이트 (실시간)
  const updateMessageById = useCallback(
    (roomId: string, messageId: string, updates: Partial<Message>) => {
      dispatch(updateMessage({ roomId, messageId, updates }));
    },
    [dispatch]
  );

  // 온라인 사용자 업데이트 (실시간)
  const updateOnlineUsersInRoom = useCallback(
    (roomId: string, userIds: string[]) => {
      dispatch(updateOnlineUsers({ roomId, userIds }));
    },
    [dispatch]
  );

  // 선택된 이미지 관리
  const setImages = useCallback(
    (images: File[]) => {
      dispatch(setSelectedImages(images));
    },
    [dispatch]
  );

  const setImageUrls = useCallback(
    (urls: string[]) => {
      dispatch(setImagePreviewUrls(urls));
    },
    [dispatch]
  );

  // 에러 초기화
  const clearErrorMessage = useCallback(
    (type: "chatRooms" | "messages" | "sending") => {
      dispatch(clearError(type));
    },
    [dispatch]
  );

  const clearAllErrorMessages = useCallback(() => {
    dispatch(clearAllErrors());
  }, [dispatch]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  // 현재 방의 메시지들
  const currentMessages = messageState.currentRoomId
    ? messageState.messages[messageState.currentRoomId] || []
    : [];

  // 현재 방의 타이핑 사용자들
  const currentTypingUsers = messageState.currentRoomId
    ? messageState.typingUsers[messageState.currentRoomId] || []
    : [];

  // 현재 방의 온라인 사용자들
  const currentOnlineUsers = messageState.currentRoomId
    ? messageState.onlineUsers[messageState.currentRoomId] || []
    : [];

  // 현재 방의 페이지네이션 정보
  const currentPagination = messageState.currentRoomId
    ? messageState.messagePagination[messageState.currentRoomId]
    : null;

  return {
    // 상태
    chatRooms: messageState.chatRooms,
    currentRoom: messageState.currentRoom,
    currentRoomId: messageState.currentRoomId,
    currentMessages,
    currentTypingUsers,
    currentOnlineUsers,
    currentPagination,
    loading: messageState.loading,
    error: messageState.error,
    selectedImages: messageState.selectedImages,
    imagePreviewUrls: messageState.imagePreviewUrls,

    // 액션
    loadChatRooms,
    setCurrentRoomId,
    loadChatRoomInfo,
    loadMessages,
    sendTextMessage,
    sendImage,
    sendImages,
    markAsRead,
    deleteMessageById,
    createRoom,
    searchMessagesInRoom,
    sendTypingStatus,
    addMessage,
    updateMessageById,
    updateOnlineUsersInRoom,
    setImages,
    setImageUrls,
    clearErrorMessage,
    clearAllErrorMessages,
  };
};

// 특정 채팅방 메시지 관리 훅
export const useChatRoom = (roomId: string | null) => {
  const {
    loadMessages,
    sendTextMessage,
    sendImage,
    sendImages,
    markAsRead,
    sendTypingStatus,
    currentMessages,
    currentTypingUsers,
    currentOnlineUsers,
    currentPagination,
    loading,
    error,
    currentRoom,
  } = useMessage();

  // 채팅방 메시지 로드
  useEffect(() => {
    if (roomId) {
      loadMessages(roomId);
    }
  }, [roomId, loadMessages]);

  // 메시지 전송 핸들러
  const handleSendMessage = useCallback(
    async (content: string, messageType: "text" | "image") => {
      if (!roomId) return;

      if (messageType === "text") {
        await sendTextMessage(roomId, content);
      }
    },
    [roomId, sendTextMessage]
  );

  // 이미지 전송 핸들러
  const handleSendImage = useCallback(
    async (image: File) => {
      if (!roomId) return;
      await sendImage(roomId, image);
    },
    [roomId, sendImage]
  );

  // 여러 이미지 전송 핸들러
  const handleSendImages = useCallback(
    async (images: File[]) => {
      if (!roomId) return;
      await sendImages(roomId, images);
    },
    [roomId, sendImages]
  );

  // 더 많은 메시지 로드
  const loadMoreMessages = useCallback(async () => {
    if (!roomId || !currentPagination?.hasMore || loading.messages) return;

    const nextPage = (currentPagination.page || 1) + 1;
    await loadMessages(roomId, nextPage);
  }, [roomId, currentPagination, loading.messages, loadMessages]);

  // 타이핑 핸들러
  const handleTyping = useCallback(() => {
    if (!roomId) return;
    sendTypingStatus(roomId, true);
  }, [roomId, sendTypingStatus]);

  // 읽음 처리
  const handleMarkAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!roomId) return;
      await markAsRead(roomId, messageIds);
    },
    [roomId, markAsRead]
  );

  return {
    messages: currentMessages,
    typingUsers: currentTypingUsers,
    onlineUsers: currentOnlineUsers,
    pagination: currentPagination,
    loading,
    error,
    currentRoom,
    handleSendMessage,
    handleSendImage,
    handleSendImages,
    loadMoreMessages,
    handleTyping,
    handleMarkAsRead,
  };
};
