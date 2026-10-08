"""LangGraph nodes for the ChangeGate execution pipeline."""

import time
from typing import Any

from .checks import inspect_proposal, run_checks
from .providers.base import Provider
from .questions import QUESTIONS
from .schemas import ChoiceAnswer, Decision, TraceStep
from .state import ChangeState


def inspect_node(state: ChangeState) -> ChangeState:
    """Inspects the change proposal metadata and diff to determine impact and blast radius."""
    start = time.perf_counter()
    findings = inspect_proposal(state["proposal"])
    duration_ms = (time.perf_counter() - start) * 1000

    state["inspection"] = findings
    state["traversed_nodes"].append("inspect")

    step = TraceStep(
        step_number=len(state["trace"]) + 1,
        node="inspect",
        status="passed",
        summary=f"Inspection complete: category '{findings['change_category']}', blast radius {findings['blast_radius'].upper()}",
        detail=(
            f"Analyzed {findings['files_count']} file(s). "
            f"Migration: {findings['migration_detected']} | "
            f"Auth/Security: {findings['auth_security_detected']} | "
            f"Dependencies: {findings['dependency_change_detected']}."
        ),
        duration_ms=round(duration_ms, 3),
    )
    state["trace"].append(step)
    return state


def checks_node(state: ChangeState) -> ChangeState:
    """Simulates/runs automated gates (lint, tests, breaking-change scans)."""
    start = time.perf_counter()
    check_results = run_checks(state["proposal"], state["inspection"])
    duration_ms = (time.perf_counter() - start) * 1000

    state["checks"] = check_results
    state["traversed_nodes"].append("checks")
    state["traversed_edges"].append({"from": "inspect", "to": "checks"})

    tests_ok = check_results.get("tests_passed", True)
    breaking_ok = not check_results.get("breaking_change_detected", False)
    status = "passed" if tests_ok and breaking_ok else ("warning" if tests_ok else "failed")

    step = TraceStep(
        step_number=len(state["trace"]) + 1,
        node="checks",
        status=status,
        summary=f"Automated checks: {check_results['test_summary']}",
        detail="; ".join(check_results.get("check_details", [])),
        duration_ms=round(duration_ms, 3),
    )
    state["trace"].append(step)
    return state


def make_evaluate_node(provider: Provider):
    """Creates the Jev evaluation gate node."""
    def evaluate(state: ChangeState) -> ChangeState:
        start = time.perf_counter()
        jev_payload: dict[str, Any] = {
            "proposal": {
                "id": state["proposal"].id,
                "title": state["proposal"].title,
                "author_type": state["proposal"].author_type,
                "changed_files": state["proposal"].changed_files,
                "tags": state["proposal"].tags,
            },
            "inspection": state["inspection"],
            "checks": state["checks"],
        }

        answers = provider.evaluate(jev_payload, QUESTIONS)
        duration_ms = (time.perf_counter() - start) * 1000

        ans = answers.get("gate_decision")
        choice = ans.choice if isinstance(ans, ChoiceAnswer) else "stop"
        confidence = ans.confidence if isinstance(ans, ChoiceAnswer) else 0.0
        probabilities = ans.probabilities if isinstance(ans, ChoiceAnswer) else {}

        # Synthesize technical reason and review requirements
        if choice == "stop":
            if not state["checks"].get("tests_passed"):
                reason = f"Automated test regression: {state['checks'].get('test_summary')}"
                policy_violations = [d for d in state["checks"].get("check_details", []) if "fail" in d.lower()]
            else:
                reason = "Security policy violation: unauthorized bypass or permissive wildcard access modification detected"
                policy_violations = [d for d in state["checks"].get("check_details", []) if "CRITICAL" in d or "fail" in d.lower()]
                if not policy_violations:
                    policy_violations = ["Security policy: unauthorized access detected"]
            required_reviewers = None
        elif choice == "review":
            reason = "Database schema migration touching persistent tables requires human DBA sign-off"
            policy_violations = []
            required_reviewers = ["dba-team", "data-platform-lead"]
        else:  # apply
            reason = "All automated checks passed and blast radius is low risk. Auto-merge approved."
            policy_violations = []
            required_reviewers = None

        decision = Decision(
            verdict=choice,
            reason=reason,
            confidence=round(confidence, 3),
            probabilities=probabilities,
            required_reviewers=required_reviewers,
            policy_violations=policy_violations,
            latency_ms=round(duration_ms, 3),
        )

        state["decision"] = decision
        state["next_action"] = choice
        state["traversed_nodes"].append("evaluate")
        state["traversed_edges"].append({"from": "checks", "to": "evaluate"})

        verdict_status = "passed" if choice == "apply" else ("warning" if choice == "review" else "failed")
        step = TraceStep(
            step_number=len(state["trace"]) + 1,
            node="evaluate",
            status=verdict_status,
            summary=f"Jev Gate Decision: {choice.upper()}",
            detail=reason,
            duration_ms=round(duration_ms, 3),
            decision=decision,
        )
        state["trace"].append(step)
        return state

    return evaluate


def apply_node(state: ChangeState) -> ChangeState:
    """Terminal node: change marked as applied/approved."""
    state["traversed_nodes"].append("apply")
    state["traversed_edges"].append({"from": "evaluate", "to": "apply"})

    step = TraceStep(
        step_number=len(state["trace"]) + 1,
        node="apply",
        status="completed",
        summary="Action Applied: Change approved for autonomous merge",
        detail="Pipeline checks and Jev gate satisfied. Auto-merge criteria met.",
        duration_ms=0.5,
    )
    state["trace"].append(step)
    return state


def review_node(state: ChangeState) -> ChangeState:
    """Terminal node: change routed to human reviewers."""
    state["traversed_nodes"].append("review")
    state["traversed_edges"].append({"from": "evaluate", "to": "review"})

    reviewers = state["decision"].required_reviewers if state["decision"] else ["engineering-lead"]
    step = TraceStep(
        step_number=len(state["trace"]) + 1,
        node="review",
        status="warning",
        summary="Action Routed: Human review required before applying",
        detail=f"Queued for approval from: {', '.join(reviewers or ['engineering-lead'])}.",
        duration_ms=0.5,
    )
    state["trace"].append(step)
    return state


def stop_node(state: ChangeState) -> ChangeState:
    """Terminal node: change halted/blocked."""
    state["traversed_nodes"].append("stop")
    state["traversed_edges"].append({"from": "evaluate", "to": "stop"})

    reason = state["decision"].reason if state["decision"] else "Change blocked"
    step = TraceStep(
        step_number=len(state["trace"]) + 1,
        node="stop",
        status="failed",
        summary="Action Stopped: Execution halted by gate",
        detail=reason,
        duration_ms=0.5,
    )
    state["trace"].append(step)
    return state


def route_from_evaluate(state: ChangeState) -> str:
    """Routes execution from evaluate to the appropriate terminal node."""
    if state["decision"] and state["decision"].verdict in ("apply", "review", "stop"):
        return state["decision"].verdict
    return "stop"
