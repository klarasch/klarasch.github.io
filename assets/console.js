/* Console easter egg: a "Hi" written on the staff, plus a few commands. */
(() => {
  const L = '#DCFF3D', B = '#7D87FF', G = '#6A7078', D = '#9AA0A6';
  const mono = 'font-family:ui-monospace,Menlo,Consolas,monospace;';
  const big = mono + 'font-size:13px;line-height:1.15;';
  const txt = mono + 'font-size:12px;line-height:1.5;';

  // Print segments [[text, css], ...] as one styled line (or block).
  const out = segs => console.log(segs.map(s => '%c' + s[0]).join(''), ...segs.map(s => s[1]));

  /* ---------- the greeting ---------- */
  const H = ['█   █ █', '█   █  ', '█████ █', '█   █ █', '█   █ █'];
  const notes = { 1: '♪', 3: '♫' }; // staff line -> note at its end
  const segs = [];
  H.forEach((row, i) => {
    if (i) segs.push(['\n', big]);
    segs.push(['──', big + 'color:' + G]);
    // letters sit on the staff: gaps inside them are staff line, not blank
    for (const ch of row) segs.push(ch === '█' ? ['█', big + 'color:' + L] : ['─', big + 'color:' + G]);
    segs.push([notes[i] ? '─'.repeat(15) + ' ' : '─'.repeat(22), big + 'color:' + G]);
    if (notes[i]) segs.push([notes[i], big + 'color:' + B]);
  });
  out(segs);
  out([['People who open devtools are my people.', txt + 'font-size:13px'],
       ['\nType ', txt + 'color:' + D], ['help()', txt + 'color:' + L], [' to see what else is in here.', txt + 'color:' + D]]);

  /* ---------- commands ---------- */
  const cmds = {
    help: ['what you can type', () => {
      out([['Commands', txt + 'font-weight:700']]);
      Object.entries(cmds).forEach(([k, [d]]) =>
        out([[(k + '()').padEnd(10), txt + 'color:' + L], [d, txt + 'color:' + D]]));
    }],
    about: ['who made this', () => out([[
      'Klára Scholleová. Staff Product Designer at SentinelOne, ex-Oracle.\n' +
      'I design complex products, and I build things, hands-on. Like this page.', txt]])],
    work: ['things I made', () => {
      [['SentinelOne', 'platform UX, Event Search', 'https://ksch.cz/#stage'],
       ['Slaydy', 'a deck skill anyone can own', 'https://ksch.cz/slaydy/'],
       ['Stavy', 'every state, one canvas', 'https://ksch.cz/stavy/'],
       ['Koffbeat', 'a rhythm trainer', 'https://ksch.cz/koffbeat/']]
        .forEach(([n, d, u]) => out([[n.padEnd(13), txt + 'color:' + L], [d.padEnd(28), txt + 'color:' + D], [u, txt]]));
    }],
    hello: ['say hi back', () => out([
      ['klara@ksch.cz', txt + 'color:' + L],
      ['\nhttps://www.linkedin.com/in/klara-scholleova/\nhttps://github.com/klarasch', txt]])],
    sch: ['play my name', () => {
      // S–C–H: my initials are a melody (E♭, C, B)
      tones([311.13, 261.63, 246.94]);
      out([['♪ E♭ C B', txt + 'color:' + L], ['  S is E♭, C is C, H is B. My name is a melody.', txt + 'color:' + D]]);
    }],
    game: ['a tiny ear game', () => { streak = 0; round(); }],
  };

  /* ---------- sound ---------- */
  let ac = null;
  function tones(freqs, gap = 0.45) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      freqs.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + 0.05 + i * gap;
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.9);
      });
    } catch (e) { /* no audio */ }
  }

  /* ---------- game: two notes, did it go up or down? ---------- */
  // The gap starts at a fifth and shrinks to a semitone as the streak grows.
  let streak = 0, pair = null;
  const RANKS = ['warming up', 'decent ears', 'nice ears', 'basically a tuner', 'perfect pitch'];
  function round() {
    const semis = Math.max(1, 7 - Math.floor(streak / 2));
    const base = 220 * Math.pow(2, Math.floor(Math.random() * 13) / 12);
    const dir = Math.random() < 0.5 ? 1 : -1;
    pair = { a: base, b: base * Math.pow(2, dir * semis / 12), dir };
    tones([pair.a, pair.b], 0.6);
    out([['♪ ♪  ', txt + 'color:' + B], ['Round ' + (streak + 1) + '. Did the second note go ', txt],
         ['up()', txt + 'color:' + L], [' or ', txt], ['down()', txt + 'color:' + L], ['?', txt],
         ['  again() to replay', txt + 'color:' + D]]);
  }
  function answer(dir) {
    if (!pair) return out([['Type ', txt + 'color:' + D], ['game()', txt + 'color:' + L], [' to start.', txt + 'color:' + D]]);
    if (dir === pair.dir) {
      streak++; pair = null;
      out([['✓ yes', txt + 'color:' + L], ['  streak ' + streak, txt + 'color:' + D]]);
      setTimeout(round, 700);
    } else {
      const rank = RANKS[Math.min(RANKS.length - 1, Math.floor(streak / 3))];
      pair = null;
      tones([196, 185], 0.25);
      out([['✗ nope', txt + 'color:#FF6B6B'], ['  streak ' + streak + ': ' + rank + '. ', txt + 'color:' + D],
           ['game()', txt + 'color:' + L], [' to go again.', txt + 'color:' + D]]);
    }
  }
  const extra = {
    up: () => answer(1),
    down: () => answer(-1),
    again: () => pair ? tones([pair.a, pair.b], 0.6) : answer(0),
  };

  Object.entries(cmds).forEach(([k, [, fn]]) => {
    if (typeof window[k] !== 'function') window[k] = () => { fn(); return '♪'; };
  });
  Object.entries(extra).forEach(([k, fn]) => {
    if (typeof window[k] !== 'function') window[k] = () => { fn(); return '♪'; };
  });
})();
