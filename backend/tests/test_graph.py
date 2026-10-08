"""Unit and integration tests for the ChangeGate LangGraph pipeline."""

import pytest
from app.fixtures import DEMO_PROPOSALS
from app.graph import build_graph
from app.providers.mock import MockProvider
from app.state import initial_state


@pytest.fixture
def provider():
    return MockProvider()


@pytest.fixture
def graph(provider):
    return build_graph(provider)


def test_scenario_1_docstring_type_fix_applies(graph):
    """Scenario 1: Safe docstring and type fix should be approved and applied."""
    prop = DEMO_PROPOSALS[0]
    result = graph.invoke(initial_state(prop))

    assert result["decision"] is not None
    assert result["decision"].verdict == "apply"
    assert "apply" in result["traversed_nodes"]
    assert "stop" not in result["traversed_nodes"]
    assert "review" not in result["traversed_nodes"]
    assert result["traversed_nodes"] == ["inspect", "checks", "evaluate", "apply"]


def test_scenario_2_patch_dependency_bump_applies(graph):
    """Scenario 2: Automated patch dependency bump should be approved and applied."""
    prop = DEMO_PROPOSALS[1]
    result = graph.invoke(initial_state(prop))

    assert result["decision"] is not None
    assert result["decision"].verdict == "apply"
    assert result["traversed_nodes"] == ["inspect", "checks", "evaluate", "apply"]


def test_scenario_3_database_migration_requires_review(graph):
    """Scenario 3: Database column drop should require human review."""
    prop = DEMO_PROPOSALS[2]
    result = graph.invoke(initial_state(prop))

    assert result["decision"] is not None
    assert result["decision"].verdict == "review"
    assert result["decision"].required_reviewers is not None
    assert "dba-team" in result["decision"].required_reviewers
    assert result["traversed_nodes"] == ["inspect", "checks", "evaluate", "review"]


def test_scenario_4_broken_tests_stops(graph):
    """Scenario 4: Refactoring with failing tests must be halted."""
    prop = DEMO_PROPOSALS[3]
    result = graph.invoke(initial_state(prop))

    assert result["decision"] is not None
    assert result["decision"].verdict == "stop"
    assert "tests failed" in result["decision"].reason.lower() or "regression" in result["decision"].reason.lower()
    assert result["traversed_nodes"] == ["inspect", "checks", "evaluate", "stop"]


def test_scenario_5_security_bypass_stops(graph):
    """Scenario 5: Unauthorized CORS wildcard and auth bypass must be halted."""
    prop = DEMO_PROPOSALS[4]
    result = graph.invoke(initial_state(prop))

    assert result["decision"] is not None
    assert result["decision"].verdict == "stop"
    assert "security" in result["decision"].reason.lower()
    assert len(result["decision"].policy_violations) > 0
    assert result["traversed_nodes"] == ["inspect", "checks", "evaluate", "stop"]


def test_trace_step_ordering_and_continuity(graph):
    """Verify that every execution step produces an ordered, coherent trace step."""
    prop = DEMO_PROPOSALS[0]
    result = graph.invoke(initial_state(prop))

    trace = result["trace"]
    assert len(trace) == 4
    step_numbers = [s.step_number for s in trace]
    nodes = [s.node for s in trace]

    assert step_numbers == [1, 2, 3, 4]
    assert nodes == ["inspect", "checks", "evaluate", "apply"]

    # Verify evaluate step contains decision metadata
    evaluate_step = trace[2]
    assert evaluate_step.decision is not None
    assert evaluate_step.decision.verdict == "apply"
    assert evaluate_step.duration_ms >= 0


def test_traversed_edges(graph):
    """Verify that traversed_edges correctly records directional connections."""
    prop = DEMO_PROPOSALS[2]
    result = graph.invoke(initial_state(prop))

    edges = result["traversed_edges"]
    assert edges == [
        {"from": "inspect", "to": "checks"},
        {"from": "checks", "to": "evaluate"},
        {"from": "evaluate", "to": "review"},
    ]


def test_deterministic_mock_provider(provider):
    """Confirm the mock provider returns strictly deterministic results on repeated calls."""
    from app.questions import QUESTIONS

    payload = {
        "proposal": {"tags": ["database-migration"]},
        "inspection": {"migration_detected": True},
        "checks": {"tests_passed": True},
    }

    ans1 = provider.evaluate(payload, QUESTIONS)
    ans2 = provider.evaluate(payload, QUESTIONS)

    assert ans1["gate_decision"].choice == ans2["gate_decision"].choice
    assert ans1["gate_decision"].confidence == ans2["gate_decision"].confidence
    assert ans1["gate_decision"].probabilities == ans2["gate_decision"].probabilities
