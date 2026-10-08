import { AlertTriangle, CheckCircle2, ShieldAlert, Users, XCircle } from "lucide-react";
import type { Decision } from "@/types";

interface DecisionPanelProps {
  decision: Decision | null;
  loading?: boolean;
}

export function DecisionPanel({ decision, loading }: DecisionPanelProps) {
  if (loading) {
    return (
      <div className="rounded border bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Gate Evaluation in progress
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Running inspection, checks, and Jev gate evaluation...
        </p>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="rounded border border-dashed bg-card/20 p-4 text-center">
        <span className="font-mono text-xs text-muted-foreground">
          No evaluation run yet. Trigger "Evaluate" to run the gate.
        </span>
      </div>
    );
  }

  const verdictConfig = {
    apply: {
      title: "Apply",
      subtitle: "Autonomous merge approved",
      icon: CheckCircle2,
      borderClass: "border-emerald-300 dark:border-emerald-900/60",
      bgClass: "bg-emerald-500/5",
      badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
    review: {
      title: "Review required",
      subtitle: "Routing to human engineering reviewers",
      icon: AlertTriangle,
      borderClass: "border-amber-300 dark:border-amber-900/60",
      bgClass: "bg-amber-500/5",
      badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    stop: {
      title: "Stopped",
      subtitle: "Execution halted by safety gate",
      icon: XCircle,
      borderClass: "border-rose-300 dark:border-rose-900/60",
      bgClass: "bg-rose-500/5",
      badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800",
      iconClass: "text-rose-600 dark:text-rose-400",
    },
  }[decision.verdict] ?? {
    title: decision.verdict,
    subtitle: "Evaluation completed",
    icon: CheckCircle2,
    borderClass: "border-border",
    bgClass: "bg-card/40",
    badgeClass: "bg-muted text-muted-foreground border-border",
    iconClass: "text-muted-foreground",
  };

  const Icon = verdictConfig.icon;

  return (
    <div className={`rounded border ${verdictConfig.borderClass} ${verdictConfig.bgClass} p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon className={`size-5 shrink-0 ${verdictConfig.iconClass}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-semibold uppercase tracking-wide ${verdictConfig.badgeClass}`}>
                {verdictConfig.title}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {decision.latency_ms.toFixed(1)} ms
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {verdictConfig.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Primary Technical Rationale */}
      <div className="rounded border border-border/60 bg-background/50 p-2.5 text-xs leading-relaxed text-foreground">
        {decision.reason}
      </div>

      {/* Required Reviewers if any */}
      {decision.required_reviewers && decision.required_reviewers.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-muted-foreground">
            <Users className="size-3" />
            <span>Required review</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {decision.required_reviewers.map((rev) => (
              <span
                key={rev}
                className="inline-flex items-center rounded border border-border/70 bg-card px-2 py-0.5 font-mono text-[11px] text-foreground"
              >
                {rev}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Policy Findings if any */}
      {decision.policy_violations && decision.policy_violations.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400">
            <ShieldAlert className="size-3" />
            <span>Policy findings</span>
          </div>
          <ul className="space-y-1">
            {decision.policy_violations.map((violation, i) => (
              <li
                key={i}
                className="rounded border border-rose-200 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-1 font-mono text-xs text-rose-800 dark:text-rose-300"
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
