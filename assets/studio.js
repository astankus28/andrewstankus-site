// Studio dashboard (/studio/): client proofing projects, people, uploads and selections.
(function () {
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fileNo = (name) => String(name).replace(/\.[^.]+$/, '');
  const RESIZE = /(^|\.)andrewstankus\.com$/.test(location.hostname);
  const thumb = (src) => RESIZE ? '/cdn-cgi/image/width=240,quality=70,format=auto/' + src : src;
  const IMG = /\.(jpe?g|png|webp|avif)$/i;
  let project = null;

  async function call(path, opts = {}) {
    const res = await fetch('/api/studio/' + path, {
      ...opts,
      headers: opts.body && !(opts.body instanceof Blob) ? { 'Content-Type': 'application/json' } : {},
      body: opts.body && !(opts.body instanceof Blob) ? JSON.stringify(opts.body) : opts.body,
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 401) { login(); throw new Error('Please log in'); }
    if (!res.ok) throw new Error(out.error || 'Something went wrong');
    return out;
  }
  const act = (action, extra = {}) => call('project', { method: 'POST', body: { id: project.id, action, ...extra } });

  function flash(el, text) { if (el) { el.textContent = text; setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, 4000); } }
  async function copy(text, el) {
    try { await navigator.clipboard.writeText(text); flash(el, 'Copied'); }
    catch (e) { window.getSelection && flash(el, text); }
  }

  // ---- Login ----
  function login(msg = '') {
    document.getElementById('stLogout').hidden = true;
    app.innerHTML = `<div class="st st-login">
      <span class="label">Andrew Stankus Agency</span>
      <h1>Studio <em>login</em></h1>
      <form id="lf" class="st-row">
        <label class="st-field"><span>Password</span><input type="password" id="pw" autocomplete="current-password" required></label>
        <button class="btn btn-gold" type="submit">Log in</button>
      </form>
      <p class="st-msg" id="lm">${esc(msg)}</p></div>`;
    document.getElementById('pw').focus();
    document.getElementById('lf').onsubmit = async (e) => {
      e.preventDefault();
      try { await call('login', { method: 'POST', body: { password: document.getElementById('pw').value } }); route(); }
      catch (err) { document.getElementById('lm').textContent = err.message; }
    };
  }
  document.getElementById('stLogout').onclick = async () => { await fetch('/api/studio/login', { method: 'DELETE' }); location.hash = ''; login(); };

  // ---- Projects list ----
  async function home() {
    const [{ projects }, { folders }] = await Promise.all([call('projects'), call('folders').catch(() => ({ folders: [] }))]);
    app.innerHTML = `<div class="st">
      <span class="label">Client galleries</span>
      <h1>Your <em>projects</em></h1>
      ${folders.length ? `<form id="gf" class="st-row">
        <label class="st-field grow"><span>Share a gallery that's on your site (they can download it)</span><select id="gFolder">${folders.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select></label>
        <button class="btn btn-gold" type="submit">Make download link</button>
      </form>
      <p class="st-msg" id="gm"></p>
      <h2>Or start a <em>new gallery</em></h2>` : ''}
      <form id="nf" class="st-row">
        <label class="st-field"><span>New gallery</span><input id="nName" placeholder="e.g. Somich Holiday Party" required></label>
        <label class="st-field"><span>Client (optional)</span><input id="nClient" placeholder="e.g. Somich &amp; Associates"></label>
        <label class="st-field"><span>What's it for</span><select id="nMode">
          <option value="none">Send photos (they download)</option>
          <option value="exact">Clients pick favorites (headshots)</option></select></label>
        <button class="btn btn-gold" type="submit">Create</button>
      </form>
      <p class="st-msg" id="nm"></p>
      <h2>All <em>projects</em></h2>
      <div class="st-list">${projects.length ? projects.map((p) => `
        <a href="#${esc(p.id)}"><span><b>${esc(p.name)}</b><small>${esc(p.client || '')}${p.client ? ' · ' : ''}${new Date(p.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small></span>
        <span class="st-tag${p.people && p.picked === p.people ? ' done' : ''}">${p.delivery ? 'Delivery' : `${p.picked} of ${p.people} picked`}</span></a>`).join('')
        : '<p class="muted" style="padding:1.2rem 0">No projects yet. Create one above.</p>'}</div></div>`;
    const gf = document.getElementById('gf');
    if (gf) gf.onsubmit = async (e) => {
      e.preventDefault();
      const from = gFolder.value, gm = document.getElementById('gm'), btn = gf.querySelector('button');
      const title = from.replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || from;
      btn.disabled = true;
      try {
        gm.textContent = 'Making the link…';
        project = (await call('projects', { method: 'POST', body: { name: title, settings: { mode: 'none' } } })).project;
        project = (await act('addPeople', { names: [title] })).project;
        gm.textContent = 'Copying the photos (this can take a minute for a big gallery)…';
        await call(`folders?id=${project.id}&person=${project.people[0].id}&kind=finals&from=${encodeURIComponent(from)}`, { method: 'POST' });
        location.hash = project.id;
      } catch (err) { gm.textContent = err.message; btn.disabled = false; }
    };
    document.getElementById('nf').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const { project: p } = await call('projects', { method: 'POST', body: { name: nName.value, client: nClient.value, settings: { mode: nMode.value } } });
        location.hash = p.id;
      } catch (err) { document.getElementById('nm').textContent = err.message; }
    };
  }

  // ---- One project ----
  function emailFor(p) {
    const s = project.settings;
    const first = p.name.split(' ')[0];
    if (s.mode === 'none') {
      const subject = `Your ${project.name.replace(/\s*·.*$/, '')} photos are ready`;
      const body = `Hi ${first},\n\nYour photos are ready! View and download them here:\n${p.link}\n\nPress "Download all" to save every photo at once, or use the Download link under any single photo.\n\nIf you have any questions, just reply to this email.\n\nBest,\nAndrew Stankus\nAndrew Stankus Agency\n(305) 814-0142`;
      return { subject, body, href: `mailto:${encodeURIComponent(p.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
    }
    const ask = s.mode === 'exact' && s.count === 1 ? 'pick your favorite' : s.mode === 'any' ? 'select the ones you like' : s.mode === 'upto' ? `select up to ${s.count}` : `select your ${s.count} favorites`;
    const by = s.deadline ? ` by ${new Date(s.deadline + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}` : '';
    const subject = `Your ${project.name.replace(/\s*·.*$/, '')} proofs are ready`;
    const body = `Hi ${first},\n\nYour proofs are ready! View your private gallery here:\n${p.link}\n\nPlease ${ask} and press "Send my selection"${by}. Once I receive it, I'll retouch your final image and send it over.\n\nIf you have any questions, just reply to this email.\n\nBest,\nAndrew Stankus\nAndrew Stankus Agency\n(305) 814-0142`;
    return { subject, body, href: `mailto:${encodeURIComponent(p.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
  }

  function personHtml(p) {
    const delivery = project.settings.mode === 'none';
    const picks = p.submittedAt
      ? `<div class="st-pick">Picked: <b>${p.selection.map((n) => esc(fileNo(n))).join(', ')}</b>${p.note ? ` · <q>${esc(p.note)}</q>` : ''}</div>` : '';
    const files = (kind, label, hint) => `
      <div class="st-drop" data-kind="${kind}">
        <div class="st-drop-head"><span>${label} · ${p[kind].length}</span>
          <span><button type="button" class="st-link" data-from="${kind}">From a posted gallery</button> · <label class="st-link" style="cursor:pointer">Add photos<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden data-kind="${kind}"></label></span></div>
        ${p[kind].length ? `<div class="st-thumbs">${p[kind].map((f) => `
          <figure class="${kind === 'proofs' && p.selection?.includes(f.name) && p.submittedAt ? 'on' : ''}"><div class="slot" data-hint=""><img src="${esc(thumb(f.url))}" alt="" loading="lazy"></div>
          <figcaption>${esc(fileNo(f.name))}</figcaption><button class="x" type="button" title="Remove" data-del="${esc(f.name)}" data-kind="${kind}">×</button></figure>`).join('')}</div>`
        : `<p class="muted" style="font-size:.78rem">${hint}</p>`}
      </div>`;
    if (delivery) return `<div class="st-person" data-person="${esc(p.id)}">
      <span class="label">Step 1 · Add the photos</span>
      <div class="st-files">${files('finals', 'Photos', 'Click Add photos and choose the edited photos.')}</div>
      <span class="label" style="margin-top:1.2rem">Step 2 · Send the link</span>
      <div class="st-tools">
        <button type="button" data-do="copy">Copy link</button>
        <a href="${esc(emailFor(p).href)}">Email link</a>
        <button type="button" data-do="copyEmail">Copy email text</button>
        <a href="${esc(p.link)}" target="_blank" rel="noopener">Preview gallery</a>
      </div>
      <p class="st-msg" data-msg></p>
      <div class="st-person-top"><label class="st-field grow"><span>Their email (optional, fills in Email link)</span><input type="email" value="${esc(p.email)}" data-field="email" placeholder="e.g. owner@company.com"></label></div>
    </div>`;
    return `<div class="st-person" data-person="${esc(p.id)}">
      <div class="st-person-top">
        <label class="st-field grow"><span>${project.settings.mode === 'none' ? 'Link for' : 'Name'}</span><input value="${esc(p.name)}" data-field="name"></label>
        <label class="st-field grow"><span>Email (for the email button)</span><input type="email" value="${esc(p.email)}" data-field="email" placeholder="optional"></label>
        ${project.settings.mode === 'none' ? `<span class="st-tag${p.finals.length ? ' done' : ''}">${p.finals.length ? p.finals.length + ' ready to download' : 'No photos yet'}</span>` : `<span class="st-tag${p.submittedAt ? ' done' : ''}">${p.submittedAt ? 'Picked ' + new Date(p.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : p.proofs.length ? 'Waiting' : 'No proofs yet'}</span>`}
      </div>
      ${picks}
      <div class="st-tools">
        <button type="button" data-do="copy">Copy link</button>
        <a href="${esc(emailFor(p).href)}">Email link</a>
        <button type="button" data-do="copyEmail">Copy email text</button>
        <a href="${esc(p.link)}" target="_blank" rel="noopener">Open gallery</a>
        ${p.submittedAt ? '<button type="button" data-do="unlock">Let them pick again</button>' : ''}
        <button type="button" class="danger" data-do="remove">Remove</button>
      </div>
      <p class="st-msg" data-msg></p>
      <div class="st-files">
        ${project.settings.mode === 'none'
          ? files('finals', 'Photos to deliver', 'Drop the edited photos here (or use Add photos). They see them all with a Download all button.')
          : files('proofs', 'Proofs to choose from', 'Drop the culled, color-corrected proofs here (or use Add photos).')
            + files('finals', 'Final retouched images', 'After they pick, drop the retouched final here. They download it from the same link.')}
      </div>
    </div>`;
  }

  function settingsForm(s) {
    const pickOnly = s.mode === 'none' ? ' style="display:none"' : '';
    return `<form id="sf">
        <div class="st-row">
          <label class="st-field"><span>Project name</span><input name="name" value="${esc(project.name)}"></label>
          <label class="st-field"><span>Client</span><input name="client" value="${esc(project.client)}"></label>
        </div>
        <div class="st-row" style="margin-top:1rem">
          <label class="st-field"><span>They can</span><select name="mode">
            <option value="exact"${s.mode === 'exact' ? ' selected' : ''}>Pick exactly</option>
            <option value="upto"${s.mode === 'upto' ? ' selected' : ''}>Pick up to</option>
            <option value="any"${s.mode === 'any' ? ' selected' : ''}>Pick as many as they like</option>
            <option value="none"${s.mode === 'none' ? ' selected' : ''}>Just download (no picking)</option></select></label>
          <label class="st-field" data-pick style="flex:0 1 120px${s.mode === 'none' ? ';display:none' : ''}"><span>How many</span><input name="count" type="number" min="1" max="500" value="${s.count}"></label>
          <label class="st-field" data-pick${pickOnly}><span>Choose by (optional)</span><input name="deadline" type="date" value="${esc(s.deadline)}"></label>
        </div>
        <div class="st-row" style="margin-top:1rem">
          <label class="st-field"><span>Note shown at the top of every gallery (optional)</span><textarea name="message" rows="2" placeholder="e.g. Thanks for coming in! Pick your favorite and I'll retouch it within 3 business days.">${esc(s.message)}</textarea></label>
        </div>
        <div class="st-row" style="margin-top:.6rem">
          <label class="st-check" data-pick${pickOnly}><input type="checkbox" name="watermark"${s.watermark ? ' checked' : ''}> Show ASA watermark on proofs</label>
          <label class="st-check" data-pick${pickOnly}><input type="checkbox" name="downloadProofs"${s.downloadProofs ? ' checked' : ''}> Let them download proofs</label>
          <button class="btn btn-gold" type="submit" style="margin-left:auto">Save settings</button>
        </div>
        <p class="st-msg" id="sm"></p>
      </form>`;
  }

  function projectHtml() {
    const s = project.settings;
    if (s.mode === 'none') return `<div class="st">
      <a class="st-back" href="#">← All projects</a>
      <span class="label" style="display:block;margin-top:2rem">${esc(project.client || 'Photo delivery')}</span>
      <h1>${esc(project.name)}</h1>
      <div class="st-list" style="margin-top:1.5rem">${project.people.slice(0, 1).map(personHtml).join('') || '<p class="muted">Setting up your link…</p>'}</div>
      <details style="margin-top:3rem"><summary class="label" style="cursor:pointer">More settings</summary>${settingsForm(s)}</details>
      <h2 style="margin-top:4rem">Danger <em>zone</em></h2>
      <div class="st-tools"><button type="button" class="danger" id="delProject">Delete this gallery and all its photos</button></div>
    </div>`;
    const picked = project.people.filter((p) => p.submittedAt).length;
    const pickOnly = s.mode === 'none' ? ' style="display:none"' : '';
    return `<div class="st">
      <a class="st-back" href="#">← All projects</a>
      <span class="label" style="display:block;margin-top:2rem">${esc(project.client || 'Project')}</span>
      <h1>${esc(project.name)}</h1>
      <p class="muted">${project.people.length} ${s.mode === 'none' ? (project.people.length === 1 ? 'link' : 'links') : project.people.length === 1 ? 'person' : 'people'} · ${s.mode === 'none' ? 'delivery, no picking' : `${picked} picked · rule: ${esc(project.rule)}`}</p>

      <h2>Gallery <em>settings</em></h2>
      ${settingsForm(s)}

      ${s.mode === 'none'
        ? project.people.length
        ? `<h2>Your gallery <em>link</em></h2>
      <p class="muted">Add the photos below, then press Copy link or Email link and send it to anyone who needs the photos. One link works for the whole office.</p>
      <form id="pf" class="st-row" style="display:none">`
        : `<h2>Your gallery <em>link</em></h2>
      <form id="pf" class="st-row">
        <label class="st-field"><span>Name the link (who it's for)</span><textarea id="pNames" rows="2" placeholder="e.g. Somich &amp; Associates"></textarea></label>`
        : `<h2>People <em>(one private link each)</em></h2>
      <form id="pf" class="st-row">
        <label class="st-field"><span>Add people, one name per line</span><textarea id="pNames" rows="3" placeholder="Jane Doe&#10;John Smith"></textarea></label>`}
        <button class="btn btn-gold" type="submit">Add</button>
      </form>
      <div class="st-tools" style="margin-top:1rem">
        <button type="button" id="copyLinks">Copy all links</button>
        <button type="button" id="copyPicks"${pickOnly}>Copy all picks</button>
      </div>
      <p class="st-msg" id="pm"></p>
      <div class="st-list" style="margin-top:1rem">${project.people.map(personHtml).join('') || `<p class="muted" style="padding:1.2rem 0">${s.mode === 'none' ? 'Add a link above, then drop the photos into it.' : 'Add the people you photographed above.'}</p>`}</div>

      <h2 style="margin-top:4rem">Danger <em>zone</em></h2>
      <div class="st-tools"><button type="button" class="danger" id="delProject">Delete this project and all its photos</button></div>
    </div>`;
  }

  async function openProject(id) {
    project = (await call('project?id=' + encodeURIComponent(id))).project;
    await ensureLink();
    draw();
  }

  // Delivery projects don't need people: make their one shareable link automatically.
  async function ensureLink() {
    if (project.settings.mode !== 'none' || project.people.length) return;
    try { project = (await act('addPeople', { names: [project.client || project.name.replace(/\s*·.*$/, '') || 'Gallery'] })).project; } catch (e) {}
  }

  function draw() {
    const y = scrollY;
    app.innerHTML = projectHtml();
    scrollTo(0, y);
    bind();
  }

  function bind() {
    const $ = (s) => app.querySelector(s);
    $('#sf [name=mode]').onchange = (e) => app.querySelectorAll('[data-pick]').forEach((el) => (el.style.display = e.target.value === 'none' ? 'none' : ''));
    $('#sf').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        project = (await act('settings', {
          name: f.get('name'), client: f.get('client'),
          settings: { mode: f.get('mode'), count: f.get('count'), deadline: f.get('deadline'), message: f.get('message'), watermark: !!f.get('watermark'), downloadProofs: !!f.get('downloadProofs') },
        })).project;
        await ensureLink();
        draw(); flash(app.querySelector('#sm'), 'Saved');
      } catch (err) { $('#sm').textContent = err.message; }
    };
    if ($('#pf')) $('#pf').onsubmit = async (e) => {
      e.preventDefault();
      const names = $('#pNames').value.split('\n').map((s) => s.trim()).filter(Boolean);
      if (!names.length) return;
      try { project = (await act('addPeople', { names })).project; draw(); }
      catch (err) { $('#pm').textContent = err.message; }
    };
    if ($('#copyLinks')) $('#copyLinks').onclick = () => copy(project.people.map((p) => `${p.name}: ${p.link}`).join('\n'), $('#pm'));
    if ($('#copyPicks')) $('#copyPicks').onclick = () => copy(project.people.map((p) => `${p.name}: ${p.submittedAt ? p.selection.map(fileNo).join(', ') + (p.note ? ` (note: ${p.note})` : '') : 'not picked yet'}`).join('\n'), $('#pm'));
    $('#delProject').onclick = async () => {
      if (!confirm(`Delete "${project.name}" and every photo in it? This can't be undone.`)) return;
      await act('delete'); location.hash = '';
    };

    app.querySelectorAll('.st-person').forEach((row) => {
      const p = project.people.find((x) => x.id === row.dataset.person);
      const msg = row.querySelector('[data-msg]');
      row.querySelectorAll('input[data-field]').forEach((inp) => inp.onchange = async () => {
        try { project = (await act('person', { personId: p.id, [inp.dataset.field]: inp.value })).project; flash(msg, 'Saved'); const fresh = project.people.find((x) => x.id === p.id); row.querySelector('a[href^="mailto:"]').href = emailFor(fresh).href; Object.assign(p, fresh); }
        catch (err) { msg.textContent = err.message; }
      });
      row.querySelectorAll('[data-do]').forEach((b) => b.onclick = async () => {
        const what = b.dataset.do;
        try {
          if (what === 'copy') return copy(p.link, msg);
          if (what === 'copyEmail') { const m = emailFor(p); return copy(`Subject: ${m.subject}\n\n${m.body}`, msg); }
          if (what === 'unlock' && !confirm(`Reopen ${p.name}'s gallery so they can pick again?`)) return;
          if (what === 'remove' && !confirm(`Remove ${p.name} and all of their photos?`)) return;
          project = (await act(what, { personId: p.id })).project; draw();
        } catch (err) { msg.textContent = err.message; }
      });
      row.querySelectorAll('.st-drop').forEach((zone) => {
        const kind = zone.dataset.kind;
        zone.querySelector('input[type=file]').onchange = (e) => upload(p, kind, [...e.target.files], msg);
        zone.querySelector('[data-from]').onclick = () => fromGallery(p, kind, msg);
        zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('over'); };
        zone.ondragleave = () => zone.classList.remove('over');
        zone.ondrop = (e) => { e.preventDefault(); zone.classList.remove('over'); upload(p, kind, [...e.dataTransfer.files], msg); };
        zone.querySelectorAll('[data-del]').forEach((x) => x.onclick = async () => {
          if (!confirm(`Remove ${x.dataset.del}?`)) return;
          try {
            await call(`file?id=${project.id}&person=${p.id}&kind=${kind}&name=${encodeURIComponent(x.dataset.del)}`, { method: 'DELETE' });
            await openProject(project.id);
          } catch (err) { msg.textContent = err.message; }
        });
      });
    });
  }

  // Copy a gallery that's already posted on the site (an R2 folder) into this person's proofs or finals.
  async function fromGallery(p, kind, msg) {
    try {
      msg.textContent = 'Loading galleries…';
      const { folders } = await call('folders');
      msg.textContent = '';
      const list = folders.map((f, i) => `${i + 1}. ${f}`).join('\n');
      const ans = prompt(`Copy which posted gallery into ${kind}? Type its number or folder name.\n\n${list}`);
      if (!ans) return;
      const from = /^\d+$/.test(ans.trim()) ? folders[+ans.trim() - 1] : ans.trim();
      if (!folders.includes(from)) { msg.textContent = 'No gallery with that name.'; return; }
      msg.textContent = `Copying ${from}…`;
      const out = await call(`folders?id=${project.id}&person=${p.id}&kind=${kind}&from=${encodeURIComponent(from)}`, { method: 'POST' });
      await openProject(project.id);
      const m = app.querySelector(`.st-person[data-person="${p.id}"] [data-msg]`);
      if (m) m.textContent = `Copied ${out.copied} photo${out.copied === 1 ? '' : 's'} from ${from}`;
    } catch (err) { msg.textContent = err.message; }
  }

  async function upload(p, kind, files, msg) {
    files = files.filter((f) => IMG.test(f.name));
    if (!files.length) { msg.textContent = 'Only JPG, PNG, WebP or AVIF photos.'; return; }
    const big = files.filter((f) => f.size > 90 * 1024 * 1024);
    if (big.length) { msg.textContent = `${big[0].name} is too large; export at about 2400px.`; return; }
    let done = 0, failed = [];
    msg.textContent = `Uploading 0 of ${files.length}…`;
    const queue = [...files];
    const worker = async () => {
      while (queue.length) {
        const f = queue.shift();
        const name = f.name.replace(/[\/\\]/g, '_');
        try { await call(`file?id=${project.id}&person=${p.id}&kind=${kind}&name=${encodeURIComponent(name)}`, { method: 'PUT', body: f }); }
        catch (e) { failed.push(f.name); }
        msg.textContent = `Uploading ${++done} of ${files.length}…`;
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    await openProject(project.id);
    const m = app.querySelector(`.st-person[data-person="${p.id}"] [data-msg]`);
    if (m) m.textContent = failed.length ? `Couldn't upload: ${failed.join(', ')}` : `Uploaded ${files.length} photo${files.length === 1 ? '' : 's'}`;
  }

  async function route() {
    try {
      const st = await (await fetch('/api/studio/login')).json();
      if (!st.setUp) { login('Studio is not set up yet: add STUDIO_PASSWORD in Cloudflare Pages settings.'); return; }
      if (!st.loggedIn) { login(); return; }
      document.getElementById('stLogout').hidden = false;
      const id = location.hash.slice(1);
      if (id) await openProject(id); else await home();
    } catch (err) {
      if (err.message !== 'Please log in') app.innerHTML = `<div class="st"><p class="st-msg">${esc(err.message)}</p><a class="st-back" href="#">← All projects</a></div>`;
    }
  }
  addEventListener('hashchange', route);
  route();
})();
