import { getToken } from "./api";
import type { WsEvent } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

type Listener = (event: WsEvent) => void;

class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectDelay = 1000;
  private shouldReconnect = false;
  private onReconnect: (() => void) | null = null;

  connect(onReconnect?: () => void) {
    this.shouldReconnect = true;
    if (onReconnect) this.onReconnect = onReconnect;
    this.open(false);
  }

  private open(isReconnect: boolean) {
    const token = getToken();
    if (!token) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this.ws = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      if (isReconnect) this.onReconnect?.();
    };

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WsEvent;
        this.listeners.forEach((fn) => fn(event));
      } catch {}
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.shouldReconnect) {
        setTimeout(() => this.open(true), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 15000);
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  sendTyping(conversationId: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "typing", conversation_id: conversationId }));
    }
  }
}

export const wsClient = new WsClient();
