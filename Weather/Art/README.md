# Weather Art Archive

The original artwork catalogues, drawing data, production plans and JSON scene records are retained as historical design records.

The six binary reference, proof, atlas and preview images formerly stored in `References/` have been removed. Source inspection of the current Weather renderer (`weather-view.js`) found no references to those images or to the retired `Weather/Art` renderer.

## Current runtime

- `../weather-view.js` owns the current Weather presentation and builds its scene procedurally.
- `live-art-online.js` is an inert compatibility stub retained for older cached Home documents.
- `service-worker-extension.js` retains that stub in the essential app shell for compatibility; it does not activate the retired artwork renderer.
- The archived JSON catalogues and plans are not runtime dependencies. Their historical image-path fields are retained as provenance and may refer to files intentionally removed from this archive.

Do not reconnect the archived artwork system without a new, explicit product decision.
