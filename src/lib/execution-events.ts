export interface ExecutionEvent {
  type:
    | "agent_start"
    | "agent_progress"
    | "agent_complete"
    | "tool_start"
    | "tool_complete"
    | "workflow_start"
    | "workflow_node_start"
    | "workflow_node_complete"
    | "workflow_complete";
  id: string;
  name: string;
  status: string;
  progress?: number;
  timestamp: string;
}

type EventListener = (event: ExecutionEvent) => void;

class ExecutionEventBus {
  private listeners: Set<EventListener> = new Set();

  emit(event: ExecutionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Swallow listener errors to avoid breaking other listeners
      }
    }
  }

  subscribe(listener: EventListener): void {
    this.listeners.add(listener);
  }

  unsubscribe(listener: EventListener): void {
    this.listeners.delete(listener);
  }
}

// Singleton instance
export const executionEventBus = new ExecutionEventBus();