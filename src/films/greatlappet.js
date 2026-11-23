/* String Theory — the films of the Great Lappet: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.

   Her films are about one thing: a dead leaf in a shaft of autumn light. Their own camera language is the fall (cranes that
   sink, drift and roll with a leaf in the air) and the rack of focus; their colour is umber, ochre and one warm shaft of low
   sun; their props are her own: the leaf she hides in (a stitched oak leaf on a hinge down its midrib, built here), the shaft
   (a cone of light with dust turning in it, built here) and the patch of sun it lays on the cloth, dappled with leaf shadows (a painted layer). */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const BROWN = [0.56, 0.42, 0.28];

  // =====================================================================================================================
  //  Her things: the leaf, the shaft, the sun patch. Built once (k.prop / k.layer in setup), placed every frame.
  // =====================================================================================================================
  const LEAF_W = 3.5, LEAF_H = 4.3;                    // the leaf, flat: across the two halves, and from the stem's end to the tip
  const SUN = [1, 0.74, 0.42], SUN_HOT = [1, 0.86, 0.62], DUSK = [0.55, 0.36, 0.2];   // light colours (linear)
  /* The leaf's face: an oak leaf worked in cross stitch on umber felt. The midrib is her pale stripe (tan), the veins her dark
     brown, the leaf between them ochre and rust going brown at the curled edge: her own colours, gone dead. Painted on a canvas
     once; u runs across the leaf, v from the stem (0) to the tip (1). */
  function leafWidth(v) {   // half-width of the leaf at v, as a fraction of LEAF_W / 2: four rounded lobes a side, a stalk below
    if (v < 0.12) return 0.035;
    const u = (v - 0.12) / 0.88, body = Math.pow(Math.sin(PI * Math.pow(u, 0.85)), 0.8);
    const lobes = 0.72 + 0.28 * Math.pow(Math.abs(Math.sin(u * PI * 4.2 + 0.3)), 0.6);
    return Math.max(0.035, body * lobes * (u > 0.93 ? 1 - (u - 0.93) / 0.07 * 0.6 : 1));
  }
  function paintLeaf(x, w, h) {
    x.clearRect(0, 0, w, h);
    const cx = w / 2, px = v => (1 - v) * h;          // canvas y of v
    // the felt the stitches are worked on: solid inside the outline
    x.fillStyle = PAL.umber; x.beginPath();
    for (let i = 0; i <= 120; i++) { const v = i / 120; x.lineTo(cx + leafWidth(v) * cx * 0.98, px(v)); }
    for (let i = 120; i >= 0; i--) { const v = i / 120; x.lineTo(cx - leafWidth(v) * cx * 0.98, px(v)); }
    x.closePath(); x.fill();
    // cross stitches on a grid
    const n = 30, cs = w / n, rows = Math.round(h / cs), lw = Math.max(1, cs * 0.2);
    x.lineCap = 'round';
    for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
      const sx = (i + 0.5) * cs, sy = (j + 0.5) * cs, v = 1 - sy / h, hw = leafWidth(v) * cx * 0.94, d = Math.abs(sx - cx);
      if (d > hw || v < 0.02) continue;
      const e = d / Math.max(1, hw), hh = hash(i * 13.1 + j * 7.7), vu = (v - 0.12) / 0.88;
      // veins: from the midrib out and up toward each lobe
      const vein = vu > 0.05 && Math.abs(((vu * 4.2 + 0.3 - e * 0.55) % 1 + 1) % 1 - 0.5) < 0.07 && e > 0.12 && e < 0.9;
      let col = PAL.ochre;                            // her own colours, gone dead: ochre mottled with brown, rust and a little saffron
      if (hh < 0.26) col = PAL.saffronInk; else if (hh < 0.36) col = PAL.brown; else if (hh < 0.43) col = PAL.madderDeep; else if (hh > 0.92) col = PAL.saffron;
      if (e > 0.78) col = hh < 0.5 ? PAL.darkBrown : PAL.umber;   // the dry, curled edge
      if (vein) col = PAL.darkBrown;
      if (d < cs * 0.75) col = PAL.tan;               // the midrib: her pale stripe
      if (v < 0.13) col = PAL.brown;                  // the stalk
      const a = cs * 0.36;
      x.strokeStyle = 'rgba(20,12,6,.55)'; x.lineWidth = lw * 1.7;
      x.beginPath(); x.moveTo(sx - a, sy - a); x.lineTo(sx + a, sy + a); x.moveTo(sx + a, sy - a); x.lineTo(sx - a, sy + a); x.stroke();
      x.strokeStyle = col; x.lineWidth = lw;
      x.beginPath(); x.moveTo(sx - a, sy + a); x.lineTo(sx + a, sy - a); x.stroke();
      x.beginPath(); x.moveTo(sx - a, sy - a); x.lineTo(sx + a, sy + a); x.stroke();
    }
  }
  /* Two halves hinged on the midrib, each a bent grid: the edges cup up and the tip curls, as a dry leaf does. The halves turn
     on the hinge (left.rotation.y = fold, right = -fold): open flat at 0, cupped at 0.45, shut at 1.5. Lit by the film's lights,
     and glowing through (emissive) when the sun is behind it. */
  function buildLeaf(T) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * LEAF_H / LEAF_W); paintLeaf(cv.getContext('2d'), cv.width, cv.height);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color(0, 0, 0), alphaTest: 0.5, side: T.DoubleSide, roughness: 0.88, metalness: 0 });
    const g = new T.Group();
    for (let sd = -1; sd <= 1; sd += 2) {
      const geo = new T.PlaneGeometry(LEAF_W / 2, LEAF_H, 6, 14), p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) + sd * LEAF_W / 4, y = p.getY(i), v = (y + LEAF_H / 2) / LEAF_H, e = Math.abs(x) / (LEAF_W / 2);
        p.setXYZ(i, x, y, 0.42 * e * e + 0.5 * Math.pow(Math.max(0, (v - 0.72) / 0.28), 2) - 0.12 * Math.sin(v * PI) * e);
        uv.setXY(i, (x + LEAF_W / 2) / LEAF_W, v);
      }
      geo.computeVertexNormals();
      const m = new T.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 4; g.add(m);
    }
    g.userData.mat = mat;
    return g;
  }
  /* The shaft: an open cone of warm light from the window to the cloth, brightest down its middle and fading along its length,
     with slow dusty striations drifting through it. One additive draw on every tier. */
  const SHAFT_VS = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
  const SHAFT_FS = `
uniform float uTime, uAlpha, uFloor; uniform vec3 uColor;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  float f = abs(dot(normalize(vN), normalize(vV))); f = f * f * f;
  float v = vUv.y, along = smoothstep(1., .82, v) * (.35 + .65 * smoothstep(0., .9, 1. - v)) * smoothstep(0., uFloor, v);
  float n = vnoise(vec2(vUv.x * 14., v * 2.2 - uTime * .12)) * .55 + vnoise(vec2(vUv.x * 31. + 3., v * 5. + uTime * .07)) * .45;
  float a = f * along * (.25 + 1.1 * n * n) * uAlpha;
  if (a < .003) discard;
  gl_FragColor = vec4(uColor * a, 1.);
  #include <colorspace_fragment>
}`;
  function buildShaft(T) {
    const geo = new T.CylinderGeometry(0.34, 1, 1, 22, 1, true); geo.translate(0, -0.5, 0);   // apex end (y 0) at the window, y -1 on the cloth
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));   // v: 0 at the window, 1 on the cloth
    const m = new T.Mesh(geo, FX.shaderMat(T, { vs: SHAFT_VS, fs: SHAFT_FS, add: true, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uFloor: { value: 0.3 }, uColor: { value: new T.Vector3(1, 0.7, 0.36) } } }));
    m.frustumCulled = false; m.renderOrder = 7;
    m.userData.up = new T.Vector3(0, 1, 0); m.userData.dir = new T.Vector3();
    return m;
  }
  /* Stand the shaft from the window (sx, sy, sz) to (px, py, pz) on the cloth, r1 wide there (a third of that at the window). */
  function shaft(k, sx, sy, sz, px, py, pz, r1, rgb, alpha, floor) {
    if (alpha <= 0.004) return;
    const m = k.prop('shaft'), u = m.material.uniforms, d = m.userData.dir.set(sx - px, sy - py, sz - pz), len = d.length(); d.multiplyScalar(1 / len);
    m.position.set(sx, sy, sz); m.quaternion.setFromUnitVectors(m.userData.up, d); m.scale.set(r1, len, r1);
    u.uTime.value = k.t; u.uAlpha.value = alpha; u.uFloor.value = floor === undefined ? 0.3 : floor; u.uColor.value.set(rgb[0], rgb[1], rgb[2]);
  }
  /* A black flag over the top rail and everything above it (from her low angles the lit rail reads as a shelf behind her). */
  function buildFlag(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0) })); m.renderOrder = -3; return m; }
  /* The sun patch's stand-in: the shaft's warm patch on the cloth, dappled with the soft shadows of oak leaves between the
     window and the cloth (her disguise, many times over), feathered at its edges. */
  function paintSun(x, w, h) {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5); g.addColorStop(0, PAL.glare); g.addColorStop(0.45, PAL.saffron); g.addColorStop(0.8, 'rgba(122,79,8,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'multiply'; x.filter = 'blur(' + Math.max(1, w * 0.007).toFixed(1) + 'px)';
    for (let i = 0; i < 34; i++) {   // the shadows of leaves between the window and the cloth: dappled, a few sharp, most soft
      const cx = w * hash(i * 3.1 + 1), cy = h * hash(i * 5.7 + 2), dx = (cx - w / 2) / w, dy = (cy - h / 2) / h, sc = w * (0.06 + 0.07 * hash(i * 1.9 + 3)), a = hash(i * 7.3) * TAU;
      if (dx * dx + dy * dy < 0.028) continue;   // the middle stays clear: she lies there
      x.fillStyle = hash(i * 9.1) < 0.5 ? 'rgba(58,44,32,.85)' : 'rgba(75,58,43,.6)';
      x.save(); x.translate(cx, cy); x.rotate(a); x.beginPath();
      for (let j = 0; j <= 30; j++) { const v = j / 30; x.lineTo(leafWidth(v) * sc * 0.5, (0.5 - v) * sc * 1.2); }
      for (let j = 30; j >= 0; j--) { const v = j / 30; x.lineTo(-leafWidth(v) * sc * 0.5, (0.5 - v) * sc * 1.2); }
      x.closePath(); x.fill(); x.restore();
    }
    x.filter = 'none'; x.globalCompositeOperation = 'source-over';
  }

  // ---- dust: drawn from the film clock alone, so a held frame, a still and a skip all show the same thing
  /* Dust turning in the shaft: n motes spread through the cone from (sx, sy, sz) to (px, py, pz), each a soft disc that swells
     as it leaves the plane of focus (fz: the focus distance from the camera, fa: its strength), brighter in the middle of the
     shaft. wind pushes them along +x (the gale). */
  function shaftDust(k, n, sx, sy, sz, px, py, pz, r1, rgb, alpha, fz, fa, wind, seed) {
    const r = k.r, cam = k.cam, t = k.t, fa2 = k.has.dof ? fa : fa * 0.35, cdx = cam.tx - cam.px, cdy = cam.ty - cam.py, cdz = cam.tz - cam.pz, cl = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz) || 1;
    const ax = px - sx, ay = py - sy, az = pz - sz;
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 1.37 + seed), h2 = hash(i * 2.91 + seed * 1.3), h3 = hash(i * 4.13 + seed * 2.1), h4 = hash(i * 5.77 + seed * 0.7);
      const a = ((h1 + t * (0.008 + 0.02 * h2)) % 1), rad = r1 * (0.25 + 0.75 * a) * Math.sqrt(h3), an = h4 * TAU + t * (0.15 + 0.3 * h2) * (h1 < 0.5 ? 1 : -1);
      let x = sx + ax * a + Math.cos(an) * rad, y = sy + ay * a + Math.sin(an) * rad * 0.5, z = sz + az * a + Math.sin(an) * rad * 0.8;
      let lit = 1;
      if (wind) { const w = ((h2 * 9 + t * wind * (0.6 + 0.8 * h3)) % 9) - 4.5; x += w; y += Math.sin(t * 3 + i) * 0.1 * wind / 6;
        // blown out of the shaft, it is out of the sun: as bright as it is near the shaft's axis
        const ox = x - sx, oy = y - sy, oz = z - sz, al = (ox * ax + oy * ay + oz * az) / (ax * ax + ay * ay + az * az), qx = ox - ax * al, qy = oy - ay * al, qz = oz - az * al;
        lit = sm(r1 * 1.1, r1 * 0.35, Math.sqrt(qx * qx + qy * qy + qz * qz)); if (lit < 0.02) continue; }
      if (z < 0.05) continue;
      const zv = ((x - cam.px) * cdx + (y - cam.py) * cdy + (z - cam.pz) * cdz) / cl; if (zv < 0.3) continue;
      const coc = fa2 > 0 ? Math.min(1, Math.abs(zv - fz) / zv * fa2) : 0, edge = Math.min(1, a / 0.12, (1 - a) / 0.12), tw = 0.6 + 0.4 * Math.sin(t * (1.3 + h1 * 3) + h3 * 20);
      const s = (0.05 + 0.05 * h4) * (1 + coc * 9);
      if (wind && coc < 0.35) r.spr.add(x, y, z, s * 3.2, rgb, alpha * edge * lit * 0.9, 4, 0.08 * Math.sin(t * 2 + i));   // blown: a streak
      else r.spr.add(x, y, z, s, rgb, alpha * edge * tw * lit * (1 - 0.6 * rad / r1) / (1 + coc * coc * 14), coc > 0.2 ? 9 : 0);
    }
  }
  /* A puff of her scale dust from (ox, oy, oz) at film time t0: n grains thrown out and up, slowed by the air, settling. */
  function dustBurst(k, t0, ox, oy, oz, n, speed, life, rgbA, rgbB, alpha) {
    const tau = k.t - t0; if (tau < 0 || tau > life) return;
    const r = k.r, fade = 1 - tau / life, dr = (1 - Math.exp(-3.2 * tau)) / 3.2;
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 3.17 + t0), h2 = hash(i * 1.91 + t0 * 2), h3 = hash(i * 7.3 + t0 * 3), a = h1 * TAU, el = 0.25 + h2 * 1.1, sp = speed * (0.35 + 0.65 * h3);
      const x = ox + Math.cos(a) * Math.cos(el) * sp * dr * 1.3, y = oy + Math.sin(a) * Math.cos(el) * sp * dr - 0.35 * tau * tau, z = oz + Math.sin(el) * sp * dr * 0.9 + 0.1;
      r.spr.add(x, y, z, 0.05 + 0.08 * h2, h3 < 0.65 ? rgbA : rgbB, alpha * fade * fade * (0.6 + 0.4 * Math.sin(tau * 14 + i)), h1 < 0.12 ? 1 : 0, h3 * 6);
    }
  }

  /* Scale dust sifting down off her wings as she beats them in the sun: grains on loops of their own, from the film clock. */
  function scaleFall(k, bx, by, bz, n, rgb, alpha) {
    const r = k.r, t = k.t;
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 2.13 + 5), h2 = hash(i * 3.71 + 1), h3 = hash(i * 5.19 + 7), life = 0.9 + 0.8 * h2, a = ((t * (1 / life) + h1) % 1);
      const x = bx + (h3 - 0.5) * 4.4 + Math.sin(t * 2 + i) * 0.2 * a, y = by - 0.2 + (h1 - 0.5) * 1.6 - a * a * 2.4, z = bz + 0.15 + (h2 - 0.5) * 0.6;
      r.spr.add(x, y, z, 0.05 + 0.05 * h2, rgb, alpha * Math.sin(a * PI) * (0.5 + 0.5 * Math.sin(t * 17 + i * 3)), h1 < 0.15 ? 1 : 0, h3 * 6);
    }
  }

  // =====================================================================================================================
  //  The entrance: "Leaf Fall"
  // =====================================================================================================================
  /* ENTRANCE "Leaf Fall"  len 7.6 s  key 5.56 (the still)  lights 2
     idea:     one dead leaf spirals down a shaft of autumn light, past the lens, falls into focus on the cloth, and cracks open
               into her wings.
     camera:   the fall: a crane sinking through the shaft, then a camera high in the shaft looking down it as the leaf goes past
               the lens and away, a rack of focus from the leaf to the cloth; after the crack a low angle that rises with her.
     colour:   umber, ochre and one warm shaft (saffron sun)     rhythm: hush, drift, (slow) pass, drift, settle, silence, CRACK, wings
     handover: a defocus into the sun's bloom at 6.05-6.25 hides the CUT to the play camera; the fight racks into focus on her,
               fluttering where her script starts her, as the house lights come up.

     beat     film s      shot (camera, lens)                                 what we see                                    light                       sound / buzz
     dark     0-0.5       black; the gate opens to a slit                     nothing; a draught stirs the cloth             none                        lappet_draught 0.15, sting
     shaft    0.5-2.1     side wide, sinking slowly; rays from the window     the shaft slants down from the window's glare  the sun (light 0) low in    lappet_shaft 0.5, flutter 1.25
                                                                              onto the cloth, dust turning in it; the leaf   the shaft; the window
                                                                              tumbles out of the glare, eclipsing it         light laid on the cloth
     pass     2.1-2.7     CUT: high in the shaft, looking down it; slow       the leaf goes by the lens, huge, soft and      the sun behind us: the      lappet_pass 1.8
                          motion 0.3x; focus on the leaf                      lit amber, and on down the light               leaf lit as it crosses it
     follow   2.7-3.75    the camera sinks a little after it, the lens        it spirals down, rocking, smaller; the focus   the sun patch on the        lappet_flutter 2.9
                          widening; focus racks to the cloth at 2.95-3.4      goes ahead of it; it falls into focus          cloth
     lie      3.75-4.5    held, drifting; deep focus on the leaf              it lies in the sun patch, leaf shadows round   the same                    lappet_land 3.75 (buzz), lappet_stir 4.2
                                                                              it; a ring in the cloth; it stirs once       
     crack    4.5-4.72    the same; slow 0.45x and a 0.1 s hold at the        light splits its midrib, the halves fly open   light 1: a burst off the    lappet_crack 4.5 (buzz)
                          crack; fringe, shake                                and she is there; scale dust bursts            wings
     rise     4.72-6.05   CUT on the action: low, under her; rising with      she lifts into the shaft, colour flooding      the sun behind her; light   lappet_wings 4.75 (buzz), title 4.95
                          her; rays from the window streaming past her        back, wings beating, dust sifting; billows     1 catching her wings
                                                                              roll away across the cloth
     out      6.05-6.25   the focus goes to nothing; the sun blooms           all soft and warm                              exposure up, warm flash
     settle   6.25-7.6    CUT under the bloom to the play camera; focus       her, fluttering where the fight starts her     house lights up by 7.1      buzz 6.25
                          racks in; gate opens 7.1-7.6
     still (reduced motion): 5.56, the low angle with her wings spread in the shaft, under the title. */
  const FALL0 = 1.2, LAND = 3.75, CRACK = 4.5, CUT1 = 2.1, CUT2 = 4.72, CUT3 = 6.25;
  const SP = new Float32Array(6);                     // the shaft this frame: window (0-2) and the point on the cloth (3-5)
  const LF = new Float32Array(8);                     // the leaf this frame: x, y, z, rx, ry, rz, fold, s (how far down the shaft)
  /* Where the leaf is at film time t, on the path down the shaft (SP must be set). */
  function leafAt(k, t, hx, hy) {
    const u = clamp((t - FALL0) / (LAND - FALL0), 0, 1), su = u * u * (3 - 2 * u);
    let s = lerp(u, su, 0.55) + 0.022 * Math.sin(u * PI * 6) * Math.sin(u * PI);   // falling: gliding, catching, gliding
    s = clamp(s, 0, 1);
    const qx = lerp(SP[0], SP[3], 0.06), qy = lerp(SP[1], SP[4], 0.06), qz = lerp(SP[2], SP[5], 0.06);
    const lx = hx + 0.15, ly = hy - 0.3, lz = 0.14;     // where it comes to rest
    const th = 0.6 + s * TAU * 1.35, R = 1.15 * Math.pow(1 - s, 0.85);
    LF[0] = lerp(qx, lx, s) + R * Math.cos(th); LF[1] = lerp(qy, ly, s) + 0.3 * R * Math.sin(2 * th); LF[2] = lerp(qz, lz, s) + 0.75 * R * Math.sin(th);
    const wob = Math.pow(1 - s, 0.6);
    LF[3] = 0.95 * Math.sin(th * 1.5) * wob; LF[4] = 0.75 * Math.cos(th * 1.5 + 0.4) * wob; LF[5] = -0.18 + 1.5 * Math.sin(th * 0.5) * (1 - s);
    LF[6] = 0.45 + 0.08 * Math.sin(t * 9.3) * wob; LF[7] = s;
  }
  function placeLeaf(k, x, y, z, rx, ry, rz, fold, glow, lit) {
    const g = k.prop('leaf'); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); g.scale.setScalar(1);
    g.children[0].rotation.y = fold; g.children[1].rotation.y = -fold;
    const m = g.userData.mat; m.emissive.setRGB(glow * 1.0, glow * 0.62, glow * 0.3); m.color.setRGB(lit, lit, lit);
  }

  const LEAFFALL = {
    kit: true, len: 7.6, key: 5.56, lights: 2,
    sheet: [0.9, 1.6, 2.15, 2.35, 2.9, 3.5, 4.1, 4.55, 4.85, 5.56, 6.2, 7.0],
    beats: {
      dark:   [0, 0.5, 'out'],
      shaft:  [0.5, CUT1, 'io'],
      pass:   [CUT1, 2.7, 'lin'],
      follow: [2.7, LAND, 'io'],
      lie:    [LAND, CRACK, 'io'],
      crack:  [CRACK, CUT2, 'out'],
      rise:   [CUT2, 6.05, 'io'],
      out:    [6.05, CUT3, 'in'],
      settle: [CUT3, 7.6, 'out']
    },
    ramp: [[2.08, 1], [2.12, 0.3], [2.46, 0.3], [2.64, 1], [4.48, 1], [4.53, 0.45], [4.7, 1]],
    title: { at: 4.95, iv: 0.05, in: 'drift', pos: 'low', to: 7.3 },
    css: '.fk-t.i-drift .fk-n span.on{animation:gl-drift 1.05s cubic-bezier(.3,.55,.35,1) both}.i-drift .fk-rule{border-top-color:#B5832F}' +
      '@keyframes gl-drift{0%{opacity:0;color:#B5832F;transform:translate(-.25em,-1.5em) rotate(-40deg);filter:blur(6px)}' +
      '30%{opacity:.9;transform:translate(.22em,-.85em) rotate(26deg);filter:blur(3.5px)}55%{color:#C9B38C;transform:translate(-.12em,-.32em) rotate(-12deg);filter:blur(1.4px)}' +
      '80%{transform:translate(.04em,-.05em) rotate(3deg);filter:blur(.3px)}100%{opacity:1;transform:none;filter:none}}',
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the pass's slow motion
       (film 2.08 to 2.64) adds 0.95 s, the crack's 0.15 s more, and the hold at the crack 0.1 s. Film 2.1 / 3.75 / 4.5 / 4.75 / 6.25
       are real 2.1 / 4.7 / 5.45 / 5.9 / 7.4; the title 6.1; the end 8.75. */
    music: { name: 'lappet_in_sting', len: 9.6, gain: 0.85, desc: 'Entrance sting for the Great Lappet, a moth that hides as a dead leaf. Instrumental, autumnal and hushed. From 0.5 s a soft high string harmonic fades in as sunlight appears. From 1.25 s a solo celesta plays a slow falling figure, one note at a time, drifting down like a leaf (about one note every 0.45 s, each a step lower, with a little swing), over a held warm string chord; at 2.1 s a low soft swell under it as the leaf passes close, easing back by 3.2 s; the falling notes reach the bottom at 4.7 s and everything stops dead: a held breath of silence. At 5.45 s a sudden full hit: low strings and a soft timpani stroke with a bright harp glissando sweeping up; from 5.9 s a warm French horn melody rises over swelling strings, broad and golden, building to a full warm chord that lands at 7.4 s and holds, then fades out by 9.6 s' },
    sounds: {
      lappet_draught: { at: 0.15, len: 2.2, gain: 0.55, desc: 'A cold autumn draught through a gap in a high window in an empty attic: out of silence a soft airy hush rises over a second, a loose window frame creaks once at 0.4 s, a very faint thin whistle rides on top, and it settles into a gentle breathing wind by 2.2 s' },
      lappet_shaft:   { at: 0.5, len: 1.8, gain: 0.45, desc: 'Sunlight breaking through: a soft glassy shimmer swelling over 0.6 s, like a fingertip on the rim of a wine glass with a few tiny high glints of dust catching the light, holding, then thinning away by 1.8 s. Delicate and warm, not musical notes' },
      lappet_pass:    { at: 1.8, len: 1.9, gain: 0.9, desc: 'One large dry leaf tumbling right past the listener\'s ear in slow motion: a deep, slowed-down whoosh of air that swells over 0.5 s with a crisp papery crackle at its peak at 0.55 s, then sweeps away and trails off into a soft fluttering rustle that fades by 1.9 s. Close, intimate, large' },
      lappet_flutter: { at: [1.25, 2.9], len: 1.0, gain: 0.5, desc: 'A single dry leaf seesawing down through still air: a light papery flutter, three soft rustling flips about 0.3 s apart, each a little quieter. Close, dry, no reverb' },
      lappet_land:    { at: LAND, len: 0.9, gain: 0.6, desc: 'A dry leaf settling onto a stretched cloth: a tiny papery tick on contact, a soft scrape as it slides a finger\'s width and stops, then a faint dusty sigh; silent by 0.9 s' },
      lappet_stir:    { at: 4.2, len: 0.35, gain: 0.45, desc: 'Something alive inside a dead leaf: one tiny dry crinkle, like a fingernail pressed into a dried leaf, very close' },
      lappet_crack:   { at: CRACK, len: 1.5, gain: 1, desc: 'A dead leaf cracking open into wings: a sharp, loud dry crack like a stiff old book snapped open or a brittle leaf split along its spine, with a deep soft woody thump under it, then at 0.1 s a big soft puff of powdery dust bursting out and hissing away into the air, settling by 1.5 s' },
      lappet_wings:   { at: CUT2 + 0.03, len: 1.8, gain: 0.85, desc: 'A great moth lifting off: three heavy slow wingbeats, each a soft papery whump of moving air, at 0, 0.42 and 0.84 s, the first the biggest, with dry leaf litter skittering across cloth after each; then a soft fluttering hover that fades by 1.8 s' }
    },
    buzz: [[LAND, 14], [CRACK, [40, 30, 70]], [CUT2 + 0.03, 18], [CUT3, 24]],
    steps: [
      [LAND, k => { const r = k.r, K = k.K, x = k.c.hx + 0.15, y = k.c.hy - 0.3; r.lintPuff(x, y, 0.3, 6, K.tan, 0.5, 0.9); r.ripple(x, y, 0.35, 4, 0.5, 2.2); }],   // a ring in the cloth's own shader: the grid is held still while she lies
      [CRACK + 0.04, k => { const r = k.r; r.shake = Math.max(r.shake, 0.38); k.hold(0.1); }],
      [CUT2 + 0.03, k => { const r = k.r, K = k.K, x = k.c.hx, y = k.c.hy - 0.3;
        for (let i = 0, n = r.n(22); i < n; i++) { const a = rnd(-0.5, 0.5) + (i % 2 ? 0 : PI); r.lint.emit(x + Math.cos(a) * 2, y + rnd(-1, 1), 0.2, Math.cos(a) * rnd(3, 7), rnd(-0.5, 0.8), rnd(0.2, 1), rnd(0.7, 1.2), rnd(0.25, 0.4), K.brown, 0.5, 6, 2, 1.5, undefined, rnd(-3, 3), 0); } }]
    ],
    setup(k) {
      k.prop('leaf', buildLeaf); k.prop('shaft', buildShaft); k.prop('flag', buildFlag);
      k.layer('sunpatch', { aspect: 1.2, cells: 20, order: 'out', add: true, paint: paintSun });
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, time = r.time, hx = c.hx, hy = c.hy, post = k.has.post, lo = post ? 1 : 0.5;
      const cut = t >= CUT3;
      // ---- the shaft, from the window high up on the left to the cloth just under where she will lie
      SP[0] = hx - 5.0; SP[1] = hy + 6.8; SP[2] = 9.0; SP[3] = hx + 0.25; SP[4] = hy - 0.55; SP[5] = 0;
      const sun = cut ? 0 : k.ease.io(k.span(0.45, 1.3));   // gone with the cut: the fight is lit as the fight is
      leafAt(k, t, hx, hy);
      const cracked = t >= CRACK + 0.06, lx = hx + 0.15, ly = hy - 0.3;

      // ---- house lights: dark, then up after the cut
      k.dark(cut ? lerp(0.75, 0, k.ease.io(k.span(6.3, 7.1))) : 1, cut ? 0 : 0.86);
      k.vig(cut ? 0.35 * (1 - k.span(6.3, 7.0)) : 0.6);
      if (!cut) k.quiet();

      // ---- light 0 is the sun: a third of the way up the shaft; light 1 is the light thrown off her wings as they crack open
      const sx = lerp(SP[3], SP[0], 0.26) - 1.4, sy = lerp(SP[4], SP[1], 0.26), sz = lerp(SP[5], SP[2], 0.26);
      if (sun > 0.01) k.light(0, sx, sy, sz, SUN, (t >= CUT1 && t < CUT2 ? 5 : 13) * sun * lo, 6);   // looking down the shaft, the sun patch on the cloth is the light; the lamp would flatten it
      const burst = k.pulse(CRACK + 0.05, 0.04, 0.6), catchK = cut ? 0 : k.ease.io(k.span(CUT2, 5.4)) * (1 - k.span(6.05, CUT3));
      if (!cut && burst + catchK > 0.01) { const lift = k.ease.io(k.span(CUT2, 6.0));
        k.light(1, lerp(lx, lerp(lx, hx, lift) - 1.6, catchK), lerp(ly + 0.2, lerp(ly, hy, lift) + 1.8, catchK), lerp(1.4, 3.4, catchK), SUN_HOT, (30 * burst + 30 * catchK) * lo, lerp(4.5, 9, catchK)); }
      // the sun patch on the cloth, and the warm falloff round it
      if (sun > 0.01) {
        k.layer('sunpatch').at(SP[3] - 0.2, SP[4] + 0.15, 0.03, 7.2, 6.0, -0.35).alpha((t >= CUT1 && t < LAND ? 0.3 : 0.42) * sun * (post ? 1 : 0.7));
        k.pool(SP[3], SP[4] + 0.3, 5.5, K.saff, 0.05 * sun);
        if (!cut && t < CUT1) k.flare(SP[0], SP[1], SP[2], 2.2, K.saffHi, 0.5 * sun, 0.3);   // the window: the glare the shaft comes from
        shaft(k, SP[0], SP[1], SP[2], SP[3], SP[4], SP[5], 1.75, SUN, (t >= CUT1 && t < CUT2 ? 0.1 : 0.26) * sun * (post ? 1 : 0.8));   // seen down its length it would wash the picture
      }
      // the draught: the cloth breathes in the sun until she lands; her wings roll billows away from her
      if (!cut) {
        const breath = 0.06 * sm(0.3, 1.2, t) * (1 - sm(2.9, 3.4, t)), beat = k.in('rise') ? 0.12 * (1 - k.beat('rise')) : 0;
        if (breath + beat > 0.002) k.cloth.wind(breath + beat, 1, 0.35, 6, t * (beat ? 5 : 1.3));
        if (t >= CRACK && t < CRACK + 1.4) k.cloth.wave(lx, ly, 0.3 + (t - CRACK) * 6, 0.22 * (1 - (t - CRACK) / 1.4), 0.7);
        k.cloth.crumple(0.05, 0.8, 0);
        flagUp(k);
      }

      // ---- the leaf, then her
      if (!cracked) {
        let x = LF[0], y = LF[1], z = LF[2], rx = LF[3], ry = LF[4], rz = LF[5], fold = LF[6];
        if (t >= LAND) {   // at rest; it stirs once, then cracks open
          x = lx; y = ly; z = 0.14; rx = 0; ry = 0; rz = -0.18;
          const stir = k.pulse(4.2, 0.05, 0.25); fold = 0.42 + 0.08 * stir; rz += 0.03 * stir;
          if (t >= CRACK) fold = lerp(0.42, -0.7, k.ease.out(k.span(CRACK, CRACK + 0.06)));
        }
        // amber glow when the sun is behind it (the leaf between the lens and the window)
        const vx = cam.px - x, vy = cam.py - y, vz = cam.pz - z, wx = SP[0] - x, wy = SP[1] - y, wz = SP[2] - z;
        const behind = clamp(-(vx * wx + vy * wy + vz * wz) / ((hyp(vx, hyp(vy, vz)) * hyp(wx, hyp(wy, wz))) || 1), 0, 1);
        const ax = SP[3] - SP[0], ay = SP[4] - SP[1], az = SP[5] - SP[2], al = Math.sqrt(ax * ax + ay * ay + az * az), ox = x - SP[0], oy = y - SP[1], oz = z - SP[2];
        const along = clamp((ox * ax + oy * ay + oz * az) / (al * al), 0, 1), ddx = ox - ax * along, ddy = oy - ay * along, ddz = oz - az * along, rad = 1.75 * (0.34 + 0.66 * along);
        const inShaft = sm(rad * 1.25, rad * 0.55, Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz)) * sun;
        if (t >= 1.0) placeLeaf(k, x, y, z, rx, ry, rz, fold, (0.04 + (0.42 + 0.6 * behind) * inShaft) * lo, 1);
        k.hideBoss();
        const seam = k.pulse(CRACK, 0.03, 0.12);
        if (seam > 0.01) for (let i = 0; i < 11; i++) { const v = (i / 10 - 0.45) * LEAF_H * 0.82, cr = Math.cos(rz), sr = Math.sin(rz);   // light splitting the midrib open
          r.spr.add(x - sr * v, y + cr * v, z + 0.3, 0.75, K.saffHi, 0.9 * seam, 4, rz + PI / 2); r.spr.add(x - sr * v, y + cr * v, z + 0.32, 0.4, K.glare, 0.8 * seam, 4, rz + PI / 2); }
        if (t > 1.05 && t < CUT1) k.flare(x, y + 0.6, z + 0.3, 0.7, K.saffHi, 0.55 * hash(Math.floor(t * 9)) * sm(1.05, 1.3, t), 0);   // high up, it glints as it turns
      } else {
        // her: the crack throws her open on the cloth, then she lifts into the shaft and drifts to where the fight starts her
        const lift = k.ease.io(k.span(CUT2, 6.0)), flood = k.ease.out(k.span(CRACK + 0.06, 5.3));
        const bx = lerp(lx, hx, lift), by = lerp(ly, hy, lift), bz = cut ? 1 : lerp(0.16, 1, lift) + 0.08 * Math.sin(time * 1.7) * lift;
        let wing = -0.25 * (1 - k.ease.out(k.span(CRACK, CRACK + 0.25)));
        if (t >= CUT2) wing = Math.sin((t - CUT2) * 15) * 0.55 * (1 - sm(5.3, 6.0, t)) + Math.sin(time * 2.5) * 0.28 * sm(5.3, 6.0, t) - 0.08;
        if (cut) wing = Math.sin(time * 2.5) * 0.28 - 0.08;
        const lean = cut ? 0 : t >= CUT2 ? 0.38 : 0;
        k.boss(bx, by, bz, 1, cut ? 0 : -0.18 * (1 - lift), wing, lerp(BROWN[0], 1, flood), lerp(BROWN[1], 1, flood), lerp(BROWN[2], 1, flood), cut ? 0 : 0.2 * burst, lean);
        if (!cut) {
          dustBurst(k, CRACK + 0.05, lx, ly, 0.3, Math.round(56 * Math.max(0.5, k.q())), 5.5, 1.9, K.saffHi, K.tan, 0.8);
          for (let i = 0; i < 3; i++) { const n = Math.round(18 * Math.max(0.5, k.q())); dustBurst(k, CUT2 + 0.03 + i * 0.42, bx - 1.7, by - 0.3, bz, n, 3.2, 1.2, K.saffHi, K.linen, 0.75); dustBurst(k, CUT2 + 0.05 + i * 0.42, bx + 1.7, by - 0.3, bz, n, 3.2, 1.2, K.saffHi, K.linen, 0.75); }
          if (t >= CUT2) scaleFall(k, bx, by, bz, Math.round(26 * Math.max(0.5, k.q())), K.saffHi, 0.7 * (1 - k.span(6.0, CUT3)));
        }
      }

      // ---- the camera
      let fz = 0, fa = 0;                              // the focus for the dust: distance and strength
      if (cut) {
        cam.home();
        const rk = k.ease.out(k.span(CUT3, 6.8)); lens.focus(hx, hy, 1, 2.8 * (1 - rk), 0.02);
      } else if (t < CUT1) {
        // the shaft from the side: a slow crane down, as if sinking through it; the window off the top left
        const u = k.ease.io(k.span(0, CUT1));
        cam.fov = 34; cam.orbit(hx - 2.3, lerp(hy + 4.6, hy + 3.4, u), 2.8, cam.fit(9.6, 16), 0.3, 0.42, lerp(0.05, 0.02, u)).handheld(0.02, 0.7);
        lens.rays(SP[0], SP[1], SP[2], 0.9 * sun, SUN, 0.7, 0.55);
        fz = 0; fa = 0;
      } else if (t < CUT2) {
        // at the top of the shaft looking down it: the leaf goes by the lens and falls away into the light; the camera sinks after it
        const u = k.ease.io(k.span(CUT1, 4.6)), a = lerp(0.11, 0.13, u);
        const px = lerp(SP[0], SP[3], a) + 2.1, py = lerp(SP[1], SP[4], a) + lerp(0.3, -0.4, u), pz = lerp(SP[2], SP[5], a) + 0.6;
        const fol = 1 - k.ease.io(k.span(3.3, 4.2)), lt = t < 2.1 ? 0 : 0.55 * fol;
        const tx = lerp(SP[3], LF[0], lt), ty = lerp(SP[4] + 0.2, LF[1], lt), tz = lerp(0.1, LF[2], lt);
        cam.at(px, py, pz, tx, ty, tz, 0.08 * Math.sin(t * 1.1) + 0.05 * Math.sin(LF[7] * 9), lerp(36, 44, k.ease.io(k.span(2.4, 4.2)))).handheld(0.015, 0.8);
        // the rack: on the leaf as it falls, then ahead of it onto the cloth; it falls into focus and lands sharp
        const rack = k.ease.io(k.span(2.95, 3.4));
        const ldx = LF[0] - px, ldy = LF[1] - py, ldz = LF[2] - pz, ld = Math.sqrt(ldx * ldx + ldy * ldy + ldz * ldz);
        const cdx = SP[3] - px, cdy = SP[4] - py, cdz = SP[5] - pz, cd = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
        const fd = t >= LAND ? cd : lerp(Math.max(1.2, ld), cd, rack);
        lens.focusAt(fd, t < LAND ? 2.2 : 1.4, 0.022);
        fz = fd; fa = t < LAND ? 2.2 : 1.4;
        if (t >= CRACK) { lens.fringe(2.2 * k.pulse(CRACK + 0.04, 0.03, 0.3)); }
      } else {
        // the cut on the action: low and close, under her; rising with her into the shaft; the window's rays through her wings
        const u = k.ease.out(k.span(CUT2, 6.05)), ty = lerp(ly + 0.2, hy + 0.5, u);
        cam.fov = lerp(44, 40, u); cam.orbit(lerp(lx, hx, u) + 0.1, ty, lerp(0.5, 1.0, u), cam.fit(lerp(6.0, 6.8, u), lerp(6.0, 6.8, u)), lerp(1.0, 0.78, u), 0.26, -0.03 + 0.04 * u).handheld(0.03, 1.1);
        const blow = k.ease.in(k.span(6.05, CUT3));
        lens.rays(SP[0], SP[1], SP[2], (0.8 + 0.5 * k.pulse(CUT2, 0.05, 0.6)) * (1 - 0.5 * blow), SUN, 0.8, 0.55);
        lens.focus(lerp(lx, hx, u), lerp(ly, hy, u), lerp(0.2, 1, u), lerp(1.4, 0.9, u) + 2.6 * blow, 0.02 + 0.01 * blow);
        fz = cam.fit(7, 7); fa = 1.2;
        lens.fringe(1.4 * k.pulse(CUT2, 0.02, 0.35));
      }
      cam.full(cut ? 0 : 1);

      // ---- dust in the shaft (the gale has none: the air is still)
      if (!cut && sun > 0.02) shaftDust(k, Math.min(k.tier.motes, 44), SP[0], SP[1], SP[2], SP[3], SP[4], SP[5], 1.75, K.saffHi, 0.55 * sun, fz, fa, 0, 3);

      // ---- the lens: black at first; the crack; the sun blooming over the cut
      const blow = cut ? 1 - k.ease.out(k.span(CUT3, 6.7)) : k.ease.in(k.span(6.05, CUT3));
      lens.exposure((t < 0.45 ? 0 : 1) + 0.9 * blow + 0.12 * k.pulse(CRACK + 0.04, 0.03, 0.3));
      lens.flash(SUN_HOT, (post ? 0.55 : 1.4) * blow * blow + 0.05 * k.pulse(CRACK + 0.04, 0.02, 0.2));
      k.gate(cut ? 0.11 * (1 - k.ease.io(k.span(7.1, 7.6))) : lerp(lerp(0.5, 0.36, k.beat('dark')), 0.11, k.ease.out(k.span(0.5, 1.3))));
    }
  };

  // =====================================================================================================================
  //  The death: "Gale"
  // =====================================================================================================================
  /* DEATH "Gale"  len 6.4 s  key 2.9  lights 2
     idea:     a gale through the window strips her to a skeleton leaf, the cloth of her wings first, then vein by vein, and her
               pale stripe last; the wind drops and the light comes back to an empty cloth.
     camera:   it rides the wind: pushed in to the windward side, then swung downwind past her by the first gust, buffeted and
               leaning; close against the sun patch behind her for the skeleton (slow motion); carried after the last of her;
               home as the wind drops.
     colour:   umber and ochre in a dusk-dark room, one shaft of low sun     rhythm: snap, wither, gust, gust, (slow) tick-tick-tick, snap, calm
     ends on:  the play camera, house lights fully up, the cloth flat and still, nothing of hers left.

     beat     film s      shot (camera, lens)                                 what we see                                    light                       sound / buzz
     hit      0-0.35      the play camera; a beat held still (0.12 s)         she stiffens where she died                    the room starts to dim      lappet_snap 0 (buzz), sting
     wither   0.3-1.4     pushing in, round to the windward side              her colour drains to dead leaf, wings droop;   the shaft fades in, its     lappet_wither 0.3, lappet_gale 0.9
                                                                              dust starts to stream sideways                 sun patch behind her   
     gale     1.4-2.45    swung downwind past her by the first gust,          the cloth billows, dust streaks through the    the sun on her; dusk from   lappet_strip 1.5 (buzz)
                          buffeted, leaning; motion smear                     shaft, her wing cloth peels away from the      the windward side
                                                                              left in scraps
     bones    2.45-3.2    CUT: close, against the sun patch behind her;       the second gust takes the rest: a skeleton     rays from the sun patch     lappet_strip 2.4 (buzz)
                          0.4x; rays streaming out through her                leaf over the dappled light                    through her veins
     veins    3.2-4.05    pushing in                                          her veins break away one by one                the same                    lappet_veins 3.2
     last     4.05-4.5    held; the last of her leaves the frame              the pale stripe snaps and is flung away        the same                    lappet_last 4.05 (buzz)
     calm     4.5-6.4     easing home                                         the wind drops, the cloth settles, the dust    the shaft fades as the      lappet_still 4.5, title 4.6
                                                                              falls; an empty patch of sun, then the         house lights come up
                                                                              fight's own cloth
     reduced motion: the camera is held at the play camera; she withers and is stripped where she died in the same order. */
  const GUST = [1.5, 2.4], VEINS = 3.2, SNAP = 4.05, CALM = 4.5;
  const DB = new Float32Array(8);                      // where the death is staged: her centre, the window, the shaft's foot
  /* Her skeleton: the order the gale takes her stitches in. The ochre wing cloth first, from the windward (left) edge; then her
     veins one at a time, each from its tip in (the outer left, the outer right, the inner left, the inner right); last her pale
     stripe and head, from the tail up. Groups are spaced so the wind can hold between them. */
  function skeleton(x, y, m, h, c, col, row) {
    const sp = C.SPRITES.lappet, rr = sp.h - 1 - row, ch = rr >= 0 && rr < sp.h ? sp.rows[rr].charAt(col) : 'O', mid = (sp.w - 1) / 2, d = Math.abs(col - mid);
    if (ch === 'O') return (col / (sp.w - 1)) * 4 + h * 1.4;
    if (ch === 'D' && rr > 2) { const v = d >= 4.5 ? (col < mid ? 0 : 1) : (col < mid ? 2 : 3); return 10 + v * 1.1 + (1 - d / mid) * 0.8; }
    return 16 + (row / (sp.h - 1)) * 3;
  }
  function flake(k, x, y, z, rgb) {   // a stitch taken by the gale: whirled downwind and toward the lens, tumbling
    const r = k.r, cl = k.lit(rgb, x, y, z, 0.25), sp = DB[7]; cl[0] *= 0.6; cl[1] *= 0.6; cl[2] *= 0.6;   // a scrap of dead leaf, not an ember
    r.xs.emit(x, y, z + 0.1, rnd(5, 10) * sp, rnd(-0.6, 2.2), rnd(0.5, 3.5), rnd(1.0, 1.6), 0.9, cl, 0.04, rnd(0, 6), rnd(-9, 9), rnd(-10, 10), 2, 0.5, 0);
    if (Math.random() < 0.4) r.lint.emit(x, y, z, rnd(6, 11) * sp, rnd(-0.4, 0.8), rnd(0, 1), rnd(0.6, 1.1), rnd(0.25, 0.4), cl, 0.5, 2, 1, 1, 0, rnd(-1, 1), 0);
  }
  /* The unpick schedule: film time to how much of her is gone (the groups above land at 0..0.27, 0.53..0.74, 0.84..1). */
  function stripAt(t) {
    if (t < GUST[0]) return 0;
    if (t < GUST[1]) return 0.15 * eo(clamp((t - GUST[0]) / 0.7, 0, 1));
    if (t < VEINS) return lerp(0.15, 0.3, eo(clamp((t - GUST[1]) / 0.45, 0, 1)));
    if (t < SNAP) return lerp(0.5, 0.76, clamp((t - VEINS) / 0.8, 0, 1));
    return lerp(0.78, 1.01, clamp((t - SNAP - 0.22) / 0.2, 0, 1));
  }

  const GALE = {
    kit: true, len: 6.4, key: 2.9, lights: 2,
    sheet: [0.25, 0.9, 1.55, 1.95, 2.3, 2.6, 2.95, 3.45, 3.85, 4.3, 4.9, 6.2],
    beats: {
      hit:    [0, 0.35, 'out'],
      wither: [0.3, 1.4, 'io'],
      gale:   [1.4, 2.45, 'io'],
      bones:  [2.45, VEINS, 'io'],
      veins:  [VEINS, SNAP, 'lin'],
      last:   [SNAP, CALM, 'out'],
      calm:   [CALM, 6.4, 'io']
    },
    ramp: [[2.45, 1], [2.52, 0.4], [2.95, 0.4], [3.15, 1]],
    title: { at: 4.6, iv: 0.04, in: 'gale', pos: 'low', to: 6.1 },
    css: '.fk-t.i-gale .fk-n span.on{animation:gl-gale .7s cubic-bezier(.2,.75,.3,1) both}.i-gale .fk-rule{border-top-color:#B5832F}' +
      '@keyframes gl-gale{0%{opacity:0;color:#B5832F;transform:translateX(-2.4em) skewX(-38deg) scaleX(1.7);filter:blur(5px)}' +
      '45%{opacity:1;transform:translateX(.2em) skewX(9deg) scaleX(.9);filter:none}72%{color:#E6DFD0;transform:translateX(-.05em) skewX(-3deg)}100%{transform:none}}',
    /* Real seconds for the sting: the hold at the hit adds 0.12 s and the slow motion (film 2.45 to 3.15) 0.76 s more, so film
       1.5 / 2.4 / 3.2 / 4.05 / 4.5 are real 1.62 / 2.52 / 4.11 / 4.96 / 5.41, and the end real 7.31. */
    music: { name: 'lappet_down_sting', len: 7.4, gain: 0.8, desc: 'Death sting for the Great Lappet. Instrumental. A single dry pizzicato pluck at 0 s, then a low cello note that sags downward over a second. From 1.0 s tremolo strings rise with the wind, a surge at 1.62 s and a peak at 2.52 s; at 2.6 s they thin to one high sustained violin note (a skeleton held up to the light) that hangs alone until 4.11 s; from 4.11 s a run of tiny falling harp notes, faster and faster, ending on a soft muted pluck at 4.96 s; from 5.41 s a warm, quiet major chord in low strings and a single soft French horn, settling, gone by 7.4 s' },
    sounds: {
      lappet_snap:   { at: 0, len: 0.8, gain: 1, desc: 'A brittle dead leaf snapped in the hand: a sharp dry crack at 0 s, close, then a quick sharp intake of air through a gap, as if a window had been flung open, by 0.6 s' },
      lappet_wither: { at: 0.3, len: 1.3, gain: 0.5, desc: 'A leaf drying and curling in fast motion: a slow crinkling of thin paper tightening on itself, falling slightly in pitch over 1.3 s' },
      lappet_gale:   { at: 0.9, len: 4.2, gain: 0.9, desc: 'A gale through an open attic window: a low moan rising out of nothing over the first 0.6 s into a full roaring wind with flapping cloth, gusts peaking at 0.6 s and 1.5 s, then the roar held and hollow (as if heard slowed down) from 1.6 s to 3.0 s, a last hard gust at 3.1 s, and it drops away into a thin dying whistle that is gone by 4.2 s' },
      lappet_strip:  { at: GUST, len: 1.1, gain: 0.75, desc: 'A gust tearing thin, old fabric away: a fast dry rip of loose weave lasting 0.3 s and a flurry of small dry fragments skittering and tumbling away downwind, fading by 1.1 s' },
      lappet_veins:  { at: VEINS, len: 1.0, gain: 0.6, desc: 'The veins of a skeleton leaf breaking one by one: about ten tiny dry ticks like the thinnest twigs snapping, starting slow at 0 s and quickening, the last at 0.85 s, each with a faint glassy shimmer' },
      lappet_last:   { at: SNAP, len: 1.3, gain: 0.85, desc: 'The last thin strip of a leaf snapping and whirling away: one high, thin crack at 0 s, then a fluttering whir that rushes past very close and away over 0.8 s, trailing off by 1.3 s' },
      lappet_still:  { at: CALM, len: 2.0, gain: 0.55, desc: 'The wind dropping: a long soft exhale of air into stillness over 1.2 s, one tiny dry tick of something settling at 1.3 s, then a quiet warm room tone that fades by 2.0 s' }
    },
    buzz: [[0, 30], [GUST[0], 22], [GUST[1], 26], [SNAP, [20, 30, 40]]],
    steps: [
      [0.02, k => { const r = k.r; k.hold(0.12); r.shake = Math.max(r.shake, 0.2); }],
      [GUST[0], k => { const r = k.r; r.shake = Math.max(r.shake, 0.3); }],
      [GUST[1], k => { const r = k.r; r.shake = Math.max(r.shake, 0.32); }],
      [SNAP, k => { const r = k.r, K = k.K; r.glints(DB[0], DB[1] + 1.2, DB[2], 6, K.saffHi, 3, 0.25, 0.5); }]
    ],
    setup(k) {
      k.r.bfOrders.lappetskel = skeleton;
      k.prop('shaft', buildShaft); k.prop('flag', buildFlag);
      k.layer('sunpatch', { aspect: 1.2, cells: 20, order: 'out', add: true, paint: paintSun });
      k.c.acc = 0;
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, time = r.time, post = k.has.post, lo = post ? 1 : 0.5, q = k.q();
      // where it is staged: where she died, held inside the cloth so the gale has room to carry her off to the right
      const bx = clamp(c.hx, -4, 3), by = clamp(c.hy, 4.5, 14.8), bz = 1.15;
      DB[0] = bx; DB[1] = by; DB[2] = bz; DB[3] = bx - 4.6; DB[4] = by + 6.4; DB[5] = 8.6;   // the window, high on the left, as in her entrance
      const wind = sm(0.9, 1.6, t) * (1 - sm(CALM, 5.4, t)), gk = Math.max(k.pulse(GUST[0], 0.12, 0.6), k.pulse(GUST[1], 0.12, 0.6), 0.8 * k.pulse(VEINS, 0.1, 0.5), k.pulse(SNAP, 0.06, 0.5));
      DB[7] = 0.6 + 0.6 * gk;
      const calm = k.ease.io(k.span(CALM, 5.9)), sun = k.ease.io(k.span(0.2, 1.1)) * (1 - k.ease.io(k.span(4.9, 5.9)));
      k.dark(Math.max(c.d0 * (1 - k.span(0, 0.4)), 0.96 * k.ease.io(k.span(0.05, 0.9)) * (1 - calm)), 0.78 * (1 - calm));
      k.vig(0.5 * (1 - calm)); if (calm < 0.9) k.quiet();

      // ---- the sun through the window, raking down the cloth onto her
      const fx = bx + 0.55, fy = by - 0.35;   // the shaft's foot: the cloth right behind her, so from the front she stands against the light
      if (sun > 0.01) {
        const bones = k.in('bones') || k.in('veins') ? 1 : 0;   // against the light: the sun patch behind her brighter, the sun on her front less
        k.light(0, lerp(fx, DB[3], 0.22) - 1.2, lerp(fy, DB[4], 0.22), lerp(0, DB[5], 0.22), SUN, (bones ? 9 : 16) * sun * lo, 6.5);
        shaft(k, DB[3], DB[4], DB[5], fx, fy, 0, 2.1, SUN, 0.24 * sun * (post ? 1 : 0.8));
        k.layer('sunpatch').at(fx - 0.1, fy + 0.1, 0.03, 5.2, 4.4, -0.35).alpha((0.42 + 0.15 * bones) * sun * (post ? 1 : 0.7));
        k.pool(fx, fy + 0.2, 6.5, K.saff, (0.05 + 0.05 * bones) * sun);
      }
      k.light(1, bx - 2.6, by + 0.5, 2.4, DUSK, 5 * sun * lo * (1 - calm), 5.5);   // the dusk from the windward side, so the edge the wind takes reads

      // ---- the gale in the cloth: billows running downwind, harder in the gusts; eased to flat before the cloth is put back
      const amp = (0.05 + 0.07 * gk) * wind;
      if (t < 5.45 && amp > 0.0005) k.cloth.wind(amp, 1, 0.45, 7, t * 7);   // long, shallow billows: steep ones show the grid's steps in a raking light

      // ---- her: withering to a dead leaf, pressed by the wind, taken stitch by stitch; the last of her flung away
      const into = k.ease.io(k.span(0, 0.9)), drain = k.ease.io(k.span(0.25, 1.3)), push = wind * (0.5 + 0.5 * gk), fling = k.ease.in(k.span(SNAP, CALM));
      const x = bx + 0.9 * sm(1.4, 4.0, t) + 0.12 * push * Math.sin(time * 9) + 7 * fling, y = by + 0.25 * Math.sin(t * 2.3) * wind + 1.5 * fling, z = bz + 0.15 * push + 2.2 * fling;
      const wing = lerp(0.1, 0.42, drain) + 0.1 * push + 0.07 * Math.sin(time * 31) * push, rz = -0.1 * drain - 0.16 * push - 5 * fling;
      c.dboss(into, x, y, z, 1, rz, wing, lerp(1, BROWN[0], drain), lerp(1, BROWN[1], drain), lerp(1, BROWN[2], drain), 0, 0.12 * push, 0.2 * push);
      const u = stripAt(t);
      if (u > 0) { k.unpickBoss(u, 'lappetskel', flake); if (u >= 1) k.hideBoss(); }
      else c.dissolve(-1);
      c.edge(K.tan, 0.45);   // the edge the wind is tearing at: frayed pale thread

      // ---- lint streaming across the picture in the gale (a trickle sized by the tier)
      if (wind > 0.05 && t < CALM + 0.2) { c.acc += dt * (45 + 70 * gk) * wind * q;
        while (c.acc > 1) { c.acc--; const yy = by + rnd(-4, 5), zz = rnd(0.4, 3.4), cl = k.lit(Math.random() < 0.6 ? K.tan : K.linen, fx, yy, zz, 0.12);
          r.lint.emit(bx - rnd(6, 9), yy, zz, rnd(9, 15), rnd(-0.8, 0.8), rnd(-0.3, 0.3), rnd(1.0, 1.5), rnd(0.2, 0.36), cl, 0.45, 2, 0.2, 1, 0, rnd(-1, 1), 0); } }

      // ---- the camera, riding the wind
      let fz = 10, fa = 0;
      if (t < 2.45) {
        const pa = k.ease.io(k.span(0, 1.3)), swing = k.ease.io(k.span(1.45, 2.45));
        cam.home().mark();
        cam.orbit(bx - 0.2 + 0.6 * swing, by - 0.3, 1, cam.fit(lerp(8.5, 6.8, swing), lerp(8.5, 6.8, swing)), lerp(0.45, 0.6, swing), lerp(-0.42, 0.5, swing), lerp(0.02, -0.07, swing) + 0.05 * gk * Math.sin(t * 7), 34).mix(pa);
        cam.handheld(0.02 + 0.08 * wind, 1 + 2.6 * wind); if (swing > 0 && swing < 1) cam.motion(0.5);
        lens.focus(x, y, z, 0.9 * pa, 0.014); fz = cam.fit(7.5, 7.5); fa = 0.9;
      } else if (t < SNAP) {
        // close, against the sun patch on the cloth behind her: its rays stream out through what is left of her
        const pu = k.ease.io(k.span(2.45, SNAP));
        cam.fov = 36; cam.orbit(x + 0.1, y + 0.1, z, cam.fit(lerp(6.4, 5.0, pu), lerp(6.4, 5.0, pu)), lerp(0.36, 0.3, pu), lerp(0.22, 0.12, pu), -0.04 + 0.05 * gk * Math.sin(t * 5)).handheld(0.025 + 0.035 * wind, 2.2);
        lens.rays(fx, fy, 0.05, 0.8 + 0.35 * gk, SUN, 0.85, 0.55);
        lens.focus(x, y, z, 1.5, 0.016); fz = cam.fit(5.5, 5.5); fa = 1.5;
      } else {
        // the last of her flung off downwind: the camera is carried after it a moment, then eases home as the wind drops
        const go = k.ease.out(k.span(SNAP, CALM + 0.15));
        const x0 = x - 7 * k.ease.in(k.span(SNAP, CALM));
        cam.fov = 36; cam.orbit(x0 + 0.1 + 1.2 * go, y + 0.1 + 0.4 * go, z, cam.fit(5.0 + 1.5 * go, 5.0 + 1.5 * go), 0.3 - 0.08 * go, 0.12 + 0.1 * go, -0.04 + 0.03 * go).motion(0.7 * (1 - go)).mark();
        cam.home().mix(k.ease.io(k.span(CALM, 6.15)));
        cam.handheld(0.03 * (1 - calm), 1.6);
        lens.focus(x, y, z, 1.2 * (1 - calm), 0.016);
        if (t < CALM + 0.3) lens.rays(fx, fy, 0.05, 1.3 * (1 - k.span(SNAP, CALM + 0.3)), SUN, 0.9, 0.5);
      }
      cam.full(1 - calm);

      // ---- dust streaming through the shaft
      if (sun > 0.02) shaftDust(k, Math.round(k.tier.motes * 1.5), DB[3], DB[4], DB[5], fx, fy, 0, 1.9, K.saffHi, 0.6 * sun, fz, fa, 9 * wind, 11);

      // ---- the lens
      lens.fringe(1.6 * k.pulse(0.02, 0.03, 0.3) + 0.8 * gk * (1 - calm));
      lens.exposure(1 + 0.15 * k.pulse(0.02, 0.02, 0.2));
      k.gate(0.11 * (1 - k.ease.io(k.span(5.9, 6.4))));
    }
  };
  function flagUp(k) { const f = k.prop('flag'); f.position.set(0, H + 7.5, 0.62); f.scale.set(60, 15.6, 1); }

  ST.registerFilm('greatlappet', {
    entrance: LEAFFALL,

    /* Leaf drop: a dead leaf swings down in two arcs, the camera rolling with the swing; it snaps open into her colour. */
    sig: {
      len: 1.5, title: 0.5,
      steps: [[0.98, c => { const r = c.r, K = c.K, x = c.hx, y = c.hy;
        for (let i = 0, n = r.n(40); i < n; i++) { const a = Math.random() * TAU, sp = rnd(3, 11); r.glow.emit(x + Math.cos(a) * 0.6, y + Math.sin(a) * 0.5, 1.2, Math.cos(a) * sp, Math.sin(a) * sp * 0.8, rnd(1, 8), rnd(0.5, 1), rnd(0.22, 0.45), i % 3 ? K.saffHi : K.tan, 1, i % 4 ? 1 : 6, 1.6, 0.4, undefined, rnd(-3, 3), -2); }
        r.lintPuff(x, y, 1, 12, K.tan, 1.2, 4); r.ripple(x, y, 0.9, 7, 0.7, 1.6); r.shake = Math.max(r.shake, 0.3); }]],
      frame(c, t) {
        const u = clamp(t / 0.98, 0, 1), sw = Math.sin(u * TAU) * (1 - u), snap = t >= 0.98 ? back(clamp((t - 0.98) / 0.2, 0, 1)) : 0, fl = sm(0.98, 1.3, t);
        const x = c.hx + sw * 2.4, y = lerp(c.hy + 7.5, c.hy, eo(u)), wing = 1.25 * (1 - snap) + Math.sin(t * 15) * 0.25 * sm(1.0, 1.12, t) * (1 - sm(1.2, 1.4, t));
        c.boss(x, y, 1 + (1 - u) * 1.4, 1, Math.cos(u * TAU) * 0.55 * (1 - u) * (1 - snap), wing, lerp(BROWN[0], 1, fl), lerp(BROWN[1], 1, fl), lerp(BROWN[2], 1, fl), 0.22 * sm(0.98, 1.02, t) * (1 - sm(1.05, 1.35, t)));
        c.dark = 0.22 * (1 - sm(0.98, 1.2, t));
        c.view(0, CY + 0.2, lerp(0.92, 1, sm(1.0, 1.45, t)), 0.2, 0, -sw * 0.06, c.fov0);
      }
    },

    death: GALE
  });
})(window.ST);
