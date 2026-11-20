// Client gallery API for /proof/<link>.
//   GET  → the gallery: welcome note, selection rules, proofs, finals and any earlier selection
//   POST { selection: [file names], note } → submits the client's picks (once; the gallery then locks)
import { loadProject, updateProject, listFiles, parseToken, ruleText, notify, json, fail, HttpError } from '../../_lib/proofing.js';

async function find(env, token) {
  const t = parseToken(token);
  if (!t) throw new HttpError(404, 'This gallery link is not valid');
  const cur = await loadProject(env, t.projectId);
  const person = cur?.project.people.find((p) => p.id === t.personId);
  if (!person) throw new HttpError(404, 'This gallery link is not valid');
  return { ...t, project: cur.project, person };
}

export async function onRequestGet({ params, env }) {
  try {
    const { projectId, personId, project, person } = await find(env, params.token);
    const files = (await listFiles(env, projectId, personId))[personId] || { proofs: [], finals: [] };
    const s = project.settings;
    return json({
      project: { name: project.name, client: project.client, message: s.message, deadline: s.deadline },
      person: { name: person.name },
      rules: { mode: s.mode, count: s.count, text: ruleText(s) },
      watermark: s.watermark,
      downloadProofs: s.downloadProofs,
      submitted: !!person.submittedAt,
      submittedAt: person.submittedAt,
      selection: person.selection || [],
      note: person.note || '',
      // Delivery projects (mode "none") have nothing to pick, so only the finals are shown.
      proofs: s.mode === 'none' ? [] : files.proofs.map(({ name, url }) => ({ name, url })),
      // With "download picks right away", their sent picks are ready to download until retouched finals replace them.
      finals: files.finals.length || !(s.downloadPicks && person.submittedAt)
        ? files.finals.map(({ name, url }) => ({ name, url }))
        : files.proofs.filter((f) => (person.selection || []).includes(f.name)).map(({ name, url }) => ({ name, url, kind: 'proofs' })),
    }, 200, { 'X-Robots-Tag': 'noindex, nofollow' });
  } catch (e) { return fail(e); }
}

export async function onRequestPost({ params, env, request }) {
  try {
    const { projectId, personId } = await find(env, params.token);
    const body = await request.json().catch(() => ({}));
    const picked = [...new Set(Array.isArray(body.selection) ? body.selection.map(String) : [])];
    const note = String(body.note || '').slice(0, 2000);
    const files = (await listFiles(env, projectId, personId))[personId] || { proofs: [] };
    const names = new Set(files.proofs.map((f) => f.name));
    if (picked.some((n) => !names.has(n))) throw new HttpError(400, 'One of those photos is no longer in the gallery. Please refresh.');

    const { project, result: person } = await updateProject(env, projectId, (p) => {
      const s = p.settings;
      const n = picked.length;
      if (s.mode === 'none') throw new HttpError(400, 'This gallery is for downloading only');
      if (!n) throw new HttpError(400, 'Please select a photo first');
      if (s.mode === 'exact' && n !== s.count) throw new HttpError(400, `Please select exactly ${s.count} photo${s.count === 1 ? '' : 's'}`);
      if (s.mode === 'upto' && n > s.count) throw new HttpError(400, `Please select no more than ${s.count} photos`);
      const person = p.people.find((x) => x.id === personId);
      if (!person) throw new HttpError(404, 'This gallery link is not valid');
      if (person.submittedAt) throw new HttpError(409, 'Your selection has already been sent');
      person.selection = picked;
      person.note = note;
      person.submittedAt = new Date().toISOString();
      return person;
    });

    const done = project.people.filter((p) => p.submittedAt).length;
    const origin = new URL(request.url).origin;
    await notify(env, {
      subject: `${person.name} picked ${picked.length === 1 ? picked[0] : picked.length + ' photos'} · ${project.name}`,
      lines: [
        `${person.name} sent their selection for ${project.name}${project.client ? ` (${project.client})` : ''}.`,
        `Selected: ${picked.join(', ')}`,
        ...(note ? [`Note: ${note}`] : []),
        `${done} of ${project.people.length} people have now picked.`,
      ],
      link: `${origin}/studio/#${project.id}`,
    });
    return json({ ok: true, submittedAt: person.submittedAt, selection: person.selection });
  } catch (e) { return fail(e); }
}
