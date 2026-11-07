# LIVE // EARTH — History Index

## How to interpret history

Historical documents record what the project decided or tested at a particular time. They are not automatically current instructions. In particular, Nature and Alien World feed records describe retired Views. The current Manager configuration and current source take precedence.

The consolidated history lives in `history/PROJECT-HISTORY.md`. Full former root-note versions remain available through earlier Git commits.

## Historical topics now covered by current documents

| Former note topic | Current canonical home | Historical context |
|---|---|---|
| Engineering continuity and fixes register | Root `PROJECT-CONTINUITY.md` and `PROTECTED-DECISIONS.md` | Earlier versions contain historical V93/V96/V97 candidate details; those IDs are not current runtime state |
| Views separation audit | `standards/INDEPENDENT-SUN-MOON-VIEWS.md` and `architecture/APP-AND-VIEW-ARCHITECTURE.md` | Preserves shared host and separate view responsibilities |
| Sun amber Rise/Set update | `standards/INDEPENDENT-SUN-MOON-VIEWS.md` and `history/PROJECT-HISTORY.md` | Narrow historical Sun-only visual change |
| Global Checker standard and source rules | `standards/CONTENT-RIGHTS-AND-IMAGE-DECISIONS.md` | Dated policy examples; retired View subscriptions are not active |
| Global Image Engine architecture/integration | `standards/SHARED-ENGINES-STANDARD.md` and `history/PROJECT-HISTORY.md` | Image Engine prepares; Checker decides rights and publication |
| Editorial text upgrade | `editorial-engine/README.md` and `history/PROJECT-HISTORY.md` | Extractive text improvement; no invented facts or paraphrase of restricted text |
| Nature/Alien World pipelines and feed settings | `history/PROJECT-HISTORY.md` | Historical per-View routes, later superseded and retired |
| Newsroom section wiring | Current component READMEs/contracts and `architecture/SHARED-NEWSROOM-PIPELINE.md` | Preserve stage ownership; old View workflows are not active |
| View retirement handoff | `history/PROJECT-HISTORY.md` and `docs/CURRENT-STATUS.md` | Nature/Alien World retirement |
| Old mixed-result test report | `history/PROJECT-HISTORY.md` | Historical test snapshot, not a current green result |
| Recovery rollback reminder | `recovery/RECOVERY-ROLLBACK.txt` | Restore only matching snapshots; never blanket-restore unrelated workflow files |

## Component documents

Detailed implementation contracts remain inside `global_collection_manager/`, `global_collector/`, `global-checker/`, `image-engine/`, `editorial-engine/` and `newsroom-database-writer/`.

## Deletion policy

Only remove a historical record when the owner explicitly requests deletion. If a note is superseded, preserve its decision and outcome in the history record. The seven Celestial experiment notes previously requested for removal were already absent from the inspected branch; no code, test or runtime asset is included in this naming correction.
