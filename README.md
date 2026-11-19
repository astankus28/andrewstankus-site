# Andrew Stankus Agency — andrewstankus.com

> **Changing the code (Cursor, Claude or a developer)? Read [DESIGN.md](DESIGN.md) first.**
> The design stays exactly as it is: same colors, fonts, spacing and components.

## Editing the site

Go to **https://app.pagescms.org**, sign in with GitHub, and open
`astankus28/andrewstankus-site` (pick the branch you want to edit).

- **Events & Posts**: add an event or food post: headline, date, city,
  summary, the photo folder name and the recap.
  Leave a blank line between recap paragraphs.
  **Rule:** link the featured business's website the first time its name appears
  in the recap, like `[Proof Public House](https://proofcleveland.com/)`.
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

## Client galleries (proofing)

Private galleries where clients pick their favorite photos and download finals.

- **Studio (your dashboard):** https://www.andrewstankus.com/studio/ (log in with `STUDIO_PASSWORD`)
  1. Create a project (e.g. "Fragomen Headshots · Nov 2026"), choose the rule (pick exactly 1, up to N, or any),
     an optional deadline and note, and whether to show the ASA watermark.
  2. Add people, one name per line. Each gets a private link.
  3. Drag each person's proofs onto their **Proofs** box. Use **Email link** / **Copy email text** to send it.
  4. When they pick, you get an email and the gallery locks. Their pick shows in Studio.
     **Let them pick again** reopens it.
  5. Drop the retouched final on their **Finals** box; they download it from the same link.
- **Client link:** `/proof/<project>-<person>`. Not listed anywhere, marked noindex.
- **Watermark:** the ASA mark plus `andrewstankus.com · <file number>` over each proof (`assets/watermark.svg`).
  It's an overlay; for unwatermarked-proof protection, also export proofs from Lightroom with the watermark.

Code: `proof/index.html` + `assets/proof.js` (client), `studio/index.html` + `assets/studio.js` (dashboard),
`functions/api/proof/`, `functions/api/proof-file.js`, `functions/api/studio/`, `functions/_lib/proofing.js`.
Files and data live in the same R2 bucket under `_proofing/`, which `/api/photos` never lists.

Cloudflare Pages → Settings → Variables and Secrets:

| Name | |
|---|---|
| `STUDIO_PASSWORD` | Studio password (required, set as a Secret) |
| `RESEND_API_KEY` | From resend.com, so the site can email you when someone picks (optional) |
| `NOTIFY_TO` | Where those emails go (default andrew@andrewstankus.com) |
| `NOTIFY_FROM` | Sender, e.g. `ASA Proofing <proofs@andrewstankus.com>` once the domain is verified in Resend |
