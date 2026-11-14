/* Copy-edit mode: open the page with ?edit. Click any text and type; "Copy changes" lists
   old and new text to paste back. Drafts are kept in this browser until you reset. Not loaded for visitors. */
(() => {
  const SEL = 'h1, .lede, .eyebrow, .scene h2, .scene p, .tag, .go, #before h2, .org, .role, .what, .principles .t, .principles p, blockquote, figcaption, .card .k, .card .t, .card p, .card .more, #hello .eyebrow, .keys .key, #schHint';
  const KEY = 'ksch-edit-draft';
  const els = [...document.querySelectorAll(SEL)].filter(e => !e.closest('#nav, #staff, #menu') && !e.querySelector(SEL));
  const where = e => { const s = e.closest('article, section, header, footer'); return s ? (s.dataset.label || s.id || 'page') : 'page'; };
  const orig = els.map(e => e.innerHTML);
  let draft = {}; try { draft = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (x) {}
  const txt = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };
  els.forEach((e, i) => {
    if (draft[i] != null) e.innerHTML = draft[i];
    e.contentEditable = 'plaintext-only';
    e.spellcheck = true;
    e.style.outlineOffset = '3px';
    e.addEventListener('keydown', ev => { if (ev.key === 'Enter') ev.preventDefault(); ev.stopPropagation(); });
    e.addEventListener('input', save);
  });
  // links and buttons are text here, not navigation
  document.addEventListener('click', ev => { if (ev.target.closest('a, button.key') && !ev.target.closest('#editBar, #nav, #staff, #menu')) { ev.preventDefault(); ev.stopPropagation(); } }, true);

  const st = document.createElement('style');
  st.textContent = '[contenteditable]{cursor:text}[contenteditable]:hover{outline:1.5px dashed #2B3BFF}[contenteditable]:focus{outline:2px solid #2B3BFF}[contenteditable].chg{background:rgba(220,255,61,.55)}' +
    '#editBar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:99;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 14px;background:#0B0B0B;color:#fff;border-radius:12px;font:14px/1 var(--pix);box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:calc(100vw - 24px)}' +
    '#editBar button{font:inherit;color:#0B0B0B;background:#DCFF3D;border:0;border-radius:8px;padding:8px 12px;cursor:pointer}#editBar button.g{background:#333;color:#fff}';
  document.head.appendChild(st);
  const bar = document.createElement('div');
  bar.id = 'editBar';
  bar.innerHTML = '<span id="editN"></span><button id="editCopy">Copy changes</button><button class="g" id="editReset">Reset</button>';
  document.body.appendChild(bar);

  function changes() {
    return els.map((e, i) => ({ i, a: txt(orig[i]), b: txt(e.innerHTML), w: where(e) })).filter(c => c.a !== c.b);
  }
  function save() {
    draft = {}; els.forEach((e, i) => { if (e.innerHTML !== orig[i]) draft[i] = e.innerHTML; e.classList.toggle('chg', e.innerHTML !== orig[i]); });
    try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch (x) {}
    const n = changes().length;
    document.getElementById('editN').textContent = 'Edit mode · ' + n + (n === 1 ? ' change' : ' changes');
  }
  document.getElementById('editCopy').addEventListener('click', async ev => {
    const out = changes().map(c => '[' + c.w + ']\nWAS: ' + c.a + '\nNOW: ' + c.b).join('\n\n') || 'No changes';
    try { await navigator.clipboard.writeText(out); ev.target.textContent = 'Copied ✓'; }
    catch (x) { prompt('Copy this:', out); }
    setTimeout(() => { ev.target.textContent = 'Copy changes'; }, 1500);
  });
  document.getElementById('editReset').addEventListener('click', () => {
    if (!confirm('Throw away all edits?')) return;
    els.forEach((e, i) => { e.innerHTML = orig[i]; }); save();
  });
  save();
})();
