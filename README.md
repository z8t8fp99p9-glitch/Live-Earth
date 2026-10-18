# LIVE // EARTH

An early, lightweight PWA concept for Earth and sky exploration. Designed to be uploaded through GitHub's website from an iPhone.

## Included in this prototype

- Responsive layout for phone, tablet, and desktop.
- Illustrative Earth globe with no third-party JavaScript libraries.
- Optional browser geolocation, requested only after the user taps **Use my location**.
- Current weather from the Open-Meteo public forecast endpoint.
- Recent global earthquakes from the USGS public GeoJSON feed.
- Approximate Sun timing/position and Moon phase calculations.
- Basic service-worker app-shell caching.
- Explicitly unconnected traffic card pending a verified suitable free provider.

## GitHub Pages setup

1. Upload the **contents** of this folder into the root of the repository's `main` branch. Do not upload the ZIP itself as the website.
2. Open repository **Settings → Pages**.
3. Under build and deployment, choose **Deploy from a branch**.
4. Select branch `main` and folder `/(root)`, then save.
5. Wait for GitHub Pages to publish and open the URL shown in Settings → Pages.

## Important limitations

This is a first prototype, not the finished product. The globe is illustrative, not a geographic map. Sun/Moon values are approximations and require proper validation before relying on them for precise astronomical use. Traffic is not connected. Data providers may have their own availability, quotas, terms, and attribution requirements; verify these before promising global coverage. A public repository means its source code is visible to everyone.

No app-owned backend, API key, paid service, analytics, or account is included. Public provider availability and any third-party usage costs are outside this repository's control.

## Update workflow

Keep the repository root structure intact. For each approved release, prepare a new versioned ZIP and inspect the actual deployed site after GitHub Pages finishes publishing.
