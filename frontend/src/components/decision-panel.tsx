import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Decision } from "@/types";

interface DecisionPanelProps {
  decision: Decision | null;
  loading?: boolean;
  onReevaluate?: () => void;
}

function formatEngineeringReason(reason: string): string {
  if (reason.includes("blast radius is low risk")) {
    return "All automated checks passed. The change only modifies documentation and type annotations.";
  }
  if (reason.includes("persistent tables requires human DBA sign-off")) {
    return "Database schema modification detected. Human approval is required before applying this change.";
  }
  if (reason.includes("unauthorized bypass or permissive wildcard")) {
    return "Automated execution was halted because a security policy violation was detected.";
  }
  if (reason.includes("Automated test regression")) {
    return "Automated execution was halted due to regression test failures.";
  }
  return reason;
}

export function DecisionPanel({ decision, loading, onReevaluate }: DecisionPanelProps) {
  if (loading) {
    return (
      <div className="rounded border border-border/80 bg-card/40 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Decision
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">Evaluating...</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-blue-500 shrink-0" />
          <span>Evaluating change...</span>
        </div>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="rounded border border-dashed border-border/80 bg-card/20 p-3.5 text-center">
        <span className="font-mono text-xs text-muted-foreground">
          Select a change to begin
        </span>
      </div>
    );
  }

  const verdictConfig = {
    apply: {
      badgeText: "APPLY",
      icon: CheckCircle2,
      borderClass: "border-emerald-300/80 dark:border-emerald-900/60",
      bgClass: "bg-emerald-500/5",
      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
    review: {
      badgeText: "REVIEW REQUIRED",
      icon: AlertTriangle,
      borderClass: "border-amber-300/80 dark:border-amber-900/60",
      bgClass: "bg-amber-500/5",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    stop: {
      badgeText: "STOPPED",
      icon: XCircle,
      borderClass: "border-rose-300/80 dark:border-rose-900/60",
      bgClass: "bg-rose-500/5",
      badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800",
      iconClass: "text-rose-600 dark:text-rose-400",
    },
  }[decision.verdict] ?? {
    badgeText: decision.verdict.toUpperCase(),
    icon: CheckCircle2,
    borderClass: "border-border",
    bgClass: "bg-card/40",
    badgeClass: "bg-muted text-muted-foreground border-border",
    iconClass: "text-muted-foreground",
  };

  const Icon = verdictConfig.icon;
  const reasonText = formatEngineeringReason(decision.reason);

  return (
    <div className={`rounded border ${verdictConfig.borderClass} ${verdictConfig.bgClass} p-3.5 space-y-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Decision
        </span>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            {decision.latency_ms.toFixed(1)} ms
          </span>
          {onReevaluate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onReevaluate}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title="Re-run evaluation"
            >
              <RefreshCw className="size-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Icon className={`size-4.5 shrink-0 ${verdictConfig.iconClass}`} />
        <span
          className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-bold tracking-tight ${verdictConfig.badgeClass}`}
        >
          {verdictConfig.badgeText}
        </span>
      </div>

      {/* Technical reason */}
      <p className="text-xs leading-relaxed text-foreground font-normal">
        {reasonText}
      </p>

      {/* Required Reviewers */}
      {decision.required_reviewers && decision.required_reviewers.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
            <Users className="size-3" />
            <span>Required review:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {decision.required_reviewers.map((rev) => (
              <span
                key={rev}
                className="inline-flex items-center rounded border border-border/80 bg-background/80 px-2 py-0.5 font-mono text-[11px] text-foreground"
              >
                {rev}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Policy Findings */}
      {decision.policy_violations && decision.policy_violations.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400">
            <ShieldAlert className="size-3" />
            <span>Policy findings:</span>
          </div>
          <ul className="space-y-1">
            {decision.policy_violations.map((violation, i) => (
              <li
                key={i}
                className="rounded border border-rose-200 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-1 font-mono text-[11px] text-rose-800 dark:text-rose-300"
              >
                {violation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
