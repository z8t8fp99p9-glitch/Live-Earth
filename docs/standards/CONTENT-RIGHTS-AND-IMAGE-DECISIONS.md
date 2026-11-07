# Content Rights, Provenance and Image Decisions

This is the policy architecture standard. It does not grant permission to any source and does not replace the live registry or current item-level evidence.

## Text and images are separate works
A story's text, summary, headline and each attached image may have different rights holders and different permitted uses. Review them separately and preserve their exact relationship to the originating post.

## No implied rights
- Public availability or an RSS feed is not automatic permission for storage, extraction, transformation or republication.
- Credit, a source link, attribution or an educational purpose does not itself create a licence.
- Educational and non-commercial intent is context only. It is not a blanket copyright exception or licence.
- An approval applies only to the exact source/item/asset/use and policy evidence that was checked.

## Decision handling
- GREEN means the exact documented use is permitted by the current evidence/policy.
- AMBER means only the exact limited use stated in the policy may proceed.
- RED means the use is not approved.
- UNKNOWN, missing, contradictory or stale evidence must be held.
- If the Checker or required registry is unavailable, fail closed and preserve last-good output.

The active Checker implementation and policy files decide how these statuses are represented. Never invent a permissive interpretation from an old report.

## Image path
1. Collector gathers original image URL and metadata; it does not approve or substitute images.
2. Checker assesses exact original candidates and any permitted processing route.
3. Image Engine prepares one exact candidate only under explicit Checker-issued permissions.
4. Checker independently inspects the final candidate and its staged bytes/evidence.
5. Editorial receives only the Checker-approved handoff.
6. Final Checker gate controls eligibility for persistence/publication.

A technically valid image is not automatically a rights-cleared image. A visually relevant image is not automatically authorised for use.

## Generated illustrations
Where explicitly permitted, a generated illustration is not a documentary photograph. Label it clearly (for example, `ILLUSTRATION / NOT A PHOTOGRAPH`) and do not claim it is a literal or data-accurate depiction of the event unless the content truly supports that claim. Preserve provenance and the original approved media.

## Historical source-policy notes
Earlier notes listed NASA, NOAA, USGS, Phys.org, Mongabay, ScienceDaily, Nature Portfolio and Wikimedia Commons policy examples for retired Nature/Alien World Views. Those were dated View-specific registrations. Do not assume any of those feeds are currently subscribed or that the old version applies to a future View. Check the current Global Checker registry and Manager assignment before every use.
