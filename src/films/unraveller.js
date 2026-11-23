/* String Theory — the films of the Unraveller: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.

   Its language, and its alone: speed and pursuit. The camera chases a thread: low over the cloth, carried by what it chases
   (cam.shot splines authored round the subject), with one reverse angle and one whip; the cloth comes apart and goes back
   together under it a row at a time (cloth.rows), dragged by the thread (cloth.pull); loose yarn flies off the edge (ropes).
   Colour: near black, cold steel light, one pale green point where the thread is running, its madder mouth. The two films are
   one shape played forward and back: the entrance unravels the cloth from the hem up to its mouth, the death weaves it back
   from the top down to the hem. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const FH = H - B, DEF = C.KEEPERS.unraveller, BY0 = DEF.move ? DEF.move[2] : 14.4, SOFT = DEF.softY || -1.7;
  function unpickFx(c, x, y, z, rgb) { c.r.curls.emit(x, y, z + 0.2, rnd(-0.8, 0.8), rnd(-2.5, -1), rnd(0.5, 1.5), rnd(0.6, 1), 0.22, rgb, 0.2, rnd(0, 6), rnd(-6, 6), rnd(-4, 4), 7, 2, rnd(0.4, 0.9), 1.2); }

  // ---- its light (linear): a cold steel key, the pale green of a thread running hot, the inside of its mouth
  const STEEL = [0.62, 0.72, 1.0], GREEN = [0.58, 1.0, 0.56], GREEN_HI = [1.3, 2.3, 1.25], GREEN_DIM = [0.1, 0.2, 0.1], MOUTH = [0.5, 1.0, 0.45];
  const VOID = [0.0008, 0.0012, 0.0025];   // what shows where the rows have gone: the dark under the cloth
  const WC = new Float32Array(3);       // a scratch colour
  const ROWC = new Float32Array([0.2, 0.17, 0.12]), ROWC2 = new Float32Array([0.1, 0.1, 0.11]);   // its stage's knit, weft and warp: filled in setup
  const RS = 0.3;                        // the knitted rows, drawn at macro over the cloth, this far apart
  function fabricColours(k) {   // the knit of its own stage (C.PANELS[i].fabric), brightened so the lights can find it
    const T = k.T || (k.r && k.r.T), P = C.PANELS.find(p => p.keeper === 'unraveller'), f = P && P.fabric; if (!T || !f) return;
    const a = new T.Color(f.weft || '#4A4234'), b = new T.Color(f.warp || '#262629');
    ROWC[0] = a.r * 1.7 + 0.015; ROWC[1] = a.g * 1.7 + 0.016; ROWC[2] = a.b * 1.7 + 0.02; ROWC2[0] = b.r * 1.8 + 0.012; ROWC2[1] = b.g * 1.8 + 0.013; ROWC2[2] = b.b * 1.8 + 0.017;
  }
  /* Knitted rows across the cloth between y0 and y1, round xc: what makes the cloth read as knitting when the lens is down on
     it, and what rushes under the lens in a chase. Each row as the lights leave it at its middle (no light, no row). */
  function knitRows(k, y0, y1, xc, hw, z) {
    const j0 = Math.max(0, Math.ceil((y0 - B) / RS - 0.5)), j1 = Math.min(Math.floor((y1 - B) / RS - 0.5), j0 + 44), xa = Math.max(-HW, xc - hw), xb = Math.min(HW, xc + hw);
    if (xb - xa < 0.2) return;
    for (let j = j0; j <= j1; j++) { const y = B + (j + 0.5) * RS, col = k.lit(j & 1 ? ROWC : ROWC2, xc, y, 0.15, 0); if (col[0] + col[1] + col[2] < 0.004) continue;
      k.thread(xa, y, z, xb, y, z, 0.2, col, 1, 1); }
  }

  /* ================================================================================================================
     ENTRANCE "Loose End"   len 7.6 s   key 5.62 (the still)   lights 3
     idea:     one loose thread at the hem is tugged from far away, rips free and runs; we chase it up the cloth at speed while
               the rows come apart under us, and it leads us straight into the mouth that is reeling it in.
     camera:   a chase car. Low over the cloth and carried by the running end (cam.shot splines authored round it): behind it,
               then a reverse angle ahead of it looking back at the collapse, a whip over the top, a push up into the mouth and
               a crash into its throat. Then the play camera's own position, locked off, the lens opening.
     colour:   near black, cold steel, one pale green hot point; its madder mouth.   rhythm: tug, tug, RIP, run (faster and
               faster), knot (slow), run, whip, gulp. Black. Snap.
     handover: into the mouth the picture goes black; under the black, a cut to the play camera's position with it already where
               its script starts it, the cloth whole; its jaws snap shut in a flash of mist, the last of the thread whips up into
               its mouth, its two hooks spring out to where the fight hangs them, and the house lights come up.

     beat      film s       shot (camera, lens)                          what we see                                light                      sound / buzz
     dark      0.0-0.45     black, gate shut                              nothing                                    none                       unraveller_in_sting 0
     tug       0.45-1.55    macro at the hem, low, raking; a slit gate;   a loose linen end lying in the weave; it   a cold key rakes down the  unraveller_tug 0.8, 1.2
                            focus on the end                              jerks taut twice, the weave puckers to it  cloth toward the lens      buzz 0.8, 1.2
     rip       1.55         the same; streak, fringe                      it rips free: the first rows come apart    a pale green point wakes   unraveller_rip 1.55, buzz
     run       1.55-2.78    A: behind it and low, carried by it; the      the end races up the cloth, the thread a   the green point (light 1); unraveller_run 1.6
                            lens opens 32 -> 52; zoom smear by speed      taut line to its mouth far ahead; the       steel key far ahead
                                                                          rows drop away under us; yarn flies up      (light 0); a follow light
     knot      2.78-3.05    A, slow motion 0.22x; fringe, green flash     it rips through a knot: the knot bursts                                  unraveller_knot 2.78, buzz
     back      3.05-3.9     B: CUT to the reverse: ahead of it, flying    the end rushes at us dragging the pucker;  the follow light from      (sting: the hit)
                            backward, looking down the cloth              behind it the rows fall into the dark,      behind us
                                                                          the edge spitting loops of yarn
     whip      3.9-4.22     a whip over the top of the thread             smear                                                                 unraveller_whip 3.9
     mouth     4.22-5.05    C: low under it, looking up; push in, then a  the Unraveller over us, lit from below;    its mouth (light 0), the   unraveller_jaws 4.4
                            crash into its mouth; fringe; exposure to 0   its hooks reel the thread hand over hand;   end (light 1), a steel     unraveller_gulp 5.0
                                                                          the jaws open green; the end goes in        rim from above (light 2)   buzz 4.86
     gulp      5.05-5.35    black, gate wide                              nothing                                    none
     snap      5.35-6.4     CUT under the black to the play camera's      a flash of mist as its jaws snap shut; it  its mouth's glow, fading;  unraveller_snap 5.35
                            position on a longer lens (fov 21), opening   hangs where its script starts it; the last  house lights up 5.9-6.9    buzz 5.35, 5.86
                            to the play lens                              of the thread whips up the cloth into its                              (title 5.62)
                                                                          mouth; its hooks spring out to their places
     out       7.15-7.6     the play camera; gate opens                   the fight
     still (reduced motion): 5.62, the thread whipping up into its lit mouth, under the title, from the play camera's position. */
  const RIP = 1.55, KNOT = 2.78, BACK = 3.05, WHIP = 3.9, SHOTC = 4.22, ARRIVE = 4.86, BLACK = 5.05, CUT = 5.35, SLURP = 5.86, HOOKS = 5.95;
  const PX0 = -3.6, PY0 = -2.1, PY1 = 12.0;                // where the loose end lies, and where the thread meets the mouth
  const NT = 24;                                             // nodes on the pulled thread (rope 0)
  function pathX(s) { return lerp(PX0, 0, s) + 1.15 * Math.sin(s * TAU * 1.3 + 0.4) * Math.sin(PI * s); }
  function pathY(s) { return lerp(PY0, PY1, s); }
  function pathZ(s) { return 0.045 + 0.95 * sm(0.88, 1, s); }
  function sOf(t) { const u = clamp((t - RIP) / (ARRIVE - RIP), 0, 1); return 0.26 * u + 0.74 * u * u; }   // faster and faster
  const KS = sOf(KNOT), KX = pathX(KS), KY = pathY(KS);    // the knot it rips through
  function edgeY(t) {                                        // the last whole row: the collapse chasing the running end
    if (t < RIP) return B - 0.5;
    const raw = pathY(sOf(t - 0.4)) - 0.35;
    return Math.min(9.6, lerp(B - 0.1, Math.max(B - 0.1, raw), sm(RIP, RIP + 0.45, t)));
  }
  const FT = new Float32Array(48 * 5);   // fibres standing up off the weave along the way: x, y, dx, dy, height
  const CURL_T = [1.72, 1.95, 2.18, 2.42, 2.62, 3.12, 3.3, 3.48, 3.66, 3.84, 4.02];
  const HXY = new Float32Array(2);       // a hook's place (scratch)

  function curlFx(k, n) {   // a loose loop of yarn flung up off the unravelling edge (ropes 1..5)
    const t = k.t, ye = edgeY(t), s = clamp((ye - PY0) / (PY1 - PY0), 0, 1), x = clamp(pathX(s) + (hash(n * 7.3) - 0.5) * 4.2, -6.6, 6.6), sd = hash(n * 3.1) < 0.5 ? -1 : 1;
    const rp = k.rope(1 + n % 5); rp.lay(9, x, ye, 0.03, x + sd * 0.9, ye - 0.25, 0.03, 1.05).gravity(0, -6, -22);
    for (let i = 0; i < 9; i++) rp.whip(i, sd * rnd(-0.4, 1.2), 0.8 + i * 0.25, 2.6 + i * 0.35);
    const r = k.r; for (let i = 0, m = r.n(4); i < m; i++) r.curls.emit(x + rnd(-0.6, 0.6), ye, 0.1, rnd(-1, 1), rnd(-0.5, 1.2), rnd(1.2, 3), rnd(0.6, 1), 0.26, i % 2 ? k.K.patch : k.K.mist, 0.1, rnd(0, 6), rnd(-6, 6), rnd(-3, 3), -9, 1.5, 0.5, 1);
  }
  function tugFx(k, a) { const r = k.r, K = k.K; r.lint.emit(PX0, PY0 + 0.1, 0.06, 0, 0.4, 0.6, 0.5, 0.05, K.linen, 0.6, 6, 2, 1.2); for (let i = 0, m = r.n(5); i < m; i++) r.lint.emit(PX0 + rnd(-0.2, 0.2), PY0 + rnd(0, 0.3), 0.05, rnd(-0.3, 0.3), rnd(0.2, 0.8), rnd(0.3, 1.2), rnd(0.5, 0.9), rnd(0.015, 0.035), K.linen, 0.7, 6, 2, 1.2, undefined, rnd(-4, 4), 0); r.shake = Math.max(r.shake, 0.05 + 0.04 * a); }

  const ENTRANCE = {
    kit: true, len: 7.6, key: 5.62, lights: 3,
    sheet: [0.95, 1.28, 1.78, 2.25, 2.86, 3.3, 3.75, 4.08, 4.5, 4.98, 5.62, 6.95],
    beats: {
      dark:  [0, 0.45, 'out'],
      tug:   [0.45, RIP, 'io'],
      run:   [RIP, KNOT, 'lin'],
      knot:  [KNOT, BACK, 'out'],
      back:  [BACK, WHIP, 'lin'],
      whip:  [WHIP, SHOTC, 'io'],
      mouth: [SHOTC, BLACK, 'io'],
      gulp:  [BLACK, CUT, 'lin'],
      snap:  [CUT, 6.4, 'out'],
      out:   [7.15, 7.6, 'io']
    },
    ramp: [[2.72, 1], [2.79, 0.22], [2.99, 0.22], [3.07, 1]],
    /* cam.shot keys, authored round the running end (carried to it with ox, oy, oz): [u, camera x y z, target x y z, roll, fov] */
    shots: {
      chaseA: [[0, 0.3, -1.15, 0.38, -0.05, 1.05, 0.02, 0.03, 32], [0.45, -0.5, -1.55, 0.55, 0.1, 1.35, 0.0, -0.08, 42], [1, 0.35, -1.95, 0.72, 0.0, 1.6, 0.0, 0.07, 52]],
      chaseB: [[0, 0.65, 2.5, 1.5, 0.05, -0.6, 0.0, 0.07, 42], [0.5, -0.15, 2.0, 1.25, 0.0, -0.85, 0.0, -0.03, 48], [1, -0.6, 1.45, 1.05, 0.0, -1.1, 0.0, -0.1, 52]]
    },
    title: { at: 5.62, iv: 0.05, in: 'unrpull', pos: 'low', to: 7.3 },
    css: '.fk-t.i-unrpull .fk-n span.on{animation:unr-pull .5s cubic-bezier(.2,.9,.25,1) both;transform-origin:50% 100%}.fk-t.i-unrpull .fk-rule{border-top-color:#A3AEC6}' +
      '@keyframes unr-pull{0%{opacity:0;transform:translateY(1.6em) scale(.22,2.6);filter:blur(3px);color:#C8F0B8;text-shadow:0 0 .4em rgba(169,192,138,.95)}' +
      '45%{opacity:1;transform:translateY(-.08em) scale(1.06,.9);filter:none;color:#DDF5D2;text-shadow:0 0 .3em rgba(169,192,138,.7)}70%{transform:translateY(.02em) scale(.98,1.03)}100%{transform:none}}',
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the knot's slow
       motion (film 2.72 to 3.07) adds 0.92 s. Film 0.8 / 1.2 (the tugs) and 1.55 (the rip) are real seconds; the knot at film
       2.78 is real 2.81; the reverse at film 3.05 is real 3.96; the whip 4.82; the end going into its mouth 5.78; the black
       5.97; the cut and the snap 6.27; the title 6.54; the end 8.52. */
    music: { name: 'unraveller_in_sting', len: 9.2, gain: 0.9, desc: 'Entrance sting for the Unraveller, a creature that eats cloth by pulling its threads, filmed as a chase. One taut, very quiet high string harmonic from the start; two dry plucked low bass notes at 0.8 and 1.2 s; at 1.55 s a sharp tearing hit and straight into a driving ostinato of low strings and taut percussion at a racing tempo that speeds up as it goes; at 2.81 s everything drops out but one long slowed metallic swell (a bowed cymbal) for 0.9 s; at 3.96 s the ostinato slams back in harder, faster and climbing; a rising whoosh into a hit at 4.82 s; low brass swelling under it; at 5.97 s silence, a held breath; at 6.27 s one huge low hit with a steel clang and a hiss of air; a cold low brass chord with a high glassy string holding over it from 6.5 s, fading out by 9.2 s. Driving, relentless, a little sick. Instrumental' },
    sounds: {
      unraveller_tug:  { at: [0.8, 1.2], len: 0.6, gain: 0.7, desc: 'A single loose thread tugged hard from far away, very close: a dry taut creak of yarn snapping straight against coarse cloth, a little fibrous tick, and a faint low thrum of tension; over by 0.4 s' },
      unraveller_rip:  { at: RIP, len: 1.0, gain: 1, desc: 'A thread ripping free of a woven cloth: a sharp tearing zip for 0.15 s, a hard twang as it snaps taut, then a fast rattle of stitches popping open one after another, fading by 1 s' },
      unraveller_run:  { at: 1.6, len: 3.3, gain: 0.8, desc: 'Knitting unravelling at speed, heard from right beside it: a continuous rasping zip of stitches popping open, rising steadily in pitch and speed for 1.2 s, a short gap from 1.2 to 2.1 s (slow motion elsewhere covers it), then picking up again faster and higher until it cuts at 3.2 s, with the whoosh of rushing air underneath' },
      unraveller_knot: { at: KNOT, len: 1.1, gain: 0.9, desc: 'A hard knot of yarn torn apart, slowed right down: a deep stretched creak building for 0.2 s, a heavy fibrous burst at 0.25 s that echoes, then loose fibres pattering down and a long airy tail that fades by 1.1 s' },
      unraveller_whip: { at: WHIP, len: 0.6, gain: 0.7, desc: 'A camera whip pan past a taut wire: a fast swish of air with a bright metallic zing at its middle, 0.3 s, then a short ringing tail' },
      unraveller_jaws: { at: 4.4, len: 1.2, gain: 0.85, desc: 'Huge jaws made of wood and yarn creaking open: a long low wooden creak for 0.6 s, a wet stretch of thread, and a hollow wind blowing out of a deep throat that rises and is sucked inward at the end' },
      unraveller_gulp: { at: 5.0, len: 0.7, gain: 0.9, desc: 'A great throat swallowing: a deep wet gulp at 0.05 s and a hollow muffled thump, as if heard from inside it, then dead silence' },
      unraveller_snap: { at: CUT, len: 1.6, gain: 1, desc: 'Big jaws snapping shut with a steel clang and a hiss of mist at 0.0 s; a long thread slurped up fast like a noodle from 0.05 to 0.5 s ending in a wet pop; two crisp steel clicks of hooks springing out at 0.6 and 0.66 s; a low creak of wood settling to 1.6 s' }
    },
    buzz: [[0.8, 14], [1.2, 18], [RIP, 30], [KNOT, [30, 20, 60]], [ARRIVE, 24], [CUT, [50, 30, 90]], [SLURP, 16]],
    steps: [
      [0.8, k => tugFx(k, 0)], [1.2, k => tugFx(k, 1)],
      [RIP, k => { const r = k.r, K = k.K; r.shake = Math.max(r.shake, 0.3);
        for (let i = 0, n = r.n(16); i < n; i++) r.lint.emit(PX0 + rnd(-0.3, 0.3), PY0 + rnd(-0.2, 0.2), 0.06, rnd(-1, 1), rnd(-0.6, 0.8), rnd(0.5, 2), rnd(0.6, 1.1), rnd(0.02, 0.05), i % 3 ? K.linen : K.mist, 0.8, 6, 2, 1.3, undefined, rnd(-5, 5), 0);
        for (let i = 0, n = r.n(6); i < n; i++) r.glow.emit(PX0, PY0, 0.08, rnd(-2, 2), rnd(-1, 2.5), rnd(0.5, 2), rnd(0.2, 0.4), rnd(0.04, 0.08), GREEN_HI, 1, 4, 4, 0.4, rnd(0, 6), 0, 5); }],
      [KNOT, k => { const r = k.r, K = k.K; r.shake = Math.max(r.shake, 0.4);
        for (let i = 0, n = r.n(26); i < n; i++) { const a = rnd(0, TAU), sp = rnd(0.6, 2.4); r.lint.emit(KX, KY, 0.12, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.1, 0.8), rnd(0.5, 0.8), rnd(0.02, 0.04), i % 3 ? K.madder : K.linen, 0.85, 6, 1.6, 1.2, undefined, rnd(-4, 4), 0); }
        r.glints(KX, KY, 0.2, 8, GREEN_HI, 2.2, 0.15, 0.35); }],
      [ARRIVE, k => { const r = k.r, c = k.c, my = c.hy + SOFT; r.glints(c.hx, my - 0.3, 1.3, 8, GREEN_HI, 2.4, 0.2, 0.4); r.shake = Math.max(r.shake, 0.2); }],
      [CUT, k => { const r = k.r, c = k.c, K = k.K, my = c.hy + SOFT; r.shake = Math.max(r.shake, 0.4); r.glints(c.hx, my, 1.4, 10, K.steelHi, 3, 0.25, 0.5); r.lintPuff(c.hx, my, 1, 10, K.mist, 1, 2.2); }],
      [SLURP, k => { const r = k.r, c = k.c, K = k.K, my = c.hy + SOFT; r.shake = Math.max(r.shake, 0.18); r.lintPuff(c.hx, my - 0.5, 1, 6, K.linen, 0.7, 1.6); }],
      [HOOKS, k => { const r = k.r, c = k.c, K = k.K; for (let sd = -1; sd <= 1; sd += 2) r.glints(c.hx + sd * 2.4, c.hy - 1.6, 1.1, 6, K.steelHi, 2.6, 0.2, 0.4); }]
    ].concat(CURL_T.map((at, i) => [at, k => curlFx(k, i)])),
    setup(k) {
      k.rope(0).lay(NT, PX0, PY0, 0.05, 0, PY1, 1);
      for (let i = 1; i < 6; i++) k.rope(i);
      for (let i = 0; i < 48; i++) { const o = i * 5, s = (i + 0.5) / 48 * 0.93, a = hash(i * 5.3) * TAU, l = 0.08 + 0.22 * hash(i * 2.9);
        FT[o] = pathX(s) + (hash(i * 1.7) - 0.5) * 3.2; FT[o + 1] = pathY(s) + (hash(i * 3.3) - 0.5) * 0.3; FT[o + 2] = Math.cos(a) * l * 0.5; FT[o + 3] = Math.sin(a) * l * 0.5; FT[o + 4] = l; }
      k.c.acc = 0; k.c.n1 = 0; fabricColours(k);
    },
    frame(k, t, dt) { if (t < BLACK) chase(k, t, dt); else if (t < CUT) gulp(k, t); else reveal(k, t, dt); }
  };

  // ---- before the black: the tug, the chase and the mouth
  function chase(k, t, dt) {
    const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, cl = k.cloth, q = k.q(), lo = k.has.post ? 1 : 0.5, time = r.time;
    const bx = c.hx, by = c.hy, my = by + SOFT, pre = t < RIP, shotA = t >= RIP && t < BACK, shotB = t >= BACK && t < WHIP, shotC = t >= SHOTC;
    // ---- where the running end is
    let s = sOf(t), hx, hy, hz;
    if (pre) { const ta = k.pulse(0.8, 0.05, 0.38), tb = k.pulse(1.2, 0.05, 0.32); s = 0; hx = PX0; hy = PY0 + 0.1 * ta + 0.17 * tb + 0.05 * sm(0.8, 1.5, t); hz = 0.045; }
    else { hx = pathX(s); hy = pathY(s); hz = pathZ(s); }
    const gone = t >= ARRIVE;   // the end is in its mouth
    const ye = edgeY(t);
    if (r.playerGroup) r.playerGroup.visible = false;   // the ship is not in this world (the renderer shows it again itself)

    // ---- the camera first (threads turn to it)
    cam.full(1);
    if (pre) {   // macro on the loose end, low, the weave raking away up the cloth
      const cr = k.ease.io(k.span(0.4, RIP));
      cam.fov = 30; cam.orbit(PX0 + 0.05, PY0 + 0.22, 0.03, cam.fit(1.0, 1.0) * lerp(1.1, 0.94, cr), 1.22, -0.08, -0.03);
      lens.focus(PX0 + 0.02, PY0 + 0.12, 0.06, 2.2, 0.016);
    } else if (shotA) {   // behind it, carried by it
      cam.shot('chaseA', k.span(RIP, BACK), hx, hy, 0).handheld(0.025, 2.6);
      lens.focus(hx, hy + 0.1, hz + 0.04, 1.15, 0.016);
    } else if (shotB) {   // the reverse: ahead of it, flying backward, looking back down the cloth at what is coming apart
      cam.shot('chaseB', k.span(BACK, WHIP), hx, hy, 0).handheld(0.03, 3);
      lens.focus(hx, hy, hz + 0.05, 0.9, 0.015);
    } else if (!shotC) {   // the whip: up and over the thread, round to look up the cloth at it
      cam.shot('chaseB', 1, hx, hy, 0).mark();
      cam.fov = 36; cam.orbit(bx, my + 0.3, 1.0, cam.fit(8.5, 8.5), 1.16, 0, 0.12).mix(k.ease.io(k.span(WHIP, SHOTC)));
      cam.motion(1.2);
    } else {   // under it, looking up; the push; the crash into its mouth
      const pu = k.ease.io(k.span(SHOTC, 4.82)), cr = k.ease.in2(k.span(4.8, BLACK));
      cam.fov = 36; cam.orbit(bx, my + 0.3, 1.0, cam.fit(8.5, 8.5), 1.16, 0, 0.12).mark();
      cam.orbit(bx, my + 0.15, 1.05, cam.fit(3.6, 3.6), 0.86, 0, -0.02).mix(pu);
      cam.dollyZoom(lerp(36, 58, k.ease.in2(k.span(4.35, 4.82))));
      if (cr > 0) { cam.mark(); cam.orbit(bx, my, 1.1, 0.35, 0.3, 0, 0.05, 80).mix(cr); cam.motion(0.8); }
      cam.handheld(0.03 * (1 - cr), 1.6);
      lens.focus(bx, my, 1.0, 0.9, 0.014);
    }

    // ---- light: 0 the steel key (raking at the hem, far ahead in the chase, its mouth at the end); 1 the end, running hot;
    //      2 a follow light that rides with the camera (in the mouth shot a steel rim from above)
    k.dark(1, 1); k.quiet(true, true); k.vig(0.5);
    const hot = pre ? 0 : (0.7 + 0.3 * Math.sin(t * 47) * Math.sin(t * 13)) * (gone ? Math.max(0, 1 - (t - ARRIVE) * 8) : 1) * (1 + 1.6 * k.pulse(RIP, 0.03, 0.3) + 1.4 * k.pulse(KNOT, 0.02, 0.35));
    const mo = shotC ? sm(4.3, 4.75, t) : 0;   // its jaws, opening
    if (pre) k.light(0, PX0 + 0.25, PY0 + 1.9, 0.38, STEEL, 7 * k.ease.out(k.span(0.4, 0.9)) * lo, 3.2);
    else if (shotC) k.light(0, bx, my - 0.2, 1.9, MOUTH, (6 + 26 * mo) * lo, 7);
    else k.light(0, bx, my, 2.4, STEEL, 70 * lo, 19);
    if (hot > 0.01) k.light(1, hx, hy + 0.06, hz + 0.3, GREEN, 1.1 * Math.min(1.6, hot) * lo, 1.7);
    if (shotA) k.light(2, hx - 0.2, hy - 2.4, 1.2, STEEL, 5 * lo, 5);
    else if (shotB || (t >= WHIP && !shotC)) k.light(2, hx + 0.2, hy + 3.4, 1.3, STEEL, 9 * lo, 7.5);
    else if (shotC) k.light(2, bx, H + 0.4, 4.2, STEEL, 60 * lo, 13);
    if (hot > 0.01) k.pool(hx, hy, 0.9, GREEN_DIM, 0.22 * Math.min(1.5, hot));

    // ---- the cloth: creases that catch the raking light, rows gone under the collapse, the weave dragged toward the thread
    cl.crumple(0.045, 0.55, 0);
    if (!pre) { cl.rows(clamp((ye - B) / FH, 0, 1), 1); cl.backing(VOID, 1); if (ye > B + 0.2) for (let i = 0; i < 4; i++) cl.bulge(hx - 4.5 + i * 3, ye + 0.05, 0.75, -0.32); }
    if (pre) { const tg = 0.12 * k.pulse(0.8, 0.05, 0.38) + 0.2 * k.pulse(1.2, 0.05, 0.32); cl.pull(PX0 + 0.05, PY0 + 0.45, 0.02, tg + 0.03, 0.5); }
    else if (!gone) { cl.pull(hx, hy + 0.35, 0, 0.32, 0.7); const s2 = sOf(t - 0.12); cl.pull(pathX(s2), pathY(s2) + 0.2, 0, 0.14, 0.9); }

    // ---- the knitted rows (what rushes under the lens), and the row coming undone at the edge
    { const cy = cam.py, near = Math.max(pre ? B : ye + 0.12, cy - (shotB ? 4.5 : 1.2)), far = shotB ? cy + 0.5 : shotC ? my - 1 : cy + (pre ? 6 : 9);
      if (t < WHIP) knitRows(k, near, far, hx, 4.6, 0.02);
      if (!pre && ye > B) { const ul = k.lit(ROWC, hx, ye + 0.3, 0.2, 0.01); WC[0] = ul[0] * 1.4; WC[1] = ul[1] * 1.4; WC[2] = ul[2] * 1.4;
        k.thread(Math.max(-HW, hx - 6), ye + 0.16, 0.06 + 0.05 * Math.sin(t * 17), Math.min(HW, hx + 6), ye + 0.16, 0.12, 0.13, WC, 1, 9, 0.06); } }
    // ---- the thread: from the running end up the cloth into its mouth, humming taut
    const rp = k.rope(0), buzz = pre ? 0.005 : 0.03 * (1 - mo);
    for (let j = 0; j < NT; j++) {
      const u = j / (NT - 1), sj = s + (1 - s) * u, env = Math.sin(PI * u);
      let x = pathX(sj), y = pathY(sj), z = pathZ(sj);
      if (pre && j === 0) { x = hx; y = hy; }
      if (j === NT - 1) { x = bx; if (shotC) { const ln = lerp(0.95, 0.55, k.ease.io(k.span(SHOTC, 4.82))); y = by + SOFT * Math.cos(ln); z = 1.2 + SOFT * Math.sin(ln) + 0.1; } else { y = my + 0.15; z = 1.02; } }
      x += buzz * env * Math.sin(j * 1.7 - t * 61); z += 0.06 * env * (pre ? 0.2 : 1) + buzz * 0.6 * env * Math.sin(j * 1.3 - t * 53);
      rp.pin(j, x, y, z);
    }
    if (!gone || s < 0.999) {
      rp.draw(0.045, k.lit(K.linen, hx, hy + 1, 0.3, 0.035), 1, 1);
      WC[0] = K.mistHi[0] * 0.12; WC[1] = K.mistHi[1] * 0.16; WC[2] = K.mistHi[2] * 0.12; if (!pre) rp.draw(0.11, WC, 0.5, 0, true);
    }
    // the running end: a frayed tip, hot where it leaves the weave
    if (!gone) {
      const dx = pre ? -0.38 : -(pathX(Math.min(1, s + 0.02)) - hx) * 14, dy = pre ? -0.42 : -0.5, l = hyp(dx, dy) || 1;
      const ux = dx / l, uy = dy / l, tl = k.lit(K.linen, hx, hy, hz + 0.2, 0.03);
      k.thread(hx, hy, hz, hx + ux * 0.16, hy + uy * 0.16, hz, 0.045, tl, 1, 1);
      for (let f = 0; f < 4; f++) { const a = (f - 1.5) * 0.32, ca = Math.cos(a), sa = Math.sin(a), fl = 0.2 + 0.08 * hash(f * 3.3);
        k.thread(hx + ux * 0.15, hy + uy * 0.15, hz, hx + (ux * ca - uy * sa) * (0.15 + fl), hy + (uy * ca + ux * sa) * (0.15 + fl), hz + 0.01 * f, 0.012, tl, 0.85, 1); }
      if (hot > 0.01) { k.flare(hx, hy, hz + 0.05, 0.16, GREEN, 0.7 * Math.min(1.4, hot), 0); r.spr.add(hx, hy, hz + 0.06, 0.06, K.glare, Math.min(1, hot), 0);
        c.acc += dt * 46 * q; while (c.acc > 1) { c.acc--; r.lint.emit(hx + rnd(-0.05, 0.05), hy, hz + 0.04, rnd(-0.5, 0.5), rnd(-1.6, -0.4), rnd(0.3, 1.3), rnd(0.25, 0.5), rnd(0.015, 0.03), Math.random() < 0.5 ? GREEN_HI : K.linenHi, 0.9, 6, 3, 0.8, undefined, rnd(-5, 5), 0); } }
    }
    // ---- the knot, waiting in its path
    if (t < KNOT && !pre) { const kl = k.lit(K.madder, KX, KY, 0.25, 0.09);
      c.ball(KX, KY, 0.14, 0.2, 0.2, 0.16, 0.4, kl, 0, 0.05); c.ball(KX + 0.14, KY + 0.08, 0.12, 0.12, 0.1, 0.1, 1.2, kl, 0, 0.05); c.ball(KX - 0.12, KY + 0.1, 0.12, 0.1, 0.12, 0.1, -0.7, kl, 0, 0.05);
      r.spr.add(KX, KY, 0.3, 0.8, K.emberDim, 0.35 + 0.15 * Math.sin(time * 7), 0); }
    // ---- fibres standing off the weave: they flick past the lens
    const cy = cam.py;
    if (!pre) for (let i = 0; i < 48; i++) { const o = i * 5, x = FT[o], y = FT[o + 1]; if (y < ye + 0.1 || y < cy - 1.5 || y > cy + 6) continue;
      k.thread(x, y, 0.02, x + FT[o + 2], y + FT[o + 3], 0.02 + FT[o + 4], 0.014, k.lit(K.linen, x, y, 0.15, 0.0), 0.85, 8); }
    // ---- the unravelled edge: loops of yarn hanging into the dark, loose yarn flung up (ropes 1..5), lint
    if (!pre) {
      const lit = k.lit(ROWC, hx, ye, 0.2, 0.02); WC[0] = lit[0] * 1.5 + 0.006; WC[1] = lit[1] * 1.5 + 0.007; WC[2] = lit[2] * 1.5 + 0.01;
      for (let i = 0; i < 25; i++) { const x = -6.9 + i * 0.57 + 0.12 * Math.sin(i * 2.1), h = hash(i * 4.7); k.thread(x, ye + 0.02, 0.02, x + 0.34, ye + 0.02, 0.02, 0.035, WC, 0.95, 1, 0.16 + 0.22 * h); }
      for (let i = 1; i < 6; i++) { const cp = k.rope(i); if (cp.live) cp.draw(0.028, k.lit(i % 2 ? ROWC : K.mist, cp.x[4], cp.y[4], cp.z[4], 0.03), 0.95, 1); }
      if (ye > B && !shotC) { c.n1 += dt * 22 * q; while (c.n1 > 1) { c.n1--; const x = hx + rnd(-3.5, 3.5); r.curls.emit(x, ye, 0.05, rnd(-0.6, 0.6), rnd(-0.6, 0.3), rnd(0.2, 0.9), rnd(0.5, 0.8), 0.22, Math.random() < 0.5 ? K.patch : K.mist, 0.1, rnd(0, 6), rnd(-6, 6), rnd(-3, 3), -8, 1.5, 0.5, 1); } }
    }
    // ---- it: a dark shape far up the thread, then over us; its hooks reeling the thread in, hand over hand; its jaws open green
    if (!pre) {
      const lean = shotC ? lerp(0.95, 0.55, k.ease.io(k.span(SHOTC, 4.82))) : 1.15, col = shotC ? 1 : 0.6;
      k.boss(bx, by, shotC ? 1.2 : 1.6, 1, 0, 0, col, col, col, 0.03 * mo, lean);
      if (mo > 0.01) { const bz = shotC ? 1.2 : 1.6, mY = by + SOFT * Math.cos(lean), mz = bz + SOFT * Math.sin(lean) + 0.12, f = 0.85 + 0.15 * Math.sin(time * 19);
        r.halo.add(bx, mY, mz, 1.5 * mo, K.night, 0.92 * mo, 9); r.spr.add(bx, mY, mz + 0.05, 2.2 * mo * f, GREEN_DIM, 2.4 * mo, 0); r.spr.add(bx, mY, mz + 0.06, 0.5 * mo, MOUTH, 0.8 * mo, 0); }
      if (shotC && t < 4.8) for (let sd = -1, i = 0; sd <= 1; sd += 2, i++) {   // hand over hand: each hook catches the thread low and hauls it up into the mouth
        const ph = (t * 2.9 + i * 0.5) % 1, up = ph < 0.6 ? eio(ph / 0.6) : 1 - eio((ph - 0.6) / 0.4), hy2 = lerp(my - 2.6, my - 0.5, up), s2 = clamp((hy2 - PY0) / (PY1 - PY0), 0, 1);
        const hxx = (s2 > s ? pathX(s2) : hx) + sd * 0.08, hz2 = (s2 > s ? pathZ(s2) : hz) + 0.25, ax = bx + sd * 2.4, ay = by - 1.6;
        k.thread(ax, ay, 1.05, hxx, hy2, hz2, 0.2, k.lit(K.dbrown, hxx, hy2, hz2, 0.02), 1, 1, 0.3 * sd);
        k.thread(ax, ay, 1.07, hxx, hy2, hz2, 0.07, k.lit(K.green, hxx, hy2, hz2, 0.02), 0.9, 1, 0.3 * sd);
        c.push(r.bfP('hook'), r.bfM(hxx, hy2, hz2, sd * (0.5 + 0.3 * up), 0, 0.9, 1.25, 1.25, 1.25), k.lit(K.steel, hxx, hy2, hz2 + 0.3, 0.05), 0, 0.2, 0);
        r.spr.add(hxx, hy2 - 0.2, hz2 + 0.1, 0.5, K.steelHi, 0.5 + 0.5 * up, 1, time + i);
      }
    } else k.hideBoss();
    // ---- dust in the raking light; spray in the chase
    if (pre) k.motes(22, PX0 - 0.8, PY0 - 0.3, 0.05, PX0 + 1.4, PY0 + 2.2, 1.0, STEEL, 0.4 * k.ease.out(k.span(0.5, 1.0)), 0.018, 0.04, 3);
    else if (shotC) k.motes(26, bx - 3.5, my - 3, 1.2, bx + 3.5, my + 2, 4, STEEL, 0.35, 0.04, 0.3, 9);

    // ---- the lens: punctuation only
    const rip = k.pulse(RIP, 0.02, 0.3), kn = k.pulse(KNOT, 0.02, 0.3), arr = k.pulse(ARRIVE, 0.02, 0.25), cb = k.pulse(BACK, 0.01, 0.2);
    lens.streak(0.9 * rip + 0.7 * kn + 0.5 * arr, GREEN, 2.4, 1);
    lens.fringe(1.5 * rip + 1.8 * kn + 0.6 * cb + 1.2 * arr + 1.6 * k.ease.in2(k.span(4.8, BLACK)));
    lens.flash(GREEN, 0.05 * rip + 0.12 * kn + 0.08 * arr);
    if (!pre && !shotC && t < WHIP) { const sp = 0.012 + 0.03 * sOf(t) * (t < KNOT || t > 3.0 ? 1 : 0.2); lens.smear(0, shotB ? sp * 0.25 : -sp * 0.25, sp); }
    lens.exposure((t < 0.42 ? 0 : 1) * (1 - k.ease.in(k.span(4.88, BLACK))));
    lens.vignette(0.35);
    k.gate(pre ? lerp(0.5, 0.2, k.ease.out(k.span(0.3, 0.9))) : lerp(0.2, 0.06, k.ease.out(k.span(RIP, RIP + 0.4))));
  }

  // ---- black: inside its throat
  function gulp(k, t) {
    const cam = k.cam, lens = k.lens; k.dark(1, 1); k.quiet(true, true); k.hideBoss();
    cam.home(); cam.full(1); lens.exposure(0); k.gate(0.06);
  }

  // ---- out of the black: the play camera's position, its jaws snapping shut, the last of the thread, its hooks, the lights
  function reveal(k, t, dt) {
    const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, time = r.time, bx = c.hx, by = c.hy, my = by + SOFT, lo = k.has.post ? 1 : 0.5;
    const op = k.ease.io(k.span(5.75, 6.9));
    cam.home(); cam.full(0);
    { const fov = lerp(21, cam.fov, op), ty = lerp(10.3, cam.ty, op); cam.ty = ty; cam.fov = fov; }   // the play camera's own position, on a longer lens that opens to it
    const up = k.ease.io(k.span(5.9, 6.9));
    k.dark(lerp(0.94, 0, up), lerp(0.55, 0, sm(5.35, 6.2, t)));
    k.vig(0.35 * (1 - up));
    // its mouth's glow, shutting; the thread whipping up into it
    const shut = sm(SLURP - 0.04, SLURP + 0.06, t), glow = (1 - shut) * (1 - 0.4 * sm(CUT, 5.6, t)) + 0.25 * shut * (1 - sm(SLURP, 6.4, t));
    if (glow > 0.01) { k.light(0, bx, my - 0.3, 2.2, MOUTH, 26 * glow * lo, 8); k.pool(bx, my - 1.5, 4.5, GREEN_DIM, 0.5 * glow); }
    k.boss(bx, by, 1, 1, 0, 0, 1, 1, 1, 0);
    if (shut < 1) { const f = 0.85 + 0.15 * Math.sin(time * 23), m = 1 - shut;
      r.halo.add(bx, my, 1.3, 1.5 * m, K.night, 0.85 * m, 9); r.spr.add(bx, my, 1.35, 2.3 * m * f, GREEN_DIM, 2 * m, 0); r.spr.add(bx, my, 1.4, 0.45 * m, MOUTH, 0.7 * m, 0); }
    if (t < SLURP) {   // the tail of the thread, whipped up the cloth into its mouth
      const u = k.ease.in2(k.span(CUT + 0.03, SLURP)), s0 = lerp(0.0, 1, u), rp = k.rope(0);
      for (let j = 0; j < NT; j++) { const v = j / (NT - 1), sj = s0 + (1 - s0) * v, env = Math.sin(PI * v) * (1 - u);
        let x = pathX(sj) + 0.5 * env * Math.sin(v * 9 - t * 30), y = pathY(sj), z = pathZ(sj) + 0.3 * env;
        if (j === NT - 1) { x = bx; y = my + 0.15; z = 1.02; } rp.pin(j, x, y, z); }
      rp.draw(0.07, k.lit(K.linen, bx, my - 3, 0.8, 0.12), 1, 1);
      WC[0] = K.mistHi[0] * 0.3; WC[1] = K.mistHi[1] * 0.36; WC[2] = K.mistHi[2] * 0.3; rp.draw(0.18, WC, 0.6, 0, true);
      const tx = pathX(s0), ty2 = pathY(s0); r.spr.add(tx, ty2, 0.3, 0.5, GREEN, 0.9, 0);
    }
    // its hooks: out of its sides to where the fight hangs them, then exactly as the fight draws them
    const hk = t < HOOKS ? 0 : k.ease.back(k.span(HOOKS, HOOKS + 0.28));
    if (hk > 0) {
      const pools = r.bfChartPools && r.bfChartPools('hook', false);
      for (let sd = -1; sd <= 1; sd += 2) {
        const ax = bx + sd * 2.4, ay = by - 1.6, x = lerp(bx + sd * 1.2, ax, hk), y = ay, sc = Math.min(1, 0.4 + 0.6 * hk);
        if (Math.abs(x - ax) > 0.02) { r.bfLine(r.trN, ax, ay, x, y, 0.6, 0.2, K.dbrown, 1, 1); r.bfLine(r.trN, ax, ay, x, y, 0.62, 0.08, K.green, 0.9, 2); }
        if (pools) { r.bfChart('hook', x, y, 1, PI / 2 + Math.sin(time * 2 + sd) * 0.15, 0.17875 * sc, 0, K.white, 0, 0.12, 0, false); }
        else { c.push(r.bfP('hook'), r.bfM(x, y, 1, PI / 2, 0, 0.3, 0.88 * sc, 0.88 * sc, 0.88 * sc), K.steel, 0, 0.15, 0); }
        r.spr.add(x, y - 0.33, 1.2, 0.7, K.steelHi, 0.6 + 0.4 * Math.sin(time * 5 + sd * 3), 1, time);
      }
      if (pools) c.touch(pools.body);
    }
    // the lens: the snap is a flash of mist under which the cut was made
    const w = 1 - sm(CUT, CUT + 0.42, t);
    lens.flash(K.mistHi, 1.6 * w * w * w); lens.exposure(lerp(1, 1.5, w * w)); lens.fringe(1.1 * w);
    k.gate(lerp(0.11, 0.11, 1) * (1 - k.beat('out')));
  }

  /* ================================================================================================================
     DEATH "Reweave"   len 6.3 s   key 2.6   lights 3
     idea:     the entrance played backward. Everything it pulled out of the cloth spills out of it: the cloth falls away from
               the hem up and leaves it hanging in the dark. Then a giant shuttle shoots across and weaves the world back, row by
               row, from the top down; its first passes go straight through the Unraveller and bind it, flattened, into the new
               cloth as a woven picture of itself; then the shuttle runs back down the cloth, faster and faster, to the hem.
     camera:   pursuit again, of the shuttle now: low beside it as it crosses him, panning with each pass; then carried down the
               cloth with the weave (cam.shot keyed round the woven edge), the shuttle racing ahead; to the hem; home.
     colour:   steel and mist on black, the shuttle's dark wood and steel, the linen weft; ends on the house lights.
     rhythm:   choke; a rushing fall; CLACK ... CLACK ... CLACK (slow, three heavy beats); clack-clack-clack-rrrr; tie; light.
     ends on:  the whole cloth, taut and lit, the house lights full, the body gone, nothing moving: the fireworks follow.

     beat      film s       shot (camera, lens)                          what we see                                 light                       sound / buzz
     choke     0.0-0.5      the play camera, a push to its mouth; slow    it gags; the thread it ate whips out of     house down; its mouth       unraveller_choke 0.02
                            motion 0.3x; fringe                           its mouth                                   green (light 2)            buzz 0.03
     spill     0.5-1.3      crane back and down, looking up at it         the cloth falls away from the hem up, rows  a steel top light (1)       unraveller_spill 0.5
                                                                          gone, loose yarn flying; it hangs alone                                 buzz 0.55
                                                                          over the dark
     bind      1.3-3.01     beside it, low; the camera pans with each     a giant shuttle shoots across: five passes  the shuttle carries a cold  unraveller_shuttle x5
                            pass; slow motion 0.6x; fringe on each beat   through it, laying cloth a band at a time;  light across it (0); the    unraveller_beat x5
                                                                          each pass pulls a band of its stitches     top light (1)               unraveller_bind 1.3
                                                                          into the weave: flattened, it becomes a                                 buzz each beat
                                                                          picture in the cloth; its hooks flail
     run       3.01-4.44    carried down the cloth with the woven edge    the shuttle zig-zags down the cloth faster  the shuttle's light; a      unraveller_loom 3.01
                            (cam.shot), the shuttle racing ahead          and faster, the rows coming back behind it  fill over the new cloth (2) buzz 4.44
     tie       4.44-4.8     low at the hem                                the last pass; the shuttle shoots off; a    house lights coming up      unraveller_tie 4.44
                                                                          knot tied off where the loose end was
     settle    4.8-5.6      eases back to the play camera                 the whole cloth; its woven picture settles  house lights up             unraveller_rest 4.8
                                                                          into the weave and is gone                                              (title 4.95)
     up        5.6-6.3      the play camera                               the calm, lit, whole cloth
     reduced motion: the camera stays at the play camera; the same story plays on the cloth, without the flashes. */
  const SPILL = 0.5, YTOP = 17.0, BW = 1.2, NP = 17, T_IN = 1.3, NBIND = 5;
  const PT = new Float32Array(NP), PD = new Float32Array(NP);
  (function () { const bind = [0.42, 0.38, 0.33, 0.3, 0.28]; let t = T_IN; for (let i = 0; i < NP; i++) { const d = i < NBIND ? bind[i] : 0.25 * Math.pow(0.85, i - NBIND); PT[i] = t; PD[i] = d; t += d; } })();
  const PEND = PT[NP - 1] + PD[NP - 1], RUN = PT[NBIND], VTOP = (YTOP - B) / FH, SXR = 9.2;
  const SS = new Float32Array(6);   // the shuttle this frame: pass, progress, x, y, direction, passes done
  function shuttle(t) {
    let i = 0; while (i < NP - 1 && t >= PT[i] + PD[i]) i++;
    const p = clamp((t - PT[i]) / PD[i], 0, 1), dir = i & 1 ? -1 : 1, x = dir * lerp(-SXR, SXR, p);
    SS[0] = i; SS[1] = p; SS[2] = x; SS[3] = YTOP - BW * (i + 0.5); SS[4] = dir; SS[5] = t < PT[0] ? 0 : p >= 1 && i === NP - 1 ? NP : i;
    return SS;
  }
  /* the stitch order that binds it: by the band each pass lays (top down), and across in the direction that pass runs. In
     world x, so a stitch goes the moment the shuttle passes over it. */
  function bindOrder(x, y, m, h) {
    const wy = BY0 + y, band = clamp(Math.floor((YTOP - wy) / BW), 0, NBIND - 1), dir = band & 1 ? -1 : 1, f = (dir * x + SXR) / (2 * SXR);
    return band + clamp(f, 0, 1) * 0.94 + h * 0.004;
  }
  /* The shuttle: a long boat of dark wood with steel tips, a pirn of linen weft in its well. Along x. */
  function buildShuttle(T, k) {
    const K = k.K, g = new T.Group(), pts = [];
    for (let i = 0; i <= 16; i++) { const v = i / 16, y = lerp(-1.45, 1.45, v), rr = 0.3 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y) / 1.45, 2.2)), 0.6); pts.push(new T.Vector2(Math.max(0.002, rr), y)); }
    const body = new T.LatheGeometry(pts, 18); body.rotateZ(-PI / 2); body.scale(1, 1, 0.62);
    const wood = new T.Mesh(body, new T.MeshStandardMaterial({ color: new T.Color('#5A3E28'), roughness: 0.48, metalness: 0.05 }));
    const tipG = new T.ConeGeometry(0.07, 0.62, 10); const items = [];
    const mm = (x, rz) => new T.Matrix4().compose(new T.Vector3(x, 0, 0), new T.Quaternion().setFromEuler(new T.Euler(0, 0, rz)), new T.Vector3(1, 1, 1));
    items.push([tipG, mm(1.62, -PI / 2)]); items.push([tipG.clone(), mm(-1.62, PI / 2)]);
    items.push([new T.TorusGeometry(0.12, 0.025, 6, 14), mm(1.3, PI / 2)]); items.push([new T.TorusGeometry(0.12, 0.025, 6, 14), mm(-1.3, PI / 2)]);
    const steel = new T.Mesh(FX.merge(T, items), new T.MeshStandardMaterial({ color: new T.Color(PAL.steelHi), roughness: 0.25, metalness: 0.85 }));
    const pirnG = new T.CylinderGeometry(0.1, 0.1, 1.1, 14); pirnG.rotateZ(PI / 2);
    const pirn = new T.Mesh(pirnG, new T.MeshStandardMaterial({ color: new T.Color(PAL.tan), roughness: 0.9 })); pirn.position.set(0, 0, 0.1);
    const spindle = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1.6, 6).rotateZ(PI / 2), new T.MeshStandardMaterial({ color: new T.Color('#3A2A1C'), roughness: 0.6 })); spindle.position.set(0, 0, 0.12);
    g.add(wood); g.add(steel); g.add(pirn); g.add(spindle);
    g.traverse(o => { o.frustumCulled = false; });
    return g;
  }
  function buildFlag(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0) })); m.renderOrder = -3; return m; }   // black over the top rail, as a lighting crew would rig
  function beatFx(k, i) {   // the reed beats the new band up against the cloth
    const r = k.r, K = k.K, y = YTOP - BW * (i + 1), last = i === NP - 1;
    r.shake = Math.max(r.shake, i < NBIND ? 0.16 : last ? 0.12 : 0.04);
    if (i < NBIND || last) { for (let j = 0, n = r.n(i < NBIND ? 10 : 6); j < n; j++) r.lint.emit(rnd(-6.5, 6.5), y, 0.1, rnd(-0.3, 0.3), rnd(-0.8, -0.1), rnd(0.3, 1.2), rnd(0.6, 1), rnd(0.02, 0.04), K.mist, 0.7, 6, 2, 1.2, undefined, rnd(-3, 3), 0); }
  }
  function passFx(k, i) {   // the shuttle comes out of the dark at the selvedge
    const r = k.r, K = k.K, dir = i & 1 ? -1 : 1, y = YTOP - BW * (i + 0.5); if (i >= NBIND) return;
    r.glints(-dir * 7, y, 0.6, 5, K.steelHi, 2.2, 0.2, 0.4);
  }
  function bound(k, x, y, z, rgb) {   // one of its stitches pulled into the weave: dragged along the pass, flattening into the cloth
    const r = k.r, dir = SS[4]; r.xs.emit(x, y, z + 0.05, dir * rnd(2.5, 5), rnd(-0.3, 0.3), -0.6, rnd(0.25, 0.45), rnd(0.55, 0.8), rgb, 0.12, rnd(0, 6), rnd(-1, 1), rnd(-2, 2), 0, 3, 0, 0.5, 0);
  }
  const DSTEPS = [
    [0.03, k => { const r = k.r, K = k.K, c = k.c, my = c.hy + SOFT; r.shake = Math.max(r.shake, 0.35); r.strands(c.hx, my, [PAL.linen, PAL.green, PAL.steel], 14, 1.6); r.glints(c.hx, my, 1.4, 10, K.steelHi, 3, 0.3, 0.5); r.hitStop(0.05, 0.3); }],
    [SPILL + 0.05, k => { const r = k.r, K = k.K; r.shake = Math.max(r.shake, 0.3); for (let i = 0, n = r.n(22); i < n; i++) r.curls.emit(rnd(-6.8, 6.8), B + rnd(0, 0.6), 0.2, rnd(-1, 1), rnd(-0.5, 2), rnd(1, 3), rnd(0.8, 1.4), 0.3, i % 2 ? K.patch : K.mist, 0.1, rnd(0, 6), rnd(-6, 6), rnd(-3, 3), -8, 1.5, 0.6, 1); }],
    [PEND, k => { const r = k.r, K = k.K; r.glints(PX0, B + 0.4, 0.4, 8, K.madderHi, 2.4, 0.25, 0.5); r.shake = Math.max(r.shake, 0.1); }]
  ];
  for (let i = 0; i < NP; i++) { DSTEPS.push([PT[i], k => passFx(k, i)]); DSTEPS.push([PT[i] + PD[i], k => beatFx(k, i)]); }
  const BEATS_BIND = []; for (let i = 0; i < NBIND; i++) BEATS_BIND.push(+(PT[i] + PD[i]).toFixed(3));
  const PASSES_BIND = []; for (let i = 0; i < NBIND; i++) PASSES_BIND.push(+PT[i].toFixed(3));

  const DEATH = {
    kit: true, len: 6.3, key: 2.6, lights: 3,
    sheet: [0.2, 0.78, 1.08, 1.5, 1.95, 2.3, 2.78, 3.3, 3.85, 4.62, 5.25, 6.15],
    beats: {
      choke:  [0, SPILL, 'out'],
      spill:  [SPILL, T_IN, 'in2'],
      bind:   [T_IN, RUN, 'lin'],
      run:    [RUN, PEND, 'lin'],
      tie:    [PEND, 4.8, 'out'],
      settle: [4.8, 5.6, 'io'],
      up:     [5.6, 6.3, 'lin']
    },
    ramp: [[0.03, 1], [0.07, 0.3], [0.38, 0.3], [0.5, 1], [1.25, 1], [1.35, 0.6], [2.9, 0.6], [3.05, 1]],
    title: { at: 4.95, iv: 0.045, in: 'unrknit', pos: 'mid', to: 6.05 },
    css: '.fk-t.i-unrknit .fk-n span.on{animation:unr-knit .42s steps(6) both}.fk-t.i-unrknit .fk-rule{border-top-color:#A3AEC6}.fk-t.i-unrknit .fk-s b{color:#A3AEC6}' +
      '@keyframes unr-knit{0%{clip-path:inset(0 0 100% 0);color:#CBD3E4}100%{clip-path:inset(0 0 0 0)}}',
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the choke's slow
       motion adds 0.7 s, the binding's 1.0 s. Film 0.5 (the spill) is real 1.2; the five beats of the binding (film 1.72, 2.1,
       2.43, 2.73, 3.01) are real 3.12, 3.75, 4.3, 4.8, 5.21; the run down the cloth is real 5.21 to 6.64 (film 3.01 to 4.44); the
       tie real 6.64; the title real 7.15; the end 8.0. */
    music: { name: 'unraveller_down_sting', len: 9.0, gain: 0.85, desc: 'Death sting for the Unraveller, a creature that eats cloth, as a loom weaves the world back over it. A choked low brass blare, slowed, cut off at 0.7 s; a rushing reversed swell from 1.2 to 2.4 s that falls into near silence; five heavy low drum and wood hits at 3.12, 3.75, 4.3, 4.8 and 5.21 s, each with a short dark string stab, solemn and mechanical; from 5.21 s a quick spinning pattern of plucked strings and woodblock that speeds up and climbs to 6.64 s; a single clean bright chord on the beat at 6.64 s; then a warm, open, slow string chord, a little relieved, swelling gently from 7.2 s and fading by 9.0 s. Instrumental' },
    sounds: {
      unraveller_choke:   { at: 0.02, len: 1.6, gain: 1, desc: 'A huge throat choking on yarn, slowed down: a deep wet gagging retch rising for 0.6 s, a thick thread whipping out of it with a twang at 0.65 s, a long strained wheeze after' },
      unraveller_spill:   { at: SPILL, len: 1.5, gain: 0.9, desc: 'A whole cloth unravelling at once: a rushing roar of thousands of stitches popping and threads zipping loose, sweeping past from low to high over 1.1 s, then a hollow empty hush' },
      unraveller_shuttle: { at: PASSES_BIND, len: 0.7, gain: 0.85, desc: 'A giant wooden loom shuttle hurled past, close: a deep fast whoosh of air with the clatter of a spinning pirn inside it, passing from one side to the other over 0.6 s' },
      unraveller_beat:    { at: BEATS_BIND, len: 0.8, gain: 1, desc: 'A loom reed beating a row of weft home, huge and heavy: one deep hollow wooden CLACK with a thud of packed cloth, a short creak of the frame after' },
      unraveller_bind:    { at: T_IN, len: 3.0, gain: 0.6, desc: 'Something big being bound tight in yarn as it struggles: strained creaks of thread stretching, steel hooks scraping and clicking, a muffled gurgling groan at 1.2 s and another weaker one at 2.2 s, under it all a low tightening rope groan that ends at 3.0 s' },
      unraveller_loom:    { at: RUN, len: 1.6, gain: 0.8, desc: 'An old wooden loom running faster and faster: shuttle clacks, slow at first, about one every 0.25 s, speeding up until at 1.2 s they blur into a rattling roll that stops dead at 1.43 s' },
      unraveller_tie:     { at: PEND, len: 1.2, gain: 0.8, desc: 'A thread pulled through and tied off: a quick zip, a firm soft cinch of a knot at 0.15 s, and one low plucked string ringing out' },
      unraveller_rest:    { at: 4.8, len: 1.8, gain: 0.5, desc: 'A great cloth settling taut in its frame: a soft fabric shiver, a faint creak of the wooden frame at 0.4 s, then a quiet warm room tone that fades out' }
    },
    buzz: [[0.03, 40], [SPILL + 0.05, [20, 20, 30]]].concat(BEATS_BIND.map(a => [a, 26]), [[PEND, 30]]),
    steps: DSTEPS,
    setup(k) {
      k.r.bfOrders.unrbind = bindOrder;
      k.prop('shuttle', buildShuttle); k.prop('flag', buildFlag);
      k.stitched(DEF.sprite, DEF.cell);
      for (let i = 0; i < 6; i++) k.rope(i).lay(8, 0, 0, 0, 0, 1, 0);
      for (let i = 0; i < 6; i++) k.rope(i).live = false;
      const c = k.c; c.arena = c.arenaO; c.arenaO.floor = c.F0 || 0; c.arenaO.inset = c.I0 || 0; c.acc = 0; c.n1 = 0;
    },
    frame(k, t, dt) { reweave(k, t, dt); }
  };

  function reweave(k, t, dt) {
    const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, cl = k.cloth, q = k.q(), time = r.time, lo = k.has.post ? 1 : 0.5;
    const bx = 0, by = BY0, my = by + SOFT, sp = shuttle(t), si = sp[0], spp = sp[1], sx = sp[2], sy = sp[3], dir = sp[4];
    const inPass = t >= T_IN && t < PEND, done = t < T_IN ? 0 : t >= PEND ? NP : si + (spp >= 1 ? 1 : 0);
    const fell = YTOP - BW * done, spill = k.ease.in2(k.span(SPILL, T_IN - 0.08)), woven = t >= PEND + 0.04;
    const binding = t >= T_IN && t < RUN + 0.15, home = t >= 4.8;

    // ---- the camera first
    const WIDE_Y = 8.2;
    if (t < SPILL) { const u = k.ease.out(k.span(0, SPILL)); cam.home().mark(); cam.orbit(bx, my + 0.4, 1, cam.fit(9, 9), 0.25, 0).mix(0.4 * u); cam.full(u); }
    else if (t < T_IN + 0.3) {   // back and wide: the whole cloth falling away under it, from the hem up
      const u = k.ease.io(k.span(SPILL, T_IN - 0.1));
      cam.home().mark(); cam.orbit(bx, my + 0.4, 1, cam.fit(9, 9), 0.25, 0).mix(0.4).mark();
      cam.fov = 34; cam.orbit(0, WIDE_Y, 0.5, cam.fit(15, 21), 0.34, 0.08, 0).mix(u); cam.full(1);
      if (t > T_IN) { cam.mark(); cam.orbit(bx + clamp(sx, -7, 7) * 0.12, by - 0.4, 0.6, cam.fit(10.5, 10.5), 0.42, -0.25, 0.01 * dir).mix(k.ease.io(k.span(T_IN, T_IN + 0.3))); cam.motion(0.6); }
    } else if (t < RUN + 0.06) {   // close beside it, the camera leaning with each pass
      const u = k.ease.io(k.span(T_IN, RUN)), pan = clamp(sx, -7, 7) * 0.12;
      cam.fov = 34; cam.orbit(bx + pan, by - 0.4 + 0.3 * u, 0.6, cam.fit(lerp(9.6, 8.2, u), lerp(9.6, 8.2, u)), 0.42, lerp(-0.25, 0.22, u), 0.015 * dir);
      cam.handheld(0.04, 1.4); cam.motion(0.4); cam.full(1);
      lens.focus(bx, by - 0.4, 0.5, 0.7, 0.012);
    } else if (!home) {   // carried down the cloth with the woven edge, wide enough to see each pass from selvedge to selvedge
      const u = k.span(RUN, PEND), fy = Math.max(B, fell);
      cam.fov = 36; cam.orbit(0, fy + 1.8, 0, cam.fit(15.5, 15.5), lerp(0.52, 0.36, u), lerp(0.2, -0.12, u), 0.02 * Math.sin(t * 3)).mark();
      if (t < RUN + 0.3) { cam.orbit(bx, by - 0.1, 0.6, cam.fit(9, 9), 0.42, 0.22, 0); cam.mix(1 - k.ease.io(k.span(RUN + 0.06, RUN + 0.3))); cam.mark(); }
      if (t > PEND) { cam.orbit(0, B + 3.2, 0, cam.fit(14, 14), 0.36, 0, 0).mix(k.ease.io(k.span(PEND, 4.75))); cam.mark(); }
      cam.handheld(0.05, 2); cam.motion(0.5); cam.full(1);
    } else {   // home
      cam.fov = 36; cam.orbit(0, B + 3.2, 0, cam.fit(14, 14), 0.36, 0, 0).mark(); cam.home().mix(k.ease.io(k.span(4.8, 5.6)));
      cam.full(1 - k.ease.io(k.span(4.8, 5.5)));
    }

    // ---- light: the house goes down but not out while the cloth falls (so its going reads), to the dark for the binding,
    //      and comes back up from the hem. 0: a cold light riding ahead of the shuttle; 1: a top light over it; 2: its mouth,
    //      then a fill over the new cloth
    const choke = 1 - sm(0.3, SPILL + 0.2, t), houseUp = k.ease.io(k.span(4.5, 5.8));
    const dk = t < SPILL ? lerp(c.d0, 0.7, sm(0, 0.35, t)) : t < T_IN ? lerp(0.7, 0.6, sm(SPILL, 0.8, t)) + 0.32 * sm(1.0, T_IN + 0.1, t) : 0.92 - 0.12 * sm(RUN, PEND, t);
    if (t < 5.8) k.dark(dk * (1 - houseUp), (t < SPILL ? 0 : t < T_IN ? 0.15 + 0.4 * sm(1.0, T_IN, t) : 0.55 - 0.3 * sm(RUN, PEND, t)) * (1 - houseUp)); else k.dark(0, 0);
    k.vig(0.4 * (1 - houseUp)); if (!home) k.quiet(true, t > SPILL);
    if (t < SPILL + 0.3) k.light(2, bx, my - 0.3, 2.2, MOUTH, 24 * choke * lo, 8);
    if (t > 0.35 && t < RUN + 0.4) k.light(1, bx, by + 1.4, 4.2, STEEL, 34 * sm(0.35, 0.9, t) * (1 - sm(RUN, RUN + 0.4, t)) * lo, 10);
    if (inPass) { const on = sm(0, 0.06, spp) * sm(1, 0.94, spp), lx = clamp(sx + dir * 1.8, -7.5, 7.5); k.light(0, lx, sy + 0.7, 2.4, STEEL, (si < NBIND ? 16 : 10) * on * lo, 6.5); k.pool(lx, sy, 3, K.steel, 0.05 * on); }
    if (t >= RUN && t < 4.8) k.light(2, 0, Math.max(B, fell) + 3.5, 4.5, STEEL, 22 * (1 - sm(4.4, 4.8, t)) * lo, 12);
    if (t > SPILL && t < 4.5) { const fg = k.prop('flag'); fg.position.set(0, H + 7.8, 0.62); fg.scale.set(60, 15.6, 1); }

    // ---- the cloth: falling away, then woven back a band at a time
    if (!woven && t > SPILL - 0.02) {
      const v0 = t < T_IN ? spill * VTOP : clamp((fell - B) / FH, 0, VTOP);
      cl.rows(v0, 1); cl.backing(VOID, 1); cl.crumple(0.03, 0.6, 0);
      if (binding) cl.pull(clamp(sx, -7, 7), sy, dir * 0.12, 0, 1.0);
      // the fight's lost rows go with the rest, and come back with it
      c.arenaO.floor = (c.F0 || 0) * (1 - sm(SPILL, SPILL + 0.2, t)); c.arenaO.inset = (c.I0 || 0) * (1 - spill);
      // the edge: loops of yarn hanging into the dark (falling away), or the fell, bright where the reed beats it (weaving)
      const ey = t < T_IN ? B + spill * VTOP * FH : fell, lit = k.lit(K.patch, 0, ey, 0.3, 0.04);
      WC[0] = lit[0] * 1.5 + 0.012; WC[1] = lit[1] * 1.5 + 0.014; WC[2] = lit[2] * 1.5 + 0.024;
      if (ey < YTOP - 0.05 || t < T_IN) for (let i = 0; i < 25; i++) { const x = -6.9 + i * 0.57 + 0.12 * Math.sin(i * 2.1); k.thread(x, ey, 0.02, x + 0.34, ey, 0.02, 0.035, WC, 0.9, 1, (0.16 + 0.2 * hash(i * 4.7)) * (t < T_IN ? 1 : 0.5)); }
      if (t < T_IN && spill > 0.01 && spill < 0.995) { const g = 0.6 + 0.4 * Math.sin(t * 37);   // the unravelling front, racing up the cloth
        WC[0] = GREEN[0] * 0.22 * g; WC[1] = GREEN[1] * 0.22 * g; WC[2] = GREEN[2] * 0.22 * g; k.thread(-7, ey + 0.05, 0.08, 7, ey + 0.05, 0.08, 0.3, WC, 1, 0, 0, true);
        WC[0] = 0.5; WC[1] = 0.8; WC[2] = 0.5; k.thread(-7, ey + 0.05, 0.09, 7, ey + 0.05, 0.09, 0.05, WC, 0.9, 0, 0, true); }
      if (t < T_IN && spill > 0.01) { c.acc += dt * 70 * q; while (c.acc > 1) { c.acc--; r.curls.emit(rnd(-6.8, 6.8), ey, 0.1, rnd(-1, 1), rnd(0.2, 2.5), rnd(1, 3), rnd(0.7, 1.1), 0.26, Math.random() < 0.5 ? K.patch : K.mist, 0.1, rnd(0, 6), rnd(-6, 6), rnd(-3, 3), -9, 1.5, 0.5, 1); } }
      if (inPass && spp > 0 && spp < 1) {   // the weft being laid behind the shuttle across this band
        const x0 = -dir * 7, x1 = clamp(sx - dir * 1.4, -7, 7), wl0 = k.lit(K.linen, sx, sy, 0.4, 0.02), wl = WC; WC[0] = wl0[0] * 0.55; WC[1] = wl0[1] * 0.55; WC[2] = wl0[2] * 0.55;
        if ((x1 - x0) * dir > 0.05) for (let j = 0; j < 3; j++) { const yy = fell - BW * (0.2 + 0.3 * j); k.thread(x0, yy, 0.03, x1, yy, 0.03, 0.12, wl, 0.95, 4); }
        k.thread(x1, sy, 0.32, clamp(sx, -9, 9), sy, 0.32, 0.03, wl, 0.9, 1);
      }
      const bt = k.pulse(si > 0 && spp < 0.3 ? PT[si] : 99, 0.01, 0.16);
      if (bt > 0.01) { WC[0] = K.steelHi[0] * 0.25 * bt; WC[1] = K.steelHi[1] * 0.25 * bt; WC[2] = K.steelHi[2] * 0.25 * bt; k.thread(-7, fell, 0.04, 7, fell, 0.04, 0.08, WC, 0.7, 0, 0, true); }
    }
    // ---- the run as a long exposure: each pass leaves a streak of the shuttle's light across its band, fading
    if (t >= RUN && t < PEND + 0.6) for (let j = Math.max(NBIND, si - 7); j <= Math.min(si, NP - 1); j++) {
      const e = PT[j] + PD[j], cur = t < e, age = cur ? 0 : t - e; if (age > 0.55 || t < PT[j]) continue;
      const a = (1 - age / 0.55) * (1 - age / 0.55), yj = YTOP - BW * (j + 0.5), dj = j & 1 ? -1 : 1, xa = -dj * 7.6, xb = cur ? clamp(sx, -7.6, 7.6) : dj * 7.6;
      WC[0] = STEEL[0] * 0.16 * a; WC[1] = STEEL[1] * 0.2 * a; WC[2] = STEEL[2] * 0.22 * a; k.thread(xa, yj, 0.5, xb, yj, 0.5, 0.55, WC, 1, 0, 0, true);
      WC[0] = 0.5 * a; WC[1] = 0.62 * a; WC[2] = 0.8 * a; k.thread(xa, yj, 0.52, xb, yj, 0.52, 0.05, WC, 1, 0, 0, true);
      if (!cur) { const yn = yj - BW; k.thread(dj * 7.6, yj, 0.5, dj * 7.9, (yj + yn) * 0.5, 0.5, 0.05, WC, 1, 0, 0, true); k.thread(dj * 7.9, (yj + yn) * 0.5, 0.5, dj * 7.6, yn, 0.5, 0.05, WC, 1, 0, 0, true); }
    }
    // ---- the shuttle
    if (inPass && Math.abs(sx) < SXR + 0.2) {
      const sh = k.prop('shuttle'), wob = Math.sin(t * 31) * 0.03; sh.position.set(sx, sy, 0.42); sh.rotation.set(0.2 + wob, dir > 0 ? 0 : PI, wob * 0.5);
      sh.scale.setScalar(si >= NBIND ? 1.45 : 1.9);
      const fast = si >= NBIND + 4; if (fast) { WC[0] = K.steel[0] * 0.18; WC[1] = K.steel[1] * 0.18; WC[2] = K.steel[2] * 0.2; k.thread(sx - dir * 3.5, sy, 0.42, sx, sy, 0.42, 0.5, WC, 0.7, 0, 0, true); }
      r.spr.add(sx + dir * 1.9, sy, 0.45, 0.35, K.steelHi, 0.7, 1, time * 3);
    }
    // ---- it: gagging; hanging in the dark; bound into the weave, a band of its stitches with each pass
    if (t < RUN + 0.1) {
      const flat = k.ease.io(k.span(T_IN - 0.1, T_IN + 0.35)), gag = sm(0, 0.12, t) * (1 - sm(0.4, 0.9, t)), fl = binding ? 1 - sm(T_IN, RUN, t) : 1;
      const z = lerp(1, 0.08, flat), rz = (0.05 * Math.sin(time * 21) + 0.03 * Math.sin(time * 13)) * fl * (t > SPILL ? 1 : 0.3), col = lerp(1, 0.72, sm(SPILL, T_IN, t));
      c.dboss(k.ease.out(k.span(0, 0.35)), bx, by + 0.12 * Math.sin(time * 3) * (1 - flat), z, 1, rz, 0, col, col, col * 1.05, 0.12 * gag, 0, 0);
      if (c.g) c.g.scale.y *= 1 + 0.1 * gag;
      c.edge(K.steelHi, 0.55);
      let u = 0; if (t >= T_IN) { const d = r.bfOrderData('unraveller', 'unrbind'), raw = si < NBIND ? si + clamp((dir * sx + SXR) / (2 * SXR), 0, 1) * 0.94 : NBIND + 1; u = r.bfOrderAt(d, raw); }
      k.unpickBoss(u, 'unrbind', bound); if (u >= 1) k.hideBoss();
      // its mouth, forced open
      if (gag > 0.01) { r.halo.add(bx, my, 1.3, 1.6 * gag, K.night, 0.9 * gag, 9); r.spr.add(bx, my, 1.35, 2.2 * gag, GREEN_DIM, 2 * gag, 0); }
      // the thread it ate, whipping out of its mouth
      if (t < SPILL + 0.3) { const w = k.ease.out(k.span(0.03, 0.45)), a = 1 - sm(SPILL, SPILL + 0.3, t); for (let sd = -1; sd <= 1; sd += 2) k.thread(bx, my, 1.2, bx + sd * 3.2 * w, my - 2.6 * w - 0.4 * Math.sin(w * PI), 1.4 + w, 0.06, k.lit(K.linen, bx, my - 1, 1.6, 0.15), a, 1, 0.5 * w * sd); }
      // its hooks, flailing until their band takes them
      for (let sd = -1, i = 0; sd <= 1; sd += 2, i++) {
        const ax = bx + sd * 2.4, ay = by - 1.6, band = Math.floor((YTOP - (ay - 0.8)) / BW), took = t >= T_IN && (si > band || (si === band && (dir * (ax + sd * 1.2) + SXR) / (2 * SXR) < spp));
        if (took || t < SPILL * 0.5) continue;
        const fa = 0.6 + 0.5 * Math.sin(time * (7 + i * 2.3) + i), hx = ax + sd * (1.1 + 0.5 * Math.cos(fa)), hy = ay - 0.6 - 0.9 * Math.sin(fa) * (1 - flat * 0.5), hz = lerp(1.1, 0.15, flat);
        k.thread(ax, ay, z + 0.05, hx, hy, hz, 0.2, k.lit(K.dbrown, hx, hy, hz + 0.4, 0.04), 1, 1, 0.25 * sd);
        k.thread(ax, ay, z + 0.07, hx, hy, hz, 0.08, k.lit(K.green, hx, hy, hz + 0.4, 0.04), 0.9, 2, 0.25 * sd);
        c.push(r.bfP('hook'), r.bfM(hx, hy, hz, sd * fa - PI / 2, 0, 0.3, 0.9, 0.9, 0.9), k.lit(K.steel, hx, hy, hz + 0.6, 0.08), 0, 0.3, 0);
      }
    } else k.hideBoss();
    // ---- the woven picture of it, in the cloth: sewn as it is bound, settling into the weave as the lights come up
    if (t >= T_IN) {
      const gs = k.stitched(DEF.sprite, DEF.cell), d = r.bfOrderData('unraveller', 'unrbind'), raw = si < NBIND ? si + clamp((dir * sx + SXR) / (2 * SXR), 0, 1) * 0.94 : NBIND + 1;
      const tint = lerp(0.62, 0.5, sm(RUN, 4.5, t));
      WC[0] = 0.92 * tint; WC[1] = 0.95 * tint; WC[2] = 1.05 * tint;
      gs.at(bx, by, 0.035, 0, 1, WC, 0).edge(K.steelHi, 0.5);
      if (t < 4.95) gs.sew(t >= RUN ? 1 : r.bfOrderAt(d, raw), 'unrbind'); else gs.unpick(k.ease.io(k.span(4.95, 5.75)), 'random');
    }
    // ---- the tie: a knot pulled tight where the loose end was
    if (t > PEND - 0.05 && t < 5.9) { const kt = k.ease.back(k.span(PEND, PEND + 0.25)), kl = WC, a = 1 - sm(5.3, 5.9, t); WC[0] = K.madder[0] * 0.8; WC[1] = K.madder[1] * 0.8; WC[2] = K.madder[2] * 0.8;
      if (a > 0.02) { c.ball(PX0, B + 0.45, 0.08, 0.13 * kt * a, 0.11 * kt * a, 0.08 * kt * a, 0.3, kl, 0, 0.05); k.thread(PX0 - 0.45 * kt, B + 0.1, 0.04, PX0, B + 0.45, 0.06, 0.04, kl, a, 1, 0.05); } }

    // ---- the lens
    let bt = 0; for (let i = 0; i < NBIND; i++) bt = Math.max(bt, k.pulse(PT[i] + PD[i], 0.015, 0.22));
    const ch = k.pulse(0.03, 0.03, 0.4);
    lens.fringe(1.3 * ch + 0.9 * bt + 0.5 * k.pulse(PEND, 0.02, 0.25));
    lens.streak(0.6 * ch + 0.5 * bt, STEEL, 2.6, 1);
    if (t >= RUN && t < PEND) lens.smear(0, 0, 0.006 + 0.03 * k.span(RUN, PEND));
    lens.vignette(0.3 * (1 - houseUp));
    k.gate(t < 4.8 ? 0.11 : 0.11 * (1 - k.ease.io(k.span(5.9, 6.3))));
  }

  ST.registerFilm('unraveller', {
    entrance: ENTRANCE,

    /* Pull: a thread runs from the bottom hem up the cloth to its mouth, rows puckering behind it; the camera tilts up with the
       thread and it knits itself in at the top. */
    sig: {
      len: 1.5, title: 0.62,
      steps: [[0.05, c => { c.r.ripple(0, B + 0.6, 0.5, 5, 0.5, 2.2); c.r.lintPuff(0, B + 0.4, 0.3, 6, c.K.mist, 0.7, 1.6); }], [0.4, c => c.r.ripple(0, B + 2.2, 0.4, 5, 0.5, 2.4)],
        [0.9, c => { const r = c.r, my = c.hy + c.def.softY; r.ring(c.hx, my, 3, c.K.mistHi, 0.35, 7); r.lintPuff(c.hx, my, 1, 10, c.K.mist, 0.9, 2.2); r.shake = Math.max(r.shake, 0.28); }]],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, my = c.hy + c.def.softY, u = ei(clamp(t / 0.9, 0, 1)), ty = lerp(B + 0.2, my, u), tf = 1 - sm(0.95, 1.25, t);
        if (tf > 0) { r.bfLine(r.trN, 0, B + 0.15, c.hx * u, ty, 0.08, 0.09, K.linen, tf, 1, 0.3 * (1 - u), 0.05, time * 6, tf, 0.08 + u * 1.1);
          r.bfLine(r.trA, 0, B + 0.15, c.hx * u, ty, 0.1, 0.25, K.mistHi, 0.3 * tf, 0, 0.3 * (1 - u)); r.spr.add(c.hx * u, ty, 0.3 + u, 0.9, K.linenHi, tf, 1, time * 4);
          for (let k = 0; k < 3; k++) { const yy = B + 0.45 + k * 0.42, p = sm(0.05 + k * 0.08, 0.3 + k * 0.08, t) * tf; if (p > 0.01) r.bfLine(r.trN, -HW, yy, HW, yy, 0.04, 0.06, k % 2 ? K.patch : K.coverHi, 0.8 * p, 1, -0.25 * p, 0.06, time * 4 + k); } }
        if (t > 0.75) { c.boss(c.hx, c.hy, 1, 1, 0, 0, 1, 1, 1, 0.2 * (1 - sm(0.95, 1.3, t))); c.dissolve(1.02 - 1.08 * sm(0.78, 1.2, t)); } else c.hideBoss();
        c.dark = 0.2 * (1 - sm(0.9, 1.3, t));
        c.view(0, lerp(B + 3, my - 1.5, eio(clamp(t / 0.95, 0, 1))), 0.78, lerp(0.45, 0.25, u), 0, 0, c.fov0); c.blendHome(eio(sm(0.9, 1.45, t)));
      }
    },

    death: DEATH
  });
})(window.ST);
