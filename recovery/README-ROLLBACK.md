# Recovery — Global PDF Reader

This package replaces only `universal-pdf-viewer.js`.

## Before-upgrade reference
The source file immediately before this reader upgrade is preserved in GitHub history at:

https://github.com/z8t8fp99p9-glitch/Live-Earth/blob/beceb2d91891c8c902d113ce7d83605428af1aa8/universal-pdf-viewer.js

Expected previous blob SHA-1:
`a9bbf291fe9381525738c87f8943a9289d761f62`

## Rollback
If the new reader causes a regression, restore only `universal-pdf-viewer.js` from the
reference commit above. Do not reset IndexedDB, Cache Storage, app data, or the repository.

The upgrade ZIP contains no deletion instructions and makes no database or service-worker changes.
