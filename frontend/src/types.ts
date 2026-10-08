export type AuthorType = "autonomous_agent" | "human";
export type NodeName = "inspect" | "checks" | "evaluate" | "apply" | "review" | "stop";
export type StepStatus = "passed" | "warning" | "failed" | "completed";
export type Verdict = "apply" | "review" | "stop";

export interface DiffStat {
  additions: number;
  deletions: number;
  files_changed: number;
}

export interface ChangeProposal {
  id: string;
  title: string;
  summary: string;
  author_type: AuthorType;
  author_id: string;
  target_branch: string;
  changed_files: string[];
  diff_stat: DiffStat;
  diff_snippet: string;
  tags: string[];
}

export interface Decision {
  verdict: Verdict;
  reason: string;
  confidence: number;
  probabilities: Record<string, number>;
  required_reviewers: string[] | null;
  policy_violations: string[];
  latency_ms: number;
}

export interface TraceStep {
  step_number: number;
  node: NodeName;
  status: StepStatus;
  summary: string;
  detail: string;
  duration_ms: number;
  decision: Decision | null;
}

export interface PipelineEdge {
  from: string;
  to: string;
}

export interface GateEvaluationResult {
  proposal: ChangeProposal;
  trace: TraceStep[];
  decision: Decision;
  traversed_nodes: string[];
  traversed_edges: PipelineEdge[];
}

export interface PipelineSchema {
  nodes: NodeName[];
  edges: PipelineEdge[];
}

export interface HealthInfo {
  status: string;
  service: string;
  provider: string;
}

export type NodeExecutionState = "waiting" | "running" | "completed";

export type ExecutionEventType =
  | "run_started"
  | "node_started"
  | "node_completed"
  | "decision_made"
  | "run_completed";

export interface ExecutionEvent {
  event_type: ExecutionEventType;
  run_id: string;
  node?: NodeName;
  proposal_id?: string;
  step?: TraceStep;
  decision?: Decision;
  traversed_nodes?: string[];
  traversed_edges?: PipelineEdge[];
  sequence?: number;
  timestamp?: number;
  result?: GateEvaluationResult;
}

export interface LiveTraceItem {
  step_number: number;
  node: NodeName;
  state: NodeExecutionState;
  summary: string;
  detail?: string;
  duration_ms?: number;
  status?: StepStatus;
  decision?: Decision | null;
}
