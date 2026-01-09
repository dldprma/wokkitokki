import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  Message,
  ChatRoomInfo,
  MessagePagination,
  TypingStatus,
} from "../types/messageTypes";
import { messageApi } from "../api/messageApi";

// 상태 인터페이스
interface MessageState {
  // 채팅방 목록
  chatRooms: ChatRoomInfo[];
  currentRoomId: string | null;
  currentRoom: ChatRoomInfo | null;

  // 메시지 관련
  messages: { [roomId: string]: Message[] };
  messagePagination: { [roomId: string]: MessagePagination };

  // 로딩 상태
  loading: {
    chatRooms: boolean;
    messages: boolean;
    sending: boolean;
  };

  // 에러 상태
  error: {
    chatRooms: string | null;
    messages: string | null;
    sending: string | null;
  };

  // 실시간 기능
  typingUsers: { [roomId: string]: string[] };
  onlineUsers: { [roomId: string]: string[] };

  // 선택된 이미지들
  selectedImages: File[];
  imagePreviewUrls: string[];
}

// 초기 상태
const initialState: MessageState = {
  chatRooms: [],
  currentRoomId: null,
  currentRoom: null,
  messages: {},
  messagePagination: {},
  loading: {
    chatRooms: false,
    messages: false,
    sending: false,
  },
  error: {
    chatRooms: null,
    messages: null,
    sending: null,
  },
  typingUsers: {},
  onlineUsers: {},
  selectedImages: [],
  imagePreviewUrls: [],
};

// Async Thunks
export const fetchChatRooms = createAsyncThunk(
  "message/fetchChatRooms",
  async () => {
    const response = await messageApi.getChatRooms();
    return response;
  }
);

export const fetchMessages = createAsyncThunk(
  "message/fetchMessages",
  async ({
    username,
    page = 1,
    limit = 50,
  }: {
    username: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await messageApi.getMessages(username, page, limit);
    return { username, ...response };
  }
);

export const sendMessage = createAsyncThunk(
  "message/sendMessage",
  async ({
    receiverUsername,
    content,
    messageType = "TEXT",
    imageUrl,
    fileUrl,
    fileName,
    sharedPostId,
  }: {
    receiverUsername: string;
    content: string;
    messageType?: "TEXT" | "IMAGE" | "FILE";
    imageUrl?: string;
    fileUrl?: string;
    fileName?: string;
    sharedPostId?: number;
  }) => {
    const response = await messageApi.sendMessage({
      receiverUsername,
      content,
      messageType,
      imageUrl,
      fileUrl,
      fileName,
      sharedPostId,
    });
    return { receiverUsername, message: response };
  }
);

export const sendImageMessage = createAsyncThunk(
  "message/sendImageMessage",
  async ({
    receiverUsername,
    image,
    replyToMessageId,
  }: {
    receiverUsername: string;
    image: File;
    replyToMessageId?: string;
  }) => {
    const response = await messageApi.sendImageMessage(
      receiverUsername,
      image,
      replyToMessageId
    );
    return { receiverUsername, message: response };
  }
);

export const sendMultipleImages = createAsyncThunk(
  "message/sendMultipleImages",
  async ({
    receiverUsername,
    images,
    replyToMessageId,
  }: {
    receiverUsername: string;
    images: File[];
    replyToMessageId?: string;
  }) => {
    const responses = await messageApi.sendMultipleImages(
      receiverUsername,
      images,
      replyToMessageId
    );
    const messages = responses; // responses는 이미 MessageDto 배열
    return { receiverUsername, messages };
  }
);

export const markMessagesAsRead = createAsyncThunk(
  "message/markMessagesAsRead",
  async (username: string) => {
    await messageApi.markAsRead(username);
    return { username };
  }
);

export const deleteMessage = createAsyncThunk(
  "message/deleteMessage",
  async ({ roomId, messageId }: { roomId: string; messageId: string }) => {
    await messageApi.deleteMessage(messageId);
    return { roomId, messageId };
  }
);

export const createChatRoom = createAsyncThunk(
  "message/createChatRoom",
  async (username: string) => {
    return await messageApi.createChatRoom(username);
  }
);

export const fetchChatRoomInfo = createAsyncThunk(
  "message/fetchChatRoomInfo",
  async (roomId: string) => {
    const response = await messageApi.getChatRoomInfo(roomId);
    return response;
  }
);

export const searchMessages = createAsyncThunk(
  "message/searchMessages",
  async ({
    query,
    roomId,
    page = 1,
    limit = 20,
  }: {
    query: string;
    roomId?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await messageApi.searchMessages(
      query,
      roomId,
      page,
      limit
    );
    return { roomId, ...response };
  }
);

// Slice
const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    // 현재 채팅방 설정
    setCurrentRoom: (state, action: PayloadAction<string | null>) => {
      state.currentRoomId = action.payload;
      if (action.payload) {
        const roomIdNum = parseInt(action.payload, 10);
        state.currentRoom =
          state.chatRooms.find((room) => room.id === roomIdNum) || null;
      } else {
        state.currentRoom = null;
      }
    },

    // 새 메시지 추가 (실시간)
    addNewMessage: (
      state,
      action: PayloadAction<{ message: Message; username: string }>
    ) => {
      const { message, username } = action.payload;

      if (!state.messages[username]) {
        state.messages[username] = [];
      }

      // read 표준화 (read 우선, 없으면 isRead 사용)
      const normalizedMessage: Message = {
        ...message,
        read: (message as any).read ?? (message as any).isRead ?? false,
      } as Message;

      // 중복 메시지 체크 (이미 있는 메시지는 추가하지 않음)
      const existingMessage = state.messages[username].find(
        (m) => m.id === normalizedMessage.id
      );

      if (!existingMessage) {
        state.messages[username].push(normalizedMessage);
      }
    },

    // 메시지 업데이트 (실시간)
    updateMessage: (
      state,
      action: PayloadAction<{
        roomId: string;
        messageId: string;
        updates: Partial<Message>;
      }>
    ) => {
      const { roomId, messageId, updates } = action.payload;
      const messages = state.messages[roomId];

      if (messages) {
        const index = messages.findIndex(
          (msg) => msg && msg.id.toString() === messageId
        );
        if (index !== -1 && messages[index]) {
          messages[index] = { ...messages[index], ...updates };
        }
      }
    },

    // 메시지 읽음 상태 로컬 업데이트
    markMessagesAsReadLocal: (
      state,
      action: PayloadAction<{ messageIds: number[] }>
    ) => {
      const { messageIds } = action.payload;

      // 모든 사용자의 메시지에서 해당 메시지들을 읽음 처리
      Object.keys(state.messages).forEach((username) => {
        const messages = state.messages[username];
        messages.forEach((message) => {
          if (messageIds.includes(message.id)) {
            message.read = true;
          }
        });
      });
    },

    // 타이핑 상태 업데이트
    updateTypingStatus: (state, action: PayloadAction<TypingStatus>) => {
      const { roomId, userId, isTyping } = action.payload;

      if (!state.typingUsers[roomId]) {
        state.typingUsers[roomId] = [];
      }

      if (isTyping) {
        if (!state.typingUsers[roomId].includes(userId)) {
          state.typingUsers[roomId].push(userId);
        }
      } else {
        state.typingUsers[roomId] = state.typingUsers[roomId].filter(
          (id) => id !== userId
        );
      }
    },

    // 온라인 사용자 업데이트
    updateOnlineUsers: (
      state,
      action: PayloadAction<{ roomId: string; userIds: string[] }>
    ) => {
      const { roomId, userIds } = action.payload;
      state.onlineUsers[roomId] = userIds;
    },

    // 선택된 이미지 관리
    setSelectedImages: (state, action: PayloadAction<File[]>) => {
      state.selectedImages = action.payload;
    },

    setImagePreviewUrls: (state, action: PayloadAction<string[]>) => {
      state.imagePreviewUrls = action.payload;
    },

    // 에러 초기화
    clearError: (
      state,
      action: PayloadAction<"chatRooms" | "messages" | "sending">
    ) => {
      state.error[action.payload] = null;
    },

    // 모든 에러 초기화
    clearAllErrors: (state) => {
      state.error = {
        chatRooms: null,
        messages: null,
        sending: null,
      };
    },

    // 메시지 초기화
    clearMessages: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      state.messages[roomId] = [];
      state.messagePagination[roomId] = {
        page: 1,
        limit: 50,
        hasMore: false,
      };
    },
  },
  extraReducers: (builder) => {
    // 채팅방 목록 조회
    builder
      .addCase(fetchChatRooms.pending, (state) => {
        state.loading.chatRooms = true;
        state.error.chatRooms = null;
      })
      .addCase(fetchChatRooms.fulfilled, (state, action) => {
        state.loading.chatRooms = false;
        state.chatRooms = action.payload.rooms;
      })
      .addCase(fetchChatRooms.rejected, (state, action) => {
        state.loading.chatRooms = false;
        state.error.chatRooms =
          action.error.message || "채팅방 목록을 불러오는데 실패했습니다.";
      });

    // 메시지 조회
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading.messages = true;
        state.error.messages = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading.messages = false;
        const { username, messages, pagination } = action.payload;
        state.messages[username] = messages;
        state.messagePagination[username] = pagination;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading.messages = false;
        state.error.messages =
          action.error.message || "메시지를 불러오는데 실패했습니다.";
      });

    // 메시지 전송
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading.sending = true;
        state.error.sending = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading.sending = false;
        const { receiverUsername, message } = action.payload;

        if (!state.messages[receiverUsername]) {
          state.messages[receiverUsername] = [];
        }

        if (message) {
          // MessageDto를 Message로 변환 (백엔드에서 MessageDto를 직접 반환)
          const newMessage: Message = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderUsername: message.senderUsername,
            senderFullName: message.senderFullName,
            receiverId: message.receiverId,
            receiverUsername: message.receiverUsername,
            receiverFullName: message.receiverFullName,
            createdAt: message.createdAt,
            messageType: message.messageType || "TEXT",
            imageUrl: message.imageUrl,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            sharedPostId: message.sharedPostId,
            sharedPost: message.sharedPost,
            read: message.read || false, // API에서 이미 read로 변환됨
            roomId: message.roomId || receiverUsername,
          };

          state.messages[receiverUsername].push(newMessage);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading.sending = false;
        state.error.sending =
          action.error.message || "메시지 전송에 실패했습니다.";
      });

    // 이미지 메시지 전송
    builder.addCase(sendImageMessage.fulfilled, (state, action) => {
      const { receiverUsername, message } = action.payload;
      if (!state.messages[receiverUsername]) {
        state.messages[receiverUsername] = [];
      }
      if (message) {
        // MessageDto를 Message로 변환
        const newMessage: Message = {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          senderUsername: message.senderUsername,
          senderFullName: message.senderFullName,
          receiverId: message.receiverId,
          receiverUsername: message.receiverUsername,
          receiverFullName: message.receiverFullName,
          createdAt: message.createdAt,
          messageType: message.messageType || "TEXT",
          imageUrl: message.imageUrl,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          sharedPostId: message.sharedPostId,
          sharedPost: message.sharedPost,
          read: message.read || false, // API에서 이미 read로 변환됨
          roomId: receiverUsername,
        };
        state.messages[receiverUsername].push(newMessage);
      }
    });

    // 여러 이미지 전송
    builder.addCase(sendMultipleImages.fulfilled, (state, action) => {
      const { receiverUsername, messages } = action.payload;
      if (!state.messages[receiverUsername]) {
        state.messages[receiverUsername] = [];
      }
      if (messages && messages.length > 0) {
        const validMessages = messages.filter((msg) => msg !== undefined);
        if (validMessages.length > 0) {
          // MessageDto를 Message로 변환
          const convertedMessages: Message[] = validMessages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderUsername: msg.senderUsername,
            senderFullName: msg.senderFullName,
            receiverId: msg.receiverId,
            receiverUsername: msg.receiverUsername,
            receiverFullName: msg.receiverFullName,
            createdAt: msg.createdAt,
            messageType: msg.messageType || "TEXT",
            imageUrl: msg.imageUrl,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            sharedPostId: msg.sharedPostId,
            sharedPost: msg.sharedPost,
            read: msg.read || false,
            roomId: msg.roomId || receiverUsername,
          }));
          state.messages[receiverUsername].push(...convertedMessages);
        }
      }
    });

    // 메시지 읽음 처리
    builder.addCase(markMessagesAsRead.fulfilled, (state, action) => {
      const { username } = action.payload;
      const messages = state.messages[username];

      if (messages) {
        messages.forEach((message) => {
          if (message) {
            message.read = true;
          }
        });
      }
    });

    // 메시지 삭제
    builder.addCase(deleteMessage.fulfilled, (state, action) => {
      const { roomId, messageId } = action.payload;
      const messages = state.messages[roomId];

      if (messages) {
        state.messages[roomId] = messages.filter(
          (msg) => msg && msg.id.toString() !== messageId
        );
      }
    });

    // 채팅방 생성
    builder.addCase(createChatRoom.fulfilled, (state) => {
      // 새 채팅방이 생성되면 목록을 새로고침해야 함
      // state를 사용하지 않으므로 언더스코어 추가
      void state;
    });

    // 채팅방 정보 조회
    builder.addCase(fetchChatRoomInfo.fulfilled, (state, action) => {
      state.currentRoom = action.payload;
    });
  },
});

export const {
  setCurrentRoom,
  addNewMessage,
  updateMessage,
  markMessagesAsReadLocal,
  updateTypingStatus,
  updateOnlineUsers,
  setSelectedImages,
  setImagePreviewUrls,
  clearError,
  clearAllErrors,
  clearMessages,
} = messageSlice.actions;

export default messageSlice.reducer;
