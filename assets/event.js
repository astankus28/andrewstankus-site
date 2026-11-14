// Shared behaviour for /events pages: empty-photo placeholders + lightbox gallery
(function () {
  const $ = s => document.querySelector(s);
  document.querySelectorAll('.slot > img').forEach(img => {
    const fail = () => img.parentElement.classList.add('empty');
    if (img.complete && !img.naturalWidth) fail(); else img.addEventListener('error', fail);
  });

  const items = [...document.querySelectorAll('.gallery button')];
  if (!items.length || !$('#lb')) return;
  let i = 0;
  const show = () => {
    const src = items[i].querySelector('img').getAttribute('src');
    $('#lbStage').innerHTML = `<div class="slot" data-hint="${src}"><img src="${src}" alt=""></div>`;
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
})();
