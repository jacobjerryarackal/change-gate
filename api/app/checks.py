"""Deterministic inspection and check services for ChangeGate."""

from typing import Any
from .schemas import ChangeProposal


def inspect_proposal(proposal: ChangeProposal) -> dict[str, Any]:
    """Inspects a ChangeProposal and produces structured findings."""
    files = [f.lower() for f in proposal.changed_files]
    tags = [t.lower() for t in proposal.tags]
    diff = proposal.diff_snippet.lower()

    # Migration detection
    migration_detected = any(
        "migration" in f or "schema" in f or f.endswith(".sql") or "alembic" in f or "prisma" in f
        for f in files
    ) or any("migration" in t or "schema" in t for t in tags)

    # Auth / Security-sensitive detection
    auth_security_detected = any(
        "auth" in f or "security" in f or "jwt" in f or "permission" in f or "cors" in f or "token" in f
        for f in files
    ) or any("security" in t or "auth" in t for t in tags)

    # Dependency detection
    dependency_change_detected = any(
        f.endswith("requirements.txt") or f.endswith("pyproject.toml") or f.endswith("package.json") or f.endswith("go.mod")
        for f in files
    ) or any("dependency" in t for t in tags)

    # Test files detection
    test_files_changed = any("test" in f or "spec" in f for f in files)

    # Categorization
    if auth_security_detected or "security-bypass" in tags:
        category = "security_auth"
    elif migration_detected:
        category = "database_migration"
    elif dependency_change_detected:
        category = "dependency"
    elif any("doc" in t or "type" in t for t in tags) and not migration_detected and not auth_security_detected:
        category = "documentation"
    else:
        category = "refactoring"

    # Blast radius computation
    if "security-bypass" in tags or ("cors" in diff and "allow_origins=['*']" in diff.replace(" ", "")):
        blast_radius = "critical"
    elif migration_detected:
        blast_radius = "high"
    elif dependency_change_detected or category == "refactoring":
        blast_radius = "medium"
    else:
        blast_radius = "low"

    return {
        "files_changed": proposal.changed_files,
        "files_count": len(proposal.changed_files),
        "change_category": category,
        "migration_detected": migration_detected,
        "auth_security_detected": auth_security_detected,
        "dependency_change_detected": dependency_change_detected,
        "test_files_changed": test_files_changed,
        "blast_radius": blast_radius,
    }


def run_checks(proposal: ChangeProposal, inspection: dict[str, Any]) -> dict[str, Any]:
    """Runs deterministic checks for the proposed change."""
    tags = [t.lower() for t in proposal.tags]
    prop_id = proposal.id.lower()

    # Scenario 4: Broken tests / regression
    if "broken-tests" in tags or "failing-checks" in tags or prop_id == "prop-004":
        return {
            "tests_passed": False,
            "tests_failed_count": 2,
            "test_summary": "14 passed, 2 failed in tests/test_tenant_cache.py",
            "lint_status": "warnings",
            "breaking_change_detected": True,
            "check_details": [
                "Integration test suite: 2 test failures (test_cache_invalidation, test_ttl_expiry)",
                "Linter: 1 warning (unused variable in tenant_resolver.py)",
                "Type check: passed with 0 errors",
            ],
        }

    # Scenario 5: Security auth bypass
    if "security-bypass" in tags or prop_id == "prop-005":
        return {
            "tests_passed": True,
            "tests_failed_count": 0,
            "test_summary": "18 passed, 0 failed in tests/test_auth.py",
            "lint_status": "clean",
            "breaking_change_detected": True,
            "check_details": [
                "Static security analyzer: CRITICAL - Wildcard CORS origin and unauthenticated route added",
                "Unit tests: 18 passed",
                "Linter: clean",
            ],
        }

    # Scenario 3: Database migration
    if inspection.get("migration_detected") or prop_id == "prop-003":
        return {
            "tests_passed": True,
            "tests_failed_count": 0,
            "test_summary": "42 passed, 0 failed (database migration dry-run succeeded)",
            "lint_status": "clean",
            "breaking_change_detected": True,
            "check_details": [
                "Database dry-run: Table 'customer_accounts' modified (column drop)",
                "Migration lock check: clean",
                "Regression tests: all passed",
            ],
        }

    # Routine green scenarios (Scenario 1 & 2)
    return {
        "tests_passed": True,
        "tests_failed_count": 0,
        "test_summary": "All automated test suites passed (32 passed, 0 failed)",
        "lint_status": "clean",
        "breaking_change_detected": False,
        "check_details": [
            "Linter: clean, formatted",
            "Static type analysis: 0 type errors detected",
            "Unit test suite: 100% pass rate",
        ],
    }
