import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Shield, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/use-theme";
import { ChangeOverview } from "@/components/change-overview";
import { DecisionPanel } from "@/components/decision-panel";
import { WorkflowGraph } from "@/components/workflow-graph";
import { ExecutionTrace } from "@/components/execution-trace";
import { ProposalSelector } from "@/components/proposal-selector";
import { RecentRuns } from "@/components/recent-runs";
import { evaluateProposal, getHealth, getProposals, getRuns } from "./api";
import type { ChangeProposal, GateEvaluationResult } from "./types";

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

export default function App() {
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>("prop-001");
  const [selectedFile, setSelectedFile] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<GateEvaluationResult | null>(null);
  const [runs, setRuns] = useState<GateEvaluationResult[]>([]);
  const [provider, setProvider] = useState<string>("mock");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Evaluate action (automatically triggered)
  const runEvaluation = async (proposalId: string) => {
    if (!proposalId) return;
    setLoading(true);
    setError(null);

    try {
      const evaluation = await evaluateProposal(proposalId);
      setResult(evaluation);
      setRuns((prev) => [
        evaluation,
        ...prev.filter((r) => r.proposal.id !== evaluation.proposal.id),
      ].slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate change proposal");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    let mounted = true;

    Promise.all([
      getProposals().catch(() => []),
      getRuns().catch(() => []),
      getHealth().catch(() => ({ provider: "mock", service: "ChangeGate", status: "ok" })),
    ]).then(([fetchedProposals, fetchedRuns, health]) => {
      if (!mounted) return;
      if (fetchedProposals.length > 0) {
        setProposals(fetchedProposals);
        const firstId = fetchedProposals[0].id;
        setSelectedProposalId(firstId);
        setSelectedFile(fetchedProposals[0].changed_files[0]);
        // Automatically evaluate the initial change on load
        runEvaluation(firstId);
      }
      if (fetchedRuns.length > 0) {
        setRuns(fetchedRuns);
      }
      if (health?.provider) {
        setProvider(health.provider);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Current active proposal
  const currentProposal = useMemo(() => {
    return proposals.find((p) => p.id === selectedProposalId) ?? proposals[0] ?? null;
  }, [proposals, selectedProposalId]);

  // Handle switching proposals: immediately evaluates
  const handleSelectProposal = (id: string) => {
    setSelectedProposalId(id);
    const p = proposals.find((item) => item.id === id);
    if (p && p.changed_files.length > 0) {
      setSelectedFile(p.changed_files[0]);
    }
    runEvaluation(id);
  };

  // Select historical run
  const handleSelectRun = (run: GateEvaluationResult) => {
    setSelectedProposalId(run.proposal.id);
    setSelectedFile(run.proposal.changed_files[0]);
    setResult(run);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-muted selection:text-foreground">
      {/* 1. Minimal Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded border border-border bg-card">
              <Shield className="size-4 text-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight leading-none text-foreground">
                ChangeGate
              </h1>
              <p className="mt-0.5 text-[11px] font-mono text-muted-foreground leading-none">
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
                Change Under Review
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

            {currentProposal && (
              <ChangeOverview
                proposal={currentProposal}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
              />
            )}
          </section>

          {/* RIGHT: EXECUTION, WORKFLOW GRAPH, AND TRACE (~60%) */}
          <section className="lg:col-span-7 space-y-5">
            {/* Decision Panel */}
            <DecisionPanel
              decision={result ? result.decision : null}
              loading={loading}
              onReevaluate={() => runEvaluation(selectedProposalId)}
            />

            {/* Large Workflow Graph (~400-500px height area) */}
            <WorkflowGraph
              traversedNodes={result?.traversed_nodes ?? []}
              traversedEdges={result?.traversed_edges ?? []}
              terminalVerdict={result?.decision.verdict}
            />

            {/* Large Execution Trace with comfortable padding */}
            <ExecutionTrace steps={result?.trace ?? []} />
          </section>
        </div>

        {/* Compact Recent Evaluations strip at bottom */}
        <section className="pt-2 border-t border-border/40">
          <RecentRuns
            runs={runs}
            onSelectRun={handleSelectRun}
            activeRunProposalId={result?.proposal.id}
          />
        </section>
      </main>
    </div>
  );
}
