// POST /api/studio/login { password }  ·  DELETE /api/studio/login (log out)
import { sessionValue, sameText, isLoggedIn, COOKIE, json } from '../../_lib/proofing.js';

const cookie = (value, maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

export async function onRequestGet({ request, env }) {
  return json({ loggedIn: await isLoggedIn(request, env), setUp: !!env.STUDIO_PASSWORD });
}

export async function onRequestPost({ request, env }) {
  if (!env.STUDIO_PASSWORD) return json({ error: 'Studio is not set up yet: add STUDIO_PASSWORD in Cloudflare Pages settings' }, 503);
  const { password } = await request.json().catch(() => ({}));
  if (!sameText(password, env.STUDIO_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: 'Wrong password' }, 401);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(await sessionValue(env), 60 * 60 * 24 * 60) });
}

export async function onRequestDelete() {
  return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
}
