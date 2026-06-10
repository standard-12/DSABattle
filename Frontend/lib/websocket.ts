export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

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

export function createJoinQueueMessage(userId: string, username: string): WebSocketMessage {
  return { type: 'join_queue', payload: { userId, username }, timestamp: Date.now() };
}

export function createLeaveQueueMessage(userId: string): WebSocketMessage {
  return { type: 'leave_queue', payload: { userId }, timestamp: Date.now() };
}

export function createHeartbeatMessage(userId: string): WebSocketMessage {
  return { type: 'heartbeat', payload: { userId }, timestamp: Date.now() };
}
