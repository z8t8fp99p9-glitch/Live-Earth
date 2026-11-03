#!/usr/bin/env python3
"""Internal-only audit queries for Global Checker decisions."""
from __future__ import annotations
import json
from typing import Any

TABLE = "global_checker_audit_log"


def query_audit(connection, *, post_id: str = "", job_id: str = "", view_id: str = "",
                limit: int = 500) -> list[dict[str, Any]]:
    """Return internal decision rows; never reads or writes public feed files."""
    clauses, params = [], []
    for column, value in (("post_id", post_id), ("job_id", job_id), ("view_id", view_id)):
        if value:
            clauses.append(f"{column}=?")
            params.append(value)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    limit = max(1, min(int(limit), 5000))
    cursor = connection.execute(
        f"SELECT * FROM {TABLE}{where} ORDER BY checked_at DESC, audit_row_id DESC LIMIT ?",
        (*params, limit),
    )
    columns = [column[0] for column in cursor.description]
    rows = cursor.fetchall()
    result = []
    for row in rows:
        item = dict(row) if hasattr(row, "keys") else dict(zip(columns, row))
        for key in ("assignment_ids_json", "source_ids_json", "details_json"):
            try:
                item[key.removesuffix("_json")] = json.loads(item.pop(key))
            except (TypeError, json.JSONDecodeError):
                item[key.removesuffix("_json")] = item.pop(key)
        result.append(item)
    return result


def summarize_audit(rows: list[dict[str, Any]]) -> dict[str, Any]:
    counts: dict[str, int] = {}
    posts: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        stage = str(row.get("stage", "unknown"))
        counts[stage] = counts.get(stage, 0) + 1
        key = (str(row.get("view_id", "")), str(row.get("post_id", "")))
        post = posts.setdefault(key, {"viewId": key[0], "postId": key[1], "checks": {}})
        post["checks"].setdefault(stage, []).append({
            "verdict": row.get("verdict"), "allowed": bool(row.get("allowed")),
            "policyId": row.get("policy_id", ""), "decisionId": row.get("decision_id", ""),
            "checkedAt": row.get("checked_at"), "jobId": row.get("job_id", ""),
        })
    return {"visibility": "INTERNAL_ONLY", "rows": len(rows), "stageCounts": counts,
            "posts": list(posts.values())}
