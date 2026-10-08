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
  x: number;
  y: number;
  w: number;
  h: number;
}

const NODES: NodeLayout[] = [
  { id: "inspect", label: "inspect", x: 175, y: 10, w: 90, h: 30 },
  { id: "checks", label: "checks", x: 175, y: 65, w: 90, h: 30 },
  { id: "evaluate", label: "evaluate", x: 175, y: 120, w: 90, h: 30 },
  { id: "apply", label: "apply", x: 45, y: 178, w: 86, h: 30 },
  { id: "review", label: "review", x: 177, y: 178, w: 86, h: 30 },
  { id: "stop", label: "stop", x: 309, y: 178, w: 86, h: 30 },
];

const EDGES: { from: NodeName; to: NodeName; x1: number; y1: number; x2: number; y2: number }[] = [
  { from: "inspect", to: "checks", x1: 220, y1: 40, x2: 220, y2: 65 },
  { from: "checks", to: "evaluate", x1: 220, y1: 95, x2: 220, y2: 120 },
  { from: "evaluate", to: "apply", x1: 190, y1: 150, x2: 88, y2: 178 },
  { from: "evaluate", to: "review", x1: 220, y1: 150, x2: 220, y2: 178 },
  { from: "evaluate", to: "stop", x1: 250, y1: 150, x2: 352, y2: 178 },
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
    <div className="rounded border bg-card/40 p-3">
      <div className="flex items-center justify-between pb-2 text-xs font-medium text-muted-foreground">
        <span>Workflow Graph</span>
        <span className="font-mono text-[11px]">
          {visitedSet.size > 0 ? `${visitedSet.size} nodes traversed` : "Static pipeline schema"}
        </span>
      </div>

      <div className="w-full flex items-center justify-center">
        <svg
          viewBox="0 0 440 220"
          className="w-full max-w-[440px] h-auto select-none"
          role="img"
          aria-label="ChangeGate workflow traversal graph"
        >
          <defs>
            <marker
              id="edge-arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,1 L8,5 L0,9 z" fill="currentColor" opacity="0.3" />
            </marker>
            <marker
              id="edge-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,1 L8,5 L0,9 z" fill={terminalColor} />
            </marker>
          </defs>

          {/* Edges */}
          {EDGES.map((edge) => {
            const isTraversed = visitedEdgeSet.has(`${edge.from}->${edge.to}`);
            return (
              <line
                key={`${edge.from}->${edge.to}`}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke={isTraversed ? terminalColor : "currentColor"}
                strokeOpacity={isTraversed ? 1 : 0.2}
                strokeWidth={isTraversed ? 2 : 1.2}
                markerEnd={isTraversed ? "url(#edge-arrow-active)" : "url(#edge-arrow-default)"}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isVisited = visitedSet.has(node.id);
            const isTerminal = node.id === "apply" || node.id === "review" || node.id === "stop";

            let strokeColor = "currentColor";
            let strokeOpacity = 0.25;
            let fillColor = "transparent";
            let textColor = "currentColor";
            let textOpacity = 0.45;
            let fontWeight = 400;

            if (isVisited) {
              fontWeight = 600;
              textOpacity = 1;
              if (node.id === "apply") {
                strokeColor = "#10b981";
                strokeOpacity = 1;
                fillColor = "rgba(16, 185, 129, 0.12)";
                textColor = "#10b981";
              } else if (node.id === "review") {
                strokeColor = "#f59e0b";
                strokeOpacity = 1;
                fillColor = "rgba(245, 158, 11, 0.12)";
                textColor = "#f59e0b";
              } else if (node.id === "stop") {
                strokeColor = "#ef4444";
                strokeOpacity = 1;
                fillColor = "rgba(239, 68, 68, 0.12)";
                textColor = "#ef4444";
              } else if (node.id === "evaluate") {
                strokeColor = "#3b82f6";
                strokeOpacity = 1;
                fillColor = "rgba(59, 130, 246, 0.12)";
                textColor = "#3b82f6";
              } else {
                strokeColor = "currentColor";
                strokeOpacity = 0.8;
                fillColor = "rgba(120, 120, 120, 0.08)";
                textColor = "currentColor";
              }
            } else if (isTerminal) {
              // Subdued terminal option
              strokeOpacity = 0.18;
              textOpacity = 0.3;
            }

            return (
              <g key={node.id} className="transition-all duration-200">
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx={4}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeOpacity={strokeOpacity}
                  strokeWidth={isVisited ? 1.75 : 1}
                />
                <text
                  x={node.x + node.w / 2}
                  y={node.y + node.h / 2 + 4}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                  fontSize={11}
                  fill={textColor}
                  fillOpacity={textOpacity}
                  fontWeight={fontWeight}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
