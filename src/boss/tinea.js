/* Mother Tinea, "the brood mother". Boss 2: teaches priority targets and the bobbin's thread.
   She sits in a silk case at the top and cannot be hurt while it is closed (b.shield). She lays clutches of egg sacs on the
   cloth; each sac pulses and hatches into a Nibbler after about four seconds unless it is shot, dashed through, or cut by the
   bobbin's thread in the moment after a dash (one sweep can cut a whole clutch). Popping three sacs splits the case open for
   six seconds: that is the damage window, and her belly fills the fray meter for a full stun. If nobody pops sacs she still has
   to open the case now and then to lay a big clutch, for a moment only, so ignoring the eggs costs time and floods the cloth.
   Phase 2: she leaves the top and crawls around the wooden frame, laying clutches in from the sides, and drops nets with one gap.

   PROPS
     egg     circle  an egg sac (sprite 'eggsac'). life counts down to hatching, data.life0 = starting life, so 1 - life / life0 is how
                     ripe it is (pulse faster as it ripens). warn: the moment it is being laid (outline). Shootable, cuttable.
                     data.fromX, data.fromY: where she laid it from (for a short flight onto the cloth during warn).
   POSES   sit (in her case at the top), lay (0.6 s wind-up before a clutch), crawl-top, crawl-left, crawl-right (phase 2, on that rail
           of the frame; the body hangs inward from the rail). The case is split open whenever b.shield is false.
   CUES    lay     wind-up of a clutch (data.n eggs)
           pop     an egg sac destroyed before it hatched (data.how = 'shot' | 'cut'); data.left = sacs still needed to split the case
           hatch   an egg sac hatched into a Nibbler
           split   the case splits open (data.forced true when she opened it herself, a short window)
           seal    the case closes again
           crawl   phase 2 starts: she breaks out to crawl the frame
           net     she drops a net with one gap (the net itself is a sim.nets entry) */
(function () {
  'use strict';
  const C = ST.content, F = ST.FIELD;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const EGG_LIFE = 4.2, OPEN = 6, FORCED_OPEN = 3, FORCE_AFTER = 7, NEED = 3, MAX_NIBS = 10, RAIL = 6.0, RAIL_LOW = 6.8, RAIL_TOP = 16.2;
  // phase 2 path along the frame: up the left rail, across the top, down the right rail (walked back and forth)
  const PATH = [[-RAIL, RAIL_LOW], [-RAIL, RAIL_TOP], [RAIL, RAIL_TOP], [RAIL, RAIL_LOW]];
  const SEG = [RAIL_TOP - RAIL_LOW, RAIL * 2, RAIL_TOP - RAIL_LOW], LEN = SEG[0] + SEG[1] + SEG[2];
  function pathAt(d, out) {
    d = ((d % (LEN * 2)) + LEN * 2) % (LEN * 2); if (d > LEN) d = LEN * 2 - d;
    let i = 0; while (i < 2 && d > SEG[i]) { d -= SEG[i]; i++; }
    const a = PATH[i], b = PATH[i + 1], u = clamp(d / SEG[i], 0, 1);
    out.x = a[0] + (b[0] - a[0]) * u; out.y = a[1] + (b[1] - a[1]) * u; out.seg = i; return out;
  }

  function lay(sim, b, n) {
    const s = b.s, side = s.crawl && s.at.seg !== 1 ? (s.at.seg === 0 ? -1 : 1) : 0;
    const y = sim.rr(0.6, s.crawl ? 4.6 : 5.2);
    for (let i = 0; i < n; i++) {
      const x = side ? side * (RAIL - 0.4) - side * (0.6 + i * 1.05) : clamp(s.cx, -5.6 + (n - 1) * 0.525, 5.6 - (n - 1) * 0.525) + (i - (n - 1) / 2) * 1.05;
      sim.addProp({ kind: 'egg', shape: 'circle', x, y, r: 0.42, warn: 0.5, life: EGG_LIFE, hp: 1.8, shoot: true, block: true, cut: true, sprite: 'eggsac',
        data: { life0: EGG_LIFE, fromX: b.x, fromY: b.y - 1.2 } });
    }
  }
  function openCase(sim, b, sec, forced) { b.shield = false; b.s.open = sec; b.s.pops = 0; sim.cue(b, 'split', { forced: !!forced }); }

  const script = {
    cues: ['lay', 'pop', 'hatch', 'split', 'seal', 'crawl', 'net'],
    def: {
      hp: 3000, halfW: 2.9, halfH: 2.3, frayAt: 0.08, stunTime: 4.5,
      soft: [{ x: 0, r: 0.9 }], softName: 'Her belly, while the silk case is split',
      phases: ['Sits in her silk case and lays egg sacs; pop three to split the case', 'Crawls around the frame laying sacs from the sides, and drops nets'],
      phaseTag: ['The silk case', 'Crawling the frame']
    },
    sprites: {
      eggsac: { w: 7, h: 7, pal: { a: '#E6DFD0', b: '#C9B38C', c: '#8B7355', d: '#A82A33' }, rows: [
        '..aaa..', '.abbba.', 'abcbcba', 'abbdbba', 'abcbcba', '.abbba.', '..aaa..'] }
    },
    init(sim, b) {
      const s = b.s;
      s.pops = 0; s.open = 0; s.sealT = 0; s.wind = 0; s.crawl = false; s.d = 0; s.cx = 0; s.at = { x: 0, y: 14.6, seg: 1 }; s.join = 0;
      b.shield = true; b.x = 0; b.y = 14.6; b.pose = 'sit';
    },
    enter() {},   // she is in her case where init put her when the entrance ends
    update(sim, b, dt) {
      const s = b.s, pl = sim.player;
      // movement
      if (!s.crawl) { b.x = Math.sin(b.t * 0.35) * 1.2; b.y = 14.6 + Math.sin(b.t * 0.9) * 0.15; }
      else {
        s.d += dt * 1.9; pathAt(s.d, s.at);
        if (s.join < 1) { s.join = Math.min(1, s.join + dt / 1.2); b.x += (s.at.x - b.x) * s.join; b.y += (s.at.y - b.y) * s.join; }
        else { b.x = s.at.x; b.y = s.at.y; }
      }
      const rest = s.crawl ? (s.at.seg === 0 ? 'crawl-left' : s.at.seg === 2 ? 'crawl-right' : 'crawl-top') : 'sit';
      // the case
      if (!b.shield) { s.open -= dt; if (s.open <= 0) { b.shield = true; s.sealT = b.t; s.pops = 0; sim.cue(b, 'seal'); } }
      else if (b.t - s.sealT > FORCE_AFTER && s.wind <= 0) { openCase(sim, b, FORCED_OPEN, true); s.cx = clamp(b.x + (b.x > 0 ? -3.4 : 3.4), -4.4, 4.4); lay(sim, b, 5); }
      // laying
      if (s.wind > 0) {
        s.wind -= dt; b.pose = 'lay';
        if (s.wind <= 0) { lay(sim, b, s.n); b.pose = rest; }
      } else {
        b.pose = rest;
        let eggs = 0; for (const p of sim.props) if (p.kind === 'egg') eggs++;
        if (sim.every(b, 'lay', s.crawl ? 3.0 : 2.7) && eggs < 12) {
          // clutches land off to one side of her, so popping them means leaving her
          const side = b.x > pl.x ? -1 : b.x < pl.x ? 1 : (sim.rand() < 0.5 ? -1 : 1);
          s.n = s.crawl ? 4 : 3; s.wind = 0.6; s.cx = clamp(b.x + (sim.rand() < 0.7 ? side : -side) * sim.rr(2.7, 4.4), -5, 5);
          if (Math.abs(s.cx - b.x) < 2.6) s.cx = clamp(b.x - Math.sign(s.cx - b.x || 1) * 3.2, -5, 5);
          sim.cue(b, 'lay', { n: s.n, x: b.x, y: b.y });
        }
      }
      if (s.crawl && sim.every(b, 'net', 7.5)) {
        let gap = sim.rr(-5, 5); if (Math.abs(gap - pl.x) < 1.5) gap = clamp(gap + (gap > pl.x ? 2.5 : -2.5), -5.2, 5.2);
        sim.netHazard(Math.min(b.y - 1.5, 14), gap, 2.6, 2.4); sim.cue(b, 'net', { x: gap, y: b.y });
      }
    },
    onPhase(sim, b, ph) {
      if (ph < 2 || b.s.crawl) return;
      const s = b.s; s.crawl = true; s.join = 0; s.d = SEG[0] + SEG[1] / 2 + (b.x / RAIL) * SEG[1] / 2; pathAt(s.d, s.at);
      sim.cue(b, 'crawl', { x: b.x, y: b.y });
    },
    onProp(sim, b, p, why) {
      if (p.kind !== 'egg') return;
      const s = b.s;
      if (why === 'expire') {
        if (sim.enemies.length < MAX_NIBS) sim.spawnAt('nibbler', p.x, p.y, { passes: 0, vx: sim.rr(-1, 1) });
        sim.cue(b, 'hatch', { x: p.x, y: p.y });
      } else if (why === 'destroyed' || why === 'cut') {
        if (b.shield) s.pops++;
        sim.cue(b, 'pop', { x: p.x, y: p.y, how: why === 'cut' ? 'cut' : 'shot', left: b.shield ? Math.max(0, NEED - s.pops) : 0 });
        if (b.shield && s.pops >= NEED && b.stun <= 0) openCase(sim, b, OPEN, false);
      }
    }
  };
  ST.registerBoss('tinea', script);
})();
