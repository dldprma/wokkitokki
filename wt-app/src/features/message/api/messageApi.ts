import api from "../../../utils/axios";
import type {
  ChatRoomInfo,
  SendMessageRequest,
  SendMessageResponse,
  GetMessagesResponse,
  GetChatRoomsResponse,
  MessageFilter,
} from "../types/messageTypes";

// 메시지 API 클래스
export class MessageApi {
  // 채팅방 목록 조회
  static async getChatRooms(): Promise<GetChatRoomsResponse> {
    const response = await api.get("/api/messages/chat-rooms");
    // 백엔드가 배열을 직접 반환하므로 GetChatRoomsResponse 구조로 변환
    return {
      rooms: response.data,
      pagination: {
        page: 1,
        limit: response.data.length,
        hasMore: false,
        total: response.data.length,
      },
    };
  }

  // 특정 사용자와의 메시지 조회
  static async getMessages(
    username: string,
    page = 1,
    limit = 50,
    filter?: MessageFilter
  ): Promise<GetMessagesResponse> {
    const response = await api.get(`/api/messages/with/${username}`, {
      params: { page, size: limit, ...filter },
    });

    // Spring Page 응답을 프론트엔드 형식으로 변환
    const springPageData = response.data;
    return {
      messages: springPageData.content || [],
      pagination: {
        page: springPageData.pageable?.pageNumber || 0,
        size: springPageData.pageable?.pageSize || limit,
        totalElements: springPageData.totalElements || 0,
        totalPages: springPageData.totalPages || 0,
        first: springPageData.first || false,
        last: springPageData.last || false,
      },
    };
  }

  // 메시지 전송
  static async sendMessage(
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const formData = new FormData();
    formData.append("receiverUsername", request.receiverUsername);
    formData.append("content", request.content);
    formData.append("messageType", request.messageType || "TEXT");

    if (request.imageUrl) {
      formData.append("imageUrl", request.imageUrl);
    }
    if (request.fileUrl) {
      formData.append("fileUrl", request.fileUrl);
    }
    if (request.fileName) {
      formData.append("fileName", request.fileName);
    }
    if (request.sharedPostId) {
      formData.append("sharedPostId", request.sharedPostId.toString());
    }

    const response = await api.post("/api/messages/send", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // 이미지 메시지 전송 (multipart/form-data)
  static async sendImageMessage(
    receiverUsername: string,
    image: File,
    replyToMessageId?: string
  ): Promise<SendMessageResponse> {
    const formData = new FormData();
    formData.append("receiverUsername", receiverUsername);
    formData.append("content", ""); // 빈 내용
    formData.append("messageType", "IMAGE");
    formData.append("image", image);
    if (replyToMessageId) {
      formData.append("replyToMessageId", replyToMessageId);
    }

    const response = await api.post("/api/messages/send", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  // 여러 이미지 메시지 전송
  static async sendMultipleImages(
    receiverUsername: string,
    images: File[],
    replyToMessageId?: string
  ): Promise<SendMessageResponse[]> {
    const promises = images.map((image) =>
      this.sendImageMessage(receiverUsername, image, replyToMessageId)
    );
    return Promise.all(promises);
  }

  // 메시지 읽음 처리
  static async markAsRead(username: string): Promise<void> {
    await api.post(`/api/messages/mark-read/${username}`);
  }

  // 게시글 공유 메시지 전송
  static async sharePost(
    receiverUsername: string,
    postId: number,
    message?: string
  ): Promise<SendMessageResponse> {
    const response = await api.post("/api/messages/share-post", {
      receiverUsername,
      postId,
      message: message || "게시글을 공유했습니다.",
    });
    return { success: true, message: response.data };
  }

  // 메시지 삭제
  static async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/api/messages/${messageId}`);
    return response.data;
  }

  // 채팅방 생성
  static async createChatRoom(username: string): Promise<any> {
    const response = await api.post("/api/messages/chat-rooms", {
      username,
    });
    return response.data;
  }

  // 채팅방 정보 조회
  static async getChatRoomInfo(roomId: string): Promise<ChatRoomInfo> {
    const response = await api.get(`/api/messages/rooms/${roomId}`);
    return response.data;
  }

  // 채팅방 삭제 (나가기)
  static async deleteChatRoom(roomId: string): Promise<void> {
    await api.delete(`/api/messages/chat-rooms/${roomId}`);
  }

  // 채팅방 참여자 추가
  static async addParticipants(
    roomId: string,
    participantIds: string[]
  ): Promise<{ success: boolean }> {
    const response = await api.post(
      `/api/messages/rooms/${roomId}/participants`,
      {
        participantIds,
      }
    );
    return response.data;
  }

  // 채팅방 나가기
  static async leaveChatRoom(roomId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/api/messages/rooms/${roomId}/leave`);
    return response.data;
  }

  // 사용자 검색
  static async searchUsers(keyword: string, size = 20): Promise<any> {
    const response = await api.get("/api/messages/search/users", {
      params: { keyword, size },
    });
    return response.data;
  }

  // 메시지 검색
  static async searchMessages(
    query: string,
    roomId?: string,
    page = 1,
    limit = 20
  ): Promise<GetMessagesResponse> {
    const response = await api.get("/api/messages/search", {
      params: { query, roomId, page, limit },
    });
    return response.data;
  }

  // 타이핑 상태 전송
  static async sendTypingStatus(
    roomId: string,
    isTyping: boolean
  ): Promise<{ success: boolean }> {
    const response = await api.post("/api/messages/typing", {
      roomId,
      isTyping,
    });
    return response.data;
  }

  // 사용자 온라인 상태 조회
  static async getOnlineUsers(roomId: string): Promise<{
    onlineUsers: Array<{ userId: string; lastSeen: string }>;
  }> {
    const response = await api.get(
      `/api/messages/rooms/${roomId}/online-users`
    );
    return response.data;
  }

  // 특정 사용자 온라인 상태 조회
  static async getUserOnlineStatus(username: string): Promise<{
    userId: number;
    username: string;
    isOnline: boolean;
  }> {
    const response = await api.get(
      `/api/messages/users/${username}/online-status`
    );
    return response.data;
  }

  // 메시지 통계 조회
  static async getMessageStats(roomId: string): Promise<{
    totalMessages: number;
    unreadCount: number;
    lastMessageTime: string;
  }> {
    const response = await api.get(`/api/messages/rooms/${roomId}/stats`);
    return response.data;
  }
}

// 편의를 위한 함수들
export const messageApi = {
  // 채팅방 관련
  getChatRooms: MessageApi.getChatRooms,
  getChatRoomInfo: MessageApi.getChatRoomInfo,
  createChatRoom: MessageApi.createChatRoom,
  deleteChatRoom: MessageApi.deleteChatRoom,
  addParticipants: MessageApi.addParticipants,
  leaveChatRoom: MessageApi.leaveChatRoom,

  // 메시지 관련
  getMessages: MessageApi.getMessages,
  sendMessage: MessageApi.sendMessage,
  sendImageMessage: MessageApi.sendImageMessage,
  sendMultipleImages: MessageApi.sendMultipleImages,
  sharePost: MessageApi.sharePost,
  deleteMessage: MessageApi.deleteMessage,
  markAsRead: MessageApi.markAsRead,

  // 검색 및 통계
  searchUsers: MessageApi.searchUsers,
  searchMessages: MessageApi.searchMessages,
  getMessageStats: MessageApi.getMessageStats,

  // 실시간 기능
  sendTypingStatus: MessageApi.sendTypingStatus,
  getOnlineUsers: MessageApi.getOnlineUsers,

  // 온라인 상태 조회
  getUserOnlineStatus: MessageApi.getUserOnlineStatus,
};
