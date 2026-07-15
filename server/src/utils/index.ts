export function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateBattleRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

const REDACTED_KEYS = new Set(['code', 'sourceCode', 'source_code']);
const MAX_STRING_LEN = 120;

/** Safe-for-logs summary of a message payload: redacts source code, truncates long strings. */
export function summarizePayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    return payload.length > MAX_STRING_LEN ? `${payload.slice(0, MAX_STRING_LEN)}…(${payload.length} chars)` : payload;
  }
  if (Array.isArray(payload)) {
    return payload.map(summarizePayload);
  }
  if (payload && typeof payload === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(key) && typeof value === 'string') {
        out[key] = `<redacted, ${value.length} chars>`;
      } else {
        out[key] = summarizePayload(value);
      }
    }
    return out;
  }
  return payload;
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
