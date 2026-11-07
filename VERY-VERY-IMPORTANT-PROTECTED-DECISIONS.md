# VERY VERY IMPORTANT — PROTECTED DECISIONS

**Approval rule:** do not change any item in this register without the owner's explicit request or approval, a scoped dependency review and relevant tests.

| Protected area | Decision to preserve | What must not happen casually |
|---|---|---|
| Global Orb system | Orb behaviour and dependencies are a Global standard | No incidental refactor, resize, interaction change or dependency swap |
| Home composition | Approved Earth composition, framing, textures, baseline geometry and five Home Orbs remain stable | No visual drift from exploration settings or unrelated layout work |
| Primary-view navigation | Existing view manager remains the single primary-view authority | No parallel state manager or direct state ownership in utility controls |
| Location | OFF by default; geolocation only after deliberate user action | No automatic location request; no clearing local data to fix a location issue |
| Stacks | Shared feature registry, dock, scatter coordinate space, hitbox alignment and cleanup guards remain intact | No nested-scroller offset, dead hitbox or animation that can remain stuck |
| Moon View | Separate Moon controller, renderer, lunar interface/scroller and assets | No merge into Sun or Home; no unapproved geometry or lifecycle change |
| Sun View | Separate Sun renderer and solar-specific behaviour | No runtime Moon-source transformation or Moon dependency |
| iOS full-screen flow | Root-flow and orientation-specific recovery are deliberate safeguards | No removal of the hidden Home visual/placeholder until its exact role is mapped |
| Startup/update | Service-worker shell, update manager, build IDs and staged-update safeguards work as a coordinated system | No shell path or cache identity change without dependency tracing and online/offline tests |
| Local data | Data-store, recovery, IndexedDB and database boundaries are protected | No destructive reset, deletion or migration without approval and recovery plan |
| Runtime assets | Real Moon/Sun backgrounds and surface textures are operational dependencies | No deletion or relocation based only on a filename or apparent lack of visibility |
| Shared Global engines | Manager, Collector, Checker, Image Engine, Editorial Engine and Writer remain shared | No View-specific copies or transfer of decision authority |
| Retired Nature/Alien World | Their collection/publishing Views and old schedules remain retired | No reactivation based on historical documents |
| ZIP upload standard | `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md` remains at repository root, byte-for-byte untouched by documentation cleanup | Never move, rename, rewrite, replace or delete that file |
| Master notes | The three `VERY-VERY-IMPORTANT` files remain at repository root | Never bury them in `docs/` or rename them casually |
| History | Important decisions and superseded outcomes remain discoverable | No silent deletion of project knowledge |

## Special handling for the hidden Home visual

A historical continuity audit records the owner's instruction that a Home image/visual is intentionally hidden to support the iOS scroller/full-screen workaround. The audit did not confidently identify its exact selector. Treat the unresolved locator as a protection warning, not as permission to remove an apparently unused element or asset. First map it from the current source and test a safe alternative on the installed iPhone.

## Change procedure for a protected area

1. State the exact protected behaviour affected.
2. Trace current source, callers, runtime dependencies and recovery path.
3. Explain why the requested change is necessary and what it could affect.
4. Make the smallest reversible change.
5. Run targeted tests and inspect the diff.
6. Verify the relevant online/offline and iPhone flows.
7. Record the decision and result in the appropriate current or history document.
