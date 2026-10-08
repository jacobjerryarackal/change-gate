import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Moon, Play, Shield, Sun } from "lucide-react";
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
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        setSelectedProposalId(fetchedProposals[0].id);
        setSelectedFile(fetchedProposals[0].changed_files[0]);
      }
      if (fetchedRuns.length > 0) {
        setRuns(fetchedRuns);
        setResult(fetchedRuns[0]);
      }
      if (health?.provider) {
        setProvider(health.provider);
      }
      setInitialLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Current active proposal
  const currentProposal = useMemo(() => {
    return proposals.find((p) => p.id === selectedProposalId) ?? proposals[0] ?? null;
  }, [proposals, selectedProposalId]);

  // Handle switching proposals
  const handleSelectProposal = (id: string) => {
    setSelectedProposalId(id);
    const p = proposals.find((item) => item.id === id);
    if (p && p.changed_files.length > 0) {
      setSelectedFile(p.changed_files[0]);
    }
    // Check if we have an existing recent evaluation for this proposal
    const existingRun = runs.find((r) => r.proposal.id === id);
    if (existingRun) {
      setResult(existingRun);
    } else {
      setResult(null);
    }
  };

  // Evaluate action
  const handleEvaluate = async () => {
    if (!selectedProposalId) return;
    setLoading(true);
    setError(null);

    try {
      const evaluation = await evaluateProposal(selectedProposalId);
      setResult(evaluation);
      setRuns((prev) => [evaluation, ...prev.filter((r) => r.proposal.id !== evaluation.proposal.id)].slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate change proposal");
    } finally {
      setLoading(false);
    }
  };

  // Select historical run
  const handleSelectRun = (run: GateEvaluationResult) => {
    setSelectedProposalId(run.proposal.id);
    setSelectedFile(run.proposal.changed_files[0]);
    setResult(run);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-muted selection:text-foreground">
      {/* Engineering Header */}
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

          <div className="flex items-center gap-2 sm:gap-3">
            {proposals.length > 0 && (
              <ProposalSelector
                proposals={proposals}
                selectedId={selectedProposalId}
                onSelect={handleSelectProposal}
                disabled={loading}
              />
            )}

            <Button
              onClick={handleEvaluate}
              disabled={loading || initialLoading}
              size="sm"
              className="h-8 gap-1.5 px-3 font-mono text-xs font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5 fill-current" />
                  <span>Evaluate</span>
                </>
              )}
            </Button>

            <span className="hidden sm:inline-flex items-center rounded border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground bg-muted/40">
              provider: {provider}
            </span>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 p-3 text-xs font-mono text-rose-800 dark:text-rose-200">
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Desktop Grid */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Change Under Review (58% / 7 cols) */}
          <section className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Change Under Review
              </span>
              {currentProposal && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {currentProposal.target_branch} ← {currentProposal.author_id}
                </span>
              )}
            </div>

            {currentProposal ? (
              <ChangeOverview
                proposal={currentProposal}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
              />
            ) : initialLoading ? (
              <div className="rounded border p-8 text-center font-mono text-xs text-muted-foreground">
                Loading proposals...
              </div>
            ) : (
              <div className="rounded border border-dashed p-8 text-center font-mono text-xs text-muted-foreground">
                No change proposal selected.
              </div>
            )}
          </section>

          {/* Right Column: Execution & Gate Traversal (42% / 5 cols) */}
          <section className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gate Execution
              </span>
              {result && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {result.trace.length} steps executed
                </span>
              )}
            </div>

            {/* Decision Outcome */}
            <DecisionPanel
              decision={result ? result.decision : null}
              loading={loading}
            />

            {/* Workflow Graph Traversal */}
            <WorkflowGraph
              traversedNodes={result?.traversed_nodes ?? []}
              traversedEdges={result?.traversed_edges ?? []}
              terminalVerdict={result?.decision.verdict}
            />

            {/* Chronological Execution Trace */}
            <ExecutionTrace steps={result?.trace ?? []} />
          </section>
        </div>

        {/* Compact Recent Runs Strip at Bottom */}
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
