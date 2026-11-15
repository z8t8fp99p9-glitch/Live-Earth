# LIVE // EARTH

A phone-first Earth and sky explorer built as a lightweight web app/PWA.

## Start here

1. [`README-FIRST.txt`](README-FIRST.txt) — short project entry point.
2. [`PROJECT-CONTINUITY.md`](PROJECT-CONTINUITY.md) — safe working rules.
3. [`GLOBAL-STANDARDS.md`](GLOBAL-STANDARDS.md) — shared app standards.
4. [`PROTECTED-DECISIONS.md`](PROTECTED-DECISIONS.md) — changes needing owner approval.
5. [`Documentation/INDEX.md`](Documentation/INDEX.md) — current documentation map.
6. [`ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md`](ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md) — required upload procedure; keep this file unchanged.

## Main areas

| Folder | Responsibility |
|---|---|
| `Global/`, `Home/` | App navigation, Home scene and shared controls |
| `Earth/`, `EarthEngine/` | Independent Earth View and shared globe engine |
| `Moon/`, `Sun/` | Separate celestial views |
| `Location/` | Explicit location permission and fresh-position service |
| `Stacks/`, `Weather/`, `Clouds/`, `Traffic/`, `Earthquakes/` | Secondary feature views |
| `Data/`, `Recovery/` | Local data and recovery |
| `Editorial-Engine/` | Retained editorial utility; not a live publishing pipeline |
| `Tests/` | Source and contract tests |
| `Documentation/` | Current status, architecture, standards and concise history |

The repository source is authoritative for implementation details. Historical experiments are not current specifications.
