#!/usr/bin/env python3
"""Workflow-safe adapter for the shared LIVE // EARTH Newsroom pipeline.

Expected editorial no-op outcomes exit successfully so the existing View
Publisher can continue. Collection, policy, module, validation and write
failures remain fatal.
"""
from __future__ import annotations
import argparse
import json
import sys
from typing import Any

EXPECTED_NO_OP_PREFIXES = (
    "No source item passed Global Checker editorial intake.",
    "Universal Editorial Engine produced no stories.",
    "Global Checker final review approved no stories.",
)

def _no_op_result(view_id: str, reason: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "pipeline": "LIVE // EARTH Global Newsroom Pipeline",
        "pipelineVersion": "1.0.0",
        "phase": "newsroom-no-op",
        "viewId": view_id,
        "noOpReason": reason,
        "databaseWriteAttempted": False,
        "publisherOutputWritten": False,
        "privacy": {
            "rawSourceTextPersisted": False,
            "evidenceExcerptsPersisted": False,
            "rawHtmlPersisted": False,
            "sharedStoryDatabaseOpened": False,
            "otherViewDatabaseOpened": False,
            "viewDatabasesMixed": False,
            "feedOrPublisherOutputWritten": False,
        },
        "nextSystem": "Matching View Publisher",
    }

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--view", required=True, choices=("nature", "alien-world"))
    parser.add_argument("--repository-root", default=".")
    args = parser.parse_args(argv)
    try:
        import newsroom_pipeline
        result = newsroom_pipeline.run(args.view, args.repository_root)
    except Exception as exc:
        message = str(exc)
        if type(exc).__name__ == "NewsroomPipelineError":
            for prefix in EXPECTED_NO_OP_PREFIXES:
                if message.startswith(prefix):
                    json.dump(_no_op_result(args.view, message), sys.stdout,
                              ensure_ascii=False, indent=2)
                    sys.stdout.write("\\n")
                    return 0
        json.dump({
            "pipeline": "LIVE // EARTH Global Newsroom Pipeline",
            "phase": "newsroom-pipeline-blocked",
            "viewId": args.view,
            "databaseWriteAttempted": False,
            "publisherOutputWritten": False,
            "errorType": type(exc).__name__,
            "message": message[:1200],
        }, sys.stderr, ensure_ascii=False, indent=2)
        sys.stderr.write("\\n")
        return 2
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\\n")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
