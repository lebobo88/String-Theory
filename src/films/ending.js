/* String Theory — the victory ending, "Keepsake". A film that belongs to no boss: ST.Cine.play('ending') (docs/FILM-KIT.md).
   Played by src/ui.js before the victory page, after the Moth King's death film ("Daybreak", src/films/king.js) and the
   fireworks that follow it. A tap skips it.

   One idea: the needle ship's last flight. It lifts from its row in the morning light and climbs the whole cloth, from the hem
   to the top rail, and as it passes each of the eight bosses it sews that boss onto the cloth as a small cross-stitched memory,
   one thread of its own red running stitch joining them all, the first night at the hem, the King at the top. At the top it
   ties the thread off in a knot, under the sun the King's death raised, and lays itself down beside it. The camera lets go and
   rises back to the player's own view: the whole cloth is a sampler of the run. "The cloth is mended." "The end." The morning
   light swells to gold, and out of it the victory page comes up.
   Camera language (the ending's alone): one unbroken take. From the play camera it sinks behind the ship and follows it up the
   cloth, looking up the weave toward the light; at the top it lifts to the knot and the sun; then it lets go and settles back
   into the play camera. No cuts until the gold.
   Light: the risen morning sun beyond the top rail (Daybreak's, at x -1.2), raking down the cloth, warm at the top and falling
   off toward the hem; the ship's own small light at its eye; a glint at the knot.
   Colour: morning gold and saffron on the Royal weave; the ship's madder thread; the memories in their own colours, faded warm,
   like old embroidery. Rhythm: a breath; a lift; eight stitches rising, one a memory (the music box's eight notes); a knot; the
   long pull back; the words; gold; rest.

   ENDING "Keepsake"  len 12.6 s  key 10.7 (the still)  lights 3
   idea:     the needle ship climbs the mended cloth and sews each boss it beat into it as a memory, ties off, and the cloth
             is a sampler of the whole run
   camera:   one unbroken take: the play camera, sinking behind the ship, a chase up the cloth looking up the weave, a lift to the
             knot and the sun, the long pull back into the play camera
   colour:   morning gold, saffron, the ship's madder thread, memories faded warm      rhythm: breath, lift, 1-2-3-4-5-6-7, 8, knot, rest
   handover: in: the play camera on the whole, still, lit, mended Royal-weave cloth (Daybreak's end); house lights up; the
             ship where the game left it, which the film takes over. out: the morning light swells to gold (11.0-11.6); under it
             the sampler and the film's ship go and the game's own ship is back on its row; at 11.6 the film lifts body.stc-solo
             (the title film's signal) and the victory page comes up over the gold; the gold falls away to the plain cloth at the
             play camera, house lights up (11.6-12.4); the film ends (12.6) on exactly what the page sits over.

   beat      film s       shot (camera, lens)                                what we see                                     light                                 sound / buzz
   morning   0.0-1.1      the play camera, held                              the whole mended cloth, still; the morning      the sun beyond the top rail (light 0) ending_sting 0 (from the
                                                                             comes over the top rail, warm, falling off      rakes in; a warm pool at the top      King's held golden chord),
                                                                             down the cloth; the ship's eye catches it                                             ending_morning 0
   lift      1.1-2.3      one move: the camera sinks behind and below the    the ship rises off its row and sets off up the  + the ship's light (light 1)          ending_lift 1.1, buzz
                          ship, looking up the cloth; focus on the ship      cloth, its red thread paying out behind it
   climb     2.3-6.6      the chase: behind and below the ship, looking up   it weaves up between them; as it passes each    the sun ahead, the ship's light       ending_sew x7 (each
                          the weave toward the light; focus on the ship;     boss it sews it on, stitch by stitch, a hot     on each memory as it passes           memory's first stitch)
                          memories slide by soft, then sharp                 saffron front, then a warm glow cooling: the
                                                                             Great Lappet (2.55) ... the Silk Empress (6.15)
   crown     6.6-7.3      the chase, slowing                                 the Moth King, last and largest, at the top     as before                             ending_last 6.6, buzz
   knot      7.3-8.4      one lift and push to the knot under the top rail;  the ship rises over the King to the top, ties   the sun (light 0), the knot's glint   ending_knot 7.92, buzz
                          the sun over the rail; one streak at the knot      off (7.95): the thread drawn tight, a ripple    (light 2)
                                                                             through the cloth; it lays itself down
   whole     8.4-10.0     the long pull back and down into the play camera   the whole cloth: eight memories up it on one    the sun's rake fading to plain        (sting: the theme, broad)
                                                                             red running stitch, the hem to the knot         daylight, house lights to full
   end       9.2-11.5     the play camera                                    "The cloth is mended." (9.2) "The end" (10.35)  daylight                              ending_letters 9.2, 10.35
   gold      11.0-11.6    the play camera                                    the morning swells to gold over everything      gold wash (lens flash)                ending_gold 11.0
   rest      11.6-12.6    the play camera                                    out of the gold: the plain cloth, the game's    house lights up
                                                                             own ship on its row; the victory page rises
   still (reduced motion): 10.7, the whole sampler finished, the ship laid down by the knot, under both lines. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, hash } = L;

  // ---------- the run, as a sampler ----------
  /* The eight bosses in the order the run meets them, each a small stitched memory on the cloth: where it sits, how big, and
     when the ship sews it (the middle of its sewing, film seconds). They climb the cloth from the hem, side to side; the
     King last, in the middle at the top. */
  const ORDER = C.PANELS.map(p => p.keeper), NMEM = ORDER.length;
  const MEMX = new Float32Array([-2.95, 2.95, -2.95, 2.95, -2.95, 2.95, -2.95, 0]);
  const MEMY = new Float32Array([0.7, 2.85, 5.0, 7.15, 9.3, 11.45, 13.6, 15.75]);
  const MEMS = new Float32Array([2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 3.0]);        // the longer side of each memory, world units
  const MEMT = new Float32Array([2.55, 3.15, 3.75, 4.35, 4.95, 5.55, 6.15, 6.95]);   // the middle of each one's sewing
  const MEMD = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.75]);          // how long each takes to sew
  const MEMC = new Float32Array(NMEM);                                              // stitch size (set in setup from the chart)
  const MEMR = new Float32Array([0.05, -0.06, 0.04, -0.05, 0.06, -0.04, 0.05, 0]);    // a little tilt each, as a hand sews
  const AGED = [1, 0.9, 0.76];                                                      // the memories' colours, faded warm

  // ---------- the timeline ----------
  const LIFT = 1.1, CHASE = 2.3, TOP = 7.3, KNOT = 7.95, BACK = 8.4, HOME = 9.9, WORDS1 = 9.0, WORDS2 = 10.1, GOLD0 = 11.5, CUTW = 12.1, LEN = 13.0;
  const SUNX = -1.2, SUNY = H + 9, SUNZ = 2.6, SR = 1.05;           // the sun, where Daybreak left it: beyond the top rail at x -1.2
  const GOLDC = [1, 0.7, 0.32], WARM = [1, 0.62, 0.3], HOT = [1, 0.86, 0.62], WASH = [1, 0.8, 0.5];

  /* The ship's flight, keyed: t, x, y, z. Catmull-Rom between. Rows 0 and 1 are where the game left the ship (filled in at the
     start of each play); it weaves up between the memories, passes under the King to sew him, rises over him to the knot and
     lays itself down beside it. */
  const SHIP = new Float32Array([
    0.0, 0, 0, 0.75,
    LIFT, 0, 0, 0.75,
    1.75, 0, 0, 1.1,
    2.55, -0.95, 0.55, 1.15,
    3.15, 0.95, 2.7, 1.15,
    3.75, -0.95, 4.85, 1.15,
    4.35, 0.95, 7.0, 1.15,
    4.95, -0.95, 9.15, 1.15,
    5.55, 0.95, 11.3, 1.15,
    6.15, -0.95, 13.45, 1.15,
    6.95, 0.0, 13.95, 1.2,
    7.55, 0.0, 16.9, 1.3,
    KNOT, 0.0, 17.85, 0.85,
    8.45, 0.8, 17.55, 0.32,
    LEN, 0.8, 17.55, 0.32]);
  const SC = new Float32Array(4), SD = new Float32Array(4);
  function keyed(tab, cols, t, out) {
    const n = tab.length / cols; let i = 0; while (i < n - 2 && t > tab[(i + 1) * cols]) i++;
    const t0 = tab[i * cols], t1 = tab[(i + 1) * cols], s = clamp((t - t0) / (t1 - t0 || 1), 0, 1), s2 = s * s, s3 = s2 * s;
    const a = Math.max(0, i - 1) * cols, b = i * cols, c = (i + 1) * cols, d = Math.min(n - 1, i + 2) * cols;
    for (let j = 1; j < cols; j++) { const p0 = tab[a + j], p1 = tab[b + j], p2 = tab[c + j], p3 = tab[d + j];
      out[j] = 0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (3 * p1 - p0 - 3 * p2 + p3) * s3); }
    return out;
  }
  /* The ship at film time t: SP x, y, z, its roll (it leans into each turn, and lies down at the end), and its eye (where the
     thread leaves it: 0.55 below its middle, as the game draws it). */
  const SP = new Float32Array(8);
  function shipAt(t) {
    keyed(SHIP, 4, t, SC); keyed(SHIP, 4, t + 0.04, SD);
    const vx = SD[1] - SC[1], vy = SD[2] - SC[2], sp = Math.sqrt(vx * vx + vy * vy);
    let rz = sp > 0.004 ? clamp(-Math.atan2(vx, Math.max(0.02, vy)), -0.75, 0.75) : 0;
    rz = lerp(rz, -0.55, sm(KNOT + 0.05, 8.45, t));
    SP[0] = SC[1]; SP[1] = SC[2]; SP[2] = SC[3]; SP[3] = rz;
    SP[4] = SP[0] + Math.sin(rz) * 0.55; SP[5] = SP[1] - Math.cos(rz) * 0.55; SP[6] = SP[2] - 0.05;
  }

  /* The thread the ship pays out: a running stitch lying on the cloth along the eye's path, from its row to the knot. Two ropes
     of 32 nodes, every node pinned at the eye's place at a fixed film time (so the stitches never crawl); nodes not reached yet
     wait at the eye. */
  const TN = 32, TR = 2, T0 = LIFT + 0.05, TDT = (KNOT - T0) / (TN * TR - 2);

  // ---------- his things: the sun, the sky beyond the rail, the rail's holdout ----------
  const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
  /* The morning sun, fully risen: a disc of gold satin stitch in rings (the King's sun, now calm and gold), a warm halo round it.
     Additive, one draw. */
  const QS = 2.6;
  const SUN_FS = `
uniform float uTime, uA;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) * ${(2 * QS).toFixed(2)};
  float r = length(p), a = atan(p.y, p.x);
  vec3 col = vec3(0.);
  if (r < 1.02) {
    float ring = r * 8., row = floor(ring), fr = fract(ring), n = floor(row * 7. + 9.);
    float s = fract(a / 6.28318 * n + row * .37 + fr * .5 + uTime * .01);
    float st = smoothstep(0., .2, s) * smoothstep(1., .7, s) * smoothstep(0., .14, fr) * smoothstep(1., .84, fr);
    float limb = pow(max(0., 1. - r * r), .45);
    col += mix(vec3(2.2, 1.05, .32), vec3(3.2, 2.55, 1.6), limb) * (.55 + .45 * st) * (.35 + .65 * limb) * smoothstep(1.02, .98, r);
  }
  float o = max(0., r - 1.);
  col += vec3(1.25, .78, .34) * exp(-o * 2.1) * smoothstep(.96, 1.06, r) * .55;
  col *= uA;
  if (max(col.r, max(col.g, col.b)) < .004) discard;
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;
  function buildSun(T) {
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), FX.shaderMat(T, { vs: QUAD_VS, fs: SUN_FS, add: true, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uA: { value: 1 } } }));
    m.renderOrder = 6; return m;
  }
  /* The ground beyond the top rail, as seen from low on the cloth: a morning sky, gold at the rail going up into the night's
     navy. It stands where Daybreak's black far flag stood (writes depth, so with the holdout the rail is the horizon). */
  const SKY_FS = `
uniform float uA;
varying vec2 vUv;
void main(){
  float y = vUv.y * 60.;
  vec3 low = vec3(.62, .3, .1), mid = vec3(.16, .07, .1), high = vec3(.012, .012, .03);
  vec3 col = mix(low, mid, smoothstep(0., 7., y));
  col = mix(col, high, smoothstep(5., 26., y));
  gl_FragColor = vec4(col, uA);
  #include <colorspace_fragment>
}`;
  function buildSky(T) {
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), FX.shaderMat(T, { vs: QUAD_VS, fs: SKY_FS, transparent: true, uniforms: { uA: { value: 1 } } }));
    m.renderOrder = -3; m.position.set(0, H - 0.05 + 30, 0.6); m.scale.set(80, 60, 1); return m;
  }
  /* The top rail again, only in the depth buffer (the renderer forgets the ground's depth): the sun stays behind it. */
  function buildHoldout(T) { const m = new T.Mesh(new T.BoxGeometry(W + 1.8, 0.9, 0.7), new T.MeshBasicMaterial({ colorWrite: false })); m.renderOrder = -3.9; m.position.set(0, H + 0.45, 0.2); return m; }

  /* The Royal weave, the cloth of the King's stage: the film's cloth wherever it is played. In the game it is already down
     (the ending follows the King); a preview from the menus puts it down for the film and back after. */
  const FAB = { prev: null, mine: false };
  function royal() { const p = C.PANELS[C.PANELS.length - 1]; return p && p.fabric; }

  // per play: where the game left its ship, and which ship it is; the stitched memories and the ship; the thread's stitches
  const HOME0 = { x: 0, y: GY + 0.25, sim: false, needle: 'sharps' };
  const MS = [], SHIPS = [null];
  const TX = new Float32Array(TN * TR), TY = new Float32Array(TN * TR);

  const ENDING = {
    kit: true, len: LEN, key: 11.2, lights: 3,
    sheet: [0.6, 1.7, 2.6, 3.9, 5.5, 7.0, 7.9, 8.8, 9.9, 11.2, 11.95, 12.6],
    beats: {
      morning: [0, LIFT, 'io'],
      lift:    [LIFT, CHASE, 'io'],
      climb:   [CHASE, 6.6, 'lin'],
      crown:   [6.6, TOP, 'out'],
      knot:    [TOP, BACK, 'io'],
      whole:   [BACK, HOME, 'io'],
      end:     [WORDS1, GOLD0, 'lin'],
      gold:    [GOLD0, CUTW, 'in'],
      rest:    [CUTW, LEN, 'out']
    },
    titles: [
      { text: 'The cloth is mended.', sub: false, at: WORDS1, iv: 0.055, in: 'endsew', pos: [0.5, 0.795], to: 11.75, size: 1 },
      { text: 'The end', sub: false, at: WORDS2, iv: 0.1, in: 'endsew', pos: [0.5, 0.865], to: 11.75, size: 0.5, rule: false }
    ],
    /* The words arrive as the title page's wordmark is sewn: each letter drops in hot, glowing saffron, and cools to the
       wordmark's own linen with its madder shadow. */
    css: '.fk-t.i-endsew .fk-n span.on{animation:end-sew .9s cubic-bezier(.2,.8,.25,1) both}.i-endsew .fk-rule{border-top-color:#E3A93C}' +
      '@keyframes end-sew{0%{opacity:0;transform:translateY(-.16em) scale(.9);color:#FFF4D6;text-shadow:0 0 .55em #E3A93C,0 0 .14em #FFF4D6;filter:blur(1.5px)}' +
      '28%{opacity:1;transform:none;color:#FFF4D6;text-shadow:0 0 .42em #E3A93C,0 .055em 0 #A82A33;filter:none}100%{}}',
    /* The sting is one file from film 0; the film has no slow motion, so its times are real seconds too. */
    music: { name: 'ending_sting', len: 14.5, gain: 0.85, desc: 'The music for the end of the whole game, played straight after the Moth King\'s death music, which ends on a calm, golden, open major chord held by strings. Instrumental. Warm and tender, full of wonder, never loud. From 0 s that same calm golden major chord, soft strings and a little organ, held and breathing, as if it never stopped. At 1.1 s a soft rising harp figure as something lifts off. From 2.5 s a music box (or celesta) plays a simple, tender rising melody, one note each at 2.55, 3.15, 3.75, 4.35, 4.95, 5.55 and 6.15 s, seven notes climbing, while warm low strings move underneath. At 6.6 s the eighth note, higher, held, with warm horns entering softly under it. At 7.95 s a soft resolving harp chord, like a knot tied. From 8.4 s the full theme opens up: broad, warm strings and horns, the music box melody now carried by the whole orchestra, swelling gently, not loud, as the whole picture is seen. At 10.35 s the melody comes home on its final cadence, a warm major chord. From 11.0 s a soft shimmering swell of high strings and a wordless choir-like pad rising to 11.6 s, then settling back into the same calm golden chord the piece began on, ringing out quietly and fading away by 14.5 s' },
    sounds: {
      ending_morning: { at: 0.0, len: 2.6, gain: 0.4, desc: 'Morning light coming into a quiet room: a soft warm hush of air that swells gently over 1 s, with a faint high glassy shimmer of sunlight on top; it holds, still and peaceful, and thins away by 2.6 s. No birds, no music' },
      ending_lift:    { at: LIFT, len: 1.4, gain: 0.55, desc: 'A small needle-shaped ship lifting gently off cloth and setting off: a soft airy rising whoosh over 0.6 s with a thin, sweet, silvery hum of steel on top, and from 0.3 s the faint quick rustle of a thread being drawn out behind it; fades by 1.4 s' },
      ending_sew:     { at: [MEMT[0] - 0.25, MEMT[1] - 0.25, MEMT[2] - 0.25, MEMT[3] - 0.25, MEMT[4] - 0.25, MEMT[5] - 0.25, MEMT[6] - 0.25], len: 0.6, gain: 0.45, desc: 'A small cross-stitch picture being sewn very quickly: six soft needle-through-cloth ticks in a quick run over 0.45 s, each with the faint zip of thread pulled through, ending with a tiny soft pluck as the thread pulls snug at 0.48 s. Gentle, close, warm' },
      ending_last:    { at: MEMT[7] - 0.35, len: 1.1, gain: 0.55, desc: 'The last and biggest cross-stitch picture sewn: nine soft needle-through-cloth ticks over 0.75 s, slowing a little toward the end, each with the faint zip of thread, then at 0.78 s a soft warm glassy bloom like light settling, fading by 1.1 s' },
      ending_knot:    { at: KNOT - 0.03, len: 1.0, gain: 0.6, desc: 'A thread being tied off in a knot and drawn tight: a quick soft rustle of a loop for 0.15 s, the small taut creak of thread pulled tight at 0.18 s, then one soft bright pluck, like a single damped harp string, at 0.22 s that rings briefly and fades by 1 s' },
      ending_letters: { at: [WORDS1, WORDS2], len: 1.2, gain: 0.35, desc: 'Words being sewn on, one letter at a time: a run of soft quick needle ticks, about one every 0.06 s for 1.1 s, each with a faint thread zip, very light and even' },
      ending_gold:    { at: GOLD0, len: 2.2, gain: 0.5, desc: 'Warm light filling everything: a soft bright airy swell rising over 0.6 s with a gentle shimmer of tiny high chimes, peaking at 0.6 s, then settling down into a calm hush and fading by 2.2 s. Not loud, no impact' }
    },
    buzz: [[LIFT, 12], [MEMT[7], 14], [KNOT, [16, 30, 26]]],
    steps: [
      [0.0, k => { const r = k.r; if (r.afterglowStop && r.cel && r.cel.on) r.afterglowStop(); }],   // the fireworks' light afterglow ends: the film has the cloth
      [MEMT[0] + 0.26, k => memDone(k, 0)], [MEMT[1] + 0.26, k => memDone(k, 1)], [MEMT[2] + 0.26, k => memDone(k, 2)], [MEMT[3] + 0.26, k => memDone(k, 3)],
      [MEMT[4] + 0.26, k => memDone(k, 4)], [MEMT[5] + 0.26, k => memDone(k, 5)], [MEMT[6] + 0.26, k => memDone(k, 6)], [MEMT[7] + 0.38, k => memDone(k, 7)],
      [KNOT, k => { const r = k.r, K = k.K; r.glints(KX[0], KX[1], 0.3, 10, K.saffHi, 2.2, 0.28, 0.55); r.glints(KX[0], KX[1], 0.3, 4, K.ember, 1.2, 0.22, 0.4); }],
      [CUTW, k => { if (!k.still) document.body.classList.remove('stc-solo'); }]   // the page may come up now, over the gold (as the title film lets its page in)
    ],
    setup(k) {
      for (let i = 0; i < NMEM; i++) { const id = ORDER[i], kp = C.KEEPERS[id], sp = kp && C.SPRITES[kp.sprite], rows = sp && sp.rows ? sp.rows.length : 20, cols = sp && sp.rows ? sp.rows[0].length : 20;
        MEMC[i] = Math.round(MEMS[i] / Math.max(cols, rows * 1.05) * 1000) / 1000; MS[i] = k.stitched(kp.sprite, MEMC[i]); }
      const g = ST.game, sim = g && g.sim, pl = sim && sim.player;
      HOME0.sim = !!pl; HOME0.x = pl ? pl.x : 0; HOME0.y = (pl ? pl.y : GY) + 0.25;
      const ndl = (sim && sim.d && sim.d.needle && C.SPRITES[sim.d.needle]) ? sim.d.needle : 'sharps';
      HOME0.needle = ndl; SHIPS[0] = k.stitched(ndl, 0.1);
      SHIP[1] = SHIP[5] = HOME0.x; SHIP[2] = SHIP[6] = HOME0.y; SHIP[9] = HOME0.x * 0.45; SHIP[10] = HOME0.y + 1.25;
      for (let g = 0; g < TN * TR; g++) { shipEye(Math.min(KNOT, T0 + Math.min(g, TN * TR - 2) * TDT)); TX[g] = EY[0]; TY[g] = EY[1]; }   // the thread's stitches, laid once
      for (let j = 0; j < TR; j++) k.rope(j).lay(TN, 0, 0, 0, 0, 1, 0);
      k.prop('sun', buildSun); k.prop('sky', buildSky); k.prop('holdout', buildHoldout);
      FAB.mine = false; FAB.prev = null;
    },
    teardown(k) {
      const r = k.r; if (r.playerGroup) r.playerGroup.visible = true;
      if (FAB.mine && r.setFabric) { r.setFabric(FAB.prev); FAB.mine = false; FAB.prev = null; }
    },
    frame(k, t, dt) {
      const r = k.r, K = k.K, cam = k.cam, lens = k.lens, post = k.has.post ? 1 : 0.5, time = r.time;
      // the King's cloth (in the game it is already down: this does nothing)
      const fab = royal(); if (fab && r.setFabric && r.fabric !== fab) { if (!FAB.mine) { FAB.prev = r.fabric; FAB.mine = true; } r.setFabric(fab); }
      const cut = t >= CUTW;   // under the gold: the sampler goes, the game's ship is back
      shipAt(t);

      // ---- the camera: one take
      if (t < LIFT - 0.1) cam.home();
      else if (t < CHASE) { cam.home().mark(); chaseCam(k, t); cam.mix(k.ease.io(k.span(LIFT - 0.1, CHASE))); }
      else if (t < TOP) chaseCam(k, t);
      else if (t < BACK) { chaseCam(k, t); cam.mark(); knotCam(k, t); cam.mix(k.ease.io(k.span(TOP, 8.15))); }
      else if (t < HOME) { knotCam(k, t); cam.mark(); wideCam(k); cam.mix(k.ease.io(k.span(BACK, HOME))); }
      else if (!cut) wideCam(k);
      else cam.home();   // CUT under the gold to the play camera
      cam.full(t < LIFT ? 0 : cut ? 0 : k.ease.io(k.span(LIFT, 2.0)));

      // ---- light: the morning sun beyond the rail rakes down the cloth; the ship's own light; the knot's glint
      const sunUp = k.ease.io(k.span(0, 1.4)) * (1 - 0.45 * k.ease.io(k.span(BACK, HOME))), low = k.ease.io(k.span(LIFT, CHASE)) * (1 - k.ease.io(k.span(BACK, HOME)));
      k.dark(0.55 * low, 0); k.vig(0.35 * low);
      if (!cut) {
        // the sun is far, but its light is drawn close over the rail so it falls off down the cloth: warm at the top, the hem in shade
        if (sunUp > 0.01) { k.light(0, SUNX * 0.5, H + 2.5, 4.5, GOLDC, 70 * sunUp * post, 22); k.pool(SUNX * 0.4, H - 1.5, 12, K.saff, 0.06 * sunUp * post); }
        const sl = (t > LIFT - 0.2 && t < 9.6) ? sm(LIFT - 0.2, LIFT + 0.4, t) * (1 - sm(8.6, 9.6, t)) : 0;
        if (sl > 0.01) { k.light(1, SP[4], SP[5] - 0.1, SP[6] + 0.55, WARM, 7 * sl * post, 4); k.pool(SP[4], SP[5] - 0.2, 2.2, K.saff, 0.05 * sl * post); }
        const kg = k.pulse(KNOT, 0.04, 0.9);
        if (kg > 0.01) k.light(2, KX[0], KX[1], 1.0, GOLDC, 26 * kg * post, 5);   // (past the tier's lights: a pool)
      }

      // ---- the sky beyond the rail, the sun in it (only in the shots that can see over the rail)
      const over = !cut && t > LIFT && t < 9.7 && !k.reduce, ov = k.ease.io(k.span(LIFT, 2.0)) * (1 - k.ease.io(k.span(8.6, 9.6)));
      if (over) {
        k.prop('sky').material.uniforms.uA.value = ov; k.prop('holdout').position.set(0, H + 0.45, 0.2);
        const sun = k.prop('sun'), s = 2 * QS * SR; sun.position.set(SUNX, SUNY, SUNZ); sun.lookAt(cam.px, cam.py, cam.pz); sun.scale.set(s, s, 1);
        sun.material.uniforms.uTime.value = t; sun.material.uniforms.uA.value = 0.42 * sunUp * ov;
        if (!k.has.post) k.flare(SUNX, SUNY, SUNZ, SR * 3.2, K.saffDim, 0.6 * sunUp * ov, 0);
      }

      // ---- the game's own ship: the film flies it, so the game's copy is hidden until the gold
      if (r.playerGroup) r.playerGroup.visible = cut && HOME0.sim;
      if (!cut && r.droneMesh) { r.droneMesh.visible = false; if (r.droneMesh2) r.droneMesh2.visible = false; }

      if (!cut) {
        // ---- the memories: each sewn as the ship passes, a hot saffron front, then a warm glow cooling
        for (let i = 0; i < NMEM; i++) {
          const a = MEMT[i] - MEMD[i] * 0.5, u = (t - a) / MEMD[i]; if (u <= 0) continue;
          const s = MS[i], done = t - (a + MEMD[i]);
          const glow = u < 1 ? 0.04 : 0.16 * Math.exp(-done * 2.4) + 0.05 * k.pulse(KNOT + 0.1 + i * 0.06, 0.1, 0.5) + 0.55 * k.pulse(MRUN[i], 0.06, 0.5) + 0.5 * k.ease.in(k.span(CUTW - 0.3, CUTW));
          s.at(MEMX[i], MEMY[i], 0.05, MEMR[i], 1, AGED, glow).edge(K.saffHi, 1.2);
          if (u < 1) { s.sew(u, 'rows');   // the working thread: from the ship's eye down to the stitch going in
            k.thread(SP[4], SP[5], SP[6], s.fx, s.fy, 0.08, 0.026, k.lit(K.madderHi, s.fx, s.fy, 0.4), 0.95, 1, 0.12);
            k.thread(SP[4], SP[5], SP[6], s.fx, s.fy, 0.08, 0.012, K.saffHi, 0.5, 0, 0.12, true);
            r.spr.add(s.fx, s.fy, 0.14, 0.32, K.saffHi, 0.8, 0); }
          else s.sew(1, 'rows');
        }

        // ---- the thread it pays out: a red running stitch on the cloth, from its row to the knot. Every stitch already laid
        // stays where it is; the ones not reached yet wait at the eye's place now; the last length rises to the eye
        if (t > T0) {
          const te = Math.min(t, KNOT), col = k.lit(K.madderHi, 0, CY, 0.3, 0.5), n = Math.min(TN * TR - 2, Math.floor((te - T0) / TDT));
          shipEye(te);
          for (let j = 0; j < TR; j++) { const rp = k.rope(j);
            for (let i = 0; i < TN; i++) { const g = j * (TN - 1) + i; if (g <= n) rp.pin(i, TX[g], TY[g], 0.045); else rp.pin(i, EY[0], EY[1], 0.045); } }
          const m = n + 1;   // the node at the eye's place now
          const tw = lerp(0.06, 0.1, k.ease.io(k.span(BACK, HOME)));   // thicker as the camera pulls back, so it still reads in the wide
          k.rope(0).draw(tw, col, 0.95, 2, false, 0, Math.min(TN - 1, m));
          if (m > TN - 1) k.rope(1).draw(tw, col, 0.95, 2, false, 0, m - (TN - 1));
          if (t < KNOT) k.thread(EY[0], EY[1], 0.045, SP[4], SP[5], SP[6], 0.03, k.lit(K.madderHi, SP[4], SP[5], SP[6]), 0.9, 1, 0);
        }

        // the light runs back down the thread from the knot to the hem, through every memory (the gold comes out of it)
        if (t > RUN0 && t < CUTW) { const f = runAt(t), g0 = Math.max(0, Math.floor(f) - 3), g1 = Math.min(TN * TR - 2, Math.ceil(f) + 3), a = 1 - sm(CUTW - 0.25, CUTW, t);
          for (let j = 0; j < TR; j++) { const lo = g0 - j * (TN - 1), hi = g1 - j * (TN - 1); if (hi < 1 || lo > TN - 1) continue;
            k.rope(j).draw(0.13, K.saffHi, 0.9 * a, 0, true, Math.max(0, lo), Math.min(TN - 1, hi)); }
          const gi = Math.max(0, Math.min(TN * TR - 2, Math.round(f))); r.spr.add(TX[gi], TY[gi], 0.12, 0.9, K.saffHi, 0.9 * a, 0); }

        // ---- the knot, and the ship laid down beside it
        if (t >= KNOT) {
          const kb = k.pulse(KNOT, 0.04, 0.6);
          k.c.ball(KX[0], KX[1], 0.07, 0.085 + 0.03 * kb, 0.085 + 0.03 * kb, 0.07, 0, K.madder, 0, 0.3 + 1.2 * kb);
          k.thread(KX[0], KX[1], 0.07, SP[4], SP[5], SP[6], 0.025, k.lit(K.madderHi, SP[4], SP[5], 0.3), 0.9, 1, 0.05);
          if (kb > 0.01) k.flare(KX[0], KX[1], 0.25, 0.5 + 1.2 * kb, K.saffHi, kb, 1.2);
          if (t < KNOT + 1.0) { const v = (t - KNOT) / 1.0; k.cloth.wave(KX[0], KX[1], 0.3 + v * 7, 0.07 * (1 - v) * (1 - v), 0.7); }
        }

        // ---- the ship: lifted off its row, leaning into each turn, its eye catching the light
        const ship = SHIPS[0], bob = Math.sin(time * 3) * 0.04 * (1 - sm(KNOT, 8.45, t));
        ship.at(SP[0], SP[1], SP[2] + bob, SP[3], 1, null, 0.05 + 0.25 * k.pulse(0.6, 0.25, 0.6));
        const tip = 0.62, tx = SP[0] - Math.sin(SP[3]) * tip, ty = SP[1] + Math.cos(SP[3]) * tip, cyc = (t % 2.6) / 2.6, sw = cyc < 0.12 ? Math.sin(cyc / 0.12 * PI) : 0;
        r.spr.add(tx, ty, SP[2] + 0.25, 0.5 + 1.2 * sw + 1.4 * k.pulse(0.6, 0.2, 0.7), K.glare, 0.6 + 0.4 * sw, 1, t * 0.6);
        r.spr.add(SP[4], SP[5] + 0.1, SP[2] + 0.05, 0.6, K.madderHi, 0.3, 0);
        if (t > LIFT && t < KNOT) k.motes(24, SP[0] - 3, SP[1] - 1, 0.3, SP[0] + 3, SP[1] + 6, 3, K.saffHi, 0.35 * low, 0.05, 0.25, 7);
      }

      // ---- the lens
      if (!k.reduce) {
        if (t > LIFT && t < BACK) lens.focus(SP[0], SP[1] + 0.2, SP[2], lerp(0.2, 0.6, k.ease.io(k.span(LIFT, CHASE))) * (1 - k.ease.io(k.span(TOP + 0.2, BACK))), 0.014);
        const kp = k.pulse(KNOT, 0.03, 0.4);
        lens.streak(0.9 * kp, K.saff, 2.6, 0.9); lens.fringe(0.25 * kp);
        // the gold: the picture burns in from its highlights (exposure), and only at the last the wash covers the cut
        const e = k.ease.in(k.span(GOLD0 + 0.15, CUTW)) * (1 - k.ease.out(k.span(CUTW + 0.05, LEN - 0.25))), w = k.ease.in2(k.span(CUTW - 0.3, CUTW)) * (1 - k.ease.out(k.span(CUTW + 0.05, LEN - 0.25)));
        if (e > 0.002) { lens.exposure(1 + 1.8 * e); lens.flash(WASH, 1.5 * w + 0.15 * e); }
      }
      k.gate(t < CUTW ? 0.11 * Math.min(1, k.ease.out(k.span(0, 0.34))) : 0.11 * (1 - k.ease.io(k.span(CUTW + 0.2, LEN - 0.2))));
    }
  };

  /* Where the eye was at film time tj, into EY. */
  const EY = new Float32Array(2), KX = new Float32Array(2);
  function shipEye(tj) { keyed(SHIP, 4, tj, SC); keyed(SHIP, 4, tj + 0.04, SD); const vx = SD[1] - SC[1], vy = SD[2] - SC[2], sp = Math.sqrt(vx * vx + vy * vy); const rz = sp > 0.004 ? clamp(-Math.atan2(vx, Math.max(0.02, vy)), -0.75, 0.75) : 0; EY[0] = SC[1] + Math.sin(rz) * 0.55; EY[1] = SC[2] - Math.cos(rz) * 0.55; }
  shipEye(KNOT); KX[0] = EY[0]; KX[1] = EY[1];   // the knot: where the eye is when it ties off

  /* The run of light down the thread: where it is (a stitch index, 62 the knot, 0 the hem) at film time t, and when it passes
     each memory (MRUN). */
  const RUN0 = GOLD0 - 0.1, RUN1 = CUTW - 0.15, MRUN = new Float32Array(NMEM);
  function runAt(t) { return (TN * TR - 2) * (1 - k2(clamp((t - RUN0) / (RUN1 - RUN0), 0, 1))); }
  function k2(u) { return u * u * (3 - 2 * u); }
  for (let i = 0; i < NMEM; i++) { const g = clamp((MEMT[i] - T0) / TDT, 0, TN * TR - 2), u = 1 - g / (TN * TR - 2); let lo = 0, hi = 1; for (let n = 0; n < 30; n++) { const m = (lo + hi) / 2; if (k2(m) < u) lo = m; else hi = m; } MRUN[i] = RUN0 + lo * (RUN1 - RUN0); }

  /* A memory finished: a little puff of gold where its last stitch went in. */
  function memDone(k, i) { const r = k.r, K = k.K; r.glints(MEMX[i], MEMY[i], 0.3, i === 7 ? 12 : 6, K.saffHi, i === 7 ? 2.4 : 1.6, 0.26, 0.5); }

  /* Behind and below the ship, looking up the cloth past it toward the light. */
  function chaseCam(k, t) {
    const cam = k.cam; cam.fov = 44;
    cam.orbit(SP[0] * 0.55, SP[1] + 1.8, 0.6, cam.fit(8.4, 8.4), 0.93, 0.08 * Math.sin(t * 0.45 + 0.6), -0.02 * Math.sin(t * 0.8));
  }
  /* Up at the top: the knot under the rail, the sun over it. */
  function knotCam(k, t) {
    const cam = k.cam; cam.fov = 36;
    cam.orbit(-0.3, H - 0.9, 0.8, cam.fit(4.8, 4.8), 0.98, -0.06, 0.01);
  }
  /* The whole piece, framed, hanging: the cloth in its frame in the top of the picture, the dark table under it for the words. */
  function wideCam(k) { const cam = k.cam; cam.fov = 30; cam.frame(0, 3.3, W + 2.8, 34.5, 0.08, 0, 0); }

  ST.registerFilm('ending', { solo: true, entrance: ENDING });
})(window.ST);
