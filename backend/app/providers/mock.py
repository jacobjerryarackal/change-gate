"""Deterministic mock provider for ChangeGate. Evaluates structured software change state."""

from typing import Any
from ..schemas import Answer, ChoiceAnswer, ChoiceQuestion, Question
from .base import Provider


class MockProvider(Provider):
    """Local, deterministic stand-in for Jev. Evaluates the structured ChangeGate state."""

    name = "mock"

    def evaluate(self, state: str | dict, questions: dict[str, Question]) -> dict[str, Answer]:
        s = state if isinstance(state, dict) else {}
        proposal: dict[str, Any] = s.get("proposal", {})
        inspection: dict[str, Any] = s.get("inspection", {})
        checks: dict[str, Any] = s.get("checks", {})
        tags: list[str] = [t.lower() for t in proposal.get("tags", [])]

        # 1. Broken tests / check failure -> stop
        if checks.get("tests_passed") is False or checks.get("tests_failed_count", 0) > 0:
            verdict = "stop"
            reason = f"Automated test regression: {checks.get('test_summary', 'tests failed')}"
            confidence = 0.99
            probabilities = {"stop": 0.99, "review": 0.01, "apply": 0.00}

        # 2. Security / Auth bypass -> stop
        elif (
            "security-bypass" in tags
            or inspection.get("blast_radius") == "critical"
            or (inspection.get("auth_security_detected") and "bypass" in proposal.get("title", "").lower())
        ):
            verdict = "stop"
            reason = "Security policy violation: unauthorized bypass or permissive wildcard access modification detected"
            confidence = 0.98
            probabilities = {"stop": 0.98, "review": 0.02, "apply": 0.00}

        # 3. Database schema mutation -> review
        elif inspection.get("migration_detected") or "database-migration" in tags:
            verdict = "review"
            reason = "Database schema mutation detected: table alteration requires DBA human sign-off"
            confidence = 0.94
            probabilities = {"review": 0.94, "apply": 0.04, "stop": 0.02}

        # 4. Safe documentation / typing fix -> apply
        elif inspection.get("change_category") == "documentation" or any("type" in t or "doc" in t for t in tags):
            verdict = "apply"
            reason = "Low-risk non-functional change: documentation and type annotations verified with all checks green"
            confidence = 0.97
            probabilities = {"apply": 0.97, "review": 0.02, "stop": 0.01}

        # 5. Patch dependency bump -> apply
        elif inspection.get("change_category") == "dependency" and inspection.get("blast_radius") == "medium":
            verdict = "apply"
            reason = "Automated patch dependency bump: clean test suite and zero breaking changes detected"
            confidence = 0.95
            probabilities = {"apply": 0.95, "review": 0.04, "stop": 0.01}

        # 6. Fallback rule
        elif checks.get("breaking_change_detected"):
            verdict = "review"
            reason = "Potential breaking change flagged during automated inspection"
            confidence = 0.88
            probabilities = {"review": 0.88, "stop": 0.08, "apply": 0.04}
        else:
            verdict = "apply"
            reason = "Routine autonomous change with verified passing checks and low blast radius"
            confidence = 0.92
            probabilities = {"apply": 0.92, "review": 0.06, "stop": 0.02}

        answers: dict[str, Answer] = {}
        for qid, q in questions.items():
            if isinstance(q, ChoiceQuestion):
                answers[qid] = ChoiceAnswer(
                    choice=verdict,
                    probabilities=probabilities,
                    confidence=confidence,
                )
        return answers
