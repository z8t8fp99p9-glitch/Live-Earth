# LIVE // EARTH Global Image Engine — v0.2.0

The Global Image Engine is a shared, local image-preparation component for the independent Nature and Alien World live-feed pipelines.

## Live behaviour in this release

- Both Publishers call the shared hand-off immediately before the final Global Checker feed gate.
- An existing approved image remains in place. The Engine does not replace it.
- When a feed story has no image, the Engine may create a locally generated procedural illustration, but only after confirming that the exact story's text decision is already publishable under the current registry version.
- Every illustration is submitted to the Global Checker. The Engine cannot approve its own output. A matching GREEN decision for the same view, story, image URL, source, caption, creator, licence label and rights notice is required before the asset is copied into that view's published asset folder.
- The final feed gate independently validates the story and image evidence. Assets stripped by that gate are removed before publication completes.
- Nature and Alien World use separate staging folders, databases and published asset folders.

## How artwork is labelled

The generated JPEG is visibly labelled `ILLUSTRATION / NOT A PHOTOGRAPH`. Its caption states that it is thematic artwork, is not a literal depiction of the linked report, and is not a documentary photograph or data-accurate scientific visualization. It must never be represented as field evidence, a source photograph, or a scientific rendering.

## External image candidates

The Engine includes bounded Wikimedia Commons candidate discovery and image preparation. Those functions retain the exact Commons file page, creator, credit and licence evidence and do not approve or publish a candidate by themselves. This release does not activate new automatic Commons searches in the scheduled Publisher stage: Nature's existing Collector-side reviewed allowlist and Global Checker route remain the active documentary-photo route. This avoids adding outbound discovery requests to the Publisher and avoids weakening the current source-to-image matching rules.

## Asset destinations

- Nature: `nature/published/assets/`
- Alien World: `alien-world/published/assets/`

The publisher workflow must commit the full view-specific `published/` folder so that the raw GitHub image URLs embedded in the live feed resolve after the Actions runner ends. Nature already commits that folder. Alien World's workflow therefore needs the separate one-line patch supplied with this build.

## Safety boundaries

- No AI image service, API key, hosted image model, database reset or cloud storage is used.
- Pillow performs local deterministic drawing and image encoding.
- Staging files are temporary and are cleaned after each hand-off.
- Image hashes are checked before and after publication.
- The Global Checker remains the sole rights authority; the Image Engine is not a rights checker.
