/**
 * Join/host token for the current room. Kept in localStorage (not sessionStorage) so a
 * student whose mobile browser closes the tab can reopen the site and continue playing.
 */
const KEY = 'hanplay-session';
const MAX_AGE = 6 * 3600000; // Rooms expire after 6 hours on the server.
export type SavedSession = { code: string; token: string };
export function loadSession(): SavedSession | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (
      typeof saved?.code === 'string' &&
      typeof saved?.token === 'string' &&
      typeof saved?.savedAt === 'number' &&
      Date.now() - saved.savedAt < MAX_AGE
    )
      return { code: saved.code, token: saved.token };
  } catch {
    /* Storage blocked or corrupt; fall through and clear. */
  }
  clearSession();
  return null;
}
export function saveSession(session: SavedSession) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...session, savedAt: Date.now() }));
  } catch {
    /* Private mode: the game still works, only resume after closing the tab is lost. */
  }
}
export function clearSession() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* Storage blocked. */
  }
}
