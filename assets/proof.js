// Client gallery (/proof/<link>): view proofs, select favorites, send the selection, download finals.
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const token = location.pathname.split('/').filter(Boolean)[1] || '';
  const api = '/api/proof/' + encodeURIComponent(token);
  // Grid photos load as smaller copies through Cloudflare Images on the live domain; the lightbox shows the original.
  const RESIZE = /(^|\.)andrewstankus\.com$/.test(location.hostname);
  const small = (src) => RESIZE ? '/cdn-cgi/image/width=900,quality=80,format=auto/' + src : src;
  const fileNo = (name) => name.replace(/\.[^.]+$/, '');
  // Watermark, BFA-style: the ASA mark plus the site and this photo's file number.
  const stamp = (name) => `<span class="pf-wm" aria-hidden="true"><i>andrewstankus.com &nbsp;·&nbsp; ${esc(fileNo(name))}</i></span>`;
  $('#pfYear').textContent = new Date().getFullYear();

  let data = null;
  const picked = new Set();
  let confirming = false;

  function fmtDate(iso) {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T12:00:00') : new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function tile(f, i, kind) {
    const wm = data.watermark && kind === 'proofs' ? stamp(f.name) : '';
    const dl = kind === 'finals' || data.downloadProofs
      ? `<a class="pf-dl" href="/api/proof-file?t=${encodeURIComponent(token)}&kind=${f.kind || kind}&f=${encodeURIComponent(f.name)}">Download</a>` : '';
    const pick = kind === 'proofs' && !data.submitted
      ? `<button class="pf-pick" type="button" data-name="${esc(f.name)}" aria-pressed="false">Select</button>` : '';
    return `<figure class="pf-tile" data-name="${esc(f.name)}">
      <button class="pf-open" type="button" data-kind="${kind}" data-i="${i}" aria-label="View ${esc(fileNo(f.name))} larger">
        <div class="slot" data-hint=""><img src="${esc(small(f.url))}" data-full="${esc(f.url)}" alt="Photo ${esc(fileNo(f.name))}" loading="lazy">${wm}</div>
      </button>
      <figcaption><span>${esc(fileNo(f.name))}</span>${pick}${dl}</figcaption>
    </figure>`;
  }

  function render() {
    const d = data;
    const first = (d.person.name || '').split(' ')[0];
    $('#pfProject').textContent = [d.project.client, d.project.name].filter(Boolean).join(' · ') || 'Private gallery';
    $('#pfTitle').innerHTML = d.proofs.length || !d.finals.length
      ? `${esc(first ? first + ', your' : 'Your')} <em>proofs</em>`
      : `${esc(first ? first + ', your' : 'Your')} <em>photos</em>`;
    const meta = [['Photos', d.proofs.length || d.finals.length]];
    if (!d.submitted && d.proofs.length) meta.push(['To do', d.rules.text]);
    if (d.project.deadline && !d.submitted) meta.push(['Please choose by', fmtDate(d.project.deadline)]);
    $('#pfMeta').innerHTML = meta.map(([k, v]) => `<div><small>${esc(k)}</small>${esc(v)}</div>`).join('');
    if (d.project.message) { $('#pfMsg').textContent = d.project.message; $('#pfMsg').hidden = false; }

    // Finals
    $('#pfFinals').hidden = !d.finals.length;
    $('#pfFinalGrid').innerHTML = d.finals.map((f, i) => tile(f, i, 'finals')).join('');
    $('#pfDlAll').textContent = d.finals.length > 1 ? `Download all ${d.finals.length}` : 'Download';

    // Thank-you / submitted state
    if (d.submitted) {
      $('#pfDone').hidden = false;
      $('#pfDone').innerHTML = `<span class="label">Selection received</span>
        <h2>Thank <em>you.</em></h2>
        <p>You chose <b>${d.selection.map((n) => esc(fileNo(n))).join(', ')}</b> on ${esc(fmtDate(d.submittedAt))}.
        ${d.finals.length ? 'Your photos are ready to download below.' : "I'll retouch your selection and let you know when it's ready."}
        Need to change something? Email <a href="mailto:andrew@andrewstankus.com">andrew@andrewstankus.com</a>.</p>`;
    }

    // Proofs
    $('#pfHow').hidden = d.submitted || !d.proofs.length;
    $('#pfRule').textContent = d.rules.text;
    $('#pfGrid').hidden = !d.proofs.length;
    $('#pfGrid').innerHTML = d.proofs.map((f, i) => tile(f, i, 'proofs')).join('');
    if (d.submitted) d.selection.forEach((n) => picked.add(n));
    $('#pfBar').hidden = d.submitted || !d.proofs.length;
    if (!d.proofs.length && !d.finals.length) {
      $('#pfDone').hidden = false;
      $('#pfDone').innerHTML = `<span class="label">Almost ready</span><h2>Your photos are <em>on the way.</em></h2><p>Check back soon, or email <a href="mailto:andrew@andrewstankus.com">andrew@andrewstankus.com</a>.</p>`;
    }
    if (d.watermark) document.body.classList.add('pf-protect');
    paint();
    bindImages();
  }

  // Reflect the current selection on tiles, the lightbox and the bottom bar.
  function paint() {
    document.querySelectorAll('#pfGrid .pf-tile').forEach((t) => {
      const on = picked.has(t.dataset.name);
      t.classList.toggle('on', on);
      const b = t.querySelector('.pf-pick');
      if (b) { b.textContent = on ? 'Selected ✓' : 'Select'; b.setAttribute('aria-pressed', on); }
    });
    if (!data || data.submitted) return;
    const r = data.rules, n = picked.size;
    $('#pfCount').textContent = n;
    $('#pfOf').textContent = r.mode === 'any' ? `selected` : `of ${r.count} selected`;
    const ok = n > 0 && (r.mode === 'any' || (r.mode === 'upto' ? n <= r.count : n === r.count));
    $('#pfSend').disabled = !ok;
    if (confirming && !ok) unconfirm();
    lbPaint();
  }

  function toggle(name) {
    if (!data || data.submitted) return;
    $('#pfErr').textContent = '';
    if (picked.has(name)) picked.delete(name);
    else {
      const r = data.rules;
      // Picking one photo out of a set swaps the choice instead of blocking it.
      if (r.mode !== 'any' && r.count === 1) picked.clear();
      else if (r.mode !== 'any' && picked.size >= r.count) {
        $('#pfErr').textContent = `You can choose ${r.count}. Unselect one to pick another.`;
        return;
      }
      picked.add(name);
    }
    paint();
  }

  function unconfirm() {
    confirming = false;
    $('#pfSend').textContent = 'Send my selection';
    $('#pfNoteBtn').textContent = 'Add a note';
    $('#pfBar').classList.remove('confirm');
  }

  async function send() {
    if (!confirming) {
      confirming = true;
      $('#pfBar').classList.add('confirm');
      $('#pfSend').textContent = 'Yes, send it';
      $('#pfNoteBtn').textContent = 'Back';
      $('#pfErr').textContent = `Send ${[...picked].map(fileNo).join(', ')}? You can't change it after sending.`;
      return;
    }
    $('#pfSend').disabled = true;
    $('#pfSend').textContent = 'Sending…';
    try {
      const res = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selection: [...picked], note: $('#pfNote').value }) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Could not send. Please try again.');
      Object.assign(data, { submitted: true, submittedAt: out.submittedAt, selection: out.selection });
      render();
      scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      unconfirm();
      $('#pfErr').textContent = e.message;
      paint();
    }
  }

  // ---- Download all finals as one .zip (built in the browser; JPEGs are stored, not recompressed) ----
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function downloadAll() {
    const btn = $('#pfDlAll'), msg = $('#pfDlMsg'), files = data.finals;
    if (files.length === 1) { location.href = `/api/proof-file?t=${encodeURIComponent(token)}&kind=${files[0].kind || 'finals'}&f=${encodeURIComponent(files[0].name)}`; return; }
    btn.disabled = true;
    const parts = [], central = [], enc = new TextEncoder();
    let offset = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        msg.textContent = `Preparing ${i + 1} of ${files.length}…`;
        const res = await fetch(`/api/proof-file?t=${encodeURIComponent(token)}&kind=${files[i].kind || 'finals'}&f=${encodeURIComponent(files[i].name)}`);
        if (!res.ok) throw new Error();
        const buf = new Uint8Array(await res.arrayBuffer()), name = enc.encode(files[i].name), crc = crc32(buf);
        const h = new DataView(new ArrayBuffer(30));
        [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, crc, 4], [18, buf.length, 4], [22, buf.length, 4], [26, name.length, 2], [28, 0, 2]]
          .forEach(([o, v, n]) => (n === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true)));
        const c = new DataView(new ArrayBuffer(46));
        [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, crc, 4], [20, buf.length, 4], [24, buf.length, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]
          .forEach(([o, v, n]) => (n === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true)));
        parts.push(h, name, new Blob([buf]));
        central.push(c, name);
        offset += 30 + name.length + buf.length;
      }
      const size = central.reduce((s, p) => s + (p.byteLength ?? p.length), 0);
      const e = new DataView(new ArrayBuffer(22));
      [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, files.length, 2], [10, files.length, 2], [12, size, 4], [16, offset, 4], [20, 0, 2]]
        .forEach(([o, v, n]) => (n === 4 ? e.setUint32(o, v, true) : e.setUint16(o, v, true)));
      const zip = new Blob([...parts, ...central, e], { type: 'application/zip' });
      const slug = [data.project.client, data.project.name].filter(Boolean).join(' ').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'photos';
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(zip), download: `${slug}.zip` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      msg.textContent = 'Your download has started.';
    } catch {
      msg.textContent = 'Something went wrong. Please try again, or use the Download link under each photo.';
    }
    btn.disabled = false;
  }
  $('#pfDlAll').onclick = downloadAll;

  $('#pfSend').onclick = send;
  $('#pfNoteBtn').onclick = () => {
    if (confirming) { unconfirm(); $('#pfErr').textContent = ''; return; }
    $('#pfNoteWrap').hidden = !$('#pfNoteWrap').hidden;
    if (!$('#pfNoteWrap').hidden) $('#pfNote').focus();
  };

  // ---- Lightbox (same look as the event galleries) ----
  let lbItems = [], lbI = 0, lbKind = 'proofs';
  function lbShow() {
    const f = lbItems[lbI];
    const wm = data.watermark && lbKind === 'proofs' ? stamp(f.name) : '';
    $('#lbStage').innerHTML = `<div class="slot" data-hint=""><img src="${esc(f.url)}" alt="Photo ${esc(fileNo(f.name))}">${wm}</div>`;
    $('#lbName').textContent = fileNo(f.name);
    $('#lbCount').textContent = `${lbI + 1} / ${lbItems.length}`;
    lbPaint();
  }
  function lbPaint() {
    const show = lbKind === 'proofs' && data && !data.submitted && lbItems[lbI];
    $('#lbPick').parentElement.hidden = !show;
    if (show) {
      const on = picked.has(lbItems[lbI].name);
      $('#lbPick').textContent = on ? 'Selected ✓' : 'Select this photo';
      $('#lbPick').className = 'btn ' + (on ? 'btn-gold' : 'btn-line');
    }
  }
  const lbOpen = (kind, i) => { lbKind = kind; lbItems = data[kind]; lbI = i; lbShow(); $('#lb').classList.add('open'); document.body.style.overflow = 'hidden'; };
  const lbClose = () => { $('#lb').classList.remove('open'); document.body.style.overflow = ''; };
  const lbStep = (d) => { lbI = (lbI + d + lbItems.length) % lbItems.length; lbShow(); };
  $('#lbX').onclick = lbClose; $('#lbPrev').onclick = () => lbStep(-1); $('#lbNext').onclick = () => lbStep(1);
  $('#lbPick').onclick = () => toggle(lbItems[lbI].name);
  $('#lb').onclick = (e) => { if (e.target.id === 'lb') lbClose(); };
  document.addEventListener('keydown', (e) => {
    if (!$('#lb').classList.contains('open')) return;
    if (e.key === 'Escape') lbClose(); if (e.key === 'ArrowLeft') lbStep(-1); if (e.key === 'ArrowRight') lbStep(1);
  });
  let tx = 0;
  $('#lb').addEventListener('touchstart', (e) => (tx = e.touches[0].clientX), { passive: true });
  $('#lb').addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1); });

  document.addEventListener('click', (e) => {
    const pick = e.target.closest('.pf-pick');
    if (pick) return toggle(pick.dataset.name);
    const open = e.target.closest('.pf-open');
    if (open) lbOpen(open.dataset.kind, +open.dataset.i);
  });
  // With the watermark on, discourage saving proofs (right-click / drag).
  document.addEventListener('contextmenu', (e) => { if (document.body.classList.contains('pf-protect') && e.target.closest('.slot')) e.preventDefault(); });
  document.addEventListener('dragstart', (e) => { if (document.body.classList.contains('pf-protect') && e.target.tagName === 'IMG') e.preventDefault(); });

  function bindImages() {
    document.querySelectorAll('.pf-tile img').forEach((img) => {
      img.addEventListener('error', () => {
        if (img.dataset.full && img.getAttribute('src') !== img.dataset.full) img.src = img.dataset.full;
        else img.parentElement.classList.add('empty');
      }, { once: false });
    });
  }

  (async () => {
    try {
      const res = await fetch(api, { cache: 'no-store' });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'This gallery could not be loaded.');
      data = out;
      render();
    } catch (e) {
      $('#pfTitle').innerHTML = 'Gallery not <em>found</em>';
      $('#pfMsg').textContent = e.message + ' If you think this is a mistake, email andrew@andrewstankus.com.';
      $('#pfMsg').hidden = false;
    }
  })();
})();
