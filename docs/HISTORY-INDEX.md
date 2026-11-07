# LIVE // EARTH — History Index

## How to interpret history

Historical documents record what the project decided or tested at a particular time. They are not automatically current instructions. In particular, Nature and Alien World feed records describe retired Views. The current Manager configuration and current source take precedence.

The documentation rebuild moves the scattered root notes into this history structure conceptually and consolidates their useful decisions into the canonical guides. Exact prior file versions remain available through the repository's earlier Git commits.

## Consolidated history

- `history/PROJECT-HISTORY.md` — dated record of app safeguards, feed/newsroom architecture, Global services, View retirement, Sun/Moon separation, experimental-note cleanup and documentation decisions.

## Historical topics now covered by current documents

| Former root note topic | Current canonical home | Historical context |
|---|---|---|
| Long continuity/fixes register | Root `VERY-VERY-IMPORTANT-MASTER-CONTINUITY.md` and `VERY-VERY-IMPORTANT-PROTECTED-DECISIONS.md` | The older version contained dated V93/V96/V97 candidate details; those version labels are not current runtime state |
| Views separation audit | `standards/INDEPENDENT-SUN-MOON-VIEWS.md` and `architecture/APP-AND-VIEW-ARCHITECTURE.md` | 31 Oct audit; preserves the shared host and separate view responsibilities |
| Sun amber Rise/Set update | `standards/INDEPENDENT-SUN-MOON-VIEWS.md` and Project History | A narrow historical Sun-only visual change |
| Global Checker standard and source rules | `standards/CONTENT-RIGHTS-AND-IMAGE-DECISIONS.md` | 2 Nov policy and rights decisions; N/A View subscriptions later retired |
| Global Image Engine architecture/integration | `standards/SHARED-ENGINES-STANDARD.md` and Project History | Image Engine owns its processing report, not rights or publication approval |
| Editorial text upgrade | `editorial-engine/README.md` and Project History | Extractive text improvement only; no generated facts or paraphrase of restricted text |
| Nature/Alien World pipelines and feed settings | Project History | Historical per-View routes, later superseded and retired |
| Newsroom 13-section wiring | `global_collector/README.md`, `global-checker/README.md`, `image-engine/README.md`, Writer contract | Preserve stage ownership; do not assume old View workflows are active |
| View retirement handoff | Project History and current status | Nature/Alien World retirement on 5 Nov 2026 |
| Old test report | Project History | Historical test snapshot with known failures; not a current test result |
| Recovery rollback note | `recovery/RECOVERY-ROLLBACK.txt` | Recovery principle; use the matching current snapshot and never restore unrelated workflows |

## Component documents

The detailed current contracts remain inside `global_collection_manager/`, `global_collector/`, `global-checker/`, `image-engine/`, `editorial-engine/` and `newsroom-database-writer/`.

## Deletion policy

Only remove a historical record when the owner explicitly requests its deletion. If a note is superseded, preserve its decision and outcome in this history record. The seven Celestial experiment notes previously requested for removal were already absent from the branch inspected for this package; no other experiment, code file or test is included for deletion.
