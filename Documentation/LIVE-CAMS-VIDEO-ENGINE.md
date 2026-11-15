> **Archived historical record — implementation retired 15 November 2026. This document is retained for project history only; none of its video-player code remains in the app.**

# Live Cams In-App Video Engine

**Implementation:** `LiveCams/live-video-engine.js`  
**Integration:** `LiveCams/live-cams-view.js`  
**Provider:** OpenEye REST / WHEP  
**App build:** `v136-live-cams-whep-player`

## Purpose

Live Cams now has a browser-native WebRTC player for provider records explicitly identified as `feed_kind=live_video`. The app does not need to host or relay the media itself. WHEP performs session negotiation with OpenEye, and the camera media is received directly by the browser's WebRTC stack.

## Eligibility and user action

A WHEP request is allowed only when the camera record has all of the following:

- a stream ID matching the provider's `stream_...` identifier format;
- `feed_kind` or `kind` equal to `live_video`;
- `is_free` explicitly true;
- `live` explicitly true.

A user must open the camera and press **Play live video here**. Still-image feeds, source-only pages, stale or offline cameras, paid feeds, and records with unknown access status do not start a WHEP session. Snapshot-only cameras keep the existing preview flow.

OpenEye documents WHEP as per-second usage and lists `open_live` at US$0.002 per second. The interface discloses this before playback. This integration contains no wallet, payment SDK, x402 settlement or automatic payment retry. HTTP 402 ends the attempt without payment.

## WHEP lifecycle

1. Create an `RTCPeerConnection` with receive-only audio/video transceivers.
2. Create and set a local SDP offer; wait for ICE candidate gathering.
3. POST the SDP offer to `https://api.openeye.cam/v1/streams/{id}/whep/offer` as `application/sdp`.
4. Require an HTTPS WHEP session `Location` on the OpenEye API origin. The browser must be able to read this header through CORS to support deterministic cleanup.
5. Apply the SDP answer and wait for a video track before reporting the player connected.
6. On modal close, feature close, app backgrounding or connection failure, stop local tracks, close the peer connection and DELETE the WHEP session resource when its `Location` is available.

## Safety and limitations

- The engine never treats a still image as a video stream.
- Paid or unconfirmed records are not offered an in-app Play action.
- A 402 response is not settled and is not retried with payment.
- The app does not store provider API keys in client code.
- Direct browser integration depends on OpenEye allowing the WHEP POST and exposing the `Location` response header through CORS. If the provider does not expose those, a small same-origin server-side signaling proxy will be required; do not work around that by leaving untracked sessions running.
- STUN is used for ICE connectivity. Some networks may still block WebRTC; the UI should report connection failure rather than switch silently to an external page.

## Validation performed

- JavaScript syntax checks across the project.
- Mock WHEP success: SDP POST, remote SDP application, video track attachment and session DELETE.
- Mock HTTP 402: attempt rejected without payment or retry.
- Missing exposed `Location`: rejected before the answer is applied.
- Invalid stream ID: rejected before any network request.
- Live Cams and service-worker cache build IDs match.

## Still required after deployment

Test on the installed iPhone with a real OpenEye record whose metadata explicitly reports `feed_kind=live_video`, `is_free=true`, and `live=true`. Verify Safari/iOS CORS visibility of `Location`, WebRTC ICE connectivity, track delivery, video playback, and DELETE cleanup. If no such eligible feed is currently in the catalogue, the player will remain untested end-to-end until one is available.
