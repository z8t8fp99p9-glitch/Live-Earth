from __future__ import annotations
import json
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
import sys
sys.path.insert(0,str(ROOT/"nature"/"publisher"))
import publisher

class PublisherContractTests(unittest.TestCase):
    def test_profile_is_uncapped_32_day_live_only(self):
        profile=json.loads((ROOT/"nature/publisher/profile.json").read_text(encoding="utf-8"))
        self.assertEqual(profile["publication"]["windowMode"],"rolling-hours")
        self.assertEqual(profile["publication"]["issueWindowHours"],768)
        self.assertEqual(profile["publication"]["maximumStories"],0)
        self.assertEqual(profile["publication"]["minimumStories"],0)
        self.assertEqual(profile["publication"]["adaptiveLookback"]["targetStories"],0)
        self.assertEqual(profile["publication"]["adaptiveLookback"]["expansionHours"],[768])
        self.assertNotIn("sources", profile)
        self.assertNotIn("imageAllowlist", profile)
        self.assertNotIn("database", profile)
        self.assertNotIn("maximumSourceAgeDays", profile["publication"])
        self.assertNotIn("minimumDocumentaryImages",profile["publication"])
        self.assertEqual(profile["viewId"],"nature")

    def test_database_retention_is_configured_for_32_days_in_global_manager(self):
        manager = json.loads((ROOT/"global_collection_manager/config/view-collection-profiles.json").read_text(encoding="utf-8"))
        profile = next(item for item in manager["profiles"] if item["viewId"] == "nature")
        self.assertEqual(profile["retentionDays"], 32)
        self.assertEqual(profile["lookbackWindowHours"], 768)
        self.assertEqual(profile["collectorEntrypoint"], "global_collector")
        self.assertEqual(profile["publisherEntrypoint"], "nature/publisher/newsroom_publisher.py")

    def test_image_selection_keeps_verified_photos_and_chronology(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake_root=Path(tmp); old_root=publisher.ROOT; publisher.ROOT=fake_root
            try:
                rows=[]; verified={}
                for i in range(14):
                    story_id=f"story-{i}"
                    row={"story_id":story_id,"published_at":float(1000-i),"image_rights_status":None,"image_local_path":None,"image_url":None,"image_credit":None,"image_source_url":None,"image_rights_note":None}
                    if i>=8:
                        local=Path("media")/f"{story_id}.jpg"; target=fake_root/local; target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(b"verified-image")
                        record={"local_path":local.as_posix(),"image_url":f"https://raw.githubusercontent.com/example/{story_id}.jpg","credit":f"Creator {i} · CC BY 4.0","source_page":f"https://commons.wikimedia.org/wiki/File:{story_id}.jpg"}
                        verified[story_id]=record
                        row.update({"image_rights_status":publisher.IMAGE_STATUS,"image_local_path":record["local_path"],"image_url":record["image_url"],"image_credit":record["credit"],"image_source_url":record["source_page"],"image_rights_note":"CC BY 4.0 documented use"})
                    rows.append(row)
                selected=publisher.select_engine_story_rows(rows,verified,10)
                self.assertEqual(len(selected),10)
                self.assertEqual(sum(1 for row in selected if row["story_id"] in verified),6)
                self.assertEqual([row["published_at"] for row in selected],sorted((row["published_at"] for row in selected),reverse=True))
            finally: publisher.ROOT=old_root

    def test_read_only_adapter_cannot_write(self):
        con=sqlite3.connect(":memory:"); con.row_factory=sqlite3.Row
        con.execute("CREATE TABLE newsroom_approved_stories(view_id TEXT,story_id TEXT,published_at REAL,image_rights_status TEXT,image_local_path TEXT,image_url TEXT,image_credit TEXT,image_source_url TEXT,image_rights_note TEXT,title TEXT,url TEXT,summary TEXT,source_name TEXT,source_url TEXT,retrieved_at REAL)")
        for i in range(3): con.execute("INSERT INTO newsroom_approved_stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",("nature",f"s{i}",100-i,None,None,None,None,None,None,f"story {i}",f"https://example.org/{i}","Approved summary", "Example", "https://example.org/feed", 101))
        con.execute("PRAGMA query_only=ON")
        adapter=publisher.NatureEngineReadOnlyConnection(con,{},8)
        rows=adapter.execute("SELECT story_id,title,published_at,image_rights_status,image_local_path,image_url,image_credit,image_source_url,image_rights_note FROM stories WHERE published_at >= ? AND published_at < ? ORDER BY published_at DESC LIMIT 500",(0,200)).fetchall()
        self.assertTrue(adapter.story_selection_applied); self.assertEqual(len(rows),3)
        with self.assertRaises(sqlite3.OperationalError): con.execute("INSERT INTO stories VALUES('nope',0,NULL,NULL,NULL,NULL,NULL,NULL,'nope')")
        con.close()

    def test_publisher_opens_database_read_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            db=Path(tmp)/"nature.sqlite3"; con=sqlite3.connect(db)
            con.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY,value TEXT)");con.execute("INSERT INTO publisher_meta VALUES('view_id','nature')");con.commit();con.close()
            with patch.object(publisher,"DB_PATH",db):
                ro=publisher.open_readonly()
                with self.assertRaises(sqlite3.OperationalError): ro.execute("INSERT INTO publisher_meta VALUES('x','y')")
                self.assertEqual(ro.execute("SELECT value FROM publisher_meta WHERE key='view_id'").fetchone()[0],"nature")
                ro.close()

    def test_publisher_source_has_live_mode_and_no_magazine_output(self):
        source=(ROOT/"nature/publisher/publisher.py").read_text(encoding="utf-8")
        self.assertIn('"mode":"live"',source)
        self.assertIn('choices=("live",)',source)
        for forbidden in ("PdfReader","current.pdf","catalog.json","magazine","calendar-month"):
            self.assertNotIn(forbidden,source)
        self.assertIn("mode=ro",source);self.assertIn("PRAGMA query_only=ON",source)

class BrowserContractTests(unittest.TestCase):
    def test_browser_reads_live_feed_only(self):
        client=(ROOT/"nature/view/nature-publisher-client.js").read_text(encoding="utf-8")
        view=(ROOT/"nature/view/nature-view-controller.js").read_text(encoding="utf-8")
        self.assertIn("live-feed.json",client)
        self.assertIn("validateFeed",client)
        for forbidden in ("catalog.json","current.pdf","openMagazine","listSavedMagazines","LiveEarthUniversalPDFViewer"):
            self.assertNotIn(forbidden,client)
            self.assertNotIn(forbidden,view)
        self.assertIn("LIVE FEEDS",view)
        self.assertIn("./nature/view/nature-publisher-client.js",view)
        self.assertIn("REFRESH_MS",view)
        self.assertIn("if(feedArea)feedArea.replaceChildren();",view)
        for forbidden_storage in ("localStorage", "sessionStorage", "indexedDB"):
            self.assertNotIn(forbidden_storage,client)
            self.assertNotIn(forbidden_storage,view)

    def test_actual_controller_is_folder_owned_and_loaded_directly(self):
        view=(ROOT/"nature/view/nature-view-controller.js").read_text(encoding="utf-8")
        update_manager=(ROOT/"update-manager.js").read_text(encoding="utf-8")
        self.assertIn("api.register(VIEW_ID",view)
        self.assertIn('./nature/view/nature-view-controller.js',update_manager)
        self.assertFalse((ROOT/"nature-view-controller.js").exists())

if __name__=="__main__":
    unittest.main(verbosity=2)
