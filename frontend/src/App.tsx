import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Shield, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/use-theme";
import { ChangeOverview } from "@/components/change-overview";
import { DecisionPanel } from "@/components/decision-panel";
import { WorkflowGraph } from "@/components/workflow-graph";
import { ExecutionTrace } from "@/components/execution-trace";
import { ProposalSelector } from "@/components/proposal-selector";
import { getHealth, getProposals, streamEvaluation } from "./api";
import type {
  ChangeProposal,
  ExecutionEvent,
  GateEvaluationResult,
  LiveTraceItem,
  NodeExecutionState,
  NodeName,
  PipelineEdge,
} from "./types";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      className="h-8 w-8 rounded border-border"
      aria-label="Toggle color theme"
    >
      {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </Button>
  );
}

const INITIAL_NODE_STATES: Record<NodeName, NodeExecutionState> = {
  inspect: "waiting",
  checks: "waiting",
  evaluate: "waiting",
  apply: "waiting",
  review: "waiting",
  stop: "waiting",
};

function createInitialLiveTrace(): LiveTraceItem[] {
  return [
    {
      step_number: 1,
      node: "inspect",
      state: "waiting",
      summary: "Inspecting proposed change metadata and diff...",
    },
    {
      step_number: 2,
      node: "checks",
      state: "waiting",
      summary: "Waiting for automated test gates and verifications...",
    },
    {
      step_number: 3,
      node: "evaluate",
      state: "waiting",
      summary: "Waiting for Jev gate evaluation...",
    },
  ];
}

export default function App() {
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<GateEvaluationResult | null>(null);
  const [provider, setProvider] = useState<string>("mock");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live execution states
  const [nodeStates, setNodeStates] = useState<Record<NodeName, NodeExecutionState>>(INITIAL_NODE_STATES);
  const [activeNode, setActiveNode] = useState<NodeName | null>(null);
  const [traversedNodes, setTraversedNodes] = useState<string[]>([]);
  const [traversedEdges, setTraversedEdges] = useState<PipelineEdge[]>([]);
  const [liveTraceItems, setLiveTraceItems] = useState<LiveTraceItem[]>([]);
  const [terminalVerdict, setTerminalVerdict] = useState<"apply" | "review" | "stop" | undefined>(undefined);

  const activeStreamCleanupRef = useRef<(() => void) | null>(null);

  // Stream execution for a given proposal
  const startLiveEvaluation = (proposalId: string) => {
    // 1. Abort previous stream if any
    if (activeStreamCleanupRef.current) {
      activeStreamCleanupRef.current();
      activeStreamCleanupRef.current = null;
    }

    // 2. Reset execution states
    setLoading(true);
    setError(null);
    setResult(null);
    setTerminalVerdict(undefined);
    setTraversedNodes([]);
    setTraversedEdges([]);
    setActiveNode(null);
    setNodeStates(INITIAL_NODE_STATES);
    setLiveTraceItems(createInitialLiveTrace());

    // 3. Connect to live SSE stream
    const cleanup = streamEvaluation(
      proposalId,
      (event: ExecutionEvent) => {
        handleExecutionEvent(event);
      },
      (err: Error) => {
        setLoading(false);
        setActiveNode(null);
        setError("EXECUTION ERROR: The evaluation stream could not be completed.");
      }
    );

    activeStreamCleanupRef.current = cleanup;
  };

  const handleExecutionEvent = (event: ExecutionEvent) => {
    switch (event.event_type) {
      case "run_started": {
        setActiveNode("inspect");
        setNodeStates((prev) => ({ ...prev, inspect: "running" }));
        setLiveTraceItems((prev) =>
          prev.map((item) =>
            item.node === "inspect"
              ? { ...item, state: "running", summary: "Inspecting proposed change..." }
              : item
          )
        );
        break;
      }

      case "node_started": {
        if (!event.node) break;
        const currentNode = event.node;
        setActiveNode(currentNode);
        setNodeStates((prev) => ({ ...prev, [currentNode]: "running" }));

        setLiveTraceItems((prev) => {
          const index = prev.findIndex((item) => item.node === currentNode);
          if (index !== -1) {
            const next = [...prev];
            next[index] = { ...next[index], state: "running" };
            return next;
          }
          // If terminal node starting (e.g. apply/review/stop), add as 4th item
          return [
            ...prev,
            {
              step_number: prev.length + 1,
              node: currentNode,
              state: "running",
              summary: `Executing ${currentNode} action...`,
            },
          ];
        });
        break;
      }

      case "decision_made": {
        if (event.decision) {
          const verdict = event.decision.verdict;
          setTerminalVerdict(verdict);

          // Add terminal node waiting state to trace if not yet present
          setLiveTraceItems((prev) => {
            if (prev.some((item) => item.node === verdict)) return prev;
            return [
              ...prev,
              {
                step_number: prev.length + 1,
                node: verdict,
                state: "waiting",
                summary: `Action routed to ${verdict}...`,
              },
            ];
          });
        }
        break;
      }

      case "node_completed": {
        if (!event.node) break;
        const currentNode = event.node;
        setNodeStates((prev) => ({ ...prev, [currentNode]: "completed" }));

        if (event.traversed_nodes) {
          setTraversedNodes(event.traversed_nodes);
        }
        if (event.traversed_edges) {
          setTraversedEdges(event.traversed_edges);
        }

        if (event.step) {
          const completedStep = event.step;
          setLiveTraceItems((prev) => {
            const index = prev.findIndex((item) => item.node === currentNode);
            if (index !== -1) {
              const next = [...prev];
              next[index] = {
                ...next[index],
                state: "completed",
                status: completedStep.status,
                summary: completedStep.summary,
                detail: completedStep.detail,
                duration_ms: completedStep.duration_ms,
                decision: completedStep.decision,
              };
              return next;
            }
            return [
              ...prev,
              {
                step_number: completedStep.step_number,
                node: currentNode,
                state: "completed",
                status: completedStep.status,
                summary: completedStep.summary,
                detail: completedStep.detail,
                duration_ms: completedStep.duration_ms,
                decision: completedStep.decision,
              },
            ];
          });
        }
        break;
      }

      case "run_completed": {
        setLoading(false);
        setActiveNode(null);
        if (event.result) {
          setResult(event.result);
          setTerminalVerdict(event.result.decision.verdict);
          setTraversedNodes(event.result.traversed_nodes);
          setTraversedEdges(event.result.traversed_edges);
        }
        break;
      }
    }
  };

  // Initial load
  useEffect(() => {
    let mounted = true;

    Promise.all([
      getProposals().catch(() => []),
      getHealth().catch(() => ({ provider: "mock", service: "ChangeGate", status: "ok" })),
    ]).then(([fetchedProposals, health]) => {
      if (!mounted) return;
      if (fetchedProposals.length > 0) {
        setProposals(fetchedProposals);
      }
      if (health?.provider) {
        setProvider(health.provider);
      }
    });

    return () => {
      mounted = false;
      if (activeStreamCleanupRef.current) {
        activeStreamCleanupRef.current();
      }
    };
  }, []);

  // Current active proposal
  const currentProposal = useMemo(() => {
    if (!selectedProposalId) return null;
    return proposals.find((p) => p.id === selectedProposalId) ?? null;
  }, [proposals, selectedProposalId]);

  // Handle switching proposals: resets immediately and triggers live evaluation
  const handleSelectProposal = (id: string) => {
    setSelectedProposalId(id);
    const p = proposals.find((item) => item.id === id);
    if (p && p.changed_files.length > 0) {
      setSelectedFile(p.changed_files[0]);
    }
    startLiveEvaluation(id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-muted selection:text-foreground">
      {/* 1. Minimal Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded border border-border bg-card shadow-xs">
              <Shield className="size-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-[21px] font-semibold tracking-tight leading-none text-foreground">
                ChangeGate
              </h1>
              <p className="mt-1 text-[14px] font-mono text-muted-foreground leading-none">
                Autonomous change review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground bg-muted/40">
              provider: {provider}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Workspace with 40% (left) / 60% (right) proportion */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 p-3 text-xs font-mono text-rose-800 dark:text-rose-200">
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Desktop Grid: Left 41.7% (col-span-5) / Right 58.3% (col-span-7) */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* LEFT: CHANGE UNDER REVIEW (~40%) */}
          <section className="lg:col-span-5 space-y-4">
            <div className="border-b border-border/60 pb-2">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                CHANGE UNDER REVIEW
              </h2>
            </div>

            {/* Proposal Selection in Workspace */}
            {proposals.length > 0 && (
              <ProposalSelector
                proposals={proposals}
                selectedId={selectedProposalId}
                onSelect={handleSelectProposal}
                disabled={loading}
              />
            )}

            {currentProposal ? (
              <ChangeOverview
                proposal={currentProposal}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
              />
            ) : (
              <div className="rounded border border-border/80 bg-card/40 p-5 space-y-1.5">
                <div className="font-mono text-xs font-semibold text-foreground">
                  Select a change to begin
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Choose a proposed change to inspect its diff and run the decision gate.
                </p>
              </div>
            )}
          </section>

          {/* RIGHT: LIVE EXECUTION, WORKFLOW GRAPH, AND TRACE (~60%) */}
          <section className="lg:col-span-7 space-y-5">
            {selectedProposalId ? (
              <>
                {/* Live Decision Panel */}
                <DecisionPanel
                  decision={result ? result.decision : null}
                  loading={loading}
                  onReevaluate={() => startLiveEvaluation(selectedProposalId)}
                />

                {/* Live Workflow Graph with nodeStates (waiting, running, completed) */}
                <WorkflowGraph
                  hasSelection={true}
                  traversedNodes={traversedNodes}
                  traversedEdges={traversedEdges}
                  terminalVerdict={terminalVerdict}
                  nodeStates={nodeStates}
                  activeNode={activeNode}
                />

                {/* Live Synchronized Execution Trace */}
                <ExecutionTrace
                  items={liveTraceItems}
                  isRunning={loading}
                />
              </>
            ) : (
              <div className="rounded border border-border/80 bg-card/40 min-h-[560px] flex flex-col items-center justify-center p-8 text-center">
                <span className="font-mono text-xs text-muted-foreground">
                  Select a change to begin
                </span>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
