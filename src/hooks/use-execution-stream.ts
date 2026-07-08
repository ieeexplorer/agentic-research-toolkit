"use client";

import { useEffect, useRef, useState } from "react";
import { useToolkitStore, type ExecutionEvent } from "@/hooks/use-toolkit-store";

const MAX_EVENTS = 20;

export function useExecutionStream() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const eventsRef = useRef<ExecutionEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setLiveEvents } = useToolkitStore();
  const connectFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const handleConnect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource("/api/executions/stream");
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
      };

      es.onmessage = (e) => {
        try {
          const event: ExecutionEvent = JSON.parse(e.data);
          const next = [...eventsRef.current, event];
          const trimmed = next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
          eventsRef.current = trimmed;
          setEvents(trimmed);
          setLiveEvents(trimmed);
        } catch {
          // Ignore malformed events
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        eventSourceRef.current = null;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectFnRef.current();
        }, 3000);
      };
    };

    connectFnRef.current = handleConnect;
    handleConnect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setLiveEvents]);

  const reconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
    connectFnRef.current();
  };

  return { events, connected, reconnect };
}