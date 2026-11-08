# LIVE // EARTH — History Index

## How to interpret history

Historical documents record what the project decided or tested at a particular time. They are not automatically current instructions. The consolidated history is in `Documentation/PROJECT-HISTORY.md`. Full former root-note versions remain available through earlier Git commits.

## Historical topics now covered by current documents

| Topic | Current canonical home | Historical context |
|---|---|---|
| Engineering continuity and safeguards | Root `PROJECT-CONTINUITY.md` and `PROTECTED-DECISIONS.md` | Earlier versions contain dated build candidates; those IDs are not current runtime state |
| Views separation and quaternion viewpoint lifecycle | `Documentation/INDEPENDENT-SUN-MOON-VIEWS.md`, `Documentation/APP-AND-VIEW-ARCHITECTURE.md` and `Documentation/EARTH-ENGINE-VIEWPOINT-HANDOFF-2026-11-09.md` | Preserves shared sky host, separate view responsibilities and Engine-owned quaternion handoff |
| Sun amber Rise/Set update | `Documentation/INDEPENDENT-SUN-MOON-VIEWS.md` and `Documentation/PROJECT-HISTORY.md` | Narrow historical Sun-only visual change |
| Editorial text utilities | `Editorial-Engine/README.md` and `Documentation/PROJECT-HISTORY.md` | Extractive text improvement; no invented facts or independent fact-checking claim |
| App and iOS recovery | `PROJECT-CONTINUITY.md`, `Documentation/WORKING-RULES.md` and `Recovery/RECOVERY-ROLLBACK.txt` | Restore only matching snapshots; never blanket-restore unrelated files |

## Retired implementation records

The previous content-collection and publication implementation was removed at the owner's direction on 7 November 2026. Its code, interfaces, component contracts and implementation-specific recovery snapshots are not part of the current repository. Do not reconstruct them from earlier Git commits or historical notes.

## Deletion policy

Preserve unrelated application history. A retired implementation must not be treated as active code or a current instruction.
