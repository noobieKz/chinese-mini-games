import type { Reply, RoomView } from '../../shared/types';
type Events = {
  connect: undefined;
  disconnect: undefined;
  room: RoomView;
  replaced: undefined;
  'room-expired': string;
  'auth-required': undefined;
};
type Listener = (value: unknown) => void;
class RoomSocket {
  connected = false;
  private ws: WebSocket | null = null;
  private listeners = new Map<keyof Events, Set<Listener>>();
  private pending = new Map<
    number,
    {
      resolve: (reply: Reply) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private sequence = 0;
  private wanted = false;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private attempt = 0;
  on<K extends keyof Events>(event: K, listener: (value: Events[K]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Listener);
  }
  off<K extends keyof Events>(event: K, listener: (value: Events[K]) => void) {
    this.listeners.get(event)?.delete(listener as Listener);
  }
  private emit<K extends keyof Events>(event: K, value: Events[K]) {
    this.listeners.get(event)?.forEach((fn) => fn(value));
  }
  connect() {
    this.wanted = true;
    if (this.ws && this.ws.readyState <= 1) return;
    clearTimeout(this.retry);
    const url = new URL('/api/socket', location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = (this.ws = new WebSocket(url));
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.connected = true;
      this.attempt = 0;
      this.emit('connect', undefined);
    };
    ws.onmessage = (message) => {
      if (this.ws !== ws) return;
      try {
        const data = JSON.parse(message.data);
        if (Number.isSafeInteger(data.id)) {
          const pending = this.pending.get(data.id);
          if (pending) {
            clearTimeout(pending.timer);
            this.pending.delete(data.id);
            if (data.reply.error) pending.reject(new Error(data.reply.error));
            else pending.resolve(data.reply);
          }
        } else if (this.listeners.has(data.event)) this.emit(data.event, data.data);
      } catch {
        /* Ignore malformed transport messages. */
      }
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.connected = false;
      this.emit('disconnect', undefined);
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error('Đã mất kết nối. Hãy thử lại sau khi kết nối lại.'));
      }
      this.pending.clear();
      if (this.wanted)
        this.retry = setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.attempt++, 10000));
    };
    ws.onerror = () => {
      /* onclose handles recovery. */
    };
  }
  disconnect() {
    this.wanted = false;
    clearTimeout(this.retry);
    const old = this.ws;
    this.ws = null;
    old?.close();
    if (this.connected) this.emit('disconnect', undefined);
    this.connected = false;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('Đã đóng kết nối.'));
    }
    this.pending.clear();
  }
  request(event: string, payload: unknown = {}): Promise<Reply> {
    return new Promise((resolve, reject) => {
      if (!this.connected || this.ws?.readyState !== 1) {
        reject(new Error('Chưa kết nối được máy chủ. Hãy thử lại sau giây lát.'));
        return;
      }
      const id = ++this.sequence;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Máy chủ phản hồi chậm. Hãy kiểm tra trạng thái trước khi thử lại.'));
      }, 8000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, event, data: payload }));
    });
  }
}
export const socket = new RoomSocket();
export const request = (event: string, payload: unknown = {}) => socket.request(event, payload);
