import { useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "../../../shared/types";

const getWsUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
};

export function useWebSocket(onMessage: (msg: WebSocketMessage) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WebSocketMessage;
          onMessageRef.current(msg);
        } catch {
          // ignore parse errors
        }
      };
    }

    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  return connected;
}
