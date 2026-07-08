"use client";

import { useEffect, useRef, useState } from "react";
import { useToolkitStore } from "@/hooks/use-toolkit-store";
import { useExecutionStream } from "@/hooks/use-execution-stream";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Bot,
  Wrench,
  GitBranch,
  Brain,
  Activity,
  TrendingUp,
  Zap,
  Clock,
  Play,
  Radio,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface DashboardData {
  totalAgents: number;
  totalTools: number;
  totalWorkflows: number;
  activeWorkflows: number;
  totalMemory: number;
  totalEvaluations: number;
  totalExecutions: number;
  avgTokens: number;
  recentActivity: {
    type: string;
    id: string;
    status: string;
    createdAt: string;
  }[];
  agentsByType: { type: string; count: number }[];
  toolsByType: { type: string; count: number }[];
  executionTimeline: {
    date: string;
    agentExecutions: number;
    toolExecutions: number;
    workflowExecutions: number;
  }[];
}

const STAT_CARDS = [
  { key: "totalAgents" as const, label: "Active Agents", icon: Bot, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400" },
  { key: "totalTools" as const, label: "Registered Tools", icon: Wrench, color: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400" },
  { key: "totalWorkflows" as const, label: "Workflows", icon: GitBranch, color: "text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400" },
  { key: "totalExecutions" as const, label: "Total Executions", icon: Activity, color: "text-rose-600 bg-rose-50 dark:bg-rose-950 dark:text-rose-400" },
  { key: "totalMemory" as const, label: "Memory Entries", icon: Brain, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950 dark:text-cyan-400" },
  { key: "avgTokens" as const, label: "Avg Tokens/Run", icon: TrendingUp, color: "text-pink-600 bg-pink-50 dark:bg-pink-950 dark:text-pink-400" },
];

const AGENT_TYPE_COLORS: Record<string, string> = {
  research: "bg-emerald-500",
  planning: "bg-blue-500",
  retrieval: "bg-violet-500",
  writing: "bg-amber-500",
  evaluation: "bg-rose-500",
  custom: "bg-gray-500",
};

const TOOL_TYPE_COLORS: Record<string, string> = {
  api: "bg-blue-500",
  search: "bg-emerald-500",
  document: "bg-amber-500",
  database: "bg-violet-500",
  local: "bg-rose-500",
  mcp: "bg-cyan-500",
};

const ACTIVITY_ICONS: Record<string, string> = {
  agent_execution: "Agent",
  tool_execution: "Tool",
  workflow_execution: "Workflow",
};

const timelineChartConfig = {
  agentExecutions: { label: "Agent", color: "var(--chart-1)" },
  toolExecutions: { label: "Tool", color: "var(--chart-2)" },
  workflowExecutions: { label: "Workflow", color: "var(--chart-3)" },
} satisfies ChartConfig;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getEventIcon(type: string) {
  if (type.startsWith("agent")) return Play;
  if (type.startsWith("tool")) return Wrench;
  if (type.startsWith("workflow")) return GitBranch;
  return Zap;
}

function getEventIconColor(type: string) {
  if (type.startsWith("agent")) return "text-emerald-500";
  if (type.startsWith("tool")) return "text-amber-500";
  if (type.startsWith("workflow")) return "text-violet-500";
  return "text-muted-foreground";
}

function getEventStatusLabel(status: string) {
  if (status === "running") return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">running</Badge>;
  if (status === "completed") return <Badge variant="default" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">completed</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
}

function getEventTypeLabel(type: string) {
  if (type.startsWith("agent")) return "Agent";
  if (type.startsWith("tool")) return "Tool";
  if (type.startsWith("workflow_node")) return "Node";
  if (type.startsWith("workflow")) return "Workflow";
  return type;
}

function LiveActivityCard() {
  const { events, connected } = useExecutionStream();
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveEvents = useToolkitStore((s) => s.liveEvents);

  // Auto-scroll to latest event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const displayEvents = liveEvents.length > 0 ? liveEvents : events;
  const last5 = displayEvents.slice(-5);

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4" /> Live Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2.5 w-2.5 ${connected ? "" : "opacity-40"}`}>
              {connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connected ? "bg-emerald-500" : "bg-gray-400"}`} />
            </span>
            <span className={`text-xs font-medium ${connected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {last5.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 text-center">
            No live activity — execute an agent or workflow to see real-time progress
          </p>
        ) : (
          <div ref={scrollRef} className="space-y-1.5 max-h-64 overflow-y-auto">
            {last5.map((event, idx) => {
              const Icon = getEventIcon(event.type);
              const iconColor = getEventIconColor(event.type);
              return (
                <div
                  key={`${event.id}-${event.type}-${idx}`}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {getEventTypeLabel(event.type)}
                        </span>
                        <span className="text-sm font-medium truncate">{event.name}</span>
                      </div>
                      {event.progress !== undefined && (
                        <div className="w-24 bg-muted rounded-full h-1 mt-0.5">
                          <div
                            className="h-1 rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${event.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                    {getEventStatusLabel(event.status)}
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const { refreshing } = useToolkitStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshing]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-5 w-5 animate-pulse" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const totalAgentsByType = data.agentsByType.reduce((s, a) => s + a.count, 0);
  const totalToolsByType = data.toolsByType.reduce((s, a) => s + a.count, 0);
  const hasTimeline = data.executionTimeline && data.executionTimeline.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your agentic research toolkit.</p>
      </div>

      {/* Live Activity Card - at the TOP */}
      <LiveActivityCard />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <p className="text-3xl font-bold mt-1">{data[key]}</p>
                </div>
                <div className={`p-3 rounded-xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              {key === "totalWorkflows" && (
                <p className="text-xs text-muted-foreground mt-2">
                  {data.activeWorkflows} active
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Execution Timeline Chart */}
      {hasTimeline && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" /> Execution Timeline
            </CardTitle>
            <p className="text-xs text-muted-foreground">Agent, tool, and workflow executions over the last 7 days</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={timelineChartConfig} className="h-[260px] w-full">
              <AreaChart data={data.executionTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillAgent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-agentExecutions)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-agentExecutions)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillTool" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-toolExecutions)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-toolExecutions)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillWorkflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-workflowExecutions)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-workflowExecutions)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => value}
                      indicator="dot"
                      className="min-w-[140px]"
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="agentExecutions"
                  stroke="var(--color-agentExecutions)"
                  fill="url(#fillAgent)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="toolExecutions"
                  stroke="var(--color-toolExecutions)"
                  fill="url(#fillTool)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="workflowExecutions"
                  stroke="var(--color-workflowExecutions)"
                  fill="url(#fillWorkflow)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4" /> Agents by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.agentsByType.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No agents created yet</p>
            ) : (
              <div className="space-y-3">
                {data.agentsByType.map((a) => (
                  <div key={a.type} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${AGENT_TYPE_COLORS[a.type] || "bg-gray-400"}`} />
                    <span className="text-sm font-medium capitalize flex-1">{a.type}</span>
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${AGENT_TYPE_COLORS[a.type] || "bg-gray-400"}`}
                        style={{ width: totalAgentsByType > 0 ? `${(a.count / totalAgentsByType) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="text-sm font-mono text-muted-foreground w-8 text-right">{a.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tool Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Tools by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.toolsByType.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tools registered yet</p>
            ) : (
              <div className="space-y-3">
                {data.toolsByType.map((t) => (
                  <div key={t.type} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${TOOL_TYPE_COLORS[t.type] || "bg-gray-400"}`} />
                    <span className="text-sm font-medium capitalize flex-1">{t.type}</span>
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${TOOL_TYPE_COLORS[t.type] || "bg-gray-400"}`}
                        style={{ width: totalToolsByType > 0 ? `${(t.count / totalToolsByType) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="text-sm font-mono text-muted-foreground w-8 text-right">{t.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {data.recentActivity.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">{ACTIVITY_ICONS[a.type] || a.type.replace("_", " ")}</span>
                      {" "}execution
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={a.status === "completed" ? "default" : a.status === "failed" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {a.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}