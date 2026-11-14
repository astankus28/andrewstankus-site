// ONE-TIME helper: puts the edited Somich photo into R2 and removes the old one. Deleted right after use.
const FOLDER = 'somich-associates-open-house-2026-11-12/';
export async function onRequestGet({ request, env }) {
  const res = await env.ASSETS.fetch(new URL('/_tmp/57-v2.jpg', request.url));
  if (!res.ok) return Response.json({ error: 'source missing ' + res.status }, { status: 500 });
  await env.PHOTOS.put(FOLDER + '57-v2.jpg', res.body, { httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' } });
  await env.PHOTOS.delete(FOLDER + '57.jpg');
  return Response.json({ ok: true });
}
