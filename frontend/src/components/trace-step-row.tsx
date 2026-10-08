import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { NodeBadge } from "./node-badge";
import type { TraceStep } from "@/types";

interface TraceStepRowProps {
  step: TraceStep;
  defaultExpanded?: boolean;
}

export function TraceStepRow({ step, defaultExpanded = false }: TraceStepRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const formattedStepNumber = String(step.step_number).padStart(2, "0");

  const statusBorder = {
    passed: "border-border/60 hover:border-border",
    completed: "border-emerald-300/40 dark:border-emerald-900/40",
    warning: "border-amber-300/60 dark:border-amber-900/60 bg-amber-500/5",
    failed: "border-rose-300/60 dark:border-rose-900/60 bg-rose-500/5",
  }[step.status] ?? "border-border";

  return (
    <div className={`rounded border ${statusBorder} transition-colors overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 p-2.5 text-left bg-card/40 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="font-mono text-xs font-semibold text-muted-foreground select-none w-5 text-right">
            {formattedStepNumber}
          </span>
          <NodeBadge node={step.node} />
          <span className="text-xs text-foreground font-medium truncate">
            {step.summary}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Clock className="size-3 opacity-60" />
            {step.duration_ms.toFixed(1)} ms
          </span>
          {expanded ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 bg-background/60 p-3 space-y-2.5 text-xs font-mono">
          {/* Node Technical Detail */}
          {step.detail && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                Execution Detail
              </span>
              <div className="rounded bg-muted/40 p-2 text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {step.detail}
              </div>
            </div>
          )}

          {/* Evaluate node decision metadata */}
          {step.decision && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                Gate Decision Metadata
              </span>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded bg-muted/30 p-2 space-y-0.5">
                  <span className="text-muted-foreground block text-[10px]">VERDICT</span>
                  <span className="font-semibold uppercase text-foreground">
                    {step.decision.verdict}
                  </span>
                </div>
                <div className="rounded bg-muted/30 p-2 space-y-0.5">
                  <span className="text-muted-foreground block text-[10px]">DECISION LATENCY</span>
                  <span className="text-foreground">
                    {step.decision.latency_ms.toFixed(2)} ms
                  </span>
                </div>
              </div>

              {/* Confidence and option probabilities (kept in expanded details only) */}
              <div className="rounded bg-muted/30 p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Gate model confidence:</span>
                  <span className="text-foreground">
                    {(step.decision.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                {step.decision.probabilities && Object.keys(step.decision.probabilities).length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground block">
                      Branch probability distribution:
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {Object.entries(step.decision.probabilities).map(([opt, prob]) => (
                        <div
                          key={opt}
                          className="rounded bg-background/80 px-1.5 py-0.5 text-center text-[10px]"
                        >
                          <span className="text-muted-foreground">{opt}: </span>
                          <span className="text-foreground font-medium">
                            {(prob * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {step.decision.required_reviewers && step.decision.required_reviewers.length > 0 && (
                <div className="text-[11px]">
                  <span className="text-muted-foreground">Required reviewers: </span>
                  <span className="text-foreground">
                    {step.decision.required_reviewers.join(", ")}
                  </span>
                </div>
              )}

              {step.decision.policy_violations && step.decision.policy_violations.length > 0 && (
                <div className="text-[11px] text-rose-700 dark:text-rose-400">
                  <span className="font-semibold">Violations: </span>
                  {step.decision.policy_violations.join("; ")}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
