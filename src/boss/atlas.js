/* The Atlas, "the watcher". Boss 4: teaches stillness and position.
   She makes wide, slow sweeps that press down into the middle of the cloth. The gaze: an eyespot on one wing opens (0.8 s of lid
   opening first) and casts a cone of light that slowly turns to follow the ship. Move inside the cone and the eye fires at you;
   hold still (or creep, or dash: the eye cannot follow a dash) and it does not. The open eyespot is her only weak spot
   (b.softOpen), so the place you can hurt her from is the dangerous place to stand; fill the fray meter there for a full stun.
   Wing sweep: a wing drags across one row of your zone (outlined first): go over or under it.
   Phase 2: both eyes open together with crossing cones, and the snake-head wingtips strike diagonally across the cloth.

   PROPS
     cone       cone   the gaze from one eyespot: (x, y) the eye, a = direction, half = half-angle, len = reach. data.eye 0 (left) or 1 (right).
                       data.hot true while the eye is firing at a moving ship. data.open 0..1: the lid opening (cone fades in), then 1.
     wingsweep  row    a wing about to drag across a row: while warn > 0 it is the outline of the whole row; after that x1..x2 is the
                       stretch the wing covers right now (it hurts there), running in direction data.dir (-1 or 1) across the cloth.
     fang       seg    a wingtip strike: (x, y) the wingtip, (x2, y2) where the strike ends, w = width. Outline while warn > 0,
                       then it hurts for 0.3 s. data.wing -1 (left tip) or 1 (right tip).
   POSES   sweep (gliding), open-left, open-right, open-both (lids opening, 0.8 s), gaze-left, gaze-right, gaze-both (looking),
           drag-left, drag-right (that wing pressed down for a sweep), strike-left, strike-right (a wingtip coiled to
           strike; between gazes only, during a gaze the gaze pose wins and the 'strike' cue marks the wing)
   CUES    open     an eyespot starts to open (data.eye 0 | 1 | 2 for both)
           spotted  the eye saw the ship move inside its cone and starts firing (data.eye)
           close    the eyespots close (the weak spot is gone)
           sweep    a wing sweep is outlined on a row (data.y, data.dir)
           drag     the wing starts dragging across the row
           strike   a wingtip strike is outlined (it lands 0.9 s later; data.wing) */
(function () {
  'use strict';
  const C = ST.content, F = ST.FIELD, T = C.TUNING;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const EYE_X = 2.0, EYE_Y = 0.4, TIP_X = 3.6, TIP_Y = -0.6;
  const OPEN_T = 0.8, GAZE = [4.2, 4.0], TRACK = [0.32, 0.4], HALF = 0.27, REACH = 24, FIRE_EVERY = 0.22, MOVE_LIM = 0.25;
  const SWEEP_WARN = 1.1, SWEEP_LIFE = 1.0, WING_W = 4.6, FANG_WARN = 0.9;

  function eyePos(b, i, o) { o.x = b.x + (i ? EYE_X : -EYE_X); o.y = b.y + EYE_Y; return o; }
  const tmp = { x: 0, y: 0 };

  function openEyes(sim, b, which) {
    const s = b.s; s.st = 'open'; s.tm = 0; s.which = which;
    b.pose = which === 2 ? 'open-both' : which ? 'open-right' : 'open-left';
    s.cones.length = 0;
    for (let i = 0; i < 2; i++) {
      if (which !== 2 && which !== i) continue;
      eyePos(b, i, tmp);
      const a = Math.atan2(sim.player.y - tmp.y, sim.player.x - tmp.x);
      s.cones.push(sim.addProp({ kind: 'cone', shape: 'cone', x: tmp.x, y: tmp.y, a, half: HALF, len: REACH, block: false, data: { eye: i, hot: false, open: 0 } }));
    }
    sim.cue(b, 'open', { eye: which });
  }
  function closeEyes(sim, b) {
    const s = b.s;
    for (const c of s.cones) sim.removeProp(c);
    s.cones.length = 0; b.softOpen[0] = false; b.softOpen[1] = false; s.hot = false;
    sim.cue(b, 'close');
  }
  function sweepRow(sim, b) {
    const pl = sim.player, dir = pl.x > b.x ? -1 : 1, y = clamp(pl.y + 0.2, F.PY + 0.2, F.PY + T.roam + 0.1);
    b.s.wing = sim.addProp({ kind: 'wingsweep', shape: 'row', y, h: 1.3, x1: -F.HW - 0.5, x2: F.HW + 0.5, warn: SWEEP_WARN, life: SWEEP_LIFE, hurt: true, block: false, data: { dir, dragging: false } });
    b.s.wingSide = dir; sim.cue(b, 'sweep', { y, dir });
  }
  function strike(sim, b, side) {
    const pl = sim.player, tx = b.x + side * TIP_X, ty = b.y + TIP_Y;
    let dx = pl.x - tx, dy = (pl.y + 0.2) - ty; const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
    const len = (ty - F.BOT + 1) / Math.max(0.3, -dy);
    sim.addProp({ kind: 'fang', shape: 'seg', x: tx, y: ty, x2: tx + dx * len, y2: ty + dy * len, w: 0.9, warn: FANG_WARN, life: 0.3, hurt: true, block: false, data: { wing: side } });
    b.s.striking = 0.9; b.s.strikeSide = side;
    sim.cue(b, 'strike', { wing: side, x: tx, y: ty });
  }

  const script = {
    cues: ['open', 'spotted', 'close', 'sweep', 'drag', 'strike'],
    def: {
      hp: 3300, halfW: 3.3, halfH: 2.0, armour: 0.4, frayAt: 0.08, stunTime: 3.0,
      soft: [{ x: -EYE_X, r: 0.65 }, { x: EYE_X, r: 0.65 }], softName: 'The eyespot on her wing, only while it is open and looking',
      phases: ['One eye at a time watches you; hold still in its light to hurt her', 'Both eyes watch at once and her wingtips strike'],
      phaseTag: ['The watcher', 'Both eyes open']
    },
    init(sim, b) {
      const s = b.s;
      s.ph = 0; s.st = 'rest'; s.tm = 0; s.next = 1.6; s.cones = []; s.which = 0; s.eye = 0; s.hot = false; s.fireT = 0; s.mv = 0;
      s.lx = sim.player.x; s.ly = sim.player.y; s.wing = null; s.wingSide = 1; s.striking = 0; s.strikeSide = 1; s.midStrike = false;
      s.lastEye = 1; s.lateStrike = 0;
      b.softOpen = [false, false]; b.x = 0; b.y = 14.2 - 6.0; b.pose = 'sweep';   // ph 0: low in the middle of the cloth
    },
    enter() {},   // she is where init put her when the entrance ends
    update(sim, b, dt) {
      const s = b.s, pl = sim.player, ph = b.phase;
      // movement: wide slow sweeps, lowest (pressing into the middle of the cloth) as she crosses the centre
      s.ph += dt * 0.3 * (s.st === 'gaze' || s.st === 'open' ? 0.3 : 1);
      const c = Math.cos(s.ph); b.x = 4.2 * Math.sin(s.ph); b.y = 14.2 - 6.0 * c * c;
      // how much has the ship moved lately? (a dash does not count: the eye cannot follow it)
      const step = pl.dashT > 0 ? 0 : Math.hypot(pl.x - s.lx, pl.y - s.ly);
      s.mv = s.mv * Math.exp(-dt / 0.3) + step; s.lx = pl.x; s.ly = pl.y;
      s.tm += dt;
      if (s.striking > 0) s.striking -= dt;
      // the wing sweep runs on its own once outlined
      const w = s.wing;
      if (w) {
        if (sim.props.indexOf(w) < 0) s.wing = null;
        else if (w.t >= w.warn0) {
          if (!w.data.dragging) { w.data.dragging = true; sim.cue(b, 'drag', { y: w.y, dir: w.data.dir }); }
          const u = (w.t - w.warn0) / SWEEP_LIFE, lead = w.data.dir > 0 ? -F.HW - WING_W + u * (F.HW * 2 + WING_W * 2) : F.HW + WING_W - u * (F.HW * 2 + WING_W * 2);
          if (w.data.dir > 0) { w.x2 = lead; w.x1 = lead - WING_W; } else { w.x1 = lead; w.x2 = lead + WING_W; }
        }
      }
      if (s.st === 'rest') {
        b.pose = s.wing ? (s.wingSide > 0 ? 'drag-left' : 'drag-right') : s.striking > 0 ? (s.strikeSide < 0 ? 'strike-left' : 'strike-right') : 'sweep';
        if (s.tm >= s.next) {
          if (ph >= 2) openEyes(sim, b, 2);
          else { s.eye = Math.abs(pl.x - (b.x - EYE_X)) < Math.abs(pl.x - (b.x + EYE_X)) ? 0 : 1; if (s.eye === s.lastEye && sim.rand() < 0.5) s.eye = 1 - s.eye; s.lastEye = s.eye; openEyes(sim, b, s.eye); }
        }
      } else if (s.st === 'open' || s.st === 'gaze') {
        for (const cn of s.cones) {
          eyePos(b, cn.data.eye, tmp); cn.x = tmp.x; cn.y = tmp.y;
          const want = Math.atan2(pl.y + 0.2 - cn.y, pl.x - cn.x); let da = want - cn.a;
          while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          const turn = TRACK[ph - 1] * dt * (s.st === 'open' ? 3 : 1); cn.a += clamp(da, -turn, turn);
          cn.data.open = s.st === 'open' ? s.tm / OPEN_T : 1;
        }
        if (s.st === 'open') {
          if (s.tm >= OPEN_T) {
            s.st = 'gaze'; s.tm = 0; s.midStrike = false;
            for (const cn of s.cones) b.softOpen[cn.data.eye] = true;
            b.pose = s.which === 2 ? 'gaze-both' : s.which ? 'gaze-right' : 'gaze-left';
          }
        } else {
          // the eye fires at a ship that moves inside its light
          let seen = -1;
          for (const cn of s.cones) { const inside = sim.inCone(cn, pl.x, pl.y + 0.2) && s.mv > MOVE_LIM; cn.data.hot = inside; if (inside) seen = cn.data.eye; }
          if (seen >= 0) {
            if (!s.hot) { s.hot = true; s.fireT = 0.12; sim.cue(b, 'spotted', { eye: seen }); }
            s.fireT -= dt;
            if (s.fireT <= 0) { s.fireT = FIRE_EVERY / (sim.mode.fire || 1); eyePos(b, seen, tmp); sim.aim(tmp.x, tmp.y - 0.3, 7); }
          } else s.hot = false;
          if (ph >= 2 && !s.midStrike && s.tm >= 1.6) { s.midStrike = true; strike(sim, b, pl.x < b.x ? -1 : 1); }
          if (s.tm >= GAZE[ph - 1]) {
            closeEyes(sim, b); s.st = 'rest'; s.tm = 0; s.next = (ph >= 2 ? 3.6 : 3.4) / (sim.mode.fire || 1);
            sweepRow(sim, b);
            if (ph >= 2) s.lateStrike = 2.4;
          }
        }
      }
      if (s.lateStrike > 0) { s.lateStrike -= dt; if (s.lateStrike <= 0) strike(sim, b, pl.x < b.x ? 1 : -1); }
    },
    onPhase(sim, b, ph) { if (ph >= 2) b.s.next = Math.min(b.s.next, b.s.tm + 1.0); }
  };
  ST.registerBoss('atlas', script);
})();
