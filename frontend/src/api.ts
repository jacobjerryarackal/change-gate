import type {
  ChangeProposal,
  ExecutionEvent,
  ExecutionEventType,
  GateEvaluationResult,
  HealthInfo,
  PipelineSchema,
} from "./types";

const API_HOST = import.meta.env.VITE_API_URL || "";
const BASE = `${API_HOST}/api`;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const getProposals = (): Promise<ChangeProposal[]> =>
  fetch(`${BASE}/proposals`).then((r) => json<ChangeProposal[]>(r));

export const evaluateProposal = (proposalId?: string): Promise<GateEvaluationResult> =>
  fetch(`${BASE}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proposalId ? { proposal_id: proposalId } : {}),
  }).then((r) => json<GateEvaluationResult>(r));

export const getRuns = (): Promise<GateEvaluationResult[]> =>
  fetch(`${BASE}/runs`).then((r) => json<GateEvaluationResult[]>(r));

export const getPipelineSchema = (): Promise<PipelineSchema> =>
  fetch(`${BASE}/pipeline-schema`).then((r) => json<PipelineSchema>(r));

export const getHealth = (): Promise<HealthInfo> =>
  fetch(`${BASE}/health`).then((r) => json<HealthInfo>(r));

export function streamEvaluation(
  proposalId: string,
  onEvent: (event: ExecutionEvent) => void,
  onError: (err: Error) => void
): () => void {
  const url = `${BASE}/evaluate/stream?proposal_id=${encodeURIComponent(proposalId)}`;
  const eventSource = new EventSource(url);

  const eventTypes: ExecutionEventType[] = [
    "run_started",
    "node_started",
    "node_completed",
    "decision_made",
    "run_completed",
  ];

  eventTypes.forEach((type) => {
    eventSource.addEventListener(type, (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as ExecutionEvent;
        onEvent(parsed);
        if (type === "run_completed") {
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    });
  });

  eventSource.onerror = () => {
    eventSource.close();
    onError(new Error("Evaluation stream disconnected"));
  };

  return () => {
    eventSource.close();
  };
}
