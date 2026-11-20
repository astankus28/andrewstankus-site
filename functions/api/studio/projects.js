// GET /api/studio/projects → all projects with progress  ·  POST { name, client, settings } → new project
import { listProjects, createProject, fail, json } from '../../_lib/proofing.js';

export async function onRequestGet({ env }) {
  try {
    const projects = await listProjects(env);
    return json({
      projects: projects.map((p) => ({
        id: p.id, name: p.name, client: p.client, created: p.created,
        people: p.people.length, picked: p.people.filter((x) => x.submittedAt).length, delivery: p.settings?.mode === 'none',
      })),
    });
  } catch (e) { return fail(e); }
}

export async function onRequestPost({ env, request }) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!String(body.name || '').trim()) return json({ error: 'Give the project a name' }, 400);
    return json({ project: await createProject(env, body) });
  } catch (e) { return fail(e); }
}
