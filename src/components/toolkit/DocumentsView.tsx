"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useToolkitStore } from "@/hooks/use-toolkit-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileUp, Plus, Trash2, Search, Play, Clock, Tag, FileText,
  Loader2, CheckCircle2, XCircle, AlertCircle, Eye, Edit3,
  Inbox, HardDrive, Globe, Database, ChevronDown, Upload,
  FileType2, Hash, Layers,
} from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  name: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  content: string;
  metadata: string;
  tags: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Loader2; color: string; bg: string; badge: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300" },
  processing: { label: "Processing", icon: Loader2, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300" },
  failed: { label: "Failed", icon: XCircle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300" },
};

const SOURCE_CONFIG: Record<string, { icon: typeof Upload; label: string }> = {
  upload: { icon: Upload, label: "File Upload" },
  url: { icon: Globe, label: "URL Import" },
  api: { icon: Database, label: "API Ingestion" },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getMimeLabel(mime: string): string {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("doc")) return "DOCX";
  if (mime.includes("text")) return "TXT";
  if (mime.includes("csv")) return "CSV";
  if (mime.includes("json")) return "JSON";
  if (mime.includes("markdown")) return "MD";
  return mime.split("/")[1]?.toUpperCase() || "FILE";
}

export function DocumentsView() {
  const { refreshing } = useToolkitStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");

  const fetchDocuments = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted) return;
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/documents?${params}`, { signal });
    const data = await res.json();
    if (!signal?.aborted) {
      setDocuments(Array.isArray(data) ? data : []);
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void fetchDocuments(controller.signal);
    return () => controller.abort();
  }, [fetchDocuments, refreshing]);

  const stats = {
    total: documents.length,
    completed: documents.filter((d) => d.status === "completed").length,
    pending: documents.filter((d) => d.status === "pending").length,
    processing: documents.filter((d) => d.status === "processing").length,
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && !uploadName) return;

    const tags = uploadTags.split(",").map((t) => t.trim()).filter(Boolean);

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: uploadName || "Untitled Document",
        description: uploadDescription,
        fileName: selectedFile?.name || "manual-entry.txt",
        fileSize: selectedFile?.size || 0,
        mimeType: selectedFile?.type || "text/plain",
        source: selectedFile ? "upload" : "api",
        tags,
      }),
    });
    const doc = await res.json();
    toast.success(`"${doc.name}" uploaded`);
    setUploadOpen(false);
    setSelectedFile(null);
    setUploadName("");
    setUploadDescription("");
    setUploadTags("");
    fetchDocuments();
  };

  const handleProcess = async (id: string) => {
    setProcessing(id);
    try {
      await fetch(`/api/documents/${id}/process`, { method: "POST" });
      toast.success("Document processed successfully");
      fetchDocuments();
      // If viewing this doc, refresh the view
      if (viewDoc?.id === id) {
        const res = await fetch(`/api/documents/${id}`);
        setViewDoc(await res.json());
      }
    } catch {
      toast.error("Processing failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    toast.success("Document deleted");
    if (viewDoc?.id === id) setViewOpen(false);
    fetchDocuments();
  };

  const openView = (doc: Document) => {
    setViewDoc(doc);
    setViewOpen(true);
  };

  const getMeta = (metaStr: string): Record<string, number> => {
    try { return JSON.parse(metaStr); } catch { return {}; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground mt-1">Upload, process, and manage your research documents.</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Upload Document</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,.csv,.json,.md"
                  onChange={handleFileSelect}
                />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {selectedFile ? selectedFile.name : "Click to select a file"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, TXT, CSV, JSON, MD supported
                </p>
              </div>
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Research Paper on AI Agents" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} placeholder="Brief description..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} placeholder="research, NLP, survey" />
              </div>
              <Button onClick={handleUpload} className="w-full" disabled={!uploadName}>
                Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Documents", value: stats.total, icon: FileText, color: "" },
            { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
            { label: "Processing", value: stats.processing, icon: Loader2, color: "text-blue-500" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted/60">
                      <Icon className={`h-5 w-5 ${s.color || "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="pl-9" />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "processing", "completed"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize text-xs"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
        </div>
      ) : documents.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="flex flex-col items-center justify-center h-64 border-dashed">
            <div className="p-4 rounded-2xl bg-muted/60 mb-4">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No documents found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter"
                : "Upload your first document to start the ingestion pipeline"}
            </p>
            {!search && statusFilter === "all" && (
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setUploadOpen(true)}>
                <Plus className="h-4 w-4" />Upload Document
              </Button>
            )}
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {documents.map((doc, idx) => {
              const sc = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
              const src = SOURCE_CONFIG[doc.source] || SOURCE_CONFIG.upload;
              const SourceIcon = src.icon;
              const StatusIcon = sc.icon;
              const meta = getMeta(doc.metadata);
              let parsedTags: string[] = [];
              try { parsedTags = JSON.parse(doc.tags); } catch { parsedTags = []; }

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  layout
                >
                  <Card className="group relative overflow-hidden border-l-4 hover:shadow-md transition-all duration-200"
                    style={{ borderLeftColor: doc.status === "completed" ? "var(--emerald-500, #10b981)" : doc.status === "processing" ? "var(--blue-500, #3b82f6)" : doc.status === "failed" ? "var(--rose-500, #f43f5e)" : "var(--amber-500, #f59e0b)" }}>
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${sc.bg} flex-shrink-0`}>
                          <StatusIcon className={`h-4 w-4 ${sc.color} ${doc.status === "processing" ? "animate-spin" : ""}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm truncate">{doc.name}</p>
                            <Badge className={`${sc.badge} text-[10px] px-1.5 py-0 flex-shrink-0`}>{sc.label}</Badge>
                          </div>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {doc.status === "pending" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleProcess(doc.id)} disabled={processing === doc.id}>
                                  {processing === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{processing === doc.id ? "Processing..." : "Process"}</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(doc)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <Separator className="opacity-50" />

                      {/* Metadata row */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileType2 className="h-3 w-3" />
                          {getMimeLabel(doc.mimeType)}
                        </span>
                        {doc.fileSize > 0 && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatBytes(doc.fileSize)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <SourceIcon className="h-3 w-3" />
                          {src.label}
                        </span>
                        {meta.wordCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {meta.wordCount.toLocaleString()} words
                          </span>
                        )}
                      </div>

                      {/* Tags and date */}
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
                          <Clock className="h-3 w-3" />{formatDate(doc.updatedAt)}
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

      {/* View Document Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          {viewDoc && (() => {
            const meta = getMeta(viewDoc.metadata);
            const sc = STATUS_CONFIG[viewDoc.status] || STATUS_CONFIG.pending;
            let parsedTags: string[] = [];
            try { parsedTags = JSON.parse(viewDoc.tags); } catch { parsedTags = []; }

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {viewDoc.name}
                    <Badge className={`${sc.badge} text-xs`}>{sc.label}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
                  {viewDoc.description && (
                    <p className="text-sm text-muted-foreground">{viewDoc.description}</p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Format", value: getMimeLabel(viewDoc.mimeType), icon: FileType2 },
                      { label: "Size", value: formatBytes(viewDoc.fileSize), icon: HardDrive },
                      ...(meta.wordCount ? [{ label: "Words", value: meta.wordCount.toLocaleString(), icon: Hash }] : []),
                      ...(meta.pageCount ? [{ label: "Pages", value: String(meta.pageCount), icon: Layers }] : []),
                      ...(meta.sections ? [{ label: "Sections", value: String(meta.sections), icon: FileText }] : []),
                      ...(meta.entities ? [{ label: "Entities", value: String(meta.entities), icon: Search }] : []),
                    ].map((m) => {
                      const Icon = m.icon;
                      return (
                        <div key={m.label} className="rounded-lg bg-muted/40 p-3 text-center">
                          <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-sm font-bold">{m.value}</p>
                          <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {parsedTags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {parsedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {viewDoc.content && (
                    <div>
                      <p className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wider">Extracted Content</p>
                      <pre className="text-sm bg-muted/40 rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                        {viewDoc.content}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Created: {formatDate(viewDoc.createdAt)}</span>
                    <span>·</span>
                    <span>Updated: {formatDate(viewDoc.updatedAt)}</span>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  {viewDoc.status === "pending" && (
                    <Button onClick={() => handleProcess(viewDoc.id)} disabled={processing === viewDoc.id}>
                      {processing === viewDoc.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      {processing === viewDoc.id ? "Processing..." : "Process Document"}
                    </Button>
                  )}
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}