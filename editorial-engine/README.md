# LIVE // EARTH — Universal Editorial System

**Ownership:** one shared, View-independent editorial system.  
**Current registration status:** Nature and Alien World are retired; the Global Collection Manager currently has no active View profiles, assignments or schedules. This Engine remains shared infrastructure for a future approved View.

## 1. Components

| File | Responsibility |
|---|---|
| `universal-editorial-engine.js` | Browser-side output-contract validators and safe helpers; exposes `window.LiveEarthUniversalEditorialEngine`. |
| `universal_editorial_engine.py` | Python production Engine; exposes `run_engine(...)` to a configured Publisher. |
| `requirements.txt` | Pinned Python production dependencies for enabled output features. |

The JavaScript companion and Python Engine run in different environments. JavaScript validates/presents completed outputs; Python produces configured feed/document outputs. They are one shared system, not per-View Engine copies.

## 2. Ownership boundaries

- **Global Collection Manager:** assigns the source work, View identity, profile and destination. It does not collect or decide rights.
- **Global Collector:** one shared intake service. It retrieves source evidence and returns a transient structured batch; it does not write the View database.
- **Global Checker:** owns permission, provenance and approval decisions.
- **Global Image Engine:** prepares exact image candidates under Checker-issued permissions. It does not approve rights or publish.
- **Universal Editorial Engine:** formats approved input into the requested output. It does not collect external data, open or own databases, own schedules, grant rights or write View story records.
- **Newsroom Database Writer:** persists individually final-approved stories to the Manager-selected, View-isolated database.
- **View Publisher:** opens only its own approved records read-only, passes bounded input/output instructions to the shared Engine and writes only the configured View output.
- **Global PDF Reader:** one view-independent reader for a PDF selected by a calling View; separate from the Editorial Engine.

## 3. Publisher integration contract

A future View must be registered through the Global Collection Manager and receive:
1. a stable `viewId`, profile ID and unique assignment IDs;
2. source subscriptions validated by the Manager;
3. applicable Global Checker policies;
4. an isolated database identity/path under `.publisher-data/<viewId>/`;
5. a Publisher presentation adapter and bounded output destination;
6. relevant tests and deployment checks.

The Publisher opens its own database read-only and supplies the Engine with the database connection, validated View profile/command, bounded output destination and publication time. The Engine returns the output result. The Publisher preserves its last-good output if a run fails.

A browser View that reads a completed feed loads the existing shared JavaScript companion and validates the payload against its expected View identity. Do not create another browser-side validator for a new View.

## 4. Editorial integrity

The Engine is deterministic and does not call an AI service. It formats the content supplied through the approved handoff; it does not invent reporting, create unsupported facts, decide copyright or override the Checker.

The historical text-upgrade work was extractive:
- sentence ranking using local text similarity;
- reduction of near-duplicate/redundant sentences;
- restoration of selected sentences to source order;
- protections for numbers/measurements, quotations, negation and uncertainty;
- no invented padding, no fabricated sentence and no paraphrase of restricted text;
- short source material remains short when there is not enough distinct approved material.

The Editor receives the completed Checker handoff. Summary permission must be explicit. Source restrictions remain intact.

## 5. Shared PDF output capability

The Python Engine retains a PDF-generation capability for a Publisher profile that explicitly requires it. This is not enabled for every View.

The documented shared PDF design uses:
- a tall portrait page of 420 × 912 PDF points;
- one-column, fit-to-width reading with generous margins and clear hierarchy;
- source names, URLs, captions and credits printed as text;
- aspect-ratio-preserving eligible local images supplied by the Publisher;
- no substitution of unrelated imagery when no eligible local asset exists;
- preservation of complete Publisher-supplied story bodies, with overflow continuing onto additional pages;
- validation of page geometry/count, extracted text, file size and absence of annotations/bookmarks before atomic replacement;
- a 48-page safety ceiling; a profile page target is a guide, not a reason to truncate complete stories.

The Engine may prepare a cached/downsampled PDF copy without modifying the Publisher's original source asset. The Publisher owns its own assets and output.

## 6. Live Feeds and source permission

For a Live Feed output, the Engine preserves the Checker-approved source text/summary and its evidence. It does not reconstruct restricted summaries or invent missing facts. If an item is approved only for headline/link use, it must not receive a made-up summary.

The Image Engine must complete its permitted image handoff before Editorial layout. The final Checker remains the release authority.

## 7. Current operating state

The current Global Collection Manager documentation states that Nature and Alien World were retired and the Manager's active source catalogue, View assignments, profiles and schedules are empty. Therefore this README does not list them as current production consumers or claim any active feed schedule. Earlier Nature/Alien World workflows and feed paths remain historical.

A future View must be registered and tested before it is described as an active consumer of this Engine.
