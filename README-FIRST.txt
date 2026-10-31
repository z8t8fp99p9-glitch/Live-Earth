LIVE // EARTH — ALIEN WORLD AUTOMATED IMAGE SCREENING FIX

This is a replacement for the earlier v2 manual-allowlist ZIP. Do NOT upload the earlier v2 ZIP.

WHAT THIS FIX DOES
- Restores automatic image discovery from each original NASA story/feed.
- Automatically screens the image host, redirects, source provenance, credits and explicit copyright/third-party restrictions.
- Uses the image-specific credit when published; otherwise acknowledges NASA as the source. It never substitutes the article byline.
- Automatically tries the next source-post candidate when one image is unsuitable.
- Scans a bounded pool of recent stories so one story without an image does not block later stories.
- Re-screens the full publication story window and removes legacy or over-limit cached images, without resetting the database.
- Keeps the photo-led magazine enabled; it does not force text-only output.
- Preserves the existing Collector → DB → read-only Publisher → Universal Editorial Engine → Main Page architecture.

SAFETY / SCOPE
This is automated factual-editorial screening, not a licence or legal clearance. Explicit third-party copyright/licensing restrictions are held back. Images stay with the corresponding source story; no NASA endorsement, branding, advertisements or promotional use is implied.

FILES TO UPLOAD
Replace only the files present in this ZIP at the same repository paths. Do not delete or reset any database/cache. No workflow YAML or UI files are changed.

GITHUB
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Commit title: Restore Automated NASA Image Discovery and Rights Screening

After the ZIP Importer and Pages deployment finish, run GitHub Actions → Alien World Publisher → Run workflow → mode `all` → leave custom request blank. This rebuilds the feed and photo-led PDF using the new Collector policy.
