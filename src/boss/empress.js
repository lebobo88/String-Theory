/* The Silk Empress: "the weaver". Boss 7. Teaches cutting, and rescuing your bobbin.
   Her web hangs from anchors pinned round the frame (the rim). She runs from rim anchor to rim anchor, fast, and is only
   still when she stops to spin. Each spin drops a dragline from her anchor down to an anchor in the ship's half: that is
   the line she is standing on. Cut it (dash through it, or shoot its lower anchor) and she falls, stunned. Lines she
   finishes stay: the web across your half grows and every line slows the ship until you cut it (dash through lines,
   shoot lower anchors). Phase 2: she cocoons the bobbin (the outline appears round it first: move it out) and hoists it
   above you, so the second weapon is gone until you shoot it free; and moths you kill are strung back up once.
   Phase 3: she cocoons herself in the centre on two draglines and spins ring storms; her own web catches the storm, so
   every line you cut to reach her lets more of it through.

   PROPS
     anchor      circle r 0.45. data.rim true for the anchors pinned to the frame (not shootable); the others sit in the
                 ship's half and are shootable (hp): destroying one cuts every line tied to it.
     webline     seg w 0.22, slow 0.5, cut. data.a, data.b = anchor prop ids. data.held true while she hangs from it
                 (draw it bright: cutting it drops her). Starts with warn 0.5 while it is being spun.
     cocoon      circle r 0.6, shootable (hp), sets sim.bobbinLock. warn 0.9 first: the outline round the bobbin, a miss
                 if the bobbin leaves it. data.hoist 0..1 while she lifts it to where it hangs. The bobbin is held inside it.
     puppetline  seg w 0.08, never hurts or blocks. The string a marionette hangs from: (x, y) at the top of the cloth,
                 (x2, y2) on the moth. warn 0.8 while the string comes down before the moth is strung back up.
   POSES (b.pose)
     'run'      running along her web (weak spot shut)
     'spin'     stopped at an anchor, spinning (weak spot open)
     'fall'     dropping after her line was cut
     'fallen'   lying stunned
     'climb'    climbing back up to the rim
     'cocoon'   wrapped in silk in the centre (phase 3, weak spot shut)
     'storm'    0.7 s wind-up before a ring storm (phase 3, weak spot shut)
     'peek'     opening her cocoon after a storm (phase 3, weak spot open)
   CUES
     spin      she stops at an anchor and starts spinning a dragline ({ x2, y2 } = its lower end)
     weave     a new line is added across the ship's half
     fall      her line was cut and she falls
     snapline  a web line or anchor in the ship's half was cut or shot ({ x, y })
     cocoon    the outline appears round the bobbin ({ x, y } = the bobbin)
     free      the bobbin was shot free
     puppet    a moth the player killed is being strung back up ({ x, y })
     storm     wind-up before a ring storm */
(function () {
  'use strict';
  const C = ST.content, F = ST.FIELD, H = F.H, PY = F.PY, T = C.TUNING;
  const RIM = [[-6.2, 9.6], [-6.2, 13.8], [-3.6, 16.6], [0, 17.2], [3.6, 16.6], [6.2, 13.8], [6.2, 9.6]];
  const MAXLOW = 6, MAXLINES = 13, CENTRE_Y = 11.4;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function line(sim, a, b2, warn) {
    return sim.addProp({ kind: 'webline', shape: 'seg', x: a.x, y: a.y, x2: b2.x, y2: b2.y, w: 0.22, slow: 0.5, cut: true, block: false, warn: warn || 0,
      data: { a: a.id, b: b2.id, held: false } });
  }
  function lowLines(sim) { let n = 0; for (const p of sim.props) if (p.kind === 'webline' && !p.data.rim) n++; return n; }
  function lowAnchors(sim, out) { out.length = 0; for (const p of sim.props) if (p.kind === 'anchor' && !p.data.rim) out.push(p); return out; }
  /* A lower anchor for a new dragline: a fresh one while the web is small, otherwise the one with the fewest lines. */
  function lowerAnchor(sim, b, side) {
    const nearX = side ? side * 4.5 : b.x;
    const s = b.s, lows = lowAnchors(sim, s.tmp);
    if (lows.length < MAXLOW && (lows.length < 2 || sim.rand() < 0.6)) {
      // never straight under her: the line she hangs from slants across the ship's half
      let ax = side ? side * sim.rr(3.2, 6) : b.x + (sim.rand() < 0.5 ? -1 : 1) * sim.rr(2.6, 5); if (Math.abs(ax) > 6) ax = b.x - Math.sign(ax - b.x) * sim.rr(2.6, 5);
      const p = sim.addProp({ kind: 'anchor', shape: 'circle', x: clamp(ax, -6, 6), y: sim.rr(0.4, 3.2), r: 0.45, hp: 14, shoot: true, data: { rim: false } });
      // weave: tie the new anchor to its nearest neighbour across the ship's half
      let best = null, bd = 7.5; for (const q of lows) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } }
      if (best && lowLines(sim) < MAXLINES) { line(sim, p, best, 0.5); sim.cue(b, 'weave', { x: (p.x + best.x) / 2, y: (p.y + best.y) / 2 }); }
      return p;
    }
    let best = lows[0], bn = 1e9;
    for (const q of lows) { let n = 0; for (const l of sim.props) if (l.kind === 'webline' && (l.data.a === q.id || l.data.b === q.id)) n++; n += Math.abs(q.x - b.x) < 2.6 || (side && q.x * side < 1) ? 9 : 0; if (n < bn) { bn = n; best = q; } }
    return best;
  }
  function holdLine(sim, b, from, to) {
    // the web never grows past MAXLINES: the oldest finished line in the ship's half sags and breaks
    if (lowLines(sim) >= MAXLINES) for (const q of sim.props) if (q.kind === 'webline' && !q.data.rim && !q.data.held && q.warn <= 0) { sim.removeProp(q); break; }
    const l = line(sim, from, to, 0.5); l.data.held = true; b.s.held.push(l);
    sim.cue(b, 'spin', { x: from.x, y: from.y, x2: to.x, y2: to.y });
    return l;
  }
  function dropHeld(b) { for (const l of b.s.held) l.data.held = false; b.s.held.length = 0; }
  function startRun(sim, b, legs) {
    const s = b.s; s.mode = 'run'; s.t = 0; s.legs = legs; b.pose = 'run'; b.softOpen[0] = false;
    s.goal = (s.at + sim.pick([-2, -1, 1, 2]) + RIM.length) % RIM.length;
  }
  function fall(sim, b) {
    const s = b.s; if (s.mode === 'fall' || b.stun > 0) return;
    dropHeld(b); s.mode = 'fall'; s.t = 0; s.fy = Math.max(6.5, b.y - 3.5); b.pose = 'fall'; b.softOpen[0] = true;
    sim.cue(b, 'fall', { x: b.x, y: b.y });
  }

  const script = {
    def: {
      hp: 5600, stunTime: 4.5, frayAt: 0.2, armour: 0.2, cell: 0.2, halfW: 2.4, halfH: 1.6, softY: -0.3,
      soft: [{ x: 0, r: 0.75 }], softName: 'Her body, while she stops to spin',
      phases: ['She runs along her web and builds it across your half. Cut the line she is spinning on and she falls.', 'She cocoons your bobbin: shoot it free. Moths you destroy are strung back up once.', 'She wraps herself in the centre and spins storms of silk. Her web catches them, so cut only what you must.'],
      phaseTag: ['Her web', 'Cocoons and puppets', 'Silk storm']
    },
    init(sim, b) {
      const s = b.s;
      b.pose = 'run'; b.softOpen = [false];
      s.rim = RIM.map((q, i) => sim.addProp({ kind: 'anchor', shape: 'circle', x: q[0], y: q[1], r: 0.45, block: false, data: { rim: true, n: i } }));
      for (let i = 0; i + 1 < s.rim.length; i++) { const l = line(sim, s.rim[i], s.rim[i + 1]); l.data.rim = true; l.cut = false; l.slow = 0; }
      s.at = 3; b.x = RIM[3][0]; b.y = RIM[3][1] - 0.6;
      s.held = []; s.tmp = []; s.puppets = []; s.cocoon = null; s.mode = 'run'; s.t = 0; s.legs = 1; s.goal = 3; s.spins = 0; s.fy = 0;
    },
    enter() {},      // the entrance film leaves her where init put her
    onPhase(sim, b, ph) {
      if (ph === 3) { const s = b.s; dropHeld(b); if (b.stun <= 0 && s.mode !== 'fall') { s.mode = 'climb'; b.pose = 'climb'; s.t = 0; } }
    },
    onStun(sim, b) { b.pose = 'fallen'; b.softOpen[0] = true; b.s.mode = 'stunned'; dropHeld(b); },
    onRecover(sim, b) { const s = b.s; s.mode = 'climb'; s.t = 0; b.pose = 'climb'; b.softOpen[0] = false; },
    onProp(sim, b, p, why) {
      const s = b.s;
      if (p.kind === 'anchor' && why === 'destroyed') {
        let wasHeld = false;
        for (const l of sim.props.slice()) if (l.kind === 'webline' && (l.data.a === p.id || l.data.b === p.id)) { if (l.data.held) wasHeld = true; sim.removeProp(l); const i = s.held.indexOf(l); if (i >= 0) s.held.splice(i, 1); }
        sim.cue(b, 'snapline', { x: p.x, y: p.y });
        if (wasHeld) fall(sim, b);
      } else if (p.kind === 'webline' && why === 'cut') {
        sim.cue(b, 'snapline', { x: sim.player.x, y: sim.player.y });
        const i = s.held.indexOf(p); if (i >= 0) { s.held.splice(i, 1); fall(sim, b); }
      } else if (p === s.cocoon && why === 'destroyed') { s.cocoon = null; sim.cue(b, 'free', { x: p.x, y: p.y }); }
    },
    onKill(sim, b, e) {
      if (b.phase < 2 || e.puppet || b.s.puppets.length >= 4) return;
      const top = H + 0.5;
      const l = sim.addProp({ kind: 'puppetline', shape: 'seg', x: e.x, y: top, x2: e.x, y2: e.y, w: 0.08, warn: 0.8, block: false, data: {} });
      b.s.puppets.push({ line: l, e: null, type: e.type, x: e.x, y: Math.max(e.y, 5) });
      sim.cue(b, 'puppet', { x: e.x, y: e.y });
    },
    update(sim, b, dt) {
      const s = b.s, pl = sim.player, ph = b.phase;
      s.t += dt;

      // ---- marionettes: the string comes down, then the moth is strung back up and hangs from it ----
      for (let i = s.puppets.length - 1; i >= 0; i--) {
        const q = s.puppets[i];
        if (!q.e) { if (q.line.warn <= 0) { q.e = sim.spawnAt(q.type, q.x, q.y, { passes: 0, puppet: true }); } continue; }
        if (q.e.dead || sim.enemies.indexOf(q.e) < 0) { sim.removeProp(q.line); s.puppets.splice(i, 1); continue; }
        q.line.x = q.e.x; q.line.x2 = q.e.x; q.line.y2 = q.e.y;
      }
      // ---- the stolen bobbin: the outline, then the catch, then she hoists it above the ship ----
      const c = s.cocoon;
      if (c) {
        if (!c.data.caught) {
          if (c.warn <= 0) {
            const bs = sim.bobbins();
            if (bs.length && !sim.bobbinLock && Math.hypot(bs[0].x - c.x, bs[0].y - c.y) < c.r + 0.35) {
              c.data.caught = true; c.shoot = true; sim.bobbinLock = c; c.data.hx = clamp(pl.x + (pl.x > b.x ? 2.6 : -2.6), -6, 6); c.data.hy = PY + T.roam + 1.6;
              if (Math.abs(c.data.hx - b.x) < 1.6) c.data.hx = clamp(b.x + (c.data.hx >= b.x ? 2.8 : -2.8), -6, 6);
            } else { sim.removeProp(c); s.cocoon = null; }
          }
        } else if (sim.bobbinLock === c) {
          const k = Math.min(1, dt * 2.5); c.x += (c.data.hx - c.x) * k; c.y += (c.data.hy - c.y) * k; c.data.hoist = Math.min(1, (c.data.hoist || 0) + dt);
          pl.bx = c.x; pl.by = c.y;   // the bobbin is held inside the cocoon
        }
      }
      if (ph >= 2 && !s.cocoon && !sim.bobbinLock && sim.secondThread() && sim.every(b, 'cocoon', ph === 2 ? 9 : 12)) {
        const bb = sim.bobbins()[0];
        s.cocoon = sim.addProp({ kind: 'cocoon', shape: 'circle', x: bb.x, y: bb.y, r: 0.6, warn: 0.9, hp: 16, shoot: false, data: { caught: false, hoist: 0 } });
        sim.cue(b, 'cocoon', { x: bb.x, y: bb.y });
      }
      if (ph === 2 && sim.every(b, 'call', 7) && sim.enemies.length < 6) {
        for (const sd of [-1, 1]) sim.spawnAt(sim.pick(['nibbler', 'casebearer']), clamp(b.x + sd * 2.5, -6, 6), H + 0.5, { passes: 0 });
      }
      // ---- the ring storm is caught by her own web (phase 3) ----
      if (ph === 3) {
        for (let i = sim.eshots.length - 1; i >= 0; i--) {
          const e = sim.eshots[i]; if (!e.web) continue;
          for (const l of sim.props) {
            if (l.kind !== 'webline' || l.warn > 0) continue;
            const vx = l.x2 - l.x, vy = l.y2 - l.y, ll = vx * vx + vy * vy || 1, u = clamp(((e.x - l.x) * vx + (e.y - l.y) * vy) / ll, 0, 1);
            if (Math.abs(e.x - l.x - vx * u) + Math.abs(e.y - l.y - vy * u) < 0.25) { sim.eshots.splice(i, 1); break; }
          }
        }
      }

      switch (s.mode) {
        case 'run': {
          const g = RIM[s.goal], gx = g[0], gy = g[1] - 0.6, dx = gx - b.x, dy = gy - b.y, dd = Math.hypot(dx, dy), st = 11 * dt;
          if (dd > st) { b.x += dx / dd * st; b.y += dy / dd * st; break; }
          b.x = gx; b.y = gy; s.at = s.goal;
          if (ph >= 3) { s.mode = 'climb'; break; }
          if (--s.legs > 0) { s.goal = (s.at + sim.pick([-1, 1, 2, -2]) + RIM.length) % RIM.length; break; }
          s.mode = 'spin'; s.t = 0; b.pose = 'spin'; b.softOpen[0] = true; s.spins++;
          holdLine(sim, b, s.rim[s.at], lowerAnchor(sim, b, 0));
          break;
        }
        case 'spin': {
          if (s.t > 0.6 && sim.every(b, 'silk', ph === 1 ? 0.7 : 0.9)) sim.eshot('silk', b.x + sim.rr(-1.2, 1.2), b.y - 1, 0, -4.2);
          if (s.t > 0.6 && sim.every(b, 'aimed', 2.2)) sim.aim(b.x, b.y - 1, 5.5);
          if (s.t >= 2.4) { dropHeld(b); startRun(sim, b, sim.pick([2, 3, 3])); }
          break;
        }
        case 'fall': {
          b.y += (s.fy - b.y) * Math.min(1, dt * 8);
          if (s.t >= 0.4) sim.stunBoss();
          break;
        }
        case 'climb': {      // back up to the rim, or (phase 3) to the centre of her web
          const cx = ph >= 3 ? 0 : RIM[s.at][0], cy = ph >= 3 ? CENTRE_Y : RIM[s.at][1] - 0.6;
          const dx = cx - b.x, dy = cy - b.y, dd = Math.hypot(dx, dy), st = 7 * dt;
          if (dd > st) { b.x += dx / dd * st; b.y += dy / dd * st; break; }
          b.x = cx; b.y = cy;
          if (ph >= 3) {
            s.mode = 'cocoon'; s.t = 0; b.pose = 'cocoon'; b.softOpen[0] = false;
            const hang = sim.addProp({ kind: 'anchor', shape: 'circle', x: b.x, y: b.y + 1, r: 0.45, block: false, data: { rim: true, n: -1 } });
            if (s.hub) sim.removeProp(s.hub); s.hub = hang;
            holdLine(sim, b, hang, lowerAnchor(sim, b, -1));
            holdLine(sim, b, hang, lowerAnchor(sim, b, 1));
          } else startRun(sim, b, 1);
          break;
        }
        case 'cocoon': {     // phase 3: storm, peek, storm
          if (b.pose === 'cocoon' && s.t >= 1.1) { b.pose = 'storm'; s.t = 0; sim.cue(b, 'storm', { x: b.x, y: b.y }); }
          else if (b.pose === 'storm' && s.t >= 0.7) {
            const n = 16, ph0 = sim.rand() * Math.PI;
            for (let k = 0; k < n; k++) { const a = ph0 + k / n * Math.PI * 2; sim.eshot('silk', b.x, b.y, Math.cos(a) * 3.8, Math.sin(a) * 3.8 - 1.0, { web: true }); }
            b.pose = 'peek'; b.softOpen[0] = true; s.t = 0;
          } else if (b.pose === 'peek' && s.t >= 1.5) { b.pose = 'cocoon'; b.softOpen[0] = false; s.t = 0; }
          if (s.held.length === 0 && s.mode === 'cocoon') {   // both lines gone (one was shot with its anchor): re-spin them
            holdLine(sim, b, s.hub, lowerAnchor(sim, b, -1)); holdLine(sim, b, s.hub, lowerAnchor(sim, b, 1));
          }
          break;
        }
      }
    }
  };
  ST.registerBoss('empress', script);
})();
