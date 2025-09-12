import axiosInstance from "../../../utils/axios";
import type {
  ChatRoomInfo,
  SendMessageRequest,
  SendMessageResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  GetMessagesResponse,
  GetChatRoomsResponse,
  MessageFilter,
} from "../types/messageTypes";

// 메시지 API 클래스
export class MessageApi {
  // 채팅방 목록 조회
  static async getChatRooms(
    page = 1,
    limit = 20
  ): Promise<GetChatRoomsResponse> {
    const response = await axiosInstance.get("/api/messages/rooms", {
      params: { page, limit },
    });
    return response.data;
  }

  // 특정 채팅방의 메시지 조회
  static async getMessages(
    roomId: string,
    page = 1,
    limit = 50,
    filter?: MessageFilter
  ): Promise<GetMessagesResponse> {
    const response = await axiosInstance.get(
      `/api/messages/rooms/${roomId}/messages`,
      {
        params: { page, limit, ...filter },
      }
    );
    return response.data;
  }

  // 메시지 전송
  static async sendMessage(
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const response = await axiosInstance.post("/api/messages/send", request);
    return response.data;
  }

  // 이미지 메시지 전송 (multipart/form-data)
  static async sendImageMessage(
    roomId: string,
    image: File,
    replyToMessageId?: string
  ): Promise<SendMessageResponse> {
    const formData = new FormData();
    formData.append("roomId", roomId);
    formData.append("image", image);
    if (replyToMessageId) {
      formData.append("replyToMessageId", replyToMessageId);
    }

    const response = await axiosInstance.post(
      "/api/messages/send-image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  }

  // 여러 이미지 메시지 전송
  static async sendMultipleImages(
    roomId: string,
    images: File[],
    replyToMessageId?: string
  ): Promise<SendMessageResponse[]> {
    const promises = images.map((image) =>
      this.sendImageMessage(roomId, image, replyToMessageId)
    );
    return Promise.all(promises);
  }

  // 메시지 읽음 처리
  static async markAsRead(
    request: MarkAsReadRequest
  ): Promise<MarkAsReadResponse> {
    const response = await axiosInstance.post(
      "/api/messages/mark-read",
      request
    );
    return response.data;
  }

  // 메시지 삭제
  static async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete(`/api/messages/${messageId}`);
    return response.data;
  }

  // 채팅방 생성
  static async createChatRoom(username: string): Promise<{ roomId: string }> {
    const response = await axiosInstance.post("/api/messages/chat-rooms", {
      username,
    });
    return response.data;
  }

  // 채팅방 정보 조회
  static async getChatRoomInfo(roomId: string): Promise<ChatRoomInfo> {
    const response = await axiosInstance.get(`/api/messages/rooms/${roomId}`);
    return response.data;
  }

  // 채팅방 참여자 추가
  static async addParticipants(
    roomId: string,
    participantIds: string[]
  ): Promise<{ success: boolean }> {
    const response = await axiosInstance.post(
      `/api/messages/rooms/${roomId}/participants`,
      {
        participantIds,
      }
    );
    return response.data;
  }

  // 채팅방 나가기
  static async leaveChatRoom(roomId: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete(
      `/api/messages/rooms/${roomId}/leave`
    );
    return response.data;
  }

  // 메시지 검색
  static async searchMessages(
    query: string,
    roomId?: string,
    page = 1,
    limit = 20
  ): Promise<GetMessagesResponse> {
    const response = await axiosInstance.get("/api/messages/search", {
      params: { query, roomId, page, limit },
    });
    return response.data;
  }

  // 타이핑 상태 전송
  static async sendTypingStatus(
    roomId: string,
    isTyping: boolean
  ): Promise<{ success: boolean }> {
    const response = await axiosInstance.post("/api/messages/typing", {
      roomId,
      isTyping,
    });
    return response.data;
  }

  // 사용자 온라인 상태 조회
  static async getOnlineUsers(roomId: string): Promise<{
    onlineUsers: Array<{ userId: string; lastSeen: string }>;
  }> {
    const response = await axiosInstance.get(
      `/api/messages/rooms/${roomId}/online-users`
    );
    return response.data;
  }

  // 메시지 통계 조회
  static async getMessageStats(roomId: string): Promise<{
    totalMessages: number;
    unreadCount: number;
    lastMessageTime: string;
  }> {
    const response = await axiosInstance.get(
      `/api/messages/rooms/${roomId}/stats`
    );
    return response.data;
  }
}

// 편의를 위한 함수들
export const messageApi = {
  // 채팅방 관련
  getChatRooms: MessageApi.getChatRooms,
  getChatRoomInfo: MessageApi.getChatRoomInfo,
  createChatRoom: MessageApi.createChatRoom,
  addParticipants: MessageApi.addParticipants,
  leaveChatRoom: MessageApi.leaveChatRoom,

  // 메시지 관련
  getMessages: MessageApi.getMessages,
  sendMessage: MessageApi.sendMessage,
  sendImageMessage: MessageApi.sendImageMessage,
  sendMultipleImages: MessageApi.sendMultipleImages,
  deleteMessage: MessageApi.deleteMessage,
  markAsRead: MessageApi.markAsRead,

  // 검색 및 통계
  searchMessages: MessageApi.searchMessages,
  getMessageStats: MessageApi.getMessageStats,

  // 실시간 기능
  sendTypingStatus: MessageApi.sendTypingStatus,
  getOnlineUsers: MessageApi.getOnlineUsers,
};
