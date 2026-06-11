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

export interface JoinBattleMessage extends WebSocketMessage {
  type: 'join_battle';
  payload: { battleId: string; userId: string; username: string };
}

export interface BattleSubmitMessage extends WebSocketMessage {
  type: 'battle_submit';
  payload: {
    battleId: string;
    userId: string;
    problemId: string;
    code: string;
    language: Language;
  };
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

/** Confirms the user joined a battle room; opponent is null until they arrive. */
export interface BattleJoinedMessage extends WebSocketMessage {
  type: 'battle_joined';
  payload: {
    battleId: string;
    status: string;
    opponent: { userId: string; username: string } | null;
  };
}

/** Verdict for the submitter's own battle submission. */
export interface SubmissionResultMessage extends WebSocketMessage {
  type: 'submission_result';
  payload: {
    verdict: string;
    passedTestcases: number;
    totalTestcases: number;
    runtimeMs: number | null;
    memoryKb: number | null;
  };
}

/** Tells a player their opponent just submitted (and the verdict). */
export interface OpponentSubmittedMessage extends WebSocketMessage {
  type: 'opponent_submitted';
  payload: { username: string; verdict: string };
}

/** Final result, sent to both players. `outcome` is relative to the recipient. */
export interface BattleEndedMessage extends WebSocketMessage {
  type: 'battle_ended';
  payload: {
    winnerId: string;
    winnerUsername: string;
    outcome: 'WIN' | 'LOSS';
    ratingChange: number;
    newRating: number;
  };
}

// ── Union types ───────────────────────────────────────────────────────────────

export type ServerMessage =
  | ConnectedMessage
  | QueueJoinedMessage
  | MatchFoundMessage
  | ErrorMessage
  | BattleJoinedMessage
  | SubmissionResultMessage
  | OpponentSubmittedMessage
  | BattleEndedMessage;

export type ClientMessage =
  | JoinQueueMessage
  | LeaveQueueMessage
  | HeartbeatMessage
  | JoinBattleMessage
  | BattleSubmitMessage;

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

export function isJoinBattleMessage(msg: ClientMessage): msg is JoinBattleMessage {
  return msg.type === 'join_battle';
}

export function isBattleSubmitMessage(msg: ClientMessage): msg is BattleSubmitMessage {
  return msg.type === 'battle_submit';
}
