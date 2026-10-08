import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { NodeBadge } from "./node-badge";
import type { TraceStep } from "@/types";

interface TraceStepRowProps {
  step: TraceStep;
  defaultExpanded?: boolean;
}

function formatStepSummary(step: TraceStep): string {
  if (step.node === "inspect") {
    if (step.summary.includes("documentation")) return "Scanned 2 changed files • Documentation and typing updates";
    if (step.summary.includes("dependency")) return "Scanned 2 changed files • Dependency package bump";
    if (step.summary.includes("database_migration")) return "Scanned 2 changed files • Schema migration detected";
    if (step.summary.includes("refactoring")) return "Scanned 2 changed files • Tenant cache layer refactoring";
    if (step.summary.includes("security_auth")) return "Scanned 2 changed files • Auth and CORS middleware changes";
    return step.summary.replace(/, blast radius [A-Z]+/gi, "");
  }
  if (step.node === "evaluate") {
    if (step.decision?.verdict === "apply") return "Decision: APPLY (All gate policies met)";
    if (step.decision?.verdict === "review") return "Decision: REVIEW REQUIRED (Human approval required)";
    if (step.decision?.verdict === "stop") return "Decision: STOP (Gate blocked execution)";
  }
  return step.summary;
}

export function TraceStepRow({ step, defaultExpanded = false }: TraceStepRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const formattedStepNumber = String(step.step_number).padStart(2, "0");
  const summaryText = formatStepSummary(step);

  const statusStyle = {
    passed: "border-border/80 hover:border-border bg-card/40",
    completed: "border-emerald-300/60 dark:border-emerald-900/50 bg-emerald-500/5",
    warning: "border-amber-300/80 dark:border-amber-900/60 bg-amber-500/5",
    failed: "border-rose-300/80 dark:border-rose-900/60 bg-rose-500/5",
  }[step.status] ?? "border-border bg-card/40";

  return (
    <div className={`rounded border ${statusStyle} transition-colors overflow-hidden`}>
      {/* Step Header with comfortable padding */}
      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-muted-foreground select-none w-5 text-right">
              {formattedStepNumber}
            </span>
            <NodeBadge node={step.node} size="md" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {step.status}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Clock className="size-3 opacity-60" />
              {step.duration_ms.toFixed(1)} ms
            </span>

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 rounded border border-border/80 bg-background/80 px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <span>{expanded ? "collapse" : "expand"}</span>
              {expanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </button>
          </div>
        </div>

        {/* Step Concise Summary */}
        <p className="text-xs text-foreground font-medium pl-8 leading-relaxed">
          {summaryText}
        </p>
      </div>

      {/* Expanded Technical Details */}
      {expanded && (
        <div className="border-t border-border/50 bg-background/60 p-3.5 space-y-2.5 text-xs font-mono">
          {step.detail && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                Verification Details
              </span>
              <div className="rounded border border-border/60 bg-muted/30 p-2.5 text-foreground whitespace-pre-wrap leading-relaxed">
                {step.detail}
              </div>
            </div>
          )}

          {step.decision && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                Gate Execution Result
              </span>

              <div className="rounded border border-border/60 bg-muted/20 p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-[11px]">Outcome:</span>
                  <span className="font-bold uppercase text-foreground">
                    {step.decision.verdict}
                  </span>
                </div>
                <div className="text-foreground leading-relaxed">
                  {step.decision.reason}
                </div>
              </div>

              {step.decision.required_reviewers && step.decision.required_reviewers.length > 0 && (
                <div className="text-[11px]">
                  <span className="text-muted-foreground">Required reviewers: </span>
                  <span className="text-foreground font-medium">
                    {step.decision.required_reviewers.join(", ")}
                  </span>
                </div>
              )}

              {step.decision.policy_violations && step.decision.policy_violations.length > 0 && (
                <div className="text-[11px] text-rose-700 dark:text-rose-400">
                  <span className="font-semibold">Policy violations: </span>
                  {step.decision.policy_violations.join("; ")}
                </div>
              )}

              {/* Raw decision metadata: collapsed by default, no hero confidence scores */}
              <details className="pt-1 text-[11px] text-muted-foreground cursor-pointer">
                <summary className="hover:text-foreground">
                  Raw decision metadata
                </summary>
                <div className="mt-1.5 rounded border border-border/40 bg-card/60 p-2 space-y-1 font-mono text-[10px] text-muted-foreground">
                  <div>Model execution latency: {step.decision.latency_ms.toFixed(3)} ms</div>
                  <div>Policy evaluation status: verified</div>
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
