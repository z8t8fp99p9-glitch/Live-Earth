import ast
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLLECTOR = ROOT / "data-collection/alien-world/collector.py"
PUBLISHER = ROOT / "publishers/alien-world/publisher.py"


def load_collector():
    spec = importlib.util.spec_from_file_location("alien_world_collector_test", COLLECTOR)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


class PipelineBoundaryTests(unittest.TestCase):
    def test_collector_parses_rss_with_content_and_provenance(self):
        module = load_collector()
        payload = b'''<?xml version="1.0"?><rss><channel><item>
          <title>NASA announces a new science mission</title>
          <link>https://www.nasa.gov/example</link>
          <description><![CDATA[<p>A substantial report summary with scientific context.</p>]]></description>
          <pubDate>Sat, 31 Oct 2026 00:00:00 GMT</pubDate>
        </item></channel></rss>'''
        records = module.parse_feed(payload, "NASA News", "https://www.nasa.gov/feed.xml")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["sourceName"], "NASA News")
        self.assertIn("scientific context", records[0]["summary"])
        self.assertTrue(module.allowed_https(records[0]["url"], ["nasa.gov"]))

    def test_publisher_has_no_network_collection_or_writer_access(self):
        tree = ast.parse(PUBLISHER.read_text(encoding="utf-8"))
        imports, calls = [], []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                imports.append(node.module or "")
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute):
                    calls.append(node.func.attr)
                elif isinstance(node.func, ast.Name):
                    calls.append(node.func.id)
        forbidden_imports = {"urllib.request", "requests", "httpx", "feedparser", "PIL"}
        self.assertFalse(forbidden_imports.intersection(imports))
        self.assertNotIn("urlopen", calls)
        self.assertNotIn("open_writer_db", calls)
        self.assertNotIn("collect_sources", calls)
        self.assertNotIn("prepare_images", calls)
        self.assertIn("run_engine", calls)
        self.assertIn("read_only_connection", calls)

    def test_collector_is_declared_as_network_database_owner(self):
        profile = json.loads((ROOT / "publishers/alien-world/profile.json").read_text())
        self.assertEqual(profile["collection"]["networkAccessOwner"], "AlienWorldDataCollector")
        self.assertTrue(profile["collection"]["writesDatabase"])
        self.assertFalse(profile["collection"]["writesPublicationOutputs"])
        self.assertFalse(profile["output"]["publisherNetworkAccess"])
        self.assertFalse(profile["output"]["publisherDatabaseWriteAccess"])


if __name__ == "__main__":
    unittest.main()
