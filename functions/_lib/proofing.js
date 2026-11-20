// Client proofing: shared helpers for /proof/<link> (client galleries) and /studio (Andrew's dashboard).
//
// Everything lives in the PHOTOS R2 bucket, under _proofing/ (never listed publicly; see api/photos.js):
//   _proofing/data/<projectId>.<secret>.json            project settings, people, selections
//   _proofing/files/<projectId>/<personId>/proofs/<file>  photos the client picks from
//   _proofing/files/<projectId>/<personId>/finals/<file>  retouched finals they download
// The ids are long random strings, so a client link can't be guessed and one client can't reach another's
// photos. The data file also carries a secret that never leaves the server, because the bucket is public.
//
// Settings (Cloudflare Pages → Settings → Variables and Secrets):
//   STUDIO_PASSWORD   password for /studio (required)
//   RESEND_API_KEY    lets the site email you when a client submits (optional; resend.com)
//   NOTIFY_TO         where that email goes (default andrew@andrewstankus.com)
//   NOTIFY_FROM       sender (default "ASA Proofing <onboarding@resend.dev>"; use your domain once verified)

export const PUBLIC = 'https://photos.andrewstankus.com/';
export const IMG = /\.(jpe?g|png|webp|avif)$/i;
const DATA = '_proofing/data/';
const FILES = '_proofing/files/';
export const KINDS = ['proofs', 'finals'];

const ALPHA = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomId(n = 16) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return [...b].map((x) => ALPHA[x % ALPHA.length]).join('');
}
export const validId = (s) => typeof s === 'string' && /^[A-Za-z0-9]{8,40}$/.test(s);
export const safeName = (s) => typeof s === 'string' && s.length > 0 && s.length < 200 && !/[\/\\]|\.\./.test(s) && IMG.test(s);

export const json = (data, status = 200, headers = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

// ---- Projects -------------------------------------------------------------------------------

async function dataKey(env, id) {
  if (!validId(id)) return null;
  const page = await env.PHOTOS.list({ prefix: `${DATA}${id}.`, limit: 5 });
  return page.objects[0]?.key || null;
}

export async function loadProject(env, id) {
  const key = await dataKey(env, id);
  if (!key) return null;
  const obj = await env.PHOTOS.get(key);
  if (!obj) return null;
  return { key, etag: obj.etag, project: await obj.json() };
}

// Read-change-write with a version check, so two clients submitting at the same moment can't
// overwrite each other. `change` edits the project in place and may return a value (or throw).
export async function updateProject(env, id, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await loadProject(env, id);
    if (!cur) throw new HttpError(404, 'Project not found');
    const result = await change(cur.project);
    cur.project.updated = new Date().toISOString();
    const ok = await env.PHOTOS.put(cur.key, JSON.stringify(cur.project), {
      onlyIf: { etagMatches: cur.etag },
      httpMetadata: { contentType: 'application/json', cacheControl: 'no-store' },
    });
    if (ok) return { project: cur.project, result };
    await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
  }
  throw new HttpError(409, 'Busy, please try again');
}

export async function createProject(env, fields) {
  const id = randomId(14);
  const project = {
    id,
    name: String(fields.name || 'Untitled project').slice(0, 120),
    client: String(fields.client || '').slice(0, 120),
    created: new Date().toISOString(),
    settings: normalizeSettings(fields.settings || {}),
    people: [],
  };
  await env.PHOTOS.put(`${DATA}${id}.${randomId(24)}.json`, JSON.stringify(project), {
    httpMetadata: { contentType: 'application/json', cacheControl: 'no-store' },
  });
  return project;
}

export async function listProjects(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix: DATA, cursor, limit: 1000 });
    const objs = await Promise.all(page.objects.map((o) => env.PHOTOS.get(o.key)));
    for (const o of objs) if (o) out.push(await o.json());
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
}

export async function deleteProject(env, id) {
  const key = await dataKey(env, id);
  await deletePrefix(env, `${FILES}${id}/`);
  if (key) await env.PHOTOS.delete(key);
}

export function normalizeSettings(s) {
  const mode = ['exact', 'upto', 'any', 'none'].includes(s.mode) ? s.mode : 'exact';
  return {
    mode,                                                   // exact: pick N · upto: pick up to N · any: pick as many as they like · none: delivery only, they just download
    count: Math.max(1, Math.min(500, parseInt(s.count, 10) || 1)),
    watermark: !!s.watermark,                               // show the ASA mark over the proofs
    downloadProofs: !!s.downloadProofs,                     // let clients download the proofs themselves
    downloadPicks: !!s.downloadPicks,                       // once they send their selection, they can download those photos right away
    message: String(s.message || '').slice(0, 2000),        // note shown at the top of every client's gallery
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(s.deadline || '') ? s.deadline : '',
  };
}

export function ruleText(s) {
  const n = s.count;
  if (s.mode === 'none') return 'Download your photos';
  if (s.mode === 'any') return 'Select as many photos as you like';
  if (s.mode === 'upto') return `Select up to ${n} photo${n === 1 ? '' : 's'}`;
  return n === 1 ? 'Select your favorite photo' : `Select your ${n} favorite photos`;
}

// ---- Files ----------------------------------------------------------------------------------

export const fileKey = (projectId, personId, kind, name) => `${FILES}${projectId}/${personId}/${kind}/${name}`;
const fileUrl = (key, etag) => PUBLIC + key.split('/').map(encodeURIComponent).join('/') + (etag ? `?v=${etag.replace(/"/g, '').slice(0, 8)}` : '');

// All files in a project (or one person), grouped as { personId: { proofs: [...], finals: [...] } }.
export async function listFiles(env, projectId, personId = '') {
  const prefix = `${FILES}${projectId}/${personId ? personId + '/' : ''}`;
  const out = {};
  let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix, cursor, limit: 1000 });
    for (const o of page.objects) {
      const [, , , pid, kind, ...rest] = o.key.split('/');
      const name = rest.join('/');
      if (!KINDS.includes(kind) || !IMG.test(name)) continue;
      const p = (out[pid] ||= { proofs: [], finals: [] });
      p[kind].push({ name, url: fileUrl(o.key, o.etag), size: o.size });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });
  for (const p of Object.values(out)) { p.proofs.sort(byName); p.finals.sort(byName); }
  return out;
}

export async function deletePrefix(env, prefix) {
  let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix, cursor, limit: 1000 });
    if (page.objects.length) await env.PHOTOS.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

// ---- Client links: /proof/<projectId>-<personId> --------------------------------------------

export const linkToken = (projectId, personId) => `${projectId}-${personId}`;
export function parseToken(token) {
  const [projectId, personId] = String(token || '').split('-');
  return validId(projectId) && validId(personId) ? { projectId, personId } : null;
}

// ---- Studio login ---------------------------------------------------------------------------

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const sessionValue = (env) => hmac(env.STUDIO_PASSWORD, 'asa-studio-session-v1');
export const COOKIE = 'asa_studio';

export async function isLoggedIn(request, env) {
  if (!env.STUDIO_PASSWORD) return false;
  const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)asa_studio=([a-f0-9]{64})/);
  return !!m && m[1] === (await sessionValue(env));
}

export function sameText(a, b) {
  a = String(a || ''); b = String(b || '');
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// ---- Errors & email -------------------------------------------------------------------------

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (err) =>
  err instanceof HttpError ? json({ error: err.message }, err.status) : (console.error(err), json({ error: 'Something went wrong' }, 500));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Send an email through Resend. Returns true if Resend accepted it.
export async function sendEmail(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.NOTIFY_FROM || 'ASA Proofing <onboarding@resend.dev>',
        to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) console.error('Resend error', res.status, await res.text());
    return res.ok;
  } catch (e) { console.error('Resend failed', e); return false; }
}

// Greeting name: "Doe, Jane" → Jane (a comma always means last name first); skips titles like "Ms.".
export function firstName(name) {
  let n = String(name || '').trim().replace(/\s+/g, ' ');
  if (n.includes(',')) n = n.split(',').slice(1).join(' ').trim() || n.split(',')[0];
  const w = n.split(' ').filter((x) => x && !/^(mr|mrs|ms|miss|mx|dr|prof|hon|judge|atty)\.?$/i.test(x));
  return (w[0] || '').replace(/,+$/, '');
}

// The reminder a client gets when they haven't picked yet (sent from Studio).
export function reminderEmail(project, person, link) {
  const s = project.settings;
  const first = firstName(person.name);
  const ask = s.mode === 'exact' && s.count === 1 ? 'pick your favorite photo' : s.mode === 'any' ? 'select the photos you like' : s.mode === 'upto' ? `select up to ${s.count} photos` : `select your ${s.count} favorite photos`;
  const by = s.deadline ? ` by ${new Date(s.deadline + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}` : '';
  const title = project.name.replace(/\s*[·-]\s*[A-Z][a-z]{2} \d.*$/, '').trim() || project.name;
  const subject = `Reminder: your ${title} proofs are waiting`;
  const lines = [
    `Hi ${first || 'there'},`,
    `Just a friendly reminder that your proofs are ready. Please ${ask}${by} so I can start retouching.`,
    'Open your private gallery here:',
  ];
  const sign = ['If you have any questions, just reply to this email.', 'Best,\nAndrew Stankus\nAndrew Stankus Agency\n(305) 814-0142'];
  const p = (t) => `<p style="margin:0 0 12px">${esc(t).replace(/\n/g, '<br>')}</p>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">` +
    lines.map(p).join('') +
    `<p style="margin:0 0 18px"><a href="${esc(link)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;letter-spacing:.08em">View my proofs</a></p>` +
    `<p style="margin:0 0 12px;font-size:13px;color:#666">Or paste this link into your browser: ${esc(link)}</p>` +
    sign.map(p).join('') + `</div>`;
  const text = `${lines.join('\n\n')}\n${link}\n\n${sign.join('\n\n')}`;
  return { subject, html, text };
}

// Returns true if the email was sent. Without RESEND_API_KEY it does nothing; the selection
// still shows in /studio.
export async function notify(env, { subject, lines, link }) {
  if (!env.RESEND_API_KEY) return false;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">` +
    lines.map((l) => `<p style="margin:0 0 10px">${esc(l)}</p>`).join('') +
    (link ? `<p style="margin:18px 0 0"><a href="${esc(link)}" style="color:#9a7b3f">Open in Studio</a></p>` : '') + `</div>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.NOTIFY_FROM || 'ASA Proofing <onboarding@resend.dev>',
        to: [env.NOTIFY_TO || 'andrew@andrewstankus.com'],
        subject, html, text: lines.join('\n') + (link ? `\n\nOpen in Studio: ${link}` : ''),
      }),
    });
    if (!res.ok) console.error('Resend error', res.status, await res.text());
    return res.ok;
  } catch (e) { console.error('Resend failed', e); return false; }
}
