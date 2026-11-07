from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
engine=(root/'browser-engine.js').read_text()
collector=Path(__file__).resolve().parents[2]/'global_collector'/'universal_post.py'
expected=['schemaVersion','postId','sourcePostId','viewId','sourceId','sourceName','sourcePlatform','sourceType','sourceFeedUrl','sourceWebsiteUrl','originalUrl','canonicalUrl','title','subtitle','summary','excerpt','fullText','fullTextHtml','authorName','authorId','authorUrl','contributors','publishedAt','updatedAt','collectedAt','language','categories','tags','topics','location','media','attachments','links','engagement','rightsMetadata','provenance','sourceMetadata','collectionContext']
found=re.search(r"const FIELDS = \[(.*?)\];",engine,re.S)
assert found, '38-field declaration missing'
fields=re.findall(r"'([^']+)'",found.group(1))
assert fields==expected and len(fields)==38, 'universal field contract mismatch'
html=(root/'discovery.html').read_text()
assert 'browser-engine.js' in html and html.index('browser-engine.js') < html.index('discovery.js'), 'engine must load before UI'
assert 'feed-collector-view.js' not in html, 'feature registration must remain in parent app only'
assert 'databaseWrite:false' in engine and 'checkerDecision:\'not-run\'' in engine
assert not re.search(r'indexedDB|localStorage|sessionStorage|serviceWorker|\.publish\(|database\.put|INSERT INTO',engine,re.I), 'unexpected persistence or publishing logic'
print('PASS: 38-field contract, script order, workspace isolation and read-only adapter checks')
