# Andrew Stankus Agency — andrewstankus.com

## Editing the site

Go to **https://app.pagescms.org**, sign in with GitHub, and open
`astankus28/andrewstankus-site` (pick the branch you want to edit).

- **Events & Posts**: add an event or food post: headline, date, city,
  summary, the photo folder name and the recap.
  Leave a blank line between recap paragraphs.
- **Homepage**: slideshow, stats row, commercial photos, client names and logos,
  portfolio grid and testimonials.

Click **Save**. Cloudflare rebuilds the site and it's live in about a minute.

**Photos live in Cloudflare R2**, not in this repo:

1. Export from Lightroom at about 2400px on the long side, quality around 80,
   with your copyright in the metadata. R2 stores exactly what you upload.
2. Cloudflare dashboard → R2 → `andrewstankus-photos` → **Add folder** (name it
   like `2026-11-20-gala`) → drag the photos in.
3. In the post, put that folder name in **Photo folder**.

The site lists the folder live, in file-name order (first photo = cover), and
serves the photos from `photos.andrewstankus.com`.

## How it works

- `content/events/*.md`: one file per event or post
- `data/site.json`: homepage content
- `tools/build.py`: turns those into the event pages, `events/events.js` and `data/site.js`
- `functions/api/photos.js`, `functions/api/cover.js`: list an R2 photo folder / redirect to its cover
  (the bucket is bound to this Pages project as `PHOTOS`)
- `.pages.yml`: the editor's form layout (Pages CMS)

Cloudflare Pages build settings:

- Build command: `pip install -r requirements.txt && python3 tools/build.py --optimize`
- Build output directory: `/`
