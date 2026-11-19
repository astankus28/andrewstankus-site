// GET /api/proof-file?t=<link>&kind=finals|proofs&f=<file name>  →  downloads one photo as a file.
// Finals can always be downloaded; proofs only when the project allows it.
import { loadProject, parseToken, fileKey, safeName, KINDS, json } from '../_lib/proofing.js';

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const t = parseToken(q.get('t'));
  const kind = q.get('kind') || 'finals';
  const name = q.get('f') || '';
  if (!t || !KINDS.includes(kind) || !safeName(name)) return json({ error: 'Not found' }, 404);
  const cur = await loadProject(env, t.projectId);
  const person = cur?.project.people.find((p) => p.id === t.personId);
  if (!person || (kind === 'proofs' && !cur.project.settings.downloadProofs)) return json({ error: 'Not found' }, 404);
  const obj = await env.PHOTOS.get(fileKey(t.projectId, t.personId, kind, name));
  if (!obj) return json({ error: 'Not found' }, 404);
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
      'Content-Disposition': `attachment; filename="${name.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
