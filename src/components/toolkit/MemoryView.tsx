"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useToolkitStore } from "@/hooks/use-toolkit-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Plus, Trash2, Search, Clock, Tag, Edit3, Database,
  Zap, MessageSquare, BarChart3, CheckSquare, Square,
  XCircle, Inbox,
} from "lucide-react";
import { toast } from "sonner";

interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  type: string;
  tags: string;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string; border: string; icon: typeof Brain; iconColor: string }> = {
  short_term: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
    label: "Short-Term",
    border: "border-l-amber-500",
    icon: Zap,
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  long_term: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
    label: "Long-Term",
    border: "border-l-emerald-500",
    icon: Brain,
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },
  session: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300",
    label: "Session",
    border: "border-l-violet-500",
    icon: MessageSquare,
    iconColor: "text-violet-500 dark:text-violet-400",
  },
};

export function MemoryView() {
  const { refreshing } = useToolkitStore();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MemoryEntry | null>(null);
  const [editForm, setEditForm] = useState({ key: "", value: "", type: "short_term", tags: "" });
  const [newEntry, setNewEntry] = useState({ key: "", value: "", type: "short_term" as string, tags: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const fetchEntries = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted) return;
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/memory?${params}`, { signal });
    const data = await res.json();
    if (!signal?.aborted) {
      setEntries(data);
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void fetchEntries(controller.signal);
    return () => controller.abort();
  }, [fetchEntries, refreshing]);

  const stats = useMemo(() => {
    const total = entries.length;
    const byType = { short_term: 0, long_term: 0, session: 0 };
    entries.forEach((e) => {
      if (byType[e.type] !== undefined) byType[e.type]++;
    });
    return { total, byType };
  }, [entries]);

  const handleCreate = async () => {
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: newEntry.key,
        value: newEntry.value,
        type: newEntry.type,
        tags: newEntry.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    toast.success("Memory entry stored");
    setCreateOpen(false);
    setNewEntry({ key: "", value: "", type: "short_term", tags: "" });
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/memory/${id}`, { method: "DELETE" });
    toast.success("Entry deleted");
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    fetchEntries();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => fetch(`/api/memory/${id}`, { method: "DELETE" })));
    toast.success(`${ids.length} entries deleted`);
    setSelectedIds(new Set());
    setBulkMode(false);
    fetchEntries();
  };

  const openEditDialog = (entry: MemoryEntry) => {
    let parsedTags = "";
    try { parsedTags = (JSON.parse(entry.tags) as string[]).join(", "); } catch { parsedTags = entry.tags; }
    setEditingEntry(entry);
    setEditForm({ key: entry.key, value: entry.value, type: entry.type, tags: parsedTags });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingEntry) return;
    await fetch(`/api/memory/${editingEntry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: editForm.key,
        value: editForm.value,
        type: editForm.type,
        tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    toast.success("Entry updated");
    setEditOpen(false);
    fetchEntries();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Memory</h2>
          <p className="text-muted-foreground mt-1">Manage short-term, long-term, and session context.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={bulkMode ? "default" : "outline"}
            size="sm"
            onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
            className="gap-2"
          >
            {bulkMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            <span className="hidden sm:inline">{bulkMode ? "Cancel" : "Select"}</span>
          </Button>
          {bulkMode && selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />Delete ({selectedIds.size})
            </Button>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />New Entry</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Store Memory</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Input value={newEntry.key} onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })} placeholder="research_context" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newEntry.type} onValueChange={(v) => setNewEntry({ ...newEntry, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_term">Short-Term</SelectItem>
                      <SelectItem value="long_term">Long-Term</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Textarea value={newEntry.value} onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })} placeholder="Memory content..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input value={newEntry.tags} onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })} placeholder="research, context" />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={!newEntry.key || !newEntry.value}>Store</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Card */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/60">
                  <Database className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Entries</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {(["short_term", "long_term", "session"] as const).map((type) => {
            const ts = TYPE_STYLES[type];
            const Icon = ts.icon;
            return (
              <Card key={type} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${ts.bg}`}>
                      <Icon className={`h-5 w-5 ${ts.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.byType[type]}</p>
                      <p className="text-xs text-muted-foreground">{ts.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memory keys or values..." className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="short_term">Short-Term</SelectItem>
            <SelectItem value="long_term">Long-Term</SelectItem>
            <SelectItem value="session">Session</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk select bar */}
      <AnimatePresence>
        {bulkMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Checkbox
                checked={selectedIds.size === entries.length && entries.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} of ${entries.length} selected` : "Select all entries"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
        </div>
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="flex flex-col items-center justify-center h-64 border-dashed">
            <div className="p-4 rounded-2xl bg-muted/60 mb-4">
              <Brain className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No memory entries found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search || typeFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Store your first memory entry to get started"}
            </p>
            {!search && typeFilter === "all" && (
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />Create Entry
              </Button>
            )}
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {entries.map((entry, idx) => {
              const ts = TYPE_STYLES[entry.type] || TYPE_STYLES.short_term;
              const TypeIcon = ts.icon;
              let parsedTags: string[] = [];
              try { parsedTags = JSON.parse(entry.tags); } catch { parsedTags = []; }
              const isSelected = selectedIds.has(entry.id);

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  layout
                >
                  <Card
                    className={`group relative overflow-hidden border-l-4 ${ts.border} transition-all duration-200 ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:shadow-md"}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox or icon */}
                        {bulkMode ? (
                          <div className="pt-0.5 flex-shrink-0">
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(entry.id)} />
                          </div>
                        ) : (
                          <div className={`p-2 rounded-lg ${ts.bg} flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                            <TypeIcon className={`h-4 w-4 ${ts.iconColor}`} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !bulkMode && openEditDialog(entry)}>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-mono text-sm font-semibold truncate">{entry.key}</p>
                            <Badge className={`${ts.text} text-[10px] px-1.5 py-0 flex-shrink-0`}>{ts.label}</Badge>
                          </div>
                          <p className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                            {entry.value.length > 200 ? entry.value.slice(0, 200) + "..." : entry.value}
                          </p>
                        </div>

                        {!bulkMode && (
                          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(entry)}>
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => handleDelete(entry.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <Separator className="opacity-50" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {parsedTags.slice(0, 3).map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              <Tag className="h-2.5 w-2.5" />{tag}
                            </span>
                          ))}
                          {parsedTags.length > 3 && (
                            <span className="text-[11px] text-muted-foreground">+{parsedTags.length - 3}</span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 flex-shrink-0 ml-2">
                          <Clock className="h-3 w-3" />{formatDate(entry.updatedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Memory Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input value={editForm.key} onChange={(e) => setEditForm({ ...editForm, key: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short_term">Short-Term</SelectItem>
                  <SelectItem value="long_term">Long-Term</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Textarea value={editForm.value} onChange={(e) => setEditForm({ ...editForm, value: e.target.value })} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="research, context" />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleEdit} disabled={!editForm.key || !editForm.value}>Save Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}