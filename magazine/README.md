# LIVE // EARTH Magazine

**Current phase:** blank full-screen Feature Orb view scaffold.  
**Publication:** not connected or enabled.

## Current view

- `view/magazine-view-controller.js` registers Magazine with the shared Feature Orb system.
- Selecting Magazine opens a deliberately empty, full-screen near-black surface.
- The regular three-Orb Feature dock remains visible so the view can be closed normally.
- No title, masthead, articles, stories, images, feed, placeholder copy, PDF or reader controls are shown.
- The browser view does not load the Magazine source adapter, shared Editorial Engine or Global PDF Reader.

## Existing publication foundation

The existing `profile.json`, `source_adapter.py` and `tests/test_source_adapter.py` are retained unchanged as a separate, dormant foundation. The adapter's initial source allowlist remains Alien World and Nature only. It is not called by the blank browser view, and no Publisher, workflow, publication output or PDF integration is added here.

The future publication integration remains deferred. Any future connection to the source adapter, Editorial Engine or Global PDF Reader should be a separate, explicitly scoped change.

## Tests

From the repository root:

```bash
python -m unittest discover -s magazine/tests -p 'test_*.py' -v
```

The existing source-adapter contract tests remain alongside the new blank-view contract tests.
