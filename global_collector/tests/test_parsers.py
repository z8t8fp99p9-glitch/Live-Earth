import unittest
from global_collector.parsers import parse_payload


class ParserTests(unittest.TestCase):
    def test_rss_atom_parser(self):
        xml = b'''<?xml version="1.0"?><rss version="2.0"><channel><item><title>Field Report</title><link>https://example.org/posts/1</link><guid>post-1</guid><description>A detailed summary.</description><pubDate>Tue, 03 Nov 2026 00:00:00 GMT</pubDate><author>Reporter</author><category>Climate</category><enclosure url="https://example.org/photo.jpg" type="image/jpeg" /></item></channel></rss>'''
        items, fmt = parse_payload(xml, "application/rss+xml", "https://example.org/feed.xml")
        self.assertEqual(fmt, "rss_atom")
        self.assertEqual(items[0]["title"], "Field Report")
        self.assertEqual(items[0]["sourcePostId"], "post-1")
        self.assertEqual(items[0]["media"][0]["mediaType"], "image/jpeg")

    def test_json_feed_and_api_envelope(self):
        payload = b'{"version":"https://jsonfeed.org/version/1.1","items":[{"id":"p-1","title":"JSON post","content_text":"Full text","url":"https://example.org/p-1","tags":["science"]}]}'
        items, fmt = parse_payload(payload, "application/feed+json", "https://example.org/feed.json")
        self.assertEqual(fmt, "json")
        self.assertEqual(items[0]["id"], "p-1")
        self.assertEqual(items[0]["tags"], ["science"])
        api_items, _ = parse_payload(b'{"data":{"articles":[{"id":2,"headline":"API item","link":"https://example.org/a"}]}}',
                                     "application/json", "https://example.org/api")
        self.assertEqual(api_items[0]["headline"], "API item")

    def test_html_article_metadata_and_media(self):
        html = b'''<!doctype html><html lang="en"><head><title>Example article</title><meta property="og:title" content="Example headline"><meta name="description" content="A long description"><meta name="author" content="A. Writer"><meta property="article:published_time" content="2026-11-02T10:00:00Z"><meta property="og:image" content="/images/story.jpg"><link rel="canonical" href="https://example.org/canonical"></head><body><article><h1>Example headline</h1><p>The full text of this article.</p></article></body></html>'''
        items, fmt = parse_payload(html, "text/html", "https://example.org/article")
        self.assertEqual(fmt, "html")
        self.assertEqual(items[0]["title"], "Example headline")
        self.assertIn("full text", items[0]["fullText"].lower())
        self.assertEqual(items[0]["author"], "A. Writer")
        self.assertTrue(items[0]["media"][0]["url"].endswith("/images/story.jpg"))
        self.assertEqual(items[0]["canonicalUrl"], "https://example.org/canonical")


if __name__ == "__main__":
    unittest.main()
