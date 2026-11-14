#!/usr/bin/env python3
"""Build the site from the editable content files.

Run from the repo root:  python3 tools/build.py
Cloudflare Pages runs this automatically on every change (see README.md).

Reads:
  content/events/*.md    one file per event / post (edited in Pages CMS)
  data/site.json         homepage content (edited in Pages CMS)

Writes:
  events/<slug>/index.html   recap page per event
  events/index.html          list of all events
  events/events.js           newest events for the homepage
  data/site.js               homepage content for index.html

With --optimize (used on Cloudflare), every JPG under images/ that is larger
than 2400px is scaled down and stamped with the copyright notice, so a
full-size upload is never served at full size.
"""
import html
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import quote

import yaml

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.andrewstankus.com"
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400'
         '&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">')
e = html.escape


def href(up, p):
    """Full URLs (R2 photos) stay as they are; site paths get the relative prefix."""
    return p if re.match(r"^https?://", p or "") else f"{up}{p}"


def absolute(p):
    return p if re.match(r"^https?://", p or "") else f"{SITE}/{p}"


def nice_date(d):
    y, m, dd = map(int, d.split("-"))
    return date(y, m, dd).strftime("%B %-d, %Y")


def nav(up, active=""):
    return f'''<nav>
  <a href="{up}index.html" class="wordmark" aria-label="Andrew Stankus Agency home"><b>Andrew Stankus</b><span>Agency</span></a>
  <ul class="nav-links">
    <li><a href="{up}events/index.html"{' class="on"' if active == 'events' else ''}>Events</a></li>
    <li><a href="{up}index.html#work">Portfolio</a></li>
    <li><a href="{up}index.html#commercial">Commercial</a></li>
    <li><a href="{up}index.html#about">About</a></li>
    <li><a href="{up}index.html#inquire" class="nav-cta">Book a date</a></li>
  </ul>
</nav>'''


FOOTER = '''<footer><span>© {y} Andrew Stankus Agency</span><span>Miami · Cleveland</span>
<a href="mailto:andrew@andrewstankus.com">andrew@andrewstankus.com</a></footer>'''.format(y=date.today().year)


def where(ev):
    return ", ".join(x for x in [ev.get("venue", ""), ev.get("city", "")] if x)


def event_page(ev, prev_ev, next_ev):
    up = "../../"
    url = f"{SITE}/events/{ev['slug']}/"
    when = nice_date(ev["date"])
    title = f"{ev['title']} — {ev.get('city', '')} | Andrew Stankus Agency"
    pics = ev["photos"]
    cover = ev["cover"]
    photos = "\n".join(
        f'    <button aria-label="Open photo {i}"><div class="slot" data-hint="{e(p["image"])}">'
        f'<img src="{e(href(up, p["image"]))}" alt="{e(p["caption"] + " — " if p["caption"] else "")}{e(ev["title"])} — photo {i}" loading="lazy">'
        + (f'<span class="cap">{e(p["caption"])}</span>' if p["caption"] else '') + '</div></button>'
        for i, p in enumerate(pics, 1))
    recap = "\n".join(f"      <p>{e(p)}</p>" for p in ev["recap"])
    meta = [("Date", when), ("Client", ev.get("client", "")), ("Venue", ev.get("venue", "")),
            ("City", ev.get("city", "")), ("Coverage", ev.get("category", "")), ("Photos", str(len(pics)) if pics else "")]
    meta_html = "".join(f"<div><small>{k}</small>{e(v)}</div>" for k, v in meta if v)
    folder_attrs = ""
    if ev["folder"]:
        folder_attrs = (f' data-folder="{e(ev["folder"])}" data-title="{e(ev["title"])}"'
                        f" data-captions='{e(json.dumps(ev['captions']))}'")
    pager = ""
    if prev_ev or next_ev:
        a = (f'<a href="../{prev_ev["slug"]}/index.html"><small>← Newer</small><b>{e(prev_ev["title"])}</b></a>'
             if prev_ev else "<span></span>")
        b = (f'<a href="../{next_ev["slug"]}/index.html"><small>Older →</small><b>{e(next_ev["title"])}</b></a>'
             if next_ev else "<span></span>")
        pager = f'<div class="pager">{a}{b}</div>'
    ld = {
        "@context": "https://schema.org", "@type": "ImageGallery", "name": ev["title"], "url": url,
        "datePublished": ev["date"], "description": ev.get("summary", ""),
        "image": absolute(cover),
        "author": {"@type": "Organization", "name": "Andrew Stankus Agency", "url": SITE + "/"},
        "contentLocation": {"@type": "Place", "name": where(ev)},
    }
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(title)}</title>
<meta name="description" content="{e(ev.get('summary', ''))}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{e(ev['title'])} — {e(when)}">
<meta property="og:description" content="{e(ev.get('summary', ''))}">
<meta property="og:image" content="{e(absolute(cover))}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld)}</script>
{FONTS}
<link rel="stylesheet" href="{up}assets/event.css">
</head>
<body>
{nav(up, 'events')}

<div class="ev-hero slot" data-hint="Cover photo">
  <img src="{e(href(up, cover))}" alt="{e(ev['title'])}">
</div>

<header class="ev-head">
  <span class="crumb"><a href="../index.html">Events</a> &nbsp;/&nbsp; {e(ev.get('category', ''))}</span>
  <h1>{e(ev['title'])}</h1>
  <div class="meta">{meta_html}</div>
</header>

<section class="recap">
  <div class="lede">{e(ev.get('summary', ''))}</div>
  <div>
{recap}
    <div class="credit">Photography by Andrew Stankus Agency</div>
  </div>
</section>

<section class="gallery" aria-label="Photo gallery"{folder_attrs}>
{photos}
</section>

{pager}

<section class="cta">
  <span class="label">Planning an event?</span>
  <h2>Let's make yours look <em>this good.</em></h2>
  <a href="{up}index.html#inquire" class="btn btn-gold">Check availability</a>
</section>

{FOOTER}

<div class="lb" id="lb" aria-modal="true" role="dialog">
  <div class="lb-top"><span>{e(ev['title'])} · {e(when)}</span><span id="lbCount"></span><button class="lb-x" id="lbX" aria-label="Close">×</button></div>
  <button class="lb-arrow lb-prev" id="lbPrev" aria-label="Previous">‹</button>
  <div class="lb-stage" id="lbStage"></div>
  <button class="lb-arrow lb-next" id="lbNext" aria-label="Next">›</button>
</div>
<script src="{up}assets/event.js"></script>
</body>
</html>
'''


def index_page(events):
    up = "../"
    today = date.today()
    cards = []
    for ev in events:
        y, m, d = map(int, ev["date"].split("-"))
        new = (today - date(y, m, d)).days < 21
        cards.append(f'''  <a class="card" href="{ev['slug']}/index.html">
    <div class="slot" data-hint="Cover photo"><img src="{e(href(up, ev['cover']))}" alt="{e(ev['title'])}" loading="lazy"></div>
    <div class="card-meta">{'<span class="new">New</span>' if new else ''}<span>{e(nice_date(ev['date']))}</span><span>{e(ev.get('city', ''))}</span></div>
    <h3>{e(ev['title'])}</h3>
    <p>{e(ev.get('summary', ''))}</p>
  </a>''')
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Events | Andrew Stankus Agency — Event Photography Miami & Cleveland</title>
<meta name="description" content="Recent events covered by Andrew Stankus Agency: galas, corporate evenings, society and brand events in Miami and Cleveland.">
<link rel="canonical" href="{SITE}/events/">
{FONTS}
<link rel="stylesheet" href="{up}assets/event.css">
</head>
<body>
{nav(up, 'events')}
<header class="idx-head">
  <span class="label">Events</span>
  <h1>Recent <em>coverage</em></h1>
  <p>Galas, corporate evenings, society nights and brand events, with a recap and the full gallery for each.</p>
</header>
<section class="idx">
{chr(10).join(cards)}
</section>
{FOOTER}
<script src="{up}assets/event.js"></script>
</body>
</html>
'''


def clean_path(p):
    """Pages CMS stores '/images/x.jpg'; pages use paths relative to the root."""
    p = (p or "").strip()
    return p if re.match(r"^https?://", p) else p.lstrip("/")


def load_events():
    events = []
    for f in sorted((ROOT / "content/events").glob("*.md")):
        text = f.read_text()
        m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", text, re.S)
        fm, body = (yaml.safe_load(m.group(1)) or {}, m.group(2)) if m else ({}, text)
        if fm.get("draft"):
            continue
        photos = []
        for p in fm.get("photos") or []:
            if isinstance(p, str):
                p = {"image": p}
            if p and p.get("image"):
                photos.append({"image": clean_path(p["image"]), "caption": (p.get("caption") or "").strip()})
        folder = clean_path(fm.get("photo_folder") or "").strip("/")
        captions = [str(c or "") for c in (fm.get("captions") or [])]
        if folder:
            photos = []  # listed live from R2 by /api/photos
            cover = f"api/cover?folder={quote(folder)}"
        else:
            cover = photos[0]["image"] if photos else ""
        d = fm.get("date") or date.today()
        ev = {
            "slug": f.stem,
            "title": str(fm.get("title") or f.stem),
            "date": d.isoformat() if hasattr(d, "isoformat") else str(d)[:10],
            "client": str(fm.get("client") or ""),
            "venue": str(fm.get("venue") or ""),
            "city": str(fm.get("city") or ""),
            "category": str(fm.get("category") or ""),
            "summary": str(fm.get("summary") or ""),
            "photos": photos,
            "folder": folder,
            "captions": captions,
            "cover": cover,
            "recap": [re.sub(r"\s+", " ", para).strip() for para in re.split(r"\n\s*\n", body) if para.strip()],
        }
        events.append(ev)
    events.sort(key=lambda x: x["date"], reverse=True)
    return events


def build_site_data():
    site = json.loads((ROOT / "data/site.json").read_text())
    for key in ("about_photo", "agency_photo"):
        site[key] = clean_path(site.get(key) or "")
    for key, field in [("hero", "image"), ("commercial_photos", "image"), ("portfolio", "image"), ("clients", "logo")]:
        for item in site.get(key) or []:
            if item.get(field):
                item[field] = clean_path(item[field])
    (ROOT / "data/site.js").write_text(
        "// Generated by tools/build.py from data/site.json, do not edit by hand.\n"
        f"window.SITE = {json.dumps(site, indent=2, ensure_ascii=False)};\n")


def optimize_images(max_px=2400):
    from PIL import Image, ImageOps
    import piexif
    notice = f"Copyright {date.today().year} Andrew Stankus Agency. All rights reserved. andrewstankus.com".encode()
    n = 0
    for f in (ROOT / "images").rglob("*"):
        if f.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        try:
            im = Image.open(f)
            if max(im.size) <= max_px:
                continue
            icc = im.info.get("icc_profile")
            im = ImageOps.exif_transpose(im)
            im.thumbnail((max_px, max_px), Image.LANCZOS)
            if f.suffix.lower() in (".jpg", ".jpeg"):
                exif = piexif.dump({"0th": {piexif.ImageIFD.Artist: b"Andrew Stankus", piexif.ImageIFD.Copyright: notice}})
                im.convert("RGB").save(f, "JPEG", quality=82, optimize=True, progressive=True, exif=exif, icc_profile=icc)
            else:
                im.save(f)
            n += 1
        except Exception as err:  # never fail the deploy over one image
            print(f"  skipped {f}: {err}")
    print(f"Optimized {n} oversized image(s).")


def main():
    events = load_events()
    for i, ev in enumerate(events):
        out = ROOT / "events" / ev["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(event_page(ev, events[i - 1] if i else None, events[i + 1] if i + 1 < len(events) else None))
    (ROOT / "events").mkdir(exist_ok=True)
    (ROOT / "events/index.html").write_text(index_page(events))
    slim = [{"slug": ev["slug"], "title": ev["title"], "date": ev["date"], "client": ev["client"], "city": ev["city"],
             "category": ev["category"], "summary": ev["summary"], "photos": len(ev["photos"]),
             "cover": ev["cover"]} for ev in events]
    (ROOT / "events/events.js").write_text(
        "// Generated by tools/build.py from content/events, do not edit by hand.\n"
        f"window.EVENTS = {json.dumps(slim, indent=2, ensure_ascii=False)};\n")
    build_site_data()
    print(f"Built {len(events)} event page(s) and homepage data.")
    if "--optimize" in sys.argv:
        optimize_images()


if __name__ == "__main__":
    main()
