"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useToolkitStore } from "@/hooks/use-toolkit-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Plus, Play, Trash2, CheckCircle2, XCircle, Clock, Zap,
  Edit3, MoreHorizontal, TrendingUp, Target, Inbox, Edit,
  User, GitBranch,
} from "lucide-react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { toast } from "sonner";

interface Evaluation {
  id: string;
  name: string;
  type: string;
  metric: string;
  config: string;
  results: string;
  avgScore: number;
  status: string;
  agentId?: string;
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  quality: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
  accuracy: "bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300",
  relevance: "bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300",
  coherence: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
  custom: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const chartConfig = {
  score: { label: "Score", color: "hsl(var(--primary))" },
};

function getScoreColor(score: number): string {
  if (score >= 7) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 5) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 7) return "bg-emerald-500";
  if (score >= 5) return "bg-amber-500";
  return "bg-rose-500";
}

function getScoreBadgeStyle(score: number): string {
  if (score >= 7) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300";
  if (score >= 5) return "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300";
}

function getScoreBarColor(score: number): string {
  if (score >= 7) return "#10b981";
  if (score >= 5) return "#f59e0b";
  return "#ef4444";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function EvaluationsView() {
  const { refreshing } = useToolkitStore();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
  const [newEval, setNewEval] = useState({ name: "", type: "quality", metric: "score", agentId: "", workflowId: "" });
  const [editForm, setEditForm] = useState({ name: "", type: "", metric: "" });

  const fetchEvals = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted) return;
    const res = await fetch("/api/evaluations", { signal });
    const data = await res.json();
    if (!signal?.aborted) {
      setEvaluations(data);
      setLoading(false);
    }
  }, []);

  const fetchAgentsAndWorkflows = useCallback(async () => {
    try {
      const [agentRes, workflowRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/workflows"),
      ]);
      const agentData = await agentRes.json().catch(() => []);
      const workflowData = await workflowRes.json().catch(() => []);
      setAgents(Array.isArray(agentData) ? agentData.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })) : []);
      setWorkflows(Array.isArray(workflowData) ? workflowData.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })) : []);
    } catch {
      // Silently fail if endpoints don't exist
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void fetchEvals(controller.signal);
    void fetchAgentsAndWorkflows();
    return () => controller.abort();
  }, [fetchEvals, fetchAgentsAndWorkflows, refreshing]);

  const handleCreate = async () => {
    const body: Record<string, string> = { name: newEval.name, type: newEval.type, metric: newEval.metric };
    if (newEval.agentId) body.agentId = newEval.agentId;
    if (newEval.workflowId) body.workflowId = newEval.workflowId;
    await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    toast.success("Evaluation created");
    setCreateOpen(false);
    setNewEval({ name: "", type: "quality", metric: "score", agentId: "", workflowId: "" });
    fetchEvals();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/evaluations/${id}`, { method: "DELETE" });
    toast.success("Evaluation deleted");
    if (selectedId === id) setSelectedId(null);
    fetchEvals();
  };

  const handleRun = async (id: string) => {
    setRunning(id);
    try {
      const res = await fetch(`/api/evaluations/${id}/run`, { method: "POST" });
      const updated = await res.json();
      toast.success(`Evaluation complete — avg score: ${updated.avgScore}`);
      fetchEvals();
    } catch { toast.error("Evaluation failed"); }
    setRunning(null);
  };

  const openEditDialog = () => {
    if (!selected) return;
    setEditForm({ name: selected.name, type: selected.type, metric: selected.metric });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedId) return;
    await fetch(`/api/evaluations/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    toast.success("Evaluation updated");
    setEditOpen(false);
    fetchEvals();
  };

  const selected = evaluations.find((e) => e.id === selectedId);

  const parsedResults = useMemo(() => {
    if (!selected?.results) return [];
    try {
      const r = JSON.parse(selected.results);
      return Array.isArray(r) ? r : [];
    } catch { return []; }
  }, [selected?.results]);

  const chartData = useMemo(() => {
    return parsedResults
      .filter((r: Record<string, unknown>) => typeof r.score === "number")
      .map((r: Record<string, unknown>, i: number) => ({
        name: (r.criterion as string) || (r.query as string) || `Item ${i + 1}`,
        score: r.score as number,
      }));
  }, [parsedResults]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Evaluations</h2>
          <p className="text-muted-foreground mt-1">Measure and track agent and workflow quality.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />New Evaluation</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Create Evaluation</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newEval.name} onChange={(e) => setNewEval({ ...newEval, name: e.target.value })} placeholder="Quality Assessment" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newEval.type} onValueChange={(v) => setNewEval({ ...newEval, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["quality", "accuracy", "relevance", "coherence", "custom"].map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Metric</Label>
                  <Select value={newEval.metric} onValueChange={(v) => setNewEval({ ...newEval, metric: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Score (0-10)</SelectItem>
                      <SelectItem value="pass_fail">Pass / Fail</SelectItem>
                      <SelectItem value="ranking">Ranking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {agents.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Connect Agent (optional)</Label>
                  <Select value={newEval.agentId} onValueChange={(v) => setNewEval({ ...newEval, agentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select agent..." /></SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {workflows.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" />Connect Workflow (optional)</Label>
                  <Select value={newEval.workflowId} onValueChange={(v) => setNewEval({ ...newEval, workflowId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select workflow..." /></SelectTrigger>
                    <SelectContent>
                      {workflows.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleCreate} className="w-full" disabled={!newEval.name}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evaluation List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">All Evaluations</CardTitle>
                <Badge variant="secondary" className="text-xs font-normal">{evaluations.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              {loading ? (
                <div className="space-y-2 p-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
              ) : evaluations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="p-3 rounded-2xl bg-muted/60 mb-3">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No evaluations yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Create your first evaluation to measure quality</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[520px]">
                  <div className="space-y-1 p-1">
                    <AnimatePresence mode="popLayout">
                      {evaluations.map((ev, idx) => {
                        const scoreColor = ev.avgScore > 0 ? getScoreColor(ev.avgScore) : "";
                        return (
                          <motion.button
                            key={ev.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, delay: idx * 0.03 }}
                            onClick={() => setSelectedId(ev.id === selectedId ? null : ev.id)}
                            className={`w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-muted/60 ${selectedId === ev.id ? "bg-muted border border-border shadow-sm" : ""}`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="font-medium text-sm truncate">{ev.name}</p>
                              <BarChart3 className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 ml-2" />
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${TYPE_COLORS[ev.type]} text-[10px]`}>{ev.type}</Badge>
                              <Badge variant="outline" className="text-[10px]">{ev.metric}</Badge>
                            </div>
                            {ev.avgScore > 0 && (
                              <div className="flex items-center gap-3">
                                <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>
                                  {ev.avgScore}
                                </span>
                                <div className="flex-1">
                                  <Progress
                                    value={ev.metric === "pass_fail" ? ev.avgScore * 100 : ev.avgScore * 10}
                                    className="h-1.5"
                                  />
                                </div>
                              </div>
                            )}
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
            {selected ? (
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
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2.5 flex-wrap">
                          <div className="p-1.5 rounded-lg bg-muted/60 flex-shrink-0">
                            <Target className="h-5 w-5 text-muted-foreground" />
                          </div>
                          {selected.name}
                          {selected.avgScore > 0 && (
                            <Badge className={`${getScoreBadgeStyle(selected.avgScore)} text-sm px-2.5 py-0.5 font-bold tabular-nums gap-1`}>
                              <TrendingUp className="h-3.5 w-3.5" />
                              {selected.avgScore}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-2 flex items-center gap-2 flex-wrap">
                          <Badge className={`${TYPE_COLORS[selected.type]} text-xs`}>{selected.type}</Badge>
                          <span className="text-muted-foreground">using</span>
                          <Badge variant="outline" className="text-xs">{selected.metric}</Badge>
                          {selected.agentId && (
                            <Badge variant="outline" className="text-xs gap-1"><User className="h-3 w-3" />Agent</Badge>
                          )}
                          {selected.workflowId && (
                            <Badge variant="outline" className="text-xs gap-1"><GitBranch className="h-3 w-3" />Workflow</Badge>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={openEditDialog} className="text-muted-foreground hover:text-foreground">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit evaluation</TooltipContent>
                        </Tooltip>
                        <Button
                          size="sm"
                          onClick={() => handleRun(selected.id)}
                          disabled={running === selected.id}
                          className="gap-2"
                        >
                          {running === selected.id ? (
                            <><Zap className="h-4 w-4 animate-pulse" />Running</>
                          ) : (
                            <><Play className="h-4 w-4" />Run</>
                          )}
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(selected.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Score Overview */}
                    {selected.avgScore > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="p-5 rounded-xl bg-muted/40 border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            Average Score
                          </p>
                          <p className={`text-3xl font-bold tabular-nums ${getScoreColor(selected.avgScore)}`}>
                            {selected.avgScore}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              /{selected.metric === "pass_fail" ? "1" : "10"}
                            </span>
                          </p>
                        </div>
                        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${selected.metric === "pass_fail" ? selected.avgScore * 100 : selected.avgScore * 10}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${getScoreBgColor(selected.avgScore)}`}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                          <span>Poor</span>
                          <span>Average</span>
                          <span>Excellent</span>
                        </div>
                      </motion.div>
                    )}

                    {/* Bar Chart */}
                    {chartData.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="p-4 rounded-xl bg-muted/30 border border-border/50"
                      >
                        <p className="text-sm font-medium mb-3 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          Score Distribution
                        </p>
                        <ChartContainer config={chartConfig} className="h-[200px] w-full">
                          <RechartsBarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                            <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={24}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getScoreBarColor(entry.score)} />
                              ))}
                            </Bar>
                          </RechartsBarChart>
                        </ChartContainer>
                      </motion.div>
                    )}

                    {/* Results Breakdown */}
                    {(() => {
                      if (parsedResults.length === 0) return (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center py-10 text-center"
                        >
                          <div className="p-3 rounded-2xl bg-muted/60 mb-3">
                            <Target className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">No results yet</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Click &quot;Run&quot; to execute this evaluation</p>
                        </motion.div>
                      );

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <p className="text-sm font-medium mb-3 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            Results Breakdown
                            <Badge variant="secondary" className="text-xs font-normal">{parsedResults.length}</Badge>
                          </p>
                          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {parsedResults.map((r: Record<string, unknown>, i: number) => {
                              const score = typeof r.score === "number" ? r.score as number : null;
                              const passed = r.passed as boolean | undefined;
                              const name = (r.criterion as string) || (r.query as string) || `Item ${i + 1}`;
                              const notes = r.notes as string | undefined;
                              const hasScore = score !== null;
                              const displayScore = hasScore ? score : (r.relevance !== undefined ? Math.round((r.relevance as number) * 100) / 10 : null);

                              return (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors">
                                  <div className="pt-0.5 flex-shrink-0">
                                    {passed !== undefined ? (
                                      passed ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-rose-500" />
                                      )
                                    ) : displayScore !== null ? (
                                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${getScoreBgColor(displayScore)}`}>
                                        {displayScore}
                                      </div>
                                    ) : (
                                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                                        <span className="text-[10px] text-muted-foreground">—</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <p className="text-sm font-medium truncate">{name}</p>
                                      {displayScore !== null && (
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all duration-500 ${getScoreBgColor(displayScore)}`}
                                              style={{ width: `${displayScore * 10}%` }}
                                            />
                                          </div>
                                          <span className={`text-sm font-bold tabular-nums ${getScoreColor(displayScore)}`}>
                                            {displayScore}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {notes && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notes}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })()}

                    <Separator />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Created {formatDate(selected.createdAt)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Updated {formatDate(selected.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
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
                  <p className="text-muted-foreground font-medium">Select an evaluation to view details</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Choose from the list or create a new evaluation</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Evaluation</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["quality", "accuracy", "relevance", "coherence", "custom"].map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={editForm.metric} onValueChange={(v) => setEditForm({ ...editForm, metric: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Score (0-10)</SelectItem>
                    <SelectItem value="pass_fail">Pass / Fail</SelectItem>
                    <SelectItem value="ranking">Ranking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleEdit} disabled={!editForm.name}>Save Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}