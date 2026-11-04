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
        page = b'''<!doctype html><html lang="en"><head><title>Example article</title><meta property="og:title" content="Example headline"><meta name="description" content="A long description"><meta name="author" content="A. Writer"><meta property="article:published_time" content="2026-11-02T10:00:00Z"><meta property="og:image" content="/images/story.jpg"><link rel="canonical" href="https://example.org/canonical"></head><body><article><h1>Example headline</h1><p>The full text of this article.</p><a href="/full-story">Read More</a></article></body></html>'''
        items, fmt = parse_payload(page, "text/html", "https://example.org/article")
        self.assertEqual(fmt, "html")
        self.assertEqual(items[0]["title"], "Example headline")
        self.assertIn("full text", items[0]["fullText"].lower())
        self.assertEqual(items[0]["author"], "A. Writer")
        self.assertTrue(items[0]["media"][0]["url"].endswith("/images/story.jpg"))
        self.assertEqual(items[0]["canonicalUrl"], "https://example.org/canonical")
        continuation = next(link for link in items[0]["links"] if link["text"] == "Read More")
        self.assertEqual(continuation["relation"], "article-continuation-candidate")
        self.assertEqual(continuation["url"], "https://example.org/full-story")

    def test_jsonld_article_body_is_fallback_when_visible_article_body_is_absent(self):
        page = b'''<html><head><script type="application/ld+json">{"@type":"NewsArticle","headline":"Structured report","articleBody":"First structured paragraph. Second structured paragraph.","author":{"@type":"Person","name":"A. Reporter"},"datePublished":"2026-11-03T09:00:00Z"}</script></head><body><div>Navigation only</div></body></html>'''
        items, _ = parse_payload(page, "text/html", "https://example.org/structured")
        self.assertIn("First structured paragraph", items[0]["fullText"])
        self.assertEqual(items[0]["author"], "A. Reporter")
        self.assertEqual(items[0]["sourceMetadata"]["articleTextSource"], "jsonld-articleBody")

    def test_json_feed_preserves_media_and_marks_explicit_next_page(self):
        payload = b'''{"items":[{"id":"p1","title":"Multi-page report","url":"https://example.org/story","media":[{"url":"/photo.jpg","mediaType":"image/jpeg","credit":"Source Photo Desk"}],"images":[{"contentUrl":"/full-resolution.png","caption":"Original image"}],"links":[{"rel":"next","href":"/story/page-2"}]}]}'''
        items, _ = parse_payload(payload, "application/json", "https://example.org/feed.json")
        item = items[0]
        self.assertEqual(len(item["media"]), 2)
        self.assertIn("https://example.org/photo.jpg", {x["url"] for x in item["media"]})
        continuation = next(link for link in item["links"] if link["url"].endswith("/story/page-2"))
        self.assertEqual(continuation["relation"], "article-continuation-candidate")

    def test_html_collects_all_original_image_candidates_and_rights_metadata(self):
        page = b'''<!doctype html><html><head>
        <meta property="og:image" content="https://images.example.org/original.jpg">
        <meta property="og:image:alt" content="Crew in habitat">
        <meta name="image:credit" content="Agency Photo Team">
        <meta name="copyright" content="Agency copyright notice">
        <meta name="license" content="https://example.org/terms/image-license">
        <script type="application/ld+json">{"@type":"NewsArticle","headline":"Mission Report","articleBody":"Full report text.","image":{"@type":"ImageObject","contentUrl":"https://images.example.org/structured.png","creator":{"@type":"Organization","name":"Image Unit"},"creditText":"Image Unit","copyrightNotice":"Copyright Image Unit","license":"https://example.org/license"}}</script>
        </head><body><article><h1>Mission Report</h1><p>Article body.</p>
        <img data-src="https://images.example.org/lazy.webp" alt="Habitat scene" data-credit="Field Team" data-rights="Copyright Field Team">
        <picture><source srcset="https://images.example.org/large.avif 2x"></picture>
        </article></body></html>'''
        items, _ = parse_payload(page, "text/html", "https://example.org/report")
        item = items[0]
        urls = {candidate["url"] for candidate in item["media"]}
        self.assertEqual(urls, {
            "https://images.example.org/original.jpg",
            "https://images.example.org/structured.png",
            "https://images.example.org/lazy.webp",
            "https://images.example.org/large.avif",
        })
        by_url = {candidate["url"]: candidate for candidate in item["media"]}
        self.assertEqual(by_url["https://images.example.org/original.jpg"]["credit"], "Agency Photo Team")
        self.assertEqual(by_url["https://images.example.org/lazy.webp"]["credit"], "Field Team")
        self.assertEqual(by_url["https://images.example.org/structured.png"]["creator"], "Image Unit")
        self.assertEqual(item["rightsMetadata"]["copyrightNotice"], "Agency copyright notice")
        self.assertEqual(item["rightsMetadata"]["licenseUrl"], "https://example.org/terms/image-license")
        self.assertIn("image:credit", item["rightsMetadata"]["metadata"])

    def test_unrelated_anchor_is_not_mislabelled_as_continuation(self):
        page = b'''<html><body><article><p>Body</p><a href="/contact">Contact us</a></article></body></html>'''
        items, _ = parse_payload(page, "text/html", "https://example.org/page")
        link = next(link for link in items[0]["links"] if link["text"] == "Contact us")
        self.assertEqual(link["relation"], "related-link")


if __name__ == "__main__":
    unittest.main()
