"use client";

import { useEffect, useState, useCallback } from "react";
import { useToolkitStore } from "@/hooks/use-toolkit-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bot,
  Plus,
  Play,
  Trash2,
  ChevronRight,
  Settings,
  Clock,
  Coins,
  Zap,
  Pencil,
  ChevronDown,
  ChevronUp,
  BotIcon,
  Sparkles,
  FileText,
  ArrowUpDown,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  status: string;
  _count?: { executions: number; workflowNodes: number };
  executions?: AgentExecution[];
}

interface AgentExecution {
  id: string;
  input: string;
  output: string;
  status: string;
  duration: number;
  tokensUsed: number;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  research: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  planning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  retrieval: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  writing: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  evaluation: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const TYPE_ICONS: Record<string, string> = {
  research: "🔬",
  planning: "📋",
  retrieval: "🔍",
  writing: "✍️",
  evaluation: "✅",
  custom: "⚙️",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline"; className: string }> = {
  active: { label: "Active", variant: "default", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  draft: { label: "Draft", variant: "secondary", className: "" },
  archived: { label: "Archived", variant: "outline", className: "" },
};

const MODEL_OPTIONS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
];

const TYPE_OPTIONS = ["research", "planning", "retrieval", "writing", "evaluation", "custom"] as const;

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TokenUsageBar({ tokensUsed }: { tokensUsed: number }) {
  const maxRef = 8000;
  const pct = Math.min((tokensUsed / maxRef) * 100, 100);
  const color =
    pct < 30
      ? "text-emerald-600 dark:text-emerald-400"
      : pct < 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${pct < 30 ? "bg-emerald-500" : pct < 70 ? "bg-amber-500" : "bg-rose-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className={`text-xs font-medium ${color}`}>{tokensUsed.toLocaleString()}</span>
    </div>
  );
}

function ExecutionStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
  return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
}

function ExecutionCard({ exec }: { exec: AgentExecution }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (exec.output?.length ?? 0) > 300;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card"
    >
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <ExecutionStatusIcon status={exec.status} />
            <Badge
              variant={
                exec.status === "completed"
                  ? "default"
                  : exec.status === "failed"
                    ? "destructive"
                    : "secondary"
              }
              className="text-xs"
            >
              {exec.status}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {exec.duration}ms
            </span>
            <TokenUsageBar tokensUsed={exec.tokensUsed} />
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo(exec.createdAt)}</span>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Input:</span> {exec.input}
        </p>

        {exec.output && (
          <div className="rounded-md bg-muted/40 border border-border/50 overflow-hidden">
            <div
              className="prose prose-xs dark:prose-invert max-w-none p-3 text-xs leading-relaxed overflow-y-auto [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              style={{ maxHeight: expanded ? "none" : "6rem" }}
            >
              <ReactMarkdown>{exec.output}</ReactMarkdown>
            </div>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 border-t border-border/50 flex items-center justify-center gap-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Show more
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AgentListItem({
  agent,
  isSelected,
  onClick,
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusCfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.draft;
  return (
    <motion.button
      layout
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 group ${
        isSelected
          ? "bg-primary/5 border border-primary/20 shadow-sm"
          : "hover:bg-muted/60 border border-transparent"
      }`}
      whileHover={{ x: 2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="text-xl flex-shrink-0">{TYPE_ICONS[agent.type] || "⚙️"}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{agent.name}</p>
          {agent.status !== "active" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
              {statusCfg.label}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{agent.description || agent.type}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {agent._count && agent._count.executions > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {agent._count.executions} runs
          </span>
        )}
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-opacity flex-shrink-0 ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />
      </div>
    </motion.button>
  );
}

function EmptyListState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="rounded-2xl bg-muted/50 p-4 mb-4">
        <Bot className="h-10 w-10 text-muted-foreground/60" />
      </div>
      <h3 className="text-sm font-semibold mb-1">No agents yet</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
        Create your first agent to start building powerful research workflows.
      </p>
      <Button size="sm" onClick={onCreateClick} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Create Agent
      </Button>
    </motion.div>
  );
}

function EmptyDetailState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6"
    >
      <div className="rounded-2xl bg-muted/40 p-5 mb-4">
        <Sparkles className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <h3 className="text-sm font-medium text-muted-foreground mb-1">
        Select an agent
      </h3>
      <p className="text-xs text-muted-foreground/70 max-w-[220px]">
        Choose an agent from the list to view its details, configuration, and execution history.
      </p>
    </motion.div>
  );
}

export function AgentsView() {
  const { selectedAgentId, setSelectedAgentId, refreshing } = useToolkitStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editAgent, setEditAgent] = useState({
    name: "",
    description: "",
    type: "research",
    systemPrompt: "",
    model: "gpt-4o",
    temperature: 0.7,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    type: "research",
    systemPrompt: "",
    model: "gpt-4o",
    temperature: 0.7,
  });
  const [execInput, setExecInput] = useState("");

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents, refreshing]);

  useEffect(() => {
    if (!selectedAgentId) {
      setDetailAgent(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/agents/${selectedAgentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetailAgent(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId, refreshing]);

  const handleCreate = async () => {
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAgent),
    });
    toast.success("Agent created");
    setCreateOpen(false);
    setNewAgent({ name: "", description: "", type: "research", systemPrompt: "", model: "gpt-4o", temperature: 0.7 });
    fetchAgents();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    toast.success("Agent deleted");
    if (selectedAgentId === id) setSelectedAgentId(null);
    fetchAgents();
  };

  const handleExecute = async () => {
    if (!selectedAgentId) return;
    setExecuting(true);
    try {
      const res = await fetch(`/api/agents/${selectedAgentId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: execInput || "Run analysis" }),
      });
      const execution = await res.json();
      toast.success(`Execution completed in ${execution.duration}ms`);
      setExecInput("");
      fetch(`/api/agents/${selectedAgentId}`)
        .then((r) => r.json())
        .then(setDetailAgent);
      fetchAgents();
    } catch {
      toast.error("Execution failed");
    }
    setExecuting(false);
  };

  const openEditDialog = () => {
    if (!detailAgent) return;
    setEditAgent({
      name: detailAgent.name,
      description: detailAgent.description,
      type: detailAgent.type,
      systemPrompt: detailAgent.systemPrompt,
      model: detailAgent.model,
      temperature: detailAgent.temperature,
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!detailAgent) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/agents/${detailAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editAgent),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Agent updated");
      setEditOpen(false);
      // Refresh detail
      fetch(`/api/agents/${detailAgent.id}`)
        .then((r) => r.json())
        .then(setDetailAgent);
      fetchAgents();
    } catch {
      toast.error("Failed to update agent");
    }
    setEditSaving(false);
  };

  const handleStatusToggle = async (newStatus: string) => {
    if (!detailAgent || detailAgent.status === newStatus) return;
    try {
      const res = await fetch(`/api/agents/${detailAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Status changed to ${newStatus}`);
      fetch(`/api/agents/${detailAgent.id}`)
        .then((r) => r.json())
        .then(setDetailAgent);
      fetchAgents();
    } catch {
      toast.error("Failed to change status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold tracking-tight">Agents</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create and manage your research agents.
          </p>
        </motion.div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                    placeholder="Research Analyst"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newAgent.type}
                    onValueChange={(v) => setNewAgent({ ...newAgent, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  placeholder="What does this agent do?"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={newAgent.systemPrompt}
                  onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                  placeholder="You are a..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={newAgent.model}
                    onValueChange={(v) => setNewAgent({ ...newAgent, model: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Temperature: {newAgent.temperature}</Label>
                  <Input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={newAgent.temperature}
                    onChange={(e) =>
                      setNewAgent({ ...newAgent, temperature: parseFloat(e.target.value) })
                    }
                    className="h-9"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreate}
                className="w-full"
                disabled={!newAgent.name}
              >
                Create Agent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editAgent.name}
                  onChange={(e) => setEditAgent({ ...editAgent, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editAgent.type}
                  onValueChange={(v) => setEditAgent({ ...editAgent, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editAgent.description}
                onChange={(e) => setEditAgent({ ...editAgent, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={editAgent.systemPrompt}
                onChange={(e) => setEditAgent({ ...editAgent, systemPrompt: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={editAgent.model}
                  onValueChange={(v) => setEditAgent({ ...editAgent, model: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperature: {editAgent.temperature}</Label>
                <Input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={editAgent.temperature}
                  onChange={(e) =>
                    setEditAgent({ ...editAgent, temperature: parseFloat(e.target.value) })
                  }
                  className="h-9"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleEditSave} disabled={editSaving || !editAgent.name}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List Column */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                All Agents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : agents.length === 0 ? (
                <EmptyListState onCreateClick={() => setCreateOpen(true)} />
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-1 p-1">
                    <AnimatePresence mode="popLayout">
                      {agents.map((agent) => (
                        <AgentListItem
                          key={agent.id}
                          agent={agent}
                          isSelected={selectedAgentId === agent.id}
                          onClick={() =>
                            setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)
                          }
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Detail Column */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {detailAgent ? (
              <motion.div
                key={detailAgent.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Card className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="rounded-xl bg-muted/60 p-2.5 flex-shrink-0">
                          <span className="text-2xl">{TYPE_ICONS[detailAgent.type]}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="truncate">{detailAgent.name}</CardTitle>
                            <Badge className={TYPE_COLORS[detailAgent.type]}>
                              {detailAgent.type}
                            </Badge>
                          </div>
                          <CardDescription className="mt-1 line-clamp-2">
                            {detailAgent.description || "No description"}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant={
                                detailAgent.status === "active" ? "default" : "outline"
                              }
                              size="sm"
                              className={`h-8 gap-1.5 ${
                                STATUS_CONFIG[detailAgent.status]?.className || ""
                              }`}
                            >
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${
                                  detailAgent.status === "active"
                                    ? "bg-current animate-pulse"
                                    : detailAgent.status === "draft"
                                      ? "bg-amber-400"
                                      : "bg-muted-foreground"
                                }`}
                              />
                              {STATUS_CONFIG[detailAgent.status]?.label || detailAgent.status}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["active", "draft", "archived"] as const).map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => handleStatusToggle(s)}
                                disabled={detailAgent.status === s}
                              >
                                {s === "active" && <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />}
                                {s === "draft" && <FileText className="h-4 w-4 mr-2 text-amber-500" />}
                                {s === "archived" && <Archive className="h-4 w-4 mr-2 text-muted-foreground" />}
                                <span className="capitalize">{s}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={openEditDialog}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(detailAgent.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: Bot, label: "Model", value: detailAgent.model },
                        { icon: Settings, label: "Temp", value: detailAgent.temperature },
                        {
                          icon: Coins,
                          label: "Max Tokens",
                          value: detailAgent.maxTokens?.toLocaleString() ?? "—",
                        },
                        {
                          icon: Zap,
                          label: "Executions",
                          value:
                            detailAgent._count?.executions ??
                            detailAgent.executions?.length ??
                            0,
                        },
                      ].map(({ icon: I, label, value }) => (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50"
                        >
                          <I className="h-4 w-4 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                              {label}
                            </p>
                            <p className="text-sm font-semibold truncate">{value}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* System Prompt Preview */}
                    {detailAgent.systemPrompt && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          System Prompt
                        </p>
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed">
                            {detailAgent.systemPrompt}
                          </p>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Quick Execute */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Play className="h-4 w-4 text-emerald-500" />
                        Quick Execute
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={execInput}
                          onChange={(e) => setExecInput(e.target.value)}
                          placeholder="Enter a query or instruction..."
                          onKeyDown={(e) => e.key === "Enter" && handleExecute()}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleExecute}
                          disabled={executing || detailAgent.status === "archived"}
                        >
                          {executing ? (
                            <span className="flex items-center gap-2">
                              <Zap className="h-4 w-4 animate-pulse" />
                              Running
                            </span>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Run
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Execution History */}
                    {detailAgent.executions && detailAgent.executions.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Execution History
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {detailAgent.executions.length}
                            </Badge>
                          </p>
                          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                            {detailAgent.executions.map((exec) => (
                              <ExecutionCard key={exec.id} exec={exec} />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="flex items-center justify-center min-h-[400px]">
                  <EmptyDetailState />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}