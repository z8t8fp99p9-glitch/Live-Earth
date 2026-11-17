# Cloudflare deployment checklist

- [ ] Create Cloudflare D1 database `live-earth-intelligence`.
- [ ] Insert its database ID into `wrangler.jsonc`.
- [ ] Set `APP_ORIGIN` to the exact LIVE // EARTH Pages origin.
- [ ] Apply migration `0001_initial.sql` remotely.
- [ ] Set secret `INGEST_TOKEN` through Wrangler (never commit it).
- [ ] Deploy the Worker.
- [ ] Confirm `/health` returns `ok: true`.
- [ ] Confirm `/v1/worlds` returns six worlds with `available: false` until curated data is published.
- [ ] Register only sources whose terms, access permissions and attribution have been reviewed.
- [ ] Approve each source before ingestion.
- [ ] Connect provider-specific collectors in a later, separately tested change.
- [ ] Configure the website to use the deployed Worker URL in the front-end integration phase.

The repository ZIP upload does not deploy this Worker. Cloudflare deployment is a separate operation.
