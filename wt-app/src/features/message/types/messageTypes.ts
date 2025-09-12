// 기본 메시지 타입 (MessageBubble에서 export된 것과 동일)
export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderProfileImage?: string;
  timestamp: string;
  isRead: boolean;
  messageType: "text" | "image" | "file";
}

// 채팅방 관련 타입
export interface ChatRoomInfo {
  id: string;
  name: string;
  image?: string;
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
  lastSeen?: string;
  participants: ChatParticipant[];
  createdAt: string;
  updatedAt: string;
}

// 사용자 타입 (팔로잉 목록용)
export interface User {
  id: string;
  username: string;
  name: string;
  profileImage?: string;
  isOnline: boolean;
  lastSeen: string;
}

// 채팅 참여자 타입
export interface ChatParticipant {
  id: string;
  name: string;
  profileImage?: string;
  isOnline: boolean;
  lastSeen?: string;
  joinedAt: string;
}

// 메시지 전송 관련 타입
export interface SendMessageRequest {
  roomId: string;
  content: string;
  messageType: "text" | "image";
  replyToMessageId?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

// 메시지 읽음 상태 관련 타입
export interface MarkAsReadRequest {
  roomId: string;
  messageIds: string[];
}

export interface MarkAsReadResponse {
  success: boolean;
  error?: string;
}

// 타이핑 상태 관련 타입
export interface TypingStatus {
  roomId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
}

// 메시지 필터링/검색 관련 타입
export interface MessageFilter {
  roomId?: string;
  senderId?: string;
  messageType?: "text" | "image" | "file";
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

// 페이지네이션 관련 타입
export interface MessagePagination {
  page: number;
  limit: number;
  hasMore: boolean;
  total?: number;
}

// 메시지 목록 조회 응답 타입
export interface GetMessagesResponse {
  messages: Message[];
  pagination: MessagePagination;
}

// 채팅방 목록 조회 응답 타입
export interface GetChatRoomsResponse {
  rooms: ChatRoomInfo[];
  pagination: MessagePagination;
}

// WebSocket 메시지 타입
export interface WebSocketMessage {
  type:
    | "new_message"
    | "message_read"
    | "typing_start"
    | "typing_stop"
    | "user_online"
    | "user_offline";
  data: any;
  timestamp: string;
}

// 메시지 상태 타입
export interface MessageStatus {
  isSending: boolean;
  isSent: boolean;
  isDelivered: boolean;
  isRead: boolean;
  error?: string;
}
