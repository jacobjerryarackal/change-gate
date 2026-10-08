"""FastAPI application for ChangeGate."""

import time
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .fixtures import DEMO_PROPOSALS
from .graph import NODE_NAMES, STATIC_EDGES, build_graph
from .providers import get_provider
from .schemas import (
    ChangeProposal,
    EvaluationRequest,
    GateEvaluationResult,
)
from .state import initial_state

app = FastAPI(
    title="ChangeGate",
    description="Developer-infrastructure tool evaluating autonomous software change proposals via LangGraph & Jev.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_runs: list[GateEvaluationResult] = []
_MAX_LOG = 30

router = APIRouter()


@router.get("/proposals", response_model=list[ChangeProposal])
def list_proposals() -> list[ChangeProposal]:
    """Returns the predefined demo proposals."""
    return DEMO_PROPOSALS


@router.post("/evaluate", response_model=GateEvaluationResult)
def evaluate_proposal(req: EvaluationRequest) -> GateEvaluationResult:
    """Evaluates a change proposal through the ChangeGate LangGraph pipeline."""
    # Find matching proposal or use provided custom proposal
    proposal: ChangeProposal | None = None
    if req.proposal:
        proposal = req.proposal
    elif req.proposal_id:
        proposal = next((p for p in DEMO_PROPOSALS if p.id == req.proposal_id), None)
        if not proposal:
            raise HTTPException(status_code=404, detail=f"Proposal '{req.proposal_id}' not found")
    else:
        # Default to first proposal if none specified
        proposal = DEMO_PROPOSALS[0]

    provider = get_provider(config.JEV_PROVIDER)
    graph = build_graph(provider)

    state = initial_state(proposal)
    final_state = graph.invoke(state)

    if not final_state.get("decision"):
        raise HTTPException(status_code=500, detail="Gate execution failed to reach a decision")

    result = GateEvaluationResult(
        proposal=final_state["proposal"],
        trace=final_state["trace"],
        decision=final_state["decision"],
        traversed_nodes=final_state["traversed_nodes"],
        traversed_edges=final_state["traversed_edges"],
    )

    _runs.insert(0, result)
    del _runs[_MAX_LOG:]
    return result


@router.get("/runs", response_model=list[GateEvaluationResult])
def list_runs() -> list[GateEvaluationResult]:
    """Returns recent evaluation runs."""
    return _runs


@router.get("/pipeline-schema")
def pipeline_schema() -> dict:
    """Returns nodes and edges of the ChangeGate pipeline."""
    return {
        "nodes": NODE_NAMES,
        "edges": [{"from": a, "to": b} for a, b in STATIC_EDGES],
    }


@router.get("/health")
def health() -> dict:
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "ChangeGate",
        "provider": config.JEV_PROVIDER,
    }


# Mount router at both root and /api for compatibility across reverse proxies and dev servers
app.include_router(router)
app.include_router(router, prefix="/api")
