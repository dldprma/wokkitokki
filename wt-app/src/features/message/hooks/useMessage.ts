import { useCallback, useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  fetchMessages,
  sendMessage,
  sendImageMessage,
  sendMultipleImages,
  markMessagesAsRead,
  markMessagesAsReadLocal,
  fetchChatRooms,
  createChatRoom,
  addNewMessage,
} from "../store/messageSlice";
import { getUserProfile } from "../../user/api/userApi";
import { websocketService } from "../services/websocketService";
import { messageApi } from "../api/messageApi";

export const useMessage = () => {
  const dispatch = useAppDispatch();
  const messageState = useAppSelector((state) => state.message);

  // 채팅방 목록 로드
  const loadChatRooms = useCallback(async () => {
    await dispatch(fetchChatRooms());
  }, [dispatch]);

  // 채팅방 생성
  const createRoom = useCallback(
    async (username: string) => {
      try {
        await dispatch(createChatRoom(username));
        return username; // 성공 시 username 반환
      } catch (error) {
        // 백엔드 API 실패 시 임시 채팅방 생성
        const tempRoomId = `temp-${username}-${Date.now()}`;
        const tempRoomInfo = {
          username,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(
          `temp-room-${tempRoomId}`,
          JSON.stringify(tempRoomInfo)
        );
        localStorage.setItem(
          `temp-user-${tempRoomId}`,
          JSON.stringify({
            username,
            name: username, // 임시로 username을 name으로 사용
            profileImage: "/default-avatar.png",
          })
        );
        return username; // 임시 채팅방도 username 반환
      }
    },
    [dispatch]
  );

  // 메시지 조회
  const loadMessages = useCallback(
    async (username: string, page = 1, limit = 50) => {
      await dispatch(fetchMessages({ username, page, limit }));
    },
    [dispatch]
  );

  // 메시지 전송
  const sendTextMessage = useCallback(
    async (username: string, content: string) => {
      await dispatch(
        sendMessage({
          receiverUsername: username,
          content,
          messageType: "TEXT",
        })
      );
    },
    [dispatch]
  );

  // 이미지 전송
  const sendImage = useCallback(
    async (username: string, image: File, replyToMessageId?: string) => {
      await dispatch(
        sendImageMessage({
          receiverUsername: username,
          image,
          replyToMessageId,
        })
      );
    },
    [dispatch]
  );

  // 여러 이미지 전송
  const sendImages = useCallback(
    async (username: string, images: File[], replyToMessageId?: string) => {
      await dispatch(
        sendMultipleImages({
          receiverUsername: username,
          images,
          replyToMessageId,
        })
      );
    },
    [dispatch]
  );

  return {
    // 상태
    chatRooms: messageState.chatRooms,
    messages: messageState.messages,
    loading: messageState.loading,
    error: messageState.error,
    currentRoomId: messageState.currentRoomId,
    currentRoom: messageState.currentRoom,

    // 액션
    loadChatRooms,
    createRoom,
    loadMessages,
    sendTextMessage,
    sendImage,
    sendImages,
  };
};

// 채팅방별 훅
export const useChatRoom = (username: string) => {
  const dispatch = useAppDispatch();
  const messageState = useAppSelector((state) => state.message);
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [dialogId, setDialogId] = useState<string | null>(null);
  const wsSubscriptions = useRef<{ messages?: string; typing?: string }>({});
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // 현재 사용자 정보 가져오기
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // 해당 username의 메시지들 가져오기
  const messages = messageState.messages[username] || [];
  const pagination = messageState.messagePagination[username];

  console.log("=== useMessage 디버깅 ===");
  console.log("현재 username:", username);
  console.log("messageState.messages:", messageState.messages);
  console.log("messages for username:", messages);
  console.log("messages.length:", messages.length);

  // 사용자 정보 로드 및 메시지 읽음 처리
  useEffect(() => {
    if (username) {
      loadUserInfo(username);

      // dialogId를 먼저 로드한 후 메시지 가져오기
      loadDialogId(username).then(() => {
        // 채팅방 진입 시 메시지를 읽음 처리
        dispatch(markMessagesAsRead(username));

        // 해당 사용자와의 메시지 목록 불러오기
        dispatch(
          fetchMessages({
            username,
            page: 0,
            limit: 50,
          })
        );
      });
    }
  }, [username, dispatch]);

  // dialogId가 변경될 때 메시지 다시 가져오기 및 WebSocket 구독 업데이트
  useEffect(() => {
    if (dialogId && username) {
      dispatch(
        fetchMessages({
          username,
          page: 0,
          limit: 50,
        })
      );

      // 기존 WebSocket 구독 해제
      if (wsSubscriptions.current.messages) {
        websocketService.unsubscribe(wsSubscriptions.current.messages);
      }

      // 새로운 dialogId로 WebSocket 구독
      console.log(
        "WebSocket 연결 상태:",
        websocketService.isWebSocketConnected()
      );
      console.log("구독할 토픽:", `/topic/pair:${dialogId}`);

      if (websocketService.isWebSocketConnected()) {
        wsSubscriptions.current.messages = websocketService.subscribe(
          `/topic/pair:${dialogId}`,
          (messageData: any) => {
            console.log("WebSocket 메시지 수신:", messageData);
            console.log("현재 username:", username);
            console.log("메시지 데이터:", messageData);

            // 메시지의 senderUsername과 receiverUsername 확인
            const senderUsername = messageData.senderUsername;
            const receiverUsername = messageData.receiverUsername;
            console.log("senderUsername:", senderUsername);
            console.log("receiverUsername:", receiverUsername);

            // 현재 사용자가 받는 사람인지 확인
            const currentUser = JSON.parse(
              localStorage.getItem("user") || "{}"
            );
            const isReceiver = receiverUsername === currentUser.username;
            const isSender = senderUsername === currentUser.username;

            console.log("isReceiver:", isReceiver);
            console.log("isSender:", isSender);

            // Redux store에 직접 메시지 추가
            dispatch(
              addNewMessage({
                username,
                message: messageData,
              })
            );
          }
        );
      }
    }
  }, [dialogId, username, dispatch]);

  // WebSocket 연결 및 실시간 메시지 처리
  useEffect(() => {
    if (!username || !currentUser.username) return;

    const initializeWebSocket = async () => {
      try {
        console.log("=== WebSocket 초기화 시작 ===");
        console.log("username:", username);
        console.log("currentUser.username:", currentUser.username);
        console.log(
          "현재 WebSocket 연결 상태:",
          websocketService.isWebSocketConnected()
        );

        // WebSocket 연결
        if (!websocketService.isWebSocketConnected()) {
          console.log("WebSocket 연결 시도...");
          await websocketService.connect();
          console.log("WebSocket 연결 성공!");

          // 연결 성공 후 하트비트 시작
          startHeartbeat();
        } else {
          console.log("WebSocket이 이미 연결되어 있습니다.");
        }

        // WebSocket 구독은 dialogId가 변경될 때 처리됨

        // 타이핑 상태 구독
        wsSubscriptions.current.typing =
          websocketService.subscribeToTypingStatus(
            currentUser.username,
            (typingData: any) => {
              if (typingData.type === "TYPING_STATUS") {
                const { senderUsername, isTyping } = typingData;

                setTypingUsers((prev) => {
                  if (isTyping) {
                    return prev.includes(senderUsername)
                      ? prev
                      : [...prev, senderUsername];
                  } else {
                    return prev.filter((user) => user !== senderUsername);
                  }
                });
              }
            }
          );
      } catch (error) {
        console.error("=== WebSocket 연결 실패 ===");
        console.error("에러:", error);
        console.error("에러 타입:", typeof error);
        console.error(
          "에러 메시지:",
          error instanceof Error ? error.message : String(error)
        );
      }
    };

    initializeWebSocket();

    // 컴포넌트 언마운트 시 구독 해제 및 하트비트 중지
    return () => {
      if (wsSubscriptions.current.messages) {
        websocketService.unsubscribe(wsSubscriptions.current.messages);
      }
      if (wsSubscriptions.current.typing) {
        websocketService.unsubscribe(wsSubscriptions.current.typing);
      }
      stopHeartbeat();
    };
  }, [username, currentUser.username, dispatch]);

  const loadUserInfo = async (targetUsername: string) => {
    setLoadingUserInfo(true);
    try {
      // 사용자 프로필과 온라인 상태를 병렬로 조회
      const [userInfo, onlineStatus] = await Promise.all([
        getUserProfile(targetUsername),
        messageApi.getUserOnlineStatus(targetUsername),
      ]);

      // 온라인 상태 정보를 사용자 정보에 추가
      const userInfoWithOnlineStatus = {
        ...userInfo,
        isOnline: onlineStatus.isOnline,
      };

      setCurrentUserInfo(userInfoWithOnlineStatus);
    } catch (error) {
      console.error("사용자 정보 로드 실패:", error);
      setCurrentUserInfo(null);
    } finally {
      setLoadingUserInfo(false);
    }
  };

  const loadDialogId = async (targetUsername: string): Promise<void> => {
    if (!currentUser?.username) {
      console.error("사용자 정보가 없습니다.");
      setDialogId(null);
      return;
    }
    try {
      const chatRoomsResponse = await messageApi.getChatRooms();
      const chatRooms = chatRoomsResponse.rooms;
      const targetRoom = chatRooms.find(
        (room) =>
          room.user1Username === targetUsername ||
          room.user2Username === targetUsername
      );

      if (targetRoom) {
        setDialogId(targetRoom.roomId); // roomId가 실제로는 dialogId
      } else {
        try {
          await dispatch(createChatRoom(targetUsername));
          // 생성 후 채팅방 목록 새로고침
          await dispatch(fetchChatRooms());
          const updatedChatRoomsResponse = await messageApi.getChatRooms();
          const updatedChatRooms = updatedChatRoomsResponse.rooms;
          const newTargetRoom = updatedChatRooms.find(
            (room) =>
              room.user1Username === targetUsername ||
              room.user2Username === targetUsername
          );
          if (newTargetRoom) {
            setDialogId(newTargetRoom.roomId); // roomId가 실제로는 dialogId
          } else {
            setDialogId(null);
          }
        } catch (createError) {
          console.error("채팅방 생성 실패:", createError);
          setDialogId(null);
        }
      }
    } catch (error) {
      console.error("dialogId 로드 실패:", error);
      setDialogId(null);
    }
  };

  // 메시지 전송
  const handleSendMessage = useCallback(
    async (content: string, messageType: "text" | "image") => {
      if (messageType === "text") {
        try {
          await dispatch(
            sendMessage({
              receiverUsername: username,
              content,
              messageType: "TEXT",
            })
          ).unwrap();

          // 메시지 전송 후 즉시 메시지 목록을 다시 불러와서 화면에 표시
          dispatch(
            fetchMessages({
              username,
              page: 0,
              limit: 50,
            })
          );
        } catch (error) {
          console.error("메시지 전송 실패:", error);
        }
      }
    },
    [dispatch, username]
  );

  // 이미지 전송
  const handleSendImage = useCallback(
    async (file: File) => {
      try {
        await dispatch(
          sendImageMessage({
            receiverUsername: username,
            image: file,
          })
        ).unwrap();

        // 이미지 전송 후 즉시 메시지 목록을 다시 불러와서 화면에 표시
        dispatch(
          fetchMessages({
            username,
            page: 0,
            limit: 50,
          })
        );
      } catch (error) {
        console.error("이미지 전송 실패:", error);
      }
    },
    [dispatch, username]
  );

  // 여러 이미지 전송
  const handleSendImages = useCallback(
    async (files: File[]) => {
      try {
        await dispatch(
          sendMultipleImages({
            receiverUsername: username,
            images: files,
          })
        ).unwrap();

        // 여러 이미지 전송 후 즉시 메시지 목록을 다시 불러와서 화면에 표시
        dispatch(
          fetchMessages({
            username,
            page: 0,
            limit: 50,
          })
        );
      } catch (error) {
        console.error("이미지 전송 실패:", error);
      }
    },
    [dispatch, username]
  );

  // 더 많은 메시지 로드
  const loadMoreMessages = useCallback(async () => {
    if (pagination?.hasMore) {
      await dispatch(
        fetchMessages({
          username,
          page: (pagination?.page || 0) + 1,
          limit: 20,
        })
      );
    }
  }, [dispatch, username, pagination]);

  // 하트비트 시작
  const startHeartbeat = useCallback(() => {
    // 기존 하트비트 중지
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    // 1분마다 하트비트 전송
    heartbeatInterval.current = setInterval(() => {
      websocketService.sendHeartbeat();
    }, 60000);
  }, []);

  // 하트비트 중지
  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  // 타이핑 상태 전송
  const handleTyping = useCallback(() => {
    if (websocketService.isWebSocketConnected()) {
      websocketService.sendTypingStatus(username, true);

      // 3초 후 타이핑 상태 해제
      setTimeout(() => {
        websocketService.sendStopTyping(username);
      }, 3000);
    }
  }, [username]);

  return {
    messages,
    pagination,
    dialogId,
    loading: {
      ...messageState.loading,
      userInfo: loadingUserInfo,
    },
    handleSendMessage,
    handleSendImage,
    handleSendImages,
    loadMoreMessages,
    handleTyping,
    typingUsers,
    currentRoom: currentUserInfo
      ? {
          name: currentUserInfo.fullName || currentUserInfo.username,
          image: currentUserInfo.profileImgUrl || "",
          isOnline: currentUserInfo.isOnline || false, // 백엔드에서 조회한 실제 온라인 상태
          lastSeen: currentUserInfo.isOnline ? "온라인" : "오프라인",
        }
      : null,
  };
};
