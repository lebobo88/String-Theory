/* String Theory — the title sequence. A film that belongs to no boss: ST.Cine.play('title') (see docs/FILM-KIT.md).
   A stand-in until its engineer writes the real one: the gate opens on the dark cloth, one thread is drawn across it, and the
   name is stitched on. Everything a title sequence needs is in the film kit; `solo: true` is what makes it boss-less. */
(function (ST) {
  'use strict';
  const { H, B, HW, CY } = ST.Cine.lib;
  ST.registerFilm('title', {
    solo: true,
    entrance: {
      kit: true, len: 4, key: 2.6,
      beats: { open: [0, 0.9, 'out'], thread: [0.5, 1.8, 'io'], hold: [1.8, 3.4], close: [3.4, 4, 'io'] },
      titles: [{ text: 'String Theory', sub: false, at: 1.5, iv: 0.07, in: 'stitch', pos: 'mid', to: 3.5 }],
      music: { name: 'title_sting', len: 4, desc: 'Title sting: one plucked harp note, a rising run of pizzicato strings as a thread is drawn, and a warm music-box chord as the name is sewn, dying away' },
      frame(k, t) {
        const K = k.K, u = k.beat('thread'), fade = 1 - k.beat('close');
        k.dark(0.55 * fade); k.gate((0.5 - 0.39 * k.beat('open')) * fade);
        k.cam.frame(0, CY, HW * 2 + 1, 8, 0.25, 0, 0, 30).mark().home().mix(k.beat('close'));
        if (u > 0) k.thread(-HW, CY - 1.6, 0.4, -HW + 2 * HW * u, CY - 1.6, 0.4, 0.09, K.linen, 0.95 * fade, 2, 0.3 * (1 - u));
        k.r.spr.add(-HW + 2 * HW * u, CY - 1.6, 0.6, 0.9, K.saffHi, fade * (u < 1 ? 1 : 0), 1, t * 5);
      }
    }
  });
})(window.ST);
