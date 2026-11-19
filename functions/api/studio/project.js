// GET /api/studio/project?id=<id> → project, people, their files and links
// POST /api/studio/project { id, action, ... }:
//   settings   { name, client, settings }      edit the project
//   addPeople  { names: ["Jane Doe", ...] }      add people (one private link each)
//   person     { personId, name, email }        rename / set email
//   unlock     { personId }                     reopen a gallery so they can pick again
//   remove     { personId }                     delete a person and their photos
//   delete     {}                               delete the whole project and its photos
import {
  loadProject, updateProject, listFiles, deleteProject, deletePrefix, normalizeSettings, randomId,
  linkToken, ruleText, fail, json, HttpError,
} from '../../_lib/proofing.js';

async function view(env, project, origin) {
  const files = await listFiles(env, project.id);
  return {
    ...project,
    rule: ruleText(project.settings),
    people: project.people.map((p) => ({
      ...p,
      link: `${origin}/proof/${linkToken(project.id, p.id)}`,
      proofs: files[p.id]?.proofs || [],
      finals: files[p.id]?.finals || [],
    })),
  };
}

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    const cur = await loadProject(env, url.searchParams.get('id'));
    if (!cur) throw new HttpError(404, 'Project not found');
    return json({ project: await view(env, cur.project, url.origin) });
  } catch (e) { return fail(e); }
}

const clean = (s, n = 120) => String(s || '').trim().slice(0, n);

export async function onRequestPost({ env, request }) {
  try {
    const origin = new URL(request.url).origin;
    const b = await request.json().catch(() => ({}));
    if (b.action === 'delete') {
      await deleteProject(env, b.id);
      return json({ ok: true });
    }
    const { project } = await updateProject(env, b.id, async (p) => {
      const person = () => {
        const x = p.people.find((q) => q.id === b.personId);
        if (!x) throw new HttpError(404, 'Person not found');
        return x;
      };
      switch (b.action) {
        case 'settings':
          if (b.name !== undefined) p.name = clean(b.name) || p.name;
          if (b.client !== undefined) p.client = clean(b.client);
          if (b.settings) p.settings = normalizeSettings({ ...p.settings, ...b.settings });
          break;
        case 'addPeople':
          for (const n of (b.names || []).map((x) => clean(x)).filter(Boolean).slice(0, 200)) {
            p.people.push({ id: randomId(16), name: n, email: '', created: new Date().toISOString(), selection: [], note: '', submittedAt: null });
          }
          break;
        case 'person': {
          const x = person();
          if (b.name !== undefined) x.name = clean(b.name) || x.name;
          if (b.email !== undefined) x.email = clean(b.email, 200);
          break;
        }
        case 'unlock': {
          const x = person();
          x.submittedAt = null;
          break;
        }
        case 'remove': {
          const x = person();
          await deletePrefix(env, `_proofing/files/${p.id}/${x.id}/`);
          p.people = p.people.filter((q) => q.id !== x.id);
          break;
        }
        default:
          throw new HttpError(400, 'Unknown action');
      }
    });
    return json({ project: await view(env, project, origin) });
  } catch (e) { return fail(e); }
}
