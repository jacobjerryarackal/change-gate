"""Validation script for ChangeGate Phase 1.
Starts uvicorn in a background process, tests all endpoints via httpx,
and prints the resulting traversal and execution trace for each scenario.
"""

import sys
import time
import subprocess
import httpx

PORT = 8008
BASE_URL = f"http://127.0.0.1:{PORT}"

def run_validation():
    print("=" * 70)
    print("STARTING CHANGEGATE FASTAPI SERVER LOCALLY...")
    print("=" * 70)
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(PORT), "--app-dir", "backend"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    time.sleep(2)

    try:
        with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
            # 1. Health check
            resp = client.get("/api/health")
            print(f"GET /api/health -> {resp.status_code} {resp.json()}\n")
            assert resp.status_code == 200

            # 2. Pipeline schema
            schema_resp = client.get("/api/pipeline-schema")
            print(f"GET /api/pipeline-schema -> {schema_resp.status_code}")
            print(f"Nodes: {schema_resp.json()['nodes']}\n")
            assert schema_resp.status_code == 200

            # 3. GET /api/proposals
            proposals_resp = client.get("/api/proposals")
            proposals = proposals_resp.json()
            print(f"GET /api/proposals -> {proposals_resp.status_code} ({len(proposals)} proposals found)\n")
            assert proposals_resp.status_code == 200
            assert len(proposals) == 5

            # 4. POST /api/evaluate for all 5 proposals
            for idx, prop in enumerate(proposals, 1):
                prop_id = prop["id"]
                title = prop["title"]
                print("-" * 70)
                print(f"SCENARIO {idx}: [{prop_id}] {title}")
                print(f"Author: {prop['author_id']} ({prop['author_type']}) | Tags: {prop['tags']}")
                
                eval_resp = client.post("/api/evaluate", json={"proposal_id": prop_id})
                assert eval_resp.status_code == 200, f"Failed on {prop_id}: {eval_resp.text}"
                data = eval_resp.json()

                decision = data["decision"]
                traversed_nodes = data["traversed_nodes"]
                traversed_edges = data["traversed_edges"]
                trace = data["trace"]

                print(f"\n>> VERDICT: {decision['verdict'].upper()}")
                print(f">> REASON:  {decision['reason']}")
                print(f">> CONFIDENCE: {decision['confidence'] * 100:.1f}% | LATENCY: {decision['latency_ms']:.2f}ms")
                if decision.get("required_reviewers"):
                    print(f">> REQUIRED REVIEWERS: {decision['required_reviewers']}")
                if decision.get("policy_violations"):
                    print(f">> POLICY VIOLATIONS:  {decision['policy_violations']}")

                print(f"\n>> TRAVERSED PATH: {' -> '.join(traversed_nodes)}")
                print(f">> EDGES: {traversed_edges}")

                print("\n>> EXECUTION TRACE:")
                for step in trace:
                    print(f"   [{step['step_number']}] node={step['node']:<8} status={step['status']:<9} duration={step['duration_ms']:.2f}ms | {step['summary']}")
                    print(f"       detail: {step['detail']}")
                print("-" * 70 + "\n")

            # 5. Check run history
            runs_resp = client.get("/api/runs")
            assert runs_resp.status_code == 200
            print(f"GET /api/runs -> {len(runs_resp.json())} run(s) logged in memory.")

    finally:
        server_process.terminate()
        server_process.wait()
        print("\nFastAPI server terminated cleanly.")

if __name__ == "__main__":
    run_validation()
