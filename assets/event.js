// Shared behaviour for /events pages: photo galleries (from the page or from an R2 folder),
// empty-photo placeholders and the full-screen lightbox.
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // A photo that fails to load (often a dropped connection on a phone) is retried a few times
  // before its slot is shown as empty.
  function retryOrEmpty(img) {
    // A resized copy that fails (resizing off, or over the monthly limit) falls back to the original.
    if (img.dataset.full && img.getAttribute('src') !== img.dataset.full) { img.src = img.dataset.full; return; }
    const n = +(img.dataset.retry || 0);
    const src = img.getAttribute('src') || '';
    if (n < 3 && /^https?:|^\.|^\//.test(src)) {
      img.dataset.retry = n + 1;
      setTimeout(() => { img.src = src.replace(/([?&])r=\d+&?/, '$1').replace(/[?&]$/, '') + (src.includes('?') ? '&' : '?') + 'r=' + (n + 1); }, 800 * (n + 1));
    } else {
      img.parentElement.classList.add('empty');
    }
  }

  function markEmpty(root) {
    root.querySelectorAll('.slot > img').forEach(img => {
      const fail = () => retryOrEmpty(img);
      if (img.complete && !img.naturalWidth && img.getAttribute('src')) fail();
      img.addEventListener('error', fail);
    });
  }

  function initLightbox() {
    const items = [...document.querySelectorAll('.gallery button')];
    if (!items.length || !$('#lb')) return;
    let i = 0;
    const show = () => {
      const im = items[i].querySelector('img');
      const src = im.dataset.full || im.getAttribute('src');
      $('#lbStage').innerHTML = `<div class="slot" data-hint="${esc(src)}"><img src="${esc(src)}" alt=""></div>`;
      const img = $('#lbStage img');
      img.onerror = () => img.parentElement.classList.add('empty');
      $('#lbCount').textContent = `${i + 1} / ${items.length}`;
    };
    const open = n => { i = n; show(); $('#lb').classList.add('open'); document.body.style.overflow = 'hidden'; };
    const close = () => { $('#lb').classList.remove('open'); document.body.style.overflow = ''; };
    const step = d => { i = (i + d + items.length) % items.length; show(); };
    items.forEach((b, n) => b.onclick = () => open(n));
    $('#lbX').onclick = close; $('#lbPrev').onclick = () => step(-1); $('#lbNext').onclick = () => step(1);
    $('#lb').onclick = e => { if (e.target.id === 'lb') close(); };
    document.addEventListener('keydown', e => {
      if (!$('#lb').classList.contains('open')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1);
    });
    let tx = 0;
    $('#lb').addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
    $('#lb').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
  }

  // Gallery grid photos are served as smaller copies by Cloudflare Images (on the live domain only);
  // the full-size original opens in the lightbox.
  const RESIZE = /(^|\.)andrewstankus\.com$/.test(location.hostname);
  const small = src => RESIZE && /^https:\/\/photos\.andrewstankus\.com\//.test(src)
    ? '/cdn-cgi/image/width=1000,quality=80,format=auto/' + src : src;

  async function loadFolder(gallery) {
    const folder = gallery.dataset.folder;
    const title = gallery.dataset.title || '';
    let caps = [];
    try { caps = JSON.parse(gallery.dataset.captions || '[]'); } catch (e) {}
    const api = (document.querySelector('link[rel=stylesheet][href*="assets/event.css"]').getAttribute('href').split('assets/event.css')[0]) + 'api/photos?folder=' + encodeURIComponent(folder);
    try {
      const { photos = [], sizes = [] } = await (await fetch(api)).json();
      gallery.innerHTML = photos.map((src, n) => {
        const cap = caps[n] || '';
        const wh = sizes[n] ? ` width="${sizes[n][0]}" height="${sizes[n][1]}"` : '';
        return `<button aria-label="Open photo ${n + 1}"><div class="slot" data-hint=""><img src="${esc(small(src))}" data-full="${esc(src)}"${wh} alt="${esc((cap ? cap + ' — ' : '') + title)} — photo ${n + 1}" loading="lazy">` +
          (cap ? `<span class="cap">${esc(cap)}</span>` : '') + `</div></button>`;
      }).join('');
      const meta = document.querySelector('.meta');
      if (meta && photos.length) meta.insertAdjacentHTML('beforeend', `<div><small>Photos</small>${photos.length}</div>`);
    } catch (err) {
      gallery.innerHTML = '';
    }
  }

  (async () => {
    const g = document.querySelector('.gallery[data-folder]');
    if (g) await loadFolder(g);
    markEmpty(document);
    initLightbox();
  })();
})();

// Event video: big play button over the cover frame; native controls appear once it plays.
document.querySelectorAll('.ev-video').forEach(function (box) {
  var v = box.querySelector('video');
  if (!v) return;
  var btn = document.createElement('button');
  btn.className = 'ev-play';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Play video');
  btn.innerHTML = '<span></span>';
  v.controls = false;
  box.classList.add('has-play');
  box.insertBefore(btn, v.nextSibling);
  btn.addEventListener('click', function () { v.controls = true; v.play(); });
  v.addEventListener('play', function () { box.classList.add('playing'); v.controls = true; });
  v.addEventListener('ended', function () { box.classList.remove('playing'); v.controls = false; });
});
