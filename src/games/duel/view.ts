import type { ClientMessage } from './engines';

/** What the duel page hands to each game's view. */
export type ViewProps<S> = {
  /** Latest referee snapshot, or null before a room exists (the view shows an empty board). */
  state: S | null;
  me: string;
  send(message: ClientMessage): void;
  /** Current time on the referee's clock. */
  serverNow: number;
  /** Referee time minus local time (Date.now), for animations that run between snapshots. */
  offset: number;
  code: string | null;
  name: string;
  /** A message that overrides the game's own line (connection trouble). */
  notice: string | null;
  connected: boolean;
  soundOpen: boolean;
  closeSound(): void;
};

export const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
