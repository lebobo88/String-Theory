/* Boss bots for the balance harness.
   - "proper" plays the boss's mechanic (dodges its attacks, shoots what it exposes). It is a flawless, never-hit pilot, so its
     times are a floor a good human approaches, not a ceiling.
   - "ignore" just sits under the weak spot and shoots.
   Bosses 1 to 4 use the bots exported by test/boss-a.test.js (kept in step with the bosses by whoever changes them).
   Bosses 5 to 8 are COPIED from test/boss-b.test.js (that file does not export its bots). If a boss rework breaks one of these copies,
   update the copy here; a bot that throws is replaced for that frame by the "ignore" bot and counted in bots.faults. */
'use strict';
const { C } = require('./core.js');
const PY = C.TUNING.playerY;
const faults = {};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const segProj = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, ll = vx * vx + vy * vy || 1, u = clamp(((px - x1) * vx + (py - y1) * vy) / ll, 0, 1); return { x: x1 + vx * u, y: y1 + vy * u, d: Math.hypot(px - x1 - vx * u, py - y1 - vy * u) }; };
const proper = {
  /* Stays under the mouth, dashes the moment a hook snags it, and fires its special down the throat while it inhales. */
  unraveller: () => { let cd = 0; return (sim, f) => {
    const b = sim.boss, pl = sim.player; let dash = 0, special = false;
    if (b) {
      if (sim.props.some(p => p.kind === 'snagline') && f > cd) { dash = pl.x > 0 ? -1 : 1; cd = f + 20; }
      if (b.pose === 'inhale' && pl.sp >= 1) special = true;
    }
    return { targetX: 0, targetY: PY, fire: true, dash, special };
  }; },
  /* The matador: waits on its home row (just in front of the bottom rail) so the lane runs through it, stays in the lane until
     the shell is close, then dashes out of it. Shoots the head whenever it is up. */
  beetle: () => { let side = 0, until = 0; return (sim, f) => {
    const b = sim.boss, pl = sim.player; let dash = 0, tx = b ? b.x : 0;
    if (b && b.s.mode === 'roll' && b.s.seg === 0) {
      const s = b.s, q = segProj(pl.x, pl.y + 0.2, b.x, b.y, s.px[1], s.py[1]), near = Math.hypot(pl.x - b.x, pl.y + 0.2 - b.y);
      if (q.d < 1.8 && near < 2.9 && !side) { side = pl.x - q.x > 0.05 ? 1 : pl.x - q.x < -0.05 ? -1 : (pl.x > 0 ? -1 : 1); if (Math.abs(pl.x + side * 2.5) > 6.3) side = -side; dash = side; until = f + 40; }
    }
    if (side && f < until) tx = pl.x + side * 3; else side = 0;
    return { targetX: clamp(tx, -6.4, 6.4), targetY: PY, fire: true, dash };
  }; },
  /* Shoots the bobbin free when it is cocooned; otherwise goes for the line she hangs from: shoots its lower anchor, and
     dashes through the line whenever it is close. */
  empress: () => { let cd = 0; return (sim, f) => {
    const b = sim.boss, pl = sim.player; let tx = b ? b.x : 0, dash = 0;
    if (b) {
      const held = b.s.held.filter(l => l.warn <= 0);
      if (sim.bobbinLock) tx = sim.bobbinLock.x;
      else if (held.length && b.stun <= 0) {
        const l = held[0], q = segProj(pl.x, pl.y, l.x, l.y, l.x2, l.y2); tx = l.x2;
        if (q.d < 1.0 && f > cd && pl.dashN > 0) { dash = q.x > pl.x ? 1 : -1; cd = f + 30; }
      }
    }
    return { targetX: clamp(tx, -6.4, 6.4), targetY: PY, fire: true, dash };
  }; },
  /* Sits between his eyes (the Double Stitch spread hits both), passes each court test (moves off the leaf's row, shoots
     eggs, the fuse and the web's anchors, holds still in the gaze, dashes the hook, steps out of the lane), waits where his eyes
     gleam in the eclipse and slows time while he shows himself, and breaks the crown jewels in order with a shot it simulates first. */
  king: () => { let cd = 0, holdX = null, px = 0; return (sim, f) => {
    const b = sim.boss, pl = sim.player; if (!b) return { fire: true };
    const vx = (b.x - px) * 60; px = b.x;
    const P = sim.props, s = b.s;
    let tx = b.x + vx * 0.6 - 0.16, ty = PY, dash = 0, fire = true;
    const find = k => P.find(p => p.kind === k);
    const wave = P.find(p => p.kind === 'wave' && p.warn > 0), cone = P.find(p => p.kind === 'cone' && p.warn <= 0), lane = find('lane'), roller = find('roller');
    const egg = find('egg'), fuse = find('fuse'), anchor = P.find(p => p.kind === 'anchor' && p.shoot);
    if (find('snagline') && f > cd) { dash = pl.x > 0 ? -1 : 1; cd = f + 20; }
    if (b.phase === 2 && s.ecl === 1) tx = s.gx - 0.16;
    if (b.phase === 4) tx = b.x + vx * 0.6 - 0.16;
    else if (b.phase === 3 && s.crowned) {
      const nx = s.jewels.find(j => j.data.next && j.warn <= 0);
      if (nx) {   // what would a shot fired straight up from x hit first? 1 the right jewel, -1 a wrong one, 0 the King or nothing
        const shoot = x => { for (let t = 0; t < 1.3; t += 1 / 60) { const y = pl.y + 0.7 + 17 * t;
          for (const j of s.jewels) { if (j.warn > 0) continue; const a = j.data.a + 1.0 * t, jx = b.x + Math.cos(a) * 3.4, jy = b.y + Math.sin(a) * 3.4; if (Math.abs(jx - x) < 0.75 && Math.abs(jy - y) < 0.7) return j === nx ? 1 : -1; }
          if (Math.abs(x - b.x) < b.def.halfW && Math.abs(y - b.y) < b.def.halfH * 0.75) return 0; } return 0; };
        let best = null; for (let x = -6.4; x <= 6.4; x += 0.2) if (shoot(x) === 1 && (best === null || Math.abs(x - pl.x) < Math.abs(best - pl.x))) best = x;
        tx = best === null ? pl.x : best;
        fire = shoot(pl.x) !== -1 && shoot(pl.x - 0.34) !== -1 && shoot(pl.x + 0.34) !== -1 && shoot(pl.bx) !== -1;
      }
    }
    else if (egg) tx = egg.x;
    else if (fuse) tx = fuse.x + (fuse.x2 - fuse.x) * 0.4;
    else if (anchor) tx = anchor.x;
    if (lane && (b.phase === 1 || (roller && Math.hypot(roller.x - pl.x, roller.y - pl.y) < 7))) { const q = segProj(pl.x, pl.y + 0.2, lane.x, lane.y, lane.x2, lane.y2); if (Math.abs(pl.x - q.x) < 2.6) tx = q.x + (q.x > 0 ? -3 : 3); }
    if (wave) ty = Math.abs(wave.y - (pl.y + 0.2)) < 1.2 ? (wave.y > PY + 1.5 ? PY : PY + 3.4) : pl.y;
    if (cone && sim.inCone(cone, pl.x, pl.y + 0.2)) { if (holdX === null) holdX = pl.x; tx = holdX; ty = pl.y; } else holdX = null;
    const focus = (b.phase === 2 && b.pose === 'seen') || b.stun > 0;
    return { targetX: clamp(tx, -6.4, 6.4), targetY: ty, fire, dash, focus };
  }; }
};

const ignore = () => sim => ({ targetX: sim.boss ? sim.boss.x + (sim.boss.def.soft[0] ? sim.boss.def.soft[0].x : 0) : 0, targetY: PY, fire: true });
let A = {};
try { A = require('../boss-a.test.js').BOSSES || {}; } catch (e) { A = {}; }
/* A fresh (sim, frame) -> input function for a boss. kind: 'proper' | 'ignore'. */
function strategy(id, kind) {
  const ig = ignore();
  if (kind === 'ignore') return A[id] && A[id].ignore ? A[id].ignore : ig;
  let inner;
  if (A[id] && A[id].proper) inner = A[id].proper; else if (proper[id]) inner = proper[id](); else return ig;
  return (sim, f) => { try { return inner(sim, f); } catch (e) { faults[id] = (faults[id] || 0) + 1; return ig(sim, f); } };
}
module.exports = { strategy, faults };
