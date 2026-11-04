#!/usr/bin/env python3
"""Orchestrate the Global Collector -> Checker 1–8 -> Image Engine 9 -> Checker Sections 10 and 11 handoff.

This is a callable integration layer. It deliberately does not schedule runs,
write View databases, update feed files, or publish any output.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Callable
import sys

# The repository stores the two shared engines in hyphenated peer folders.
# Make this callable work when imported from the repository root or invoked
# directly from the image-engine folder, without requiring a PYTHONPATH setup.
_REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
_CHECKER_MODULE_DIR = _REPOSITORY_ROOT / "global-checker"
if _CHECKER_MODULE_DIR.is_dir() and str(_CHECKER_MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(_CHECKER_MODULE_DIR))

from global_checker_v2 import GlobalChecker
from image_engine_section9 import ImageEngineSection9


def run_global_image_pipeline(
    collector_batch: dict[str, Any],
    *,
    staging_dir: str | Path,
    text_policy: dict[str, Any] | None = None,
    image_policies: dict[str, Any] | None = None,
    image_engine_dispatch: dict[str, Any] | None = None,
    final_image_policies: dict[str, Any] | None = None,
    discovered_candidates: dict[str, list[dict[str, Any]]] | None = None,
    candidate_discoverer: Callable[..., list[dict[str, Any]]] | None = None,
    visual_inspector: Any = None,
    checker: GlobalChecker | None = None,
    max_download_bytes: int = 7 * 1024 * 1024,
    timeout_seconds: int = 18,
) -> dict[str, Any]:
    """Run both Checker phases around Image Engine Section 9.

    The initial Checker phase produces Sections 5–8. Image Engine adds Section
    9 and submits one exact candidate per post. Checker then adds Sections 10
    and 11. The original Sections 1–9 and original post records stay unchanged.
    All policies are caller-supplied; no source rights or allowed hosts are
    inferred from public availability or domain names.
    """
    if not isinstance(collector_batch, dict):
        raise TypeError("collector_batch must be the complete Global Collector result object")
    stage = Path(staging_dir).resolve()
    stage.mkdir(parents=True, exist_ok=True)
    checker_instance = checker or GlobalChecker()

    eight_section_report = checker_instance.run(
        collector_batch,
        text_policy=text_policy,
        image_policies=image_policies,
        image_engine_dispatch=image_engine_dispatch,
    )

    image_engine = ImageEngineSection9(
        stage,
        max_download_bytes=max_download_bytes,
        timeout_seconds=timeout_seconds,
        visual_inspector=visual_inspector,
    )
    nine_section_report = image_engine.run(
        eight_section_report,
        discovered_candidates=discovered_candidates,
        candidate_discoverer=candidate_discoverer,
    )

    ten_section_report = checker_instance.finalize_image_review(
        nine_section_report,
        final_image_policies=final_image_policies,
        staging_root=stage,
    )
    return ten_section_report
