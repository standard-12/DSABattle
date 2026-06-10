export function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateBattleRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function parseMessage(data: unknown): Record<string, unknown> | null {
  try {
    // ws delivers messages as Buffer (binary frames) or string (text frames)
    const str =
      Buffer.isBuffer(data) ? data.toString('utf8')
      : typeof data === 'string' ? data
      : null;

    if (!str) return null;

    const parsed: unknown = JSON.parse(str);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // malformed JSON — drop silently
  }
  return null;
}
