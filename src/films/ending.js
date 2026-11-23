/* String Theory — the victory ending. A film that belongs to no boss: ST.Cine.play('ending') (see docs/FILM-KIT.md).
   A stand-in until its engineer writes the real one: morning light comes up over the mended cloth and one line is sewn on.
   The Moth King's death film ("Daybreak") is meant to lead straight into it. */
(function (ST) {
  'use strict';
  const { H, B, HW, CY } = ST.Cine.lib;
  ST.registerFilm('ending', {
    solo: true,
    entrance: {
      kit: true, len: 5, key: 3,
      beats: { dawn: [0, 2.4, 'io'], hold: [2.4, 4.3], close: [4.3, 5, 'io'] },
      titles: [{ text: 'The cloth is mended', sub: false, at: 1.6, iv: 0.06, in: 'rise', pos: 'mid', to: 4.4, size: 0.8 }],
      music: { name: 'ending_sting', len: 5, desc: 'Ending sting: a slow warm string chord rising like a sunrise, a music-box phrase answering it, resolving and fading' },
      frame(k, t) {
        const K = k.K, d = k.beat('dawn'), fade = 1 - k.beat('close');
        k.dark(0.7 * (1 - d)); k.cam.frame(0, CY + 1.5 * (1 - d), HW * 2 + 2, 14, 0.3 - 0.1 * d, 0, 0, 30).mark().home().mix(k.beat('close'));
        k.r.spr.add(-5.5, H - 0.5, 3, 13, K.glareDim, 0.9 * d * fade, 8, 0.3);
        k.lens.rays(-5.5, H - 0.5, 3, 0.8 * d * fade, K.saffLo, 0.9, 0.5);
      }
    }
  });
})(window.ST);
