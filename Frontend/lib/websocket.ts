export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export type MessageType =
  | 'join_queue'
  | 'leave_queue'
  | 'match_found'
  | 'queue_joined'
  | 'heartbeat'
  | 'error'
  | 'connected'
  | 'join_battle'
  | 'battle_submit'
  | 'battle_joined'
  | 'submission_result'
  | 'opponent_submitted'
  | 'battle_ended';

export type Language = 'python' | 'java' | 'cpp';

export interface WebSocketMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export function createJoinQueueMessage(
  userId: string,
  username: string,
  rating: number,
  ratingLower: number,
  ratingUpper: number,
): WebSocketMessage {
  return { type: 'join_queue', payload: { userId, username, rating, ratingLower, ratingUpper }, timestamp: Date.now() };
}

export function createLeaveQueueMessage(userId: string): WebSocketMessage {
  return { type: 'leave_queue', payload: { userId }, timestamp: Date.now() };
}

export function createHeartbeatMessage(userId: string): WebSocketMessage {
  return { type: 'heartbeat', payload: { userId }, timestamp: Date.now() };
}

export function createJoinBattleMessage(
  battleId: string,
  userId: string,
  username: string,
): WebSocketMessage {
  return { type: 'join_battle', payload: { battleId, userId, username }, timestamp: Date.now() };
}

export function createBattleSubmitMessage(
  battleId: string,
  userId: string,
  problemId: string,
  code: string,
  language: Language,
): WebSocketMessage {
  return {
    type: 'battle_submit',
    payload: { battleId, userId, problemId, code, language },
    timestamp: Date.now(),
  };
}
