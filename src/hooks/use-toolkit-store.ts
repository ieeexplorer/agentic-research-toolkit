import { create } from "zustand";

export type TabId = "dashboard" | "agents" | "workflows" | "tools" | "memory" | "evaluations" | "documents";

export interface ExecutionEvent {
  type: string;
  id: string;
  name: string;
  status: string;
  progress?: number;
  timestamp: string;
}

interface ToolkitState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  selectedWorkflowId: string | null;
  setSelectedWorkflowId: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  refreshing: boolean;
  setRefreshing: (r: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  liveEvents: ExecutionEvent[];
  setLiveEvents: (events: ExecutionEvent[]) => void;
}

export const useToolkitStore = create<ToolkitState>((set) => ({
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab, commandPaletteOpen: false }),
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  selectedWorkflowId: null,
  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  refreshing: false,
  setRefreshing: (r) => set({ refreshing: r }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  liveEvents: [],
  setLiveEvents: (events) => set({ liveEvents: events }),
}));