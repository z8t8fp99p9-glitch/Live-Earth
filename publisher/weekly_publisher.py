#!/usr/bin/env python3
"""Zero-API-key baseline weekly publisher for LIVE // EARTH.

Fetches NASA's public RSS/Atom feeds, builds a source-linked 10–20 page PDF, embeds
NASA Image & Video Library assets where metadata passes conservative checks, and
uses clearly labelled original procedural concept art when no image is eligible.
A failed/insufficient issue never replaces the last good release. This baseline
intentionally does not claim AI-authored editorial summaries or AI-generated art.
"""
from __future__ import annotations
import argparse, hashlib, html, json, os, re, shutil, sys, tempfile, time
import urllib.request, urllib.parse, urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
OUTPUT_REL = Path('published-magazines')
MANIFEST_NAME = 'manifest.json'
CONFIG_PATH = HERE.parent/'config'/'nasa-feeds.json'
DEFAULT_CONFIG = {
    'feeds': [
        {'name':'NASA News','url':'https://www.nasa.gov/news-release/feed/'},
        {'name':'NASA Science','url':'https://science.nasa.gov/feed/'},
        {'name':'NASA Image of the Day','url':'https://www.nasa.gov/feeds/iotd-feed/'},
        {'name':'NASA Artemis','url':'https://www.nasa.gov/blogs/artemis/feed/'},
        {'name':'NASA Space Station','url':'https://www.nasa.gov/blogs/spacestation/feed/'},
    ],
    'rules': {'freshnessDays':8,'minimumStories':5,'maximumStories':8,'minimumNewStoriesVsPriorIssue':3,
              'maximumPdfBytes':16777216,'retainedPdfCount':3}
}
def load_config():
    try:
        cfg=json.loads(CONFIG_PATH.read_text(encoding='utf-8'))
        if not isinstance(cfg.get('feeds'),list) or not cfg['feeds']:
            raise ValueError('feed list missing')
        return cfg
    except Exception:
        return DEFAULT_CONFIG
ENGINE_CONFIG=load_config()
RULES=ENGINE_CONFIG.get('rules',DEFAULT_CONFIG['rules'])
NASA_FEEDS=[(x['name'],x['url']) for x in ENGINE_CONFIG['feeds'] if x.get('name') and str(x.get('url','')).startswith('https://')]
NASA_IMAGE_API = 'https://images-api.nasa.gov/search'
NASA_IMAGE_HOSTS = {'images-assets.nasa.gov'}
NASA_POLICY_URL = 'https://www.nasa.gov/nasa-brand-center/images-and-media/'
USER_AGENT = 'LIVE-EARTH-MagazinePublisher/1.0 (source-linked weekly editorial publication)'
MAX_FEED_BYTES = 4 * 1024 * 1024
MAX_IMAGE_BYTES = 7 * 1024 * 1024
MAX_PDF_BYTES = int(RULES.get('maximumPdfBytes', 16 * 1024 * 1024))
MIN_STORIES = int(RULES.get('minimumStories', 5))
MAX_STORIES = int(RULES.get('maximumStories', 8))
DAYS_WINDOW = int(RULES.get('freshnessDays', 8))
MIN_NEW_STORIES = int(RULES.get('minimumNewStoriesVsPriorIssue', 3))
RETAIN_COUNT = int(RULES.get('retainedPdfCount', 3))

THIRD_PARTY_MARKERS = [
    'getty images','shutterstock','reuters','associated press','ap photo','afp/getty',
    'esa photo','esa /','© esa','jaxa photo','© jaxa','copyrighted by','all rights reserved',
    'dreamstime','alamy stock','istock','depositphotos','wireimage','alamy'
]

class HTMLText(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]
    def handle_data(self, data): self.parts.append(data)
    def text(self): return re.sub(r'\s+', ' ', ' '.join(self.parts)).strip()

class ImgTags(HTMLParser):
    def __init__(self): super().__init__(); self.urls=[]
    def handle_starttag(self, tag, attrs):
        if tag.lower()=='img':
            d=dict(attrs)
            for k in ('src','data-src'):
                if d.get(k): self.urls.append(d[k])


def clean_html(value: str, limit=1800) -> str:
    parser=HTMLText()
    try: parser.feed(value or '')
    except Exception: pass
    s=html.unescape(parser.text())
    return re.sub(r'\s+',' ',s).strip()[:limit]


def parse_date(value: str | None) -> datetime | None:
    if not value: return None
    value=value.strip()
    try:
        dt=parsedate_to_datetime(value)
        if dt.tzinfo is None: dt=dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception: pass
    try:
        dt=datetime.fromisoformat(value.replace('Z','+00:00'))
        if dt.tzinfo is None: dt=dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception: return None


def get_url(url: str, max_bytes: int, timeout=15) -> bytes:
    req=urllib.request.Request(url, headers={'User-Agent':USER_AGENT,'Accept':'application/rss+xml, application/atom+xml, application/xml, application/json, image/*, */*'})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        data=res.read(max_bytes+1)
        if len(data)>max_bytes: raise ValueError(f'Resource exceeded size cap: {url}')
        if res.status >= 400: raise ValueError(f'HTTP status {res.status} for {url}')
        return data


def child_text(el, names):
    for n in names:
        found=el.find(n)
        if found is not None and found.text: return found.text.strip()
    return ''


def parse_feed(xml_bytes: bytes, feed_name: str, feed_url: str) -> list[dict]:
    root=ET.fromstring(xml_bytes)
    entries=[]
    nodes=root.findall('.//item')
    if nodes:
        for it in nodes:
            title=child_text(it,['title'])
            link=child_text(it,['link'])
            desc=child_text(it,['description','{http://purl.org/rss/1.0/modules/content/}encoded','content:encoded'])
            date=child_text(it,['pubDate','{http://purl.org/dc/elements/1.1/}date','date'])
            guid=child_text(it,['guid']) or link
            media=''
            for elem in list(it):
                tag=elem.tag.lower()
                if tag.endswith('content') or tag.endswith('thumbnail') or tag.endswith('enclosure'):
                    media=elem.attrib.get('url','') or media
            if not media and desc:
                parser=ImgTags()
                try: parser.feed(desc)
                except Exception: pass
                if parser.urls: media=parser.urls[0]
            entries.append({'title':title,'url':link,'summary':clean_html(desc),'publishedAt':date,'feed':feed_name,'feedUrl':feed_url,'guid':guid,'mediaCandidate':media})
    else:
        ns={'a':'http://www.w3.org/2005/Atom','content':'http://purl.org/rss/1.0/modules/content/','media':'http://search.yahoo.com/mrss/'}
        for it in root.findall('.//a:entry',ns):
            title=child_text(it,['{http://www.w3.org/2005/Atom}title'])
            link=''
            for ln in it.findall('{http://www.w3.org/2005/Atom}link'):
                if ln.attrib.get('rel','alternate')=='alternate': link=ln.attrib.get('href',''); break
            desc=child_text(it,['{http://www.w3.org/2005/Atom}summary','{http://www.w3.org/2005/Atom}content'])
            date=child_text(it,['{http://www.w3.org/2005/Atom}published','{http://www.w3.org/2005/Atom}updated'])
            media=''
            for elem in it.findall('.//media:content',ns)+it.findall('.//media:thumbnail',ns): media=elem.attrib.get('url','') or media
            entries.append({'title':title,'url':link,'summary':clean_html(desc),'publishedAt':date,'feed':feed_name,'feedUrl':feed_url,'guid':link,'mediaCandidate':media})
    return entries


def nasa_domain(url: str) -> bool:
    try:
        parsed=urllib.parse.urlparse(url)
        host=(parsed.hostname or '').lower()
        return parsed.scheme=='https' and (host=='nasa.gov' or host.endswith('.nasa.gov'))
    except Exception: return False


def story_identity(story: dict) -> str:
    return hashlib.sha256(story.get('url','').strip().encode()).hexdigest()[:20]


def fetch_stories(now: datetime, logs: list[str]) -> list[dict]:
    all_items=[]
    for name,url in NASA_FEEDS:
        try:
            raw=get_url(url,MAX_FEED_BYTES,timeout=12)
            items=parse_feed(raw,name,url)
            logs.append(f'Feed OK: {name} ({len(items)} entries)')
            all_items.extend(items)
        except Exception as e:
            logs.append(f'Feed unavailable: {name}: {str(e)[:180]}')
    cutoff=now-timedelta(days=DAYS_WINDOW)
    unique={}
    for item in all_items:
        link=item.get('url','').strip()
        title=clean_html(item.get('title',''),180)
        dt=parse_date(item.get('publishedAt'))
        if not title or not link or not nasa_domain(link) or not dt or dt<cutoff or dt>now+timedelta(hours=2): continue
        if len(item.get('summary',''))<35: item['summary']=f"NASA published an update titled {title}. Open the original source for the full report, context, technical details and limitations."
        item['publishedDate']=dt.date().isoformat(); item['id']=story_identity(item)
        old=unique.get(link)
        if not old or len(item.get('summary',''))>len(old.get('summary','')): unique[link]=item
    return sorted(unique.values(),key=lambda x:x['publishedDate'],reverse=True)


def image_library_asset(title: str, out_path: Path, logs: list[str]) -> dict | None:
    """Find a first-party NASA Library image; skip obvious third-party-credit markers."""
    query=' '.join(re.findall(r'[A-Za-z0-9]+', title)[:7]) or 'planet space'
    search_url=NASA_IMAGE_API+'?'+urllib.parse.urlencode({'q':query,'media_type':'image','page_size':8})
    try:
        data=json.loads(get_url(search_url,2*1024*1024,timeout=12))
        items=data.get('collection',{}).get('items',[])
    except Exception as e:
        logs.append(f'Image search unavailable for {title[:50]}: {str(e)[:100]}'); return None
    for item in items:
        fields=item.get('data') or [{}]
        meta=fields[0]
        descriptor=' '.join([str(meta.get(k,'')) for k in ('title','description','photographer','secondary_creator','center')]).lower()
        if any(term in descriptor for term in THIRD_PARTY_MARKERS): continue
        links=item.get('links') or []
        # Prefer a NASA-hosted preview/download asset. Never use a logo as a title graphic.
        candidates=[l.get('href','') for l in links if l.get('render')=='image']
        if not candidates: candidates=[l.get('href','') for l in links]
        if not candidates: continue
        asset_url=''
        for u in candidates:
            parsed=urllib.parse.urlparse(u)
            if parsed.scheme=='https' and parsed.hostname in NASA_IMAGE_HOSTS and parsed.path.lower().endswith(('.jpg','.jpeg','.png')):
                asset_url=u; break
        if not asset_url:
            # Check collection.json for large NASA asset URLs.
            collection=item.get('href','')
            if collection:
                try:
                    blob=json.loads(get_url(collection,2*1024*1024,timeout=10))
                    for u in blob.get('items',[]):
                        pp=urllib.parse.urlparse(u)
                        if pp.scheme=='https' and pp.hostname in NASA_IMAGE_HOSTS and pp.path.lower().endswith(('.jpg','.jpeg','.png')) and 'thumb' not in pp.path.lower():
                            asset_url=u; break
                except Exception: pass
        if not asset_url: continue
        try:
            raw=get_url(asset_url,MAX_IMAGE_BYTES,timeout=14)
            from io import BytesIO
            with Image.open(BytesIO(raw)) as im:
                im=ImageOps.exif_transpose(im).convert('RGB')
                im.thumbnail((1800,1300),Image.Resampling.LANCZOS)
                out_path.parent.mkdir(parents=True,exist_ok=True)
                im.save(out_path,'JPEG',quality=84,optimize=True)
            nasa_id=str(meta.get('nasa_id') or 'NASA image')
            center=clean_html(meta.get('center') or 'NASA',100)
            photographer=clean_html(meta.get('photographer') or meta.get('secondary_creator') or 'NASA',160)
            detail_url='https://images.nasa.gov/details/'+urllib.parse.quote(nasa_id,safe='')
            logs.append(f'NASA image selected: {nasa_id} for {title[:50]}')
            return {'kind':'nasa_documentary','caption':f"{clean_html(meta.get('title') or title,160)} · {photographer}",
                    'credit':f'NASA / {center} · {photographer}',
                    'rights':'NASA imagery; usage remains subject to NASA Media Usage Guidelines and any source-page third-party restriction. Assets with detected third-party credit markers are excluded.',
                    'sourceUrl':detail_url,'imageId':nasa_id}
        except Exception as e:
            logs.append(f'NASA image skipped: {str(e)[:120]}')
    return None


def make_concept_art(out_path: Path, seed_text: str, variant: int=0, size=(1600,1100)) -> None:
    """Create original, algorithmic concept art for page design; not documentary imagery."""
    import random, math
    rng=random.Random(int(hashlib.sha256((seed_text+str(variant)).encode()).hexdigest()[:12],16))
    w,h=size
    palettes=[((5,13,28),(25,51,75),(222,169,120)),((13,9,32),(54,32,91),(160,191,239)),((8,19,25),(30,70,71),(224,177,117)),((15,11,16),(72,37,35),(245,178,120))]
    top,mid,accent=palettes[variant%len(palettes)]
    base=Image.new('RGB',(w,h)); pix=base.load()
    for y in range(h):
        t=y/max(1,h-1)
        for x in range(w):
            glow=max(0,1-math.sqrt(((x-w*.64)/(w*.88))**2+((y-h*.38)/(h*.75))**2))
            pix[x,y]=tuple(int(top[k]*(1-t)+mid[k]*t+accent[k]*glow*.22) for k in range(3))
    nebula=Image.new('RGBA',(w,h),(0,0,0,0)); nd=ImageDraw.Draw(nebula)
    for _ in range(22):
        x=rng.randint(-w//5,w); y=rng.randint(0,h); r=rng.randint(30,220)
        col=accent if rng.random()>.5 else mid
        nd.ellipse((x-r,y-r,x+r,y+r),fill=(*col,rng.randint(2,12)))
    nebula=nebula.filter(ImageFilter.GaussianBlur(60)); base=Image.alpha_composite(base.convert('RGBA'),nebula)
    draw=ImageDraw.Draw(base,'RGBA')
    for _ in range(360):
        x=rng.randrange(w); y=rng.randrange(h); r=rng.choice([1,1,1,2,3])
        draw.ellipse((x-r,y-r,x+r,y+r),fill=(220,232,244,rng.randint(65,190)))
    # Planet and atmospheric rim
    px=int(w*rng.uniform(.43,.70)); py=int(h*rng.uniform(.3,.6)); rad=int(min(w,h)*rng.uniform(.2,.34))
    draw.ellipse((px-rad-12,py-rad-12,px+rad+12,py+rad+12),outline=(*accent,100),width=7)
    draw.ellipse((px-rad,py-rad,px+rad,py+rad),fill=(*mid,255),outline=(*accent,235),width=4)
    # texture bands and crater/continent shapes clipped with mask
    mask=Image.new('L',(w,h),0); md=ImageDraw.Draw(mask); md.ellipse((px-rad,py-rad,px+rad,py+rad),fill=255)
    tex=Image.new('RGBA',(w,h),(0,0,0,0)); td=ImageDraw.Draw(tex,'RGBA')
    for j in range(16):
        yy=py-rad+j*(2*rad//15); hh=rng.randint(6,25)
        td.arc((px-rad//2,yy,px+rad+rad//2,yy+hh*3),0,180,fill=(*accent,rng.randint(12,70)),width=rng.randint(3,10))
    for _ in range(12):
        x=px+rng.randint(-rad//2,rad//2); y=py+rng.randint(-rad//2,rad//2); r=rng.randint(8,rad//5)
        td.ellipse((x-r,y-r,x+r,y+r),outline=(*accent,rng.randint(20,80)),width=rng.randint(2,5))
    alpha=tex.getchannel('A'); import PIL.ImageChops as IC
    tex.putalpha(IC.multiply(alpha,mask)); base=Image.alpha_composite(base,tex)
    if any(k in seed_text.lower() for k in ('saturn','ring','orbit')) or variant%3==1:
        ring=Image.new('RGBA',(w,h),(0,0,0,0)); rd=ImageDraw.Draw(ring)
        rd.ellipse((px-rad*1.75,py-rad*.43,px+rad*1.75,py+rad*.55),outline=(*accent,180),width=20)
        rd.ellipse((px-rad*1.95,py-rad*.52,px+rad*1.95,py+rad*.62),outline=(*accent,90),width=8)
        base=Image.alpha_composite(base,ring)
    out_path.parent.mkdir(parents=True,exist_ok=True)
    base.convert('RGB').save(out_path,'JPEG',quality=88,optimize=True)


def create_issue(stories: list[dict], issued_at: datetime, build_dir: Path, logs: list[str]) -> dict:
    asset_dir=build_dir/'assets'; asset_dir.mkdir(parents=True,exist_ok=True)
    title='The Sunday Space Journal'
    issue_id='sunday-'+issued_at.date().isoformat()
    sources=[]
    story_source_refs=[]
    for s in stories:
        story_source_refs.append(len(sources))
        sources.append({'name':s.get('feed','NASA'),'url':s['url'],'accessedAt':issued_at.date().isoformat(),'note':f"Published {s.get('publishedDate','date unavailable')}; collected from official NASA feed."})
    image_policy_ref=len(sources)
    sources.append({'name':'NASA Images and Media Usage Guidelines','url':NASA_POLICY_URL,'accessedAt':issued_at.date().isoformat(),'note':'Image credit and usage-policy reference. Third-party exceptions must be excluded.'})
    # Cover and two atmospheric interstitials are original procedural art.
    cover_path=asset_dir/'cover.jpg'; make_concept_art(cover_path,'The Sunday Space Journal '+issued_at.date().isoformat(),0,(1600,1800))
    contents_path=asset_dir/'contents.jpg'; make_concept_art(contents_path,'Planetary systems and distant skies',1,(1500,550))
    note_path=asset_dir/'editor-note.jpg'; make_concept_art(note_path,'Cosmic observatory',2,(900,1500))
    closing_path=asset_dir/'closing.jpg'; make_concept_art(closing_path,'Beyond the known sky',3,(1600,1500))
    page_common={'visualType':'generated_concept_art','credit':'LIVE // EARTH original procedural illustration',
                 'rights':'Original procedural concept artwork created for LIVE // EARTH; not a documentary image.',
                 'caption':'Original conceptual artwork; not a documentary photograph.'}
    pages=[]
    pages.append({'type':'cover','kicker':'THE WEEKLY EDITION','title':'The Universe, This Week','dek':f"{len(stories)} source-linked reports on the changing sky, our missions and the worlds beyond Earth.",'image':'assets/cover.jpg','imageRole':'cover',**page_common,'date':issued_at.astimezone().strftime('%d %B %Y')})
    pages.append({'type':'contents','kicker':'THE EDITION','title':'In this edition','dek':'A weekly field guide assembled from official NASA source feeds. Every report links to its original publication.','image':'assets/contents.jpg','imageRole':'contents-hero',**page_common,'entries':[]})
    overview=(f"This issue brings together {len(stories)} recent items from NASA’s official news, science, Artemis, space-station and image feeds. "
              "The page text is a source-led digest: each item is tied to its original publication, not presented as independent investigative reporting. "
              "Concept illustrations are clearly labelled; documentary imagery is credited to its NASA source. Open the linked reports for full methods, context and limitations.")
    pages.append({'type':'editor-note','kicker':'HOW TO READ THIS ISSUE','title':'Follow the source, explore the evidence','body':overview,
                  'dek':'No unsupported claims are added to make a story sound more certain. If source checks or issue validation fail, this release is skipped.',
                  'image':'assets/editor-note.jpg','imageRole':'opening-illustration',**page_common})
    used_images=[]
    for ix,s in enumerate(stories):
        asset_path=asset_dir/f"story-{ix+1:02d}.jpg"
        asset_meta=image_library_asset(s['title'],asset_path,logs)
        image_source_ref=None
        if not asset_meta:
            make_concept_art(asset_path,s['title'],ix+1,(1500,1000))
            asset_meta={'kind':'generated_concept_art','caption':f"Original concept illustration inspired by the topic: {s['title']}. Not a documentary image.",
                        'credit':'LIVE // EARTH original procedural illustration',
                        'rights':'Original procedural concept artwork created for LIVE // EARTH; not a documentary image.',
                        'sourceUrl':'','imageId':''}
        else:
            used_images.append(asset_meta['imageId'])
            image_source_ref=len(sources)
            sources.append({'name':f"NASA Images and Video Library — {asset_meta['imageId']}",'url':asset_meta['sourceUrl'],
                            'accessedAt':issued_at.date().isoformat(),'note':f"Image credit: {asset_meta['credit']}. {asset_meta['rights']}"})
        desc=clean_html(s.get('summary',''),1200)
        # Keep any direct feed excerpt short, credited and clearly distinguished from our own context note.
        words=desc.split()
        excerpt=' '.join(words[:25]) + ('…' if len(words)>25 else '')
        title_l=s['title'].lower()
        if any(t in title_l for t in ('artemis','launch','rocket','mission','vibration')):
            context='Engineering milestones and mission schedules can change. The linked source is the reference for the exact status, vehicle roles and any planned-versus-completed distinction.'
        elif any(t in title_l for t in ('mars','planet','cloud','rover')):
            context='Planetary observations need their mission and instrument context. The original report is the reference for observation dates, methods and the limits of the available evidence.'
        elif any(t in title_l for t in ('telescope','star','galaxy','exoplanet','universe')):
            context='Astronomical findings depend on the instruments, data processing and stated uncertainties. The original source contains the specific measurements and scientific qualifications.'
        elif any(t in title_l for t in ('crew','astronaut','habitat','station','human')):
            context='Long-duration exploration combines technical systems with human operations. The linked source identifies the study or mission context and the limits of what it can demonstrate.'
        else:
            context='This is a short source-led digest, not independent investigative reporting. The original publication remains the authority for its full context, methodology and qualifications.'
        body=(f"Source-feed excerpt (attributed to {s.get('feed','NASA')}): {excerpt}\n\n"
              f"Context: {context}\n\n"
              "This page does not claim independent confirmation of every source statement. Open the original report for full context and any qualifications.")
        title_words=re.findall(r'[A-Za-z0-9]+',s['title'])
        side='SOURCE NOTE'
        if any(t in s['title'].lower() for t in ('mars','rover','planet','cloud')): side='PLANETARY SCIENCE'
        elif any(t in s['title'].lower() for t in ('artemis','launch','rocket','mission')): side='MISSION WATCH'
        elif any(t in s['title'].lower() for t in ('telescope','galaxy','star','universe')): side='DEEP SPACE'
        page_type=['feature','photo-feature','explainer','field-notes'][ix%4]
        page={'type':page_type,'kicker':f"FIELD REPORT · {ix+1:02d} / {side}",'title':s['title'],'dek':f"{s.get('feed','NASA')} · {s.get('publishedDate','date unavailable')}",
              'body':body,'image':f'assets/story-{ix+1:02d}.jpg','imageRole':'story-image','visualType':asset_meta['kind'],
              'caption':asset_meta['caption'],'credit':asset_meta['credit'],'rights':asset_meta['rights'],
              'sourceRefs':[story_source_refs[ix]]+([image_source_ref] if image_source_ref is not None else []),'sourceLabel':f"SOURCE: {s['url']}",
              'imageSourceUrl':asset_meta.get('sourceUrl','')}
        if page_type=='explainer':
            page['sideNote']='WHAT THIS SOURCE COVERS'; page['background']='light';
            page['body'] += '\n\nFor this topic, the safest reading is to separate confirmed reporting from planned activity, interpretation and what remains unknown.'
        if page_type=='field-notes':
            page['sideNote']='READ THE ORIGINAL REPORT'; page['background']='light'
        pages.append(page)
    briefs=[]
    for s,ref in zip(stories[:6],story_source_refs[:6]):
        briefs.append({'title':s['title'],'body':f"{s.get('feed','NASA')} · {s.get('publishedDate','')}. Follow the original source for full detail.",'sourceRefs':[ref]})
    pages.append({'type':'briefs','kicker':'THE SHORT LIST','title':'Six signals from the week','stories':briefs})
    pages.append({'type':'sources','kicker':'TRANSPARENCY','title':'Sources, image credits and notes','body':'Every story below links to its official source. NASA documentary images are credited by NASA center/creator and linked to the NASA Images and Video Library. Images with detected third-party copyright markers are excluded. Original procedural illustrations are labelled as conceptual and are not documentary evidence.'})
    pages.append({'type':'closing','kicker':'KEEP LOOKING UP','title':'The next question is waiting','dek':'A new issue appears when enough fresh source material passes the publication gates. If it does not, this edition remains the latest available issue.','body':'','image':'assets/closing.jpg','imageRole':'closing-image',**page_common})
    # Contents page numbers: cover 1, contents 2, note 3, story starts 4.
    pages[1]['entries']=[{'page':4+i,'section':('LEAD FEATURE' if i==0 else 'FIELD REPORT'), 'title':s['title']} for i,s in enumerate(stories)]
    issue={'schemaVersion':1,'issueId':issue_id,'title':title,'subtitle':'A field guide to this week’s discoveries',
           'editionDate':issued_at.date().isoformat(),'profile':'space-journal','productionMode':'autonomous-source-digest',
           'editorialNote':'Generated automatically from official public NASA feeds. Story text is a short source-led digest; no human approval step is used.',
           'sources':sources,'pages':pages,
           'storyIds':[s['id'] for s in stories],
           'storyLinks':[s['url'] for s in stories],
           'imagePolicyUrl':NASA_POLICY_URL,
           'mediaStats':{'nasaDocumentaryImages':len(used_images),'proceduralConceptArtPages':sum(1 for p in pages if p.get('visualType')=='generated_concept_art' or p.get('imageRole') in {'cover','contents-hero','opening-illustration','closing-image'}),'nasaImageIds':used_images}}
    # Additional source-reference list containing the publication's explicit image policy.
    pages[-2]['sourceRefs']=list(range(len(sources)))
    return issue


def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()


def atomic_json(path: Path, value: dict):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(path.suffix+'.tmp')
    tmp.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    tmp.replace(path)


def publish(repo_root: Path, now: datetime, dry_run=False) -> int:
    logs=[]
    print('LIVE // EARTH — autonomous magazine publisher baseline')
    print('Edition policy: no review/approval screen; fail closed; preserve the last-good PDF.')
    stories=fetch_stories(now,logs)
    for line in logs: print(line)
    # Keep only the freshest set. Require enough current source-linked stories.
    stories=stories[:MAX_STORIES]
    if len(stories)<MIN_STORIES:
        print(f'SKIP RELEASE: only {len(stories)} eligible fresh NASA stories (minimum {MIN_STORIES}). Previous PDF remains unchanged.')
        return 0
    output_dir=repo_root/OUTPUT_REL
    manifest_path=output_dir/MANIFEST_NAME
    previous={}
    if manifest_path.exists():
        try: previous=json.loads(manifest_path.read_text(encoding='utf-8'))
        except Exception: previous={}
    old_ids=set(previous.get('currentIssue',{}).get('storyIds',[]))
    new_ids={s['id'] for s in stories}-old_ids
    if previous.get('currentIssue') and len(new_ids)<MIN_NEW_STORIES:
        print(f'SKIP RELEASE: only {len(new_ids)} genuinely new source items versus previous edition (minimum {MIN_NEW_STORIES}). Previous PDF remains unchanged.')
        return 0
    if previous.get('currentIssue',{}).get('editionDate')==now.date().isoformat():
        print('SKIP RELEASE: an edition for this publication date already exists.'); return 0
    issue_id='sunday-'+now.date().isoformat()
    pdf_name=issue_id+'.pdf'
    with tempfile.TemporaryDirectory(prefix='liveearth-magazine-build-') as td:
        work=Path(td)
        issue=create_issue(stories,now,work,logs)
        issue_json=work/'issue.json'; issue_json.write_text(json.dumps(issue,indent=2,ensure_ascii=False),encoding='utf-8')
        pdf_tmp=work/pdf_name
        sys.path.insert(0,str(HERE))
        from build_magazine_pdf import build as build_pdf
        try: result=build_pdf(issue_json,pdf_tmp,production=True)
        except Exception as exc:
            print(f'SKIP RELEASE: PDF build or strict validation failed: {exc}'); print('Previous PDF and manifest remain untouched.'); return 0
        if result['bytes']>MAX_PDF_BYTES:
            print(f'SKIP RELEASE: PDF size {result["bytes"]} exceeds {MAX_PDF_BYTES} byte limit; previous release remains unchanged.'); return 0
        # Re-open the compiled PDF before publication and check all source-linked pages exist.
        from pypdf import PdfReader
        reader=PdfReader(str(pdf_tmp),strict=True)
        if len(reader.pages)!=len(issue['pages']) or not reader.pages[0].extract_text().strip():
            print('SKIP RELEASE: PDF preflight failed; previous release remains unchanged.'); return 0
        # Commit only fully validated single-file publication artifacts.
        if dry_run:
            print(json.dumps({'dryRun':True,'issueId':issue_id,'pages':result['pages'],'bytes':result['bytes'],'storyCount':len(stories),'sha256':sha256(pdf_tmp)},indent=2))
            return 0
        output_dir.mkdir(parents=True,exist_ok=True)
        staged=output_dir/(pdf_name+'.staged')
        shutil.copyfile(pdf_tmp,staged)
        # Check staged file before rename; the manifest is updated only afterward.
        if sha256(staged)!=sha256(pdf_tmp) or staged.stat().st_size!=result['bytes']:
            staged.unlink(missing_ok=True); print('SKIP RELEASE: staged-file integrity check failed.'); return 0
        final_pdf=output_dir/pdf_name
        staged.replace(final_pdf)
        current={'schemaVersion':1,'issueId':issue_id,'kind':'magazine-pdf','title':issue['title'],
                 'editionDate':issue['editionDate'],'publishedAt':now.isoformat(),'path':'./'+pdf_name,
                 'sha256':sha256(final_pdf),'byteLength':final_pdf.stat().st_size,'pageCount':result['pages'],
                 'storyCount':len(stories),'storyIds':issue['storyIds'],'storyLinks':issue['storyLinks'],
                 'imageStats':issue['mediaStats'],'sourceMode':'NASA official RSS + NASA Images and Video Library + labelled procedural artwork',
                 'manualReviewRequired':False,'validation':'passed'}
        history=previous.get('issues',[])
        if not history and previous.get('currentIssue'):
            history=[previous['currentIssue']]
        history=[x for x in history if x.get('issueId')!=issue_id]
        new_history=[current]+history
        new_history=new_history[:RETAIN_COUNT]
        manifest={'schemaVersion':1,'publicationTimezone':'Asia/Kolkata','publisher':'LIVE // EARTH Autonomous Magazine Publisher',
                  'manualReviewRequired':False,'retentionCount':RETAIN_COUNT,'currentIssue':current,'issues':new_history,
                  'policy':{'failure':'skip-release-and-retain-last-good','minimumStoryCount':MIN_STORIES,'minimumNewStories':MIN_NEW_STORIES,
                            'imagePolicyUrl':NASA_POLICY_URL,'storyMode':'short source-led digest; no AI-authored claims in this no-key baseline'}}
        # Commit manifest atomically before deleting any old edition. If manifest writing fails,
        # the previous manifest and every previous PDF remain intact; at worst the new PDF is orphaned.
        atomic_json(manifest_path,manifest)
        keep={Path(x['path'].removeprefix('./')).name for x in new_history}
        for oldpdf in output_dir.glob('sunday-*.pdf'):
            if oldpdf.name not in keep: oldpdf.unlink(missing_ok=True)
        # Keep a small machine-readable build report; no story assets are stored separately in the public directory.
        atomic_json(output_dir/'last-build-report.json',{'status':'published','issueId':issue_id,'pages':result['pages'],'bytes':result['bytes'],
                    'sha256':current['sha256'],'storyCount':len(stories),'log':logs,'validatedAt':now.isoformat()})
        print(f'PUBLISHED: {final_pdf} ({result["pages"]} pages, {result["bytes"]:,} bytes)')
        print('Last-good publication retained unless/ until a newer issue passes every check.')
        return 0


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--repo-root',type=Path,default=REPO)
    ap.add_argument('--dry-run',action='store_true',help='Fetch feeds and validate/build a PDF, but do not write published outputs.')
    ap.add_argument('--now',help='Override timestamp for deterministic tests; ISO date/time accepted.')
    args=ap.parse_args()
    if args.now:
        dt=parse_date(args.now)
        if not dt:
            try: dt=datetime.fromisoformat(args.now).replace(tzinfo=timezone.utc)
            except Exception: ap.error('--now must be an ISO date/time.')
    else: dt=datetime.now(timezone.utc)
    try: return publish(args.repo_root.resolve(),dt,dry_run=args.dry_run)
    except Exception as exc:
        print(f'PUBLISHER ERROR: {exc}',file=sys.stderr)
        print('No new manifest should be considered published. Check output files before attempting recovery.',file=sys.stderr)
        return 2
if __name__=='__main__': raise SystemExit(main())
