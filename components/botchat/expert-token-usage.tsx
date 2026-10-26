"use client";

import { useEffect, useMemo, useState } from "react";
import { summarizeExpertTokenUsage, type ExpertTokenTotal } from "@/lib/botchat/expert-token-usage";

const colors = ["#6558d3", "#46a59a", "#e5a64b", "#d87593", "#9581cb", "#659dc0", "#94ac62", "#d98260"];

export function ExpertTokenUsage({ open, experts }: { open: boolean; experts: { id: string; name: string }[] }) {
  const [usage, setUsage] = useState<ExpertTokenTotal[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void fetch("/api/experts/token-usage", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load token usage");
        return response.json() as Promise<{ usage: ExpertTokenTotal[] }>;
      })
      .then((data) => { setUsage(data.usage); setError(false); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setUsage(null);
          setError(true);
        }
      });
    return () => controller.abort();
  }, [open]);

  const summary = useMemo(() => summarizeExpertTokenUsage(experts, usage ?? []), [experts, usage]);
  const gradient = summary.experts.reduce<{ position: number; stops: string[] }>(
    (result, expert, index) => {
      const end = result.position + expert.share * 100;
      result.stops.push(`${colors[index % colors.length]} ${result.position}% ${end}%`);
      return { position: end, stops: result.stops };
    },
    { position: 0, stops: [] }
  ).stops.join(", ");

  return (
    <section className="mt-4 rounded-2xl border border-indigo-950/10 bg-gradient-to-br from-white via-white to-indigo-50/60 p-4 shadow-[0_8px_24px_-20px_rgba(67,56,160,0.4)]" aria-label="Expert token usage">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-foreground">Token usage</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">By expert</p>
        </div>
        {usage && !error && summary.total > 0 ? (
          <span className="rounded-full bg-indigo-100/70 px-2 py-1 text-[10px] font-medium text-indigo-700">
            {summary.experts.length} {summary.experts.length === 1 ? "expert" : "experts"}
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-xs text-muted-foreground">Unable to load token usage.</p> : !usage ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading token usage…</p>
      ) : summary.total === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No token usage recorded yet.</p>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          <span className="sr-only">{summary.total.toLocaleString()} total tokens</span>
          <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full shadow-[0_4px_12px_-6px_rgba(50,40,120,0.35)]" style={{ background: `conic-gradient(${gradient})` }} aria-hidden="true">
            <div className="flex h-[70px] w-[70px] flex-col items-center justify-center rounded-full bg-white text-center">
              <span className="max-w-[62px] truncate text-xs font-semibold tabular-nums text-foreground">{Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(summary.total)}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">tokens</span>
            </div>
          </div>
          <ul className="max-h-32 min-w-0 flex-1 space-y-2.5 overflow-y-auto pr-1 text-xs">
            {summary.experts.map((expert, index) => (
              <li key={expert.id} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate font-medium" title={expert.name}>{expert.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{(expert.share * 100).toFixed(1)}%</span>
                  </div>
                  <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{expert.tokens.toLocaleString()} tokens</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 border-t border-indigo-950/5 pt-2 text-[10px] leading-relaxed text-muted-foreground">Chat model usage; excludes titles and summaries.</p>
    </section>
  );
}
