#!/usr/bin/env python3
"""Safe Python-startup dispatcher for LIVE // EARTH feed pipelines.

The .pth hook never runs a pipeline or raises SystemExit during interpreter
initialisation. It replaces the original process with live_earth_dispatch.py.
Child Python processes inherit the project-root marker and install the same
registry-driven policy engine before tests or pipeline modules are imported.
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
ROOT_ENV = "LIVE_EARTH_PROJECT_ROOT"


def _install_shared_policy_engine() -> None:
    """Install central policies in the current process and all child processes."""
    root_value = os.environ.get(ROOT_ENV, "")
    if not root_value:
        return
    checker_dir = Path(root_value).resolve() / "global-checker"
    if not checker_dir.is_dir():
        raise RuntimeError("LIVE // EARTH Global Checker directory is unavailable.")
    checker_path = str(checker_dir)
    if checker_path not in sys.path:
        sys.path.insert(0, checker_path)
    import global_checker as checker
    import global_checker_policy_engine
    global_checker_policy_engine.install(checker)


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
    # A dispatched process and its children only install the policy engine;
    # they do not dispatch a second time.
    if os.environ.get(ACTIVE_ENV) == "1":
        _install_shared_policy_engine()
        return
    if not sys.argv:
        return
    try:
        script_path = Path(sys.argv[0]).resolve()
    except (OSError, RuntimeError, TypeError, ValueError):
        return
    matched = _match_entrypoint(script_path)
    if matched is None:
        return

    root, _relative, (phase, view_id, _runner_name) = matched
    checker_dir = root / "global-checker"
    dispatcher = checker_dir / "live_earth_dispatch.py"
    if not dispatcher.is_file():
        raise RuntimeError(
            "Global Checker dispatcher is missing; refusing to run an unchecked pipeline."
        )

    os.environ[ACTIVE_ENV] = "1"
    os.environ[ROOT_ENV] = str(root)
    print(
        f"GLOBAL CHECKER AUTO-ROUTE: {view_id} {phase} via shared dispatcher "
        "(central source registry)",
        file=sys.stderr,
    )
    # execv replaces the bootstrapping process. No SystemExit is raised from
    # inside site.py / .pth initialisation, avoiding fatal init_import_site errors.
    os.execv(
        sys.executable,
        [sys.executable, str(dispatcher), phase, "--view", view_id],
    )


bootstrap()
