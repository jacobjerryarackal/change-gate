"""Pydantic models for ChangeGate and the Jev HTTP API wire protocol."""

from typing import Any, Literal, Union
from pydantic import BaseModel, ConfigDict, Field

# =====================================================================
# Jev Wire Protocol (Request & Response schemas)
# =====================================================================

class NoulQuestion(BaseModel):
    type: Literal["noul"] = "noul"
    instructions: str
    criteria: dict[str, str] | None = None


class ChoiceQuestion(BaseModel):
    type: Literal["choice"] = "choice"
    instructions: str
    criteria: dict[str, str]  # option_key -> description


class ScoreQuestion(BaseModel):
    type: Literal["score"] = "score"
    instructions: str
    criteria: list[str]


Question = Union[NoulQuestion, ChoiceQuestion, ScoreQuestion]


class JevRequest(BaseModel):
    state: str | dict | list
    model: str = "jev-latest"
    questions: dict[str, Question]


class NoulAnswer(BaseModel):
    type: Literal["noul"] = "noul"
    noul: float


class ChoiceAnswer(BaseModel):
    type: Literal["choice"] = "choice"
    choice: str
    probabilities: dict[str, float]
    confidence: float


class ScoreAnswer(BaseModel):
    type: Literal["score"] = "score"
    score: float
    legend: dict[str, str] = {}
    probabilities: dict[str, float] = {}
    confidence: float


Answer = Union[NoulAnswer, ChoiceAnswer, ScoreAnswer]


class Usage(BaseModel):
    input_tokens: int
    output_tokens: int


class JevResponse(BaseModel):
    model: str
    answers: dict[str, Answer]
    usage: Usage


# =====================================================================
# ChangeGate Domain Models
# =====================================================================

class DiffStat(BaseModel):
    additions: int
    deletions: int
    files_changed: int


class ChangeProposal(BaseModel):
    id: str
    title: str
    summary: str
    author_type: Literal["autonomous_agent", "human"]
    author_id: str
    target_branch: str
    changed_files: list[str]
    diff_stat: DiffStat
    diff_snippet: str
    tags: list[str] = Field(default_factory=list)


class Decision(BaseModel):
    verdict: Literal["apply", "review", "stop"]
    reason: str
    confidence: float
    probabilities: dict[str, float]
    required_reviewers: list[str] | None = None
    policy_violations: list[str] = Field(default_factory=list)
    latency_ms: float = 0.0


class TraceStep(BaseModel):
    step_number: int
    node: Literal["inspect", "checks", "evaluate", "apply", "review", "stop"]
    status: Literal["passed", "warning", "failed", "completed"]
    summary: str
    detail: str
    duration_ms: float
    decision: Decision | None = None


class GraphEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    from_node: str = Field(alias="from")
    to_node: str = Field(alias="to")


class GateEvaluationResult(BaseModel):
    proposal: ChangeProposal
    trace: list[TraceStep]
    decision: Decision
    traversed_nodes: list[str]
    traversed_edges: list[dict[str, str]]


class EvaluationRequest(BaseModel):
    proposal_id: str | None = None
    proposal: ChangeProposal | None = None
