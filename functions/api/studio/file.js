// PUT    /api/studio/file?id=<project>&person=<id>&kind=proofs|finals&name=<file>  (body = the photo) → upload
// DELETE /api/studio/file?id=…&person=…&kind=…&name=…                                                → remove
import { loadProject, fileKey, safeName, KINDS, fail, json, HttpError } from '../../_lib/proofing.js';

async function target(env, request) {
  const q = new URL(request.url).searchParams;
  const kind = q.get('kind'), name = q.get('name') || '';
  if (!KINDS.includes(kind)) throw new HttpError(400, 'kind must be proofs or finals');
  if (!safeName(name)) throw new HttpError(400, 'Only JPG, PNG, WebP or AVIF photos');
  const cur = await loadProject(env, q.get('id'));
  if (!cur) throw new HttpError(404, 'Project not found');
  if (!cur.project.people.some((p) => p.id === q.get('person'))) throw new HttpError(404, 'Person not found');
  return { key: fileKey(cur.project.id, q.get('person'), kind, name), name };
}

const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };

export async function onRequestPut({ env, request }) {
  try {
    const { key, name } = await target(env, request);
    const ext = name.split('.').pop().toLowerCase();
    await env.PHOTOS.put(key, request.body, { httpMetadata: { contentType: TYPES[ext] || 'image/jpeg' } });
    return json({ ok: true, name });
  } catch (e) { return fail(e); }
}

export async function onRequestDelete({ env, request }) {
  try {
    const { key } = await target(env, request);
    await env.PHOTOS.delete(key);
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
