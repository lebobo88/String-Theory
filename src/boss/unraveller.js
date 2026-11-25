/* The Unraveller: "the mouth". Boss 5. Teaches fighting while you lose ground.
   The body never moves from the top of the cloth. Two hook arms roam the cloth on their own; one at a time they wind up and
   lunge at the ship. A hook that catches it reels the ship toward the mouth: dash to snap the line and the mouth gags open
   (the best damage window). Hold on too long and it bites. From phase 2 the cloth unravels from the bottom of your zone
   (sim.arena.floor rises) and every hit on the open mouth sews some of it back. In phase 3 it breathes in, dragging the ship,
   coins and shots toward the open mouth; a Knot Bomb blast or a special fired under the mouth while it inhales chokes it (stun).

   PROPS
     hook      circle r 0.55, sprite 'hook'. A roaming hook arm. Never hurts, never blocks shots.
               data.arm 0|1 (left or right arm), data.aim true during the 0.8 s wind-up before a lunge (draw it glinting),
               data.lunge true while it flies at the ship, data.snag true while it holds the ship,
               data.ax, data.ay: where the arm joins the body (draw the arm from there to the hook).
     snagline  seg w 0.2, cut. The line from the hook to the ship while snagged; a dash snaps it. data.hook = hook prop id.
               (x, y) is the hook end, (x2, y2) the ship end; both move every frame.
   POSES (b.pose)
     'shut'    mouth closed (weak spot shut)
     'open'    mouth open (weak spot open)
     'spit'    0.6 s wind-up before a spread, mouth opening (weak spot shut)
     'reel'    reeling the ship in, teeth grinding (weak spot shut)
     'gag'     mouth forced wide after its line is snapped (weak spot open)
     'breathe' 1 s wind-up before it inhales (weak spot shut)
     'inhale'  breathing in (weak spot open)
   CUES
     hookaim   a hook winds up to lunge at the ship ({ x, y } = the hook)
     snag      a hook caught the ship and starts reeling ({ x, y } = the ship)
     snap      the player dashed and snapped the line; the mouth gags open
     bite      the ship was reeled in too long and the mouth bit it (costs a shield)
     spit      wind-up before a spread of shots from the mouth
     beam      light beams are about to fill columns
     unravel   a row of cloth comes undone at the bottom of the ship's zone ({ y } = the new edge)
     restitch  hits on the open mouth sewed a row back ({ y } = the new edge)
     inhale    it starts to breathe in
     choke     a bomb or special went down its throat while it inhaled: stunned */
(function () {
  'use strict';
  const C = ST.content, F = ST.FIELD, PAL = C.PAL, PY = F.PY;
  const ROW = 0.55, MAXFLOOR = 3.3, BITE = 2.6;
  const MOUTH_OPEN = [3.2, 3.0, 3.0], MOUTH_SHUT = [1.2, 1.3, 1.3];   // rework: bosses: the mouth is open most of the time; shut is a short moment
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function newHook(sim, b, i) {
    const ax = b.x + (i ? 2.4 : -2.4), ay = b.y - 1.6;
    return sim.addProp({ kind: 'hook', shape: 'circle', x: ax, y: ay, r: 0.55, block: false, sprite: 'hook',
      data: { arm: i, aim: false, lunge: false, snag: false, ax, ay } });
  }
  function hookTarget(sim, h) { h.tx = sim.rr(-5.8, 5.8); h.ty = sim.rr(0.8, 9.5); }
  function setMouth(b, pose) { b.pose = pose; b.softOpen[0] = pose === 'open' || pose === 'gag' || pose === 'inhale'; }

  function releaseSnag(sim, b, why) {
    const s = b.s;
    if (s.line) { if (why !== 'cut') sim.removeProp(s.line); s.line = null; }
    if (s.snag >= 0) { const h = s.hooks[s.snag]; h.p.data.snag = false; h.mode = 'recoil'; h.t = 0; hookTarget(sim, h); s.snag = -1; }
  }

  const script = {
    def: {
      hp: 4800, stunTime: 4.5, frayAt: 0.12, armour: 0.15,
      soft: [{ x: 0, r: 0.9 }], softName: 'Its mouth, only while it is open',
      phases: ['Two hook arms roam the cloth and snag your ship. Dash to snap the line.', 'The cloth unravels under you and light beams fill whole columns. Hits on the open mouth sew it back.', 'It breathes in, dragging your ship, coins and shots toward its mouth. A bomb or special down its throat chokes it.'],
      phaseTag: ['Hooks and mines', 'The cloth unravels', 'It breathes in']
    },
    sprites: {
      hook: { w: 7, h: 8, pal: { A: PAL.steel, B: PAL.steelDark, R: PAL.madder }, rows: [
        '..AAA..', '.A...A.', '.A...A.', '.....A.', '.....A.', '..R..A.', '..RBAA.', '...BB..'] }
    },
    init(sim, b) {
      b.x = 0; b.y = b.def.move[2];
      b.softOpen = [false]; b.pose = 'shut';
      const s = b.s;
      s.hooks = []; s.snag = -1; s.line = null; s.reelT = 0;
      s.mouthT = 2.5; s.gagT = 0; s.spitT = 0; s.stitch = 0;
      s.breath = 0; s.breathT = 0; s.unravelT = 0;
      s.pullO = { x: 0, y: 0, str: 0 }; s.suckO = { x: 0, y: 0, str: 0 };
    },
    enter() {},      // the entrance film leaves it where init put it
    onPhase(sim, b, ph) { if (ph === 2) b.s.unravelT = 2; if (ph === 3) b.s.breathT = 3; },
    onStun(sim, b) {
      releaseSnag(sim, b);
      b.s.breath = 0; b.s.gagT = 0; b.s.spitT = 0;
      for (const h of b.s.hooks) if (h.p) { h.p.data.aim = h.p.data.lunge = false; h.mode = 'recoil'; h.t = 0; }
    },
    onRecover(sim, b) { setMouth(b, 'shut'); b.s.mouthT = 2.2; },
    onProp(sim, b, p, why) {
      if (p === b.s.line && why === 'cut') {   // dashed through the line: the hook recoils and the mouth gags open
        releaseSnag(sim, b, 'cut');
        b.s.gagT = 3.0; b.s.reelT = 0; setMouth(b, 'gag');
        sim.cue(b, 'snap', { x: sim.player.x, y: sim.player.y });
      }
    },
    onDamage(sim, b, dmg, x) {
      if (b.softOpen[0] && Math.abs(x - b.x) < b.def.soft[0].r) {
        b.s.stitch += dmg;
        // every hit on the open mouth sews the lost cloth back: one row per 2.2% of its health
        if (sim.arena.floor > 0 && b.s.stitch >= b.maxHp * 0.022) {
          b.s.stitch = 0; sim.arena.floor = Math.max(0, sim.arena.floor - ROW);
          sim.cue(b, 'restitch', { y: PY + sim.arena.floor });
        }
      }
      return undefined;
    },
    update(sim, b, dt) {
      const s = b.s, pl = sim.player, ph = b.phase, mx = b.x, my = b.y - 1.7;
      b.x = 0; b.y = b.def.move[2] + Math.sin(b.t * 0.9) * 0.15;

      // ---- the hooks ----
      for (let i = 0; i < 2; i++) {
        if (!s.hooks[i]) { s.hooks[i] = { p: newHook(sim, b, i), mode: 'roam', t: 0, tx: 0, ty: 0, lx: 0, ly: 0 }; hookTarget(sim, s.hooks[i]); }
        const h = s.hooks[i], p = h.p; h.t += dt;
        p.data.ax = b.x + (i ? 2.4 : -2.4); p.data.ay = b.y - 1.6;
        if (h.mode === 'roam' || h.mode === 'recoil') {
          const sp = h.mode === 'recoil' ? 6 : 3.2, dx = h.tx - p.x, dy = h.ty - p.y, dd = Math.hypot(dx, dy);
          if (dd < 0.3) { hookTarget(sim, h); if (h.mode === 'recoil') h.mode = 'roam'; }
          else { p.x += dx / dd * Math.min(dd, sp * dt); p.y += dy / dd * Math.min(dd, sp * dt); }
        } else if (h.mode === 'aim') {
          p.x += (pl.x - p.x) * Math.min(1, dt * 0.6); p.y += Math.sin(h.t * 30) * 0.01;
          if (h.t >= 0.8) { h.mode = 'lunge'; h.t = 0; h.lx = pl.x; h.ly = pl.y + 0.2; p.data.aim = false; p.data.lunge = true; }
        } else if (h.mode === 'lunge') {
          const dx = h.lx - p.x, dy = h.ly - p.y, dd = Math.hypot(dx, dy), st = 15 * dt;
          if (dd <= st) { p.x = h.lx; p.y = h.ly; } else { p.x += dx / dd * st; p.y += dy / dd * st; }
          const hit = Math.hypot(pl.x - p.x, pl.y + 0.2 - p.y) < p.r + sim.d.radius + 0.15;
          if (hit && pl.dashT <= 0 && s.snag < 0 && sim.phase === 'play') {
            h.mode = 'snag'; h.t = 0; p.data.lunge = false; p.data.snag = true; s.snag = i; s.reelT = 0; h.lx = p.x; h.ly = p.y;
            s.line = sim.addProp({ kind: 'snagline', shape: 'seg', x: p.x, y: p.y, x2: pl.x, y2: pl.y, w: 0.2, cut: true, block: false, data: { hook: p.id } });
            setMouth(b, 'reel'); sim.cue(b, 'snag', { x: pl.x, y: pl.y });
          } else if (dd <= st || h.t > 2) { h.mode = 'recoil'; h.t = 0; p.data.lunge = false; hookTarget(sim, h); }
        } else if (h.mode === 'snag') {
          // the hook is drawn back toward the mouth, reeling the ship with it
          const k = Math.min(1, h.t / BITE);
          p.x = h.lx + (mx - h.lx) * k * 0.5; p.y = h.ly + (my - h.ly) * k * 0.5;
        }
      }
      if (s.snag >= 0) {
        const h = s.hooks[s.snag];
        s.reelT += dt; setMouth(b, 'reel');
        s.line.x = h.p.x; s.line.y = h.p.y; s.line.x2 = pl.x; s.line.y2 = pl.y;
        const po = s.pullO; po.x = mx; po.y = my; po.str = 4.5; sim.pull = po;
        if (s.reelT >= BITE) {
          sim.cue(b, 'bite', { x: pl.x, y: pl.y }); sim.hurt();
          releaseSnag(sim, b); s.reelT = 0; setMouth(b, 'shut'); s.mouthT = 1.2;
        }
        return;    // while it reels, it does nothing else
      }
      if (sim.every(b, 'lunge', ph === 1 ? 5.0 : ph === 2 ? 6.5 : 8) && s.breath === 0) {
        const free = s.hooks.filter(h => h.mode === 'roam');
        if (free.length) {
          let h = free[0]; for (const q of free) if (Math.hypot(q.p.x - pl.x, q.p.y - pl.y) < Math.hypot(h.p.x - pl.x, h.p.y - pl.y)) h = q;
          h.mode = 'aim'; h.t = 0; h.p.data.aim = true; sim.cue(b, 'hookaim', { x: h.p.x, y: h.p.y });
        }
      }

      // ---- the mouth ----
      if (s.gagT > 0) { s.gagT -= dt; if (s.gagT <= 0) { setMouth(b, 'shut'); s.mouthT = 2.0; } return; }
      if (s.breath === 1) {            // wind-up: breathing in
        s.breathT -= dt;
        if (s.breathT <= 0) { s.breath = 2; s.breathT = 3.6; setMouth(b, 'inhale'); }
        return;
      }
      if (s.breath === 2) {            // inhaling: drags the ship, its shots and coins toward the mouth
        s.breathT -= dt;
        const po = s.pullO, so = s.suckO; po.x = so.x = mx; po.y = so.y = my; po.str = 3.2; so.str = 2.6; sim.pull = po; sim.suck = so;
        for (const e of sim.events) {
          const down = (e.t === 'special' && Math.abs(e.x - mx) < 3) || (e.t === 'burst' && Math.abs(e.x - mx) < 2.2 && e.y > my - 5);
          if (down) { s.breath = 0; sim.cue(b, 'choke', { x: mx, y: my }); sim.stunBoss(5); return; }
        }
        if (s.breathT <= 0) {           // breathes out a wide spray
          s.breath = 0; s.breathT = 7.5; setMouth(b, 'shut'); s.mouthT = 2.4;
          sim.fanShots(mx, my, 9, 1.7, 5.0, 'frass');
        }
        return;
      }
      if (ph === 3) { s.breathT -= dt; if (s.breathT <= 0 && b.pose === 'shut') { s.breath = 1; s.breathT = 1.0; b.pose = 'breathe'; sim.cue(b, 'inhale', { x: mx, y: my }); return; } }

      if (s.spitT > 0) {
        s.spitT -= dt;
        if (s.spitT <= 0) { sim.fanShots(mx, my, ph === 1 ? 5 : 6, 1.1, 5.2, 'frass'); setMouth(b, 'open'); s.mouthT = MOUTH_OPEN[ph - 1]; }
        return;
      }
      s.mouthT -= dt;
      if (s.mouthT <= 0) {
        if (b.pose === 'open') { setMouth(b, 'shut'); s.mouthT = MOUTH_SHUT[ph - 1] / (sim.mode.fire || 1); }
        else { b.pose = 'spit'; s.spitT = 0.6; sim.cue(b, 'spit', { x: mx, y: my }); }
      }

      // ---- mines, beams, and the cloth coming apart ----
      if (sim.every(b, 'mine', ph === 1 ? 2.6 : 3.4)) sim.eshot('knot', sim.rr(-6, 6), my, 0, -1.8, { hang: sim.rr(1.2, 6.5), life: 8 });
      if (ph >= 2 && sim.every(b, 'beam', ph === 2 ? 4.4 : 5.6)) {
        sim.columnHazard(clamp(pl.x, -6, 6), 1.6, 1.0, 1.0, 'glare');
        sim.columnHazard(sim.rr(-6, 6), 1.6, 1.25, 1.0, 'glare');
        sim.emit('glare'); sim.cue(b, 'beam', { x: pl.x, y: pl.y });
      }
      if (ph >= 2) {
        s.unravelT -= dt;
        if (s.unravelT <= 0) {
          s.unravelT = (ph === 2 ? 4.0 : 5.0) / (sim.mode.fire || 1);
          if (sim.arena.floor < MAXFLOOR - 1e-6) { sim.arena.floor = Math.min(MAXFLOOR, sim.arena.floor + ROW); sim.cue(b, 'unravel', { y: PY + sim.arena.floor }); }
        }
      }
    }
  };
  ST.registerBoss('unraveller', script);
})();
