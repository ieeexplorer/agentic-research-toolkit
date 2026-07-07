"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
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

const STATUS_CYCLE: Record<string, { next: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { next: "active", variant: "secondary" },
  active: { next: "archived", variant: "default" },
  archived: { next: "draft", variant: "outline" },
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700",
  active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-800/60 border-emerald-200 dark:border-emerald-800",
  archived: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-800/60 border-amber-200 dark:border-amber-800",
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

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkflowsView() {
  const { selectedWorkflowId, setSelectedWorkflowId, refreshing } =
    useToolkitStore();

  // ── State ──
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

  const svgRef = useRef<SVGSVGElement>(null);

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
    try {
      await fetch(`/api/workflows/${selectedWorkflowId}/nodes/${nodeId}`, {
        method: "DELETE",
      });
      toast.success("Node deleted");
      // Re-fetch selected workflow
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
      // Auto-position: right of existing nodes
      const maxX = selected?.nodes?.length
        ? Math.max(...selected.nodes.map((n) => n.positionX))
        : 0;
      const nodeW = 160;
      const gapX = 80;
      const posX = maxX > 0 ? maxX + nodeW + gapX : 0;

      // Vertical center
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

      // Re-fetch
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

  // ─── SVG Graph ──────────────────────────────────────────────────────────────

  const renderGraph = () => {
    if (!selected?.nodes || selected.nodes.length === 0) return null;

    const nodeMap = new Map(selected.nodes.map((n) => [n.id, n]));
    const nodeW = 160;
    const nodeH = 72;
    const padX = 50;
    const padY = 30;
    const svgW =
      Math.max(...selected.nodes.map((n) => n.positionX)) +
      nodeW +
      padX * 2;
    const svgH =
      Math.max(...selected.nodes.map((n) => n.positionY)) +
      nodeH +
      padY * 2 +
      60; // extra space for legend

    return (
      <div className="relative rounded-xl border border-border overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto min-h-[240px]"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.3) 50%, hsl(var(--background)) 100%)",
          }}
        >
          <defs>
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
            <filter id="shadow-hover" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="6"
                floodOpacity="0.18"
              />
            </filter>
          </defs>

          <style>{`
            @keyframes dash-flow {
              to { stroke-dashoffset: -16; }
            }
            .connection-line {
              animation: dash-flow 1s linear infinite;
            }
          `}</style>

          {/* Connections */}
          {selected.connections?.map((conn) => {
            const src = nodeMap.get(conn.sourceNodeId);
            const tgt = nodeMap.get(conn.targetNodeId);
            if (!src || !tgt) return null;
            const x1 = src.positionX + nodeW + padX;
            const y1 = src.positionY + nodeH / 2 + padY;
            const x2 = tgt.positionX + padX;
            const y2 = tgt.positionY + nodeH / 2 + padY;
            const cx = (x1 + x2) / 2;

            return (
              <g key={conn.id}>
                {/* Background glow for the path */}
                <path
                  d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  className="stroke-muted-foreground/10"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Animated dashed line */}
                <path
                  d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  className="stroke-muted-foreground/50 connection-line"
                  strokeWidth="2"
                  strokeDasharray="8 8"
                  strokeLinecap="round"
                  markerEnd="url(#arrowhead-animated)"
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
              </g>
            );
          })}

          {/* Nodes */}
          {selected.nodes.map((node) => {
            const colors = NODE_COLORS[node.nodeType] || NODE_COLORS.agent;
            const x = node.positionX + padX;
            const y = node.positionY + padY;
            const isHovered = hoveredNodeId === node.id;
            const scale = isHovered ? 1.06 : 1;
            const filter = isHovered ? "url(#shadow-hover)" : `url(#shadow-${node.nodeType})`;
            const subLabel =
              node.agent?.name || node.tool?.name || "";

            return (
              <TooltipProvider key={node.id} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <g
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      style={{
                        transformOrigin: `${x + nodeW / 2}px ${y + nodeH / 2}px`,
                        transform: `scale(${scale})`,
                        transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        cursor: "pointer",
                      }}
                    >
                      {/* Node rect */}
                      <rect
                        x={x}
                        y={y}
                        width={nodeW}
                        height={nodeH}
                        rx={12}
                        className={`${colors.bg} ${colors.border}`}
                        strokeWidth={isHovered ? 2.5 : 2}
                        filter={filter}
                        style={{
                          transition: "stroke-width 0.2s ease",
                        }}
                      />

                      {/* Node type badge */}
                      <rect
                        x={x + 8}
                        y={y + 8}
                        width={52}
                        height={18}
                        rx={4}
                        className={colors.bg}
                        opacity={0.7}
                      />
                      <circle
                        cx={x + 16}
                        cy={y + 17}
                        r={3}
                        fill={colors.dot}
                      />
                      <text
                        x={x + 23}
                        y={y + 21}
                        className={`${colors.text} text-[10px] font-semibold capitalize`}
                      >
                        {node.nodeType}
                      </text>

                      {/* Node name */}
                      <text
                        x={x + nodeW / 2}
                        y={subLabel ? y + 40 : y + 44}
                        textAnchor="middle"
                        className="fill-foreground text-[12px] font-semibold"
                      >
                        {node.name.length > 16
                          ? node.name.slice(0, 14) + "…"
                          : node.name}
                      </text>

                      {/* Sub-label (agent/tool name) */}
                      {subLabel && (
                        <text
                          x={x + nodeW / 2}
                          y={y + 56}
                          textAnchor="middle"
                          className="fill-muted-foreground text-[10px]"
                        >
                          {subLabel.length > 20
                            ? subLabel.slice(0, 18) + "…"
                            : subLabel}
                        </text>
                      )}

                      {/* Delete button on hover */}
                      {isHovered && (
                        <g
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <rect
                            x={x + nodeW - 24}
                            y={y + 4}
                            width={18}
                            height={18}
                            rx={4}
                            className="fill-destructive/10 stroke-destructive/30"
                            strokeWidth={1}
                          />
                          <text
                            x={x + nodeW - 18}
                            y={y + 16}
                            textAnchor="middle"
                            className="fill-destructive text-[10px] font-bold"
                          >
                            ×
                          </text>
                        </g>
                      )}
                    </g>
                  </TooltipTrigger>
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
                      Click × to remove
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${padX}, ${svgH - 44})`}>
            <text
              x={0}
              y={0}
              className="fill-muted-foreground text-[10px] font-semibold uppercase tracking-wider"
            >
              Legend
            </text>
            {NODE_TYPE_OPTIONS.map((opt, i) => {
              const lx = i * 100;
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
      </div>
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
          return <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />;
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
            <div key={result.nodeId || idx} className="flex items-start shrink-0">
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
                      <CardDescription>{selected.description}</CardDescription>
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
                        <Dialog
                          open={addNodeOpen}
                          onOpenChange={(open) => {
                            setAddNodeOpen(open);
                            if (!open) resetNodeForm();
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Node
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Node to Workflow</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                              <div className="space-y-2">
                                <Label>Node Name</Label>
                                <Input
                                  value={newNodeName}
                                  onChange={(e) =>
                                    setNewNodeName(e.target.value)
                                  }
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
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                      >
                                        <span className="flex items-center gap-2">
                                          <span
                                            className="inline-block w-2.5 h-2.5 rounded-full"
                                            style={{
                                              backgroundColor:
                                                NODE_COLORS[opt.value]?.dot,
                                            }}
                                          />
                                          {opt.label}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Agent select (shown when type is "agent") */}
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
                                    <Select
                                      value={newNodeAgentId}
                                      onValueChange={setNewNodeAgentId}
                                    >
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

                              {/* Tool select (shown when type is "tool") */}
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
                                    <Select
                                      value={newNodeToolId}
                                      onValueChange={setNewNodeToolId}
                                    >
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
                                disabled={
                                  !newNodeName.trim() ||
                                  !newNodeType ||
                                  creatingNode
                                }
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
                          </DialogContent>
                        </Dialog>
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
                      <Dialog
                        open={addNodeOpen}
                        onOpenChange={(open) => {
                          setAddNodeOpen(open);
                          if (!open) resetNodeForm();
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add First Node
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Node to Workflow</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label>Node Name</Label>
                              <Input
                                value={newNodeName}
                                onChange={(e) =>
                                  setNewNodeName(e.target.value)
                                }
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
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span
                                          className="inline-block w-2.5 h-2.5 rounded-full"
                                          style={{
                                            backgroundColor:
                                              NODE_COLORS[opt.value]?.dot,
                                          }}
                                        />
                                        {opt.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

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
                                  <Select
                                    value={newNodeAgentId}
                                    onValueChange={setNewNodeAgentId}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select an agent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {agents.map((a) => (
                                        <SelectItem
                                          key={a.id}
                                          value={a.id}
                                        >
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
                                  <Select
                                    value={newNodeToolId}
                                    onValueChange={setNewNodeToolId}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a tool..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {tools.map((t) => (
                                        <SelectItem
                                          key={t.id}
                                          value={t.id}
                                        >
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
                              disabled={
                                !newNodeName.trim() ||
                                !newNodeType ||
                                creatingNode
                              }
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
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  <Separator />

                  {/* Execute bar */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={execInput}
                      onChange={(e) => setExecInput(e.target.value)}
                      placeholder="Enter workflow input..."
                      onKeyDown={(e) => e.key === "Enter" && handleExecute()}
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
                  {!selected.executions || selected.executions.length === 0 ? (
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
    </div>
  );
}