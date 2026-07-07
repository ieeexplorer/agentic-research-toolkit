"use client";

import { useToolkitStore, type TabId } from "@/hooks/use-toolkit-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw } from "lucide-react";
import { DashboardView } from "@/components/toolkit/DashboardView";
import { AgentsView } from "@/components/toolkit/AgentsView";
import { WorkflowsView } from "@/components/toolkit/WorkflowsView";
import { ToolsView } from "@/components/toolkit/ToolsView";
import { MemoryView } from "@/components/toolkit/MemoryView";
import { EvaluationsView } from "@/components/toolkit/EvaluationsView";
import {
  LayoutDashboard,
  Bot,
  GitBranch,
  Wrench,
  Brain,
  BarChart3,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const NAV_ITEMS: { id: TabId; label: string; icon: typeof LayoutDashboard; description: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "System overview" },
  { id: "agents", label: "Agents", icon: Bot, description: "Research agents" },
  { id: "workflows", label: "Workflows", icon: GitBranch, description: "Orchestration" },
  { id: "tools", label: "Tools", icon: Wrench, description: "External tools" },
  { id: "memory", label: "Memory", icon: Brain, description: "Context store" },
  { id: "evaluations", label: "Evaluations", icon: BarChart3, description: "Quality checks" },
];

function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen } = useToolkitStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">Agentic Research</h1>
              <p className="text-xs text-muted-foreground">Toolkit v2.0</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          <TooltipProvider delayDuration={0}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.label}</span>
                      {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="lg:hidden">
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>

        <Separator />

        {/* Footer */}
        <div className="p-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-medium mb-1">Agentic Research Toolkit</p>
            <p className="text-xs text-muted-foreground">
              Modular framework for AI research workflows. Built for collaboration and evaluation.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  // Parent Home component guards with mounted check, so this is safe
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

const VIEW_MAP: Record<TabId, React.ComponentType> = {
  dashboard: DashboardView,
  agents: AgentsView,
  workflows: WorkflowsView,
  tools: ToolsView,
  memory: MemoryView,
  evaluations: EvaluationsView,
};

export default function Home() {
  const { activeTab, setRefreshing, refreshing } = useToolkitStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleRefresh = () => {
    setRefreshing(!refreshing);
  };

  if (!mounted) return null;

  const ActiveView = VIEW_MAP[activeTab];

  return (
    <TooltipProvider>
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
            <div className="flex items-center justify-between h-14 px-4 lg:px-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-9 w-9"
                  onClick={() => useToolkitStore.getState().setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="font-semibold text-sm">
                    {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
                  </h2>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {NAV_ITEMS.find((n) => n.id === activeTab)?.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-9 w-9">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="p-4 lg:p-6">
            <ActiveView />
          </div>

          {/* Footer */}
          <footer className="mt-auto border-t py-4 px-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Agentic Research Toolkit — Modular, extensible, evaluation-driven.</span>
              <span>MIT License</span>
            </div>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}