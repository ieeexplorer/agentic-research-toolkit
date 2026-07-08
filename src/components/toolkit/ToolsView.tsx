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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench, Plus, Play, Trash2, ChevronRight, Globe, Search, FileText, Database,
  Terminal, Layers, Clock, Zap, Edit3, MoreHorizontal, Check, X,
  Workflow, Archive, CircleDot, WrenchIcon, ChevronDown, Inbox,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

interface Tool {
  id: string;
  name: string;
  description: string;
  type: string;
  endpoint: string;
  config: string;
  status: string;
  _count?: { executions: number; workflowNodes: number };
  executions?: ToolExecution[];
}

interface ToolExecution {
  id: string;
  input: string;
  output: string;
  status: string;
  duration: number;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Wrench; color: string; bg: string; border: string }> = {
  api: { icon: Globe, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/60", border: "border-l-teal-500" },
  search: { icon: Search, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60", border: "border-l-emerald-500" },
  document: { icon: FileText, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/60", border: "border-l-amber-500" },
  database: { icon: Database, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/60", border: "border-l-rose-500" },
  local: { icon: Terminal, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/60", border: "border-l-orange-500" },
  mcp: { icon: Layers, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/60", border: "border-l-cyan-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300", dotColor: "bg-emerald-500" },
  draft: { label: "Draft", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300", dotColor: "bg-amber-500" },
  archived: { label: "Archived", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", dotColor: "bg-zinc-400" },
};

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ToolsView() {
  const { refreshing } = useToolkitStore();
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTool, setEditTool] = useState({ name: "", description: "", endpoint: "", config: "" });
  const [newTool, setNewTool] = useState({ name: "", description: "", type: "api", endpoint: "", config: "{}" });
  const [execInput, setExecInput] = useState("");
  const [expandedExecs, setExpandedExecs] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);

  const fetchTools = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted) return;
    const res = await fetch("/api/tools", { signal });
    const data = await res.json();
    if (!signal?.aborted) {
      setTools(data);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void fetchTools(controller.signal);
    return () => controller.abort();
  }, [fetchTools, refreshing]);

  useEffect(() => {
    if (selectedId) {
      const controller = new AbortController();
      fetch(`/api/tools/${selectedId}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => { if (!controller.signal.aborted) setSelected(data); });
      return () => controller.abort();
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      const id = setTimeout(() => setSelected(null), 0);
      return () => clearTimeout(id);
    }
  }, [selectedId, refreshing]);

  const handleCreate = async () => {
    await fetch("/api/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTool),
    });
    toast.success("Tool created successfully");
    setCreateOpen(false);
    setNewTool({ name: "", description: "", type: "api", endpoint: "", config: "{}" });
    fetchTools();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/tools/${id}`, { method: "DELETE" });
    toast.success("Tool deleted");
    if (selectedId === id) setSelectedId(null);
    fetchTools();
  };

  const handleEdit = async () => {
    if (!selectedId) return;
    setUpdating(true);
    try {
      await fetch(`/api/tools/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTool),
      });
      toast.success("Tool updated");
      setEditOpen(false);
      fetchTools();
      fetch(`/api/tools/${selectedId}`).then((r) => r.json()).then(setSelected);
    } catch {
      toast.error("Failed to update tool");
    }
    setUpdating(false);
  };

  const openEditDialog = () => {
    if (!selected) return;
    setEditTool({
      name: selected.name,
      description: selected.description,
      endpoint: selected.endpoint,
      config: selected.config || "{}",
    });
    setEditOpen(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedId) return;
    await fetch(`/api/tools/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    toast.success(`Status changed to ${newStatus}`);
    fetchTools();
    fetch(`/api/tools/${selectedId}`).then((r) => r.json()).then(setSelected);
  };

  const handleExecute = async () => {
    if (!selectedId) return;
    setExecuting(true);
    try {
      const res = await fetch(`/api/tools/${selectedId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: execInput || "Run tool" }),
      });
      const exec = await res.json();
      toast.success(`Tool completed in ${exec.duration}ms`);
      setExecInput("");
      fetch(`/api/tools/${selectedId}`).then((r) => r.json()).then(setSelected);
      fetchTools();
    } catch { toast.error("Execution failed"); }
    setExecuting(false);
  };

  const toggleExecExpand = (id: string) => {
    setExpandedExecs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tools</h2>
          <p className="text-muted-foreground mt-1">Connect external tools, APIs, and utilities.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />New Tool</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Register Tool</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newTool.name} onChange={(e) => setNewTool({ ...newTool, name: e.target.value })} placeholder="Web Search" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newTool.type} onValueChange={(v) => setNewTool({ ...newTool, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["api", "search", "document", "database", "local", "mcp"].map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Endpoint</Label>
                <Input value={newTool.endpoint} onChange={(e) => setNewTool({ ...newTool, endpoint: e.target.value })} placeholder="https://api.example.com/v1" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newTool.description} onChange={(e) => setNewTool({ ...newTool, description: e.target.value })} placeholder="What does this tool do?" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Config (JSON)</Label>
                <Textarea value={newTool.config} onChange={(e) => setNewTool({ ...newTool, config: e.target.value })} placeholder='{"key": "value"}' rows={2} className="font-mono text-xs" />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!newTool.name}>Register Tool</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tool List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Tools</CardTitle>
                <Badge variant="secondary" className="text-xs font-normal">{tools.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {loading ? (
                <div className="space-y-2 p-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
              ) : tools.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="p-3 rounded-2xl bg-muted/60 mb-3">
                    <WrenchIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No tools yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Register your first tool to get started</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[520px]">
                  <div className="space-y-1 p-1">
                    <AnimatePresence mode="popLayout">
                      {tools.map((tool, idx) => {
                        const tc = TYPE_CONFIG[tool.type] || TYPE_CONFIG.api;
                        const sc = STATUS_CONFIG[tool.status] || STATUS_CONFIG.draft;
                        const Icon = tc.icon;
                        return (
                          <motion.button
                            key={tool.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, delay: idx * 0.03 }}
                            onClick={() => setSelectedId(tool.id === selectedId ? null : tool.id)}
                            className={`w-full text-left p-3 rounded-lg transition-all duration-200 group hover:bg-muted/60 border-l-4 ${tc.border} ${selectedId === tool.id ? "bg-muted border border-border border-l-4 shadow-sm" : "border-l-transparent"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${tc.bg} transition-transform duration-200 group-hover:scale-105`}>
                                <Icon className={`h-4 w-4 ${tc.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{tool.name}</p>
                                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${sc.dotColor}`} />
                                </div>
                                <p className="text-xs text-muted-foreground capitalize mt-0.5">{tool.type}</p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {tool._count?.workflowNodes ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                                        <Workflow className="h-2.5 w-2.5" />{tool._count.workflowNodes}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>{tool._count.workflowNodes} workflow{tool._count.workflowNodes > 1 ? "s" : ""}</TooltipContent>
                                  </Tooltip>
                                ) : null}
                                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-all duration-200 ${selectedId === tool.id ? "opacity-100 translate-x-0" : "opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0"}`} />
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selected ? (() => {
              const tc = TYPE_CONFIG[selected.type] || TYPE_CONFIG.api;
              const sc = STATUS_CONFIG[selected.status] || STATUS_CONFIG.draft;
              const Icon = tc.icon;
              return (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-3 rounded-xl ${tc.bg} flex-shrink-0`}>
                            <Icon className={`h-6 w-6 ${tc.color}`} />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="flex items-center gap-2 flex-wrap">
                              {selected.name}
                              <Badge className={`${sc.color} text-xs gap-1`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${sc.dotColor}`} />
                                {sc.label}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">{selected.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={openEditDialog} className="text-muted-foreground hover:text-foreground">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit tool</TooltipContent>
                          </Tooltip>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusChange("active")} className="gap-2">
                                <CircleDot className="h-3.5 w-3.5 text-emerald-500" />Set Active
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange("draft")} className="gap-2">
                                <Wrench className="h-3.5 w-3.5 text-amber-500" />Set Draft
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange("archived")} className="gap-2">
                                <Archive className="h-3.5 w-3.5 text-zinc-500" />Set Archived
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(selected.id)} className="gap-2 text-destructive focus:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" />Endpoint</p>
                          <p className="text-xs font-mono mt-1 truncate">{selected.endpoint || "—"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" />Executions</p>
                          <p className="text-lg font-semibold">{selected._count?.executions || selected.executions?.length || 0}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Workflow className="h-3 w-3" />Workflows</p>
                          <p className="text-lg font-semibold">{selected._count?.workflowNodes || 0}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><CircleDot className="h-3 w-3" />Status</p>
                          <p className="text-sm font-medium capitalize">{selected.status}</p>
                        </div>
                      </div>

                      {selected.config && selected.config !== "{}" && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Layers className="h-3 w-3" />Configuration
                          </p>
                          <pre className="text-xs font-mono overflow-auto max-h-28 bg-background/50 rounded p-2 border border-border/30">
                            {(() => { try { return JSON.stringify(JSON.parse(selected.config), null, 2); } catch { return selected.config; } })()}
                          </pre>
                        </div>
                      )}

                      <Separator />

                      {/* Execution Input */}
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Play className="h-4 w-4" />Execute Tool
                        </p>
                        <div className="flex gap-2">
                          <Input value={execInput} onChange={(e) => setExecInput(e.target.value)} placeholder="Enter tool input..." onKeyDown={(e) => e.key === "Enter" && handleExecute()} />
                          <Button onClick={handleExecute} disabled={executing} className="gap-2 flex-shrink-0">
                            {executing ? (
                              <><Zap className="h-4 w-4 animate-pulse" /><span className="hidden sm:inline">Running</span></>
                            ) : (
                              <><Play className="h-4 w-4" /><span className="hidden sm:inline">Run</span></>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Execution History */}
                      {selected.executions && selected.executions.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Clock className="h-4 w-4" />Execution History
                              <Badge variant="secondary" className="text-xs font-normal">{selected.executions.length}</Badge>
                            </p>
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                              {selected.executions.map((exec) => {
                                const isExpanded = expandedExecs.has(exec.id);
                                const isCompleted = exec.status === "completed";
                                return (
                                  <motion.div
                                    key={exec.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-lg border border-border/60 overflow-hidden bg-card"
                                  >
                                    <Collapsible open={isExpanded} onOpenChange={() => toggleExecExpand(exec.id)}>
                                      <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors">
                                          <div className="flex items-center gap-2">
                                            {isCompleted ? (
                                              <Check className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                              <X className="h-4 w-4 text-rose-500" />
                                            )}
                                            <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs">
                                              {exec.status}
                                            </Badge>
                                            <span className="text-xs font-mono text-muted-foreground truncate max-w-[140px] sm:max-w-[220px]">
                                              {exec.input}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                                            <span className="flex items-center gap-1">
                                              <Zap className="h-3 w-3" />{exec.duration}ms
                                            </span>
                                            <span className="hidden sm:inline">{timeAgo(exec.createdAt)}</span>
                                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                          </div>
                                        </div>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="px-3 pb-3">
                                          <pre className="text-xs font-mono bg-muted/50 p-3 rounded-md overflow-auto max-h-48 whitespace-pre-wrap border border-border/40 leading-relaxed">
                                            {exec.output}
                                          </pre>
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })() : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Card className="flex flex-col items-center justify-center h-72 border-dashed">
                  <div className="p-4 rounded-2xl bg-muted/60 mb-4">
                    <Inbox className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">Select a tool to view details</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Choose from the list or create a new tool</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Tool</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editTool.name} onChange={(e) => setEditTool({ ...editTool, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editTool.description} onChange={(e) => setEditTool({ ...editTool, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Endpoint</Label>
              <Input value={editTool.endpoint} onChange={(e) => setEditTool({ ...editTool, endpoint: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Config (JSON)</Label>
              <Textarea value={editTool.config} onChange={(e) => setEditTool({ ...editTool, config: e.target.value })} rows={3} className="font-mono text-xs" />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleEdit} disabled={updating || !editTool.name}>
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
