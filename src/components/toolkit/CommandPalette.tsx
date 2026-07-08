"use client";

import { useCallback, useEffect, useRef } from "react";
import { useToolkitStore, type TabId } from "@/hooks/use-toolkit-store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Bot,
  GitBranch,
  Wrench,
  Brain,
  BarChart3,
  FileUp,
  Plus,
  RotateCcw,
  Sun,
  Moon,
  Search,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const NAV_COMMANDS: { id: TabId; label: string; icon: typeof LayoutDashboard; keywords: string[] }[] = [
  { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard, keywords: ["home", "overview", "stats"] },
  { id: "agents", label: "Go to Agents", icon: Bot, keywords: ["bot", "research", "ai"] },
  { id: "workflows", label: "Go to Workflows", icon: GitBranch, keywords: ["pipeline", "orchestration", "flow"] },
  { id: "tools", label: "Go to Tools", icon: Wrench, keywords: ["api", "connector", "integration"] },
  { id: "documents", label: "Go to Documents", icon: FileUp, keywords: ["upload", "ingest", "file", "pdf"] },
  { id: "memory", label: "Go to Memory", icon: Brain, keywords: ["context", "store", "session"] },
  { id: "evaluations", label: "Go to Evaluations", icon: BarChart3, keywords: ["quality", "score", "metrics", "test"] },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveTab, setRefreshing } = useToolkitStore();
  const { setTheme, resolvedTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      // Small delay so cmdk can render first
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [commandPaletteOpen]);

  const runAction = useCallback((action: () => void) => {
    action();
    setCommandPaletteOpen(false);
  }, [setCommandPaletteOpen]);

  const handleSeed = useCallback(() => {
    runAction(() => {
      fetch("/api/seed", { method: "POST" })
        .then((r) => r.json())
        .then(() => {
          toast.success("Database seeded with demo data");
          setRefreshing(true);
        })
        .catch(() => toast.error("Failed to seed database"));
    });
  }, [runAction, setRefreshing]);

  const handleRefresh = useCallback(() => {
    runAction(() => {
      setRefreshing(true);
      toast.success("Data refreshed");
    });
  }, [runAction, setRefreshing]);

  const handleToggleTheme = useCallback(() => {
    runAction(() => {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    });
  }, [runAction, setTheme, resolvedTheme]);

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput
        ref={inputRef}
        placeholder="Type a command or search..."
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {NAV_COMMANDS.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.id}
                onSelect={() => runAction(() => setActiveTab(cmd.id))}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{cmd.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleSeed}>
            <RotateCcw className="mr-2 h-4 w-4" />
            <span>Seed Demo Data</span>
          </CommandItem>
          <CommandItem onSelect={handleRefresh}>
            <Search className="mr-2 h-4 w-4" />
            <span>Refresh Data</span>
          </CommandItem>
          <CommandItem onSelect={handleToggleTheme}>
            {resolvedTheme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            <span>Toggle {resolvedTheme === "dark" ? "Light" : "Dark"} Mode</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}