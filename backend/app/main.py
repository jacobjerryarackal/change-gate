import asyncio
import json
import time
import uuid
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

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


async def stream_proposal_evaluation(proposal: ChangeProposal):
    """Executes proposal evaluation while yielding SSE execution events."""
    run_id = f"run-{uuid.uuid4().hex[:8]}"
    seq = 0

    def sse(event_type: str, data: dict) -> str:
        return f"event: {event_type}\ndata: {json.dumps(data, default=str)}\n\n"

    # 1. run_started
    seq += 1
    yield sse("run_started", {
        "event_type": "run_started",
        "run_id": run_id,
        "proposal_id": proposal.id,
        "sequence": seq,
        "timestamp": time.time(),
    })
    await asyncio.sleep(0.15)

    provider = get_provider(config.JEV_PROVIDER)
    graph = build_graph(provider)
    state = initial_state(proposal)

    for step in graph.stream(state):
        node_name = list(step.keys())[0]
        node_state = step[node_name]

        # 2. node_started
        seq += 1
        yield sse("node_started", {
            "event_type": "node_started",
            "run_id": run_id,
            "node": node_name,
            "sequence": seq,
            "timestamp": time.time(),
        })
        # Visual dwell time so user can observe execution progress
        await asyncio.sleep(0.3)

        # Node trace step produced
        step_trace = node_state["trace"][-1] if node_state.get("trace") else None
        step_trace_dict = step_trace.model_dump() if step_trace else None

        # Emit decision_made event when evaluate produces decision
        if node_name == "evaluate" and node_state.get("decision"):
            seq += 1
            decision_dict = node_state["decision"].model_dump()
            yield sse("decision_made", {
                "event_type": "decision_made",
                "run_id": run_id,
                "node": "evaluate",
                "decision": decision_dict,
                "sequence": seq,
                "timestamp": time.time(),
            })
            await asyncio.sleep(0.2)

        # 3. node_completed
        seq += 1
        yield sse("node_completed", {
            "event_type": "node_completed",
            "run_id": run_id,
            "node": node_name,
            "step": step_trace_dict,
            "traversed_nodes": node_state.get("traversed_nodes", []),
            "traversed_edges": node_state.get("traversed_edges", []),
            "sequence": seq,
            "timestamp": time.time(),
        })
        await asyncio.sleep(0.2)

        state = node_state

    # 4. run_completed
    if state.get("decision"):
        result = GateEvaluationResult(
            proposal=state["proposal"],
            trace=state["trace"],
            decision=state["decision"],
            traversed_nodes=state["traversed_nodes"],
            traversed_edges=state["traversed_edges"],
        )
        _runs.insert(0, result)
        del _runs[_MAX_LOG:]

        seq += 1
        yield sse("run_completed", {
            "event_type": "run_completed",
            "run_id": run_id,
            "sequence": seq,
            "timestamp": time.time(),
            "result": result.model_dump(),
        })


@router.get("/evaluate/stream")
async def evaluate_proposal_stream(proposal_id: str | None = None) -> StreamingResponse:
    """Streams live execution events for a change proposal via SSE."""
    proposal: ChangeProposal | None = None
    if proposal_id:
        proposal = next((p for p in DEMO_PROPOSALS if p.id == proposal_id), None)
        if not proposal:
            raise HTTPException(status_code=404, detail=f"Proposal '{proposal_id}' not found")
    else:
        proposal = DEMO_PROPOSALS[0]

    return StreamingResponse(
        stream_proposal_evaluation(proposal),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/evaluate/stream")
async def evaluate_proposal_stream_post(req: EvaluationRequest) -> StreamingResponse:
    """Streams live execution events for an evaluation request via SSE."""
    proposal: ChangeProposal | None = None
    if req.proposal:
        proposal = req.proposal
    elif req.proposal_id:
        proposal = next((p for p in DEMO_PROPOSALS if p.id == req.proposal_id), None)
        if not proposal:
            raise HTTPException(status_code=404, detail=f"Proposal '{req.proposal_id}' not found")
    else:
        proposal = DEMO_PROPOSALS[0]

    return StreamingResponse(
        stream_proposal_evaluation(proposal),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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
