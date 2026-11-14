#!/usr/bin/env python3
"""Build the /events pages from events/events.json.

Run from the repo root:  python3 tools/build_events.py

Writes:
  events/<slug>/index.html   one recap page per event
  events/index.html          list of all events
  events/events.js           data the homepage "Recent Work" section reads

Photos for an event go in images/events/<slug>/01.jpg, 02.jpg, ... (cover = 01.jpg).
"""
import html
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.andrewstankus.com"
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400'
         '&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">')
e = html.escape


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
    folder = f"{up}images/events/{ev['slug']}"
    url = f"{SITE}/events/{ev['slug']}/"
    when = nice_date(ev["date"])
    title = f"{ev['title']} — {ev.get('city', '')} | Andrew Stankus Agency"
    caps = ev.get("captions", [])
    def cap(i):
        return caps[i - 1] if i <= len(caps) and caps[i - 1] else ""
    photos = "\n".join(
        f'    <button aria-label="Open photo {i}"><div class="slot" data-hint="images/events/{ev["slug"]}/{i:02d}.jpg">'
        f'<img src="{folder}/{i:02d}.jpg" alt="{e(cap(i) + " — " if cap(i) else "")}{e(ev["title"])} — photo {i}" loading="lazy">'
        + (f'<span class="cap">{e(cap(i))}</span>' if cap(i) else '') + '</div></button>'
        for i in range(1, ev["photos"] + 1))
    recap = "\n".join(f"      <p>{e(p)}</p>" for p in ev["recap"])
    meta = [("Date", when), ("Client", ev.get("client", "")), ("Venue", ev.get("venue", "")),
            ("City", ev.get("city", "")), ("Coverage", ev.get("category", "")), ("Photos", str(ev["photos"]))]
    meta_html = "".join(f"<div><small>{k}</small>{e(v)}</div>" for k, v in meta if v)
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
        "image": f"{SITE}/images/events/{ev['slug']}/01.jpg",
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
<meta property="og:image" content="{SITE}/images/events/{ev['slug']}/01.jpg">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld)}</script>
{FONTS}
<link rel="stylesheet" href="{up}assets/event.css">
</head>
<body>
{nav(up, 'events')}

<div class="ev-hero slot" data-hint="Cover — images/events/{ev['slug']}/01.jpg">
  <img src="{folder}/01.jpg" alt="{e(ev['title'])}">
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

<section class="gallery" aria-label="Photo gallery">
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
    <div class="slot" data-hint="images/events/{ev['slug']}/01.jpg"><img src="{up}images/events/{ev['slug']}/01.jpg" alt="{e(ev['title'])}" loading="lazy"></div>
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


def main():
    events = json.loads((ROOT / "events/events.json").read_text())
    events.sort(key=lambda x: x["date"], reverse=True)
    for i, ev in enumerate(events):
        out = ROOT / "events" / ev["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(event_page(ev, events[i - 1] if i else None, events[i + 1] if i + 1 < len(events) else None))
        img = ROOT / "images/events" / ev["slug"]
        img.mkdir(parents=True, exist_ok=True)
        (img / ".gitkeep").touch()
    (ROOT / "events/index.html").write_text(index_page(events))
    slim = [{k: ev.get(k, "") for k in ("slug", "title", "date", "client", "venue", "city", "category", "photos", "summary")}
            for ev in events]
    (ROOT / "events/events.js").write_text(
        "// Generated by tools/build_events.py from events/events.json, do not edit by hand.\n"
        f"window.EVENTS = {json.dumps(slim, indent=2)};\n")
    print(f"Built {len(events)} event page(s).")


if __name__ == "__main__":
    main()
