/** Read the room parameter before considering digits in an invite's host or port. */
export function parsePastedRoomCode(text: string): string | null {
  const value = text.normalize('NFKC').trim();
  const digits = value.replace(/[\s-]/g, '');
  if (/^\d{6}$/.test(digits)) return digits;
  try {
    const url = new URL(value, 'https://hanplay.invalid');
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const code = url.searchParams.get('room');
    return code && /^\d{6}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}
