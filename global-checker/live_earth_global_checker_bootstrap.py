#!/usr/bin/env python3
"""Automatic LIVE // EARTH Global Checker dispatch for existing workflows.

Installed by the existing shared Editorial Engine dependency step. The Python
.pth hook dispatches both feed views into their single-owner adapters before
the original Collector or Publisher starts. No workflow YAML changes required.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ENTRYPOINTS = {
    "nature/collector/collector.py": ("collect", "nature", "nature_pipeline.py"),
    "nature/publisher/publisher.py": ("publish", "nature", "nature_pipeline.py"),
    "alien-world/collector/collector.py": ("collect", "alien-world", "alien_world_pipeline.py"),
    "alien-world/publisher/publisher.py": ("publish", "alien-world", "alien_world_pipeline.py"),
}
ACTIVE_ENV = "LIVE_EARTH_GLOBAL_CHECKER_ROUTED"


def _match_entrypoint(script_path: Path):
    parts = script_path.parts
    for relative, route in ENTRYPOINTS.items():
        expected = Path(relative).parts
        if len(parts) >= len(expected) and parts[-len(expected):] == expected:
            root = script_path.parents[len(expected) - 1]
            if (root / "editorial-engine" / "requirements.txt").is_file():
                return root, relative, route
    return None


def bootstrap() -> None:
    if os.environ.get(ACTIVE_ENV) == "1" or not sys.argv:
        return
    try:
        script_path = Path(sys.argv[0]).resolve()
    except (OSError, RuntimeError, TypeError, ValueError):
        return
    matched = _match_entrypoint(script_path)
    if matched is None:
        return
    root, _relative, (phase, view_id, runner_name) = matched
    runner = root / "global-checker" / runner_name
    if not runner.is_file():
        raise RuntimeError(
            f"Global Checker runner is missing ({runner_name}); refusing to run an unchecked pipeline."
        )
    os.environ[ACTIVE_ENV] = "1"
    print(
        f"GLOBAL CHECKER AUTO-ROUTE: {view_id} {phase} via {runner_name}",
        file=sys.stderr,
    )
    os.execv(sys.executable, [sys.executable, str(runner), phase, "--view", view_id])
