import { TraceStepRow } from "./trace-step-row";
import type { TraceStep } from "@/types";

interface ExecutionTraceProps {
  steps: TraceStep[];
}

export function ExecutionTrace({ steps }: ExecutionTraceProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="rounded border border-dashed bg-card/20 p-4 text-center">
        <span className="font-mono text-xs text-muted-foreground">
          No execution trace recorded.
        </span>
      </div>
    );
  }

  const totalTime = steps.reduce((acc, s) => acc + s.duration_ms, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Execution Trace</span>
        <span className="font-mono text-[11px]">
          {steps.length} steps • {totalTime.toFixed(1)} ms total
        </span>
      </div>

      <div className="space-y-1.5">
        {steps.map((step) => (
          <TraceStepRow
            key={step.step_number}
            step={step}
            // default expand evaluate or warning/failed steps for instant engineering visibility
            defaultExpanded={step.node === "evaluate" || step.status === "warning" || step.status === "failed"}
          />
        ))}
      </div>
    </div>
  );
}
