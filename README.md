# Andrew Stankus Agency — andrewstankus.com

## Editing the site

Go to **https://app.pagescms.org**, sign in with GitHub, and open
`astankus28/andrewstankus-site` (pick the branch you want to edit).

- **Events & Posts**: add an event or food post: headline, date, city,
  summary, photos (the first one is the cover) and the recap.
  Leave a blank line between recap paragraphs.
- **Homepage**: slideshow, stats row, commercial photos, client names and logos,
  portfolio grid and testimonials.

Click **Save**. Cloudflare rebuilds the site and it's live in about a minute.

**Photos:** export from Lightroom at about 2400px on the long side, quality around 80,
with your copyright in the metadata. Anything larger is scaled down
automatically when the site is built, but the full-size original would still be
stored in the GitHub repo.

## How it works

- `content/events/*.md`: one file per event or post
- `data/site.json`: homepage content
- `tools/build.py`: turns those into the event pages, `events/events.js` and `data/site.js`
- `.pages.yml`: the editor's form layout (Pages CMS)

Cloudflare Pages build settings:

- Build command: `pip install -r requirements.txt && python3 tools/build.py --optimize`
- Build output directory: `/`
