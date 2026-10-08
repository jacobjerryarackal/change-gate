"""Execution state definition for ChangeGate."""

from typing import Any, TypedDict
from .schemas import ChangeProposal, Decision, TraceStep


class ChangeState(TypedDict):
    proposal: ChangeProposal
    inspection: dict[str, Any]
    checks: dict[str, Any]
    decision: Decision | None
    trace: list[TraceStep]
    traversed_nodes: list[str]
    traversed_edges: list[dict[str, str]]
    next_action: str | None


def initial_state(proposal: ChangeProposal) -> ChangeState:
    """Initializes empty execution state for a proposal."""
    return ChangeState(
        proposal=proposal,
        inspection={},
        checks={},
        decision=None,
        trace=[],
        traversed_nodes=[],
        traversed_edges=[],
        next_action=None,
    )
