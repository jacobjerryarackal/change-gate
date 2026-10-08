"""Predefined demo software change proposals for ChangeGate."""

from .schemas import ChangeProposal, DiffStat

DEMO_PROPOSALS: list[ChangeProposal] = [
    ChangeProposal(
        id="prop-001",
        title="Add strict type annotations and docstrings to utility helpers",
        summary="Enhance typing coverage in formatting and date utilities without changing runtime behavior.",
        author_type="autonomous_agent",
        author_id="agent-typing-copilot",
        target_branch="main",
        changed_files=["src/utils/formatting.py", "src/utils/date_helpers.py"],
        diff_stat=DiffStat(additions=38, deletions=12, files_changed=2),
        diff_snippet="""@@ -14,8 +14,14 @@
-def format_currency(amount, currency="USD"):
+def format_currency(amount: float | int, currency: str = "USD") -> str:
+    \"\"\"Formats a numeric amount with ISO-4217 standard symbol.\"\"\"
     return f"{currency} {amount:,.2f}"

-def parse_iso_date(dt_str):
+def parse_iso_date(dt_str: str) -> datetime.date:
+    \"\"\"Parses ISO-8601 formatted date strings safely.\"\"\"
     return datetime.date.fromisoformat(dt_str)""",
        tags=["documentation", "types", "low-risk"],
    ),
    ChangeProposal(
        id="prop-002",
        title="Bump httpx from 0.28.0 to 0.28.1",
        summary="Automated patch upgrade to resolve upstream connection timeout race condition.",
        author_type="autonomous_agent",
        author_id="agent-dependabot",
        target_branch="main",
        changed_files=["requirements.txt", "pyproject.toml"],
        diff_stat=DiffStat(additions=2, deletions=2, files_changed=2),
        diff_snippet="""@@ -4,3 +4,3 @@
-httpx==0.28.0
+httpx==0.28.1
 pydantic==2.10.4""",
        tags=["dependency", "patch", "automated-bump"],
    ),
    ChangeProposal(
        id="prop-003",
        title="Deprecate legacy phone_number column in customer_accounts table",
        summary="Alembic schema migration dropping the deprecated phone_number column in favor of user_contacts table.",
        author_type="autonomous_agent",
        author_id="agent-schema-migrator",
        target_branch="main",
        changed_files=["migrations/versions/2026_drop_phone.py", "src/models/customer.py"],
        diff_stat=DiffStat(additions=15, deletions=42, files_changed=2),
        diff_snippet="""@@ -22,6 +22,3 @@
 def upgrade():
-    op.drop_column('customer_accounts', 'phone_number')
+    op.drop_column('customer_accounts', 'phone_number')
-    phone_number = Column(String(32), nullable=True)""",
        tags=["database-migration", "schema-change", "data-platform"],
    ),
    ChangeProposal(
        id="prop-004",
        title="Inline caching layer for high-throughput tenant lookup",
        summary="Refactor tenant resolver to use local LRU cache layer. Introduces cache invalidation logic.",
        author_type="autonomous_agent",
        author_id="agent-perf-optimizer",
        target_branch="main",
        changed_files=["src/tenant/cache.py", "src/tenant/resolver.py"],
        diff_stat=DiffStat(additions=84, deletions=31, files_changed=2),
        diff_snippet="""@@ -10,12 +10,25 @@
+class TenantLruCache:
+    def __init__(self, maxsize: int = 1024):
+        self._store = {}
+    def get(self, tenant_id: str):
+        return self._store.get(tenant_id)
+
 def resolve_tenant(slug: str):
-    return db.query(Tenant).filter_by(slug=slug).first()
+    cached = cache.get(slug)
+    if cached: return cached
+    tenant = db.query(Tenant).filter_by(slug=slug).first()
+    cache.set(slug, tenant)
+    return tenant""",
        tags=["refactoring", "performance", "broken-tests"],
    ),
    ChangeProposal(
        id="prop-005",
        title="Enable wildcard CORS headers and bypass JWT verification for public preview",
        summary="Loosens authorization middleware to allow unauthenticated preview requests across origins.",
        author_type="autonomous_agent",
        author_id="agent-api-expander",
        target_branch="main",
        changed_files=["src/api/middleware.py", "src/auth/jwt_validator.py"],
        diff_stat=DiffStat(additions=19, deletions=28, files_changed=2),
        diff_snippet="""@@ -8,7 +8,7 @@
-CORSMiddleware, allow_origins=ALLOWED_DOMAINS, allow_methods=["GET", "POST"]
+CORSMiddleware, allow_origins=["*"], allow_methods=["*"]

 def verify_token(req: Request):
-    token = extract_bearer_token(req)
-    return decode_and_validate(token)
+    # Skip token verification for staging preview
+    return {"sub": "guest-preview", "role": "admin"}""",
        tags=["security-sensitive", "auth", "security-bypass"],
    ),
]
