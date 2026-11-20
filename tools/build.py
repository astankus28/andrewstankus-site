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
PHOTOS = "https://photos.andrewstankus.com/"
GTM = """<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-KVKC466D');</script>
<!-- End Google Tag Manager -->
"""
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400'
         '&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">')
e = html.escape
CATEGORIES = json.loads((ROOT / "data/categories.json").read_text())
# City landing pages (e.g. /miami-event-photography/): same look as the category pages.
CITIES = json.loads((ROOT / "data/cities.json").read_text()) if (ROOT / "data/cities.json").exists() else []


def category_of(ev):
    """The category page an event belongs to (matched on its 'Type of coverage'), or None."""
    for c in CATEGORIES:
        if ev.get("category", "") in c["match"]:
            return c
    return None


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
  <a href="{up}index.html" class="wordmark" aria-label="Andrew Stankus Agency home"><img src="{up}assets/asa-logo.svg" alt="ASA, Andrew Stankus Agency" width="100" height="55"></a>
  <ul class="nav-links">
    <li class="drop"><a href="{up}events/index.html"{' class="on"' if active == 'events' else ''}>Events</a>
      <ul>{"".join(f'<li><a href="{up}{c["slug"]}/index.html">{e(c.get("menu") or c["name"])}</a></li>' for c in CATEGORIES + CITIES)}</ul></li>
    <li><a href="{up}index.html#work">Portfolio</a></li>
    <li><a href="{up}index.html#commercial">Commercial</a></li>
    <li><a href="{up}index.html#about">About</a></li>
    <li><a href="{up}index.html#inquire" class="nav-cta">Book a date</a></li>
  </ul>
</nav>'''


FOOTER = '''<footer><span>© {y} Andrew Stankus Agency</span><span><a href="/miami-event-photography/">Miami</a> · Cleveland</span>
<a href="mailto:andrew@andrewstankus.com">andrew@andrewstankus.com</a></footer>'''.format(y=date.today().year)


def where(ev):
    return ", ".join(x for x in [ev.get("venue", ""), ev.get("city", "")] if x)


def linkify(text):
    """Turn [words](https://...) in recap text into links (opened in a new tab)."""
    return re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)",
                  r'<a href="\2" target="_blank" rel="noopener">\1</a>', text)


def breadcrumbs(items):
    """Hidden breadcrumb data (schema.org BreadcrumbList) so Google can show Events › Category."""
    return '<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [{"@type": "ListItem", "position": i, "name": n, "item": u}
                            for i, (n, u) in enumerate(items, 1)]}) + '</script>'


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
    recap = "\n".join(f"      <p>{linkify(e(p))}</p>" for p in ev["recap"])
    cat = category_of(ev)
    cat_name = cat["name"] if cat else ev.get("category", "")
    crumb_cat = f'<a href="{up}{cat["slug"]}/index.html">{e(cat_name)}</a>' if cat else e(cat_name)
    more = f'\n    <a class="more" href="{up}{cat["slug"]}/index.html">More {e(cat_name)} →</a>' if cat else ""
    meta = [("Date", when), ("Client", ev.get("client", "")), ("Venue", ev.get("venue", "")),
            ("City", ev.get("city", "")), ("Coverage", cat_name), ("Photographer", ev.get("photographer", "")), ("Photos", str(len(pics)) if pics else "")]
    meta_html = "".join(f"<div><small>{k}</small>{e(v)}</div>" for k, v in meta if v)
    credit = (f"Photography by {e(ev['photographer'])} for Andrew Stankus Agency" if ev["photographer"]
              else "Photography by Andrew Stankus Agency")
    folder_attrs = ""
    if ev["folder"]:
        folder_attrs = (f' data-folder="{e(ev["folder"])}" data-title="{e(ev["title"])}"'
                        f" data-captions='{e(json.dumps(ev['captions']))}'")
    video = ""
    if ev.get("video"):
        poster = f' poster="{e(href(up, ev["video_poster"]))}"' if ev.get("video_poster") else ""
        vcredit = f'<div class="credit">Video by {e(ev["video_credit"])}</div>' if ev.get("video_credit") else ""
        video = (f'\n  <div class="ev-video">\n'
                 f'    <video controls playsinline preload="metadata"{poster}>'
                 f'<source src="{e(href(up, ev["video"]))}" type="video/mp4"></video>\n'
                 f'    {vcredit}\n  </div>')
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
{GTM}<meta charset="UTF-8">
<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{up}assets/apple-touch-icon.png">
<link rel="icon" href="{up}favicon.ico" sizes="any">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
{'<meta name="robots" content="noindex, nofollow, noarchive">' + chr(10) if ev.get("unlisted") else ""}<title>{e(title)}</title>
<meta name="description" content="{e(ev.get('summary', ''))}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{e(ev['title'])} — {e(when)}">
<meta property="og:description" content="{e(ev.get('summary', ''))}">
<meta property="og:image" content="{e(absolute(ev["share"]))}">
<meta property="og:image:alt" content="{e(ev['title'])}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld)}</script>
{breadcrumbs([("Home", SITE + "/"), ("Events", SITE + "/events/")] + ([(cat_name, f"{SITE}/{cat['slug']}/")] if cat else []) + [(ev["title"], url)])}
{FONTS}
<link rel="stylesheet" href="{up}assets/event.css">
</head>
<body>
{nav(up, 'events')}

<div class="ev-hero slot" data-hint="Cover photo">
  <img src="{e(href(up, cover))}" alt="{e(ev['title'])}"{f' style="object-position: {e(ev["cover_position"])}"' if ev.get("cover_position") else ""}>
</div>

<header class="ev-head">
  <span class="crumb"><a href="../index.html">Events</a> &nbsp;/&nbsp; {crumb_cat}</span>
  <h1>{e(ev['title'])}</h1>
  <div class="meta">{meta_html}</div>
</header>

<section class="recap{' has-video' if video else ''}">
  <div class="lede">{e(ev.get('summary', ''))}</div>
  <div class="recap-text">
{recap}
    <div class="credit">{credit}</div>{more}
  </div>{video}
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
{GTM}<meta charset="UTF-8">
<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{up}assets/apple-touch-icon.png">
<link rel="icon" href="{up}favicon.ico" sizes="any">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Events | Andrew Stankus Agency — Event Photography Miami & Cleveland</title>
<meta name="description" content="Recent events covered by Andrew Stankus Agency: corporate events, openings, launches and celebrations in Miami and Cleveland.">
<link rel="canonical" href="{SITE}/events/">
{FONTS}
<link rel="stylesheet" href="{up}assets/event.css">
</head>
<body>
{nav(up, 'events')}
<header class="idx-head">
  <span class="label">Events</span>
  <h1>Recent <em>coverage</em></h1>
  <p>Corporate events, openings, launches and celebrations, with a recap and the full gallery for each.</p>
  <div class="cats">{"".join(f'<a href="{up}{c["slug"]}/index.html">{e(c.get("menu") or c["name"])}</a>' for c in CATEGORIES + CITIES)}</div>
</header>
<section class="idx">
{chr(10).join(cards)}
</section>
{FOOTER}
<script src="{up}assets/event.js"></script>
</body>
</html>
'''


def card(ev, up):
    y, m, d = map(int, ev["date"].split("-"))
    new = (date.today() - date(y, m, d)).days < 21
    return f'''  <a class="card" href="{up}events/{ev['slug']}/index.html">
    <div class="slot" data-hint="Cover photo"><img src="{e(href(up, ev['cover']))}" alt="{e(ev['title'])}" loading="lazy"></div>
    <div class="card-meta">{'<span class="new">New</span>' if new else ''}<span>{e(nice_date(ev['date']))}</span><span>{e(ev.get('city', ''))}</span></div>
    <h3>{e(ev['title'])}</h3>
    <p>{e(ev.get('summary', ''))}</p>
  </a>'''


def category_page(c, events):
    """A service page per category (e.g. /gala-photography/): intro text for search, then every
    event in that category, newest first, and the newest one's gallery."""
    up = "../"
    url = f"{SITE}/{c['slug']}/"
    lead = events[0] if events else None
    gal = next((ev for ev in events if ev["folder"]), None)
    hero = (f'''<div class="ev-hero slot" data-hint="Cover photo">
  <img src="{e(href(up, lead['cover']))}" alt="{e(c['name'])} photography by Andrew Stankus Agency"{f' style="object-position: {e(lead["cover_position"])}"' if lead.get("cover_position") else ""}>
</div>
''' if lead else "")
    recent = (f'''<section class="svc-recent">
  <span class="label">{e(c['recent_label'])}</span>
  <div class="idx">
{chr(10).join(card(ev, up) for ev in events)}
  </div>
</section>
''' if events else "")
    gallery = (f'''<section class="gallery" aria-label="Photo gallery" data-folder="{e(gal['folder'])}" data-title="{e(gal['title'])}" data-captions='{e(json.dumps(gal['captions']))}'>
</section>
''' if gal else "")
    intro = "\n".join(f"    <p>{e(p)}</p>" for p in c["intro"])
    ld = {"@context": "https://schema.org", "@type": "Service", "serviceType": c["name"] + " photography",
          "name": c["title"], "url": url, "description": c["description"],
          "provider": {"@type": "Organization", "name": "Andrew Stankus Agency", "url": SITE + "/"},
          "areaServed": [{"@type": "City", "name": "Cleveland, OH"}, {"@type": "AdministrativeArea", "name": "Northeast Ohio"},
                         {"@type": "City", "name": "Miami, FL"}]}
    # Category pages with no events yet share the ASA logo card instead of a blank preview.
    share = (f'<meta property="og:image" content="{e(absolute(lead["share"]))}">\n' if lead else
             f'<meta property="og:image" content="{SITE}/assets/og-image.jpg">\n'
             '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n')
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
{GTM}<meta charset="UTF-8">
<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{up}assets/apple-touch-icon.png">
<link rel="icon" href="{up}favicon.ico" sizes="any">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(c['title'])} | Andrew Stankus Agency</title>
<meta name="description" content="{e(c['description'])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(c['title'])} | Andrew Stankus Agency">
<meta property="og:description" content="{e(c['description'])}">
{share}<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld)}</script>
{breadcrumbs([("Home", SITE + "/"), ("Events", SITE + "/events/"), (c["name"], url)])}
{FONTS}
<link rel="stylesheet" href="{up}assets/event.css">
</head>
<body>
{nav(up, 'events')}

{hero}
<header class="ev-head{'' if lead else ' no-hero'}">
  <span class="crumb"><a href="{up}events/index.html">Events</a> &nbsp;/&nbsp; {e(c['name'])}</span>
  <h1>{c['h1']}</h1>
  <div class="meta"><div><small>Based in</small>Cleveland · Miami</div><div><small>Serving</small>Northeast Ohio, South Florida &amp; beyond</div><div><small>Coverage</small>{e(c['coverage'])}</div></div>
</header>

<section class="recap">
  <div class="lede">{e(c['lede'])}</div>
  <div>
{intro}
    <h3>What we cover</h3>
    <p>{e(c['cover'])}</p>
    <h3>After the night</h3>
    <p>{e(c['after'])}</p>
    <h3>Video</h3>
    <p>Pair photography with a highlight film or social cuts from our video partner, booked as one team.</p>
  </div>
</section>

{recent}
{gallery}
<section class="cta">
  <span class="label">{e(c['cta'])}</span>
  <h2>Let's make yours look <em>this good.</em></h2>
  <a href="{up}index.html#inquire" class="btn btn-gold">Check availability</a>
</section>

{FOOTER}

<div class="lb" id="lb" aria-modal="true" role="dialog">
  <div class="lb-top"><span>{e(gal['title'] if gal else c['name'])}</span><span id="lbCount"></span><button class="lb-x" id="lbX" aria-label="Close">×</button></div>
  <button class="lb-arrow lb-prev" id="lbPrev" aria-label="Previous">‹</button>
  <div class="lb-stage" id="lbStage"></div>
  <button class="lb-arrow lb-next" id="lbNext" aria-label="Next">›</button>
</div>
<script src="{up}assets/event.js"></script>
</body>
</html>
'''


def city_of(ev, c):
    """True if an event happened in this city (matched on its City field)."""
    city = ev.get("city", "")
    return any(m.lower() in city.lower() for m in c["match"])


def homepage_credits():
    """The 'Trained in Miami' festival chips and credit list, taken from index.html so they stay in sync."""
    html_text = (ROOT / "index.html").read_text()
    fest = re.search(r'<div class="fest[^"]*">.*?</div>', html_text, re.S)
    cred = re.search(r'<ul class="credits[^"]*">.*?</ul>', html_text, re.S)
    strip = lambda m: re.sub(r' reveal(?=")', "", m.group(0)) if m else ""
    return strip(fest), strip(cred)


def city_page(c, events):
    """A landing page per city (e.g. /miami-event-photography/), built like the category pages:
    intro text for search, selected credits, that city's events, a short FAQ, then the inquiry button."""
    up = "../"
    url = f"{SITE}/{c['slug']}/"
    lead = events[0] if events else None
    gal = next((ev for ev in events if ev["folder"]), None)
    hero = (f'''<div class="ev-hero slot" data-hint="Cover photo">
  <img src="{e(href(up, lead['cover']))}" alt="{e(c['name'])} event photography by Andrew Stankus Agency"{f' style="object-position: {e(lead["cover_position"])}"' if lead.get("cover_position") else ""}>
</div>
''' if lead else "")
    recent = (f'''<section class="svc-recent">
  <span class="label">{e(c['recent_label'])}</span>
  <div class="idx">
{chr(10).join(card(ev, up) for ev in events)}
  </div>
</section>
''' if events else "")
    gallery = (f'''<section class="gallery" aria-label="Photo gallery" data-folder="{e(gal['folder'])}" data-title="{e(gal['title'])}" data-captions='{e(json.dumps(gal['captions']))}'>
</section>
''' if gal else "")
    intro = "\n".join(f"    <p>{e(p)}</p>" for p in c["intro"])
    services = ", ".join(f'<a href="{up}{k["slug"]}/index.html">{e(k["name"].lower())}</a>' for k in CATEGORIES)
    fest, cred = homepage_credits()
    credits = (f'''<section class="svc-credits">
  <span class="label">Selected credits</span>
  <h2>Trained in <em>{e(c['name'])}</em></h2>
  <p>More than a thousand events covered for World Red Eye. Each credit links to the published gallery.</p>
  {fest}
  {cred}
</section>
''' if cred else "")
    faq = "\n".join(f"    <h3>{e(q)}</h3>\n    <p>{e(a)}</p>" for q, a in c["faq"])
    ld = {"@context": "https://schema.org", "@type": "Service", "serviceType": "Event photography",
          "name": c["title"], "url": url, "description": c["description"],
          "provider": {"@type": "ProfessionalService", "name": "Andrew Stankus Agency", "url": SITE + "/",
                       "telephone": "+1-305-814-0142", "email": "andrew@andrewstankus.com"},
          "areaServed": [{"@type": "City", "name": "Miami, FL"}, {"@type": "City", "name": "Miami Beach, FL"},
                         {"@type": "AdministrativeArea", "name": "Miami-Dade County"},
                         {"@type": "AdministrativeArea", "name": "South Florida"}]}
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in c["faq"]]}
    share = (f'<meta property="og:image" content="{e(absolute(lead["share"]))}">\n' if lead else
             f'<meta property="og:image" content="{SITE}/assets/og-image.jpg">\n'
             '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n')
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
{GTM}<meta charset="UTF-8">
<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{up}assets/apple-touch-icon.png">
<link rel="icon" href="{up}favicon.ico" sizes="any">

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(c['title'])} | Andrew Stankus Agency</title>
<meta name="description" content="{e(c['description'])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(c['title'])} | Andrew Stankus Agency">
<meta property="og:description" content="{e(c['description'])}">
{share}<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld)}</script>
<script type="application/ld+json">{json.dumps(faq_ld)}</script>
{breadcrumbs([("Home", SITE + "/"), ("Events", SITE + "/events/"), (c["name"], url)])}
{FONTS}
<link rel="stylesheet" href="{up}assets/event.css">
</head>
<body>
{nav(up, 'events')}

{hero}
<header class="ev-head{'' if lead else ' no-hero'}">
  <span class="crumb"><a href="{up}events/index.html">Events</a> &nbsp;/&nbsp; {e(c['name'])}</span>
  <h1>{c['h1']}</h1>
  <div class="meta"><div><small>Based in</small>{c['based']}</div><div><small>Serving</small>{c['serving']}</div><div><small>Coverage</small>{e(c['coverage'])}</div></div>
</header>

<section class="recap">
  <div class="lede">{e(c['lede'])}</div>
  <div>
{intro}
    <h3>What we cover</h3>
    <p>Every kind of event Miami throws: {services}, plus headshots set up on-site.</p>
    <h3>Where we work</h3>
    <p>{e(c['areas'])}</p>
    <h3>After the night</h3>
    <p>{e(c['after'])}</p>
    <h3>Video</h3>
    <p>Pair photography with a highlight film or social cuts from our video partner, booked as one team.</p>
  </div>
</section>

{credits}
{recent}
{gallery}
<section class="recap svc-faq">
  <div class="lede">Questions, answered.</div>
  <div>
{faq}
  </div>
</section>

<section class="cta">
  <span class="label">{e(c['cta'])}</span>
  <h2>Let's make yours look <em>this good.</em></h2>
  <a href="{up}index.html#inquire" class="btn btn-gold">Check availability</a>
</section>

{FOOTER}

<div class="lb" id="lb" aria-modal="true" role="dialog">
  <div class="lb-top"><span>{e(gal['title'] if gal else c['name'])}</span><span id="lbCount"></span><button class="lb-x" id="lbX" aria-label="Close">×</button></div>
  <button class="lb-arrow lb-prev" id="lbPrev" aria-label="Previous">‹</button>
  <div class="lb-stage" id="lbStage"></div>
  <button class="lb-arrow lb-next" id="lbNext" aria-label="Next">›</button>
</div>
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
            # Share previews (Facebook etc.) need a horizontal photo: /api/share picks one.
            share_photo = str(fm.get("share_photo") or "").strip().split("/")[-1]
            share = f"api/share?folder={quote(folder)}" + (f"&photo={quote(share_photo)}" if share_photo else "")
        else:
            cover = photos[0]["image"] if photos else ""
            share = cover
        d = fm.get("date") or date.today()
        ev = {
            "slug": f.stem,
            "title": str(fm.get("title") or f.stem),
            "date": d.isoformat() if hasattr(d, "isoformat") else str(d)[:10],
            "client": str(fm.get("client") or ""),
            "venue": str(fm.get("venue") or ""),
            "city": str(fm.get("city") or ""),
            "category": str(fm.get("category") or ""),
            "photographer": str(fm.get("photographer") or "").strip(),
            "summary": str(fm.get("summary") or ""),
            "photos": photos,
            "folder": folder,
            "captions": captions,
            "cover": cover,
            "share": share,
            "unlisted": bool(fm.get("unlisted")),
            "video": clean_path(str(fm.get("video") or "")),
            "video_poster": clean_path(str(fm.get("video_poster") or "")),
            "video_credit": str(fm.get("video_credit") or "").strip(),
            "cover_position": {"top": "center top", "upper": "center 25%", "center": "", "lower": "center 75%", "bottom": "center bottom"}.get(str(fm.get("cover_focus") or "center").lower(), ""),
            "recap": [re.sub(r"\s+", " ", para).strip() for para in re.split(r"\n\s*\n", body) if para.strip()],
        }
        events.append(ev)
    events.sort(key=lambda x: x["date"], reverse=True)
    return events


def build_site_data():
    site = json.loads((ROOT / "data/site.json").read_text())
    for key in ("about_photo", "agency_photo"):
        site[key] = clean_path(site.get(key) or "")
    for key in ("hero", "commercial_photos", "portfolio"):
        for item in site.get(key) or []:
            r2 = (item.get("r2_photo") or "").strip().lstrip("/")
            if r2:
                item["image"] = r2 if re.match(r"^https?://", r2) else PHOTOS + quote(r2)
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


def stamp_versions():
    """Add ?v=<content hash> to script/style links so browsers never show stale content."""
    import hashlib
    def ver(rel):
        f = ROOT / rel
        return hashlib.sha1(f.read_bytes()).hexdigest()[:10] if f.exists() else "0"
    pages = ([ROOT / "index.html", ROOT / "events/index.html"] + list((ROOT / "events").glob("*/index.html"))
             + [ROOT / c["slug"] / "index.html" for c in CATEGORIES + CITIES])
    for page in pages:
        html_text = page.read_text()
        new = re.sub(r'((?:\.\./)*)(data/site\.js|events/events\.js|assets/event\.js|assets/event\.css)(\?v=[0-9a-f]+)?"',
                     lambda m: f'{m.group(1)}{m.group(2)}?v={ver(m.group(2))}"', html_text)
        if new != html_text:
            page.write_text(new)


def main():
    everything = load_events()
    # Unlisted events (private previews/proofs) get a page at their URL but are
    # left out of the events list, homepage, pager and sitemap, and marked noindex.
    for ev in everything:
        if ev["unlisted"]:
            out = ROOT / "events" / ev["slug"] / "index.html"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(event_page(ev, None, None))
    events = [ev for ev in everything if not ev["unlisted"]]
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
    for c in CATEGORIES:
        out = ROOT / c["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(category_page(c, [ev for ev in events if category_of(ev) is c]))
    for c in CITIES:
        out = ROOT / c["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(city_page(c, [ev for ev in events if city_of(ev, c)]))
    build_site_data()
    stamp_versions()
    newest = events[0]["date"] if events else date.today().isoformat()
    def latest(c):
        evs = [ev for ev in events if category_of(ev) is c]
        return evs[0]["date"] if evs else newest
    urls = ([(f"{SITE}/", newest), (f"{SITE}/events/", newest)]
            + [(f"{SITE}/{c['slug']}/", latest(c)) for c in CATEGORIES]
            + [(f"{SITE}/{c['slug']}/", newest) for c in CITIES]
            + [(f"{SITE}/events/{ev['slug']}/", ev["date"]) for ev in events])
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>\n" for u, d in urls)
        + "</urlset>\n")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /proof/\nDisallow: /studio/\nDisallow: /api/\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"Built {len(events)} event page(s) and homepage data.")
    if "--optimize" in sys.argv:
        optimize_images()


if __name__ == "__main__":
    main()
