"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type RefCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  getExpertListIntroTimeoutMs,
  formatExpertSaveError,
  getExpertRowIntroStyle,
  getDuplicateExpertNameError,
  resolveSelectedExpertId,
} from "@/lib/botchat/expert-settings";
import {
  getExpertDragOverlayStyle,
  getExpertListDropResult,
} from "@/lib/botchat/expert-list-sortable";
import type { ExpertRow } from "@/lib/botchat/types";
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
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { z } from "zod";

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

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return items;
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

function normalizeExpertOrder(rows: ExpertRow[]) {
  return rows.map((row, index) => ({ ...row, sort_order: index }));
}

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

function ExpertListRowContent({
  expert,
  isActive,
  canReorder,
  isAnimatingListIntro,
  index,
  onSelect,
  dragHandleProps,
  isDragging = false,
  isOverlay = false,
}: {
  expert: ExpertRow;
  isActive: boolean;
  canReorder: boolean;
  isAnimatingListIntro: boolean;
  index: number;
  onSelect: (expertId: string) => void;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement> & {
    ref?: RefCallback<HTMLButtonElement>;
  };
  isDragging?: boolean;
  isOverlay?: boolean;
}) {
  const introStyle = getExpertRowIntroStyle(index, isAnimatingListIntro && !isOverlay);

  return (
    <div
      data-expert-row
      data-expert-id={expert.id}
      data-selected={isActive ? "true" : "false"}
      style={isOverlay ? undefined : introStyle}
      className={cn(
        "group flex w-full items-stretch gap-1 rounded-2xl border p-1 transition",
        isAnimatingListIntro &&
          !isOverlay &&
          "motion-safe:animate-expert-list-intro motion-reduce:animate-none",
        isActive
          ? "border-[var(--accent-line)]/55 bg-[color-mix(in_oklab,var(--accent-line)_9%,white)] shadow-[0_18px_44px_-28px_rgba(32,24,70,0.55)] ring-1 ring-[var(--accent-line)]/25"
          : "border-black/10 bg-white/60 hover:bg-white",
        isDragging && !isOverlay && "opacity-35",
        isOverlay && "bg-white shadow-[0_30px_80px_-40px_rgba(20,20,60,0.6)]"
      )}
      >
      <button
        type="button"
        aria-label={
          canReorder
            ? "Drag to reorder"
            : "Reordering disabled"
        }
        title={
          canReorder
            ? "Drag to reorder"
            : "Reordering disabled"
        }
        disabled={!canReorder}
        {...dragHandleProps}
        className={cn(
          "grid h-10 w-9 touch-none place-items-center rounded-xl border border-transparent text-muted-foreground transition",
          canReorder
            ? "cursor-grab hover:bg-black/5 hover:text-foreground active:cursor-grabbing"
            : "cursor-not-allowed opacity-40",
          isOverlay && "cursor-grabbing"
        )}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onSelect(expert.id)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1 text-left transition",
          isActive && "text-foreground"
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{expert.name}</p>
          <p
            className={cn(
              "truncate text-[11px] text-muted-foreground",
              isActive && "text-foreground/70"
            )}
          >
            {expert.agent_name} · {expert.slug ?? ""}
          </p>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 opacity-60 transition group-hover:opacity-90",
            isActive && "translate-x-0.5 opacity-100 text-[var(--accent-line)]"
          )}
        />
      </button>
    </div>
  );
}

function SortableExpertListRow(props: Omit<Parameters<typeof ExpertListRowContent>[0], "dragHandleProps" | "isDragging" | "isOverlay">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.expert.id,
    disabled: !props.canReorder,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <ExpertListRowContent
        {...props}
        isDragging={isDragging}
        dragHandleProps={{
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
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
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExpertDraft>(() => defaultDraft());
  const [copied, setCopied] = useState<null | "system_prompt" | "suggestion_question">(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragWidth, setActiveDragWidth] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isAnimatingListIntro, setIsAnimatingListIntro] = useState(false);
  const wasDirtyRef = useRef(false);
  const lastSyncedSelectedIdRef = useRef<string | null>(null);
  const expertsRef = useRef<ExpertRow[]>([]);
  const preserveEmptySelectionRef = useRef(false);
  const introAnimationTimeoutRef = useRef<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  useEffect(() => {
    expertsRef.current = experts;
  }, [experts]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateExperts = useCallback(
    (value: ExpertRow[] | ((prev: ExpertRow[]) => ExpertRow[])) => {
      setExperts((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        expertsRef.current = next;
        return next;
      });
    },
    []
  );

  const stopListIntroAnimation = useCallback(() => {
    if (introAnimationTimeoutRef.current !== null) {
      window.clearTimeout(introAnimationTimeoutRef.current);
      introAnimationTimeoutRef.current = null;
    }
    setIsAnimatingListIntro(false);
  }, []);

  const loadExperts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await fetch("/api/experts");

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setIsLoading(false);
      setError(body?.error || "Failed to load experts.");
      return;
    }

    const payload = (await response.json()) as { experts?: ExpertRow[] };
    const rows = Array.isArray(payload.experts) ? payload.experts : [];
    updateExperts(rows);
    setSelectedId((current) =>
      resolveSelectedExpertId(rows, current, {
        preserveEmptySelection: preserveEmptySelectionRef.current,
      })
    );
    stopListIntroAnimation();
    if (rows.length > 0) {
      setIsAnimatingListIntro(true);
      introAnimationTimeoutRef.current = window.setTimeout(() => {
        setIsAnimatingListIntro(false);
        introAnimationTimeoutRef.current = null;
      }, getExpertListIntroTimeoutMs(rows.length));
    }
    onExpertsUpdated?.(rows);
    setIsLoading(false);
  }, [onExpertsUpdated, stopListIntroAnimation, updateExperts]);

  const persistExpertOrder = useCallback(
    async (nextExperts: ExpertRow[]) => {
      setIsReordering(true);
      setError(null);

      try {
        const response = await fetch("/api/experts/reorder", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: nextExperts.map((expert) => ({
              id: expert.id,
              sort_order: expert.sort_order,
            })),
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setError(body?.error || "Failed to reorder experts.");
          return false;
        }

        const payload = (await response.json()) as { experts?: ExpertRow[] };
        const rows = Array.isArray(payload.experts) ? payload.experts : nextExperts;
        updateExperts(rows);
        onExpertsUpdated?.(rows);
        return true;
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to reorder experts.");
        return false;
      } finally {
        setIsReordering(false);
      }
    },
    [onExpertsUpdated, updateExperts]
  );

  useEffect(() => {
    if (!open) return;
    void loadExperts();
  }, [loadExperts, open]);

  useEffect(() => {
    if (open) return;
    preserveEmptySelectionRef.current = false;
    lastSyncedSelectedIdRef.current = null;
    stopListIntroAnimation();
  }, [open, stopListIntroAnimation]);

  useEffect(() => stopListIntroAnimation, [stopListIntroAnimation]);

  useEffect(() => {
    if (!open) return;
    if (!selected) return;
    const sameSelection = lastSyncedSelectedIdRef.current === selected.id;
    if (sameSelection && wasDirtyRef.current) return;
    lastSyncedSelectedIdRef.current = selected.id;
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
    preserveEmptySelectionRef.current = true;
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
    preserveEmptySelectionRef.current = false;
    setSelectedId(expertId);
    setError(null);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const computedSlug = (draft.slug.trim() || slugify(draft.name)).slice(0, 48);
      const nextSortOrder = (() => {
        if (draft.id) {
          return Number.isFinite(draft.sort_order) ? draft.sort_order : 0;
        }
        const maxExisting = experts.reduce((acc, expert) => {
          const value = Number.isFinite(expert.sort_order) ? expert.sort_order : 0;
          return Math.max(acc, value);
        }, -1);
        return maxExisting + 1;
      })();

      const payload = {
        slug: computedSlug,
        name: draft.name.trim(),
        agent_name: draft.agent_name.trim(),
        description: draft.description.trim() || null,
        system_prompt: draft.system_prompt.trim(),
        suggestion_question: draft.suggestion_question.trim() || null,
        sort_order: nextSortOrder,
      };

      if (!payload.name || !payload.agent_name || !payload.system_prompt) {
        setError("Name / Agent name / System prompt are required.");
        setIsSaving(false);
        return;
      }

      const duplicateNameError = getDuplicateExpertNameError(experts, {
        id: draft.id,
        name: payload.name,
      });
      if (duplicateNameError) {
        setError(duplicateNameError);
        setIsSaving(false);
        return;
      }

      setDraft((prev) => ({ ...prev, slug: payload.slug, sort_order: payload.sort_order }));

      const response = await fetch("/api/experts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          ...payload,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to save expert.");
      }

      const result = (await response.json()) as { experts?: ExpertRow[] };
      const nextExperts = Array.isArray(result.experts) ? result.experts : [];
      updateExperts(nextExperts);
      onExpertsUpdated?.(nextExperts);

      const refreshedSelection =
        draft.id ??
        nextExperts.find((expert) => expert.slug === payload.slug)?.id ??
        null;
      if (refreshedSelection) {
        preserveEmptySelectionRef.current = false;
        setSelectedId(refreshedSelection);
      }
    } catch (e) {
      setError(
        formatExpertSaveError(e instanceof Error ? e.message : null, experts, {
          id: draft.id,
          name: draft.name,
        })
      );
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
    preserveEmptySelectionRef.current = true;
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
      const response = await fetch("/api/experts/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || (await response.text()));
      }
      const result = (await response.json()) as { experts?: ExpertRow[] };
      const nextExperts = Array.isArray(result.experts) ? result.experts : [];
      updateExperts(nextExperts);
      onExpertsUpdated?.(nextExperts);
      preserveEmptySelectionRef.current = true;
      setSelectedId(null);
      setDraft(defaultDraft());
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
  const canReorder =
    query.trim() === "" &&
    !isLoading &&
    !isSaving &&
    !isDeleting &&
    !isGenerating &&
    !isReordering;
  const activeDragExpert = activeDragId
    ? experts.find((expert) => expert.id === activeDragId) ?? null
    : null;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveDragId(String(active.id));
    setActiveDragWidth(active.rect.current.initial?.width ?? null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    setActiveDragWidth(null);

    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;
    const dropResult = getExpertListDropResult({
      experts: expertsRef.current,
      activeId,
      overId,
      selectedExpertId: draft.id && selectedId === draft.id ? draft.id : selectedId,
    });

    if (!dropResult) return;

    const previousExperts = expertsRef.current;
    updateExperts(dropResult.experts);

    if (dropResult.selectedExpertSortOrder !== null && draft.id && selectedId === draft.id) {
      setDraft((prev) => ({
        ...prev,
        sort_order: dropResult.selectedExpertSortOrder ?? prev.sort_order,
      }));
    }

    const didPersist = await persistExpertOrder(dropResult.experts);
    if (!didPersist) {
      updateExperts(previousExperts);
      if (draft.id && selectedId === draft.id) {
        const previousSelected = previousExperts.find((expert) => expert.id === draft.id) ?? null;
        if (previousSelected) {
          setDraft((prev) => ({ ...prev, sort_order: previousSelected.sort_order }));
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setActiveDragWidth(null);
  };

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
               {isReordering ? (
                 <Loader2
                   className="h-4 w-4 animate-spin text-muted-foreground"
                   aria-label="Saving order"
                 />
               ) : null}
             </div>

            <Separator className="my-4 bg-black/10" />

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={(event) => void handleDragEnd(event)}
              onDragCancel={handleDragCancel}
            >
              <ScrollArea className="h-[52vh] pr-2 md:h-[64vh]">
                <div className="space-y-2">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
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
                    <SortableContext
                      items={filtered.map((expert) => expert.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filtered.map((expert, index) => (
                        <SortableExpertListRow
                          key={expert.id}
                          expert={expert}
                          isActive={expert.id === selectedId}
                          canReorder={canReorder}
                          isAnimatingListIntro={isAnimatingListIntro}
                          index={index}
                          onSelect={selectExpert}
                        />
                      ))}
                    </SortableContext>
                  )}
                </div>
              </ScrollArea>

              {isClient
                ? createPortal(
                    <DragOverlay>
                      {activeDragExpert ? (
                        <div style={getExpertDragOverlayStyle(activeDragWidth)}>
                          <ExpertListRowContent
                            expert={activeDragExpert}
                            isActive={activeDragExpert.id === selectedId}
                            canReorder
                            isAnimatingListIntro={false}
                            index={0}
                            onSelect={selectExpert}
                            isOverlay
                          />
                        </div>
                      ) : null}
                    </DragOverlay>,
                    document.body
                  )
                : null}
            </DndContext>
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
                          if (!prev.id) return { ...next, slug: nextSlug };
                          return next;
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
