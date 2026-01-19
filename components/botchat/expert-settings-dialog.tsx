"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  ChevronRight,
  Copy,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { z } from "zod";

type ExpertRow = {
  id: string;
  slug: string;
  name: string;
  agent_name: string;
  description: string | null;
  system_prompt: string;
  suggestion_question: string | null;
  sort_order: number;
  created_at: string;
};

type ExpertDraft = {
  id?: string;
  slug: string;
  name: string;
  agent_name: string;
  description: string;
  system_prompt: string;
  suggestion_question: string;
  sort_order: number;
};

const expertGenerationSchema = z.object({
  system_prompt: z.string().min(1),
  suggestion_question: z.string().min(1),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function defaultDraft(): ExpertDraft {
  return {
    slug: "",
    name: "",
    agent_name: "",
    description: "",
    system_prompt: "",
    suggestion_question: "",
    sort_order: 0,
  };
}

export type ExpertSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpertsUpdated?: (experts: ExpertRow[]) => void;
};

export function ExpertSettingsDialog({
  open,
  onOpenChange,
  onExpertsUpdated,
}: ExpertSettingsDialogProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExpertDraft>(() => defaultDraft());
  const [copied, setCopied] = useState<null | "system_prompt" | "suggestion_question">(null);
  const wasDirtyRef = useRef(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return experts;
    return experts.filter((expert) => {
      const haystack = [
        expert.name,
        expert.agent_name,
        expert.slug,
        expert.description ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [experts, query]);

  const selected = useMemo(
    () => experts.find((expert) => expert.id === selectedId) ?? null,
    [experts, selectedId]
  );

  const isDirty = useMemo(() => {
    if (!selected && !draft.id) {
      return (
        draft.slug.trim() !== "" ||
        draft.name.trim() !== "" ||
        draft.agent_name.trim() !== "" ||
        draft.description.trim() !== "" ||
        draft.system_prompt.trim() !== "" ||
        draft.suggestion_question.trim() !== "" ||
        draft.sort_order !== 0
      );
    }
    if (!selected) return true;
    return (
      draft.slug !== selected.slug ||
      draft.name !== selected.name ||
      draft.agent_name !== selected.agent_name ||
      draft.description !== (selected.description ?? "") ||
      draft.system_prompt !== selected.system_prompt ||
      draft.suggestion_question !== (selected.suggestion_question ?? "") ||
      draft.sort_order !== selected.sort_order
    );
  }, [draft, selected]);

  useEffect(() => {
    wasDirtyRef.current = isDirty;
  }, [isDirty]);

  const loadExperts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from("experts")
      .select(
        "id, slug, name, agent_name, description, system_prompt, suggestion_question, sort_order, created_at"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(200);

    if (loadError) {
      setIsLoading(false);
      setError(loadError.message);
      return;
    }

    const rows = (data ?? []) as unknown as ExpertRow[];
    setExperts(rows);
    onExpertsUpdated?.(rows);
    setIsLoading(false);
  }, [onExpertsUpdated, supabase]);

  useEffect(() => {
    if (!open) return;
    void loadExperts();
  }, [loadExperts, open]);

  useEffect(() => {
    if (!open) return;
    if (!selected) return;
    setDraft({
      id: selected.id,
      slug: selected.slug,
      name: selected.name,
      agent_name: selected.agent_name,
      description: selected.description ?? "",
      system_prompt: selected.system_prompt,
      suggestion_question: selected.suggestion_question ?? "",
      sort_order: selected.sort_order,
    });
  }, [open, selected]);

  const startNew = () => {
    if (wasDirtyRef.current) {
      const ok = window.confirm("Discard unsaved changes?");
      if (!ok) return;
    }
    setSelectedId(null);
    setDraft(defaultDraft());
    setError(null);
  };

  const selectExpert = (expertId: string) => {
    if (expertId === selectedId) return;
    if (wasDirtyRef.current) {
      const ok = window.confirm("Discard unsaved changes?");
      if (!ok) return;
    }
    setSelectedId(expertId);
    setError(null);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        slug: draft.slug.trim(),
        name: draft.name.trim(),
        agent_name: draft.agent_name.trim(),
        description: draft.description.trim() || null,
        system_prompt: draft.system_prompt.trim(),
        suggestion_question: draft.suggestion_question.trim() || null,
        sort_order: Number.isFinite(draft.sort_order) ? draft.sort_order : 0,
      };

      if (!payload.slug || !payload.name || !payload.agent_name || !payload.system_prompt) {
        setError("Slug / Name / Agent name / System prompt are required.");
        setIsSaving(false);
        return;
      }

      if (draft.id) {
        const { error: updateError } = await supabase
          .from("experts")
          .update(payload)
          .eq("id", draft.id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("experts")
          .insert(payload)
          .select("id")
          .single();
        if (insertError) throw insertError;
        if (data?.id) {
          setSelectedId(String(data.id));
        }
      }

      await loadExperts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save expert.");
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateSelected = async () => {
    if (!selected) return;
    if (wasDirtyRef.current) {
      const ok = window.confirm("Discard unsaved changes?");
      if (!ok) return;
    }

    const nextSlugBase = `${selected.slug}-copy`;
    const suffix = Math.random().toString(36).slice(2, 6);
    setSelectedId(null);
    setDraft({
      slug: `${nextSlugBase}-${suffix}`.slice(0, 48),
      name: `${selected.name} (Copy)`,
      agent_name: selected.agent_name,
      description: selected.description ?? "",
      system_prompt: selected.system_prompt,
      suggestion_question: selected.suggestion_question ?? "",
      sort_order: selected.sort_order + 1,
    });
  };

  const removeSelected = async () => {
    if (!selected) return;
    const ok = window.confirm(`Delete "${selected.name}"? This may fail if sessions reference it.`);
    if (!ok) return;

    setIsDeleting(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("experts").delete().eq("id", selected.id);
      if (deleteError) throw deleteError;
      setSelectedId(null);
      setDraft(defaultDraft());
      await loadExperts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete expert.");
    } finally {
      setIsDeleting(false);
    }
  };

  const generateWithAI = async () => {
    const name = draft.name.trim();
    if (!name) {
      setError("Name is required to generate content.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/experts/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          agent_name: draft.agent_name,
          description: draft.description,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const parsed = expertGenerationSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error("Invalid AI response.");
      }
      const data = parsed.data;

      setDraft((prev) => ({
        ...prev,
        system_prompt: data.system_prompt,
        suggestion_question: data.suggestion_question,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate with AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyText = async (key: "system_prompt" | "suggestion_question") => {
    const text = key === "system_prompt" ? draft.system_prompt : draft.suggestion_question;
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 900);
    } catch {
      // ignore
    }
  };

  const headerLabel = selected ? "Edit expert" : "New expert";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] sm:!max-w-[min(100vw-2rem,1400px)] max-h-[92vh] overflow-auto border-white/60 bg-[var(--panel-strong)]/90 p-0 shadow-[0_40px_120px_-70px_rgba(20,20,60,0.75)] backdrop-blur"
        showCloseButton
      >
        <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] xl:grid-cols-[420px_1fr]">
          <div className="border-b border-white/30 bg-white/70 p-4 md:border-b-0 md:border-r">
            <div className="flex items-start justify-between gap-3">
              <DialogHeader className="text-left">
                <DialogTitle className="font-[var(--font-display)] tracking-tight">
                  Expert Studio
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Manage expert personas and prompts.
                </DialogDescription>
              </DialogHeader>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-full"
                onClick={startNew}
                aria-label="New expert"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search experts…"
                className="bg-white"
              />
              <Badge variant="secondary" className="shrink-0 rounded-full text-[10px]">
                {experts.length}
              </Badge>
            </div>

            <Separator className="my-4 bg-black/10" />

            <ScrollArea className="h-[52vh] pr-2 md:h-[64vh]">
              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`expert-skeleton-${i}`}
                      className="h-12 rounded-xl border border-black/10 bg-white/60"
                    />
                  ))
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl border border-black/10 bg-white/60 p-3 text-xs text-muted-foreground">
                    No experts found.
                  </div>
                ) : (
                  filtered.map((expert) => {
                    const isActive = expert.id === selectedId;
                    return (
                      <button
                        key={expert.id}
                        type="button"
                        onClick={() => selectExpert(expert.id)}
                        className={cn(
                          "group w-full rounded-2xl border px-3 py-2 text-left transition",
                          isActive
                            ? "border-[var(--accent-line)]/30 bg-white shadow-[0_16px_40px_-28px_rgba(32,24,70,0.55)]"
                            : "border-black/10 bg-white/60 hover:bg-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">
                              {expert.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {expert.agent_name} · {expert.slug}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:opacity-90" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="p-5 pr-14 md:p-6 md:pr-16">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {headerLabel}
                </p>
                <p className="mt-1 text-sm text-foreground/70">
                  System prompt controls behavior. Suggestion question is the starter chip.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-black/10 bg-white/70"
                  disabled={isGenerating || isSaving}
                  onClick={generateWithAI}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate with AI
                </Button>
                <Button
                  type="button"
                  className="bg-black text-white hover:bg-black/90"
                  disabled={isSaving || isGenerating}
                  onClick={() => void save()}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              <Card className="rounded-3xl border-black/10 bg-white/70 p-4 shadow-none">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Name</p>
                    <Input
                      value={draft.name}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        setDraft((prev) => {
                          const next = { ...prev, name: nextName };
                          const nextSlug = slugify(nextName);
                          const shouldAutofill =
                            prev.slug.trim() === "" ||
                            prev.slug.trim() === slugify(prev.name);
                          return shouldAutofill ? { ...next, slug: nextSlug } : next;
                        });
                      }}
                      placeholder="e.g. Travel Concierge"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Agent name</p>
                    <Input
                      value={draft.agent_name}
                      onChange={(e) => setDraft((prev) => ({ ...prev, agent_name: e.target.value }))}
                      placeholder="e.g. Kate"
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Slug</p>
                    <Input
                      value={draft.slug}
                      onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="travel-concierge"
                      className="bg-white font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Sort order</p>
                    <Input
                      type="number"
                      value={draft.sort_order}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, sort_order: Number(e.target.value) }))
                      }
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Description</p>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="What does this expert do? What tone?"
                    className="min-h-[84px] bg-white text-sm"
                  />
                </div>
              </Card>

              <Card className="rounded-3xl border-black/10 bg-white/70 p-4 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">System prompt</p>
                    <p className="text-[11px] text-muted-foreground">
                      Keep it crisp—this is your “behavior contract”.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full"
                    onClick={() => void copyText("system_prompt")}
                    disabled={!draft.system_prompt.trim()}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copied === "system_prompt" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Textarea
                  value={draft.system_prompt}
                  onChange={(e) => setDraft((prev) => ({ ...prev, system_prompt: e.target.value }))}
                  placeholder="Write the system prompt…"
                  className="mt-3 min-h-[180px] bg-white text-sm leading-relaxed"
                />
              </Card>

              <Card className="rounded-3xl border-black/10 bg-white/70 p-4 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Suggestion question</p>
                    <p className="text-[11px] text-muted-foreground">One starter question.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full"
                    onClick={() => void copyText("suggestion_question")}
                    disabled={!draft.suggestion_question.trim()}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copied === "suggestion_question" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Textarea
                  value={draft.suggestion_question}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, suggestion_question: e.target.value }))
                  }
                  placeholder="e.g. Can you help me plan a trip…"
                  className="mt-3 min-h-[84px] bg-white text-sm"
                />
              </Card>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-black/10 bg-white/70"
                    disabled={!selected || isSaving || isGenerating}
                    onClick={() => void duplicateSelected()}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-black/10 bg-white/70"
                    disabled={isDeleting || isSaving || isGenerating || !selected}
                    onClick={() => void removeSelected()}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {isDirty ? (
                    <Badge variant="secondary" className="rounded-full text-[10px]">
                      Unsaved changes
                    </Badge>
                  ) : (
                    <span>Up to date</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
