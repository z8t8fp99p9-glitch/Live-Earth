# Universal Editorial Engine (Global)

`universal_editorial_engine.py` is the shared, view-independent production engine. A view Publisher supplies:

- its own profile and publication instruction;
- a database connection opened by that Publisher in read-only mode;
- a bounded output destination.

The Engine does not fetch external sources, open a database, write view records, own a schedule, or contain a view-specific source list. It creates a ready-to-display feed and/or a validated self-contained PDF. It preserves the previous output when a publication run fails before the Publisher's atomic output write.

The current custom-request interpreter is deterministic and deliberately does not call an AI service. Supported directives include cinematic/dark or minimal/light direction, image-led or text-led design, page count, timeline, explainer and selected editorial tones. The issue receipt records applied and unmapped requests. Arbitrary free-form instructions are not claimed as implemented in this no-AI first release.

The browser companion `../universal-editorial-engine.js` exposes the shared output contract validators to all views. It does not duplicate the production engine.
