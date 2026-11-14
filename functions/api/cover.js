// GET /api/cover?folder=<name>  →  redirects to the first photo in that folder (used for share previews and cards).
import { listFolder } from './photos.js';

export async function onRequestGet({ request, env }) {
  const folder = new URL(request.url).searchParams.get('folder') || '';
  if (!folder || folder.includes('..')) return new Response('folder required', { status: 400 });
  const [first] = await listFolder(env, folder);
  if (!first) return new Response('no photos', { status: 404 });
  return Response.redirect(first, 302);
}
