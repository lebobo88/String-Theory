/* The Carpet Beetle: "the roller". Boss 6. Teaches baiting.
   It fights on the cloth, in the ship's space. It tucks into its shell and charges in straight lines that are drawn on the cloth
   first (the lane follows the ship until it locks, 0.45 s before the roll), bouncing off the frame like a billiard ball.
   The shell bounces shots back. Matador: stand in front of a rail so the lane ends just behind you, stay in the lane until it is
   close, then dash (or slip) out. It hits the rail at full speed, tumbles back and lies on its back with its head open (stun).
   Leave the lane early and it sees the rail and bounces off it instead. Between charges it stands, rears and spits; its head
   is open then too, but only for a moment. Phase 2: larvae crawl out and leave bristle trails that stay on the cloth and hurt.
   Phase 3: it burrows, a lump travels under the cloth to the ship and it erupts there after a warning, then charges twice, faster.

   PROPS
     lane     seg w 2.6. The drawn path of a charge, one prop per straight run between rails (always warn, never hurts).
              data.n = order along the path (0 first), data.lock true once it can no longer turn, data.bait true on the first
              run when the ship is close enough to its rail for the matador slam.
     larva    circle r 0.4, sprite 'larva', shootable (hp), hurts on touch. Crawls about the ship's zone laying bristles.
     bristle  seg w 0.3, warn 0.5 then hurts, life 8. A larva's trail.
     lump     circle r 1.0. The bulge under the cloth while it burrows (never hurts).
     erupt    circle r 1.6, warn 1.0 then hurts for 0.35 s. Where it will burst out.
   POSES (b.pose)
     'walk'     walking to a new spot (shell toward you, head shut)
     'stand'    standing, head up (weak spot open)
     'rear'     0.6 s wind-up before it spits a spread (weak spot open)
     'tuck'     curled into its shell, aiming a charge (shots bounce back)
     'roll'     rolling along a lane (shots bounce back, touching it hurts)
     'tumble'   knocked back off a rail, turning over
     'flipped'  on its back after a slam (stunned, head open)
     'burrow'   under the cloth (b.hidden)
     'erupt'    bursting up out of the cloth
   CUES
     aim      it tucks in and draws its lane ({ x, y } = the beetle)
     lock     the lane stops following the ship; the roll is 0.45 s away
     bounce   it hits a rail and bounces off ({ x, y } = the impact)
     slam     baited: it hits the rail at full speed and flips onto its back ({ x, y } = the impact)
     rear     wind-up before a spread of shots
     larvae   larvae crawl out of its shell
     burrow   it digs under the cloth
     erupt    the warning circle where it will burst out appears ({ x, y } = the circle) */
(function () {
  'use strict';
  const C = ST.content, F = ST.FIELD, PAL = C.PAL, HW = F.HW, H = F.H, PY = F.PY, BOT = F.BOT, T = C.TUNING;
  const R = 1.3, XMIN = -HW + R, XMAX = HW - R, YMIN = BOT + R, YMAX = H - R - 0.6, MAXSEG = 4;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const segDist = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, ll = vx * vx + vy * vy || 1, u = clamp(((px - x1) * vx + (py - y1) * vy) / ll, 0, 1); return Math.hypot(px - x1 - vx * u, py - y1 - vy * u); };

  /* The billiard path from (x, y) along (dx, dy): writes the corner points into s.px / s.py, returns the point count.
     nRails = rails it touches; the last run stops `tail` of the way to the next rail. */
  function plan(s, x, y, dx, dy, nRails, tail) {
    const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
    s.px[0] = x; s.py[0] = y; let n = 1;
    for (let k = 0; k <= nRails && n <= MAXSEG; k++) {
      const tx = dx > 1e-6 ? (XMAX - x) / dx : dx < -1e-6 ? (XMIN - x) / dx : 1e9;
      const ty = dy > 1e-6 ? (YMAX - y) / dy : dy < -1e-6 ? (YMIN - y) / dy : 1e9;
      let t = Math.max(0, Math.min(tx, ty));
      if (k === nRails) t *= tail;
      x += dx * t; y += dy * t; s.px[n] = x; s.py[n] = y; n++;
      if (tx < ty) dx = -dx; else dy = -dy;
    }
    return n;
  }
  function clearLanes(sim, s) { for (const p of s.lanes) sim.removeProp(p); s.lanes.length = 0; }
  function drawLanes(sim, s, n) {
    while (s.lanes.length < n - 1) s.lanes.push(sim.addProp({ kind: 'lane', shape: 'seg', x: 0, y: 0, x2: 0, y2: 0, w: 2.6, warn: 1e9, block: false, data: { n: s.lanes.length, lock: false, bait: false } }));
    while (s.lanes.length > n - 1) sim.removeProp(s.lanes.pop());
    for (let i = 0; i < s.lanes.length; i++) { const p = s.lanes[i]; p.x = s.px[i]; p.y = s.py[i]; p.x2 = s.px[i + 1]; p.y2 = s.py[i + 1]; p.data.n = i; }
  }
  function aimAt(sim, b) {
    const s = b.s, pl = sim.player; let dx = pl.x - b.x, dy = pl.y + 0.2 - b.y;
    if (Math.hypot(dx, dy) < 1) { dx = 0; dy = -1; }
    s.n = plan(s, b.x, b.y, dx, dy, s.rails, s.tail);
    drawLanes(sim, s, s.n);
  }
  function startCharge(sim, b, quick) {
    const s = b.s;
    s.mode = 'aim'; s.t = 0; s.aimT = quick ? 0.75 : 1.0; s.speed = quick ? 17 : b.phase >= 2 ? 15 : 13.5;
    s.rails = b.phase >= 2 ? 2 : 2; s.tail = 0.45;
    s.bait = false; s.late = false; s.gored = false; s.locked = false;
    b.pose = 'tuck'; b.softOpen[0] = false;
    b.x = clamp(b.x, XMIN, XMAX); b.y = clamp(b.y, YMIN, YMAX);
    aimAt(sim, b);
    sim.cue(b, 'aim', { x: b.x, y: b.y });
  }
  function startStand(sim, b) {
    const s = b.s; b.contact = false; clearLanes(sim, s);
    s.mode = 'walk'; s.t = 0; b.pose = 'walk'; b.softOpen[0] = false;
    s.wx = clamp(b.x * 0.4 + sim.rr(-4, 4), -5, 5); s.wy = sim.rr(6.5, 11);
    if (b.phase >= 2 && s.larvaCD <= 0) {
      s.larvaCD = b.phase >= 3 ? 2 : 1;
      let alive = 0; for (const p of sim.props) if (p.kind === 'larva') alive++;
      for (let k = 0; k < 2 && alive < 4; k++, alive++) {
        const p = sim.addProp({ kind: 'larva', shape: 'circle', x: b.x + (k ? 0.6 : -0.6), y: b.y - 0.4, r: 0.4, hp: 9, shoot: true, hurt: true, life: 8, sprite: 'larva', data: { lx: 0, ly: 0, tx: 0, ty: 0 } });
        p.data.lx = p.x; p.data.ly = p.y; larvaTarget(sim, p);
      }
      sim.cue(b, 'larvae', { x: b.x, y: b.y });
    } else if (s.larvaCD > 0) s.larvaCD--;
  }
  function larvaTarget(sim, p) { p.data.tx = sim.rr(-6, 6); p.data.ty = sim.rr(PY + sim.arena.floor + 0.4, PY + T.roam - 0.4); }

  const script = {
    def: {
      hp: 3700, stunTime: 3.2, frayAt: 0.2, armour: 0.35, cell: 0.17, halfW: 1.7, halfH: 1.25, softY: 0.9,
      soft: [{ x: 0, r: 0.7 }], softName: 'Its head, open when it stands or lies on its back',
      phases: ['It tucks into its shell and charges, bouncing off the frame. Wait in front of a rail and dodge at the last moment.', 'Its larvae crawl out and leave bristle trails that stay on the cloth.', 'It burrows under the cloth, bursts out beneath you and charges twice.'],
      phaseTag: ['The charge', 'Larvae crawl out', 'It burrows']
    },
    sprites: {
      larva: { w: 7, h: 5, pal: { A: PAL.tan, B: PAL.brown, D: PAL.darkBrown }, rows: ['.D.D.D.', 'DAAAAAB', 'ABABABA', 'DAAAAAB', '.D.D.D.'] }
    },
    init(sim, b) {
      b.x = 0; b.y = b.def.move[2] - 2; b.pose = 'stand'; b.softOpen = [false];
      const s = b.s;
      s.px = new Array(MAXSEG + 2).fill(0); s.py = new Array(MAXSEG + 2).fill(0); s.n = 0; s.seg = 0;
      s.lanes = []; s.mode = 'walk'; s.t = 0; s.wx = 0; s.wy = 11; s.larvaCD = 0; s.double = 0; s.cycle = 0;
      s.lump = null; s.erupt = null; s.tx = 0; s.ty = 0;
    },
    enter() {},      // the entrance film leaves it where init put it
    onPhase(sim, b, ph) { if (ph >= 2) b.s.larvaCD = 0; },
    onStun(sim, b) { b.contact = false; b.pose = 'flipped'; b.softOpen[0] = true; clearLanes(sim, b.s); b.s.mode = 'stunned'; },
    onRecover(sim, b) { startStand(sim, b); },
    onDamage(sim, b, dmg, x) {
      const m = b.s.mode;
      if (m === 'aim' || m === 'roll') return sim.eshots.length < 24 ? 'reflect' : 0;
      return undefined;
    },
    update(sim, b, dt) {
      const s = b.s, pl = sim.player, ph = b.phase;
      s.t += dt;
      // larvae crawl and lay their bristles
      for (const p of sim.props) {
        if (p.kind !== 'larva') continue;
        const d = p.data, dx = d.tx - p.x, dy = d.ty - p.y, dd = Math.hypot(dx, dy), sp = 1.6 * dt;
        if (dd < 0.2) larvaTarget(sim, p); else { p.x += dx / dd * Math.min(dd, sp); p.y += dy / dd * Math.min(dd, sp); }
        if (Math.hypot(p.x - d.lx, p.y - d.ly) > 1.0) {
          sim.addProp({ kind: 'bristle', shape: 'seg', x: d.lx, y: d.ly, x2: p.x, y2: p.y, w: 0.3, warn: 0.5, life: 8, hurt: true, block: false });
          d.lx = p.x; d.ly = p.y;
        }
      }

      switch (s.mode) {
        case 'walk': {
          const dx = s.wx - b.x, dy = s.wy - b.y, dd = Math.hypot(dx, dy);
          if (dd < 0.15) { s.mode = 'stand'; s.t = 0; b.pose = 'stand'; b.softOpen[0] = true; }
          else { const st = Math.min(dd, 5 * dt); b.x += dx / dd * st; b.y += dy / dd * st; }
          break;
        }
        case 'stand': {      // head up for a moment, then rears and spits, then the next charge or burrow
          if (b.pose === 'stand' && s.t > 0.9) { b.pose = 'rear'; s.t = 0; sim.cue(b, 'rear', { x: b.x, y: b.y }); }
          else if (b.pose === 'rear' && s.t >= 0.6) {
            sim.fanShots(b.x, b.y - 1, ph >= 2 ? 7 : 5, 1.2, 5.2, 'frass');
            if (ph >= 2) sim.aim(b.x, b.y - 1, 6);
            b.pose = 'stand'; s.mode = 'after'; s.t = 0;
          }
          break;
        }
        case 'after': {
          if (s.t < 0.5 / (sim.mode.fire || 1)) break;
          b.softOpen[0] = false; s.cycle++;
          if (ph >= 3 && s.cycle % 2 === 1) {
            s.mode = 'burrow'; s.t = 0; b.hidden = true; b.pose = 'burrow';
            s.lump = sim.addProp({ kind: 'lump', shape: 'circle', x: b.x, y: b.y, r: 1.0, block: false });
            sim.cue(b, 'burrow', { x: b.x, y: b.y });
          } else startCharge(sim, b, false);
          break;
        }
        case 'aim': {
          if (!s.locked) aimAt(sim, b);
          if (!s.locked && s.t >= s.aimT - 0.45) {
            s.locked = true;
            // bait: the ship stands in the lane, close to the rail the lane ends on
            const ex = s.px[1], ey = s.py[1];
            s.bait = segDist(pl.x, pl.y + 0.2, s.px[0], s.py[0], ex, ey) < 1.4 && Math.hypot(pl.x - ex, pl.y + 0.2 - ey) < 3.8;
            for (const p of s.lanes) p.data.lock = true;
            if (s.lanes[0]) s.lanes[0].data.bait = s.bait;
            sim.cue(b, 'lock', { x: b.x, y: b.y });
          }
          if (s.t >= s.aimT) { s.mode = 'roll'; s.t = 0; s.seg = 0; b.pose = 'roll'; b.contact = true; }
          break;
        }
        case 'roll': {
          let move = s.speed * dt;
          while (move > 0 && s.mode === 'roll') {
            const tx = s.px[s.seg + 1], ty = s.py[s.seg + 1], dx = tx - b.x, dy = ty - b.y, dd = Math.hypot(dx, dy);
            if (s.seg === 0) {
              // the matador: still in the lane when it is close, then out of its way
              const near = Math.hypot(pl.x - b.x, pl.y + 0.2 - b.y);
              if (near < 3.6 && segDist(pl.x, pl.y + 0.2, b.x, b.y, tx, ty) < 1.4) s.late = true;
              if (Math.abs(pl.x - b.x) < b.def.halfW * 0.8 + sim.d.radius && Math.abs(pl.y + 0.2 - b.y) < b.def.halfH * 0.8 + sim.d.radius && pl.dashT <= 0) s.gored = true;
            }
            if (dd > move) { b.x += dx / dd * move; b.y += dy / dd * move; move = 0; break; }
            b.x = tx; b.y = ty; move -= dd;
            if (s.lanes.length) sim.removeProp(s.lanes.shift());
            s.seg++;
            if (s.seg === 1 && s.bait && s.late && !s.gored) {   // slam: tumbles back off the rail, onto its back
              sim.cue(b, 'slam', { x: b.x, y: b.y });
              clearLanes(sim, s); b.contact = false;
              const bx = s.px[0] - b.x, by = s.py[0] - b.y, bd = Math.hypot(bx, by) || 1;
              s.tx = clamp(b.x + bx / bd * 3.5, XMIN, XMAX); s.ty = clamp(Math.max(b.y + by / bd * 3.5, pl.y + 3, 2.5), YMIN, YMAX);
              s.mode = 'tumble'; s.t = 0; b.pose = 'tumble'; b.softOpen[0] = true;
              break;
            }
            if (s.seg >= s.n - 1) {      // end of the path: unrolls
              if (s.double > 0) { s.double--; startCharge(sim, b, true); }
              else startStand(sim, b);
              break;
            }
            sim.cue(b, 'bounce', { x: b.x, y: b.y });
          }
          break;
        }
        case 'tumble': {
          const k = Math.min(1, dt * 9); b.x += (s.tx - b.x) * k; b.y += (s.ty - b.y) * k;
          if (s.t >= 0.4) { s.double = 0; sim.stunBoss(b.def.stunTime); }
          break;
        }
        case 'burrow': {     // the lump follows the ship, stops, and the warning circle appears under it
          const L = s.lump, dx = pl.x - L.x, dy = pl.y + 0.2 - L.y, dd = Math.hypot(dx, dy), st = Math.min(dd, 5.5 * dt);
          if (s.t < 2.4) { if (dd > 0.01) { L.x += dx / dd * st; L.y += dy / dd * st; } b.x = L.x; b.y = L.y; }
          else if (!s.erupt) {
            s.erupt = sim.addProp({ kind: 'erupt', shape: 'circle', x: L.x, y: L.y, r: 1.6, warn: 1.0, life: 0.35, hurt: true, block: false });
            sim.cue(b, 'erupt', { x: L.x, y: L.y });
          } else if (s.erupt.warn <= 0) {
            b.x = clamp(s.erupt.x, XMIN, XMAX); b.y = clamp(Math.max(s.erupt.y, PY + 1.5), YMIN, YMAX);
            sim.removeProp(s.lump); s.lump = null; s.erupt = null;
            b.hidden = false; b.pose = 'erupt';
            s.mode = 'emerge'; s.t = 0;
          }
          break;
        }
        case 'emerge': {
          if (s.t >= 0.5) { s.double = 1; startCharge(sim, b, true); }
          break;
        }
      }
    }
  };
  ST.registerBoss('beetle', script);
})();
