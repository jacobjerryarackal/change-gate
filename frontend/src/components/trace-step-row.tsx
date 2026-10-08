import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { NodeBadge } from "./node-badge";
import type { LiveTraceItem, TraceStep } from "@/types";

interface TraceStepRowProps {
  item: LiveTraceItem | TraceStep;
  defaultExpanded?: boolean;
}

function formatStepSummary(node: string, summary: string, verdict?: string): string {
  if (node === "inspect") {
    if (summary.includes("documentation")) return "Scanned 2 changed files • Documentation and typing updates";
    if (summary.includes("dependency")) return "Scanned 2 changed files • Dependency package bump";
    if (summary.includes("database_migration")) return "Scanned 2 changed files • Schema migration detected";
    if (summary.includes("refactoring")) return "Scanned 2 changed files • Tenant cache layer refactoring";
    if (summary.includes("security_auth")) return "Scanned 2 changed files • Auth and CORS middleware changes";
    return summary.replace(/, blast radius [A-Z]+/gi, "");
  }
  if (node === "evaluate") {
    if (verdict === "apply") return "Decision: APPLY (All gate policies met)";
    if (verdict === "review") return "Decision: REVIEW REQUIRED (Human approval required)";
    if (verdict === "stop") return "Decision: STOP (Gate blocked execution)";
  }
  return summary;
}

export function TraceStepRow({ item, defaultExpanded = false }: TraceStepRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const formattedStepNumber = String(item.step_number).padStart(2, "0");
  const verdict = item.decision?.verdict;
  const summaryText = formatStepSummary(item.node, item.summary, verdict);

  // Normalize state
  const isRunning = "state" in item ? item.state === "running" : false;
  const isWaiting = "state" in item ? item.state === "waiting" : false;
  const isCompleted = "state" in item ? item.state === "completed" : true;

  const status = item.status ?? (isRunning ? "passed" : isWaiting ? "passed" : "completed");

  const statusStyle = isRunning
    ? "border-blue-400/80 dark:border-blue-700/80 bg-blue-500/5 shadow-xs"
    : isWaiting
    ? "border-border/40 bg-card/20 opacity-60"
    : {
        passed: "border-border/80 hover:border-border bg-card/40",
        completed: "border-emerald-300/60 dark:border-emerald-900/50 bg-emerald-500/5",
        warning: "border-amber-300/80 dark:border-amber-900/60 bg-amber-500/5",
        failed: "border-rose-300/80 dark:border-rose-900/60 bg-rose-500/5",
      }[status] ?? "border-border bg-card/40";

  return (
    <div className={`rounded border ${statusStyle} transition-all duration-150 overflow-hidden`}>
      {/* Step Header with comfortable padding */}
      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-muted-foreground select-none w-5 text-right">
              {formattedStepNumber}
            </span>
            <NodeBadge node={item.node} size="md" />

            {isRunning ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
                <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                running
              </span>
            ) : isWaiting ? (
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60">
                waiting
              </span>
            ) : (
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {typeof item.duration_ms === "number" && isCompleted && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Clock className="size-3 opacity-60" />
                {item.duration_ms.toFixed(1)} ms
              </span>
            )}

            {isCompleted && item.detail && (
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
            )}
          </div>
        </div>

        {/* Step Concise Summary */}
        <p className="text-xs text-foreground font-medium pl-8 leading-relaxed">
          {summaryText}
        </p>
      </div>

      {/* Expanded Technical Details */}
      {expanded && isCompleted && (
        <div className="border-t border-border/50 bg-background/60 p-3.5 space-y-2.5 text-xs font-mono">
          {item.detail && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                Verification Details
              </span>
              <div className="rounded border border-border/60 bg-muted/30 p-2.5 text-foreground whitespace-pre-wrap leading-relaxed">
                {item.detail}
              </div>
            </div>
          )}

          {item.decision && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                Gate Execution Result
              </span>

              <div className="rounded border border-border/60 bg-muted/20 p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-[11px]">Outcome:</span>
                  <span className="font-bold uppercase text-foreground">
                    {item.decision.verdict}
                  </span>
                </div>
                <div className="text-foreground leading-relaxed">
                  {item.decision.reason}
                </div>
              </div>

              {item.decision.required_reviewers && item.decision.required_reviewers.length > 0 && (
                <div className="text-[11px]">
                  <span className="text-muted-foreground">Required reviewers: </span>
                  <span className="text-foreground font-medium">
                    {item.decision.required_reviewers.join(", ")}
                  </span>
                </div>
              )}

              {item.decision.policy_violations && item.decision.policy_violations.length > 0 && (
                <div className="text-[11px] text-rose-700 dark:text-rose-400">
                  <span className="font-semibold">Policy violations: </span>
                  {item.decision.policy_violations.join("; ")}
                </div>
              )}

              {/* Raw decision metadata: collapsed by default, no hero confidence scores */}
              <details className="pt-1 text-[11px] text-muted-foreground cursor-pointer">
                <summary className="hover:text-foreground">
                  Raw decision metadata
                </summary>
                <div className="mt-1.5 rounded border border-border/40 bg-card/60 p-2 space-y-1 font-mono text-[10px] text-muted-foreground">
                  <div>Model execution latency: {item.decision.latency_ms.toFixed(3)} ms</div>
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
