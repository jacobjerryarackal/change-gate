"""Questions schema sent to Jev for gate evaluation."""

from .schemas import ChoiceQuestion, Question

QUESTIONS: dict[str, Question] = {
    "gate_decision": ChoiceQuestion(
        instructions="Evaluate this proposed autonomous software change and determine the gate verdict.",
        criteria={
            "apply": "Change is safe, automated checks pass, and blast radius is low risk. Auto-merge approved.",
            "review": "Change is valid but impacts sensitive infrastructure (e.g. database schema migrations, core configs) requiring human reviewer sign-off.",
            "stop": "Change has failing tests, breaking regressions, security policy violations, or unacceptable risk. Execution must be halted.",
        },
    ),
}
