var __defProp = Object.defineProperty;
var __name = (target2, value) => __defProp(target2, "name", { value, configurable: true });

// .wrangler/tmp/bundle-Fxnezg/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target2, thisArg, argArray) {
    return Reflect.apply(target2, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// .wrangler/tmp/pages-pB2u3T/functionsWorker-0.15039891924979232.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target2, value) => __defProp2(target2, "name", { value, configurable: true }), "__name");
function stripCfConnectingIPHeader2(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
__name2(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target2, thisArg, argArray) {
    return Reflect.apply(target2, thisArg, [
      stripCfConnectingIPHeader2.apply(null, argArray)
    ]);
  }
});
var PUBLIC = "https://photos.andrewstankus.com/";
var IMG = /\.(jpe?g|png|webp|avif)$/i;
var DATA = "_proofing/data/";
var FILES = "_proofing/files/";
var KINDS = ["proofs", "finals"];
var ALPHA = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomId(n = 16) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return [...b].map((x) => ALPHA[x % ALPHA.length]).join("");
}
__name(randomId, "randomId");
__name2(randomId, "randomId");
var validId = /* @__PURE__ */ __name2((s) => typeof s === "string" && /^[A-Za-z0-9]{8,40}$/.test(s), "validId");
var safeName = /* @__PURE__ */ __name2((s) => typeof s === "string" && s.length > 0 && s.length < 200 && !/[\/\\]|\.\./.test(s) && IMG.test(s), "safeName");
var json = /* @__PURE__ */ __name2((data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } }), "json");
async function dataKey(env, id) {
  if (!validId(id))
    return null;
  const page = await env.PHOTOS.list({ prefix: `${DATA}${id}.`, limit: 5 });
  return page.objects[0]?.key || null;
}
__name(dataKey, "dataKey");
__name2(dataKey, "dataKey");
async function loadProject(env, id) {
  const key = await dataKey(env, id);
  if (!key)
    return null;
  const obj = await env.PHOTOS.get(key);
  if (!obj)
    return null;
  return { key, etag: obj.etag, project: await obj.json() };
}
__name(loadProject, "loadProject");
__name2(loadProject, "loadProject");
async function updateProject(env, id, change) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await loadProject(env, id);
    if (!cur)
      throw new HttpError(404, "Project not found");
    const result = await change(cur.project);
    cur.project.updated = (/* @__PURE__ */ new Date()).toISOString();
    const ok = await env.PHOTOS.put(cur.key, JSON.stringify(cur.project), {
      onlyIf: { etagMatches: cur.etag },
      httpMetadata: { contentType: "application/json", cacheControl: "no-store" }
    });
    if (ok)
      return { project: cur.project, result };
    await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
  }
  throw new HttpError(409, "Busy, please try again");
}
__name(updateProject, "updateProject");
__name2(updateProject, "updateProject");
async function createProject(env, fields) {
  const id = randomId(14);
  const project = {
    id,
    name: String(fields.name || "Untitled project").slice(0, 120),
    client: String(fields.client || "").slice(0, 120),
    created: (/* @__PURE__ */ new Date()).toISOString(),
    settings: normalizeSettings(fields.settings || {}),
    people: []
  };
  await env.PHOTOS.put(`${DATA}${id}.${randomId(24)}.json`, JSON.stringify(project), {
    httpMetadata: { contentType: "application/json", cacheControl: "no-store" }
  });
  return project;
}
__name(createProject, "createProject");
__name2(createProject, "createProject");
async function listProjects(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix: DATA, cursor, limit: 1e3 });
    const objs = await Promise.all(page.objects.map((o) => env.PHOTOS.get(o.key)));
    for (const o of objs)
      if (o)
        out.push(await o.json());
    cursor = page.truncated ? page.cursor : void 0;
  } while (cursor);
  return out.sort((a, b) => (b.created || "").localeCompare(a.created || ""));
}
__name(listProjects, "listProjects");
__name2(listProjects, "listProjects");
async function deleteProject(env, id) {
  const key = await dataKey(env, id);
  await deletePrefix(env, `${FILES}${id}/`);
  if (key)
    await env.PHOTOS.delete(key);
}
__name(deleteProject, "deleteProject");
__name2(deleteProject, "deleteProject");
function normalizeSettings(s) {
  const mode = ["exact", "upto", "any"].includes(s.mode) ? s.mode : "exact";
  return {
    mode,
    // exact: pick N · upto: pick up to N · any: pick as many as they like
    count: Math.max(1, Math.min(500, parseInt(s.count, 10) || 1)),
    watermark: !!s.watermark,
    // show the ASA mark over the proofs
    downloadProofs: !!s.downloadProofs,
    // let clients download the proofs themselves
    message: String(s.message || "").slice(0, 2e3),
    // note shown at the top of every client's gallery
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(s.deadline || "") ? s.deadline : ""
  };
}
__name(normalizeSettings, "normalizeSettings");
__name2(normalizeSettings, "normalizeSettings");
function ruleText(s) {
  const n = s.count;
  if (s.mode === "any")
    return "Select as many photos as you like";
  if (s.mode === "upto")
    return `Select up to ${n} photo${n === 1 ? "" : "s"}`;
  return n === 1 ? "Select your favorite photo" : `Select your ${n} favorite photos`;
}
__name(ruleText, "ruleText");
__name2(ruleText, "ruleText");
var fileKey = /* @__PURE__ */ __name2((projectId, personId, kind, name) => `${FILES}${projectId}/${personId}/${kind}/${name}`, "fileKey");
var fileUrl = /* @__PURE__ */ __name2((key, etag) => PUBLIC + key.split("/").map(encodeURIComponent).join("/") + (etag ? `?v=${etag.replace(/"/g, "").slice(0, 8)}` : ""), "fileUrl");
async function listFiles(env, projectId, personId = "") {
  const prefix = `${FILES}${projectId}/${personId ? personId + "/" : ""}`;
  const out = {};
  let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix, cursor, limit: 1e3 });
    for (const o of page.objects) {
      const [, , , pid, kind, ...rest] = o.key.split("/");
      const name = rest.join("/");
      if (!KINDS.includes(kind) || !IMG.test(name))
        continue;
      const p = out[pid] ||= { proofs: [], finals: [] };
      p[kind].push({ name, url: fileUrl(o.key, o.etag), size: o.size });
    }
    cursor = page.truncated ? page.cursor : void 0;
  } while (cursor);
  const byName = /* @__PURE__ */ __name2((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true }), "byName");
  for (const p of Object.values(out)) {
    p.proofs.sort(byName);
    p.finals.sort(byName);
  }
  return out;
}
__name(listFiles, "listFiles");
__name2(listFiles, "listFiles");
async function deletePrefix(env, prefix) {
  let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix, cursor, limit: 1e3 });
    if (page.objects.length)
      await env.PHOTOS.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : void 0;
  } while (cursor);
}
__name(deletePrefix, "deletePrefix");
__name2(deletePrefix, "deletePrefix");
var linkToken = /* @__PURE__ */ __name2((projectId, personId) => `${projectId}-${personId}`, "linkToken");
function parseToken(token) {
  const [projectId, personId] = String(token || "").split("-");
  return validId(projectId) && validId(personId) ? { projectId, personId } : null;
}
__name(parseToken, "parseToken");
__name2(parseToken, "parseToken");
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmac, "hmac");
__name2(hmac, "hmac");
var sessionValue = /* @__PURE__ */ __name2((env) => hmac(env.STUDIO_PASSWORD, "asa-studio-session-v1"), "sessionValue");
var COOKIE = "asa_studio";
async function isLoggedIn(request, env) {
  if (!env.STUDIO_PASSWORD)
    return false;
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)asa_studio=([a-f0-9]{64})/);
  return !!m && m[1] === await sessionValue(env);
}
__name(isLoggedIn, "isLoggedIn");
__name2(isLoggedIn, "isLoggedIn");
function sameText(a, b) {
  a = String(a || "");
  b = String(b || "");
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
__name(sameText, "sameText");
__name2(sameText, "sameText");
var HttpError = /* @__PURE__ */ __name(class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}, "HttpError");
__name2(HttpError, "HttpError");
var fail = /* @__PURE__ */ __name2((err) => err instanceof HttpError ? json({ error: err.message }, err.status) : (console.error(err), json({ error: "Something went wrong" }, 500)), "fail");
var esc = /* @__PURE__ */ __name2((s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), "esc");
async function notify(env, { subject, lines, link }) {
  if (!env.RESEND_API_KEY)
    return false;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">` + lines.map((l) => `<p style="margin:0 0 10px">${esc(l)}</p>`).join("") + (link ? `<p style="margin:18px 0 0"><a href="${esc(link)}" style="color:#9a7b3f">Open in Studio</a></p>` : "") + `</div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.NOTIFY_FROM || "ASA Proofing <onboarding@resend.dev>",
        to: [env.NOTIFY_TO || "andrew@andrewstankus.com"],
        subject,
        html,
        text: lines.join("\n") + (link ? `

Open in Studio: ${link}` : "")
      })
    });
    if (!res.ok)
      console.error("Resend error", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Resend failed", e);
    return false;
  }
}
__name(notify, "notify");
__name2(notify, "notify");
async function target(env, request) {
  const q = new URL(request.url).searchParams;
  const kind = q.get("kind"), name = q.get("name") || "";
  if (!KINDS.includes(kind))
    throw new HttpError(400, "kind must be proofs or finals");
  if (!safeName(name))
    throw new HttpError(400, "Only JPG, PNG, WebP or AVIF photos");
  const cur = await loadProject(env, q.get("id"));
  if (!cur)
    throw new HttpError(404, "Project not found");
  if (!cur.project.people.some((p) => p.id === q.get("person")))
    throw new HttpError(404, "Person not found");
  return { key: fileKey(cur.project.id, q.get("person"), kind, name), name };
}
__name(target, "target");
__name2(target, "target");
var TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };
async function onRequestPut({ env, request }) {
  try {
    const { key, name } = await target(env, request);
    const ext = name.split(".").pop().toLowerCase();
    await env.PHOTOS.put(key, request.body, { httpMetadata: { contentType: TYPES[ext] || "image/jpeg" } });
    return json({ ok: true, name });
  } catch (e) {
    return fail(e);
  }
}
__name(onRequestPut, "onRequestPut");
__name2(onRequestPut, "onRequestPut");
async function onRequestDelete({ env, request }) {
  try {
    const { key } = await target(env, request);
    await env.PHOTOS.delete(key);
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
__name(onRequestDelete, "onRequestDelete");
__name2(onRequestDelete, "onRequestDelete");
var cookie = /* @__PURE__ */ __name2((value, maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`, "cookie");
async function onRequestGet({ request, env }) {
  return json({ loggedIn: await isLoggedIn(request, env), setUp: !!env.STUDIO_PASSWORD });
}
__name(onRequestGet, "onRequestGet");
__name2(onRequestGet, "onRequestGet");
async function onRequestPost({ request, env }) {
  if (!env.STUDIO_PASSWORD)
    return json({ error: "Studio is not set up yet: add STUDIO_PASSWORD in Cloudflare Pages settings" }, 503);
  const { password } = await request.json().catch(() => ({}));
  if (!sameText(password, env.STUDIO_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: "Wrong password" }, 401);
  }
  return json({ ok: true }, 200, { "Set-Cookie": cookie(await sessionValue(env), 60 * 60 * 24 * 60) });
}
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
async function onRequestDelete2() {
  return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
}
__name(onRequestDelete2, "onRequestDelete2");
__name2(onRequestDelete2, "onRequestDelete");
async function view(env, project, origin) {
  const files = await listFiles(env, project.id);
  return {
    ...project,
    rule: ruleText(project.settings),
    people: project.people.map((p) => ({
      ...p,
      link: `${origin}/proof/${linkToken(project.id, p.id)}`,
      proofs: files[p.id]?.proofs || [],
      finals: files[p.id]?.finals || []
    }))
  };
}
__name(view, "view");
__name2(view, "view");
async function onRequestGet2({ env, request }) {
  try {
    const url = new URL(request.url);
    const cur = await loadProject(env, url.searchParams.get("id"));
    if (!cur)
      throw new HttpError(404, "Project not found");
    return json({ project: await view(env, cur.project, url.origin) });
  } catch (e) {
    return fail(e);
  }
}
__name(onRequestGet2, "onRequestGet2");
__name2(onRequestGet2, "onRequestGet");
var clean = /* @__PURE__ */ __name2((s, n = 120) => String(s || "").trim().slice(0, n), "clean");
async function onRequestPost2({ env, request }) {
  try {
    const origin = new URL(request.url).origin;
    const b = await request.json().catch(() => ({}));
    if (b.action === "delete") {
      await deleteProject(env, b.id);
      return json({ ok: true });
    }
    const { project } = await updateProject(env, b.id, async (p) => {
      const person = /* @__PURE__ */ __name2(() => {
        const x = p.people.find((q) => q.id === b.personId);
        if (!x)
          throw new HttpError(404, "Person not found");
        return x;
      }, "person");
      switch (b.action) {
        case "settings":
          if (b.name !== void 0)
            p.name = clean(b.name) || p.name;
          if (b.client !== void 0)
            p.client = clean(b.client);
          if (b.settings)
            p.settings = normalizeSettings({ ...p.settings, ...b.settings });
          break;
        case "addPeople":
          for (const n of (b.names || []).map((x) => clean(x)).filter(Boolean).slice(0, 200)) {
            p.people.push({ id: randomId(16), name: n, email: "", created: (/* @__PURE__ */ new Date()).toISOString(), selection: [], note: "", submittedAt: null });
          }
          break;
        case "person": {
          const x = person();
          if (b.name !== void 0)
            x.name = clean(b.name) || x.name;
          if (b.email !== void 0)
            x.email = clean(b.email, 200);
          break;
        }
        case "unlock": {
          const x = person();
          x.submittedAt = null;
          break;
        }
        case "remove": {
          const x = person();
          await deletePrefix(env, `_proofing/files/${p.id}/${x.id}/`);
          p.people = p.people.filter((q) => q.id !== x.id);
          break;
        }
        default:
          throw new HttpError(400, "Unknown action");
      }
    });
    return json({ project: await view(env, project, origin) });
  } catch (e) {
    return fail(e);
  }
}
__name(onRequestPost2, "onRequestPost2");
__name2(onRequestPost2, "onRequestPost");
async function onRequestGet3({ env }) {
  try {
    const projects = await listProjects(env);
    return json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        client: p.client,
        created: p.created,
        people: p.people.length,
        picked: p.people.filter((x) => x.submittedAt).length
      }))
    });
  } catch (e) {
    return fail(e);
  }
}
__name(onRequestGet3, "onRequestGet3");
__name2(onRequestGet3, "onRequestGet");
async function onRequestPost3({ env, request }) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!String(body.name || "").trim())
      return json({ error: "Give the project a name" }, 400);
    return json({ project: await createProject(env, body) });
  } catch (e) {
    return fail(e);
  }
}
__name(onRequestPost3, "onRequestPost3");
__name2(onRequestPost3, "onRequestPost");
async function find(env, token) {
  const t = parseToken(token);
  if (!t)
    throw new HttpError(404, "This gallery link is not valid");
  const cur = await loadProject(env, t.projectId);
  const person = cur?.project.people.find((p) => p.id === t.personId);
  if (!person)
    throw new HttpError(404, "This gallery link is not valid");
  return { ...t, project: cur.project, person };
}
__name(find, "find");
__name2(find, "find");
async function onRequestGet4({ params, env }) {
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
      note: person.note || "",
      proofs: files.proofs.map(({ name, url }) => ({ name, url })),
      finals: files.finals.map(({ name, url }) => ({ name, url }))
    }, 200, { "X-Robots-Tag": "noindex, nofollow" });
  } catch (e) {
    return fail(e);
  }
}
__name(onRequestGet4, "onRequestGet4");
__name2(onRequestGet4, "onRequestGet");
async function onRequestPost4({ params, env, request }) {
  try {
    const { projectId, personId } = await find(env, params.token);
    const body = await request.json().catch(() => ({}));
    const picked = [...new Set(Array.isArray(body.selection) ? body.selection.map(String) : [])];
    const note = String(body.note || "").slice(0, 2e3);
    const files = (await listFiles(env, projectId, personId))[personId] || { proofs: [] };
    const names = new Set(files.proofs.map((f) => f.name));
    if (picked.some((n) => !names.has(n)))
      throw new HttpError(400, "One of those photos is no longer in the gallery. Please refresh.");
    const { project, result: person } = await updateProject(env, projectId, (p) => {
      const s = p.settings;
      const n = picked.length;
      if (!n)
        throw new HttpError(400, "Please select a photo first");
      if (s.mode === "exact" && n !== s.count)
        throw new HttpError(400, `Please select exactly ${s.count} photo${s.count === 1 ? "" : "s"}`);
      if (s.mode === "upto" && n > s.count)
        throw new HttpError(400, `Please select no more than ${s.count} photos`);
      const person2 = p.people.find((x) => x.id === personId);
      if (!person2)
        throw new HttpError(404, "This gallery link is not valid");
      if (person2.submittedAt)
        throw new HttpError(409, "Your selection has already been sent");
      person2.selection = picked;
      person2.note = note;
      person2.submittedAt = (/* @__PURE__ */ new Date()).toISOString();
      return person2;
    });
    const done = project.people.filter((p) => p.submittedAt).length;
    const origin = new URL(request.url).origin;
    await notify(env, {
      subject: `${person.name} picked ${picked.length === 1 ? picked[0] : picked.length + " photos"} \xB7 ${project.name}`,
      lines: [
        `${person.name} sent their selection for ${project.name}${project.client ? ` (${project.client})` : ""}.`,
        `Selected: ${picked.join(", ")}`,
        ...note ? [`Note: ${note}`] : [],
        `${done} of ${project.people.length} people have now picked.`
      ],
      link: `${origin}/studio/#${project.id}`
    });
    return json({ ok: true, submittedAt: person.submittedAt, selection: person.selection });
  } catch (e) {
    return fail(e);
  }
}
__name(onRequestPost4, "onRequestPost4");
__name2(onRequestPost4, "onRequestPost");
var PUBLIC2 = "https://photos.andrewstankus.com/";
var IMG2 = /\.(jpe?g|png|webp|avif)$/i;
async function listFolder(env, folder) {
  const prefix = folder.replace(/^\/+|\/+$/g, "") + "/";
  if (prefix.startsWith("_") || prefix === "/")
    return [];
  const keys = [];
  let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix, cursor, limit: 1e3 });
    for (const o of page.objects)
      if (IMG2.test(o.key))
        keys.push({ key: o.key, v: (o.etag || "").replace(/"/g, "").slice(0, 8) });
    cursor = page.truncated ? page.cursor : void 0;
  } while (cursor);
  keys.sort((a, b) => a.key.localeCompare(b.key, void 0, { numeric: true }));
  return keys.map(({ key, v }) => PUBLIC2 + key.split("/").map(encodeURIComponent).join("/") + (v ? `?v=${v}` : ""));
}
__name(listFolder, "listFolder");
__name2(listFolder, "listFolder");
function jpegSize(buf) {
  const b = new Uint8Array(buf);
  if (b[0] !== 255 || b[1] !== 216)
    return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 255) {
      i++;
      continue;
    }
    const m = b[i + 1];
    if (m === 216 || m === 1 || m >= 208 && m <= 215) {
      i += 2;
      continue;
    }
    const len = b[i + 2] << 8 | b[i + 3];
    if (m >= 192 && m <= 207 && m !== 196 && m !== 200 && m !== 204) {
      return [b[i + 7] << 8 | b[i + 8], b[i + 5] << 8 | b[i + 6]];
    }
    i += 2 + len;
  }
  return null;
}
__name(jpegSize, "jpegSize");
__name2(jpegSize, "jpegSize");
async function sizesFor(env, urls) {
  const out = new Array(urls.length).fill(null);
  for (let s = 0; s < urls.length; s += 40) {
    await Promise.all(urls.slice(s, s + 40).map(async (u, j) => {
      try {
        const key = decodeURIComponent(u.slice(PUBLIC2.length).split("?")[0]);
        if (!/\.jpe?g$/i.test(key))
          return;
        const obj = await env.PHOTOS.get(key, { range: { offset: 0, length: 131072 } });
        if (obj)
          out[s + j] = jpegSize(await obj.arrayBuffer());
      } catch (e) {
      }
    }));
  }
  return out;
}
__name(sizesFor, "sizesFor");
__name2(sizesFor, "sizesFor");
async function onRequestGet5({ request, env, waitUntil }) {
  const folder = new URL(request.url).searchParams.get("folder") || "";
  if (!folder || folder.includes(".."))
    return Response.json({ error: "folder required" }, { status: 400 });
  const photos = await listFolder(env, folder);
  const sig = photos.join("|");
  let h = 0;
  for (let i = 0; i < sig.length; i++)
    h = h * 31 + sig.charCodeAt(i) | 0;
  const cacheKey = new Request(`https://cache.internal/photo-sizes/${encodeURIComponent(folder)}/${h >>> 0}`);
  const cache = caches.default;
  let sizes = null;
  const hit = await cache.match(cacheKey);
  if (hit)
    sizes = await hit.json();
  if (!sizes || sizes.length !== photos.length) {
    sizes = await sizesFor(env, photos);
    waitUntil(cache.put(cacheKey, new Response(JSON.stringify(sizes), { headers: { "Cache-Control": "public, max-age=2592000" } })));
  }
  return Response.json({ folder, photos, sizes }, { headers: { "Cache-Control": "public, max-age=300" } });
}
__name(onRequestGet5, "onRequestGet5");
__name2(onRequestGet5, "onRequestGet");
async function onRequestGet6({ request, env }) {
  const folder = new URL(request.url).searchParams.get("folder") || "";
  if (!folder || folder.includes(".."))
    return new Response("folder required", { status: 400 });
  const [first] = await listFolder(env, folder);
  if (!first)
    return new Response("no photos", { status: 404 });
  return Response.redirect(first, 302);
}
__name(onRequestGet6, "onRequestGet6");
__name2(onRequestGet6, "onRequestGet");
async function onRequestGet7({ request, env }) {
  const q = new URL(request.url).searchParams;
  const t = parseToken(q.get("t"));
  const kind = q.get("kind") || "finals";
  const name = q.get("f") || "";
  if (!t || !KINDS.includes(kind) || !safeName(name))
    return json({ error: "Not found" }, 404);
  const cur = await loadProject(env, t.projectId);
  const person = cur?.project.people.find((p) => p.id === t.personId);
  if (!person || kind === "proofs" && !cur.project.settings.downloadProofs)
    return json({ error: "Not found" }, 404);
  const obj = await env.PHOTOS.get(fileKey(t.projectId, t.personId, kind, name));
  if (!obj)
    return json({ error: "Not found" }, 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
      "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex"
    }
  });
}
__name(onRequestGet7, "onRequestGet7");
__name2(onRequestGet7, "onRequestGet");
var PUBLIC3 = "https://photos.andrewstankus.com/";
function jpegSize2(buf) {
  const b = new Uint8Array(buf);
  if (b[0] !== 255 || b[1] !== 216)
    return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 255) {
      i++;
      continue;
    }
    const m = b[i + 1];
    if (m === 216 || m === 1 || m >= 208 && m <= 215) {
      i += 2;
      continue;
    }
    const len = b[i + 2] << 8 | b[i + 3];
    if (m >= 192 && m <= 207 && m !== 196 && m !== 200 && m !== 204) {
      return [b[i + 7] << 8 | b[i + 8], b[i + 5] << 8 | b[i + 6]];
    }
    i += 2 + len;
  }
  return null;
}
__name(jpegSize2, "jpegSize2");
__name2(jpegSize2, "jpegSize");
var keyOf = /* @__PURE__ */ __name2((url) => decodeURIComponent(url.slice(PUBLIC3.length).split("?")[0]), "keyOf");
async function pickKey(env, folder, photo) {
  const keys = (await listFolder(env, folder)).map(keyOf);
  if (!keys.length)
    return null;
  if (photo) {
    const want = photo.split("/").pop().toLowerCase();
    const hit = keys.find((k) => k.split("/").pop().toLowerCase() === want);
    if (hit)
      return hit;
  }
  for (const key of keys.slice(0, 60)) {
    if (!/\.jpe?g$/i.test(key))
      continue;
    try {
      const head = await env.PHOTOS.get(key, { range: { offset: 0, length: 131072 } });
      const size = head && jpegSize2(await head.arrayBuffer());
      if (size && size[0] > size[1] * 1.2)
        return key;
    } catch (e) {
    }
  }
  return keys[0];
}
__name(pickKey, "pickKey");
__name2(pickKey, "pickKey");
async function onRequestGet8({ request, env, waitUntil }) {
  const params = new URL(request.url).searchParams;
  const folder = (params.get("folder") || "").replace(/^\/+|\/+$/g, "");
  const photo = params.get("photo") || "";
  if (!folder || folder.includes("..") || photo.includes(".."))
    return new Response("folder required", { status: 400 });
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit)
    return hit;
  const key = await pickKey(env, folder, photo);
  const obj = key && await env.PHOTOS.get(key);
  if (!obj)
    return new Response("no photos", { status: 404 });
  const res = new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || (/\.png$/i.test(key) ? "image/png" : /\.webp$/i.test(key) ? "image/webp" : "image/jpeg"),
      "Cache-Control": "public, max-age=3600",
      "ETag": obj.httpEtag
    }
  });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
__name(onRequestGet8, "onRequestGet8");
__name2(onRequestGet8, "onRequestGet");
async function onRequest({ request, env, next }) {
  const path = new URL(request.url).pathname;
  if (path === "/api/studio/login")
    return next();
  if (!env.STUDIO_PASSWORD)
    return json({ error: "Studio is not set up yet: add STUDIO_PASSWORD in Cloudflare Pages settings" }, 503);
  if (!await isLoggedIn(request, env))
    return json({ error: "Please log in" }, 401);
  return next();
}
__name(onRequest, "onRequest");
__name2(onRequest, "onRequest");
async function onRequestGet9({ request, env }) {
  const page = await env.ASSETS.fetch(new URL("/proof/", request.url));
  const res = new Response(page.body, page);
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
__name(onRequestGet9, "onRequestGet9");
__name2(onRequestGet9, "onRequestGet");
var routes = [
  {
    routePath: "/api/studio/file",
    mountPath: "/api/studio",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/studio/file",
    mountPath: "/api/studio",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/studio/login",
    mountPath: "/api/studio",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/studio/login",
    mountPath: "/api/studio",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/studio/login",
    mountPath: "/api/studio",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/studio/project",
    mountPath: "/api/studio",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/studio/project",
    mountPath: "/api/studio",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/studio/projects",
    mountPath: "/api/studio",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/studio/projects",
    mountPath: "/api/studio",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/proof/:token",
    mountPath: "/api/proof",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/proof/:token",
    mountPath: "/api/proof",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/cover",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/photos",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/proof-file",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/share",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/studio",
    mountPath: "/api/studio",
    method: "",
    middlewares: [onRequest],
    modules: []
  },
  {
    routePath: "/proof/:token",
    mountPath: "/proof",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = /* @__PURE__ */ __name(class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
}, "__Facade_ScheduledController__");
__name2(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../tools/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../tools/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-Fxnezg/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../tools/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-Fxnezg/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__2, "__Facade_ScheduledController__");
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.15039891924979232.js.map
