#!/usr/bin/env python3
"""Nature Publisher entry point with the v2 Checker-cleared Newsroom image bridge."""
from __future__ import annotations
import importlib.util
import io
import json
import sys
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WRAPPER_DIR = Path(__file__).resolve().parents[2] / "newsroom-database-writer"
RAW_ASSET_BASE = "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/nature/published"


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load Publisher module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def main() -> int:
    sys.path.insert(0, str(ROOT / "editorial-engine"))
    import universal_editorial_engine as engine
    if engine.ENGINE_VERSION != "1.3.0":
        raise RuntimeError("Unexpected shared Universal Editorial Engine core version.")
    # The core Publisher reader uses this compatibility marker to accept v2 rows.
    engine.NEWSROOM_PUBLISHER_ADAPTER_VERSION = "2.0.0"
    publisher = _load(ROOT / "nature/publisher/publisher.py", "nature_publisher_existing")
    publisher_log = io.StringIO()
    with redirect_stdout(publisher_log):
        status = publisher.publish()
    if status:
        return int(status)
    sys.path.insert(0, str(WRAPPER_DIR))
    from newsroom_publisher_assets import attach_newsroom_images
    connection = publisher.open_readonly()
    try:
        output = ROOT / "nature/published"
        feed_path = output / "live-feed.json"
        feed = json.loads(feed_path.read_text(encoding="utf-8"))
        attached = attach_newsroom_images(connection, feed, repository_root=ROOT,
                                          view_id="nature", output_directory=output,
                                          raw_asset_base=RAW_ASSET_BASE)
        feed_path_tmp = feed_path.with_suffix(".json.pending")
        feed_path_tmp.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        feed_path_tmp.replace(feed_path)
        print(json.dumps({"status":"published","viewId":"nature","storyCount":len(feed.get("stories",[])),
                          "newsroomImagesAttached":attached["attached"],"storyCountCap":None,
                          "windowHours":feed.get("windowHours")}, ensure_ascii=False, indent=2))
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
