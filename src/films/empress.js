/* String Theory — the films of the Silk Empress: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.

   Her films are about one thing: a web of silk in moonlight. Their camera language is the vertical crane (the camera rides a
   line down, then booms under the web and looks up it), perfect symmetry about the plumb line through the web's middle, and the
   slow rack of focus. Their colour is paper white on a cold, near-black damask, lit by one moon. Their rhythm is the pluck: a
   line dropped, its snap taut; then pairs of them, quicker; then a held, slow descent. Their props are her own, built here:
   a moon of white silk stretched in a hoop (a disc with its own shader) that rises behind the top of her web, the web (drawn
   from the film clock: radials, the capture rings and the dew on them) and, in her death, the cocoon she winds round herself
   (a spindle of wound silk with its own shader). */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const WEB = (function () {   // the old films' web: anchors round the frame, in angle order about the centre (the sig uses it)
    const cx = 0, cy = 9.6, a = [[-6.8, -3.1], [6.8, 18.4], [6.8, -3.1], [-6.8, 18.4], [-6.8, 7.8], [6.8, 7.8], [0, 18.4], [0, -3.1]];
    const ang = a.map(p => Math.atan2(p[1] - cy, p[0] - cx)), order = a.map((p, i) => i).sort((i, j) => ang[i] - ang[j]);
    return { cx, cy, a, ang, order, dist: a.map(p => hyp(p[0] - cx, p[1] - cy)) };
  })();

  // =====================================================================================================================
  //  Her things: the web, the moon, the cocoon
  // =====================================================================================================================
  /* The web. Its top seven anchors are her rim anchors, exactly where her fight pins them (src/boss/empress.js RIM); three more
     are pinned low in the ship's half for the film. Index 0 is the top of the plumb line, 9 its foot; odd indices are on the
     right, even on the left, so every pair (1,2) (3,4) (5,6) (7,8) is a mirror pair. The hub is on the plumb line. */
  const AX = new Float32Array([0, 3.6, -3.6, 6.2, -6.2, 6.2, -6.2, 3.4, -3.4, 0]);
  const AY = new Float32Array([17.2, 16.6, 16.6, 13.8, 13.8, 9.6, 9.6, 6.2, 6.2, 5.4]);
  const HUBY = 12.2, WZ = 0.7, NA = 10, RINGS = 7;
  const RLEN = new Float32Array(NA); for (let i = 0; i < NA; i++) RLEN[i] = hyp(AX[i], AY[i] - HUBY);
  const HALF = [new Int8Array([0, 1, 3, 5, 7, 9]), new Int8Array([0, 2, 4, 6, 8, 9])];   // the two halves of a ring, top to foot
  function ringF(s) { return 0.9 - s * 0.098; }                                            // ring s lies this far out along every radial
  /* The moon: a disc of white silk in a hoop, behind the top of the web. Linear colours. */
  const MX = 0, MZ = 0.25, MR = 2.05; let MY = 17.5;   // MY: where the moon is this frame (it rises)
  const MOON = [0.55, 0.72, 1.0], MOONHI = [1.5, 1.75, 2.1], PAPER = [1.0, 0.985, 0.955], COOL = [0.42, 0.6, 1.0];
  const SG = new Float32Array(3), SC = new Float32Array(3), DC = new Float32Array(3);   // scratch colours (silk glow, silk core, dew)
  const PX = new Float32Array(64), PY = new Float32Array(64), PZ = new Float32Array(64), PS = new Float32Array(64);   // scratch polyline
  const TX = new Float32Array(NA), TY = new Float32Array(NA), TS = new Float32Array(NA), TO = new Float32Array(NA);   // each line's tip, sag, how much of it shows
  const QX = new Float32Array(NA), QY = new Float32Array(NA);   // each line's pivot (an anchor, or the hub for the three low ones)
  let SAVED = null, LOWQ = false; const NOPROPS = [];   // LOWQ: this frame is on the low tier (no post pass): fewer sprites per bead

  /* How brightly the moon, behind the web, lights silk at (x, y): silk is lit from behind, so it glows most across the moon. */
  function moonK(x, y) { const dx = x - MX, dy = y - MY; return 0.5 + 1.6 / (1 + (dx * dx + dy * dy) / 7); }
  /* One silk line this frame: a soft glow round it (additive, the silk style, its sheen running along it) and a fine bright
     core. b is how much light it catches. */
  function silk(k, ax, ay, az, bx, by, bz, b, a, sag) {
    if (a <= 0.01) return; const g = 0.24 * b, cc = 0.78 * b;
    SG[0] = MOON[0] * g; SG[1] = MOON[1] * g; SG[2] = MOON[2] * g; SC[0] = PAPER[0] * cc; SC[1] = PAPER[1] * cc; SC[2] = PAPER[2] * cc;
    k.thread(ax, ay, az, bx, by, bz, 0.085, SG, a, 7, sag, true);
    k.thread(ax, ay, az, bx, by, bz, 0.03, SC, a, 3, sag, false);
  }
  /* A polyline in PX.. (m points) as silk. */
  function silkPoly(k, m, b, a) {
    if (m < 2 || a <= 0.01) return; let len = 0; PS[0] = 0; for (let i = 1; i < m; i++) { len += hyp(PX[i] - PX[i - 1], PY[i] - PY[i - 1]); PS[i] = len; }
    const g = 0.2 * b, cc = 0.6 * b, cam = k.cam;
    SG[0] = MOON[0] * g; SG[1] = MOON[1] * g; SG[2] = MOON[2] * g; SC[0] = PAPER[0] * cc; SC[1] = PAPER[1] * cc; SC[2] = PAPER[2] * cc;
    k.ribA.strip(PX, PY, PZ, PS, m, 0.08, 0.08, SG, a, a, 7, 0, cam.px, cam.py, cam.pz);
    k.ribN.strip(PX, PY, PZ, PS, m, 0.026, 0.026, SC, a, a, 3, 0, cam.px, cam.py, cam.pz);
  }
  /* A dew bead on the silk: a cold point of moonlight, twinkling as the eye moves; tw adds a glint. */
  function dew(k, x, y, z, s, b, tw) {
    const r = k.r, f = Math.min(2.2, b); DC[0] = MOONHI[0] * f * 0.5; DC[1] = MOONHI[1] * f * 0.5; DC[2] = MOONHI[2] * f * 0.5;
    r.spr.add(x, y, z, s, DC, 0.9, 0); if (!LOWQ || s > 0.3) r.spr.add(x, y, z + 0.01, s * 0.38, k.K.glare, Math.min(1, 0.45 * f), 0);
    if (tw > 0.05) r.spr.add(x, y, z + 0.02, s * 4.2 * tw, DC, 0.8 * tw, 1, 0.785);
  }
  /* A pin: a brass head and a knot of silk where a line is tied to the cloth, lit as the moon leaves it. */
  function pin(k, x, y, b) {
    const c = k.c, r = k.r, K = k.K, br = K.brass, f = Math.min(1.4, 0.35 + 0.45 * b); c.ball(x, y, 0.5, 0.17, 0.17, 0.13, 0, K.linen, 0, 0.05);
    DC[0] = MOON[0] * 0.35 * b; DC[1] = MOON[1] * 0.35 * b; DC[2] = MOON[2] * 0.35 * b; r.spr.add(x, y, 0.62, 0.8, DC, 0.5, 7, x * 3);
    DC[0] = br[0] * f; DC[1] = br[1] * f; DC[2] = br[2] * f; r.spr.add(x, y, 0.95, 0.24, DC, 0.85, 0);
  }

  /* The moon: one quad turned to the lens. A disc of white silk (a faint weave, a soft limb and a few pale shadows in it, as a
     moon has) in a thin brass hoop, inside a cold halo. uA its brightness, uHot the white-out (it burns to paper white). */
  const MOON_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
  const MOON_FS = `
uniform float uA, uHot, uTime;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p) * 2.;            // the disc's rim at r = 1, the quad's edge at r = 2
  float disc = smoothstep(1., .985, r), limb = sqrt(max(0., 1. - r * r));
  vec2 w = p * 46.; float weave = .9 + .05 * sin(w.x * 3.1416) * sin(w.y * 3.1416) + .05 * sin((w.x + w.y) * 1.5708);
  float mare = vnoise(p * 3.1 + 7.) * .6 + vnoise(p * 7.3 - 2.) * .4;
  vec3 silk = vec3(.9, .94, 1.) * (.62 + .38 * limb) * weave * (1. - .26 * smoothstep(.42, .75, mare));
  float hoop = smoothstep(.035, .0, abs(r - 1.03));
  float halo = (exp(-(r - 1.) * 3.4) * .3 * step(1., r) + exp(-r * r * .9) * .1) * smoothstep(2., 1.3, r);   // gone by the quad's edge
  vec3 c = silk * disc * .82 + vec3(.6, .47, .26) * hoop * .7 + vec3(.45, .62, 1.) * halo;
  c = mix(c, vec3(4.2, 4.15, 4.05) * (disc + halo * 2.2), uHot);
  float a = uA * max(disc, max(hoop * .8, halo * 2.));
  if (a < .003) discard;
  gl_FragColor = vec4(c * uA, 1.);
  #include <colorspace_fragment>
}`;
  function buildMoon(T) {
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), FX.shaderMat(T, { vs: MOON_VS, fs: MOON_FS, add: true, side: T.DoubleSide, uniforms: { uA: { value: 1 }, uHot: { value: 0 }, uTime: { value: 0 } } }));
    m.frustumCulled = false; m.renderOrder = 1; return m;
  }
  function moon(k, a, hot) {
    if (a <= 0.003) return; const m = k.prop('moon'), u = m.material.uniforms, s = MR * 4 * (1 + 0.18 * hot); if (!k.has.post) a *= 0.72;   // no tone mapping on low: it would burn
    m.position.set(MX, MY, MZ); m.lookAt(k.cam.px, k.cam.py, k.cam.pz); m.scale.set(s, s, 1); u.uA.value = a; u.uHot.value = hot; u.uTime.value = k.t;
  }

  /* A black flag over the top rail and the table above it, as a lighting crew rigs one: the moon lights the rail, and a lit rail
     reads as a shelf across the moon. Its lower edge is soft, so the cloth under it falls off into the dark. Drawn after the
     ground and behind everything of hers (the moon included); uA fades it as the house lights come back. */
  function buildFlag(T) {
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), FX.shaderMat(T, { vs: MOON_VS, fs: 'uniform float uA; varying vec2 vUv; void main(){ gl_FragColor = vec4(0., 0., 0., uA * smoothstep(0., .13, vUv.y)); }', transparent: true, depthWrite: false, uniforms: { uA: { value: 1 } } }));
    m.renderOrder = -3; m.frustumCulled = false; return m;
  }
  function flag(k, a) { if (a <= 0.01) return; const f = k.prop('flag'); f.position.set(0, H - 1.5 + 7.5, 0.05); f.scale.set(70, 15, 1); f.material.uniforms.uA.value = Math.min(1, a); }

  /* The cocoon: a spindle of wound silk. Bands of thread wind round it on a helix that turns as it spins (uSpin); uCover winds
     them on from its waist out to its two points; lit from behind by the moon (a bright rim) and glowing through where it is thin. */
  const COC_VS = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
  const COC_FS = `
uniform float uCover, uSpin, uLight, uA;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float v = vUv.y, u = vUv.x;
  float reach = abs(v - .5) * 2.;                                    // 0 at the waist, 1 at the points
  if (reach > uCover * 1.08) discard;
  float h1 = sin((u * 6.2832 * 3. + v * 38. + uSpin) ), h2 = sin((u * 6.2832 * -2. + v * 31. - uSpin * .7) + 1.3);
  float band = .55 + .25 * smoothstep(.2, .9, h1) + .2 * smoothstep(.4, .95, h2);
  float fine = .85 + .15 * sin(v * 420. + u * 40.);
  vec3 n = normalize(vN), e = normalize(vV);
  float rim = pow(1. - abs(dot(n, e)), 2.2), lam = max(0., dot(n, normalize(vec3(-.25, .55, .8))));
  vec3 c = vec3(.92, .94, 1.) * (.16 + .5 * lam) * band * fine * uLight + vec3(.55, .72, 1.) * rim * 1.1 * uLight;
  float edge = smoothstep(uCover * 1.08, uCover * 1.08 - .08, reach);
  gl_FragColor = vec4(c, uA * edge);
  #include <colorspace_fragment>
}`;
  function buildCocoon(T) {
    const pts = []; for (let i = 0; i <= 24; i++) { const v = i / 24, r = Math.pow(Math.sin(PI * v), 0.72) * (1 - 0.12 * v); pts.push(new T.Vector2(Math.max(0.001, r), v - 0.5)); }
    const geo = new T.LatheGeometry(pts, 22);
    const m = new T.Mesh(geo, FX.shaderMat(T, { vs: COC_VS, fs: COC_FS, transparent: true, side: T.FrontSide, uniforms: { uCover: { value: 1 }, uSpin: { value: 0 }, uLight: { value: 1 }, uA: { value: 1 } } }));
    m.frustumCulled = false; m.renderOrder = 4; return m;
  }

  /* While her entrance plays, the fight's own drawing of her rim (anchors and lines, drawn by the renderer from the sim's props)
     is held back, so the lines can drop one by one in the dark; it is put back at the cut, and whenever the film ends. The sim
     does not run during a film, so nothing but the drawing notices. */
  function holdProps(k, on) {
    const s = k.c && k.c.sim; if (!s) return;
    if (on) { if (s.props !== NOPROPS) { SAVED = s.props; s.props = NOPROPS; } }
    else if (s.props === NOPROPS) {
      const keep = SAVED || [];
      if (!s.boss || s.bossDown) keep.length = 0;               // the fight ended while they were held back (a kill clears them)
      for (let i = 0; i < NOPROPS.length; i++) keep.push(NOPROPS[i]);
      NOPROPS.length = 0; s.props = keep; SAVED = null;
    }
  }
  function walkPose(k) { const ps = k.r.bf && k.r.bf.pose; if (ps && ps.id === 'empress') { ps.walk = 1; ps.spin = 0; } }

  // =====================================================================================================================
  //  The entrance: "Plumb Line"
  // =====================================================================================================================
  /* Black. A moon of white silk rises behind the top of the frame. From the pin at its heart a single line drops, a bead of dew
     at its end, straight at the lens; it snaps taut (slow motion) and hangs: the plumb line. Cut wide: six more lines drop in
     mirrored pairs, quicker each time, and hang like the strings of a harp. The pairs swing in and are caught on the plumb line,
     one pair after another: the radials. Three more drop from the hub and are pinned below. The capture rings are laid from the
     outside in, both halves at once, mirror for mirror, and dew beads on them. The camera, which has been craning down the web,
     sinks under it and looks up: through the web, against the moon, something comes down a single line, upside down, turning
     slowly, and the focus racks from the dew at our feet up to her. She stops. Her line snaps; she drops and turns upright on her
     rim; the moon flares to paper white. Out of the white: the fight, her rim pinned where her script pins it.

     ENTRANCE "Plumb Line"  len 7.9 s (8.8 on the clock)  key 6.05 (the still)  lights 3
     idea:     one line, then a web in perfect symmetry, then her, upside down, into focus: all of it hanging from the moon
     camera:   vertical cranes: down the plumb line with the falling bead; down the web as it is built; boom under it and look up
               for her descent. Symmetric framing throughout; one slow rack of focus from the dew to her. The gate is part of the
               language: tall for the drop, widescreen for the symmetric wides, opened to the full height again as she comes down
     colour:   paper white, moonlight blue, a near-black damask   rhythm: silence, ONE (held), two, three, four, catch catch catch,
               the rings like a run of harp notes, a long held descent, snap, white
     handover: CUT under the moon's white-out at 6.86 to the play camera: she is already on her rim at k.c.hx, k.c.hy, upright;
               the fight's rim (held back during the film) is put back at the cut; the film's web is gone under the full white;
               a paper-white veil clears onto the fight; the title is already up

     beat      film s      shot (camera, lens)                                   what we see                             light              sound / buzz
     dark      0.0-0.45    black; the gate shut, opening like a curtain           nothing; then the moon's rim            none               sting: a high glass harmonic
     moon      0.15-0.9    low on the plumb line, looking up it; the moon in the  the moon rises behind the top pin       moon (light 0),    empress_moon 0.15
                           top third; black flag over the rail                                                            a cold pool
     drop      0.62-1.44   crane down with the bead as it falls; the focus racks  one line drops out of the moon into     moon               empress_drop 0.62
                           from the moon to the bead                              the dark, a bead of dew at its end
     taut      1.44-1.9    slow motion 0.3x as it snaps taut; streak, fringe;     the bead bounces on the line, glints    a ping (light 2)   empress_taut 1.44, buzz
                           the crane settles on the bead
     harp      1.9-2.95    CUT: face on, widescreen gate, symmetric; one slow     three pairs drop (2.0 / 2.33 / 2.62),    moon + fill        empress_pluck x3, buzz x3
                           crane down the web begins                              snap taut and hang like harp strings     (light 1)
     catch     2.95-4.45   the crane goes on down                                 the pairs swing in and catch on the      pings at the hub   empress_catch x4, buzz x3
                                                                                  plumb line (clicks 3.34 / 3.56 / 3.78);
                                                                                  three drop from the hub (3.5), the two
                                                                                  outer swing out to their pins (4.1)
     rings     4.2-5.05    the crane reaches the hub and booms under it, tilting  the capture rings laid outside in, both  moon, fill          empress_lay 4.2,
                           up; the gate opens to the full height                  halves at once; dew beads behind them                       empress_dew 4.6
     descent   4.95-6.3    low under the web looking up at the moon; a slow push; she comes down one line, upside down,    moon above and     empress_descend 4.95
                           the focus racks from the dew at our feet up to her     turning slowly, and stops (6.25) below   behind her, fill   (title 5.3)
                                                                                  her top pin, a silhouette on the moon    from below
     snap      6.42-6.62   held; slow motion 0.5x                                 her line snaps and whips away; she       moon               empress_snap 6.42, buzz
                                                                                  tumbles upright onto her rim
     white     6.45-6.86   soft rays from the moon through the web and her; the   the moon flares to paper white           the moon burns     empress_bloom 6.45, buzz
                           moon burns the picture out
     settle    6.86-7.45   CUT under the white to the play camera; a paper veil   the fight: her rim, her on it            house lights up    (sting: the full chord)
                           clears
     out       7.45-7.9    the gate opens                                         the fight
     still (reduced motion): 6.05, under the web looking up, her upside down against the moon, the title over it. */
  const REL = new Float32Array([0.62, 2.0, 2.0, 2.33, 2.33, 2.62, 2.62, 3.5, 3.5, 3.5]);     // each line let go
  const GRAV = new Float32Array([15, 30, 30, 30, 30, 30, 30, 40, 40, 40]);
  const SWING = new Float32Array([0, 3.0, 3.0, 3.22, 3.22, 3.44, 3.44, 4.1, 4.1, 0]);       // each line swung to its place (0: it falls straight to it)
  const CAUGHT = new Float32Array([2.95, 3.25, 3.25, 3.47, 3.47, 3.69, 3.69, 4.35, 4.35, 4.25]);   // its bead gives way to the web there
  const TAUT0 = 0.62 + Math.sqrt(2 * 5 / 15);                                                 // the plumb line comes taut (1.44)
  const PLUCK = [2.0 + Math.sqrt(2 * RLEN[1] / 30), 2.33 + Math.sqrt(2 * RLEN[3] / 30), 2.62 + Math.sqrt(2 * RLEN[5] / 30)];
  const RING0 = 4.2, RING1 = 5.05, DSC0 = 4.95, DSC1 = 6.25, SNAP = 6.42, CUT = 6.86, TOPY = H + 6;
  const TARGET = new Float32Array(NA);   // the angle each line ends at, seen from its pivot
  for (let i = 0; i < NA; i++) TARGET[i] = i < 7 ? Math.atan2(HUBY - AY[i], -AX[i]) : Math.atan2(AY[i] - HUBY, AX[i]);

  /* Where every line of the web is at film second t: pivot, tip, sag and how much shows. */
  function lines(t) {
    for (let i = 0; i < NA; i++) {
      const low = i >= 7, px = low ? 0 : AX[i], py = low ? HUBY : AY[i], Ln = RLEN[i]; QX[i] = px; QY[i] = py;
      const tau = t - REL[i]; if (tau <= 0) { TO[i] = 0; continue; }
      const g = GRAV[i], t0 = Math.sqrt(2 * Ln / g); let d, sag = 0;
      if (tau < t0) d = 0.5 * g * tau * tau;
      else { const s = tau - t0; d = Ln * (1 + 0.075 * Math.exp(-5.5 * s) * Math.sin(16 * s)); if (d < Ln) sag = (Ln - d) * 0.7; d = Math.min(d, Ln * 1.08); }
      // a line hanging free sways a little, a pendulum dying away (mirror pairs sway in mirror)
      let ang = -PI / 2 + (tau > t0 ? 0.035 * Math.sin((tau - t0) * 3.1) * Math.exp(-(tau - t0) * 0.9) * (AX[i] < 0 ? -1 : 1) : 0), len = d;
      const sw = SWING[i];
      if (sw > 0 && t > sw) {   // swung in to the hub (or, the low ones, out to their pins), with a little bounce as it is caught
        // the turn from hanging straight down to its place: an upper line swings inward (the right ones clockwise), a low one outward
        const u = clamp((t - sw) / 0.34, 0, 1), e = back(u), tg = TARGET[i], w = ((tg + PI / 2) % TAU + TAU) % TAU;
        const da = i >= 7 ? tg + PI / 2 : AX[i] > 0 ? w - TAU : w;
        ang = -PI / 2 + da * Math.min(e, 1.06); len = Ln; sag = 0.25 * Math.sin(u * PI) * (1 - u) + 0.12 * Math.exp(-(t - sw - 0.34) * 9) * (t > sw + 0.34 ? 1 : 0);
      }
      TX[i] = px + Math.cos(ang) * len; TY[i] = py + Math.sin(ang) * len; TS[i] = sag; TO[i] = 1;
    }
  }
  /* Ring s, half h, laid up to u (0..1): its points into PX.. with a slight sag between radials; returns the count. */
  function ring(s, h, u, z) {
    const idx = HALF[h], f = ringF(s), segs = 5, upto = u * segs; let m = 0;
    for (let j = 0; j < segs; j++) {
      if (j >= upto) break; const a = idx[j], b = idx[j + 1];
      const ax = AX[a] * f, ay = HUBY + (AY[a] - HUBY) * f, bx = AX[b] * f, by = HUBY + (AY[b] - HUBY) * f, frac = Math.min(1, upto - j);
      for (let q = (j === 0 ? 0 : 1); q <= 3; q++) { const v = q / 3 * frac, sg = Math.sin(v * PI) * hyp(bx - ax, by - ay) * 0.045;
        PX[m] = lerp(ax, bx, v); PY[m] = lerp(ay, by, v) - sg; PZ[m] = z; m++; }
    }
    return m;
  }
  function ringsLaid(t) { return RINGS * k_io(clamp((t - RING0) / (RING1 - RING0), 0, 1)); }
  function k_io(u) { return u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u); }
  /* Her descent: how far she has come down her line (y of her middle) and the bounce of the line as it takes her weight. */
  function herY(t, hy) {
    if (t < DSC0) return TOPY + 3; const u = clamp((t - DSC0) / (DSC1 - DSC0), 0, 1), y = lerp(TOPY + 2.5, hy, 1 - Math.pow(1 - u, 2.6));
    return t < DSC1 ? y : hy - 0.14 * Math.exp(-(t - DSC1) * 5) * Math.sin((t - DSC1) * 15);
  }

  const PLUMB = {
    kit: true, len: 7.9, key: 6.05, lights: 3,
    sheet: [0.6, 1.15, 1.5, 2.3, 2.9, 3.3, 3.95, 4.6, 5.45, 6.05, 6.76, 7.4],
    beats: {
      dark:    [0, 0.45, 'out'],
      moon:    [0.15, 0.9, 'io'],
      drop:    [0.62, TAUT0, 'in'],
      taut:    [TAUT0, 1.9, 'out'],
      harp:    [1.9, 2.95, 'io'],
      catch:   [2.95, 3.95, 'io'],
      rings:   [RING0, RING1, 'io'],
      descent: [DSC0, 6.3, 'out'],
      snap:    [SNAP, 6.62, 'out'],
      white:   [6.45, CUT, 'in'],
      settle:  [CUT, 7.45, 'out'],
      out:     [7.45, 7.9, 'io']
    },
    ramp: [[TAUT0 - 0.06, 1], [TAUT0, 0.3], [TAUT0 + 0.22, 0.3], [TAUT0 + 0.38, 1], [SNAP - 0.04, 1], [SNAP, 0.5], [6.62, 0.5], [6.7, 1]],
    title: { at: 5.3, iv: 0.05, in: 'esdrop', pos: 'low', to: 7.62 },
    css: '.fk-t.i-esdrop .fk-n span.on{animation:es-drop .9s cubic-bezier(.3,.7,.2,1) both}.fk-t.i-esdrop .fk-rule{border-top-color:#C9D9F2}' +
      '.fk-t.i-esdrop .fk-n span.on::before{content:"";position:absolute;left:50%;bottom:100%;width:1px;height:3.2em;background:linear-gradient(rgba(220,232,255,0),rgba(236,242,255,.85));animation:es-line .9s ease-out both}' +
      '.fk-t.i-esdrop .fk-n span{position:relative}' +
      '@keyframes es-drop{0%{opacity:0;transform:translateY(-1.5em);color:#F4F8FF;text-shadow:0 0 .5em rgba(190,212,255,.95)}45%{opacity:1;transform:translateY(.1em)}62%{transform:translateY(-.05em)}78%{transform:translateY(.02em);color:#F4F8FF;text-shadow:0 0 .3em rgba(190,212,255,.8)}100%{transform:none}}' +
      '@keyframes es-line{0%{opacity:0;transform:scaleY(.2);transform-origin:50% 100%}40%{opacity:1;transform:scaleY(1)}100%{opacity:0}}',
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the plumb line's
       slow motion (film 1.38 to 1.82) adds 0.67 s, the snap's (film 6.38 to 6.7) 0.25 s more. Film 1.44 (the plumb line taut) is
       real 1.48; the pairs taut at 2.62 / 2.98 / 3.29 are real 3.29 / 3.66 / 3.96; the catches click at 3.34 / 3.56 / 3.78 and 4.4,
       real 4.01 / 4.23 / 4.45 and 5.07; the rings 4.2 to 5.05 are real 4.87 to 5.72; she comes down from real 5.62 and stops at
       6.92; the snap 6.42 is real 7.11; the white-out burns out at film 6.86 (real 7.78); the end 7.9 is real 8.82. */
    music: { name: 'empress_in_sting', len: 9.8, gain: 0.85, desc: 'Entrance sting for the Silk Empress, a great spider-moth who hangs her web from the moon. Instrumental, cold, elegant and precise. Out of silence a single very high glass harmonic fades in over the first second, like moonlight. At 1.48 s one clear low harp note, plucked and left ringing. At 3.29, 3.66 and 3.96 s three more harp notes, each a step higher and a little quicker, each doubled at the octave; at 4.01, 4.23 and 4.45 s three soft muted string pizzicati answer them, and a fourth at 5.07 s. From 4.87 s a rising run of harp and celesta notes, about fourteen, accelerating up to 5.72 s, over a cold held string chord. From 5.62 s the chord turns minor and descends very slowly in the low strings with a single sustained alto voice humming above it, patient and regal, settling at 6.92 s. At 7.11 s everything stops dead on one plucked note; a soft rising shimmer of strings and glass swells from 7.17 s into a full, bright, high major chord of strings and celesta that lands at 7.78 s, held cold and clear, then dies away by 9.8 s' },
    sounds: {
      empress_moon:    { at: 0.15, len: 1.6, gain: 0.45, desc: 'Moonlight coming up in a silent room: an almost inaudible airy hush with a thin glassy shimmer swelling in over 0.8 s, like a wet fingertip on the rim of a fine glass, then holding faintly to 1.6 s' },
      empress_drop:    { at: 0.62, len: 0.9, gain: 0.6, desc: 'A single silk line paying out fast as a bead of dew falls on it: a fine, high, falling whistle of thread running off a spool, getting quicker and lower over 0.82 s, and stopping dead at 0.82 s' },
      empress_taut:    { at: TAUT0, len: 1.6, gain: 0.9, desc: 'A silk line snapping taut under a falling dewdrop, heard slowed down and very close: one deep soft twang like a single plucked harp string at 0 s with a glassy ring that wobbles in pitch as the line bounces, three wobbles fading by 0.9 s, and a tiny water-drop tick at 0.25 s' },
      empress_pluck:   { at: PLUCK, len: 0.8, gain: 0.7, desc: 'A pair of silk lines snapping taut together: a bright, light double twang, like two harp strings plucked at once an octave apart, with a short glassy ring, gone by 0.8 s' },
      empress_catch:   { at: [3.0, 3.22, 3.44, SWING[7]], len: 0.6, gain: 0.55, desc: 'A silk line swung through the air and caught on another: a soft quick swish of 0.25 s ending in a tiny, clean, glassy click, like a fingernail on a crystal bead, and a very short ring' },
      empress_lay:     { at: RING0, len: 1.1, gain: 0.55, desc: 'Silk being drawn round and round a web very fast: a run of tiny dry ticks and soft silky zips, about fourteen of them, starting slow, quickest in the middle and slowing again to a stop at 0.85 s, each one a little higher than the last' },
      empress_dew:     { at: 4.6, len: 1.4, gain: 0.4, desc: 'Dew beading on a spider web in moonlight: a scatter of the tiniest high glass chimes, like droplets touching glass, a dozen of them spread over 1.2 s, very quiet and sparkling' },
      empress_descend: { at: DSC0, len: 1.6, gain: 0.6, desc: 'Something large and light coming down a single silk thread: a long, slow, taut creak of a stretched line paying out, rising slightly in pitch, with a soft low breath of air under it; at 1.3 s the line takes the weight with a small deep twang and the creak settles to silence by 1.6 s' },
      empress_snap:    { at: SNAP, len: 0.7, gain: 0.9, desc: 'A single taut silk line snapped: one sharp, bright, high crack like a fine wire cut under tension, the loose end whipping away through the air with a thin rising zip, gone by 0.5 s' },
      empress_bloom:   { at: 6.45, len: 1.8, gain: 0.8, desc: 'Moonlight flaring to white: a soft breathy rise of airy shimmer and high glass, swelling for 0.5 s into a bright, clean, cold bloom of sound like a struck crystal bowl heard from far away, then ringing down to silence by 1.8 s' }
    },
    buzz: [[TAUT0, 24], [PLUCK[0], 12], [PLUCK[1], 14], [PLUCK[2], 16], [3.34, 8], [3.56, 8], [3.78, 10], [SNAP, 30], [CUT - 0.05, [40, 30, 90]]],
    steps: [
      [TAUT0, k => { const r = k.r, K = k.K; r.glints(0, HUBY, WZ + 0.1, 8, K.linenHi, 2.5, 0.2, 0.5); r.shake = Math.max(r.shake, 0.12); }],
      [PLUCK[0], k => pluckFx(k, 1)], [PLUCK[1], k => pluckFx(k, 3)], [PLUCK[2], k => pluckFx(k, 5)],
      [3.34, k => catchFx(k)], [3.56, k => catchFx(k)], [3.78, k => catchFx(k)],
      [SNAP, k => { const r = k.r, c = k.c, K = k.K, y = c.hy + 1.9; r.glints(c.hx, y, 1.3, 6, K.linenHi, 2.4, 0.15, 0.4); r.shake = Math.max(r.shake, 0.2); }],
      [CUT, k => { const r = k.r, c = k.c, K = k.K; r.shake = Math.max(r.shake, 0.3); r.ripple(c.hx, c.hy, 1, 6, 0.8, 1.4, true);
        for (let i = 0, n = r.n(24); i < n; i++) { const a = i / n * TAU; r.glow.emit(c.hx + Math.cos(a) * 1.2, c.hy + Math.sin(a) * 0.9, 1.2, Math.cos(a) * 3.2, Math.sin(a) * 2.6, 0, 0.9, 0.22, K.silk, 0.85, 4, 2.4, 0.3, a, 0, 0); } }]
    ],
    setup(k) { k.prop('moon', buildMoon); k.prop('flag', buildFlag); k.layer('veil', { noFile: true, cells: 8, paint(x, w, h) { x.fillStyle = '#F6F4EE'; x.fillRect(0, 0, w, h); } }); },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, def = c.def, cut = t >= CUT, time = r.time, lo = k.has.post ? 1 : 0.5;
      const hx = c.hx, hy = c.hy, halfH = def ? def.halfH : 2.1; LOWQ = !k.has.post;
      holdProps(k, !cut);
      lines(t);
      const by = herY(t, hy), snapK = k.beat('snap'), wk = k.beat('white'), flip = eo(sm(SNAP + 0.02, SNAP + 0.22, t));
      const mA = cut ? 0 : (t < 0.15 ? 0 : 0.35 + 0.65 * k.beat('moon')), hot = wk * wk;
      MY = 17.5 - 1.1 * (1 - k.ease.out(k.span(0.1, 1.4)));

      // ---- the camera first (the moon turns to it)
      if (cut) cam.home();
      else if (t < 1.9) {
        // macro low on the plumb line, looking straight up it at the moon; craning down with the bead as it falls; settling on it
        const u = k.ease.io(k.span(0.7, 1.62)), tipY = TO[0] > 0 ? TY[0] : AY[0];
        cam.orbit(0, 14.3, WZ, cam.fit(5.4, 5.4), 0.78, 0, 0, 34).mark();
        cam.orbit(0, lerp(14.3, Math.max(tipY + 1.0, HUBY + 0.9), u), WZ, cam.fit(4.6, 4.6), lerp(0.78, 0.6, u), 0, 0, 34).mix(u);
        cam.handheld(0.012, 0.8);
        const rack = k.ease.io(k.span(0.8, 1.42)); lens.focus(0, lerp(MY, tipY, rack), lerp(MZ, WZ, rack), lerp(1.6, 2.2, rack), 0.016);
      } else if (t < RING0 + 0.25) {
        // face on, wide and symmetric: the harp, then the web; one slow crane down it
        const u = k.ease.io(k.span(1.9, RING0 + 0.25));
        cam.fov = 34; cam.frame(0, lerp(13.4, 12.4, u), 13.8, lerp(9.5, 13.5, u), lerp(0.14, 0.22, u), 0);
      } else {
        // the boom: down under the web and looking up it; then the descent, her against the moon, a slow push
        const u = k.ease.io(k.span(RING0 + 0.25, 5.2));
        cam.fov = 34; cam.frame(0, 12.4, 13.8, 13.5, 0.22, 0).mark();
        const p = k.ease.io(k.span(5.0, 6.3)), ty = lerp(14.4, Math.max(15.2, Math.min(by, 16.3)), p);
        cam.orbit(0, ty, 1.0, cam.fit(lerp(10.5, 8.2, p), lerp(10.5, 8.2, p)), lerp(0.95, 0.86, p), 0, 0, lerp(38, 34, p)).mix(u);
        cam.handheld(0.02, 0.6);
        const rack = k.ease.io(k.span(5.1, 6.1)); lens.focus(0, lerp(8.6, by, rack), lerp(WZ, 1.2, rack), 1.5, 0.017);
      }
      cam.full(cut ? 0 : 1);

      // ---- house and light: as dark as it goes, lit only by the moon; then the fight's own light after the cut
      if (!cut) { k.dark(1, 0.94); k.quiet(true, true); k.vig(0.5); }
      else k.dark(0.6 * (1 - sm(CUT + 0.1, 7.5, t)), 0);
      if (!cut && mA > 0) {
        k.light(0, MX, MY + 1.0, 3.4, MOON, (34 + 40 * hot) * mA * lo, 14);   // the moon's light: far enough out that the cloth glows evenly behind the disc and nothing near it burns
        k.pool(MX, MY - 0.6, (t < 1.9 ? 6 : 9) + 3 * hot, COOL, (t < 1.9 ? 0.06 : 0.09 + 0.1 * hot) * mA * lo * lo);
        if (t > 1.9) k.light(1, 0, t < 4.9 ? 10.5 : by - 2.4, 4.4, COOL, (t < 4.9 ? 9 : 13) * lo * sm(1.9, 2.4, t), 11);
        const ping = Math.max(k.pulse(TAUT0, 0.03, 0.4), k.pulse(PLUCK[0], 0.02, 0.3), k.pulse(PLUCK[1], 0.02, 0.3), k.pulse(PLUCK[2], 0.02, 0.3), k.pulse(3.34, 0.02, 0.25), k.pulse(3.56, 0.02, 0.25), k.pulse(3.78, 0.02, 0.25));
        if (ping > 0.01) { const px = 0, py = t < 1.9 ? TY[0] : t < 3.0 ? 11.5 : HUBY; k.light(2, px, py, 1.8, PAPER, 14 * ping * lo, 6); }
      }
      moon(k, mA, hot); if (!cut) flag(k, 1);

      // ---- the web
      const fade = cut ? 1 - sm(CUT, CUT + 0.12, t) : 1;   // gone under the full white: the veil clears onto the fight's own rim
      if (fade > 0.01 && t > 0.15) {
        const z = WZ;
        for (let i = 0; i < NA; i++) {
          if (TO[i] <= 0) continue; const qx = QX[i], qy = QY[i], tx = TX[i], ty = TY[i], mb = moonK((qx + tx) * 0.5, (qy + ty) * 0.5);
          silk(k, qx, qy, z, tx, ty, z, mb * (i === 0 && t < 1.9 ? 1.4 : 1), fade, TS[i]);
          // the bead at the end of a line still falling or bouncing: it rides the tip until the line is caught
          const caught = sm(CAUGHT[i], CAUGHT[i] + 0.15, t);
          if (caught < 1) { const tw = i === 0 ? k.pulse(TAUT0, 0.02, 0.5) : 0.6 * k.pulse(REL[i] + Math.sqrt(2 * RLEN[i] / GRAV[i]), 0.02, 0.3);
            dew(k, tx, ty, z + 0.05, (i === 0 ? 0.32 : 0.28) * (1 - caught), moonK(tx, ty) * 1.4 * fade, tw); }
          if (caught > 0.5 && i >= 7) pin(k, AX[i], AY[i], moonK(AX[i], AY[i]) * fade);
        }
        for (let i = 0; i < 7; i++) pin(k, AX[i], AY[i], moonK(AX[i], AY[i]) * mA * fade);   // her rim pins, there all along, lit as the moon comes up
        // the hub: a little mat of silk where the lines are caught
        if (t > 3.0) { const hk = sm(3.0, 3.6, t) * fade; dew(k, 0, HUBY, z + 0.04, 0.5 * hk, moonK(0, HUBY), 0.4 * Math.max(k.pulse(3.34, 0.02, 0.3), k.pulse(3.56, 0.02, 0.3), k.pulse(3.78, 0.02, 0.3))); }
        // the capture rings, both halves at once, and the dew on them
        const laid = ringsLaid(t);
        if (laid > 0) for (let s = 0; s < RINGS; s++) {
          const u = clamp(laid - s, 0, 1); if (u <= 0) break;
          for (let h = 0; h < 2; h++) {
            const m = ring(s, h, u, z); silkPoly(k, m, moonK(0, HUBY + (AY[1] - HUBY) * ringF(s)) * 0.85, fade * 0.9);
            if (u < 1 && m > 0) dew(k, PX[m - 1], PY[m - 1], z + 0.05, 0.22, 2, 0.5);   // the needle of light laying it
            // the dew: one bead in each finished span
            const f = ringF(s);
            for (let j = 0; j < 5; j++) { if (u * 5 < j + 1) break; const a = HALF[h][j], b = HALF[h][j + 1], hh = hash(s * 13.7 + j * 3.1 + h * 0.37), ap = sm(0, 0.25, laid - s - (j + 1) / 5);
              const x = lerp(AX[a], AX[b], 0.3 + 0.4 * hh) * f, y = HUBY + (lerp(AY[a], AY[b], 0.3 + 0.4 * hh) - HUBY) * f - 0.08;
              const tw = Math.max(0, Math.sin(time * (1.3 + hh * 2) + hh * 40) - 0.72) * 3.2;
              dew(k, x, y, z + 0.05, (0.16 + 0.1 * hh) * ap, moonK(x, y) * fade, t > 4.6 ? tw : 0); }
          }
        }
      }
      if (!cut && t > 1.9) k.motes(26, -5, 7, 1.2, 5, 18, 5.5, MOON, 0.42 * mA, 0.035, 0.12, 5);

      // ---- her: down a single line, upside down, turning, into the moonlight; the snap; upright on her rim
      if (!cut && t >= DSC0) {
        const turn = Math.sin((t - DSC0) * 1.7) * 0.34 * (1 - sm(5.9, 6.3, t)), rot = PI * (1 - flip), dropY = by - 0.22 * sm(SNAP, SNAP + 0.18, t) + 0.22 * sm(SNAP + 0.18, 6.62, t);
        const col = 0.95 + 0.05 * wk;   // moonlit: a little cold
        k.boss(hx, dropY, 1.2, 1, rot, 0.12 + 0.12 * Math.sin(t * 2.3) * (1 - flip), col * 0.88, col * 0.94, col * 1.06, 0.04 + 0.6 * hot, 0.36 * (1 - wk), turn);
        // her line: from where she hangs (her spinnerets, uppermost while she is upside down) up out of the picture
        const ay = dropY + halfH * 0.62, top = TOPY + 2;   // her spinnerets, uppermost while she is upside down (she leans toward the lens)
        if (t < SNAP) silk(k, hx, ay, 1.15, hx, top, 1.1, 0.7, 0.8, 0);
        else { const s = t - SNAP, rec = 3.4 * (1 - Math.exp(-s * 9)), a = 1 - sm(SNAP + 0.04, SNAP + 0.2, t);
          silk(k, hx, ay + 0.35 + rec, 1.15, hx, top, 1.1, 1.3, a, 0.6 * sm(0, 0.3, s));        // the upper end, recoiling and going slack
          silk(k, hx, ay, 1.15, hx + 0.1 * s, ay + 0.3 - s * 0.6, 1.15, 1.0, a * (1 - flip), 0.05); }   // the short end left on her
      } else if (cut) {
        k.boss(hx, hy, 1, 1, 0, 0, 1, 1, 1, 0.6 * (1 - sm(CUT, CUT + 0.4, t)));
        walkPose(k);
      } else k.hideBoss();

      // ---- the lens
      if (!cut) {
        const taut = k.pulse(TAUT0, 0.02, 0.32), pl = Math.max(k.pulse(PLUCK[0], 0.02, 0.2), k.pulse(PLUCK[1], 0.02, 0.2), k.pulse(PLUCK[2], 0.02, 0.2)), sn = k.pulse(SNAP, 0.02, 0.3);
        lens.streak(0.9 * taut + 0.25 * pl + 0.6 * sn + 0.9 * wk, MOON, 3.2, 0.7);
        lens.fringe(1.1 * taut + 0.5 * pl + 0.9 * sn + 1.4 * hot);
        if (wk > 0.02 && k.has.rays) lens.rays(MX, MY, MZ + 0.5, 1.5 * Math.sqrt(wk), MOON, 0.8, 2.3);   // soft, from the moon's hot core only
        lens.flash(PAPER, 2.6 * hot * wk); lens.exposure(k.ease.out(k.span(0.05, 0.6)) + 2.6 * hot);
      } else { const w = 1 - sm(CUT, CUT + 0.2, t); lens.flash(PAPER, 2.4 * w * w); lens.exposure(1 + 0.6 * w); }
      const veil = cut ? 1 - k.ease.out(sm(CUT + 0.05, 7.4, t)) : 0;
      if (veil > 0.003) k.layer('veil').at(0, CY, 2.2, W + 18, H - B + 18).alpha(veil * 0.92).blur(0);
      // the gate: opens like a curtain as the moon comes up; widescreen for the symmetric wides; opened to the full height again
      // as the camera tilts up the web for her descent
      k.gate(cut ? 0.11 * (1 - k.beat('out')) : t < 1.9 ? lerp(0.5, 0.11, k.ease.io(k.span(0.12, 1.0))) : lerp(0.235, 0.11, k.ease.io(k.span(4.55, 5.35))));
    },
    teardown(k) { holdProps(k, false); walkPose(k); }
  };
  function pluckFx(k, i) {   // a pair comes taut: a glint at each bead, a small shake
    const r = k.r, K = k.K, y = AY[i] - RLEN[i];
    r.glints(AX[i], y, WZ + 0.1, 4, K.linenHi, 1.6, 0.15, 0.35); r.glints(AX[i + 1], y, WZ + 0.1, 4, K.linenHi, 1.6, 0.15, 0.35); r.shake = Math.max(r.shake, 0.06);
  }
  function catchFx(k) { const r = k.r, K = k.K; r.glints(0, HUBY, WZ + 0.1, 5, K.linenHi, 2, 0.15, 0.35); r.shake = Math.max(r.shake, 0.05); }

  // =====================================================================================================================
  //  The death: "Cocoon"
  // =====================================================================================================================
  /* The killing shot lands; time slows; the house lights die and her web is there in the moonlight, every strand of it, as it
     always was. Close on her, face on: she spins, faster and faster, paying out silk round herself, her stitches coming away from
     the wing tips in, until she is a spindle of wound white silk; the spin stops dead. A line drops from the dark above and
     catches it; it is hauled up, hand over hand, one pull, two, three, and then fast, swinging in across the moon and out of
     the picture. The web is left with no one in it. It lets go a pair of strands at a time, from the top down, each pair
     falling away from its pins to hang from the hub, the dew shaken off them falling through the moonlight; last the plumb line,
     then the hub itself, and the whole web drops away as the house lights come up on a clean cloth.
     Camera language (her death alone): the same symmetry and vertical cranes, reversed: a still close-up, one long crane UP with
     the cocoon, then the wide held still while everything falls. Motif: the moon, and silk. Colour: paper white and moonlight.
     Rhythm: crack, a whirr rising to a stop dead, pull, pull, pull, whoosh, then a falling run of plucked strings, and quiet.

     DEATH "Cocoon"  len 6.6 s (7.5 on the clock)  lights 3
     beat      film s      shot (camera, lens)                                   what we see                             light              sound / buzz
     hit       0-0.42      the play camera, a slight push; slow motion 0.25x;     the hit; the house lights die; her web   the moon comes up  empress_crack 0.02, buzz
                           fringe; a paper flash to cut under                     appears in the moonlight, every strand   (light 0)          (sting: a glass crack)
     spin      0.42-2.22   CUT: close, face on, symmetric; a slow push; focus     she spins faster and faster; silk winds  moon behind, a     empress_spin 0.45
                           on her; black flag over the rail                       round her; she comes apart wing tips in   cool fill (light 1)
     stop      2.22-2.4    a freeze of a frame; fringe, a small streak            the spin stops dead: a cocoon            a ping (light 2)   empress_cinch 2.22, buzz
     hoist     2.28-3.95   one long crane UP with it, looking up at it; the       a line drops and catches it (2.42); it   moon, the fill     empress_line 2.28,
                           focus follows it                                       is hauled up (2.62 / 2.92 / 3.18), then  rising with it     empress_haul x3, buzz x3,
                                                                                  fast, across the moon and out (3.95)                        empress_whoosh 3.38
     letgo     3.95-5.3    the wide, face on, held; drops falling past the lens   the web lets go a pair at a time (4.05,  the moon           empress_letgo x6, buzz x5,
                           out of focus; then easing to the play camera           4.3, 4.52, 4.72) to hang from the hub;                      empress_dew 3.95
                                                                                  the plumb line (4.9); the hub (5.08):                       (title 4.35)
                                                                                  it all falls; the dew falls with it
     calm      5.3-6.6     the play camera (by 6.0); the house lights come up     a calm, whole, lit cloth                 the house          empress_still 5.35
                           over 0.8 s
     reduced motion: the camera stays at the play camera; the same story plays on the cloth, without the flashes. */
  const DCUT = 0.42, STOP = 2.22, LINE0 = 2.28, LINE1 = 2.42, PULL = [2.62, 2.92, 3.18], LIFT = [0.8, 1.1, 1.5], RISE = 3.38, GONE = 3.95;
  const LG = [4.05, 4.3, 4.52, 4.72], LAX = 4.9, HUBREL = 5.08, UP0 = 5.3, UP1 = 6.1, NDEW = 70;
  const NH = 7, NROPE = 5;   // a pair rope: anchor, NH nodes to the hub, NH to the other anchor; rope 4: the plumb line
  const DREL = new Float32Array(NA);   // when each radial lets go
  /* the dew on the death's web: where each bead sits, and when it falls */
  const DWX = new Float32Array(NDEW), DWY = new Float32Array(NDEW), DWT = new Float32Array(NDEW), DWS = new Float32Array(NDEW);
  function radialRope(i) { return i === 0 || i === 9 ? 4 : ((i - 1) >> 1); }
  /* A point a fraction f (0 at the hub, 1 at its anchor) along radial i, as the ropes have it now: into SX0, SY0. */
  let SX0 = 0, SY0 = 0, SZ0 = 0;
  function along(k, i, f) {
    const rp = k.rope(radialRope(i)); let a, b;   // the node range from the hub to the anchor
    if (i === 0) { a = 5; b = 0; } else if (i === 9) { a = 5; b = 12; } else if (i & 1) { a = NH; b = 2 * NH; } else { a = NH; b = 0; }
    const q = a + (b - a) * f, j0 = Math.max(Math.min(a, b), Math.min(Math.max(a, b) - 1, Math.floor(q))), u = q - j0;
    SX0 = lerp(rp.x[j0], rp.x[j0 + 1], u); SY0 = lerp(rp.y[j0], rp.y[j0 + 1], u); SZ0 = lerp(rp.z[j0], rp.z[j0 + 1], u);
  }
  /* Her own unpicking order: from the outside of her wings in to her body, as the silk closes round her. */
  function cocoonOrder(x, y, m, h) { return -Math.sqrt((x / m.hx) * (x / m.hx) + (y / m.hy) * (y / m.hy) * 0.6) + h * 0.12; }
  function spinAngle(t) { const s = clamp((t - 0.42) / (STOP - 0.42), 0, 1), d = STOP - 0.42; return 2.4 * (t < STOP ? t - 0.42 : d) + 30 * d * s * s * s / 3; }
  function cocoonY(t, y0) {   // three pulls, then hauled fast out of the top of the picture, from wherever she died
    let y = y0; for (let i = 0; i < 3; i++) { const u = clamp((t - PULL[i]) / 0.2, 0, 1); y += LIFT[i] * back(u) * 0.92 + (u >= 1 ? LIFT[i] * 0.08 : 0); }
    if (t > RISE) { const s = clamp((t - RISE) / (GONE - RISE), 0, 1); y += (TOPY + 3.5 - y) * (0.15 * s + 0.85 * s * s * s); }
    return y;
  }
  function silkMote(k, x, y, z, rgb) {   // a stitch comes away and is wound in: silk flung round her as she spins
    const c = k.c; if ((c.n1++ & 1) === 1) return; const dx = x - c.hx, dy = y - c.hy;
    k.r.glow.emit(x, y, z + 0.3, -dy * 3 - dx * 0.8, dx * 3 - dy * 0.8, rnd(0, 0.6), rnd(0.35, 0.6), rnd(0.12, 0.2), k.K.silk, 0.85, 1, 3, 0.4, undefined, rnd(-3, 3), 0);
  }
  /* The wraps she pays out round herself: tilted loops of silk round a spindle, turning with her, more of them as she winds. */
  function wraps(k, x, y, z, n, ang, ln, rmax, b, a) {
    const cam = k.cam;
    for (let j = 0; j < n; j++) {
      const v = (j + 0.5) / 14, cy = y + (v - 0.5) * ln, rad = rmax * Math.pow(Math.sin(PI * v), 0.75), tilt = 0.32 * Math.sin(ang * 0.9 + j * 2.3), m = LOWQ ? 12 : 17;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      for (let q = 0; q < m; q++) { const th = q / (m - 1) * TAU + ang + j; const ex = Math.cos(th) * rad, ez = Math.sin(th) * rad * 0.7;
        PX[q] = x + ex * ct; PY[q] = cy + ex * st; PZ[q] = z + ez; }
      let len = 0; PS[0] = 0; for (let q = 1; q < m; q++) { len += hyp(PX[q] - PX[q - 1], PY[q] - PY[q - 1]); PS[q] = len; }
      const g = 0.24 * b, cc = 0.7 * b;
      SG[0] = MOON[0] * g; SG[1] = MOON[1] * g; SG[2] = MOON[2] * g; SC[0] = PAPER[0] * cc; SC[1] = PAPER[1] * cc; SC[2] = PAPER[2] * cc;
      k.ribA.strip(PX, PY, PZ, PS, m, 0.1, 0.1, SG, a, a, 7, 0, cam.px, cam.py, cam.pz);
      k.ribN.strip(PX, PY, PZ, PS, m, 0.035, 0.035, SC, a, a, 1, 0, cam.px, cam.py, cam.pz);
    }
  }

  const COCOON = {
    kit: true, len: 6.6, key: 3.2, lights: 3,
    sheet: [0.2, 0.75, 1.45, 2.1, 2.5, 3.05, 3.65, 4.15, 4.6, 5.0, 5.45, 6.4],
    beats: {
      hit:   [0, DCUT, 'out'],
      spin:  [DCUT, STOP, 'in2'],
      stop:  [STOP, 2.4, 'out'],
      hoist: [LINE0, GONE, 'io'],
      letgo: [GONE, UP0, 'lin'],
      calm:  [UP0, 6.6, 'io']
    },
    ramp: [[0.02, 1], [0.06, 0.25], [0.34, 0.25], [0.42, 1]],
    title: { at: 4.35, iv: 0.045, in: 'esdew', pos: 'top', to: 6.35 },
    css: '.fk-t.i-esdew .fk-n span.on{animation:es-dew 1s cubic-bezier(.3,.6,.25,1) both}.fk-t.i-esdew .fk-rule{border-top-color:#C9D9F2}' +
      '@keyframes es-dew{0%{opacity:0;transform:translateY(-.6em) scale(.3);filter:blur(4px) brightness(2.2);color:#EAF2FF;text-shadow:0 0 .5em rgba(190,212,255,1)}' +
      '35%{opacity:1;transform:translateY(.06em) scale(1.05,.95);filter:blur(.5px) brightness(1.6)}60%{transform:none;filter:none;color:#F4F8FF;text-shadow:0 0 .3em rgba(190,212,255,.7)}100%{}}',
    /* The sting is one file from film 0 and not slowed, so its times are real seconds: the hit's slow motion (film 0.02 to 0.42)
       adds 0.94 s. Film 0.42 (the cut) is real 1.36; the stop 2.22 is real 3.16; the line catches at 2.42 (real 3.36); the pulls
       2.62 / 2.92 / 3.18 are real 3.56 / 3.86 / 4.12; the fast rise from 3.38 (real 4.32); out of the picture at 3.95 (real 4.89);
       the strands 4.05 / 4.3 / 4.52 / 4.72 / 4.9 / 5.08 are real 4.99 / 5.24 / 5.46 / 5.66 / 5.84 / 6.02; the lights up from 5.3
       (real 6.24); the end 6.6 is real 7.54. */
    music: { name: 'empress_down_sting', len: 8.2, gain: 0.8, desc: 'Death sting for the Silk Empress. Instrumental, cold and graceful. A single high glass crack at 0 s, slowed and ringing, falling away for 1.3 s. From 1.36 s a spinning figure on harp and celesta, a fast repeating pattern of four notes that speeds up and rises in pitch over 1.8 s, with strings swelling under it, cut off dead at 3.16 s. One low pizzicato note at 3.36 s; three low, heavy, rising string notes at 3.56, 3.86 and 4.12 s, each a step higher, like a rope hauled hand over hand; a fast upward glissando of strings from 4.32 s to 4.89 s, where it stops in silence. Six plucked harp notes falling, at 4.99, 5.24, 5.46, 5.66, 5.84 and 6.02 s, each lower and softer, like strings let go. From 6.24 s a warm, quiet, open major chord in muted strings rises gently and fades away by 8.2 s' },
    sounds: {
      empress_crack:  { at: 0.02, len: 1.6, gain: 1, desc: 'A killing blow to something made of silk and glass, slowed down: a deep soft thump, then a bright crack like thin crystal splitting at 0.05 s that rings and falls in pitch, with a soft tearing of silk under it, fading by 1.6 s' },
      empress_spin:   { at: DCUT + 0.03, len: 1.9, gain: 0.85, desc: 'A spinning wheel and a spindle whirring up from slow to very fast over 1.8 s, a silky rising whine of thread being wound round and round on top, getting higher and tighter, cut off dead at 1.8 s' },
      empress_cinch:  { at: STOP, len: 0.9, gain: 0.9, desc: 'Silk pulled tight round something and stopped dead: one taut creaking cinch of thread, a short deep twang like a bowstring at 0 s, then a faint creak settling, silent by 0.8 s' },
      empress_line:   { at: LINE0, len: 0.6, gain: 0.6, desc: 'A silk line dropping fast from high above and hooking onto something: a thin falling whistle of 0.14 s that ends in a soft, tight snap as it catches' },
      empress_haul:   { at: PULL, len: 0.5, gain: 0.75, desc: 'A heavy silk cocoon hauled up one pull on a rope: a single short creak of taut line under load and a soft rush of air as it lifts, over 0.35 s' },
      empress_whoosh: { at: RISE, len: 0.9, gain: 0.7, desc: 'Something hauled up very fast and away into the dark overhead: a rising whoosh that accelerates and climbs in pitch over 0.55 s and is suddenly gone, a faint creak of line at its start' },
      empress_letgo:  { at: [LG[0], LG[1], LG[2], LG[3], LAX, HUBREL], len: 0.9, gain: 0.6, desc: 'A strand of spider silk letting go of its pin: a soft, clean, plucked twang that sags in pitch as the line goes slack, with a few tiny droplets falling and ticking after it, fading by 0.9 s' },
      empress_dew:    { at: GONE, len: 2.2, gain: 0.45, desc: 'Dew falling from a broken web in the night: a slow patter of the tiniest water drops, a few at first, then a soft brief shower of them at about 1.2 s, thinning to the last few drops by 2.2 s. Very delicate, glassy, no rain hiss' },
      empress_still:  { at: UP0 + 0.05, len: 1.4, gain: 0.4, desc: 'The night going quiet as the light comes back: a long soft exhale of air into stillness over 1 s and a faint warm room tone, fading by 1.4 s' }
    },
    buzz: [[0.03, 45], [STOP, 30], [LINE1, 12], [PULL[0], 18], [PULL[1], 18], [PULL[2], 22], [LG[0], 8], [LG[1], 8], [LG[2], 8], [LG[3], 8], [HUBREL, 16]],
    steps: [
      [0.03, k => { const r = k.r, K = k.K, c = k.c; r.glints(c.hx, c.hy, 1.4, 12, K.linenHi, 3.5, 0.3, 0.6); r.strands(c.hx, c.hy, [PAL.paper, PAL.linen], 10, 1.3); r.shake = Math.max(r.shake, 0.35); r.hitStop(0.05, 0.3); }],
      [STOP, k => { const r = k.r, K = k.K, c = k.c; k.hold(0.07); r.glints(c.hx, c.hy, 1.6, 10, K.linenHi, 3, 0.2, 0.5); r.shake = Math.max(r.shake, 0.18); }],
      [LINE1, k => { const r = k.r, K = k.K, c = k.c; r.glints(c.hx, c.hy + 1.75, 1.4, 5, K.linenHi, 1.8, 0.15, 0.35); }],
      [PULL[0], k => { k.r.shake = Math.max(k.r.shake, 0.08); }], [PULL[1], k => { k.r.shake = Math.max(k.r.shake, 0.1); }], [PULL[2], k => { k.r.shake = Math.max(k.r.shake, 0.12); }],
      [LG[0], k => letGo(k, 0)], [LG[1], k => letGo(k, 1)], [LG[2], k => letGo(k, 2)], [LG[3], k => letGo(k, 3)],
      [LAX, k => { k.rope(4).free(0).whip(0, 0, -2, 0.5); }],
      [HUBREL, k => { for (let p = 0; p < NROPE; p++) { const rp = k.rope(p); rp.free(p === 4 ? 5 : NH); if (p === 4) rp.free(-1); } k.r.shake = Math.max(k.r.shake, 0.06); }]
    ],
    setup(k) {
      k.prop('moon', buildMoon); k.prop('cocoon', buildCocoon); k.prop('flag', buildFlag);
      k.r.bfOrders.escocoon = cocoonOrder;
      // the web as ropes: each mirror pair one rope through the hub (pinned at both anchors and the hub), and the plumb line
      for (let p = 0; p < 4; p++) {
        const l = 2 + 2 * p, rr = 1 + 2 * p, rp = k.rope(p), slack = (RLEN[l] + RLEN[rr]) / Math.max(0.01, hyp(AX[rr] - AX[l], AY[rr] - AY[l]));
        rp.lay(2 * NH + 1, AX[l], AY[l], WZ, AX[rr], AY[rr], WZ, slack).gravity(0, 0, 0);
        for (let i = 0; i <= 2 * NH; i++) { const left = i <= NH, u = left ? i / NH : (i - NH) / NH, x = left ? lerp(AX[l], 0, u) : lerp(0, AX[rr], u), y = left ? lerp(AY[l], HUBY, u) : lerp(HUBY, AY[rr], u);
          rp.x[i] = rp.ox[i] = x; rp.y[i] = rp.oy[i] = y; rp.z[i] = rp.oz[i] = WZ; }
        rp.pin(0, AX[l], AY[l], WZ).pin(NH, 0, HUBY, WZ).pin(-1, AX[rr], AY[rr], WZ);
      }
      const ax = k.rope(4); ax.lay(13, 0, AY[0], WZ, 0, AY[9], WZ).gravity(0, 0, 0);
      for (let i = 0; i < 13; i++) { const y = i <= 5 ? lerp(AY[0], HUBY, i / 5) : lerp(HUBY, AY[9], (i - 5) / 7); ax.x[i] = ax.ox[i] = 0; ax.y[i] = ax.oy[i] = y; ax.z[i] = ax.oz[i] = WZ; }
      ax.pin(0, 0, AY[0], WZ).pin(5, 0, HUBY, WZ).pin(-1, 0, AY[9], WZ);
      // when each radial lets go, and the dew on the rings: each bead falls when the first of its two radials goes
      for (let i = 0; i < NA; i++) DREL[i] = i === 0 ? LAX : i === 9 ? HUBREL : LG[(i - 1) >> 1];
      let n = 0;
      for (let s = 0; s < RINGS; s++) for (let h = 0; h < 2; h++) for (let j = 0; j < 5; j++) { if (n >= NDEW) break;
        const a = HALF[h][j], b = HALF[h][j + 1], f = ringF(s), hh = hash(s * 13.7 + j * 3.1 + h * 0.37), v = 0.3 + 0.4 * hh;
        DWX[n] = lerp(AX[a], AX[b], v) * f; DWY[n] = HUBY + (lerp(AY[a], AY[b], v) - HUBY) * f - 0.08; DWS[n] = 0.16 + 0.1 * hh;
        DWT[n] = Math.min(DREL[a], DREL[b]) + 0.04 + 0.3 * hash(n * 7.7 + 1); if (hh > 0.86) DWT[n] = LINE1 + 0.1 + 0.5 * hash(n * 3.3); n++; }
      k.c.n1 = 0;
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, def = c.def, time = r.time, lo = k.has.post ? 1 : 0.5;
      const cut = t >= DCUT, bx = c.hx, by0 = c.hy, halfH = def ? def.halfH : 2.1;
      MY = 17.5; LOWQ = !k.has.post;
      const up = k.ease.io(k.span(UP0, UP1)), night = cut ? 1 - up : sm(0.02, DCUT, t), mA = night * (cut ? 1 : 0.9);
      const coy = cocoonY(t, by0), cox = lerp(bx, 0, sm(2.7, 3.9, t)) + 0.3 * Math.sin((t - 2.4) * 3.1) * sm(2.45, 2.7, t) * (1 - sm(3.6, 3.95, t));
      const spin = spinAngle(t), wrap = sm(0.7, STOP - 0.04, t), stopK = k.pulse(STOP, 0.02, 0.3);

      // ---- the camera first (the moon turns to it)
      if (!cut) { cam.home().mark(); cam.orbit(bx, by0, 1, cam.fit(9, 9), 0.2, 0).mix(0.22 * k.ease.out(k.span(0, DCUT))); }
      else if (t < 2.4) {   // close on her, face on, a slow push
        const u = k.ease.io(k.span(DCUT, 2.4));
        cam.orbit(bx, by0 - 0.1, 1.1, cam.fit(lerp(6.6, 5.0, u), lerp(6.6, 5.0, u)), lerp(0.18, 0.12, u), 0, 0, 34);
      } else if (t < GONE + 0.05) {   // one long crane up with the cocoon, looking up at it as it goes; it leaves across the moon
        const u = k.ease.io(k.span(2.4, 3.6)), ty = Math.min(coy - 0.4, 15.8);
        cam.orbit(bx, by0 - 0.1, 1.1, cam.fit(5.0, 5.0), 0.12, 0, 0, 34).mark();
        cam.orbit(lerp(bx, 0, u), lerp(by0, ty, u), 1.1, cam.fit(lerp(5.0, 8.5, u), lerp(5.0, 8.5, u)), lerp(0.12, 0.5, u), 0, 0, 34).mix(k.ease.io(k.span(2.42, 2.9)));
        cam.handheld(0.02, 0.7);
      } else {   // the wide, face on, held, while the web lets go; then the play camera
        const u = k.ease.io(k.span(GONE, 4.35));
        cam.orbit(0, 15.8, 1.1, cam.fit(8.5, 8.5), 0.5, 0, 0, 34).mark();
        cam.fov = 34; cam.frame(0, 11.4, 15.2, 15.5, 0.16, 0).mix(u).mark();
        cam.home().mix(k.ease.io(k.span(5.15, 6.0)));
      }
      cam.full(cut && t < 5.9 ? 1 - sm(5.3, 5.9, t) : 0);

      // ---- house and light
      if (t < UP1 + 0.05) { k.dark(cut ? 0.97 * night : lerp(c.d0, 0.97, night), 0.9 * night); k.vig(0.45 * night); if (cut) k.quiet(true, true); }
      else k.dark(0, 0);
      if (mA > 0.01) {
        k.light(0, MX, MY + 0.2, 2.1, MOON, 30 * mA * lo, 13); k.pool(MX, MY - 0.4, 7.5, COOL, 0.06 * mA * lo);
        if (cut && t < GONE) k.light(1, cox, coy - 0.6, 4.2, COOL, 10 * lo * mA, 9);
        const ping = Math.max(stopK, k.pulse(LINE1, 0.02, 0.25), k.pulse(0.03, 0.03, 0.35));
        if (ping > 0.01) k.light(2, cox, coy, 2.4, PAPER, 16 * ping * lo, 7);
      }
      moon(k, mA * (1 - sm(UP0, UP0 + 0.6, t)), 0); flag(k, night * 1.2 - 0.05);

      // ---- her: the hit, then the spin; the cocoon wound round her; hauled up
      if (t < STOP + 0.02) {
        const e = k.ease.out(k.span(0, 0.35)), s = lerp(1, 0.62, sm(1.1, STOP, t)), col = 1 - 0.1 * wrap;
        c.dboss(e, bx, by0, 1.15, s, c.p0.rz + spin, 0.1 * (1 - wrap), col, col, col * 1.04, 0.15 * wrap + 0.4 * k.pulse(0.03, 0.03, 0.3), 0, 0);
        c.edge(K.silk, 1.4);
        k.unpickBoss(k.ease.in(k.span(0.75, STOP - 0.05)), 'escocoon', silkMote);
      } else k.hideBoss();
      if (cut && t > 0.6 && coy < TOPY + 2) {
        const coc = k.prop('cocoon'), u = coc.material.uniforms, sz = lerp(0.6, 1, wrap), ln = 3.3 * sz, rad = 1.05 * sz;
        coc.position.set(cox, coy, 1.25); coc.scale.set(rad, ln, rad * 0.8); coc.rotation.set(0, spin * 0.2, t > 2.4 ? 0.18 * Math.sin((t - 2.4) * 3.1) * (1 - sm(3.6, 3.95, t)) : 0);
        u.uCover.value = clamp(wrap * 1.02, 0, 1); u.uSpin.value = spin * 1.5; u.uLight.value = 0.6 + 0.9 * moonK(cox, coy) * night + 0.6 * stopK; u.uA.value = sm(0.6, 1.0, t);
        if (t < STOP + 0.15) wraps(k, bx, by0, 1.25, Math.floor(4 + 10 * wrap), spin * 1.6, 3.6 * lerp(1, 0.9, wrap), lerp(1.9, 1.15, wrap), 1.1, 0.9 * (1 - sm(STOP, STOP + 0.15, t)));
        // the line it hangs from: dropped from the dark, caught, hauled
        if (t > LINE0) { const top = TOPY + 3, tip = lerp(top, coy + ln * 0.5, eo(clamp((t - LINE0) / (LINE1 - LINE0), 0, 1)));
          silk(k, cox, tip, 1.25, lerp(cox, 0, 0.6), top, 1.2, 1.4, 1, 0); }
      }

      // ---- the web, in moonlight: whole until it lets go
      const wa = (cut ? 1 : sm(0.05, DCUT, t)) * (1 - sm(5.35, 5.95, t));
      if (wa > 0.01) {
        for (let p = 0; p < NROPE; p++) k.rope(p).gravity(0, t > (p < 4 ? LG[p] : LAX) ? -22 : 0, 0);
        for (let p = 0; p < NROPE; p++) { const rp = k.rope(p), mid = p === 4 ? 5 : NH, b = moonK(rp.x[mid], rp.y[mid]) * 0.9;
          if (t < (p < 4 ? LG[p] : LAX)) { rp.draw(0.12, mixSG(b), wa, 7, true); rp.draw(0.032, mixSC(b), wa, 3, false); }
          else { const fl = 1 - sm(HUBREL + 0.3, HUBREL + 0.8, t); rp.draw(0.11, mixSG(b * 0.8), wa * fl, 7, true); rp.draw(0.03, mixSC(b * 0.8), wa * fl, 1, false); } }
        // the rings: a span stays while both its radials hold
        for (let s = 0; s < RINGS; s++) { const f = ringF(s);
          for (let h = 0; h < 2; h++) { let m = 0;
            for (let j = 0; j < 5; j++) { const a = HALF[h][j], b2 = HALF[h][j + 1], ok = t < DREL[a] && t < DREL[b2];
              if (!ok) { if (m > 1) silkPoly(k, m, moonK(0, HUBY + 3 * f) * 0.85, wa * 0.9); m = 0; continue; }
              along(k, a, f); const ax0 = SX0, ay0 = SY0, az0 = SZ0; along(k, b2, f);
              for (let q = (m === 0 ? 0 : 1); q <= 3; q++) { const v = q / 3, sg = Math.sin(v * PI) * hyp(SX0 - ax0, SY0 - ay0) * 0.045; PX[m] = lerp(ax0, SX0, v); PY[m] = lerp(ay0, SY0, v) - sg; PZ[m] = lerp(az0, SZ0, v); m++; } }
            if (m > 1) silkPoly(k, m, moonK(0, HUBY + 3 * f) * 0.85, wa * 0.9); } }
        for (let i = 0; i < NA; i++) pin(k, AX[i], AY[i], moonK(AX[i], AY[i]) * wa);
        dew(k, 0, HUBY, WZ + 0.04, 0.5 * (1 - sm(HUBREL - 0.1, HUBREL + 0.1, t)) * wa, moonK(0, HUBY), 0);
      }
      // the dew: on the web, then falling through the moonlight, catching it
      if (night > 0.02) for (let i = 0; i < NDEW; i++) {
        const a = t - DWT[i]; let x = DWX[i], y = DWY[i];
        if (a > 0) { y -= 0.5 * 24 * a * a; x += 0.15 * Math.sin(i * 2.1) * a; if (y < B - 1) continue; }
        else if (wa <= 0.01) continue;
        const sp = a > 0 ? 24 * a : 0, b = moonK(x, y) * night, tw = a > 0 ? 0 : Math.max(0, Math.sin(time * (1.3 + DWS[i] * 9) + i * 3.7) - 0.75) * 3;
        dew(k, x, y, WZ + 0.05, DWS[i] * (a > 0 ? 1.1 : 1), b, tw);
        if (sp > 3 && k.has.post) { DC[0] = MOON[0] * b * 0.3; DC[1] = MOON[1] * b * 0.3; DC[2] = MOON[2] * b * 0.3; r.spr.add(x, y + sp * 0.02, WZ + 0.05, Math.min(1.6, sp * 0.05), DC, 0.6, 4, PI / 2); }
      }
      // in front of the lens, out of focus: a few drops falling past us during the let-go
      if (t > GONE && t < UP0 + 0.4) for (let i = 0; i < 4; i++) { const a = t - (GONE + 0.15 + i * 0.32); if (a < 0) continue; const y = 17 - 0.5 * 18 * a * a, x = (i & 1 ? 1 : -1) * (1.6 + i * 0.7);
        if (y > 2 && k.has.dof) { DC[0] = MOON[0] * 0.5; DC[1] = MOON[1] * 0.55; DC[2] = MOON[2] * 0.6; r.spr.add(x, y, 6.5, 0.9, DC, 0.14 * night, 9); r.spr.add(x, y, 6.5, 0.6, DC, 0.1 * night, 3); } }
      if (cut && t < UP0) k.motes(22, -5, 7, 1.2, 5, 18, 5.5, MOON, 0.38 * mA, 0.035, 0.1, 9);

      // ---- the lens
      if (!cut) { const w = k.ease.in(k.span(0.28, DCUT)); lens.fringe(0.9 * k.pulse(0.03, 0.03, 0.35)); lens.streak(0.8 * k.pulse(0.03, 0.03, 0.3), MOON, 2.6, 0.8); lens.flash(PAPER, 2.2 * w * w); lens.exposure(1 + 1.2 * w * w); }
      else if (t < UP0) {
        const w = 1 - sm(DCUT, DCUT + 0.25, t); if (w > 0) { lens.flash(PAPER, 2.2 * w * w); lens.exposure(1 + 0.8 * w); }
        if (t < 2.4) lens.focus(bx, by0, 1.2, 1.3, 0.015);
        else if (t < GONE) lens.focus(cox, Math.min(coy, 16.5), 1.25, 1.0, 0.014);
        else lens.focus(0, HUBY, WZ, 0.9, 0.014);
        lens.fringe(0.9 * stopK + 0.35 * (k.pulse(LG[0], 0.02, 0.2) + k.pulse(LG[1], 0.02, 0.2) + k.pulse(LG[2], 0.02, 0.2) + k.pulse(LG[3], 0.02, 0.2)));
        lens.streak(0.5 * stopK, MOON, 2.6, 0.8);
      }
    }
  };
  function mixSG(b) { const g = 0.2 * b; SG[0] = MOON[0] * g; SG[1] = MOON[1] * g; SG[2] = MOON[2] * g; return SG; }
  function mixSC(b) { const cc = 0.62 * b; SC[0] = PAPER[0] * cc; SC[1] = PAPER[1] * cc; SC[2] = PAPER[2] * cc; return SC; }
  function letGo(k, p) {   // a mirror pair lets go of its pins: both strands fall to hang from the hub, shaking off dew
    const rp = k.rope(p), l = 2 + 2 * p, rr = 1 + 2 * p; rp.free(0).free(-1).whip(0, 1.2, -1.5, 0.6).whip(-1, -1.2, -1.5, 0.6);
    const r = k.r, K = k.K; r.glints(AX[l], AY[l], 0.8, 3, K.linenHi, 1.4, 0.12, 0.3); r.glints(AX[rr], AY[rr], 0.8, 3, K.linenHi, 1.4, 0.12, 0.3);
  }

  ST.registerFilm('empress', {
    entrance: PLUMB,

    /* Drop line: she free-falls upside down on her line, it twangs taut, her web flashes in behind her; the camera cranes down. */
    sig: {
      len: 1.5, title: 0.55,
      steps: [[0.5, c => { const r = c.r, K = c.K; r.glints(c.hx, c.hy, 1.4, 14, K.glare, 5, 0.3, 0.5); r.ripple(c.hx, c.hy, 0.5, 6, 0.6, 2); r.shake = Math.max(r.shake, 0.22); }]],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, def = c.def, fall = ei(clamp(t / 0.5, 0, 1)), spr = t > 0.5 ? Math.exp(-(t - 0.5) * 6) * Math.sin((t - 0.5) * 26) * 0.6 : 0;
        const flip = eo(sm(0.95, 1.2, t)), y = lerp(H + 3.5, c.hy, fall) + spr, top = H + 1.6;
        c.boss(c.hx, y, 1, 1, PI * (1 - flip), Math.sin(time * 1.6) * 0.1, 1, 1, 1, 0.1);
        r.bfLine(r.trA, c.hx, y + def.halfH * 0.4 * (1 - 2 * flip), c.hx, top, 1.1, 0.08, K.silk, 0.8 * (1 - flip), 7); r.bfLine(r.trN, c.hx, y + def.halfH * 0.4 * (1 - 2 * flip), c.hx, top, 1.09, 0.03, K.linen, 0.9 * (1 - flip), 1);
        const web = t > 0.5 ? Math.exp(-(t - 0.5) * 2.4) : 0;
        if (web > 0.02) for (let i = 0; i < 8; i++) { const a = WEB.a[i]; r.bfLine(r.trA, a[0], a[1], c.hx, c.hy, 0.4, 0.07, K.silk, 0.7 * web, 7, 0, 0.02 + spr * 0.2, time * 20 + i); r.bfLine(r.trN, a[0], a[1], c.hx, c.hy, 0.39, 0.025, K.linen, 0.8 * web, 1, 0, 0.02 + spr * 0.2, time * 20 + i); }
        c.dark = 0.3 * (1 - sm(0.6, 1.2, t)); c.vig = 0.15;
        c.view(0, lerp(c.hy + 1.5, c.hy - 0.5, eo(clamp(t / 0.6, 0, 1))), 0.82, 0.14, 0, 0, c.fov0); c.blendHome(eio(sm(0.75, 1.45, t)));
      }
    },

    death: COCOON
  });
})(window.ST);
