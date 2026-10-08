import { cn } from "@/lib/utils";
import type { NodeName } from "@/types";

interface NodeBadgeProps {
  node: NodeName | string;
  className?: string;
  size?: "sm" | "md";
}

const NODE_STYLES: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  inspect: {
    label: "inspect",
    dot: "bg-slate-400 dark:bg-slate-500",
    text: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-700",
  },
  checks: {
    label: "checks",
    dot: "bg-slate-400 dark:bg-slate-500",
    text: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-700",
  },
  evaluate: {
    label: "evaluate",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
  },
  apply: {
    label: "apply",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  review: {
    label: "review",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
  },
  stop: {
    label: "stop",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
  },
};

export function NodeBadge({ node, className, size = "sm" }: NodeBadgeProps) {
  const style = NODE_STYLES[node] ?? {
    label: node,
    dot: "bg-muted-foreground",
    text: "text-foreground",
    bg: "bg-muted",
    border: "border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border font-mono font-medium tracking-tight",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        style.bg,
        style.border,
        style.text,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", style.dot)} />
      {style.label}
    </span>
  );
}
