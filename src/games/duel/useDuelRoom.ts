import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, PublicState } from './engines';

export type DuelStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'full' | 'missing';

/** A stable id per browser tab and room, so a reload or a dropped connection keeps the seat. */
function playerId(code: string) {
  const key = `hanplay-duel-player-${code}`;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) return saved;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * WebSocket to one duel room. Every message from the referee is a full snapshot, so a reconnect
 * simply resumes from the next one. `offset` maps local time to the referee clock for countdowns.
 */
export function useDuelRoom(code: string | null, name: string) {
  const [state, setState] = useState<PublicState | null>(null);
  const [status, setStatus] = useState<DuelStatus>('idle');
  const [offset, setOffset] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const seen = useRef(false);
  const samples = useRef<number[]>([]);
  const me = code ? playerId(code) : '';
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    // A new room (or leaving one) starts from nothing: the previous room's snapshot must not linger,
    // or its result screen would stay over the create/join form.
    setState(null);
    seen.current = false;
    samples.current = [];
    setStatus('idle');
    if (!code) return;
    let closed = false,
      attempts = 0,
      timer: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      setStatus(attempts ? 'reconnecting' : 'connecting');
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      const query = new URLSearchParams({ player: playerId(code), name: nameRef.current });
      const ws = new WebSocket(`${protocol}://${location.host}/api/duel/${code}?${query}`);
      socket.current = ws;
      ws.onopen = () => {
        attempts = 0;
        setStatus('open');
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as {
          type: string;
          now?: number;
          state?: PublicState;
        };
        if (message.type === 'full') setStatus('full');
        if (message.type === 'state' && message.state) {
          seen.current = true;
          setState(message.state);
          if (message.now) {
            // Each sample is the clock offset minus that message's travel time. The largest recent
            // one is the least delayed, so the estimate stays steady instead of jumping with jitter.
            samples.current = [...samples.current.slice(-39), message.now - Date.now()];
            setOffset(Math.max(...samples.current));
          }
        }
      };
      ws.onclose = (event) => {
        if (closed) return;
        if (event.code === 4001) return setStatus('full');
        if (event.code === 4002) return; // replaced by a newer tab of the same player
        // 404 on the upgrade shows up as an immediate close before open.
        if (attempts >= 3 && !seen.current) return setStatus('missing');
        attempts++;
        setStatus('reconnecting');
        timer = setTimeout(connect, Math.min(4000, 500 * attempts));
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      socket.current?.close();
      socket.current = null;
    };
    // The room connection follows the code only; the name is sent on its own below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const send = useCallback((message: ClientMessage) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
  }, []);
  return { state, status, offset, send, me };
}

/** Create a room on the referee and return its invite code. */
export async function createRoom(body: unknown): Promise<string> {
  const response = await fetch('/api/duel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { code?: string; error?: string };
  if (!response.ok || !data.code) throw new Error(data.error ?? 'Không tạo được phòng.');
  return data.code;
}
