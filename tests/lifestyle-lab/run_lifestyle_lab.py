#!/usr/bin/env python3
"""Run the shared Universal Editorial Engine against isolated Lifestyle Lab sample data."""
import json, sqlite3, sys
from datetime import datetime, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"editorial-engine"))
import universal_editorial_engine as engine
PROFILE=json.loads((ROOT/"tests/lifestyle-lab/profile.json").read_text(encoding="utf-8"))
FIXTURE=json.loads((ROOT/"tests/lifestyle-lab/stories.json").read_text(encoding="utf-8"))
NOW=datetime.fromisoformat(FIXTURE["generatedAt"].replace("Z","+00:00")).astimezone(timezone.utc)
db=sqlite3.connect(":memory:"); db.row_factory=sqlite3.Row
db.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
db.execute("INSERT INTO publisher_meta VALUES('view_id','lifestyle-lab')")
db.execute("""CREATE TABLE stories(story_id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT NOT NULL,summary TEXT NOT NULL,source_name TEXT NOT NULL,source_url TEXT NOT NULL,published_at REAL NOT NULL,retrieved_at REAL NOT NULL,image_url TEXT,image_local_path TEXT,image_caption TEXT,image_credit TEXT,image_source_url TEXT,image_rights_status TEXT,image_rights_note TEXT,view_id TEXT NOT NULL)""")
for s in FIXTURE["stories"]:
 p=datetime.fromisoformat(s["publishedAt"].replace("Z","+00:00"))
 db.execute("INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(s["id"],s["title"],s["url"],s["summary"],s["sourceName"],s["sourceUrl"],p.timestamp(),NOW.timestamp(),None,None,None,None,None,None,s["rightsNote"],"lifestyle-lab"))
db.commit(); command={"commandId":"lifestyle-lab-local-test","viewId":"lifestyle-lab","publisherId":"lifestyle-lab-publisher","issuedAt":NOW.isoformat(),"mode":"magazine","customRequest":PROFILE["editorialProfile"]["defaultCustomRequest"]}
result=engine.run_engine(db,PROFILE,command,ROOT/"tests/lifestyle-lab/output",NOW); db.close(); print(json.dumps(result["magazine"],indent=2))
