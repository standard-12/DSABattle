'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  WS_URL,
  WebSocketMessage,
  createJoinQueueMessage,
  createLeaveQueueMessage,
  createHeartbeatMessage,
} from '@/lib/websocket';

export interface UseWebSocketOptions {
  userId: string;
  username: string;
}

export interface UseWebSocketState {
  connected: boolean;
  inQueue: boolean;
  matchFound: boolean;
  battleRoomId: string | null;
  opponent: { userId: string; username: string } | null;
  error: string | null;
  queueSize: number;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 3_000;
const STALE_TIMEOUT_MS = 60_000;

const initialState: UseWebSocketState = {
  connected: false,
  inQueue: false,
  matchFound: false,
  battleRoomId: null,
  opponent: null,
  error: null,
  queueSize: 0,
};

export function useWebSocket(options: UseWebSocketOptions) {
  const [state, setState] = useState<UseWebSocketState>(initialState);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalRef = useRef(false); // true when user explicitly disconnects

  // ── Helpers ──────────────────────────────────────────────────────────────

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const clearReconnect = useCallback(() => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const sendRaw = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // ── Connect / Disconnect ─────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current) return; // already connecting/connected

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
          // Start heartbeat once connected
          heartbeatRef.current = setInterval(() => {
            sendRaw(createHeartbeatMessage(options.userId));
          }, HEARTBEAT_INTERVAL_MS);
          break;

        case 'queue_joined':
          // Server confirmed the user is in the queue
          setState((prev) => ({
            ...prev,
            inQueue: true,
            error: null,
            queueSize: (message.payload?.queueSize as number) ?? prev.queueSize,
          }));
          break;

        case 'match_found':
          setState((prev) => ({
            ...prev,
            matchFound: true,
            inQueue: false,
            battleRoomId: message.payload?.battleRoomId as string ?? null,
            opponent: message.payload?.opponent as { userId: string; username: string } ?? null,
            error: null,
          }));
          clearHeartbeat();
          console.log('[WS] Match found:', message.payload);
          break;

        case 'error':
          setState((prev) => ({
            ...prev,
            error: message.payload?.message as string ?? 'Unknown error',
            inQueue: false,
          }));
          break;

        default:
          break;
      }
    });

    ws.addEventListener('close', () => {
      clearHeartbeat();
      wsRef.current = null;
      setState((prev) => ({ ...prev, connected: false, inQueue: false }));

      if (!intentionalRef.current) {
        console.log(`[WS] Connection lost — reconnecting in ${RECONNECT_DELAY_MS / 1000}s`);
        reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    });

    ws.addEventListener('error', () => {
      // 'close' always fires after 'error', so reconnect logic lives there
      setState((prev) => ({ ...prev, error: 'Connection error' }));
    });
  }, [options.userId, clearHeartbeat, sendRaw]);

  const disconnect = useCallback(() => {
    intentionalRef.current = true;
    clearHeartbeat();
    clearReconnect();
    wsRef.current?.close();
    wsRef.current = null;
    setState(initialState);
  }, [clearHeartbeat, clearReconnect]);

  // ── Queue actions ────────────────────────────────────────────────────────

  const joinQueue = useCallback(() => {
    if (!state.connected || state.inQueue || !options.userId) return;
    // Send to server — inQueue becomes true only when server confirms via queue_joined
    sendRaw(createJoinQueueMessage(options.userId, options.username));
    setState((prev) => ({ ...prev, error: null }));
  }, [state.connected, state.inQueue, options.userId, options.username, sendRaw]);

  const leaveQueue = useCallback(() => {
    if (!state.inQueue || !options.userId) return;
    sendRaw(createLeaveQueueMessage(options.userId));
    setState((prev) => ({ ...prev, inQueue: false }));
  }, [state.inQueue, options.userId, sendRaw]);

  // ── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    intentionalRef.current = false;
    connect();

    // Safety net: if heartbeat stops for STALE_TIMEOUT_MS, consider connection dead
    const staleSweep = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
        wsRef.current.close();
      }
    }, STALE_TIMEOUT_MS);

    return () => {
      clearInterval(staleSweep);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // connect only on mount

  return { ...state, joinQueue, leaveQueue, disconnect };
}
