/* String Theory — GLSL for the renderer. Classic script: fills ST.shaders.
   Everything is still thread: the cloth is a plain weave with star-holes and light behind it,
   particles are lint, glints and loose stitches, trails are yarn, and the post pass is a lens over the hoop. */
(function (ST) {
  'use strict';
  const S = {};

  S.common = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1., 0.)), f.x), mix(hash12(i + vec2(0., 1.)), hash12(i + vec2(1., 1.)), f.x), f.y); }
`;

  /* Point-sprite shapes, shared by the analytic particle pools and the per-frame sprite sets.
     p is -1..1 across the sprite. Kinds: 0 glow, 1 glint, 2 lint fibre, 3 ring, 4 streak, 5 flat X-stitch,
     6 lint puff, 7 hoop of dashes, 8 rays, 9 disk, 10 dashed danger rim, 11 button (four holes), 12 hollow diamond, 13 chevron. */
  S.shape = `
float shape(float kind, vec2 p, float rot, float seed){
  float r = length(p);
  if (kind < .5) return exp(-r * r * 5.);
  float c = cos(rot), s = sin(rot); vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  if (kind < 1.5) {
    float rays = exp(-abs(q.y) * 24.) * max(0., 1. - abs(q.x)) + exp(-abs(q.x) * 24.) * max(0., 1. - abs(q.y));
    vec2 d = vec2(q.x + q.y, q.x - q.y) * .7071;
    rays += .4 * (exp(-abs(d.y) * 30.) * max(0., 1. - abs(d.x) * 1.6) + exp(-abs(d.x) * 30.) * max(0., 1. - abs(d.y) * 1.6));
    return min(2., rays + exp(-r * r * 40.) * 1.5);
  }
  if (kind < 2.5) {
    float y = .24 * sin(q.x * 4.2 + seed * 6.28) * (.4 + .6 * abs(q.x));
    return smoothstep(.11, .035, abs(q.y - y)) * smoothstep(1., .72, abs(q.x));
  }
  if (kind < 3.5) return smoothstep(.11, .0, abs(r - .82));
  if (kind < 4.5) return smoothstep(.16, .0, abs(q.y)) * smoothstep(1., .15, abs(q.x));
  if (kind < 5.5) { float d = min(abs(q.x - q.y), abs(q.x + q.y)) * .7071; return smoothstep(.17, .07, d) * step(max(abs(q.x), abs(q.y)), .72); }
  if (kind < 6.5) { float a = atan(p.y, p.x); return smoothstep(1., .3, r + .12 * sin(a * 5. + seed * 20.) + .08 * sin(a * 9. - seed * 13.)); }
  if (kind < 7.5) { float a = atan(q.y, q.x); return smoothstep(.1, .02, abs(r - .84)) * step(fract(a / 6.2832 * 16.), .55); }
  if (kind < 8.5) { float a = atan(q.y, q.x); return pow(max(0., cos(a * 4.)), 10.) * smoothstep(1., .05, r) + exp(-r * r * 14.) * .7; }
  if (kind < 9.5) return smoothstep(1., .82, r);
  if (kind < 10.5) { float a = atan(q.y, q.x); return smoothstep(.13, .03, abs(r - .78)) * step(fract(a / 6.2832 * 8.), .62); }
  if (kind < 11.5) { float hole = 0.; for (int i = 0; i < 4; i++) { float a = float(i) * 1.5708 + .785; hole += smoothstep(.13, .07, length(q - vec2(cos(a), sin(a)) * .3)); }
    return smoothstep(1., .9, r) * (1. - hole) * (.75 + .25 * smoothstep(.75, .65, r)); }
  if (kind < 12.5) { float d = abs(q.x) + abs(q.y); return smoothstep(.2, .07, abs(d - .74)) + smoothstep(.2, .06, d) * .9; }   // 12: hollow diamond with a pip (colour-blind-safe enemy shots)
  { float d = abs(q.y - abs(q.x) * .9 + .3); return smoothstep(.2, .06, d) * step(abs(q.x), .72); }   // 13: a chevron, point down (something is about to come this way)
}
`;

  // ---------- analytic particles: written once at spawn, moved on the GPU ----------
  S.particleVS = `
uniform float uTime, uScale;
attribute vec4 aV0; attribute vec4 aT; attribute vec4 aC; attribute vec4 aM; attribute float aG;
varying vec4 vC; varying vec3 vK;
void main(){
  float age = uTime - aT.x, k = age / aT.y;
  if (age < 0. || k >= 1.) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; return; }
  float dr = aT.w, f = dr > .001 ? (1. - exp(-dr * age)) / dr : age;
  vec3 p = position + aV0.xyz * f; p.y += .5 * aV0.w * age * age; p.z = max(.02, p.z - .5 * aM.w * age * age);
  vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
  float kind = aM.x, ring = step(2.5, kind) * step(kind, 3.5);
  float sz = aT.z * mix(mix(1., aG, k), mix(.15, aG, sqrt(k)), ring);
  gl_PointSize = clamp(sz * uScale / -mv.z, 0., 300.);
  float fade = mix(pow(1. - k, 1.3) * min(1., k * 16. + .15), (1. - k) * (1. - k), ring);
  if (kind > .5 && kind < 1.5) fade *= .65 + .35 * sin(age * 26. + aM.y * 7.);
  vC = vec4(aC.rgb, aC.a * fade); vK = vec3(kind, aM.y + aM.z * age, fract(aM.y * 13.17 + aT.x));
}`;
  S.spriteVS = `
uniform float uScale;
attribute vec4 aC; attribute vec4 aS;
varying vec4 vC; varying vec3 vK;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aS.x * uScale / -mv.z, 0., 300.); vC = aC; vK = aS.yzw;
}`;
  S.pointFS = `
varying vec4 vC; varying vec3 vK;
${'' /* shape() is prepended */}
void main(){
  vec2 p = gl_PointCoord * 2. - 1.; p.y = -p.y;
  float a = shape(vK.x, p, vK.y, vK.z) * vC.a;
  if (a < .004) discard;
#ifdef ADD
  gl_FragColor = vec4(vC.rgb * a, 1.);
#else
  gl_FragColor = vec4(vC.rgb, min(a, 1.));
#endif
  #include <colorspace_fragment>
}`;

  // ---------- flying stitches and yarn curls: instanced 3D debris, moved on the GPU ----------
  S.debrisVS = `
uniform float uTime;
attribute vec3 iP0; attribute vec4 iV0; attribute vec4 iT; attribute vec4 iC; attribute vec4 iR; attribute vec2 iG;
varying vec3 vN; varying vec3 vCol; varying float vHeat;
void main(){
  float age = uTime - iT.x, k = age / iT.y;
  if (age < 0. || k >= 1.) { gl_Position = vec4(2., 2., 2., 1.); return; }
  float dr = iT.w, f = dr > .001 ? (1. - exp(-dr * age)) / dr : age;
  vec3 p = iP0 + iV0.xyz * f; p.y += .5 * iV0.w * age * age; p.z = max(.04, p.z - .5 * iR.w * age * age);
  float pop = smoothstep(0., .05, k) * (1. - smoothstep(.72, 1., k));
  vec3 sc = vec3(iT.z + iG.x * age, iG.y, iG.y) * pop;
  float az = iR.x + iR.y * f, ax = iR.z * f;
  float cz = cos(az), sz = sin(az), cx = cos(ax), sx = sin(ax);
  mat3 Rz = mat3(cz, sz, 0., -sz, cz, 0., 0., 0., 1.);
  mat3 Rx = mat3(1., 0., 0., 0., cx, sx, 0., -sx, cx);
  mat3 R = Rz * Rx;
  vec3 w = R * (position * sc) + p;
  vN = normalize(R * normal);
  vCol = iC.rgb; vHeat = iC.w * max(0., 1. - age * 2.2);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.);
}`;
  S.debrisFS = `
varying vec3 vN; varying vec3 vCol; varying float vHeat;
void main(){
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 L = normalize(vec3(-.38, .32, .87));
  float d = max(dot(n, L), 0.) * .62 + mix(.22, .42, n.z * .5 + .5);
  vec3 c = vCol * d + vCol * vHeat * 2.2 + vec3(1., .78, .5) * vHeat * vHeat * 1.5;
  gl_FragColor = vec4(c, 1.);
  #include <colorspace_fragment>
}`;

  // ---------- strips: thread trails, wires, chalk lines, all in one batch ----------
  S.stripVS = `
attribute vec4 aUv; attribute vec4 aCol; varying vec4 vUv; varying vec4 vCol;
void main(){ vUv = aUv; vCol = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
  /* styles: 0 glow thread, 1 plied yarn, 2 running stitch (dashed), 3 wire, 4 satin ribbon, 5 chain loops,
     6 chalk dashes, 7 silk, 8 frayed yarn, 9 zigzag dashes, 10 basting (long tacking stitches) */
  S.stripFS = `
uniform float uTime;
varying vec4 vUv; varying vec4 vCol;
void main(){
  float u = vUv.x, v = vUv.y, s = vUv.z, st = vUv.w, edge = 1. - abs(v);
  float a = vCol.a; vec3 c = vCol.rgb;
  if (st < .5) { float core = smoothstep(0., .9, edge); a *= core * core; c *= 1. + 1.6 * pow(edge, 6.); }
  else if (st < 1.5) { float ply = .72 + .28 * sin((s * 26. + v * 2.2) * 3.14159); a *= smoothstep(0., .35, edge); c *= ply * (.62 + .38 * edge); }
  else if (st < 2.5) { float d = fract(s / .44); float on = smoothstep(0., .05, d) * smoothstep(.64, .58, d);
    float ply = .78 + .22 * sin((s * 30. + v * 2.2) * 3.14159); a *= on * smoothstep(0., .4, edge); c *= ply * (.7 + .3 * edge); }
  else if (st < 3.5) { a *= smoothstep(0., .6, edge); c *= .6 + 3.2 * pow(edge, 5.); }
  else if (st < 4.5) { float sheen = .5 + .5 * sin(s * 34. - uTime * 18. + v * 1.5); a *= smoothstep(0., .45, edge) * (.55 + .45 * sheen); c *= .7 + .9 * sheen; }
  else if (st < 5.5) { vec2 q = vec2((fract(s / .3) - .5) * 2.4, v); float r = length(q * vec2(1., 1.25)); a *= smoothstep(.3, .05, abs(r - .72)); c *= 1. + .8 * smoothstep(.2, 0., abs(r - .72)); }
  else if (st < 6.5) { float d = fract(s / .5 - uTime * 2.); a *= step(d, .5) * smoothstep(0., .5, edge); }
  else if (st < 7.5) { a *= edge * (.55 + .45 * sin(s * 11. - uTime * 13.)); c *= 1. + .6 * pow(edge, 4.); }
  else if (st < 8.5) { float br = step(.35, fract(s * 3.1 + sin(s * 17.) * .3)); float split = smoothstep(.2, .0, abs(abs(v) - .55 - .2 * sin(s * 23. + uTime * 30.)));
    a *= max(br * smoothstep(0., .4, edge), split); c *= .8 + .2 * sin(s * 80.); }
  else if (st < 9.5) { float d = fract(s / .3); a *= smoothstep(0., .06, d) * smoothstep(.7, .62, d) * smoothstep(0., .4, edge); c *= 1. + .5 * edge; }
  else { float d = fract(s / 1.15); float ply = .8 + .2 * sin((s * 24. + v * 2.2) * 3.14159);
    a *= smoothstep(0., .02, d) * smoothstep(.84, .8, d) * smoothstep(0., .4, edge); c *= ply * (.7 + .3 * edge) * (1. + .5 * smoothstep(.06, 0., d) + .5 * smoothstep(.74, .8, d)); }
  if (a < .004) discard;
#ifdef ADD
  gl_FragColor = vec4(c * a, 1.);
#else
  gl_FragColor = vec4(c, min(a, 1.));
#endif
  #include <colorspace_fragment>
}`;

  // ---------- quads with their own look: hoops, auras, beams, burns, nets, the sampler path, the capture cone ----------
  S.quadVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
  /* uKind: 0 soft glow, 1 thimble hoop (dashes, X stitches, brass rim), 2 aura with drifting wisps,
     3 starch hoop (satin rays), 4 weak-spot hoop with crosshair stitches, 5 charge (converging rings) */
  S.hoopFS = `
uniform vec3 uColor, uColor2; uniform float uAlpha, uKind, uTime, uRot;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p), a = atan(p.y, p.x) + uRot;
  vec3 c = uColor; float m = 0.;
  if (uKind < .5) { m = exp(-r * r * 4.); }
  else if (uKind < 1.5) {
    float rim = smoothstep(.05, .015, abs(r - .9));
    float dash = smoothstep(.04, .0, abs(r - .76)) * step(fract(a / 6.2832 * 22.), .56);
    vec2 cq = vec2((fract(a / 6.2832 * 11.) - .5) * .354, r - .62) * 7.;
    float xs = smoothstep(.22, .08, min(abs(cq.x - cq.y), abs(cq.x + cq.y)) * .7071) * step(max(abs(cq.x), abs(cq.y)), .7);
    float glow = exp(-pow((r - .8) / .2, 2.)) * .3;
    c = uColor * (dash * 2.2 + xs * 1.4 + glow) + uColor2 * rim * 1.4; m = 1.;
  }
  else if (uKind < 2.5) {
    float w = vnoise(vec2(a * 2.5, r * 3. - uTime * .6)) * vnoise(vec2(a * 5. + 3., r * 6. + uTime * .4));
    m = exp(-r * r * 3.) * (.35 + 1.3 * w) * smoothstep(1., .7, r);
  }
  else if (uKind < 3.5) {
    float rays = pow(.5 + .5 * cos(a * 18.), 3.) * smoothstep(.98, .7, r) * smoothstep(.45, .7, r);
    float rim = smoothstep(.05, .0, abs(r - .95)) + smoothstep(.04, .0, abs(r - .7)) * step(fract(a / 6.2832 * 28.), .5);
    c = uColor * (rays * .9 + rim * 1.8 + exp(-pow((r - .8) / .25, 2.)) * .4); m = 1.;
  }
  else if (uKind < 4.5) {
    float ring = smoothstep(.07, .02, abs(r - .78)) * step(fract(a / 6.2832 * 14.), .6);
    float inner = smoothstep(.04, .0, abs(r - .55)) * .7;
    vec2 q = vec2(cos(-uRot) * p.x - sin(-uRot) * p.y, sin(-uRot) * p.x + cos(-uRot) * p.y);
    float tick = 0.; for (int i = 0; i < 4; i++) { float an = float(i) * 1.5708; vec2 d = q - vec2(cos(an), sin(an)) * .95; vec2 e = vec2(d.x + d.y, d.x - d.y) * .7071;
      tick += smoothstep(.05, .015, min(abs(e.x), abs(e.y))) * step(length(d), .12); }
    c = uColor * (ring * 2. + inner + tick * 2.2 + exp(-r * r * 6.) * .25); m = 1.;
  }
  else { float w = fract(r * 3. + uTime * 2.5); m = smoothstep(.15, .0, abs(w - .5)) * smoothstep(1., .3, r) + exp(-r * r * 9.) * 1.5; }
  gl_FragColor = vec4(c * m * uAlpha, 1.);
  #include <colorspace_fragment>
}`;
  S.beamFS = `
uniform vec3 uColor; uniform float uWarn, uOn, uTime, uKind, uW, uH, uEnd;
varying vec2 vUv;
void main(){
  float x = (vUv.x - .5) * 2., ax = abs(x), yW = vUv.y * uH;
  vec3 c = uColor; float a = 0.;
  // the column runs past both ends of the cloth and falls away over the frame: it never stops on a line
  float ends = smoothstep(0., uEnd, vUv.y) * smoothstep(0., uEnd, 1. - vUv.y);
  if (uWarn >= 0.) {
    float march = step(fract(yW / .5 - uTime * 3.), .55);
    float edge = smoothstep(.12, .0, abs(ax - .9)) * march;
    float fillTo = 1. - uWarn;
    float fill = step(fillTo, vUv.y) * (.14 + .08 * sin(uTime * 26.)) * (1. - ax * .4);
    float cy = fract(yW / 1.1 + uTime * 1.6);
    float chev = smoothstep(.07, .0, abs(cy - .3 - ax * .3)) * step(ax, .55) * uKind;
    float blink = .6 + .4 * step(.5, fract(uTime * (4. + uWarn * 10.)));
    // the telegraph: a steady floor of colour that thickens as the strike nears, and a bright line racing down the last third
    float body = (.05 + .15 * uWarn * uWarn) * (1. - ax * .5);
    float last = smoothstep(.66, 1., uWarn), sweep = smoothstep(.09, .0, abs(vUv.y - (1. - (uWarn - .66) / .34))) * last * (1. - ax * .3);
    a = ((edge * .95 + fill + chev * .8) * blink + body + sweep * .9) * ends; c *= 1.4 + sweep;
  } else {
    float core = exp(-x * x * 5.);
    float streak = vnoise(vec2(x * 5., yW * .55 + uTime * 16.)) * vnoise(vec2(x * 9. + 4., yW * .3 + uTime * 9.));
    float shimmer = .8 + .2 * sin(yW * 2. - uTime * 40.);
    c = uColor * (.3 + .55 * core * shimmer + 1.1 * streak * (1. - ax * .6));
    a = clamp(core * .75 + streak * .6 * (1. - ax) + .2 * smoothstep(1., .6, ax), 0., 1.) * uOn * ends;
  }
  if (a < .004) discard;
  gl_FragColor = vec4(c, min(a, 1.));
  #include <colorspace_fragment>
}`;
  S.burnFS = `
uniform float uTime, uLife, uSeed, uGrow; uniform vec3 uGlare, uEmber, uChar;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p), an = atan(p.y, p.x);
  float n = vnoise(p * 3. + uSeed) * .55 + vnoise(p * 7. - uTime * .4 + uSeed) * .3;
  float R = .5 * uGrow + n * .2;
  float hole = smoothstep(R, R - .05, r);
  float rim = exp(-pow((r - R) / .06, 2.));
  float charm = smoothstep(R + .42, R + .02, r) * (1. - hole) * (.75 + .25 * vnoise(p * 9. + uSeed));
  float fl = .55 + .45 * vnoise(vec2(an * 4. + uSeed, uTime * 7.));
  vec3 c = mix(uChar, uEmber * (.9 + 1.3 * fl), rim);
  float inner = smoothstep(0., R, r);
  c = mix(c, mix(uGlare * .55, uEmber * .75, inner * inner) * (.8 + .2 * sin(uTime * 9. + r * 10.)), hole);
  float a = max(hole, max(rim * fl, charm * .9)) * uLife;
  if (a < .004) discard;
  gl_FragColor = vec4(c, min(a, 1.));
  #include <colorspace_fragment>
}`;
  S.netFS = `
uniform float uTime, uGapX, uGapW, uW; uniform vec3 uColor, uKnot;
varying vec2 vUv;
void main(){
  float x = (vUv.x - .5) * uW, y = (vUv.y - .5) * .9;
  float fx = fract((x + uW * .5) / .7), tri = 1. - abs(fx * 2. - 1.);
  float z1 = abs(y - (.1 - .3 * tri)), z2 = abs(y - (-.2 + .3 * tri));
  float line = smoothstep(.045, .012, min(z1, z2)) + smoothstep(.03, .01, abs(y - .1)) * .6;
  float gx = abs(x - uGapX) - uGapW * .5;
  line *= smoothstep(-.02, .06, gx);
  float shimmer = 1. + 1.6 * exp(-pow(fract(x * .07 - uTime * .55) - .5, 2.) * 60.) + .3 * sin(x * 9. + uTime * 11.);
  float knot = 0.; for (int i = 0; i < 2; i++) { float kx = uGapX + (float(i) * 2. - 1.) * uGapW * .5; knot += smoothstep(.17, .1, length(vec2(x - kx, y + .05))); }
  float pulse = .75 + .25 * sin(uTime * 10.);
  vec3 c = mix(uColor * shimmer, uKnot * 2.2 * pulse, clamp(knot, 0., 1.));
  float a = max(line * .95, knot);
  if (a < .004) discard;
  gl_FragColor = vec4(c, min(a, 1.));
  #include <colorspace_fragment>
}`;
  S.pathVS = `attribute vec3 aP; varying vec3 vP; void main(){ vP = aP; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
  S.pathFS = `
uniform float uTime, uSewn; uniform vec3 uLinen, uHot;
varying vec3 vP;
void main(){
  float u = vP.x, v = vP.y, s = vP.z, edge = 1. - abs(v);
  float sewn = step(u, uSewn);
  float dot = smoothstep(.45, .2, length(vec2((fract(s / .26) - .5) * 2.6, v)));
  float d = fract(s / .4); float dash = smoothstep(0., .05, d) * smoothstep(.62, .56, d) * smoothstep(0., .45, edge);
  float head = exp(-max(0., uSewn - u) * 40.) * sewn;
  vec3 c = mix(uLinen * .7, uLinen * (1.1 + .4 * sin(s * 3. - uTime * 6.)) + uHot * head * 3., sewn);
  float a = mix(dot * .32, dash * (.85 + .15 * sin(uTime * 4. + s)), sewn);
  if (a < .004) discard;
  gl_FragColor = vec4(c, min(a, 1.));
  #include <colorspace_fragment>
}`;
  /* Cones of light (the Spinner's capture beam, the Atlas's gaze) lie on the cloth. They never end on a line: uClip is a
     rectangle in world units (x0, y0, x1, y1) well outside the frame, and the light falls away over uFade units before it,
     across the frame and onto the table. */
  S.coneVS = `varying vec2 vUv; varying vec2 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }`;
  S.coneFS = `
uniform float uTime, uAlpha, uPull, uFade; uniform vec3 uColor; uniform vec4 uClip;
varying vec2 vUv; varying vec2 vW;
void main(){
  float clip = smoothstep(0., uFade, min(min(vW.x - uClip.x, uClip.z - vW.x), min(vW.y - uClip.y, uClip.w - vW.y)));
  if (clip <= 0.) discard;
  float y = 1. - vUv.y, param = (vUv.x - .5) / max(y, .02);
  float strands = pow(abs(sin(param * 3.14159 * 13. + sin(y * 6. - uTime * 3.) * .6)), 18.);
  float band = smoothstep(.4, .0, abs(fract(y * 2.5 - uTime * 1.8) - .5));
  float side = smoothstep(.5, .35, abs(param));
  float m = (strands * (.6 + uPull) + band * .25 + .12) * side * smoothstep(0., .1, y) * smoothstep(1., .86, y) * clip;   // the far end falls away too: no hard base
  gl_FragColor = vec4(uColor * m * uAlpha * (1. + uPull * 2.), 1.);
  #include <colorspace_fragment>
}`;

  // ---------- the stitch batch (fx.js Stitches): every counted chart on screen in one instanced draw ----------
  /* One instance is one X-stitch (the mesh: two crossed legs, aLeg 0 or 1). iRef names the placed chart (a row of tStSlots:
     four columns of its matrix, then its tint and yarn effects) and the stitch (two texels of tStCells: where it sits, and the
     colours of its two legs). */
  S.stitchPars = `
uniform highp sampler2D tStCells; uniform highp sampler2D tStSlots; uniform int uStW;
attribute vec2 iRef; attribute float aLeg;
mat4 stM; vec4 stA; vec4 stB;
void stLoad(){
  int s = int(iRef.x + .5), c = int(iRef.y + .5) * 2;
  stM = mat4(texelFetch(tStSlots, ivec2(0, s), 0), texelFetch(tStSlots, ivec2(1, s), 0), texelFetch(tStSlots, ivec2(2, s), 0), texelFetch(tStSlots, ivec2(3, s), 0));
  stA = texelFetch(tStCells, ivec2(c % uStW, c / uStW), 0);
  stB = texelFetch(tStCells, ivec2((c + 1) % uStW, (c + 1) / uStW), 0);
}
vec3 stPos(){ return (stM * vec4(position + vec3(stA.xy, 0.), 1.)).xyz; }
`;
  /* Lit (MeshStandardMaterial): the normal goes through the chart's matrix the way three.js does it for InstancedMesh, so the
     stitches shade exactly as the old one-draw-per-chart pools did. */
  S.stitchNormal = `
stLoad();
{ int s = int(iRef.x + .5); vec4 stT = texelFetch(tStSlots, ivec2(4, s), 0), stF = texelFetch(tStSlots, ivec2(5, s), 0);
  vStCol = (aLeg < .5 ? vec3(stA.z, stA.w, stB.x) : stB.yzw) * stT.rgb; vStFx = vec4(stT.w, stF.x, stF.y, 0.); }
mat3 stIm = mat3(stM);
vec3 objectNormal = stIm * (normal / vec3(dot(stIm[0], stIm[0]), dot(stIm[1], stIm[1]), dot(stIm[2], stIm[2])));
`;
  /* Shadows on a phone: every stitch flattened onto the cloth along the light (a planar projection), its legs fattened a little,
     drawn into a small shadow mask (a quarter of the screen, brightest wins) that the cloth reads back softly. One small draw
     instead of a shadow map: no second pass over the scene, no shadow lookups in every pixel of the cloth, frame and table.
     The mask's softness at a quarter size stands in for the shadow map's own blur. */
  S.stitchShadowVS = `
uniform vec3 uLight;
void main(){
  stLoad(); vec3 w = (modelMatrix * stM * vec4(position + normal * .3 + vec3(stA.xy, 0.), 1.)).xyz; vec2 p = w.xy - uLight.xy * (max(w.z, 0.) / uLight.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 0., 1.);
}`;
  S.projVS = `
uniform vec3 uLight; attribute float aCell; varying float vCell;
void main(){
  vCell = aCell; vec3 w = (modelMatrix * vec4(position, 1.)).xyz; vec2 p = w.xy - uLight.xy * (max(w.z, 0.) / uLight.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 0., 1.);
}`;
  S.shadeFS = `uniform float uStrength, uDissolve; varying float vCell;
void main(){ if (vCell < uDissolve) discard; gl_FragColor = vec4(uStrength); }`;
  S.shadeFlatFS = `uniform float uStrength; void main(){ gl_FragColor = vec4(uStrength); }`;

  // ---------- the cloth, baked: drawn once when a stage starts (render.js bakeCloth), sampled every frame ----------
  /* Pass 0 -> the cloth's colour (its weave, its patches and their sashiko outlines, the mottling) in rgb and how open the weave
     is (where the light behind shows through) in alpha. Pass 1 -> the star-holes: rg = their steady and twinkling light (stored
     as sqrt(v / 4)), b = which star (sets its twinkle), a = the frame's shadow on the cloth (1 lit, 0 shaded).
     Each stage has its own fabric (C.PANELS[i].fabric): plain weave, linen, twill, tartan, velvet, knit, felt, damask, royal. */
  S.bakeFS = `
uniform sampler2D tMend; uniform vec4 uField; uniform int uPass, uWeave; uniform float uDens, uStars, uSeed;
uniform vec3 uWarp, uWeft, uAlt, uAlt2, uPatchA, uPatchB, uStitch, uMottle; uniform vec3 uLight; uniform vec4 uFrame, uMendT;
varying vec2 vUv;
vec3 lin(vec3 c){ return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }
float fbm(vec2 p){ return vnoise(p) * .5 + vnoise(p * 2.03 + 7.1) * .25 + vnoise(p * 4.1 + 3.3) * .125 + vnoise(p * 8.3 + 1.7) * .0625; }
/* A thread's rounded profile across its width: 1 on its crown, 0 at its edges. */
float crown(float x){ return smoothstep(.5, .2, abs(x)); }
/* Tartan: a sett of coloured stripes, mirrored, read by thread index. */
vec3 sett(float i){ float k = mod(i, 48.); k = k < 24. ? k : 47. - k;
  return k < 9. ? uWarp : k < 13. ? uWeft : k < 14. ? uAlt : k < 19. ? uWeft : k < 23. ? uWarp : uAlt2; }
void weave(vec2 P, out vec3 col, out float relief, out float gap){
  vec2 f = P * uDens, cell = floor(f), g = fract(f) - .5;
  float warp = crown(g.x), weft = crown(g.y);
  col = uWarp; relief = 1.; gap = 0.;
  if (uWeave == 0 || uWeave == 1) {   // plain weave (1: linen, coarser, with slubs and uneven threads)
    float over = mod(cell.x + cell.y, 2.);
    float h = max(warp * mix(.4, .75 + .25 * cos(g.y * 3.14159), over), weft * mix(.75 + .25 * cos(g.x * 3.14159), .4, over));
    gap = (1. - warp) * (1. - weft);
    if (uWeave == 1) {   // every thread uneven along its length: thick slubs and thin runs, not cell by cell
      float sx = vnoise(vec2(cell.x * 7.3, P.y * 2.3)), sy = vnoise(vec2(P.x * 2.3, cell.y * 7.3 + 9.)), sl = over > .5 ? sx : sy;
      float slub = smoothstep(.6, .92, sl); h = min(1., h + slub * .3); gap *= 1. - slub * .8;
      col = mix(uWeft, uWarp, over) * (.88 + .3 * sl); }
    relief = .78 + .38 * h;
  } else if (uWeave == 2 || uWeave == 3 || uWeave == 7) {   // twill: 2 over 1 (denim) or 2 over 2 (tartan, royal); royal turns it into a herringbone
    float rep = uWeave == 2 ? 3. : 4., up = uWeave == 2 ? 2. : 2.;
    float dir = 1.; if (uWeave == 7) dir = mod(floor(cell.x / 6.), 2.) < 1. ? 1. : -1.;
    float over = step(mod(cell.x * dir - cell.y, rep), up - .5);
    float h = over > .5 ? warp * (.8 + .2 * cos(g.y * 3.14159)) : weft * (.8 + .2 * cos(g.x * 3.14159));
    relief = .74 + .42 * h; gap = (1. - warp) * (1. - weft) * .7;
    if (uWeave == 3) col = over > .5 ? sett(cell.x) : sett(cell.y);
    else col = over > .5 ? uWarp : uWeft;
    if (uWeave == 7) {   // gold lozenges brocaded into the herringbone, on a half-drop lattice
      vec2 lc = cell / 9.; lc.x += mod(floor(lc.y), 2.) * .5; vec2 lq = (fract(lc) - .5) * 9.;
      float gold = step(abs(lq.x) + abs(lq.y) * 1.4, 2.2) * (1. - step(abs(lq.x) + abs(lq.y) * 1.4, .9) * .6);
      col = mix(col, uAlt, gold * max(weft, warp)); relief += gold * .12; }
  } else if (uWeave == 4) {   // velvet: no weave to see, a crushed pile
    float n = fbm(P * 1.3 + uSeed), m = fbm(P * 5.7 - uSeed);
    col = mix(uWarp, uWeft, smoothstep(.3, .75, n)); relief = .85 + .3 * m; gap = 0.;
  } else if (uWeave == 5) {   // knit: columns of V-shaped loops (stockinette)
    vec2 k = vec2(P.x * uDens, P.y * uDens * 1.35), c = floor(k), q = fract(k) - .5;
    float side = q.x < 0. ? -1. : 1., leg = abs((q.x - side * .25) * 1.6 - side * (q.y + .5) * .35);
    float loop = smoothstep(.34, .1, leg) * smoothstep(.62, .38, abs(q.y));
    float fleck = step(.975, hash12(c * vec2(1.3, 7.1) + uSeed)) * loop;
    col = mix(uWarp, uWeft, fleck * .7) * (.9 + .2 * hash12(vec2(c.x, 3.))); relief = .62 + .55 * loop; gap = (1. - loop) * smoothstep(.2, .45, abs(q.x)) * .8;
  } else if (uWeave == 6) {   // felt: matted fibres, no weave
    float n = fbm(P * 9.), fib = abs(sin((P.x * 31. + n * 14.) + fbm(P * 3. + 4.) * 9.));
    col = mix(uWarp, uWeft, smoothstep(.35, .7, fbm(P * 1.8 + uSeed))); relief = .82 + .22 * n + .08 * fib; gap = 0.;
  } else {   // 8: silk damask: a satin ground, and a figure where the floats turn the other way
    vec2 m = P / 2.6; vec2 mc = floor(m), mq = fract(m) - .5; if (mod(mc.x + mc.y, 2.) > .5) mq = mq.yx;
    float r = length(mq), a = atan(mq.y, mq.x);
    float fig = smoothstep(.02, -.02, r - (.28 + .08 * cos(a * 6.) + .04 * cos(a * 12.))) + smoothstep(.03, 0., abs(abs(mq.x) + abs(mq.y) - .46)) * .8;
    fig = clamp(fig, 0., 1.);
    float fx = mod(cell.x * 2. + cell.y, 5.), fy = mod(cell.y * 2. + cell.x, 5.);
    float floatX = smoothstep(.5, .3, abs(g.y)) * (.75 + .25 * smoothstep(1., 0., fx / 4.)), floatY = smoothstep(.5, .3, abs(g.x)) * (.75 + .25 * smoothstep(1., 0., fy / 4.));
    float h = mix(floatX, floatY, fig);
    col = mix(uWarp, uWeft, fig); relief = .8 + .3 * h; gap = 0.;
  }
}
void main(){
  vec2 P = uField.xy + vUv * (uField.zw - uField.xy);
  if (uPass == 0) {
    vec3 col; float relief, gap; weave(P, col, relief, gap);
    vec4 m = texture2D(tMend, vec2(uMendT.z > .5 ? 1. - vUv.x : vUv.x, uMendT.w > .5 ? 1. - vUv.y : vUv.y) + uMendT.xy);   // the same patches, laid differently on each fabric
    vec3 c = col;   // composed in the cloth's own sRGB, the way a painted canvas would be
    c = m.r > .5 ? mix(c, uMottle, (m.r - .5) * 2.) : mix(c, vec3(0.), (.5 - m.r) * 2.);
    c = mix(c, uPatchA, .55 * m.g); c = mix(c, uPatchB, .55 * m.b);
    c = mix(c, uStitch, .28 * m.a);
    gl_FragColor = vec4(lin(c) * relief, gap);
  } else {
    // the star-holes: every 1.4-unit cell may hold one; the brightest star at a pixel names its twinkle
    vec2 sc = P / 1.4, base = floor(sc); float A = 0., Bt = 0., best = 0., seed = 0.;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 c = base + vec2(float(i), float(j)); float hh = hash12(c * 1.7 + 3.1 + uSeed); if (hh > uStars) continue;
      vec2 o = hash22(c * 2.3 + 1.7 + uSeed); vec2 q = P - (c + .2 + .6 * o) * 1.4;
      float size = .022 + .03 * fract(hh * 37.);
      float r2 = dot(q, q), r = sqrt(r2);
      float core = smoothstep(size, size * .3, r), glow = exp(-r2 / (size * size * 16.));
      float rl0 = size * 4., rl1 = size * 10., rl20 = rl0 * .45, rl21 = rl1 * .45;
      vec2 dq = vec2(q.x + q.y, q.x - q.y) * .7071;
      float r0 = exp(-abs(q.y) / (size * .3)) * max(0., 1. - abs(q.x) / rl0) + exp(-abs(q.x) / (size * .3)) * max(0., 1. - abs(q.y) / rl0)
        + .5 * (exp(-abs(dq.y) / (size * .25)) * max(0., 1. - abs(dq.x) / rl20) + exp(-abs(dq.x) / (size * .25)) * max(0., 1. - abs(dq.y) / rl20));
      float r1 = exp(-abs(q.y) / (size * .3)) * max(0., 1. - abs(q.x) / rl1) + exp(-abs(q.x) / (size * .3)) * max(0., 1. - abs(q.y) / rl1)
        + .5 * (exp(-abs(dq.y) / (size * .25)) * max(0., 1. - abs(dq.x) / rl21) + exp(-abs(dq.x) / (size * .25)) * max(0., 1. - abs(dq.y) / rl21));
      float a = core * 1.6 + glow * .12 + r0 * .15, b = glow * .25 + r1 * .7 - r0 * .15;
      A += a; Bt += b; if (a + b > best) { best = a + b; seed = hh; }
    }
    // the frame's shadow on the cloth: the rails stand 0.55 above it and the lamp is up and to the left (uLight points at it)
    float lit = smoothstep(-.04, .04, (P.x - uField.x) - uFrame.x * (-uLight.x / uLight.z)) * smoothstep(-.04, .04, (uField.w - P.y) - uFrame.x * (uLight.y / uLight.z));
    gl_FragColor = vec4(sqrt(min(A, 4.) / 4.), sqrt(min(Bt, 4.) / 4.), seed / max(uStars, .01), lit);
  }
}`;
  /* Smooth value noise on a lattice that repeats every 64 cells, for the light behind the cloth (sampled twice a pixel instead of
     computing eight hashes); the same noise as vnoise() inside one period. */
  S.noiseFS = `
varying vec2 vUv;
float h64(vec2 p){ return hash12(mod(p, 64.)); }
void main(){ vec2 p = vUv * 64.; vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  float v = mix(mix(h64(i), h64(i + vec2(1., 0.)), f.x), mix(h64(i + vec2(0., 1.)), h64(i + vec2(1., 1.)), f.x), f.y);
  gl_FragColor = vec4(v, v, v, 1.); }`;

  // ---------- the cloth: injected into MeshStandardMaterial so it keeps light and shadow ----------
  /* The cloth, every frame: only what moves is worked out here. Its weave, patches and star-holes come from the bake (map and
     tCloth2); the ripples move and light it, the light behind it drifts (two lookups of a repeating noise), the stars twinkle,
     and the frame's shadow (on tiers with the stitched shadows) is read from the bake. */
  S.clothPars = `
uniform float uTime, uHeat, uStarK, uShadeOn; uniform vec4 uRip[8]; uniform vec4 uRipB[8]; uniform vec3 uGlare, uBack, uShade; uniform vec4 uField, uSheen;
uniform sampler2D tCloth2, tNoise, tShMask; uniform vec2 uShRes;
varying vec2 vField;
vec2 cRipOff; vec2 cBump; vec3 cEmit; vec3 cBackL; float cLit;
void clothCompute(){
  vec2 P = vField; cRipOff = vec2(0.); cBump = vec2(0.); cEmit = vec3(0.); cBackL = vec3(0.); float tear = 0.;
  // the cloth is laced tight to the frame: a ripple dies away over the last stitches before the edge instead of stopping on it
  float pin = smoothstep(0., 1.1, min(min(P.x - uField.x, uField.z - P.x), min(P.y - uField.y, uField.w - P.y)));
  for (int i = 0; i < 8; i++) {
    vec4 R = uRip[i]; if (R.w <= 0.) continue;
    vec4 B = uRipB[i]; float age = uTime - R.z; if (age < 0.) continue;
    vec2 d = P - R.xy; float dist = length(d) + 1e-4; vec2 dir = d / dist;
    float rad = age * B.x, x = (dist - rad) / B.y, env = R.w * exp(-age * B.z) * pin;
    float wave = exp(-x * x) * env * cos(x * 2.2);
    cBump -= dir * (-2. * x / B.y) * exp(-x * x) * env * .3;
    cRipOff += dir * wave * .1;
    cEmit += uGlare * max(wave, 0.) * .1;
    if (B.w > .5) tear = max(tear, smoothstep(rad + .05, rad * .4, dist) * exp(-age * 5.) * R.w);
  }
  vec4 st = texture2D(tCloth2, vMapUv);   // star-holes do not move with the ripples
  cLit = st.a;
  if (uShadeOn > .5) {   // what the stitched shadows cast here (render.js shadowMask), a little blurred
    vec2 u = gl_FragCoord.xy * uShRes, o = uShRes * 1.2;
    float m = texture2D(tShMask, u + vec2(-o.x, -o.y)).r + texture2D(tShMask, u + vec2(o.x, -o.y)).r + texture2D(tShMask, u + vec2(-o.x, o.y)).r + texture2D(tShMask, u + vec2(o.x, o.y)).r;
    cLit = min(cLit, 1. - m * .25);
  }
#if DETAIL > 0
  vec3 V = normalize(cameraPosition - vec3(P, 0.));
  vec2 bp = P - V.xy / max(V.z, .2) * .9;
  float neb = texture2D(tNoise, (bp * .32 + vec2(0., uTime * .035)) / 64.).r * texture2D(tNoise, (bp * .85 - vec2(uTime * .025, 0.)) / 64.).r;
  cBackL = uBack * (.2 + 1.8 * neb * neb) * (1. + uHeat * .8);
  cEmit += cBackL * tear * 5.;
#else
  cEmit += uBack * tear * 3.;
#endif
  float A = st.r * st.r * 4., Bt = st.g * st.g * 4.;
  if (A + Bt > .002) { float hh = st.b * uStarK; float tw = .5 + .5 * sin(uTime * (.7 + 2.4 * fract(hh * 91.)) + hh * 40.); cEmit += uGlare * (A + Bt * tw * tw); }
}
`;

  // ---------- post: bright pass, separable blur, composite with shockwaves and grain ----------
  S.fsVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
  S.brightFS = `
uniform sampler2D tIn; uniform vec2 uTexel; uniform float uTh, uKnee;
varying vec2 vUv;
vec3 pick(vec2 uv){ vec3 c = texture2D(tIn, uv).rgb; float l = max(c.r, max(c.g, c.b));
  float s = clamp(l - uTh + uKnee, 0., 2. * uKnee); s = s * s / (4. * uKnee + 1e-4);
  return c * max(s, l - uTh) / max(l, 1e-4); }
void main(){
  vec2 o = uTexel;
#ifdef DOWN8
  // an eighth of the size: sixteen bilinear taps, each the mean of a 2x2 block, cover the whole 8x8 block under this texel
  vec3 c = vec3(0.);
  for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) c += pick(vUv + vec2(float(i) * 2. - 3., float(j) * 2. - 3.) * o);
  gl_FragColor = vec4(min(c * .0625, vec3(24.)), 1.);
#else
  vec3 c = pick(vUv + vec2(-o.x, -o.y)) + pick(vUv + vec2(o.x, -o.y)) + pick(vUv + vec2(-o.x, o.y)) + pick(vUv + vec2(o.x, o.y));
  gl_FragColor = vec4(min(c * .25, vec3(24.)), 1.);
#endif
}`;
  S.blurFS = `
uniform sampler2D tIn; uniform vec2 uDir;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tIn, vUv).rgb * .2270;
  c += (texture2D(tIn, vUv + uDir * 1.3846).rgb + texture2D(tIn, vUv - uDir * 1.3846).rgb) * .3162;
  c += (texture2D(tIn, vUv + uDir * 3.2308).rgb + texture2D(tIn, vUv - uDir * 3.2308).rgb) * .0703;
  gl_FragColor = vec4(c, 1.);
}`;
  S.copyFS = `uniform sampler2D tIn; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tIn, vUv).rgb, 1.); }`;
  S.compositeFS = `
uniform sampler2D tScene, tB1, tB2; uniform float uB1, uB2, uAspect, uAberr, uTime, uGrain, uVig;
uniform vec4 uWaves[4]; uniform vec3 uFlash, uVigCol; uniform float uCool;
varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 shoulder(vec3 c){ vec3 o = c - .78; return mix(c, .78 + .22 * (1. - exp(-o / .22)), step(.78, c)); }
vec3 toSRGB(vec3 c){ c = clamp(c, 0., 1.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
void main(){
  vec2 uv = vUv, off = vec2(0.);
#ifdef DISTORT
  for (int i = 0; i < 4; i++) { vec4 w = uWaves[i]; if (w.w <= 0.) continue;
    vec2 d = uv - w.xy; d.x *= uAspect; float r = length(d) + 1e-4; float x = (r - w.z) / .05;
    off += d / r * exp(-x * x) * x * w.w * vec2(1. / uAspect, 1.) * -.02; }
  uv += off;
#endif
  vec2 cd = uv - .5;
  vec3 col;
#ifdef DISTORT
  float ab = uAberr * dot(cd, cd) * .05 + length(off) * .5;
  if (ab > .00005) col = vec3(texture2D(tScene, uv + cd * ab).r, texture2D(tScene, uv).g, texture2D(tScene, uv - cd * ab).b);
  else col = texture2D(tScene, uv).rgb;
#else
  col = texture2D(tScene, uv).rgb;
#endif
#ifdef BLOOM
  col += texture2D(tB1, uv).rgb * uB1;
#endif
#ifdef BLOOM2
  col += texture2D(tB2, uv).rgb * uB2;
#endif
  col += uFlash;
  // slow time: the colour drains toward a cold moonlit blue and the highlights settle
  float lum = dot(col, vec3(.2126, .7152, .0722));
  col = mix(col, vec3(lum * .78, lum * .9, lum * 1.12 + .012) * (1. - .12 * smoothstep(.6, 1.6, lum)), uCool * .55);
  float vg = smoothstep(.95, .3, length(cd * vec2(1.05, 1.)));
  col = mix(col * (1. - uVig) + uVigCol * (1. - vg) * .5, col, vg);
  col = toSRGB(shoulder(col));
#ifdef GRAIN
  vec2 fc = gl_FragCoord.xy;
  float g = h12(fc + fract(uTime * 7.3) * 113.) - .5;
  float weave = sin(fc.x * 1.6) * sin(fc.y * 1.6) * .25;
  col += (g + weave * .3) * uGrain;
#endif
  gl_FragColor = vec4(col, 1.);
}`;

  // ---- film lens (film-kit) ----
  /* Owned by the film kit (src/film-kit.js, docs/FILM-KIT.md). Used only while a boss film asks for the lens: nothing here is
     compiled or run in play. Four full-screen passes over the film's scene and its depth:
       lensCocFS     half size: the scene, with how far out of focus each pixel is in alpha
       lensDofFS     half size, twice: a disc of TAPS samples as wide as each pixel is out of focus, bright samples weighted up
                     (bokeh); the second run, turned and narrower, fills the gaps between the first run's samples
       lensRaysFS    quarter size, twice: light shafts, TAPS samples marched toward a point on screen, then again over one step
       lensStreakFS  quarter size: a wide horizontal blur of the highlights (anamorphic streaks); run once or twice
       lensFinalFS   full size: the scene with smear or fringing, the soft picture mixed in by depth, shafts and streaks added,
                     exposure, flash and iris. Its output goes to Post as the scene, so bloom and the composite follow as usual. */
  /* How far from the lens each pixel is. The renderer draws the ground (table, cloth, frame) first and then clears the depth
     buffer (groundDone in render.js), so the ground is not in the depth texture: where nothing solid was drawn, the distance
     is worked out instead, to the plane the cloth lies in (z = 0), from the eye and the pixel's line of sight. */
  S.lensDepth = `
uniform sampler2D tDepth; uniform vec2 uNF; uniform vec4 uDof; uniform mat4 uInvVP; uniform vec3 uEye;
float lensZ(vec2 uv){ float d = texture2D(tDepth, uv).x;
  if (d > .99999) { vec4 p = uInvVP * vec4(uv * 2. - 1., 1., 1.); float pz = p.z / p.w; return pz < uEye.z - 1e-4 ? min(uNF.y, uNF.y * uEye.z / (uEye.z - pz)) : uNF.y; }
  return uNF.x * uNF.y / (uNF.y - d * (uNF.y - uNF.x)); }
float lensCoc(vec2 uv){ float z = lensZ(uv); return clamp(abs(z - uDof.x) / z * uDof.y, 0., 1.); }
`;
  S.lensCocFS = S.lensDepth + `
uniform sampler2D tScene; varying vec2 vUv;
void main(){ gl_FragColor = vec4(min(texture2D(tScene, vUv).rgb, vec3(24.)), lensCoc(vUv)); }`;
  S.lensDofFS = `
uniform sampler2D tIn; uniform vec2 uRad; uniform float uBokeh, uTurn;
varying vec2 vUv;
void main(){
  vec4 c = texture2D(tIn, vUv); float c0 = c.a, ws = 1., ca = c0; vec3 acc = c.rgb;
  if (c0 > .01) {
    for (int i = 0; i < TAPS; i++) {
      float fi = float(i) + .5, r = sqrt(fi / float(TAPS)), a = fi * 2.39996 + uTurn;
      vec4 s = texture2D(tIn, vUv + vec2(cos(a), sin(a)) * r * c0 * uRad);
      float w = smoothstep(0., 1., s.a / c0 * 1.6 + .08);       // a sharper neighbour does not smear into the blur
      float l = max(s.r, max(s.g, s.b)); w *= 1. + uBokeh * min(l * l, 9.);
      acc += s.rgb * w; ws += w; ca += s.a * w;
    }
  }
  gl_FragColor = vec4(acc / ws, ca / ws);
}`;
  S.lensRaysFS = `
uniform sampler2D tScene; uniform vec4 uRay; uniform float uTh, uAspect;
varying vec2 vUv;
void main(){
  vec2 d = (uRay.xy - vUv) * uRay.w / float(TAPS), uv = vUv;
  vec3 acc = vec3(0.); float w = 1., ws = 0.;
  for (int i = 0; i < TAPS; i++) {
    vec3 s = texture2D(tScene, clamp(uv, 0., 1.)).rgb;
    if (uTh > 0.) { float l = max(s.r, max(s.g, s.b)); s = min(s, vec3(8.)) * smoothstep(uTh, uTh * 1.5 + .3, l); }
    acc += s * w; ws += w; w *= uTh > 0. ? .95 : 1.; uv += d;
  }
  vec2 q = (uRay.xy - vUv) * vec2(uAspect, 1.);
  gl_FragColor = vec4(acc / ws * uRay.z * (uTh > 0. ? 1. / (1. + dot(q, q) * 2.5) : 1.), 1.);
}`;
  S.lensStreakFS = `
uniform sampler2D tIn; uniform vec2 uDir; uniform float uTh;
varying vec2 vUv;
vec3 pick(vec2 uv){ vec3 c = texture2D(tIn, uv).rgb; if (uTh <= 0.) return c; float l = max(c.r, max(c.g, c.b)); return min(c, vec3(12.)) * smoothstep(uTh, uTh * 2. + .25, l); }
void main(){
  vec3 c = pick(vUv); float ws = 1.;
  for (int i = 1; i <= 7; i++) { float f = float(i), w = exp(-f * f / 20.); c += (pick(vUv + uDir * f) + pick(vUv - uDir * f)) * w; ws += 2. * w; }
  gl_FragColor = vec4(c / ws, 1.);
}`;
  S.lensFinalFS = S.lensDepth + `
uniform sampler2D tScene, tDof, tRays, tStreak;
uniform vec3 uSmear, uFlash, uRayCol, uStreakCol; uniform vec4 uIris;
uniform float uFringe, uExposure, uAspect, uRaysOn, uStreakOn;
varying vec2 vUv;
void main(){
  vec2 uv = vUv, cd = uv - .5, sm = uSmear.xy + cd * uSmear.z; vec3 col;
  if (dot(sm, sm) > 2e-7) { col = vec3(0.); for (int i = 0; i < 7; i++) col += texture2D(tScene, uv + sm * (float(i) / 6. - .5)).rgb; col /= 7.; }
  else if (uFringe > .00005) { vec2 o = cd * uFringe * (.5 + dot(cd, cd) * 5.); col = vec3(texture2D(tScene, uv + o).r, texture2D(tScene, uv).g, texture2D(tScene, uv - o).b); }
  else col = texture2D(tScene, uv).rgb;
  if (uDof.z > .5) { vec4 b = texture2D(tDof, uv); col = mix(col, b.rgb, smoothstep(.03, .32, max(lensCoc(uv), b.a * .9))); }
  if (uRaysOn > .5) col += texture2D(tRays, uv).rgb * uRayCol;
  if (uStreakOn > .5) col += texture2D(tStreak, uv).rgb * uStreakCol;
  col = col * uExposure + uFlash;
  if (uIris.z > 0.) { vec2 q = (uv - uIris.xy) * vec2(uAspect, 1.); col *= 1. - smoothstep(uIris.z, uIris.z + uIris.w, length(q)); }
  gl_FragColor = vec4(col, 1.);
}`;
  // ---- /film lens ----

  ST.shaders = S;
})(window.ST);
