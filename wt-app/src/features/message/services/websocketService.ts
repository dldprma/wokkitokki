import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, any> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // JWT 토큰 가져오기
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const token = user.accessToken;

        if (!token) {
          reject(new Error("No access token found"));
          return;
        }

        // SockJS 연결 시 헤더로 토큰 전송
        const socket = new SockJS("http://localhost:8080/ws", null, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        this.client = new Client({
          webSocketFactory: () => socket,
          debug: (str) => {},
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });

        this.client.onConnect = (frame) => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.client.onStompError = (frame) => {
          console.error("WebSocket STOMP 에러:", frame);
          this.isConnected = false;
          reject(new Error(frame.headers["message"] || "STOMP 연결 에러"));
        };

        this.client.onWebSocketError = (error) => {
          console.error("WebSocket 에러:", error);
          this.isConnected = false;
          reject(error);
        };

        this.client.onWebSocketClose = () => {
          this.isConnected = false;
          this.cleanup();
        };

        this.client.activate();
      } catch (error) {
        console.error("WebSocket 연결 실패:", error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.client && this.isConnected) {
      this.cleanup();
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
    }
  }

  private cleanup(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }

  subscribe(destination: string, callback: (message: any) => void): string {
    if (!this.client || !this.isConnected) {
      console.error("WebSocket이 연결되지 않았습니다.");
      return "";
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const body = JSON.parse(message.body);
        callback(body);
      } catch (error) {
        console.error("메시지 파싱 에러:", error);
        callback(message.body);
      }
    });

    const subscriptionId = subscription.id;
    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  sendMessage(destination: string, message: any): void {
    if (!this.client || !this.isConnected) {
      console.error("WebSocket이 연결되지 않았습니다.");
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(message),
    });
  }

  sendTypingStatus(receiverUsername: string, isTyping: boolean): void {
    this.sendMessage("/app/typing", {
      receiverUsername,
      isTyping,
    });
  }

  sendStopTyping(receiverUsername: string): void {
    this.sendMessage("/app/stop-typing", {
      receiverUsername,
    });
  }

  sendMessageToUser(receiverUsername: string, messageData: any): void {
    this.sendMessage("/app/send", {
      receiverUsername,
      ...messageData,
    });
  }

  // 하트비트 전송
  sendHeartbeat(): void {
    if (this.client && this.isConnected && this.client.connected) {
      try {
        this.client.publish({
          destination: "/app/heartbeat",
          body: "",
        });
      } catch (error) {
        console.error("하트비트 전송 실패:", error);
        this.isConnected = false;
      }
    }
  }

  subscribeToUserMessages(
    username: string,
    callback: (message: any) => void
  ): string {
    return this.subscribe(`/user/${username}/queue/messages`, callback);
  }

  subscribeToTypingStatus(
    username: string,
    callback: (status: any) => void
  ): string {
    return this.subscribe(`/user/${username}/queue/typing`, callback);
  }

  isWebSocketConnected(): boolean {
    return this.isConnected;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
