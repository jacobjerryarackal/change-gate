import { TraceStepRow } from "./trace-step-row";
import type { TraceStep } from "@/types";

interface ExecutionTraceProps {
  steps: TraceStep[];
}

export function ExecutionTrace({ steps }: ExecutionTraceProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="rounded border border-dashed border-border/80 bg-card/20 p-6 text-center">
        <span className="font-mono text-xs text-muted-foreground">
          No execution trace recorded. Select a change proposal to evaluate.
        </span>
      </div>
    );
  }

  const totalTime = steps.reduce((acc, s) => acc + s.duration_ms, 0);

  return (
    <div className="rounded border border-border/80 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Execution Trace
          </span>
          <span className="text-[11px] text-muted-foreground">• Chronological Run Audit</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {steps.length} steps • {totalTime.toFixed(1)} ms total
        </span>
      </div>

      <div className="space-y-2.5 pt-1">
        {steps.map((step) => (
          <TraceStepRow
            key={step.step_number}
            step={step}
            // default expand evaluate or warning/failed steps for instant engineering visibility
            defaultExpanded={
              step.node === "evaluate" ||
              step.status === "warning" ||
              step.status === "failed"
            }
          />
        ))}
      </div>
    </div>
  );
}
