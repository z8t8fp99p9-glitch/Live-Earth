#!/usr/bin/env python3
"""Normal-process entry point for the shared Nature / Alien World pipelines."""
from __future__ import annotations

import argparse
import importlib.util
import os
import sys
from pathlib import Path


def _load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Global Checker pipeline could not be loaded: {path.name}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("collect", "publish"))
    parser.add_argument("--view", choices=("nature", "alien-world"), required=True)
    args = parser.parse_args()

    root_value = os.environ.get("LIVE_EARTH_PROJECT_ROOT", "")
    if not root_value:
        raise RuntimeError("Project root was not supplied by the Global Checker bootstrap.")
    root = Path(root_value).resolve()
    checker_dir = root / "global-checker"
    if str(checker_dir) not in sys.path:
        sys.path.insert(0, str(checker_dir))

    # The .pth bootstrap has already installed global_checker_policy_engine in
    # this process. Keep a defensive idempotent install for direct local runs.
    import global_checker as checker
    import global_checker_policy_engine
    global_checker_policy_engine.install(checker)

    if args.view == "nature":
        from nature_adaptive_runtime import run_nature
        run_nature(root, checker_dir / "nature_pipeline.py", args.phase)
        return 0

    runner = checker_dir / "alien_world_pipeline.py"
    module = _load_module(runner, "live_earth_alien_world_pipeline_shared_checker")
    sys.argv = [str(runner), args.phase, "--view", "alien-world"]
    result = module.main()
    return int(result) if isinstance(result, int) else 0


if __name__ == "__main__":
    raise SystemExit(main())
