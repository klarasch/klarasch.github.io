/* Homepage behaviour: the staff (one note per section, plucked by the pointer),
   pinned work scenes, keycaps and the name melody. No dependencies. */
(() => {
  const B = '#2B3BFF', K = '#0B0B0B', L = '#DCFF3D', M = '#F6F7F9';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const root = document.documentElement;

  const scenes = [...document.querySelectorAll('.scene')].map(el => ({
    el, bg: el.dataset.bg, fg: el.dataset.fg, label: el.dataset.label,
    col: el.dataset.col, line: +el.dataset.line,
    frame: el.querySelector('iframe[data-src]'),
  }));
  scenes.forEach(s => { s.el.style.color = s.fg; });
  const nS = scenes.length;

  /* ---------- measurements ---------- */
  const S = { W: 1440, H: 900, docH: 8000, stageTop: 900, tops: {}, mobile: false, pad: 80 };
  function measure() {
    S.W = innerWidth;
    S.H = Math.min(innerHeight, 1000);
    S.mobile = S.W < 720;
    S.pad = S.mobile ? 20 : Math.round(Math.min(80, S.W * 0.05));
    root.style.setProperty('--H', S.H + 'px');
    $('stage').style.height = Math.round(nS * S.H * 0.95 + $('stageInner').offsetHeight) + 'px';
    const top = id => { const el = $(id); return el ? el.getBoundingClientRect().top + scrollY : 0; };
    S.stageTop = top('stage');
    S.tops = { before: top('before'), how: top('how'), hello: top('hello') };
    S.docH = Math.max(1, root.scrollHeight - innerHeight);
    // scaled iframes: cover the screen box (wider of the two fits)
    document.querySelectorAll('iframe.scaled').forEach(f => {
      const r = f.parentElement.getBoundingClientRect();
      f.style.setProperty('--fit', Math.max(r.width / 1280, r.height / 800).toFixed(4));
    });
  }

  /* ---------- notes ---------- */
  // [label, colour, staff line (0 = top), scroll target getter]
  const per = () => S.H * 0.95;
  const NOTES = [
    ['Hello', K, 2, () => 0],
    ...scenes.map((s, i) => [s.label, s.col, s.line, () => S.stageTop + per() * i + 2]),
    ['Before', K, 3, () => S.tops.before - S.H * 0.15],
    ['How I work', B, 2, () => S.tops.how - S.H * 0.15],
    ['Say hello', L, 1, () => S.tops.hello - S.H * 0.15],
  ];
  const holder = $('notes');
  const noteEls = NOTES.map((n, i) => {
    const b = document.createElement('button');
    b.className = 'nt';
    b.setAttribute('aria-label', 'Go to ' + n[0]);
    b.innerHTML = '<span class="hd"></span><span class="tip">' + n[0] + '</span>';
    b.addEventListener('click', () => scrollTo({ top: Math.max(0, n[3]()), behavior: reduce ? 'auto' : 'smooth' }));
    holder.appendChild(b);
    return { b, hd: b.firstChild, tip: b.lastChild, key: '' };
  });

  const rng = (a, b) => { const o = []; for (let v = a; v <= b; v++) o.push(v); return o; };
  const HEAD = [[1,0],[2,0],[3,0],[4,0]].concat(rng(0,5).map(x => [x,1]), rng(0,5).map(x => [x,2]), [[1,3],[2,3],[3,3],[4,3]]);
  const RING = [[1,0],[2,0],[3,0],[4,0],[0,1],[1,1],[4,1],[5,1],[0,2],[1,2],[4,2],[5,2],[1,3],[2,3],[3,3],[4,3]];
  const CEN = [[2,1],[3,1],[2,2],[3,2]];
  const STEM = rng(-8, 1).map(v => [5, v]);
  const sh = (pts, col, P) => pts.map(q => (q[0] * P).toFixed(2) + 'px ' + (q[1] * P).toFixed(2) + 'px 0 0.3px ' + col);

  /* ---------- pointer pluck + tilt ---------- */
  const ptr = { x: -9999, y: -9999, px: -9999, py: -9999 };
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; } }, { passive: true });
  const plucks = [null, null, null, null, null];
  const tilt = { x: 0, y: 0 };
  const lines = [0, 1, 2, 3, 4].map(i => $('sl' + i));

  /* ---------- scene state ---------- */
  let idx = -1, booted = false, lastBg = -1, lastTop = '';
  // Browser chrome colour: older Safari and Chrome read theme-color; Safari 26 samples
  // the page background and fixed bars at the top edge, so all three follow the colour under the toolbar.
  const meta = document.querySelector('meta[name="theme-color"]');
  function setTopColour(c) {
    if (c === lastTop) return;
    lastTop = c;
    meta.setAttribute('content', c);
    root.style.backgroundColor = c;
    document.body.style.backgroundColor = c;
    $('navbg').style.backgroundColor = c === M ? 'rgba(246, 247, 249, .84)' : c;
  }
  function setScene(n) {
    if (n === idx) return;
    idx = n;
    scenes.forEach((s, i) => {
      s.el.classList.toggle('on', i === n);
      s.el.classList.toggle('past', i < n);
      s.el.setAttribute('aria-hidden', i === n ? 'false' : 'true');
      // load the Slaydy film only when its scene is near
      if (s.frame && Math.abs(i - n) <= 1 && !s.frame.src) s.frame.src = s.frame.dataset.src;
    });
    $('stageInner').style.background = scenes[n].bg;
  }

  /* ---------- frame ---------- */
  function frame() {
    requestAnimationFrame(frame);
    const { W, H, mobile, pad } = S;
    const y = scrollY || 0;
    const now = performance.now() / 1000;
    const P_ = per(), stageLen = nS * P_;
    const local = y - S.stageTop;
    const sf = cl(local / P_, 0, nS - 0.001);
    setScene(Math.floor(sf));
    if (idx === 0) scenes[0].el.classList.toggle('on', S.stageTop - y < S.H * 0.3);
    const sub = sf - idx;
    scenes[idx].el.querySelector('.vis').style.setProperty('--par', (cl(sub, 0, 1) * -24).toFixed(1) + 'px');
    const stageScreenTop = S.stageTop - y;

    // td: 0 = big staff across the bottom, 1 = docked (after the scenes).
    // Desktop docks into the nav; phones dock in a strip below the header,
    // because between the name and the key there is no room.
    const td = ease(cl((local - stageLen + H * 0.15) / (H * 0.5), 0, 1));

    const navH = mobile ? lerp(64, 52, td) : lerp(84, 64, td);
    let top, gap, nL, nR, lineL, lineR;
    if (mobile) {
      const dGap = 4.5, dTop = navH + 6;
      // higher on the hero so all five lines clear the first scene's colour; back down once the scenes take over
      const hero = ease(cl(y / (S.stageTop * 0.8), 0, 1));
      top = lerp(H * lerp(0.78, 0.84, hero), dTop, td); gap = lerp(H * 0.026, dGap, td);
      nL = lerp(pad + 6, pad + 10, td); nR = lerp(W - pad - 6, W - pad - 10, td);
      lineL = lerp(0, pad, td); lineR = lerp(W, W - pad, td);
    } else {
      const dGap = 5, dTop = navH / 2 - 2 * dGap, dL = 260, dR = W - pad - 220;
      top = lerp(H * 0.66, dTop, td); gap = lerp(H * 0.055, dGap, td);
      nL = lerp(pad, dL, td); nR = lerp(W - pad, dR, td);
      lineL = lerp(0, dL - 14, td); lineR = lerp(W, dR + 14, td);
    }
    const big = td < 0.05;

    // The staff takes the colours of whatever sits under each part of it: as the first
    // scene slides up, its edge wipes across the staff and recolours it line by line.
    const VH = innerHeight;
    const eTop = td < 0.5 ? stageScreenTop : VH, eBot = td < 0.5 ? stageScreenTop + $('stage').offsetHeight : VH;
    const inScene = yy => yy > eTop && yy < eBot;
    const MIST = { bg: M, fg: K, dark: false, line: 'rgba(11,11,11,' + lerp(0.16, 0.22, td).toFixed(3) + ')', head: B };
    const sc = scenes[idx], scDark = sc.bg === B || sc.bg === K;
    const SCENE = { bg: sc.bg, fg: sc.fg, dark: scDark, line: scDark ? 'rgba(255,255,255,0.38)' : MIST.line, head: scDark ? '#FFFFFF' : B };
    const palAt = yy => (inScene(yy) ? SCENE : MIST);
    const crossing = td < 0.5 && eTop > -2 && eTop < VH;

    // nav + its backdrop (on phones the backdrop also holds the docked staff)
    const nav = $('nav'), navbg = $('navbg');
    nav.style.height = navH.toFixed(1) + 'px';
    nav.style.color = td < 0.5 && stageScreenTop < 40 ? scenes[idx].fg : K;
    const pinned = td <= 0.5 && stageScreenTop <= 1 && eBot > 0;
    navbg.style.opacity = td > 0.5 || pinned ? 1 : 0;
    navbg.classList.toggle('solid', pinned);
    navbg.style.height = (mobile && !pinned ? navH + 6 + gap * 4 + 26 : navH).toFixed(1) + 'px';
    setTopColour(pinned ? sc.bg : M);

    $('navName').textContent = mobile && td > 0.5 && W < 400 ? 'K. S.' : 'Klára Scholleová';
    const links = $('navLinks');
    links.style.opacity = cl(1 - td * 2.2, 0, 1).toFixed(2);
    links.style.pointerEvents = td > 0.4 ? 'none' : 'auto';
    const hc = $('heroCtas').getBoundingClientRect(), fh = $('footHello').getBoundingClientRect();
    $('navHello').classList.toggle('off', hc.bottom > navH || fh.top < innerHeight);

    // plucking (desktop, big staff only)
    if (big && !mobile && !reduce && ptr.px > -9000) {
      for (let i = 0; i < 5; i++) {
        const ly = top + i * gap;
        if ((ptr.py - ly) * (ptr.y - ly) < 0 && ptr.x > lineL && ptr.x < lineR) {
          plucks[i] = { x: ptr.x, t0: now, a: Math.min(12, 3 + Math.abs(ptr.y - ptr.py) * 0.5) };
        }
      }
    }
    ptr.px = ptr.x; ptr.py = ptr.y;

    // gentle 3D tilt toward the pointer
    let tx = 0, ty = 0;
    if (big && !mobile && !reduce && ptr.x > -9000 && !(crossing && eTop < top + gap * 4 + 160)) { tx = ((ptr.y / innerHeight) - 0.6) * -5; ty = ((ptr.x / W) - 0.5) * 6; }
    const tk = crossing ? 0.2 : 0.06;
    tilt.x += (tx - tilt.x) * tk; tilt.y += (ty - tilt.y) * tk;
    $('staffTilt').style.transform = 'perspective(1400px) rotateX(' + tilt.x.toFixed(2) + 'deg) rotateY(' + tilt.y.toFixed(2) + 'deg)';

    // lines
    const wobble = big && !reduce;
    const step = wobble ? 16 : 1e9;
    for (let i = 0; i < 5; i++) {
      const yb = top + i * gap, pk = plucks[i];
      let d = '';
      for (let x = lineL; ; x += step) {
        const xx = Math.min(x, lineR);
        let dy = 0;
        if (wobble) {
          dy += 1.1 * Math.sin(xx / 170 + now * 1.1 + i * 0.7);
          if (pk) { const dt = now - pk.t0; if (dt < 2.2) { const dx = xx - pk.x; dy += pk.a * Math.exp(-dt * 2.6) * Math.sin(dt * 32) * Math.exp(-(dx * dx) / 45000); } }
        }
        d += (d ? ' L' : 'M') + xx.toFixed(0) + ' ' + (yb + dy).toFixed(1);
        if (xx >= lineR) break;
      }
      lines[i].setAttribute('d', d);
      lines[i].setAttribute('stroke', palAt(yb).line);
    }

    // notes, placed by where each section sits in the document
    const prog = cl(y / S.docH, 0, 1);
    const fr = NOTES.map((n, i) => i === 0 ? 0 : cl((n[3]() + (i > nS ? S.H * 0.15 - S.H * 0.4 : 0)) / S.docH, 0, 1));
    let active = 0;
    fr.forEach((f, i) => { if (f <= prog + 0.003) active = i; });
    const P = mobile ? lerp(3, 1, td) : lerp(4, 1.2, td);
    NOTES.forEach((n, i) => {
      const np = palAt(top + n[2] * gap), isA = i === active, lime = n[1] === L;
      const e = noteEls[i], c = n[1] === np.bg ? np.fg : n[1];
      const ringCol = np.dark ? '#FFFFFF' : K;
      const key = [P.toFixed(2), c, isA && td < 0.5, np.dark].join('|');
      if (key !== e.key) {
        e.key = key;
        let pts = lime ? sh(RING, ringCol, P).concat(sh(CEN, L, P)) : sh(HEAD, c, P);
        if (isA && td < 0.5) pts = pts.concat(sh(STEM, lime ? ringCol : c, P));
        e.hd.style.cssText = 'width:' + P.toFixed(2) + 'px;height:' + P.toFixed(2) + 'px;margin-left:' + (-3 * P).toFixed(2) + 'px;margin-top:' + (-2 * P).toFixed(2) + 'px;box-shadow:' + pts.join(',');
      }
      e.hd.style.transform = 'scale(' + (isA ? 1.3 : 1) + ')';
      const x = i === 0 ? nL + 3 * P : lerp(nL, nR, fr[i]);
      e.b.style.left = (x - 20).toFixed(1) + 'px';
      e.b.style.top = (top + n[2] * gap - 20).toFixed(1) + 'px';
      if (booted) e.b.style.opacity = 1;
      e.tip.style.color = np.fg;
      e.tip.style.display = td > 0.5 ? 'none' : 'block';
      e.b.setAttribute('aria-current', isA ? 'true' : 'false');
    });

    // playhead + "now" tag
    const ph = $('playhead'), px = lerp(nL, nR, prog);
    const phTop = top - 6, phH = gap * 4 + 12, cut = cl(eTop - phTop, 0, phH);
    ph.style.background = cut <= 0 || cut >= phH ? palAt(phTop + phH / 2).head
      : 'linear-gradient(180deg,' + MIST.head + ' ' + cut.toFixed(1) + 'px,' + SCENE.head + ' ' + cut.toFixed(1) + 'px)';
    ph.style.top = (top - 6).toFixed(1) + 'px';
    ph.style.height = (gap * 4 + 12).toFixed(1) + 'px';
    ph.style.left = px.toFixed(1) + 'px';
    ph.style.opacity = local > -H * 0.3 || (mobile && td > 0.5) ? 0.9 : 0;
    const tag = $('nowTag');
    tag.textContent = NOTES[active][0];
    tag.style.left = cl(px + 8, 0, W - pad - tag.offsetWidth).toFixed(1) + 'px';
    tag.style.top = (top + gap * 4 + 4).toFixed(1) + 'px';
    tag.style.opacity = td > 0.6 ? 1 : 0;

    // hero drift
    const hi = $('heroInner');
    hi.style.transform = 'translateY(' + (-y * 0.2).toFixed(1) + 'px)';
    hi.style.opacity = cl(1 - y / (H * 0.6), 0, 1).toFixed(2);
    const r = cl(stageScreenTop * 0.12, 0, 32).toFixed(1);
    $('stageInner').style.borderRadius = r + 'px ' + r + 'px 0 0';

    // background light drifts with scroll
    const pq = Math.round(prog * 200);
    if (pq !== lastBg) {
      lastBg = pq;
      $('bg').style.background = 'radial-gradient(120% 90% at ' + (25 + prog * 50).toFixed(1) + '% ' + (10 + prog * 80).toFixed(1) + '%, #FFFFFF 0%, rgba(255,255,255,0.6) 35%, rgba(246,247,249,0) 70%), linear-gradient(180deg, #F6F7F9 0%, #EEF1F5 100%)';
    }
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -15% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  /* ---------- keycaps ---------- */
  document.querySelectorAll('.key').forEach(k => {
    k.addEventListener('mousemove', e => {
      const r = k.getBoundingClientRect();
      k.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(1) + 'deg');
      k.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - 0.5) * 18).toFixed(1) + 'deg');
    });
    k.addEventListener('mouseleave', () => { k.style.setProperty('--ry', '0deg'); k.style.setProperty('--rx', '0deg'); });
  });
  document.querySelectorAll('[data-sent]').forEach(k => {
    const label = k.textContent;
    k.addEventListener('click', () => {
      clearTimeout(k._t);
      k.textContent = 'Sent ✓';
      k._t = setTimeout(() => { k.textContent = label; }, 1400);
    });
  });

  /* ---------- S–C–H: my initials are a melody (E♭, C, B) ---------- */
  const NAMES = ['S is E♭', 'C', 'H is B. My name is a melody.'];
  const FREQ = [311.13, 261.63, 246.94];
  let sch = 0, ac = null;
  const btn = $('playSch');
  btn.addEventListener('click', () => {
    const i = sch % 3;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = FREQ[i];
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.9);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 1);
    } catch (e) { /* no audio, the hint still shows */ }
    sch++;
    $('schHint').textContent = NAMES[i];
    btn.querySelectorAll('.pop').forEach(p => p.remove());
    const p = document.createElement('span');
    p.className = 'pop'; p.textContent = '♪';
    btn.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  });

  /* ---------- boot ---------- */
  measure();
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if (document.fonts) document.fonts.ready.then(measure);
  setTimeout(() => {
    booted = true;
    noteEls.forEach((e, i) => { e.b.style.transitionDelay = (scrollY < 10 ? 250 + i * 200 : 0) + 'ms'; });
    setTimeout(() => noteEls.forEach(e => { e.b.style.transitionDelay = '0ms'; }), 2500);
  }, 150);
  requestAnimationFrame(frame);
  // reduced motion: keep the console video on its first frame
  if (reduce) document.querySelectorAll('.screen video').forEach(v => { v.removeAttribute('autoplay'); v.pause(); });
})();
