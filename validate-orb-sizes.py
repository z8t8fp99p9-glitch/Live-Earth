from pathlib import Path

source = Path(__file__).with_name("view-module-registry.js").read_text(encoding="utf-8")
checks = {
    "shared orb shell: width-driven, auto height, 1:1 aspect ratio": ".orbShell{box-sizing:border-box;height:auto!important;aspect-ratio:1 / 1!important;flex:0 0 auto}" in source,
    "Home/navigation Orb explicitly uses width as diameter": "#navButtons .orbShell{width:var(--le-orb-size-primary)!important;height:auto!important;aspect-ratio:1 / 1!important;flex:0 0 auto;box-sizing:border-box}" in source,
    "three-Orb dock explicitly uses width as diameter": "#le-feature-dock .orbShell{width:var(--le-orb-size-dock)!important;height:auto!important;aspect-ratio:1 / 1!important;flex:0 0 auto;box-sizing:border-box" in source,
    "scattered feature Orb explicitly uses width as diameter": ".le-feature-library-item .orbShell{position:relative;display:grid;place-items:center;width:var(--le-orb-size-feature)!important;height:auto!important;aspect-ratio:1 / 1!important;box-sizing:border-box;flex:0 0 auto;" in source,
    "preview emblem explicitly uses width as diameter": ".le-feature-stage-symbol{display:grid;place-items:center;width:var(--le-orb-size-hero);height:auto!important;aspect-ratio:1 / 1!important;box-sizing:border-box;" in source,
    "short-landscape exception changes width only": ".le-feature-library-item .orbShell{width:clamp(36px,10vmin,44px)!important;height:auto!important;aspect-ratio:1 / 1!important}" in source,
    "decorative orbital rail retained": "function drawOrbitalRails()" in source and ".le-feature-orbit-rail-main" in source,
    "smooth transform-based collection retained": "function collectLooseOrbs(done)" in source and "cubic-bezier(0.22,0.76,0.22,1)" in source,
    "reduced-motion preference retained": "prefers-reduced-motion: reduce" in source and "if (reducedMotion || !items.length) finish();" in source,
    "all six feature Orbs retained": all(f'id: "{feature}"' in source for feature in ("clouds", "weather", "alien-world", "elevation", "earthquakes", "traffic")),
}
for label, passed in checks.items():
    print(f"{'PASS' if passed else 'FAIL'} — {label}")
if not all(checks.values()):
    raise SystemExit(1)
