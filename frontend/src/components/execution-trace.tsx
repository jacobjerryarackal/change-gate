import { TraceStepRow } from "./trace-step-row";
import type { LiveTraceItem, TraceStep } from "@/types";

interface ExecutionTraceProps {
  items?: (LiveTraceItem | TraceStep)[];
  steps?: TraceStep[];
  isRunning?: boolean;
}

export function ExecutionTrace({ items, steps, isRunning }: ExecutionTraceProps) {
  const displayItems = items && items.length > 0 ? items : steps ?? [];

  if (displayItems.length === 0) {
    return (
      <div className="rounded border border-dashed border-border/80 bg-card/20 p-6 text-center">
        <span className="font-mono text-xs text-muted-foreground">
          {isRunning
            ? "Initializing pipeline execution..."
            : "No execution yet"}
        </span>
      </div>
    );
  }

  const completedItems = displayItems.filter(
    (item) => !("state" in item) || item.state === "completed"
  );
  const totalTime = completedItems.reduce((acc, s) => acc + (s.duration_ms ?? 0), 0);

  return (
    <div className="rounded border border-border/80 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Execution Trace
          </span>
          <span className="text-[11px] text-muted-foreground">
            {isRunning ? "• Streaming live events" : "• Chronological Run Audit"}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
              <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
              live
            </span>
          )}
          <span>
            {completedItems.length} of {displayItems.length} steps • {totalTime.toFixed(1)} ms
          </span>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        {displayItems.map((item) => (
          <TraceStepRow
            key={item.step_number}
            item={item}
            defaultExpanded={
              item.node === "evaluate" ||
              item.status === "warning" ||
              item.status === "failed"
            }
          />
        ))}
      </div>
    </div>
  );
}
