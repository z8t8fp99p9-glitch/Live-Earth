#!/usr/bin/env python3
"""Compile a designed 10–20 page LIVE // EARTH magazine JSON into a PDF.

Production mode is fail-closed: no placeholder copy, broken assets, invalid source
references, missing visual credits, or out-of-range issue length are accepted.
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
from html import escape
from io import BytesIO
from typing import Any
from urllib.parse import urlparse

from PIL import Image, ImageOps
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

W, H = A4
NAVY = colors.HexColor('#07111F')
INK = colors.HexColor('#17212A')
MUTED = colors.HexColor('#596875')
CREAM = colors.HexColor('#F5F0E7')
GOLD = colors.HexColor('#D9A77A')
PALE = colors.HexColor('#E7DDCF')
BLUE = colors.HexColor('#9BC7DB')
VALID_PAGE_TYPES = {
    'cover','contents','editor-note','feature','photo-feature','explainer',
    'annotated-image','timeline','briefs','myth-evidence','sources','closing','field-notes'
}
VISUAL_TYPES = {'generated_concept_art','nasa_documentary','licensed_documentary','editorial_graphic','data_visualization'}
PLACEHOLDER_PATTERNS = [
    r'\bplaceholder\b', r'\breplace with\b', r'\breplace all\b', r'\bwrite a source',
    r'\bsource name goes here\b', r'\bexample\.org\b', r'\bbrief one\b', r'\bmilestone one\b',
    r'\bstate the claim neutrally\b', r'\breplace this paragraph\b', r'\bTODO\b'
]


def text(value: Any, limit: int = 5000) -> str:
    return re.sub(r'\s+', ' ', str(value or '')).strip()[:limit]


def valid_https(value: str) -> bool:
    try:
        p = urlparse(str(value))
        return p.scheme == 'https' and bool(p.hostname) and '.' in p.hostname
    except Exception:
        return False


def validate_issue(issue: dict, issue_dir: Path, production: bool = True) -> list[str]:
    errors: list[str] = []
    if issue.get('schemaVersion') != 1: errors.append('schemaVersion must be 1.')
    if not text(issue.get('issueId')): errors.append('issueId is required.')
    if not text(issue.get('title')): errors.append('title is required.')
    pages = issue.get('pages')
    if not isinstance(pages, list):
        return errors + ['pages must be a list.']
    if production and not (10 <= len(pages) <= 20): errors.append(f'Production issue must contain 10–20 pages; found {len(pages)}.')
    if len(pages) < 2: errors.append('At least two pages are required for a preview.')
    sources = issue.get('sources')
    if not isinstance(sources, list):
        sources = []
        errors.append('sources must be a list.')
    if production and len(sources) < 5: errors.append('Production issue must contain at least five source records.')
    for i, source in enumerate(sources):
        if not text(source.get('name')): errors.append(f'Source {i+1} has no name.')
        if not valid_https(source.get('url','')): errors.append(f'Source {i+1} needs an HTTPS URL.')
        if production and any(re.search(p, text(source.get('url','')+' '+source.get('name',''),1000), re.I) for p in PLACEHOLDER_PATTERNS):
            errors.append(f'Source {i+1} still contains placeholder data.')
    for i, page in enumerate(pages):
        ptype = page.get('type')
        if ptype not in VALID_PAGE_TYPES: errors.append(f'Page {i+1} has unsupported type {ptype!r}.')
        for ref in page.get('sourceRefs', []):
            if not isinstance(ref, int) or ref < 0 or ref >= len(sources): errors.append(f'Page {i+1} has invalid sourceRefs index {ref!r}.')
        if production:
            combined = ' '.join(str(page.get(k,'')) for k in ('title','dek','body','claim','evidence','unknown','caption'))
            for pattern in PLACEHOLDER_PATTERNS:
                if re.search(pattern, combined, re.I):
                    errors.append(f'Page {i+1} still contains template/placeholder wording.')
                    break
            if ptype in {'feature','photo-feature','explainer','annotated-image','field-notes','myth-evidence'}:
                body = text(page.get('body') or page.get('evidence') or page.get('dek'), 5000)
                if len(body) < 80: errors.append(f'Page {i+1} needs substantive body/evidence text.')
        image_path = page.get('image')
        if image_path:
            resolved = (issue_dir / image_path).resolve()
            if issue_dir.resolve() not in resolved.parents and resolved != issue_dir.resolve():
                errors.append(f'Page {i+1} image escapes the issue directory.')
            elif not resolved.is_file():
                if production: errors.append(f'Page {i+1} image is missing: {image_path}')
            if production:
                visual_type = page.get('visualType')
                if visual_type not in VISUAL_TYPES: errors.append(f'Page {i+1} image has no recognized visualType.')
                for key in ('caption','credit','rights'):
                    if len(text(page.get(key),1000)) < 5: errors.append(f'Page {i+1} image is missing {key}.')
                if visual_type in {'nasa_documentary','licensed_documentary'}:
                    if not valid_https(page.get('imageSourceUrl','')): errors.append(f'Page {i+1} documentary image lacks imageSourceUrl.')
                    if not text(page.get('rights')): errors.append(f'Page {i+1} documentary image lacks rights notes.')
                if visual_type == 'generated_concept_art' and not re.search(r'concept|illustrat|not a documentary', text(page.get('caption','')+' '+page.get('rights','')), re.I):
                    errors.append(f'Page {i+1} concept artwork must be labelled as conceptual/illustrative.')
    return errors


def para(c: canvas.Canvas, value: Any, x: float, top: float, width: float, *, size=11, leading=None,
         color=INK, font='Helvetica', max_height=300, align=TA_LEFT, bold=False) -> float:
    raw = text(value, 12000)
    if not raw: return top
    style = ParagraphStyle('mag', fontName=('Helvetica-Bold' if bold else font), fontSize=size,
                           leading=leading or size*1.38, textColor=color, alignment=align,
                           spaceAfter=0, splitLongWords=1, allowWidows=0, allowOrphans=0)
    p = Paragraph(escape(raw), style)
    pw, ph = p.wrap(width, max_height)
    if ph > max_height:
        # Fail visually safe: shorten by words; the source link remains on the page.
        words = raw.split()
        while words and ph > max_height:
            words = words[:max(1, int(len(words)*.82))]
            p = Paragraph(escape(' '.join(words).rstrip(' ,.;') + ' …'), style)
            pw, ph = p.wrap(width, max_height)
            if len(words) == 1: break
    p.drawOn(c, x, top-ph)
    return top-ph


def rule(c, x1, y, x2, color=PALE, width=0.8):
    c.setStrokeColor(color); c.setLineWidth(width); c.line(x1,y,x2,y)


def image_bytes(path: Path, box_w: int = 1500, box_h: int = 1100) -> ImageReader:
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im).convert('RGB')
        im = ImageOps.fit(im, (max(1,box_w), max(1,box_h)), method=Image.Resampling.LANCZOS, centering=(0.5,0.5))
        bio = BytesIO(); im.save(bio, format='JPEG', quality=88, optimize=True); bio.seek(0)
        return ImageReader(bio)


def draw_image(c, path: Path, x, y, w, h):
    try: c.drawImage(image_bytes(path, int(w*2.3), int(h*2.3)), x,y,w,h, mask='auto')
    except Exception as exc: raise ValueError(f'Unable to embed image {path}: {exc}') from exc


def page_base(c, idx, total, light=False, section='SUNDAY SPACE JOURNAL'):
    bg = CREAM if light else NAVY
    fg = MUTED if light else colors.HexColor('#9BA9B7')
    c.setFillColor(bg); c.rect(0,0,W,H,stroke=0,fill=1)
    if idx > 1:
        rule(c, 42, 35, W-42, color=PALE if light else colors.HexColor('#273545'), width=.5)
        c.setFont('Helvetica-Bold',7.5); c.setFillColor(fg); c.drawString(42,22,'LIVE // EARTH  ·  '+section.upper()[:54])
        c.setFont('Helvetica',8); c.drawRightString(W-42,22,f'{idx:02d} / {total:02d}')


def header(c, kicker, title, top, light=False, title_size=27):
    accent = colors.HexColor('#99633F') if light else GOLD
    ink = INK if light else colors.HexColor('#F5F1EA')
    c.setFillColor(accent); c.setFont('Helvetica-Bold',8.5); c.drawString(42,top,kicker.upper()[:90])
    y = top-18
    y = para(c,title,42,y,W-84,size=title_size,leading=title_size*1.05,color=ink,bold=True,max_height=95)
    return y-12


def draw_cover(c, p, root, idx, total):
    c.setFillColor(NAVY); c.rect(0,0,W,H,stroke=0,fill=1)
    img=p.get('image')
    if img and (root/img).exists(): draw_image(c,root/img,0,H*0.38,W,H*0.62)
    else:
        c.setFillColor(colors.HexColor('#0A1C30')); c.rect(0,H*.38,W,H*.62,stroke=0,fill=1)
        for n in range(65):
            x=(n*79)%int(W); y=H*.4+((n*137)%int(H*.56)); c.setFillColor(colors.HexColor('#B8D0E0')); c.circle(x,y,(n%3)+.4,stroke=0,fill=1)
    # dark overlay beneath editorial typography
    c.saveState(); c.setFillAlpha(.92); c.setFillColor(NAVY); c.rect(0,0,W,H*.51,stroke=0,fill=1); c.restoreState()
    c.setFillColor(GOLD); c.setFont('Helvetica-Bold',9); c.drawString(38,H-38,'LIVE // EARTH     ·     THE SUNDAY SPACE JOURNAL')
    rule(c,38,H-48,W-38,color=GOLD,width=1)
    c.setFillColor(colors.HexColor('#B9CAD9')); c.setFont('Helvetica-Bold',9); c.drawString(40,H*.345,text(p.get('kicker','THE WEEKLY EDITION')).upper()[:72])
    para(c,p.get('title','The Sunday Space Journal'),40,H*.315,W-80,size=37,leading=36,color=colors.white,bold=True,max_height=150)
    para(c,p.get('dek','Stories and images from the changing universe.'),40,H*.20,W-85,size=12,leading=17,color=colors.HexColor('#D5DEE6'),max_height=90)
    c.setFillColor(GOLD); c.setFont('Helvetica-Bold',8); c.drawString(40,36,text(p.get('date', ''),80).upper())
    c.setFillColor(colors.HexColor('#A8B4C0')); c.setFont('Helvetica',8); c.drawRightString(W-40,36,'A SOURCE-LINKED SPACE JOURNAL')


def draw_contents(c,p,root,idx,total):
    page_base(c,idx,total,light=True)
    end=header(c,p.get('kicker','THE EDITION'),p.get('title','In this edition'),H-55,light=True,title_size=31)
    if p.get('dek'): end=para(c,p['dek'],42,end,W-84,size=10,color=MUTED,max_height=55)-16
    img=p.get('image')
    if img and (root/img).exists(): draw_image(c,root/img,42,H-310,W-84,122)
    y=H-336
    for j,e in enumerate(p.get('entries',[])[:12]):
        rule(c,42,y,W-42,color=colors.HexColor('#D6CCBE'),width=.65)
        c.setFillColor(colors.HexColor('#99633F')); c.setFont('Helvetica-Bold',9); c.drawString(44,y-19,f'{j+1:02d}')
        title=text(e.get('title',''),180)
        para(c,title,78,y-8,W-155,size=10.5,leading=13,color=INK,bold=True,max_height=36)
        c.setFillColor(MUTED); c.setFont('Helvetica',8); c.drawRightString(W-44,y-19,str(e.get('page','')))
        y-=min(48,max(38, 18+13*((len(title)//54)+1)))
        if y<68: break


def draw_editor_note(c,p,root,idx,total):
    page_base(c,idx,total,light=True)
    img=p.get('image'); left_w= W*.39
    if img and (root/img).exists(): draw_image(c,root/img,0,0,left_w,H)
    else: c.setFillColor(colors.HexColor('#E6D9C7')); c.rect(0,0,left_w,H,stroke=0,fill=1)
    x=left_w+24; width=W-x-34; y=H-58
    y=header(c,p.get('kicker','A NOTE FROM THE JOURNAL'),p.get('title','A closer look at this week'),y,light=True,title_size=24)
    y=para(c,p.get('body',''),x,y,width,size=10.5,leading=16,color=INK,max_height=390)-16
    if p.get('dek'): para(c,p['dek'],x,y,width,size=9.5,leading=14,color=MUTED,max_height=130)
    cap=text(p.get('caption',''))
    if cap: para(c,cap,22,52,left_w-38,size=7,leading=9,color=MUTED,max_height=45)


def draw_feature(c,p,root,idx,total,style='feature'):
    light = p.get('background') == 'light' or style in {'field-notes','explainer'}
    page_base(c,idx,total,light=light)
    bgimg=p.get('image'); accent=colors.HexColor('#99633F') if light else GOLD; ink=INK if light else colors.HexColor('#F5F1EA')
    if style == 'photo-feature':
        if bgimg and (root/bgimg).exists(): draw_image(c,root/bgimg,0,H*.47,W,H*.53)
        y=H*.43
        y=header(c,p.get('kicker','FIELD REPORT'),p.get('title','Untitled report'),y,light=light,title_size=25)
        if p.get('dek'): y=para(c,p['dek'],42,y,W-84,size=11,leading=15,color=MUTED if light else colors.HexColor('#BBC8D3'),max_height=55)-8
        y=para(c,p.get('body',''),42,y,W-84,size=10,leading=15,color=ink,max_height=max(100,y-75))
    elif style == 'explainer':
        y=header(c,p.get('kicker','HOW IT WORKS'),p.get('title','A closer look'),H-54,light=light,title_size=25)
        image_h=H*.29
        if bgimg and (root/bgimg).exists(): draw_image(c,root/bgimg,42,y-image_h-8,W-84,image_h)
        y=y-image_h-24
        left_w=(W-98)*.61
        y2=para(c,p.get('body',''),42,y,left_w,size=9.8,leading=14.6,color=ink,max_height=H*.35)
        rx=42+left_w+14
        c.setFillColor(colors.HexColor('#DCE7ED') if light else colors.HexColor('#152A3B')); c.roundRect(rx,y-H*.25,W-42-rx,H*.25,8,stroke=0,fill=1)
        para(c,p.get('sideNote','WHAT THE SOURCE SAYS'),rx+10,y-10,W-42-rx-20,size=8,leading=11,color=accent,bold=True,max_height=28)
        para(c,p.get('sourceNote','Read the original source for methods, context and limitations.'),rx+10,y-40,W-42-rx-20,size=8.2,leading=12,color=ink,max_height=H*.18)
    elif style == 'field-notes':
        y=header(c,p.get('kicker','FIELD NOTES'),p.get('title','Signals from the week'),H-55,light=light,title_size=28)
        img_h=H*.32
        if bgimg and (root/bgimg).exists(): draw_image(c,bgimg if isinstance(bgimg,Path) else root/bgimg,42,y-img_h,W-84,img_h)
        y-=img_h+18
        y=para(c,p.get('body',''),42,y,(W-100)*.62,size=10,leading=15,color=ink,max_height=H*.26)
        para(c,p.get('sideNote','SOURCE NOTE'),42+(W-100)*.62+16,y+4,(W-100)*.38,size=8.5,leading=12,color=accent,bold=True,max_height=H*.24)
    else:
        y=H-54
        if bgimg and (root/bgimg).exists():
            if style == 'feature':
                image_h=H*.41; draw_image(c,root/bgimg,42,y-image_h,W-84,image_h); y=y-image_h-20
            else:
                image_h=H*.34; draw_image(c,root/bgimg,42,y-image_h,W-84,image_h); y=y-image_h-20
        y=header(c,p.get('kicker','FEATURE'),p.get('title','Untitled report'),y,light=light,title_size=26)
        if p.get('dek'): y=para(c,p['dek'],42,y,W-84,size=11,leading=15,color=accent,max_height=50)-9
        body=p.get('body','')
        # Feature bodies use two editorial columns when long enough.
        if len(text(body)) > 680:
            col_gap=18; col_w=(W-84-col_gap)/2
            split_words=text(body).split(); mid=max(1,len(split_words)//2)
            left=' '.join(split_words[:mid]); right=' '.join(split_words[mid:])
            yleft=para(c,left,42,y,col_w,size=9.4,leading=13.7,color=ink,max_height=max(100,y-75))
            para(c,right,42+col_w+col_gap,y,col_w,size=9.4,leading=13.7,color=ink,max_height=max(100,y-75))
        else:
            para(c,body,42,y,W-84,size=10,leading=15,color=ink,max_height=max(100,y-75))
    # source note / image caption kept distinct from the narrative
    ycap=60
    if p.get('caption'):
        para(c,p['caption'],42,ycap,W-84,size=7.5,leading=9,color=MUTED if light else colors.HexColor('#9BA9B7'),max_height=28)
    if p.get('sourceLabel'):
        para(c,p['sourceLabel'],42,43,W-84,size=7,leading=8,color=MUTED if light else colors.HexColor('#9BA9B7'),max_height=18)


def draw_timeline(c,p,root,idx,total):
    page_base(c,idx,total,light=True)
    y=header(c,p.get('kicker','MISSION WATCH'),p.get('title','What happens next'),H-55,light=True,title_size=28)
    y-=8; milestones=p.get('milestones',[])[:7]
    if not milestones: milestones=[{'date':'This week','title':'New source-linked report','detail':text(p.get('body','See the source for details.'))}]
    start_y=y-12; line_x=63; end_y=max(100,start_y-len(milestones)*75)
    c.setStrokeColor(GOLD); c.setLineWidth(2); c.line(line_x,start_y,line_x,end_y)
    for i,m in enumerate(milestones):
        yy=start_y-i*75
        c.setFillColor(GOLD); c.circle(line_x,yy,4,stroke=0,fill=1)
        c.setFillColor(MUTED); c.setFont('Helvetica-Bold',8); c.drawString(82,yy-2,text(m.get('date',''),50))
        para(c,m.get('title',''),82,yy-12,W-125,size=11,leading=13,color=INK,bold=True,max_height=26)
        para(c,m.get('detail',''),82,yy-43,W-125,size=8.4,leading=11,color=MUTED,max_height=33)


def draw_briefs(c,p,root,idx,total):
    page_base(c,idx,total,light=True)
    y=header(c,p.get('kicker','IN BRIEF'),p.get('title','The week in six signals'),H-55,light=True,title_size=27)
    briefs=p.get('stories',[])[:8]; gap=10; cols=2; rows=(len(briefs)+cols-1)//cols
    card_w=(W-84-gap)/2; card_h=min(178,(y-74-gap*(rows-1))/max(1,rows)); top=y
    for i,b in enumerate(briefs):
        col=i%2; row=i//2; x=42+col*(card_w+gap); yy=top-(row+1)*card_h-row*gap
        c.setFillColor(colors.HexColor('#E9E0D3') if i%2==0 else colors.HexColor('#E3E9E9')); c.roundRect(x,yy,card_w,card_h,8,stroke=0,fill=1)
        c.setFillColor(GOLD); c.rect(x,yy+card_h-4,card_w,4,stroke=0,fill=1)
        para(c,b.get('title',''),x+12,yy+card_h-17,card_w-24,size=10,leading=12,color=INK,bold=True,max_height=38)
        para(c,b.get('body',''),x+12,yy+card_h-62,card_w-24,size=8.2,leading=11.5,color=MUTED,max_height=card_h-70)


def draw_myth_evidence(c,p,root,idx,total):
    page_base(c,idx,total,light=True)
    y=header(c,p.get('kicker','EVIDENCE NOTE'),p.get('title','What we know—and what remains open'),H-55,light=True,title_size=25)
    gap=14; col_w=(W-84-gap)/2; box_h=210; top=y-6
    boxes=[('CLAIM',p.get('claim',''),colors.HexColor('#E7D8C7')),('EVIDENCE',p.get('evidence',''),colors.HexColor('#E0E8E8'))]
    for i,(label,body,bg) in enumerate(boxes):
        x=42+i*(col_w+gap); c.setFillColor(bg); c.roundRect(x,top-box_h,col_w,box_h,9,stroke=0,fill=1)
        c.setFillColor(colors.HexColor('#99633F')); c.setFont('Helvetica-Bold',8); c.drawString(x+12,top-20,label)
        para(c,body,x+12,top-35,col_w-24,size=9,leading=13,color=INK,max_height=box_h-48)
    y2=top-box_h-24
    c.setFillColor(NAVY); c.roundRect(42,y2-118,W-84,118,9,stroke=0,fill=1)
    c.setFillColor(GOLD); c.setFont('Helvetica-Bold',8); c.drawString(56,y2-21,'WHAT REMAINS UNKNOWN')
    para(c,p.get('unknown',''),56,y2-34,W-112,size=9,leading=13,color=colors.white,max_height=76)


def draw_sources(c,p,issue,root,idx,total):
    page_base(c,idx,total,light=True)
    y=header(c,p.get('kicker','PROVENANCE'),p.get('title','Sources and image credits'),H-55,light=True,title_size=26)
    y=para(c,p.get('body','Every source is linked so readers can inspect the original reporting.'),42,y,W-84,size=9.2,leading=13,color=MUTED,max_height=50)-15
    sources=issue.get('sources',[])
    for i,s in enumerate(sources):
        name=text(s.get('name','Source'),120); url=text(s.get('url',''),400)
        c.setFillColor(GOLD); c.setFont('Helvetica-Bold',8); c.drawString(44,y-1,f'{i+1:02d}')
        y=para(c,name,73,y+1,W-116,size=9.2,leading=11,color=INK,bold=True,max_height=24)-3
        y=para(c,url,73,y,W-116,size=7,leading=9,color=colors.HexColor('#426D8A'),max_height=22)-7
        if y<60: break
    # Explicit visual disclosure
    para(c,'Original generated illustrations are conceptual, not documentary photographs. NASA media credits follow the linked source metadata and NASA Media Usage Guidelines.',42,62,W-84,size=7.2,leading=9,color=MUTED,max_height=24)


def draw_closing(c,p,root,idx,total):
    c.setFillColor(NAVY); c.rect(0,0,W,H,stroke=0,fill=1)
    img=p.get('image')
    if img and (root/img).exists(): draw_image(c,root/img,0,H*.25,W,H*.75)
    c.setFillAlpha(.93); c.setFillColor(NAVY); c.rect(0,0,W,H*.5,stroke=0,fill=1); c.setFillAlpha(1)
    c.setFillColor(GOLD); c.setFont('Helvetica-Bold',9); c.drawString(42,H*.43,text(p.get('kicker','KEEP LOOKING UP')).upper()[:72])
    para(c,p.get('title','The next question is waiting'),42,H*.39,W-84,size=30,leading=31,color=colors.white,bold=True,max_height=100)
    para(c,p.get('dek',''),42,H*.28,W-84,size=11,leading=15,color=colors.HexColor('#D2DCE5'),max_height=65)
    c.setFillColor(colors.HexColor('#98A8B8')); c.setFont('Helvetica',8); c.drawString(42,35,'LIVE // EARTH  ·  KEEP LOOKING UP')
    c.drawRightString(W-42,35,f'{idx:02d} / {total:02d}')


def build(issue_path: Path, output: Path, allow_preview: bool = False) -> dict:
    raw=json.loads(issue_path.read_text(encoding='utf-8'))
    root=issue_path.parent
    errors=validate_issue(raw,root,production=not allow_preview)
    if errors:
        raise ValueError('Issue validation failed:\n - '+'\n - '.join(errors))
    pages=raw['pages']; total=len(pages)
    output.parent.mkdir(parents=True,exist_ok=True)
    c=canvas.Canvas(str(output),pagesize=A4, pageCompression=1)
    c.setTitle(text(raw.get('title','The Sunday Space Journal'),200))
    c.setAuthor('LIVE // EARTH Magazine Publisher')
    c.setSubject('Source-linked, editorial space magazine')
    for idx,p in enumerate(pages,1):
        ptype=p.get('type')
        if ptype=='cover': draw_cover(c,p,root,idx,total)
        elif ptype=='contents': draw_contents(c,p,root,idx,total)
        elif ptype=='editor-note': draw_editor_note(c,p,root,idx,total)
        elif ptype in {'feature','photo-feature','explainer','annotated-image','field-notes'}: draw_feature(c,p,root,idx,total,style=ptype)
        elif ptype=='timeline': draw_timeline(c,p,root,idx,total)
        elif ptype=='briefs': draw_briefs(c,p,root,idx,total)
        elif ptype=='myth-evidence': draw_myth_evidence(c,p,root,idx,total)
        elif ptype=='sources': draw_sources(c,p,raw,root,idx,total)
        elif ptype=='closing': draw_closing(c,p,root,idx,total)
        else: raise ValueError(f'Unsupported page type: {ptype}')
        c.showPage()
    c.save()
    # Post-build preflight: page count and actual file integrity.
    from pypdf import PdfReader
    reader=PdfReader(str(output), strict=True)
    if len(reader.pages)!=total:
        output.unlink(missing_ok=True)
        raise ValueError(f'PDF page-count mismatch: planned {total}, generated {len(reader.pages)}.')
    if output.stat().st_size < 30_000:
        output.unlink(missing_ok=True)
        raise ValueError('PDF is unexpectedly small; refusing release.')
    return {'path':str(output),'pages':len(reader.pages),'bytes':output.stat().st_size,'title':raw.get('title'),'issueId':raw.get('issueId')}


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('issue_json',type=Path)
    ap.add_argument('--output',type=Path,required=True)
    ap.add_argument('--allow-preview',action='store_true',help='Allow placeholder copy/missing assets for a marked layout preview only.')
    args=ap.parse_args()
    try:
        result=build(args.issue_json.resolve(),args.output.resolve(),args.allow_preview)
        print(json.dumps(result,indent=2))
    except Exception as exc:
        print(f'BUILD FAILED: {exc}',file=sys.stderr); return 2
    return 0
if __name__=='__main__': raise SystemExit(main())
