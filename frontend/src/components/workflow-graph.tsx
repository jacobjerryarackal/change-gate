import { useMemo } from "react";
import type { NodeName, PipelineEdge } from "@/types";

interface WorkflowGraphProps {
  traversedNodes?: string[];
  traversedEdges?: PipelineEdge[];
  terminalVerdict?: "apply" | "review" | "stop";
}

interface NodeLayout {
  id: NodeName;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const NODES: NodeLayout[] = [
  {
    id: "inspect",
    label: "inspect",
    sublabel: "Change Inspection",
    x: 185,
    y: 20,
    w: 170,
    h: 48,
  },
  {
    id: "checks",
    label: "checks",
    sublabel: "Automated Verification",
    x: 185,
    y: 112,
    w: 170,
    h: 48,
  },
  {
    id: "evaluate",
    label: "evaluate",
    sublabel: "Gate Evaluation",
    x: 185,
    y: 204,
    w: 170,
    h: 48,
  },
  {
    id: "apply",
    label: "apply",
    sublabel: "Auto-merge",
    x: 35,
    y: 316,
    w: 140,
    h: 48,
  },
  {
    id: "review",
    label: "review",
    sublabel: "Human Approval",
    x: 200,
    y: 316,
    w: 140,
    h: 48,
  },
  {
    id: "stop",
    label: "stop",
    sublabel: "Halt Execution",
    x: 365,
    y: 316,
    w: 140,
    h: 48,
  },
];

const EDGES: {
  from: NodeName;
  to: NodeName;
  path: string;
}[] = [
  {
    from: "inspect",
    to: "checks",
    path: "M 270 68 L 270 112",
  },
  {
    from: "checks",
    to: "evaluate",
    path: "M 270 160 L 270 204",
  },
  {
    from: "evaluate",
    to: "apply",
    path: "M 225 252 C 225 285, 105 280, 105 316",
  },
  {
    from: "evaluate",
    to: "review",
    path: "M 270 252 L 270 316",
  },
  {
    from: "evaluate",
    to: "stop",
    path: "M 315 252 C 315 285, 435 280, 435 316",
  },
];

export function WorkflowGraph({
  traversedNodes = [],
  traversedEdges = [],
  terminalVerdict,
}: WorkflowGraphProps) {
  const visitedSet = useMemo(() => new Set(traversedNodes), [traversedNodes]);

  const visitedEdgeSet = useMemo(() => {
    const s = new Set<string>();
    traversedEdges.forEach((e) => s.add(`${e.from}->${e.to}`));
    return s;
  }, [traversedEdges]);

  // Terminal color determination
  const terminalColor = useMemo(() => {
    if (terminalVerdict === "apply") return "#10b981";
    if (terminalVerdict === "review") return "#f59e0b";
    if (terminalVerdict === "stop") return "#ef4444";
    return "#3b82f6";
  }, [terminalVerdict]);

  return (
    <div className="rounded border border-border/80 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workflow Graph
          </span>
          <span className="text-[11px] text-muted-foreground">• Deterministic Pipeline DAG</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {visitedSet.size > 0 ? `${visitedSet.size} of 6 nodes active` : "Schema idle"}
        </span>
      </div>

      <div className="w-full flex items-center justify-center py-2">
        <svg
          viewBox="0 0 540 380"
          className="w-full max-w-[540px] h-[360px] sm:h-[400px] select-none"
          role="img"
          aria-label="ChangeGate workflow traversal diagram"
        >
          <defs>
            <marker
              id="graph-arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,1 L8,5 L0,9 z" fill="currentColor" opacity="0.25" />
            </marker>
            <marker
              id="graph-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,1 L8,5 L0,9 z" fill={terminalColor} />
            </marker>
          </defs>

          {/* Edges */}
          {EDGES.map((edge) => {
            const isTraversed = visitedEdgeSet.has(`${edge.from}->${edge.to}`);
            return (
              <path
                key={`${edge.from}->${edge.to}`}
                d={edge.path}
                fill="none"
                stroke={isTraversed ? terminalColor : "currentColor"}
                strokeOpacity={isTraversed ? 1 : 0.18}
                strokeWidth={isTraversed ? 2.5 : 1.2}
                strokeDasharray={isTraversed ? "none" : "3,3"}
                markerEnd={
                  isTraversed
                    ? "url(#graph-arrow-active)"
                    : "url(#graph-arrow-default)"
                }
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isVisited = visitedSet.has(node.id);
            const isTerminal =
              node.id === "apply" || node.id === "review" || node.id === "stop";

            let strokeColor = "currentColor";
            let strokeOpacity = 0.25;
            let fillColor = "transparent";
            let titleColor = "currentColor";
            let titleOpacity = 0.45;
            let sublabelColor = "currentColor";
            let sublabelOpacity = 0.3;
            let strokeWidth = 1;

            if (isVisited) {
              strokeWidth = 2;
              titleOpacity = 1;
              sublabelOpacity = 0.75;

              if (node.id === "apply") {
                strokeColor = "#10b981";
                strokeOpacity = 1;
                fillColor = "rgba(16, 185, 129, 0.12)";
                titleColor = "#10b981";
                sublabelColor = "#10b981";
              } else if (node.id === "review") {
                strokeColor = "#f59e0b";
                strokeOpacity = 1;
                fillColor = "rgba(245, 158, 11, 0.12)";
                titleColor = "#f59e0b";
                sublabelColor = "#f59e0b";
              } else if (node.id === "stop") {
                strokeColor = "#ef4444";
                strokeOpacity = 1;
                fillColor = "rgba(239, 68, 68, 0.12)";
                titleColor = "#ef4444";
                sublabelColor = "#ef4444";
              } else if (node.id === "evaluate") {
                strokeColor = "#3b82f6";
                strokeOpacity = 1;
                fillColor = "rgba(59, 130, 246, 0.12)";
                titleColor = "#3b82f6";
                sublabelColor = "#3b82f6";
              } else {
                strokeColor = "currentColor";
                strokeOpacity = 0.85;
                fillColor = "rgba(120, 120, 120, 0.08)";
                titleColor = "currentColor";
                sublabelColor = "currentColor";
              }
            } else if (isTerminal) {
              strokeOpacity = 0.16;
              titleOpacity = 0.28;
              sublabelOpacity = 0.2;
            }

            return (
              <g key={node.id} className="transition-all duration-200">
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx={6}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={strokeWidth}
                />
                {/* Node Title */}
                <text
                  x={node.x + node.w / 2}
                  y={node.y + 22}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={13}
                  fontWeight={isVisited ? 700 : 500}
                  fill={titleColor}
                  fillOpacity={titleOpacity}
                  letterSpacing="0.05em"
                >
                  {node.label.toUpperCase()}
                </text>
                {/* Node Sublabel */}
                <text
                  x={node.x + node.w / 2}
                  y={node.y + 38}
                  textAnchor="middle"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontSize={10}
                  fontWeight={400}
                  fill={sublabelColor}
                  fillOpacity={sublabelOpacity}
                >
                  {node.sublabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
