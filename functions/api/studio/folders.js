// GET  /api/studio/folders                                         → the posted gallery folders in R2 (newest names first)
// POST /api/studio/folders?id=<project>&person=<id>&kind=proofs|finals&from=<folder>  → copy that gallery's photos in
import { loadProject, fileKey, IMG, KINDS, fail, json, HttpError } from '../../_lib/proofing.js';

export async function onRequestGet({ env }) {
  try {
    const folders = [];
    let cursor;
    do {
      const page = await env.PHOTOS.list({ delimiter: '/', cursor, limit: 1000 });
      folders.push(...page.delimitedPrefixes.map((p) => p.replace(/\/$/, '')).filter((f) => !f.startsWith('_')));
      cursor = page.truncated ? page.cursor : null;
    } while (cursor);
    return json({ folders: folders.sort().reverse() });
  } catch (e) { return fail(e); }
}

export async function onRequestPost({ env, request }) {
  try {
    const q = new URL(request.url).searchParams;
    const kind = q.get('kind'), from = q.get('from') || '', person = q.get('person');
    if (!KINDS.includes(kind)) throw new HttpError(400, 'kind must be proofs or finals');
    if (!from || from.startsWith('_') || /[\/\\]|\.\./.test(from)) throw new HttpError(400, 'Pick a gallery folder');
    const cur = await loadProject(env, q.get('id'));
    if (!cur) throw new HttpError(404, 'Project not found');
    if (!cur.project.people.some((p) => p.id === person)) throw new HttpError(404, 'Person not found');
    const keys = [];
    let cursor;
    do {
      const page = await env.PHOTOS.list({ prefix: from + '/', cursor, limit: 1000 });
      keys.push(...page.objects.map((o) => o.key).filter((k) => IMG.test(k) && !k.slice(from.length + 1).includes('/')));
      cursor = page.truncated ? page.cursor : null;
    } while (cursor);
    if (!keys.length) throw new HttpError(404, 'No photos in that folder');
    let copied = 0;
    for (const key of keys) {
      const obj = await env.PHOTOS.get(key);
      if (!obj) continue;
      const name = key.slice(from.length + 1);
      await env.PHOTOS.put(fileKey(cur.project.id, person, kind, name), await obj.arrayBuffer(), { httpMetadata: obj.httpMetadata });
      copied++;
    }
    return json({ ok: true, copied });
  } catch (e) { return fail(e); }
}
