// 백엔드 MessageDto와 일치하는 메시지 타입
export interface Message {
  id: number; // Long -> number
  content: string;
  senderId: number; // Long -> number
  senderUsername: string; // 백엔드에서 제공
  senderFullName: string; // senderName -> senderFullName
  receiverId: number; // Long -> number
  receiverUsername: string; // 백엔드에서 제공
  receiverFullName: string; // 백엔드에서 제공
  createdAt: string; // timestamp -> createdAt
  read: boolean;
  messageType: "TEXT" | "IMAGE" | "FILE" | "POST_SHARE";
  imageUrl?: string;
  fileUrl?: string; // 백엔드에서 제공
  fileName?: string; // 백엔드에서 제공
  sharedPostId?: number; // Long -> number
  sharedPost?: PostShare; // 공유된 게시글 정보
  roomId: string; // 백엔드에서 제공
  // 프로필 이미지는 별도로 관리 (백엔드 MessageDto에는 없음)
  senderProfileImage?: string;
}

// 채팅방 관련 타입
export interface ChatRoomInfo {
  id: number;
  roomId: string;
  user1Id: number;
  user1Username: string;
  user1FullName: string;
  user1ProfileImg: string;
  user2Id: number;
  user2Username: string;
  user2FullName: string;
  user2ProfileImg: string;
  createdAt: string;
  lastMessageAt?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  active: boolean;
  unreadCount: number;
  isOtherUserOnline: boolean;
  lastSeenTime?: number;
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
  receiverUsername: string;
  content: string;
  messageType?: "TEXT" | "IMAGE" | "FILE" | "POST_SHARE";
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  sharedPostId?: number;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

// 백엔드에서 직접 반환하는 MessageDto 타입
export interface MessageDto {
  id: number;
  content: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  sharedPostId?: number;
  sharedPost?: PostShare;
  senderId: number;
  senderUsername: string;
  senderFullName: string;
  receiverId: number;
  receiverUsername: string;
  receiverFullName: string;
  createdAt: string;
  isRead: boolean; // 백엔드 원본 필드
  read: boolean; // API에서 isRead를 read로 변환
  messageType: "TEXT" | "IMAGE" | "FILE" | "POST_SHARE";
  roomId: string;
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
  read: boolean;
  error?: string;
}

// 게시글 공유 타입
export interface PostShare {
  id: number;
  content: string;
  imgUrl?: string;
  authorId: number;
  authorUsername: string;
  authorFullName: string;
  authorProfileImg?: string;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  createdAt: string;
  deleted: boolean;
}
