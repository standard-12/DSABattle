export type MessageType =
  | 'join_queue'
  | 'leave_queue'
  | 'match_found'
  | 'queue_joined'
  | 'heartbeat'
  | 'error'
  | 'connected';

export interface WebSocketMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
  timestamp: number;
}

// ── Client → Server ──────────────────────────────────────────────────────────

export interface JoinQueueMessage extends WebSocketMessage {
  type: 'join_queue';
  payload: {
    userId: string;
    username: string;
    rating: number;
    ratingLower: number;  // negative delta, e.g. -200
    ratingUpper: number;  // positive delta, e.g. +200
  };
}

export interface LeaveQueueMessage extends WebSocketMessage {
  type: 'leave_queue';
  payload: { userId: string };
}

export interface HeartbeatMessage extends WebSocketMessage {
  type: 'heartbeat';
  payload: { userId: string };
}

// ── Server → Client ──────────────────────────────────────────────────────────

export interface ConnectedMessage extends WebSocketMessage {
  type: 'connected';
  payload: { clientId: string };
}

/** Sent after a user is successfully added to the matchmaking queue. */
export interface QueueJoinedMessage extends WebSocketMessage {
  type: 'queue_joined';
  payload: { queueSize: number };
}

export interface MatchFoundMessage extends WebSocketMessage {
  type: 'match_found';
  payload: {
    battleRoomId: string;
    opponent: { userId: string; username: string };
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  payload: { message: string; code?: string };
}

// ── Union types ───────────────────────────────────────────────────────────────

export type ServerMessage =
  | ConnectedMessage
  | QueueJoinedMessage
  | MatchFoundMessage
  | ErrorMessage;

export type ClientMessage =
  | JoinQueueMessage
  | LeaveQueueMessage
  | HeartbeatMessage;

// ── Type guards ───────────────────────────────────────────────────────────────

export function isJoinQueueMessage(msg: ClientMessage): msg is JoinQueueMessage {
  return msg.type === 'join_queue';
}

export function isLeaveQueueMessage(msg: ClientMessage): msg is LeaveQueueMessage {
  return msg.type === 'leave_queue';
}

export function isHeartbeatMessage(msg: ClientMessage): msg is HeartbeatMessage {
  return msg.type === 'heartbeat';
}
