# Andrew Stankus Agency — andrewstankus.com

## Editing the site

Updates are made by editing the content files below (Claude does this on request),
then pushing to GitHub. Cloudflare rebuilds the site in about a minute.

**Photos live in Cloudflare R2**, not in this repo:

1. Export from Lightroom at about 2400px on the long side, quality around 80,
   with your copyright in the metadata. R2 stores exactly what you upload.
2. Cloudflare dashboard → R2 → `andrewstankus-photos` → **Add folder** (name it
   like `2026-11-20-gala`) → drag the photos in.
3. In the post's file, set `photo_folder:` to that folder name.

The site lists the folder live, in file-name order (first photo = cover), and
serves the photos from `photos.andrewstankus.com`.

## How it works

- `content/events/*.md`: one file per event or post (`photo_folder`, `captions`, recap text)
- `data/site.json`: homepage content
- `tools/build.py`: turns those into the event pages, `events/events.js` and `data/site.js`
- `functions/api/photos.js`, `functions/api/cover.js`: list an R2 photo folder / redirect to its cover
  (the bucket is bound to this Pages project as `PHOTOS`)

Cloudflare Pages build settings:

- Build command: `pip install -r requirements.txt && python3 tools/build.py --optimize`
- Build output directory: `/`
