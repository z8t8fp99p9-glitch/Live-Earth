from pathlib import Path
import re, zipfile, hashlib
p=Path(__file__).with_name("view-module-registry.js")
s=p.read_text(encoding="utf-8")
checks={
 "no rail draw function":"drawOrbitalRails" not in s,
 "no rail svg/classes":"le-feature-orbit-rail" not in s and "le-feature-orbit-rails" not in s,
 "no rail visibility class":"le-stacks-orb-hunt-open" not in s,
 "random scatter retained":"function getRandomScatterPositions" in s and "Math.random()" in s,
 "collection retained":"function collectLooseOrbs" in s and "le-orb-collecting" in s,
 "reduced motion retained":"prefers-reduced-motion" in s,
 "shared width sizing retained":"width:var(--le-orb-size-feature)!important" in s,
 "1:1 shell retained":"aspect-ratio:1 / 1!important" in s,
 "landscape no longer shrinks shell":"width:clamp(36px,10vmin,44px)!important" not in s,
}
for name,ok in checks.items(): print(("PASS" if ok else "FAIL")+" - "+name)
if not all(checks.values()): raise SystemExit(1)
