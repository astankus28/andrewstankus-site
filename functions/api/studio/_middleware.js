// Every /api/studio/* call needs the studio login cookie, except logging in itself.
import { isLoggedIn, json } from '../../_lib/proofing.js';

export async function onRequest({ request, env, next }) {
  const path = new URL(request.url).pathname;
  if (path === '/api/studio/login') return next();
  if (!env.STUDIO_PASSWORD) return json({ error: 'Studio is not set up yet: add STUDIO_PASSWORD in Cloudflare Pages settings' }, 503);
  if (!(await isLoggedIn(request, env))) return json({ error: 'Please log in' }, 401);
  return next();
}
