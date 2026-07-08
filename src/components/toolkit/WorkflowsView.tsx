"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type PointerEvent as RPointerEvent,
} from "react";
import { useToolkitStore } from "@/hooks/use-toolkit-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch,
  Plus,
  Play,
  Trash2,
  ChevronRight,
  Zap,
  Clock,
  CircleDot,
  Circle,
  CheckCircle2,
  XCircle,
  Loader2,
  Box,
  ArrowRight,
  Workflow as WorkflowIcon,
  FileText,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Link2,
  MousePointer2,
  Move,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Data Types ───────────────────────────────────────────────────────────────

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  _count?: { nodes: number; connections: number; executions: number };
  executions?: WorkflowExecution[];
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
}

interface WorkflowNode {
  id: string;
  name: string;
  nodeType: string;
  positionX: number;
  positionY: number;
  agentId?: string | null;
  toolId?: string | null;
  agent?: { name: string; type: string } | null;
  tool?: { name: string; type: string } | null;
}

interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
}

interface WorkflowExecution {
  id: string;
  input: string;
  output: string;
  status: string;
  duration: number;
  nodeResults: string;
  createdAt: string;
}

interface AgentOption {
  id: string;
  name: string;
  type: string;
}

interface ToolOption {
  id: string;
  name: string;
  type: string;
}

interface NodeResult {
  nodeId: string;
  nodeName?: string;
  status: string;
  duration?: number;
  output?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 168;
const NODE_H = 72;
const PAD_X = 60;
const PAD_Y = 40;
const PORT_RADIUS = 6;
const GRID_SIZE = 20;
const MINIMAP_W = 160;
const MINIMAP_H = 100;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const CANVAS_EXTENT = 5000;

const NODE_COLORS: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  agent: {
    bg: "fill-emerald-100 dark:fill-emerald-950",
    border: "stroke-emerald-400 dark:stroke-emerald-600",
    text: "fill-emerald-700 dark:fill-emerald-300",
    dot: "#10b981",
  },
  tool: {
    bg: "fill-amber-100 dark:fill-amber-950",
    border: "stroke-amber-400 dark:stroke-amber-600",
    text: "fill-amber-700 dark:fill-amber-300",
    dot: "#f59e0b",
  },
  condition: {
    bg: "fill-violet-100 dark:fill-violet-950",
    border: "stroke-violet-400 dark:stroke-violet-600",
    text: "fill-violet-700 dark:fill-violet-300",
    dot: "#8b5cf6",
  },
  transform: {
    bg: "fill-teal-100 dark:fill-teal-950",
    border: "stroke-teal-400 dark:stroke-teal-600",
    text: "fill-teal-700 dark:fill-teal-300",
    dot: "#14b8a6",
  },
  output: {
    bg: "fill-rose-100 dark:fill-rose-950",
    border: "stroke-rose-400 dark:stroke-rose-600",
    text: "fill-rose-700 dark:fill-rose-300",
    dot: "#f43f5e",
  },
};

const NODE_TYPE_OPTIONS = [
  { value: "agent", label: "Agent", icon: CircleDot },
  { value: "tool", label: "Tool", icon: Box },
  { value: "condition", label: "Condition", icon: GitBranch },
  { value: "transform", label: "Transform", icon: Layers },
  { value: "output", label: "Output", icon: FileText },
];

const NODE_TYPE_PATHS: Record<string, string> = {
  agent: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z",
  tool: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  condition: "M12 2L2 12l10 10 10-10L12 2zm0 3.5l6.5 6.5-6.5 6.5-6.5-6.5L12 5.5z",
  transform: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  output: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z",
};

const STATUS_CYCLE: Record<
  string,
  { next: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { next: "active", variant: "secondary" },
  active: { next: "archived", variant: "default" },
  archived: { next: "draft", variant: "outline" },
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700",
  active:
    "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-800/60 border-emerald-200 dark:border-emerald-800",
  archived:
    "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-800/60 border-amber-200 dark:border-amber-800",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function parseNodeResults(raw: string): NodeResult[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkflowsView() {
  const { selectedWorkflowId, setSelectedWorkflowId, refreshing } =
    useToolkitStore();

  // ── Existing State ──
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newWf, setNewWf] = useState({ name: "", description: "" });
  const [execInput, setExecInput] = useState("");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Node creation dialog state
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeType, setNewNodeType] = useState("");
  const [newNodeAgentId, setNewNodeAgentId] = useState("");
  const [newNodeToolId, setNewNodeToolId] = useState("");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [creatingNode, setCreatingNode] = useState(false);

  // Status toggle
  const [togglingStatus, setTogglingStatus] = useState(false);

  // ── New Canvas State ──
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Connection creation state
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);

  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  // Container size for coordinate conversion
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });

  // ── Refs ──
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<SVGSVGElement>(null);

  // Refs for mutable state in window event handlers
  const draggingNodeIdRef = useRef<string | null>(null);
  const isPanningRef = useRef(false);
  const connectingFromRef = useRef<string | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const containerSizeRef = useRef({ w: 800, h: 500 });
  const selectedRef = useRef<Workflow | null>(null);
  const selectedWorkflowIdRef = useRef<string | null>(null);
  const setSelectedRef = useRef<(wf: Workflow | null) => void>(() => {});
  const fetchWorkflowsRef = useRef<() => void>(() => {});

  // Keep refs in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { containerSizeRef.current = containerSize; }, [containerSize]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { selectedWorkflowIdRef.current = selectedWorkflowId; }, [selectedWorkflowId]);
  useEffect(() => { draggingNodeIdRef.current = draggingNodeId; }, [draggingNodeId]);
  useEffect(() => { isPanningRef.current = isPanning; }, [isPanning]);
  useEffect(() => { connectingFromRef.current = connectingFrom; }, [connectingFrom]);
  useEffect(() => { panStartRef.current = panStart; }, [panStart]);
  useEffect(() => { dragOffsetRef.current = dragOffset; }, [dragOffset]);

  // ── Coordinate Helpers ──

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const z = zoomRef.current;
      const p = panRef.current;
      return {
        x: (sx - p.x) / z,
        y: (sy - p.y) / z,
      };
    },
    []
  );

  // ── Fetching ──

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) setWorkflows(await res.json());
    } catch {
      toast.error("Failed to load workflows");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkflowsRef.current = fetchWorkflows;
  }, [fetchWorkflows]);

  useEffect(() => {
    const fn = (wf: Workflow | null) => setSelected(wf);
    setSelectedRef.current = fn;
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows, refreshing]);

  useEffect(() => {
    if (selectedWorkflowId) {
      fetch(`/api/workflows/${selectedWorkflowId}`)
        .then((r) => r.json())
        .then((data) => setSelected(data))
        .catch(() => setSelected(null));
    } else {
      setSelected(null);
    }
  }, [selectedWorkflowId, refreshing]);

  // Fetch agents/tools when add node dialog opens and type changes
  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const res = await fetch("/api/agents");
      if (res.ok) setAgents(await res.json());
    } catch {
      /* ignore */
    }
    setAgentsLoading(false);
  }, []);

  const fetchTools = useCallback(async () => {
    setToolsLoading(true);
    try {
      const res = await fetch("/api/tools");
      if (res.ok) setTools(await res.json());
    } catch {
      /* ignore */
    }
    setToolsLoading(false);
  }, []);

  useEffect(() => {
    if (addNodeOpen && newNodeType === "agent" && agents.length === 0) {
      fetchAgents();
    }
  }, [addNodeOpen, newNodeType, agents.length, fetchAgents]);

  useEffect(() => {
    if (addNodeOpen && newNodeType === "tool" && tools.length === 0) {
      fetchTools();
    }
  }, [addNodeOpen, newNodeType, tools.length, fetchTools]);

  // ── Resize Observer ──

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Keyboard Handler ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (connectingFromRef.current) {
          setConnectingFrom(null);
        } else {
          setSelectedNodeId(null);
          setSelectedConnectionId(null);
        }
      }
      if (e.key === " " && !e.repeat && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setSpacePressed(false);
        if (isPanningRef.current) {
          setIsPanning(false);
          isPanningRef.current = false;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ── Window-level Pointer Handlers for Drag & Pan ──

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      // Update mouse position for connection creation
      const world = screenToWorld(e.clientX, e.clientY);
      setMousePos(world);

      // Handle node dragging
      if (draggingNodeIdRef.current) {
        e.preventDefault();
        const sel = selectedRef.current;
        if (!sel) return;
        const p = panRef.current;
        const z = zoomRef.current;
        const off = dragOffsetRef.current;
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        let newX = (sx - p.x) / z - off.x;
        let newY = (sy - p.y) / z - off.y;

        // Constrain: keep node partially visible
        newX = clamp(newX, -PAD_X, CANVAS_EXTENT - NODE_W - PAD_X);
        newY = clamp(newY, -PAD_Y, CANVAS_EXTENT - NODE_H - PAD_Y);

        setSelectedRef.current({
          ...sel,
          nodes: sel.nodes!.map((n) =>
            n.id === draggingNodeIdRef.current
              ? { ...n, positionX: newX, positionY: newY }
              : n
          ),
        });
      }

      // Handle panning
      if (isPanningRef.current) {
        e.preventDefault();
        const ps = panStartRef.current;
        setPan({ x: e.clientX - ps.x, y: e.clientY - ps.y });
      }
    };

    const handleUp = () => {
      // End node drag and persist position
      if (draggingNodeIdRef.current) {
        const sel = selectedRef.current;
        const wid = selectedWorkflowIdRef.current;
        if (sel && wid && sel.nodes) {
          const node = sel.nodes.find(
            (n) => n.id === draggingNodeIdRef.current
          );
          if (node) {
            fetch(`/api/workflows/${wid}/nodes`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify([
                {
                  id: node.id,
                  positionX: node.positionX,
                  positionY: node.positionY,
                },
              ]),
            }).catch(() => {
              /* silent */
            });
          }
        }
        setDraggingNodeId(null);
        draggingNodeIdRef.current = null;
      }

      // End panning
      if (isPanningRef.current) {
        setIsPanning(false);
        isPanningRef.current = false;
      }

      try {
        svgRef.current?.releasePointerCapture?.(-1);
      } catch {
        // ignore
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [screenToWorld]);

  // ── Handlers ──

  const handleCreate = async () => {
    if (!newWf.name.trim()) return;
    try {
      await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWf),
      });
      toast.success("Workflow created");
      setCreateOpen(false);
      setNewWf({ name: "", description: "" });
      fetchWorkflows();
    } catch {
      toast.error("Failed to create workflow");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      toast.success("Workflow deleted");
      if (selectedWorkflowId === id) setSelectedWorkflowId(null);
      fetchWorkflows();
    } catch {
      toast.error("Failed to delete workflow");
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!selectedWorkflowId) return;
    if (connectingFrom === nodeId) setConnectingFrom(null);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    try {
      await fetch(`/api/workflows/${selectedWorkflowId}/nodes/${nodeId}`, {
        method: "DELETE",
      });
      toast.success("Node deleted");
      fetch(`/api/workflows/${selectedWorkflowId}`)
        .then((r) => r.json())
        .then(setSelected);
      fetchWorkflows();
    } catch {
      toast.error("Failed to delete node");
    }
  };

  const handleExecute = async () => {
    if (!selectedWorkflowId) return;
    setExecuting(true);
    try {
      const res = await fetch(
        `/api/workflows/${selectedWorkflowId}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: execInput || "Run workflow" }),
        }
      );
      const exec = await res.json();
      toast.success(`Workflow completed in ${formatDuration(exec.duration)}`);
      setExecInput("");
      fetch(`/api/workflows/${selectedWorkflowId}`)
        .then((r) => r.json())
        .then(setSelected);
      fetchWorkflows();
    } catch {
      toast.error("Execution failed");
    }
    setExecuting(false);
  };

  const handleStatusToggle = async () => {
    if (!selected) return;
    const cycle = STATUS_CYCLE[selected.status];
    if (!cycle) return;
    setTogglingStatus(true);
    try {
      await fetch(`/api/workflows/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: cycle.next }),
      });
      toast.success(`Status changed to ${cycle.next}`);
      fetchWorkflows();
      fetch(`/api/workflows/${selected.id}`)
        .then((r) => r.json())
        .then(setSelected);
    } catch {
      toast.error("Failed to update status");
    }
    setTogglingStatus(false);
  };

  const handleCreateNode = async () => {
    if (!selectedWorkflowId || !newNodeName.trim() || !newNodeType) return;
    setCreatingNode(true);
    try {
      const maxX = selected?.nodes?.length
        ? Math.max(...selected.nodes.map((n) => n.positionX))
        : 0;
      const gapX = 80;
      const posX = maxX > 0 ? maxX + NODE_W + gapX : 0;
      const posY = 40;

      const body: Record<string, unknown> = {
        name: newNodeName.trim(),
        nodeType: newNodeType,
        positionX: posX,
        positionY: posY,
      };

      if (newNodeType === "agent" && newNodeAgentId) {
        body.agentId = newNodeAgentId;
      }
      if (newNodeType === "tool" && newNodeToolId) {
        body.toolId = newNodeToolId;
      }

      await fetch(`/api/workflows/${selectedWorkflowId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      toast.success("Node added to workflow");
      setAddNodeOpen(false);
      resetNodeForm();

      fetch(`/api/workflows/${selectedWorkflowId}`)
        .then((r) => r.json())
        .then(setSelected);
      fetchWorkflows();
    } catch {
      toast.error("Failed to create node");
    }
    setCreatingNode(false);
  };

  const resetNodeForm = () => {
    setNewNodeName("");
    setNewNodeType("");
    setNewNodeAgentId("");
    setNewNodeToolId("");
  };

  // ── Canvas Event Handlers ──

  const handleCanvasPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    // Middle mouse button or Space+left click → pan
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      isPanningRef.current = true;
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    // Left click on empty space → deselect
    if (e.button === 0 && !connectingFrom) {
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
    }

    // Left click on empty space while connecting → cancel
    if (e.button === 0 && connectingFrom) {
      setConnectingFrom(null);
    }
  };

  const handleCanvasPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    setMousePos(world);
  };

  const handleCanvasWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldZoom = zoomRef.current;
    const factor = e.deltaY > 0 ? 0.93 : 1.07;
    const newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);

    // Zoom toward cursor position
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / oldZoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / oldZoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomIn = () => {
    const newZoom = clamp(zoom * 1.2, MIN_ZOOM, MAX_ZOOM);
    const cx = containerSize.w / 2;
    const cy = containerSize.h / 2;
    const newPanX = cx - (cx - pan.x) * (newZoom / zoom);
    const newPanY = cy - (cy - pan.y) * (newZoom / zoom);
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    const newZoom = clamp(zoom * 0.8, MIN_ZOOM, MAX_ZOOM);
    const cx = containerSize.w / 2;
    const cy = containerSize.h / 2;
    const newPanX = cx - (cx - pan.x) * (newZoom / zoom);
    const newPanY = cy - (cy - pan.y) * (newZoom / zoom);
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleFitView = () => {
    if (!selected?.nodes?.length) return;
    const padding = 80;
    const nodes = selected.nodes;
    const minX =
      Math.min(...nodes.map((n) => n.positionX + PAD_X)) - padding;
    const minY =
      Math.min(...nodes.map((n) => n.positionY + PAD_Y)) - padding;
    const maxX =
      Math.max(...nodes.map((n) => n.positionX + PAD_X + NODE_W)) + padding;
    const maxY =
      Math.max(...nodes.map((n) => n.positionY + PAD_Y + NODE_H)) + padding;

    const worldW = maxX - minX;
    const worldH = maxY - minY;

    if (worldW <= 0 || worldH <= 0) return;

    const newZoom = clamp(
      Math.min(containerSize.w / worldW, containerSize.h / worldH),
      MIN_ZOOM,
      MAX_ZOOM
    );
    const newPanX =
      (containerSize.w - worldW * newZoom) / 2 - minX * newZoom;
    const newPanY =
      (containerSize.h - worldH * newZoom) / 2 - minY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleNodePointerDown = (
    e: RPointerEvent<SVGGElement>,
    nodeId: string
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (connectingFrom) return; // Don't start drag while connecting

    setSelectedNodeId(nodeId);
    setSelectedConnectionId(null);

    // Start drag
    const world = screenToWorld(e.clientX, e.clientY);
    const node = selected?.nodes?.find((n) => n.id === nodeId);
    if (!node) return;

    setDragOffset({
      x: world.x - (node.positionX + PAD_X),
      y: world.y - (node.positionY + PAD_Y),
    });
    dragOffsetRef.current = {
      x: world.x - (node.positionX + PAD_X),
      y: world.y - (node.positionY + PAD_Y),
    };
    setDraggingNodeId(nodeId);
    draggingNodeIdRef.current = nodeId;

    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleOutputPortClick = (
    e: RPointerEvent<SVGCircleElement>,
    nodeId: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (connectingFrom === nodeId) {
      // Clicking same output port → cancel
      setConnectingFrom(null);
    } else {
      setConnectingFrom(nodeId);
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
      const node = selected?.nodes?.find((n) => n.id === nodeId);
      if (node) {
        setMousePos({
          x: node.positionX + PAD_X + NODE_W,
          y: node.positionY + PAD_Y + NODE_H / 2,
        });
      }
    }
  };

  const handleInputPortClick = (
    e: RPointerEvent<SVGCircleElement>,
    nodeId: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!connectingFrom) return;
    if (connectingFrom === nodeId) {
      toast.error("Cannot connect a node to itself");
      setConnectingFrom(null);
      return;
    }
    // Check for duplicate
    const exists = selected?.connections?.some(
      (c) =>
        c.sourceNodeId === connectingFrom && c.targetNodeId === nodeId
    );
    if (exists) {
      toast.error("Connection already exists");
      setConnectingFrom(null);
      return;
    }
    // Create connection
    (async () => {
      try {
        await fetch(
          `/api/workflows/${selectedWorkflowId}/connections`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceNodeId: connectingFrom,
              targetNodeId: nodeId,
            }),
          }
        );
        toast.success("Connection created");
        fetch(`/api/workflows/${selectedWorkflowId}`)
          .then((r) => r.json())
          .then(setSelected);
        fetchWorkflows();
      } catch {
        toast.error("Failed to create connection");
      }
      setConnectingFrom(null);
    })();
  };

  const handleConnectionClick = (
    e: RPointerEvent<SVGPathElement>,
    connId: string
  ) => {
    e.stopPropagation();
    if (connectingFrom) {
      setConnectingFrom(null);
      return;
    }
    setSelectedConnectionId(connId);
    setSelectedNodeId(null);
  };

  const handleDeleteConnection = async () => {
    if (!selectedWorkflowId || !selectedConnectionId) return;
    const conn = selected?.connections?.find(
      (c) => c.id === selectedConnectionId
    );
    if (!conn) return;
    try {
      await fetch(`/api/workflows/${selectedWorkflowId}/connections`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNodeId: conn.sourceNodeId,
          targetNodeId: conn.targetNodeId,
        }),
      });
      toast.success("Connection removed");
      setSelectedConnectionId(null);
      fetch(`/api/workflows/${selectedWorkflowId}`)
        .then((r) => r.json())
        .then(setSelected);
      fetchWorkflows();
    } catch {
      toast.error("Failed to remove connection");
    }
  };

  const handleMinimapClick = (e: RPointerEvent<SVGSVGElement>) => {
    if (!selected?.nodes?.length) return;
    const rect = minimapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const nodes = selected.nodes;
    const margin = 60;
    const worldBounds = {
      minX:
        Math.min(0, ...nodes.map((n) => n.positionX + PAD_X)) - margin,
      minY:
        Math.min(0, ...nodes.map((n) => n.positionY + PAD_Y)) - margin,
      maxX:
        Math.max(
          ...nodes.map((n) => n.positionX + PAD_X + NODE_W)
        ) + margin,
      maxY:
        Math.max(
          ...nodes.map((n) => n.positionY + PAD_Y + NODE_H)
        ) + margin,
    };
    const worldW = worldBounds.maxX - worldBounds.minX;
    const worldH = worldBounds.maxY - worldBounds.minY;
    if (worldW <= 0 || worldH <= 0) return;

    const mapScale = Math.min(MINIMAP_W / worldW, MINIMAP_H / worldH);
    const mapOffsetX = (MINIMAP_W - worldW * mapScale) / 2;
    const mapOffsetY = (MINIMAP_H - worldH * mapScale) / 2;

    const worldX = (mx - mapOffsetX) / mapScale + worldBounds.minX;
    const worldY = (my - mapOffsetY) / mapScale + worldBounds.minY;

    const newPanX = containerSize.w / 2 - worldX * zoom;
    const newPanY = containerSize.h / 2 - worldY * zoom;
    setPan({ x: newPanX, y: newPanY });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (connectingFrom) {
      setConnectingFrom(null);
    }
  };

  // ── Reset canvas when workflow changes ──

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setConnectingFrom(null);
    setDraggingNodeId(null);
    draggingNodeIdRef.current = null;
  }, [selectedWorkflowId]);

  // ─── SVG Graph ──────────────────────────────────────────────────────────────

  const getNodePortPositions = (node: WorkflowNode) => ({
    inputX: node.positionX + PAD_X,
    inputY: node.positionY + PAD_Y + NODE_H / 2,
    outputX: node.positionX + PAD_X + NODE_W,
    outputY: node.positionY + PAD_Y + NODE_H / 2,
  });

  const renderGraph = () => {
    if (!selected?.nodes || selected.nodes.length === 0) return null;

    const nodeMap = new Map(selected.nodes.map((n) => [n.id, n]));

    // Compute connecting line endpoint
    let tempConnEndX = mousePos.x;
    let tempConnEndY = mousePos.y;

    const isDraggingOrConnecting =
      draggingNodeId !== null || connectingFrom !== null || isPanning;

    return (
      <div
        ref={containerRef}
        className="relative rounded-xl border border-border overflow-hidden"
        style={{ minHeight: 500 }}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{
            minHeight: 500,
            background:
              "hsl(var(--background))",
            cursor: spacePressed
              ? "grab"
              : isPanning
                ? "grabbing"
                : connectingFrom
                  ? "crosshair"
                  : draggingNodeId
                    ? "grabbing"
                    : "default",
          }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onWheel={handleCanvasWheel}
          onContextMenu={handleContextMenu}
        >
          <defs>
            {/* Grid pattern */}
            <pattern
              id="canvas-grid"
              width={GRID_SIZE}
              height={GRID_SIZE}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={GRID_SIZE / 2}
                cy={GRID_SIZE / 2}
                r={0.7}
                className="fill-muted-foreground"
                opacity={0.25}
              />
            </pattern>

            {/* Animated dash marker */}
            <marker
              id="arrowhead-animated"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                className="fill-muted-foreground"
                opacity="0.7"
              />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                className="fill-foreground"
                opacity="0.9"
              />
            </marker>
            <marker
              id="arrowhead-temp"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" opacity="0.8" />
            </marker>

            {/* Shadow filters for each node type */}
            {Object.entries(NODE_COLORS).map(([type]) => (
              <filter
                key={`shadow-${type}`}
                id={`shadow-${type}`}
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="3"
                  floodOpacity="0.08"
                />
              </filter>
            ))}
            <filter
              id="shadow-hover"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="6"
                floodOpacity="0.18"
              />
            </filter>
            <filter
              id="shadow-selected"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="8"
                floodColor="hsl(var(--primary))"
                floodOpacity="0.25"
              />
            </filter>

            {/* Port glow filter */}
            <filter id="port-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <style>{`
            @keyframes dash-flow {
              to { stroke-dashoffset: -16; }
            }
            @keyframes port-pulse {
              0%, 100% { opacity: 0.6; r: ${PORT_RADIUS}; }
              50% { opacity: 1; r: ${PORT_RADIUS + 2}; }
            }
            .connection-line {
              animation: dash-flow 1s linear infinite;
            }
            .port-target-pulse {
              animation: port-pulse 1s ease-in-out infinite;
            }
          `}</style>

          {/* Transform group for pan/zoom */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Grid background */}
            <rect
              x={-CANVAS_EXTENT}
              y={-CANVAS_EXTENT}
              width={CANVAS_EXTENT * 2}
              height={CANVAS_EXTENT * 2}
              fill="url(#canvas-grid)"
            />

            {/* Connections */}
            {selected.connections?.map((conn) => {
              const src = nodeMap.get(conn.sourceNodeId);
              const tgt = nodeMap.get(conn.targetNodeId);
              if (!src || !tgt) return null;
              const sp = getNodePortPositions(src);
              const tp = getNodePortPositions(tgt);
              const x1 = sp.outputX;
              const y1 = sp.outputY;
              const x2 = tp.inputX;
              const y2 = tp.inputY;
              const cx = (x1 + x2) / 2;
              const isSelected = selectedConnectionId === conn.id;
              const pathD = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;

              return (
                <g key={conn.id}>
                  {/* Hit area (invisible, wider) */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: "pointer" }}
                    onPointerDown={(e) =>
                      handleConnectionClick(e, conn.id)
                    }
                  />
                  {/* Background glow */}
                  <path
                    d={pathD}
                    fill="none"
                    className={
                      isSelected
                        ? "stroke-primary/15"
                        : "stroke-muted-foreground/10"
                    }
                    strokeWidth={isSelected ? 8 : 6}
                    strokeLinecap="round"
                  />
                  {/* Animated dashed line */}
                  <path
                    d={pathD}
                    fill="none"
                    className={
                      isSelected
                        ? "stroke-primary connection-line"
                        : "stroke-muted-foreground/50 connection-line"
                    }
                    strokeWidth={isSelected ? 2.5 : 2}
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    markerEnd={
                      isSelected
                        ? "url(#arrowhead-selected)"
                        : "url(#arrowhead-animated)"
                    }
                    style={{ cursor: "pointer" }}
                    onPointerDown={(e) =>
                      handleConnectionClick(e, conn.id)
                    }
                  />
                  {conn.label && (
                    <text
                      x={cx}
                      y={Math.min(y1, y2) - 8}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px] font-mono"
                    >
                      {conn.label}
                    </text>
                  )}
                  {/* Delete button for selected connection */}
                  {isSelected && (
                    <g
                      style={{ cursor: "pointer" }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handleDeleteConnection();
                      }}
                    >
                      <rect
                        x={cx - 10}
                        y={Math.min(y1, y2) - 24}
                        width={20}
                        height={16}
                        rx={4}
                        className="fill-destructive stroke-destructive/30"
                        strokeWidth={1}
                      />
                      <text
                        x={cx}
                        y={Math.min(y1, y2) - 13}
                        textAnchor="middle"
                        className="fill-white text-[9px] font-bold"
                      >
                        DEL
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Temporary connection line while connecting */}
            {connectingFrom && (() => {
              const srcNode = nodeMap.get(connectingFrom);
              if (!srcNode) return null;
              const sp = getNodePortPositions(srcNode);
              const x1 = sp.outputX;
              const y1 = sp.outputY;
              const cx = (x1 + tempConnEndX) / 2;
              return (
                <g>
                  <path
                    d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${tempConnEndY}, ${tempConnEndX} ${tempConnEndY}`}
                    fill="none"
                    className="stroke-emerald-500/30"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${tempConnEndY}, ${tempConnEndX} ${tempConnEndY}`}
                    fill="none"
                    className="stroke-emerald-500 connection-line"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    markerEnd="url(#arrowhead-temp)"
                  />
                </g>
              );
            })()}

            {/* Nodes */}
            {selected.nodes.map((node) => {
              const colors =
                NODE_COLORS[node.nodeType] || NODE_COLORS.agent;
              const x = node.positionX + PAD_X;
              const y = node.positionY + PAD_Y;
              const isHovered = hoveredNodeId === node.id;
              const isSelectedNode = selectedNodeId === node.id;
              const isBeingDragged = draggingNodeId === node.id;
              const subLabel =
                node.agent?.name || node.tool?.name || "";

              const scale =
                isBeingDragged ? 1.04 : isHovered ? 1.02 : 1;
              const filter = isSelectedNode
                ? "url(#shadow-selected)"
                : isHovered
                  ? "url(#shadow-hover)"
                  : `url(#shadow-${node.nodeType})`;

              const ports = getNodePortPositions(node);

              // Determine if this node is a valid target while connecting
              const isValidTarget =
                connectingFrom !== null &&
                connectingFrom !== node.id &&
                !selected?.connections?.some(
                  (c) =>
                    c.sourceNodeId === connectingFrom &&
                    c.targetNodeId === node.id
                );

              const nodeContent = (
                <g
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                  style={{
                    transformOrigin: `${x + NODE_W / 2}px ${y + NODE_H / 2}px`,
                    transform: `scale(${scale})`,
                    transition: isBeingDragged
                      ? "none"
                      : "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: connectingFrom ? "crosshair" : "grab",
                  }}
                >
                  {/* Selected node bright border */}
                  {isSelectedNode && (
                    <rect
                      x={x - 3}
                      y={y - 3}
                      width={NODE_W + 6}
                      height={NODE_H + 6}
                      rx={14}
                      className="stroke-primary"
                      strokeWidth={2}
                      fill="none"
                      opacity={0.6}
                    />
                  )}

                  {/* Node rect */}
                  <rect
                    x={x}
                    y={y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={12}
                    className={`${colors.bg} ${colors.border}`}
                    strokeWidth={isHovered || isSelectedNode ? 2.5 : 2}
                    filter={filter}
                    style={{
                      transition: isBeingDragged
                        ? "none"
                        : "stroke-width 0.2s ease",
                    }}
                  />

                  {/* Type icon */}
                  <svg
                    viewBox="0 0 24 24"
                    x={x + 8}
                    y={y + 8}
                    width={14}
                    height={14}
                    className="opacity-80"
                  >
                    <path
                      d={NODE_TYPE_PATHS[node.nodeType] || NODE_TYPE_PATHS.agent}
                      fill={colors.dot}
                    />
                  </svg>

                  {/* Node type badge */}
                  <rect
                    x={x + 26}
                    y={y + 8}
                    width={46}
                    height={18}
                    rx={4}
                    className={colors.bg}
                    opacity={0.7}
                  />
                  <text
                    x={x + 49}
                    y={y + 21}
                    textAnchor="middle"
                    className={`${colors.text} text-[10px] font-semibold capitalize`}
                  >
                    {node.nodeType}
                  </text>

                  {/* Node name */}
                  <text
                    x={x + NODE_W / 2}
                    y={subLabel ? y + 40 : y + 46}
                    textAnchor="middle"
                    className="fill-foreground text-[12px] font-semibold"
                  >
                    {node.name.length > 18
                      ? node.name.slice(0, 16) + "…"
                      : node.name}
                  </text>

                  {/* Sub-label (agent/tool name) */}
                  {subLabel && (
                    <text
                      x={x + NODE_W / 2}
                      y={y + 56}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {subLabel.length > 20
                        ? subLabel.slice(0, 18) + "…"
                        : subLabel}
                    </text>
                  )}

                  {/* Status indicator dot */}
                  <circle
                    cx={x + NODE_W - 14}
                    cy={y + 14}
                    r={4}
                    fill={colors.dot}
                    opacity={0.9}
                  />

                  {/* Delete button on hover */}
                  {isHovered && !isBeingDragged && (
                    <g
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{ cursor: "pointer" }}
                    >
                      <rect
                        x={x + NODE_W - 28}
                        y={y + 4}
                        width={20}
                        height={20}
                        rx={5}
                        className="fill-destructive/10 stroke-destructive/30"
                        strokeWidth={1}
                      />
                      <text
                        x={x + NODE_W - 18}
                        y={y + 18}
                        textAnchor="middle"
                        className="fill-destructive text-[11px] font-bold"
                      >
                        ×
                      </text>
                    </g>
                  )}

                  {/* Input port (left) */}
                  <circle
                    cx={ports.inputX}
                    cy={ports.inputY}
                    r={
                      isValidTarget
                        ? PORT_RADIUS + 1
                        : PORT_RADIUS
                    }
                    className={
                      isValidTarget
                        ? "fill-emerald-400 stroke-emerald-500 port-target-pulse"
                        : hoveredNodeId === node.id || isSelectedNode
                          ? "fill-background stroke-muted-foreground"
                          : "fill-background stroke-muted-foreground/50"
                    }
                    strokeWidth={2}
                    style={{
                      cursor: connectingFrom ? "pointer" : "default",
                      filter: isValidTarget
                        ? "url(#port-glow)"
                        : "none",
                      transition: "all 0.15s ease",
                    }}
                    opacity={
                      hoveredNodeId === node.id ||
                      isSelectedNode ||
                      isValidTarget
                        ? 1
                        : 0.4
                    }
                    onPointerDown={(e) =>
                      handleInputPortClick(e, node.id)
                    }
                    onPointerEnter={() =>
                      setHoveredPortId(`in-${node.id}`)
                    }
                    onPointerLeave={() => setHoveredPortId(null)}
                  />

                  {/* Output port (right) */}
                  <circle
                    cx={ports.outputX}
                    cy={ports.outputY}
                    r={
                      hoveredPortId === `out-${node.id}` ||
                      connectingFrom === node.id
                        ? PORT_RADIUS + 1
                        : PORT_RADIUS
                    }
                    className={
                      connectingFrom === node.id
                        ? "fill-emerald-400 stroke-emerald-500"
                        : hoveredPortId === `out-${node.id}` ||
                            hoveredNodeId === node.id ||
                            isSelectedNode
                          ? "fill-background stroke-muted-foreground"
                          : "fill-background stroke-muted-foreground/50"
                    }
                    strokeWidth={2}
                    style={{
                      cursor: "pointer",
                      filter:
                        connectingFrom === node.id ||
                        hoveredPortId === `out-${node.id}`
                          ? "url(#port-glow)"
                          : "none",
                      transition: "all 0.15s ease",
                    }}
                    opacity={
                      hoveredNodeId === node.id ||
                      isSelectedNode ||
                      connectingFrom === node.id ||
                      hoveredPortId === `out-${node.id}`
                        ? 1
                        : 0.4
                    }
                    onPointerDown={(e) =>
                      handleOutputPortClick(e, node.id)
                    }
                    onPointerEnter={() =>
                      setHoveredPortId(`out-${node.id}`)
                    }
                    onPointerLeave={() => setHoveredPortId(null)}
                  />
                </g>
              );

              // Wrap in Tooltip only when not dragging/connecting
              if (isDraggingOrConnecting) {
                return <g key={node.id}>{nodeContent}</g>;
              }

              return (
                <TooltipProvider key={node.id} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>{nodeContent}</TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-semibold">{node.name}</p>
                      <p className="text-muted-foreground capitalize">
                        Type: {node.nodeType}
                      </p>
                      {node.agent?.name && (
                        <p className="text-muted-foreground">
                          Agent: {node.agent.name}
                        </p>
                      )}
                      {node.tool?.name && (
                        <p className="text-muted-foreground">
                          Tool: {node.tool.name}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        Drag to move · Click port to connect
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </g>

          {/* Legend (fixed, not affected by pan/zoom) */}
          <g transform={`translate(10, ${containerSize.h - 36})`}>
            <text
              x={0}
              y={0}
              className="fill-muted-foreground text-[10px] font-semibold uppercase tracking-wider"
            >
              Legend
            </text>
            {NODE_TYPE_OPTIONS.map((opt, i) => {
              const lx = i * 90 + 4;
              return (
                <g key={opt.value} transform={`translate(${lx}, 10)`}>
                  <circle
                    cx={6}
                    cy={6}
                    r={5}
                    fill={NODE_COLORS[opt.value].dot}
                    opacity={0.8}
                  />
                  <text
                    x={16}
                    y={10}
                    className="fill-muted-foreground text-[10px] capitalize"
                  >
                    {opt.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-center">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm border-border/60"
            onClick={handleZoomIn}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] font-mono text-muted-foreground select-none">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm border-border/60"
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm border-border/60"
            onClick={handleFitView}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Connection mode indicator */}
        {connectingFrom && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm shadow-sm">
            <Link2 className="h-3.5 w-3.5" />
            <span>Click an input port to connect, Esc to cancel</span>
            <button
              onClick={() => setConnectingFrom(null)}
              className="ml-1 hover:bg-emerald-500/20 rounded p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Panning hint */}
        {spacePressed && !isPanning && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-muted/80 border border-border/60 text-muted-foreground px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm shadow-sm">
            <Move className="h-3.5 w-3.5" />
            <span>Drag to pan the canvas</span>
          </div>
        )}

        {/* Minimap */}
        {selected.nodes.length > 0 && (
          <div className="absolute bottom-3 right-3">
            {renderMinimap()}
          </div>
        )}
      </div>
    );
  };

  // ─── Minimap ────────────────────────────────────────────────────────────────

  const renderMinimap = () => {
    if (!selected?.nodes?.length) return null;
    const nodes = selected.nodes;
    const margin = 60;

    const worldBounds = {
      minX:
        Math.min(0, ...nodes.map((n) => n.positionX + PAD_X)) - margin,
      minY:
        Math.min(0, ...nodes.map((n) => n.positionY + PAD_Y)) - margin,
      maxX:
        Math.max(
          ...nodes.map((n) => n.positionX + PAD_X + NODE_W)
        ) + margin,
      maxY:
        Math.max(
          ...nodes.map((n) => n.positionY + PAD_Y + NODE_H)
        ) + margin,
    };

    const worldW = worldBounds.maxX - worldBounds.minX;
    const worldH = worldBounds.maxY - worldBounds.minY;

    if (worldW <= 0 || worldH <= 0) return null;

    const mapScale = Math.min(MINIMAP_W / worldW, MINIMAP_H / worldH);
    const mapOffsetX = (MINIMAP_W - worldW * mapScale) / 2;
    const mapOffsetY = (MINIMAP_H - worldH * mapScale) / 2;

    const worldToMinimap = (wx: number, wy: number) => ({
      x: (wx - worldBounds.minX) * mapScale + mapOffsetX,
      y: (wy - worldBounds.minY) * mapScale + mapOffsetY,
    });

    // Viewport rectangle in world space
    const vpLeft = -pan.x / zoom;
    const vpTop = -pan.y / zoom;
    const vpWidth = containerSize.w / zoom;
    const vpHeight = containerSize.h / zoom;

    const vpMin = worldToMinimap(vpLeft, vpTop);
    const vpMax = worldToMinimap(vpLeft + vpWidth, vpTop + vpHeight);

    const vpRect = {
      x: clamp(vpMin.x, 0, MINIMAP_W),
      y: clamp(vpMin.y, 0, MINIMAP_H),
      w: clamp(vpMax.x - vpMin.x, 0, MINIMAP_W),
      h: clamp(vpMax.y - vpMin.y, 0, MINIMAP_H),
    };

    // Connections in minimap
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    return (
      <svg
        ref={minimapRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        className="rounded-lg border border-border/60 bg-background/90 backdrop-blur-sm shadow-md cursor-pointer"
        style={{ overflow: "hidden" }}
        onPointerDown={handleMinimapClick}
      >
        {/* Background */}
        <rect width={MINIMAP_W} height={MINIMAP_H} className="fill-muted/30" rx={6} />

        {/* Connections as lines */}
        {selected.connections?.map((conn) => {
          const src = nodeMap.get(conn.sourceNodeId);
          const tgt = nodeMap.get(conn.targetNodeId);
          if (!src || !tgt) return null;
          const sp = getNodePortPositions(src);
          const tp = getNodePortPositions(tgt);
          const from = worldToMinimap(sp.outputX, sp.outputY);
          const to = worldToMinimap(tp.inputX, tp.inputY);
          return (
            <line
              key={conn.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className="stroke-muted-foreground/30"
              strokeWidth={1}
            />
          );
        })}

        {/* Nodes as small rectangles */}
        {nodes.map((node) => {
          const colors =
            NODE_COLORS[node.nodeType] || NODE_COLORS.agent;
          const pos = worldToMinimap(
            node.positionX + PAD_X,
            node.positionY + PAD_Y
          );
          const nw = NODE_W * mapScale;
          const nh = NODE_H * mapScale;
          return (
            <rect
              key={node.id}
              x={pos.x}
              y={pos.y}
              width={Math.max(nw, 4)}
              height={Math.max(nh, 3)}
              rx={2}
              fill={colors.dot}
              opacity={selectedNodeId === node.id ? 1 : 0.6}
            />
          );
        })}

        {/* Viewport rectangle */}
        <rect
          x={vpRect.x}
          y={vpRect.y}
          width={Math.max(vpRect.w, 8)}
          height={Math.max(vpRect.h, 6)}
          rx={2}
          className="fill-primary/10 stroke-primary/40"
          strokeWidth={1}
        />
      </svg>
    );
  };

  // ─── Execution Timeline ─────────────────────────────────────────────────────

  const renderExecutionTimeline = (exec: WorkflowExecution) => {
    const results = parseNodeResults(exec.nodeResults);
    if (results.length === 0) return null;

    const statusIcon = (status: string) => {
      switch (status) {
        case "completed":
          return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
        case "running":
          return (
            <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />
          );
        case "failed":
          return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
        default:
          return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
      }
    };

    return (
      <div className="mt-3">
        <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          Node Execution Timeline
        </p>
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {results.map((result, idx) => (
            <div
              key={result.nodeId || idx}
              className="flex items-start shrink-0"
            >
              {/* Node card */}
              <div className="flex flex-col items-center w-28 px-2">
                <div className="flex items-center gap-1.5 mb-1">
                  {statusIcon(result.status)}
                  <span className="text-[11px] font-semibold truncate max-w-[80px]">
                    {result.nodeName || `Node ${idx + 1}`}
                  </span>
                </div>
                {result.duration !== undefined && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatDuration(result.duration)}
                  </span>
                )}
                {result.output && (
                  <span className="text-[10px] text-muted-foreground/70 truncate max-w-[100px] mt-0.5">
                    {result.output}
                  </span>
                )}
              </div>
              {/* Arrow between nodes */}
              {idx < results.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Add Node Dialog Content ────────────────────────────────────────────────

  const addNodeDialogContent = (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Node Name</Label>
        <Input
          value={newNodeName}
          onChange={(e) => setNewNodeName(e.target.value)}
          placeholder="e.g. Research Agent"
        />
      </div>

      <div className="space-y-2">
        <Label>Node Type</Label>
        <Select
          value={newNodeType}
          onValueChange={(val) => {
            setNewNodeType(val);
            setNewNodeAgentId("");
            setNewNodeToolId("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {NODE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: NODE_COLORS[opt.value]?.dot,
                    }}
                  />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Agent select */}
      {newNodeType === "agent" && (
        <div className="space-y-2">
          <Label>Assign Agent</Label>
          {agentsLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Loading agents...
              </span>
            </div>
          ) : agents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No agents available. Create one first.
            </p>
          ) : (
            <Select value={newNodeAgentId} onValueChange={setNewNodeAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <CircleDot className="h-3 w-3 text-emerald-500" />
                      {a.name}
                      <span className="text-xs text-muted-foreground ml-auto pl-4">
                        {a.type}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Tool select */}
      {newNodeType === "tool" && (
        <div className="space-y-2">
          <Label>Assign Tool</Label>
          {toolsLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Loading tools...
              </span>
            </div>
          ) : tools.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No tools available. Create one first.
            </p>
          ) : (
            <Select value={newNodeToolId} onValueChange={setNewNodeToolId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tool..." />
              </SelectTrigger>
              <SelectContent>
                {tools.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <Box className="h-3 w-3 text-amber-500" />
                      {t.name}
                      <span className="text-xs text-muted-foreground ml-auto pl-4">
                        {t.type}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <Button
        onClick={handleCreateNode}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={!newNodeName.trim() || !newNodeType || creatingNode}
      >
        {creatingNode ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Adding...
          </span>
        ) : (
          "Add Node"
        )}
      </Button>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <WorkflowIcon className="h-6 w-6 text-emerald-500" />
            Workflows
          </h2>
          <p className="text-muted-foreground mt-1">
            Design and orchestrate multi-step agent workflows.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newWf.name}
                  onChange={(e) =>
                    setNewWf({ ...newWf, name: e.target.value })
                  }
                  placeholder="Research Pipeline"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newWf.description}
                  onChange={(e) =>
                    setNewWf({ ...newWf, description: e.target.value })
                  }
                  placeholder="What does this workflow do?"
                  rows={2}
                />
              </div>
              <Button
                onClick={handleCreate}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!newWf.name.trim()}
              >
                Create Workflow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar: Workflow list */}
        <div className="lg:col-span-1">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                All Workflows
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : workflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <WorkflowIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No workflows yet
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Create your first workflow to get started.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-1 p-1">
                    {workflows.map((wf) => (
                      <button
                        key={wf.id}
                        onClick={() =>
                          setSelectedWorkflowId(
                            wf.id === selectedWorkflowId ? null : wf.id
                          )
                        }
                        className={`w-full text-left p-3 rounded-lg transition-all duration-150 group
                          ${
                            selectedWorkflowId === wf.id
                              ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-sm"
                              : "hover:bg-muted/60 border border-transparent"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm truncate pr-2">
                            {wf.name}
                          </p>
                          <ChevronRight
                            className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-opacity duration-150
                              ${selectedWorkflowId === wf.id ? "opacity-100 text-emerald-500" : "opacity-0 group-hover:opacity-100"}`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-2">
                          {wf.description || "No description"}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {wf._count?.nodes || 0} nodes
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {wf._count?.connections || 0} edges
                          </Badge>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 border cursor-default ${
                              STATUS_BADGE_CLASSES[wf.status] || ""
                            }`}
                          >
                            {wf.status}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main panel: Selected workflow */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              {/* Workflow header card */}
              <Card className="border-border/60 shadow-sm overflow-hidden">
                <div
                  className="h-1"
                  style={{
                    background:
                      selected.status === "active"
                        ? "linear-gradient(90deg, #10b981, #14b8a6)"
                        : selected.status === "archived"
                          ? "linear-gradient(90deg, #f59e0b, #f97316)"
                          : "linear-gradient(90deg, #94a3b8, #64748b)",
                  }}
                />
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <GitBranch className="h-5 w-5 text-emerald-500" />
                        {selected.name}
                      </CardTitle>
                      <CardDescription>
                        {selected.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status toggle badge */}
                      <button
                        onClick={handleStatusToggle}
                        disabled={togglingStatus}
                        className={`transition-all duration-200 text-[11px] font-medium px-2.5 py-1 rounded-full border cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-wait ${
                          STATUS_BADGE_CLASSES[selected.status] || ""
                        }`}
                      >
                        {togglingStatus ? (
                          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                        ) : null}
                        {selected.status}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(selected.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Visual Graph */}
                  {selected.nodes && selected.nodes.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-muted-foreground">
                          Workflow Graph
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5"
                          onClick={() => setAddNodeOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Node
                        </Button>
                      </div>
                      {renderGraph()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-xl">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <Layers className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        No nodes in this workflow
                      </p>
                      <p className="text-xs text-muted-foreground/70 mb-4 text-center px-4">
                        Add nodes to build your workflow graph. Each node
                        represents an agent, tool, condition, transform, or
                        output step.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setAddNodeOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add First Node
                      </Button>
                    </div>
                  )}

                  <Separator />

                  {/* Execute bar */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={execInput}
                      onChange={(e) => setExecInput(e.target.value)}
                      placeholder="Enter workflow input..."
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleExecute()
                      }
                      className="flex-1"
                    />
                    <Button
                      onClick={handleExecute}
                      disabled={executing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    >
                      {executing ? (
                        <span className="flex items-center gap-2">
                          <Zap className="h-4 w-4 animate-pulse" />
                          Running
                        </span>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Execute
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Execution History */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Execution History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!selected.executions ||
                  selected.executions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-full bg-muted p-3 mb-3">
                        <Play className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        No executions yet
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Run this workflow to see execution history here.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-96">
                      <div className="space-y-3 pr-2">
                        {selected.executions.map((exec) => (
                          <div
                            key={exec.id}
                            className="p-4 rounded-lg border border-border/60 bg-background hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                              <Badge
                                className={`text-[10px] border ${
                                  exec.status === "completed"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                    : exec.status === "failed"
                                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                                      : exec.status === "running"
                                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                        : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700"
                                }`}
                              >
                                {exec.status}
                              </Badge>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(exec.duration)}
                                </span>
                                <span>{timeAgo(exec.createdAt)}</span>
                              </div>
                            </div>
                            {exec.input && (
                              <p className="text-xs text-muted-foreground mb-1.5">
                                <span className="font-medium text-foreground/70">
                                  Input:
                                </span>{" "}
                                {exec.input}
                              </p>
                            )}
                            {exec.output && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/70">
                                  Output:
                                </span>{" "}
                                {exec.output.length > 200
                                  ? exec.output.slice(0, 200) + "…"
                                  : exec.output}
                              </p>
                            )}
                            {/* Execution timeline */}
                            {renderExecutionTimeline(exec)}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Empty state: no workflow selected */
            <Card className="border-border/60 shadow-sm h-full min-h-[400px] flex items-center justify-center">
              <div className="flex flex-col items-center justify-center text-center px-8">
                <div className="rounded-2xl bg-muted/50 p-5 mb-5 border border-border/40">
                  <WorkflowIcon className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-semibold text-foreground/80 mb-2">
                  Select a Workflow
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Choose a workflow from the list to view its graph, manage
                  nodes, and run executions. Or create a new one to get
                  started.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Single Add Node Dialog (controlled, triggered by buttons above) */}
      <Dialog
        open={addNodeOpen}
        onOpenChange={(open) => {
          setAddNodeOpen(open);
          if (!open) resetNodeForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Node to Workflow</DialogTitle>
          </DialogHeader>
          {addNodeDialogContent}
        </DialogContent>
      </Dialog>
    </div>
  );
}