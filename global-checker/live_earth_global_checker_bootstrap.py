#!/usr/bin/env python3
"""Automatic shared Global Checker dispatch for Nature and Alien World.

The central policy engine is installed once before either pipeline starts.
Both view adapters then use the same source-registry.json and checker module.
"""
from __future__ import annotations

import importlib.util
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


def _load_runner(path: Path, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Global Checker runner could not be loaded: {path.name}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


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
    checker_dir = root / "global-checker"
    runner = checker_dir / runner_name
    if not runner.is_file():
        raise RuntimeError(
            f"Global Checker runner is missing ({runner_name}); refusing to run an unchecked pipeline."
        )

    os.environ[ACTIVE_ENV] = "1"
    if str(checker_dir) not in sys.path:
        sys.path.insert(0, str(checker_dir))

    # One shared evaluator is installed for BOTH views before collection or
    # publication. Its source rules are read only from source-registry.json.
    import global_checker as checker
    import global_checker_policy_engine
    global_checker_policy_engine.install(checker)

    print(
        f"GLOBAL CHECKER AUTO-ROUTE: {view_id} {phase} via {runner_name} "
        "(shared central source registry)",
        file=sys.stderr,
    )

    sys.argv = [str(runner), phase, "--view", view_id]
    if view_id == "nature":
        import nature_adaptive_runtime
        nature_adaptive_runtime.run_nature(root, runner, phase)
        raise SystemExit(0)

    module = _load_runner(runner, "live_earth_alien_world_pipeline_shared_checker")
    result = module.main()
    raise SystemExit(result if isinstance(result, int) else 0)


bootstrap()
