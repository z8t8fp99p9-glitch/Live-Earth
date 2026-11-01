#!/usr/bin/env python3
"""Automatic LIVE // EARTH Global Checker dispatch for existing pipeline scripts.

Installed by the existing shared Editorial Engine requirements step. The .pth
startup hook calls bootstrap() before a Python script starts. Only the four
registered Nature/Alien World Collector/Publisher entrypoints are redirected;
all other Python commands continue normally.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ENTRYPOINTS = {
    "nature/collector/collector.py": ("collect", "nature"),
    "nature/publisher/publisher.py": ("publish", "nature"),
    "alien-world/collector/collector.py": ("collect", "alien-world"),
    "alien-world/publisher/publisher.py": ("publish", "alien-world"),
}
ACTIVE_ENV = "LIVE_EARTH_GLOBAL_CHECKER_ROUTED"


def _match_entrypoint(script_path: Path) -> tuple[Path, str, tuple[str, str]] | None:
    """Return the owning repo root and route for an exact registered script path."""
    parts = script_path.parts
    for relative, route in ENTRYPOINTS.items():
        expected = Path(relative).parts
        if len(parts) >= len(expected) and parts[-len(expected):] == expected:
            root = script_path.parents[len(expected) - 1]
            # Avoid affecting unrelated projects that happen to use the same
            # folder names; the existing shared requirements file identifies
            # this repository. Once identified, a missing runner is fail-closed.
            if (root / "editorial-engine" / "requirements.txt").is_file():
                return root, relative, route
    return None


def bootstrap() -> None:
    """Route a known existing script through run_pipeline.py exactly once."""
    if os.environ.get(ACTIVE_ENV) == "1" or not sys.argv:
        return

    try:
        script_path = Path(sys.argv[0]).resolve()
    except (OSError, RuntimeError, TypeError, ValueError):
        return

    matched = _match_entrypoint(script_path)
    if matched is None:
        return
    root, _relative, entry = matched

    runner = root / "global-checker" / "run_pipeline.py"
    if not runner.is_file():
        raise RuntimeError("Global Checker runner is missing; refusing to run an unchecked pipeline.")

    phase, view_id = entry
    os.environ[ACTIVE_ENV] = "1"
    print(
        f"GLOBAL CHECKER AUTO-ROUTE: {view_id} {phase} via shared runner",
        file=sys.stderr,
    )
    # Replace this interpreter before the unchecked Collector/Publisher source
    # can start. The new interpreter sees the guard variable and executes the
    # runner normally; its exit status becomes the existing workflow step status.
    os.execv(sys.executable, [sys.executable, str(runner), phase, "--view", view_id])
