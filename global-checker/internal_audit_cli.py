#!/usr/bin/env python3
"""Read-only viewer for the internal Global Checker audit log."""
from __future__ import annotations
import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from internal_audit import query_audit, summarize_audit


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True, help="Existing View-owned SQLite database.")
    parser.add_argument("--post-id", default="", help="Show all decisions for one postId.")
    parser.add_argument("--job-id", default="", help="Show all decisions for one Manager jobId.")
    parser.add_argument("--view-id", default="", help="Filter to one View.")
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--format", choices=("json", "summary"), default="json")
    args = parser.parse_args(argv)
    try:
        path = Path(args.database)
        if not path.is_file():
            raise FileNotFoundError("The selected View database does not exist.")
        db = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
        db.row_factory = sqlite3.Row
        try:
            rows = query_audit(db, post_id=args.post_id, job_id=args.job_id,
                               view_id=args.view_id, limit=args.limit)
        finally:
            db.close()
        result = summarize_audit(rows) if args.format == "summary" else {
            "visibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION", "rows": rows,
        }
        sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
        return 0
    except Exception as exc:
        sys.stderr.write(json.dumps({"status": "AUDIT_READ_FAILED", "errorType": type(exc).__name__,
                                     "message": str(exc)}, indent=2) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
