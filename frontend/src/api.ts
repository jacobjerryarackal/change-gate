import type {
  ChangeProposal,
  GateEvaluationResult,
  HealthInfo,
  PipelineSchema,
} from "./types";

const BASE = "/api";

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
