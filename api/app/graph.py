"""LangGraph state graph definition for ChangeGate."""

from langgraph.graph import END, StateGraph

from .nodes import (
    apply_node,
    checks_node,
    inspect_node,
    make_evaluate_node,
    review_node,
    route_from_evaluate,
    stop_node,
)
from .providers.base import Provider
from .state import ChangeState

NODE_NAMES = ["inspect", "checks", "evaluate", "apply", "review", "stop"]
STATIC_EDGES = [
    ("inspect", "checks"),
    ("checks", "evaluate"),
    ("evaluate", "apply"),
    ("evaluate", "review"),
    ("evaluate", "stop"),
]


def build_graph(provider: Provider):
    """Builds and compiles the ChangeGate StateGraph."""
    graph = StateGraph(ChangeState)

    graph.add_node("inspect", inspect_node)
    graph.add_node("checks", checks_node)
    graph.add_node("evaluate", make_evaluate_node(provider))
    graph.add_node("apply", apply_node)
    graph.add_node("review", review_node)
    graph.add_node("stop", stop_node)

    graph.set_entry_point("inspect")
    graph.add_edge("inspect", "checks")
    graph.add_edge("checks", "evaluate")

    graph.add_conditional_edges(
        "evaluate",
        route_from_evaluate,
        {
            "apply": "apply",
            "review": "review",
            "stop": "stop",
        },
    )

    graph.add_edge("apply", END)
    graph.add_edge("review", END)
    graph.add_edge("stop", END)

    return graph.compile()
