'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  WS_URL,
  Language,
  WebSocketMessage,
  createJoinBattleMessage,
  createBattleSubmitMessage,
  createHeartbeatMessage,
} from '@/lib/websocket';

export interface BattleSubmissionResult {
  verdict: string;
  passedTestcases: number;
  totalTestcases: number;
  runtimeMs: number | null;
  memoryKb: number | null;
}

export interface UseBattleSocketOptions {
  battleId: string;
  userId: string;
  username: string;
}

export interface UseBattleSocketState {
  connected: boolean;
  joined: boolean;
  submitting: boolean;
  result: BattleSubmissionResult | null;
  opponentSubmitted: { username: string; verdict: string } | null;
  battleEnded: boolean;
  outcome: 'WIN' | 'LOSS' | null;
  ratingChange: number | null;
  newRating: number | null;
  winnerUsername: string | null;
  error: string | null;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 3_000;

const initialState: UseBattleSocketState = {
  connected: false,
  joined: false,
  submitting: false,
  result: null,
  opponentSubmitted: null,
  battleEnded: false,
  outcome: null,
  ratingChange: null,
  newRating: null,
  winnerUsername: null,
  error: null,
};

export function useBattleSocket(options: UseBattleSocketOptions) {
  const [state, setState] = useState<UseBattleSocketState>(initialState);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalRef = useRef(false);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const sendRaw = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) return;
    if (!options.battleId || !options.userId) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'string') return;

      let message: WebSocketMessage;
      try {
        message = JSON.parse(event.data) as WebSocketMessage;
      } catch {
        return;
      }

      switch (message.type) {
        case 'connected':
          setState((prev) => ({ ...prev, connected: true, error: null }));
          // Register this connection with the battle room
          sendRaw(createJoinBattleMessage(options.battleId, options.userId, options.username));
          // Keep the connection alive
          heartbeatRef.current = setInterval(() => {
            sendRaw(createHeartbeatMessage(options.userId));
          }, HEARTBEAT_INTERVAL_MS);
          break;

        case 'battle_joined':
          setState((prev) => ({
            ...prev,
            joined: true,
            error: null,
            battleEnded: message.payload?.status === 'ENDED' ? true : prev.battleEnded,
          }));
          break;

        case 'submission_result':
          setState((prev) => ({
            ...prev,
            submitting: false,
            result: {
              verdict: message.payload?.verdict as string,
              passedTestcases: (message.payload?.passedTestcases as number) ?? 0,
              totalTestcases: (message.payload?.totalTestcases as number) ?? 0,
              runtimeMs: (message.payload?.runtimeMs as number) ?? null,
              memoryKb: (message.payload?.memoryKb as number) ?? null,
            },
          }));
          break;

        case 'opponent_submitted':
          setState((prev) => ({
            ...prev,
            opponentSubmitted: {
              username: message.payload?.username as string,
              verdict: message.payload?.verdict as string,
            },
          }));
          break;

        case 'battle_ended':
          setState((prev) => ({
            ...prev,
            submitting: false,
            battleEnded: true,
            outcome: (message.payload?.outcome as 'WIN' | 'LOSS') ?? null,
            ratingChange: (message.payload?.ratingChange as number) ?? null,
            newRating: (message.payload?.newRating as number) ?? null,
            winnerUsername: (message.payload?.winnerUsername as string) ?? null,
          }));
          clearHeartbeat();
          break;

        case 'error':
          setState((prev) => ({
            ...prev,
            submitting: false,
            error: (message.payload?.message as string) ?? 'Unknown error',
          }));
          break;

        default:
          break;
      }
    });

    ws.addEventListener('close', () => {
      clearHeartbeat();
      wsRef.current = null;
      setState((prev) => ({ ...prev, connected: false }));

      // Reconnect unless we intentionally left or the battle is over
      if (!intentionalRef.current) {
        reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    });

    ws.addEventListener('error', () => {
      setState((prev) => ({ ...prev, error: 'Connection error' }));
    });
  }, [options.battleId, options.userId, options.username, sendRaw, clearHeartbeat]);

  const submit = useCallback(
    (problemId: string, code: string, language: Language) => {
      setState((prev) => ({ ...prev, submitting: true, result: null, error: null }));
      sendRaw(createBattleSubmitMessage(options.battleId, options.userId, problemId, code, language));
    },
    [options.battleId, options.userId, sendRaw],
  );

  useEffect(() => {
    intentionalRef.current = false;
    connect();

    return () => {
      intentionalRef.current = true;
      clearHeartbeat();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, submit };
}
