import { History } from "lucide-react";
import type { GateEvaluationResult } from "@/types";

interface RecentRunsProps {
  runs: GateEvaluationResult[];
  onSelectRun?: (run: GateEvaluationResult) => void;
  activeRunProposalId?: string;
}

export function RecentRuns({
  runs,
  onSelectRun,
  activeRunProposalId,
}: RecentRunsProps) {
  if (!runs || runs.length === 0) return null;

  return (
    <div className="rounded border bg-card/30 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-muted-foreground">
        <History className="size-3.5" />
        <span>Recent evaluations</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {runs.map((run, i) => {
          const pId = run.proposal.id.toUpperCase();
          const verdict = run.decision.verdict;
          const isActive = run.proposal.id === activeRunProposalId;

          const badgeColor = {
            apply: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800",
            review: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800",
            stop: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800",
          }[verdict] ?? "text-muted-foreground bg-muted border-border";

          const verdictLabel = {
            apply: "Applied",
            review: "Review",
            stop: "Stopped",
          }[verdict] ?? verdict;

          return (
            <button
              key={`${run.proposal.id}-${i}`}
              type="button"
              onClick={() => onSelectRun?.(run)}
              className={`flex items-center gap-2 rounded border px-2.5 py-1 font-mono text-xs transition-colors ${
                isActive
                  ? "border-primary bg-accent/60 text-foreground font-medium"
                  : "border-border/70 bg-card hover:bg-muted hover:text-foreground text-muted-foreground"
              }`}
            >
              <span className="font-semibold">{pId}</span>
              <span className={`rounded border px-1.5 py-0 text-[10px] uppercase font-semibold ${badgeColor}`}>
                {verdictLabel}
              </span>
              <span className="text-[10px] opacity-60">
                {run.decision.latency_ms.toFixed(0)}ms
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
