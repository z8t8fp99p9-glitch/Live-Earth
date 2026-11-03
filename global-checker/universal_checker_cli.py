#!/usr/bin/env python3
"""Run the universal Global Checker against one Global Collector JSON result.

The optional audit database is the selected View-owned SQLite file. Only the
additive internal audit table is written; post/story rows are never changed.
"""
from __future__ import annotations
import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from universal_checker import check_collection


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--collector-result", required=True, help="Path to Global Collector JSON output.")
    parser.add_argument("--audit-database", help="Optional existing View-owned SQLite DB for internal audit rows.")
    parser.add_argument("--report-output", help="Optional internal JSON report path. Do not place under a public feed directory.")
    args = parser.parse_args(argv)
    connection = None
    try:
        payload = json.loads(Path(args.collector_result).read_text(encoding="utf-8"))
        if args.audit_database:
            db_path = Path(args.audit_database)
            if not db_path.is_file():
                raise FileNotFoundError("Audit database must already exist; Global Checker will not create a new View database.")
            connection = sqlite3.connect(str(db_path))
            connection.row_factory = sqlite3.Row
        result = check_collection(payload, audit_connection=connection)
        rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
        if args.report_output:
            output = Path(args.report_output)
            if any(part in {"published", "public", "assets"} for part in output.parts):
                raise ValueError("Internal audit report cannot be written into a public/published directory.")
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(rendered, encoding="utf-8")
        else:
            sys.stdout.write(rendered)
        # Per-post HOLD decisions are successful Checker outcomes, not a
        # component crash. Only malformed input/evaluation failure exits non-zero.
        return 0
    except Exception as exc:
        sys.stderr.write(json.dumps({"status": "GLOBAL_CHECKER_BLOCKED", "errorType": type(exc).__name__,
                                     "message": str(exc), "lastGoodFeedMustBePreserved": True}, indent=2) + "\n")
        return 2
    finally:
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
