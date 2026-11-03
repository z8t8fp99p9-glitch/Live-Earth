#!/usr/bin/env python3
"""Compatibility launcher that always routes through the shared Global Newsroom."""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path, PurePosixPath


def _load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Configured View Publisher could not be loaded: {path.name}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("publish",))
    parser.add_argument("--view", required=True)
    args = parser.parse_args()

    root_value = os.environ.get("LIVE_EARTH_PROJECT_ROOT", "")
    if not root_value:
        raise RuntimeError("Project root was not supplied by the shared bootstrap.")
    root = Path(root_value).resolve()
    profiles_path = root / "global_collection_manager" / "config" / "view-collection-profiles.json"
    try:
        profiles = json.loads(profiles_path.read_text(encoding="utf-8")).get("profiles", [])
    except Exception as exc:
        raise RuntimeError(f"Global Collection Manager profiles cannot be read: {exc}") from exc
    matches = [item for item in profiles if isinstance(item, dict)
               and item.get("viewId") == args.view and item.get("enabled") is True]
    if len(matches) != 1:
        raise RuntimeError("Requested View is not exactly one enabled Global Collection Manager profile.")
    profile = matches[0]
    relative = PurePosixPath(str(profile.get("publisherEntrypoint") or ""))
    if (relative.is_absolute() or len(relative.parts) < 3 or ".." in relative.parts
            or relative.parts[0] != args.view or relative.parts[-1] != "newsroom_publisher.py"):
        raise RuntimeError("Manager profile has no safe, matching Newsroom Publisher entry point.")
    publisher_path = (root / Path(*relative.parts)).resolve()
    if root not in publisher_path.parents or not publisher_path.is_file():
        raise RuntimeError("Configured View Publisher entry point is missing or outside the repository.")

    # The one shared orchestrator owns collection, checks, editorial work and persistence.
    engine_dir = root / "editorial-engine"
    if str(engine_dir) not in sys.path:
        sys.path.insert(0, str(engine_dir))
    from newsroom_orchestrator import run as run_newsroom
    result = run_newsroom(args.view, repository_root=root)
    if not isinstance(result, dict) or result.get("viewId") != args.view:
        raise RuntimeError("Shared Global Newsroom returned a mismatched View result.")
    if result.get("phase") == "newsroom-orchestration-blocked":
        raise RuntimeError("Shared Global Newsroom was blocked; Publisher was not started.")

    publisher = _load_module(publisher_path, f"live_earth_publisher_{args.view.replace('-', '_')}")
    main_function = getattr(publisher, "main", None)
    if not callable(main_function):
        raise RuntimeError("Configured Newsroom Publisher does not expose main().")
    status = main_function()
    return int(status) if isinstance(status, int) else 0


if __name__ == "__main__":
    raise SystemExit(main())
