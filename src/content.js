/* String Theory — content tables. Pure data: no DOM, no Three.js.
   This file is the single source of truth for every sprite, moth, Keeper, thread,
   needle, notion, power-up, temper, Pattern stitch and blueprint ("pattern chart").
   Port target: this maps 1:1 to RON/JSON assets in the Rust build. */
(function (ST) {
  'use strict';

  // ---- Thread card (palette, MN-01..12 from the art bible) ----
  const PAL = {
    night: '#0F1428', coverlet: '#18203D', patch: '#24305A', mist: '#8C9AC6',
    linen: '#E6DFD0', paper: '#F3EEE3', ink: '#1C2238', ink2: '#4A5170',
    madder: '#A82A33', madderPale: '#E0726E', madderHi: '#CF4A4E', madderDeep: '#7A1D27',
    saffron: '#E3A93C', saffronInk: '#7A4F08', ochre: '#B5832F', glare: '#FFF4D6',
    umber: '#3A2C20', brass: '#9C7A3A', rule: '#B9AE96', dot: '#3D4F86',
    steel: '#A3AEC6', steelDark: '#6B7899', steelHi: '#CBD3E4',
    brown: '#8B7355', darkBrown: '#4B3A2B', tan: '#C9B38C', green: '#6E8B4E',
    greenPale: '#A9C08A', blue: '#5568A6', knot: '#6E1A24'
  };

  const spr = (pal, rows) => ({ w: rows[0].length, h: rows.length, pal, rows });
  const MOTH = { D: PAL.darkBrown, B: PAL.brown, T: PAL.tan, R: PAL.madder, O: PAL.ochre, W: PAL.linen, G: PAL.saffron, g: PAL.green, l: PAL.greenPale, Y: PAL.glare };
  const NEEDLE = { A: PAL.glare, B: PAL.steel, C: PAL.steelDark, D: PAL.linen, E: PAL.madder, F: PAL.saffron, U: PAL.blue };

  // ---- Sprites: counted charts transcribed from the bible (Plates 06, 07, 08, 11) ----
  const SPRITES = {
    nibbler: spr(MOTH, [
      '..D.......D..', '...D.....D...', '....D...D....', '.....RDR.....', 'BB...BDB...BB',
      'TBB.BBDBB.BBT', '.TBBBTBTBBBT.', '..TBTBBBTBT..', '...TT.B.TT...', '......D......']),
    casebearer: spr(MOTH, [
      '...D.....D...', '....D...D....', '.....RDR.....', 'OO..OODOO..OO', 'OOO.OBDBO.OOO',
      '.OOOOBDBOOOO.', '..OOB.D.BOO..', '....WWWWW....', '....TTTTT....', '....WWWWW....',
      '....TTTTT....', '.....WWW.....', '......T......']),
    casebearer_bare: spr(MOTH, [
      '...D.....D...', '....D...D....', '.....RDR.....', 'OO..OODOO..OO', 'OOO.OBDBO.OOO',
      '.OOOOBDBOOOO.', '..OOB.D.BOO..', '......D......', '......D......']),
    spinner: spr(MOTH, [
      '...D.......D...', '....D.....D....', '.....D...D.....', '......RDR......', 'GGG..GDDDG..GGG',
      'GRRG.GGDGG.GRRG', 'GRRGGGGDGGGGRRG', '.GGGGDGDGDGGGG.', '..GGDGGDGGDGG..', '...GGG.D.GGG...',
      '....GGDDDGG....', '.....DWWWD.....', '.....WTWTW.....', '......DDD......']),
    lappet: spr(MOTH, [
      '....D.....D....', '.....D...D.....', '......RTR......', '.OO...TTT...OO.', 'OOOO.OTTTO.OOOO',
      'OOOOOOOTOOOOOOO', 'DOOOOOOTOOOOOOD', '.DOOOOOTOOOOOD.', '.ODOODOTODOODO.', '..DO.ODTDO.OD..',
      '...D..DTD..D...', '.......T.......']),
    hawk: spr(MOTH, [
      '.......B.......', '......BBB......', '......RDR......', '.....BBDBB.....', '...BBBTDTBBB...',
      '.BBBBT.R.TBBBB.', 'BBBTT..D..TTBBB', 'TBT....R....TBT', 'T......D......T', '.......R.......', '.......D.......']),
    looper: spr(MOTH, [
      '....ggggg....', '...gglglgg...', '..gg.....gg..', '..g.......gD.', '.gg.......gRD',
      '.g.........g.', 'gg.........g.', 'DD........DD.']),
    wick: spr(MOTH, [
      '..D.....D..', '...D...D...', '....RDR....', 'BB..BDB..BB', 'BBB.BDB.BBB', '.BBBTDTBBB.',
      '..BBTDTBB..', '.....D.....', '....GYG....', '...GYYYG...', '....GYG....', '.....G.....']),

    tinea: spr({ A: PAL.darkBrown, B: PAL.madder, C: PAL.brown, D: PAL.tan, E: PAL.linen }, [
      '.........A...........A.........', '..........A.........A..........', '...........A.......A...........',
      '............A.....A............', '.............BAAAB.............', 'ACC..........AAAAA..........CCA',
      'DCCC........CDAAADC........CCCD', 'DDCCC......CCDDADDCC......CCCDD', '.DDCCC....CCDDDADDDCC....CCCDD.',
      '.DADCCC..CCDDCAAACDDCC..CCCDAD.', '..DADDCCCCCDCDEAEDCDCCCCCDDAD..', '..DDADDDCCDDCDEEEDCDDCCDDDADD..',
      '...DDADDDDDDCAEEEACDDDDDDADD...', '...DDDADDDDDCAEAEACDDDDDADDD...', '....DDDADDDCA.EEE.ACDDDADDD....',
      '.....DDDDCCA..EAE..ACCDDDD.....', '......DDCC....EEE....CCDD......', '..........CC..EAE..CC..........',
      '.........CCC..EEE..CCC.........', '........CCDC..EAE..CDCC........', '........CDD...EEE...DDC........',
      '........DD....EAE....DD........', '..............AEA..............', '..............AAA..............',
      '...............A...............']),
    atlas: spr({ A: PAL.darkBrown, B: PAL.madder, C: PAL.ochre, D: PAL.tan, E: PAL.linen, F: PAL.glare }, [
      '............A.....A............', '.............A...A.............', '..............BAB..............',
      'CA...........AAAAA...........AC', 'ACCA.......CCBAAABCC.......ACCA', 'ABCCCC...CCCBBDADBBCCC...CCCCBA',
      '.ABCCCCCCCBBBBDADBBBBCCCCCCCBA.', '.ABBCCEECCBBBBDADBBBBCCEECCBBA.', '..ABBCEFECCBBBDADBBBCCEFECBBA..',
      '..AABBCECCBBBBDADBBBBCCECBBAA..', '...EEEEEEEEEEEDADEEEEEEEEEEE...', '....ACCCCCCCCCDADCCCCCCCCCA....',
      '....ABBBCCCCCBDADBCCCCCBBBA....', '...ABBEEBBCCCBDADBCCCBBEEBBA...', '...ABEFEBBCCBBDADBBCCBBEFEBA...',
      '...ABBEEBBBBBB.A.BBBBBBEEBBA...', '....ABBBBBBBBA.A.ABBBBBBBBA....', '.....AABBBBAA..A..AABBBBAA.....',
      '.......AAAA....A....AAAA.......']),
    unraveller: spr({ A: PAL.darkBrown, B: PAL.green, C: PAL.greenPale, D: PAL.brown, E: PAL.madder, F: PAL.linen }, [
      '..........ABBBBBBBBBA..........', '..........ABCBBBBBCBA..........', '.........AAAAAAAAAAAAA.........',
      '........ABBBBBBBBBBBBBA........', '........ABCBBABBBABBCBA........', '.......AAAAAAAAAAAAAAAAA.......',
      '......ABBBBBBBBBBBBBBBBBA......', '......ABBCBBBABBBABBBCBBA......', '.....AAAAAAAAAAAAAAAAAAAAA.....',
      '...AABBBBBBBBBBBBBBBBBBBBBAA...', '..A.ABCBBBBBBABBBABBBBBBCBA.A..', '....AAAAAAAAAAAAAAAAAAAAAAA....',
      '..ADDDDDDDDDDDDDDDDDDDDDDDDDA..', '.ADDAADDDDDDDDDDDDDDDDDDDAADDA.', '.ADDAADDDDDDDDDDDDDDDDDDDAADDA.',
      '.ADDDDDDDDDDDDDDDDDDDDDDDDDDDA.', '..ADDDDDDDDDAEEFEEADDDDDDDDDA..', '...AADDDDDDDAE.F.EADDDDDDDAA...',
      '.....AAAAAAAAE.F.EAAAAAAAA.....', '...............F...............', '..............F.F..............',
      '...............F...............']),

    sharps: spr(NEEDLE, ['.....A.....', '.....B.....', '....CBC....', '....CBC....', '....CBC....', '...DCBCD...',
      '..DDCBCDD..', '.DDECBCEDD.', 'DDEECBCEEDD', 'DE..C.C..ED', 'D...C.C...D', '....CBC....']),
    between: spr(NEEDLE, ['.....A.....', '....CBC....', '...DCBCD...', '..DDCBCDD..', '.DDFCBCFDD.', 'DDFFC.CFFDD',
      'DF..C.C..FD', '....CBC....']),
    darner: spr(NEEDLE, ['......A......', '......B......', '.....CBC.....', '.....CBC.....', '.....CBC.....', '.....CBC.....',
      '....DCBCD....', '...DDCBCDD...', '..DDECBCEDD..', '.DDEECBCEEDD.', 'DDE..C.C..EDD', 'DE...C.C...ED',
      'D....C.C....D', '.....CBC.....']),
    chenille: spr(NEEDLE, ['......A......', '.....CBC.....', '.....CBC.....', '....CCBCC....', '...DCCBCCD...', '..DDCCBCCDD..',
      '.DDDC...CDDD.', 'DDEDC...CDFDD', 'DEE.C...C.FFD', 'D...C...C...D', '....CCBCC....', '.....CBC.....']),
    sail: spr(NEEDLE, ['......A......', '.....BCB.....', '....BBCBB....', '...BBBCBBB...', '..DCBBCBBCD..', '.DDCBBCBBCDD.',
      'DDDDCBCBCDDDD', 'DEEDC.C.CDEED', 'DEEDC.C.CDEED', 'DDDDC.C.CDDDD', 'D..DCCCCCD..D', '....CCCCC....']),
    beading: spr(NEEDLE, ['.....A.....', '.....B.....', '.....B.....', '.....B.....', '....CBC....', '....CBC....',
      '....CBC....', '...UCBCU...', '..U.CBC.U..', '.U..CBC..U.', 'U...CBC...U', '....C.C....', '....C.C....', '.....B.....']),

    dust: spr({ A: PAL.saffron, B: PAL.ochre }, ['.A.A.', 'ABABA', '.A.A.']),
    silk: spr({ A: PAL.linen, B: PAL.tan }, ['.AA...AA.', 'ABBA.ABBA', 'ABABABABA', 'ABBA.ABBA', '.AA...AA.']),
    packet: spr({ A: PAL.linen, B: PAL.tan, R: PAL.madder }, ['AAAAAAAAA', 'ABAAAAABA', 'AABAAABAA', 'AAABRBAAA', 'AAAARAAAA', 'AAAAAAAAA', 'AAAAAAAAA']),
    chart: spr({ W: PAL.paper, R: PAL.madder, T: PAL.tan }, ['TTTTTTT', 'TRWWWRT', 'TWRWRWT', 'TWWRWWT', 'TWRWRWT', 'TRWWWRT', 'TTTTTTT']),
    thimble: spr({ A: PAL.steel, B: PAL.steelDark }, ['...AAA...', '..ABABA..', '.ABABABA.', '.ABABABA.', '.BABABAB.', '.ABABABA.', 'ABBBBBBBA', 'AAAAAAAAA']),
    ripper: spr({ S: PAL.steel, R: PAL.madder }, ['SS.......', 'S.S......', '.SS......', '..SR.....', '...RR....', '....RR...', '.....RR..', '......RR.', '.......R.']),
    beeswax: spr({ A: PAL.saffron, B: PAL.ochre }, ['..AAAAA..', '.ABABABA.', 'ABABABABA', 'AABABABAA', 'ABABABABA', 'AABABABAA', '.ABABABA.', '..AAAAA..']),
    chalk: spr({ A: PAL.linen, B: PAL.tan }, ['AAAAAAAAA', '.AAAAAAA.', '.AABABAA.', '..AAAAA..', '..ABABA..', '...AAA...', '...AAA...', '....A....']),
    pin: spr({ A: PAL.steel, B: PAL.steelDark }, ['.AAAA....', 'A....A...', 'A.....A..', '.A.....A.', '..A.....A', '...A...AA', '....A.AB.', '.....ABB.', '......B..']),
    button: spr({ G: PAL.saffron, H: PAL.darkBrown, O: PAL.ochre }, ['..GGG..', '.GOGOG.', 'GGHGHGG', 'GOGGGOG', 'GGHGHGG', '.GOGOG.', '..GGG..']),
    shears: spr({ S: PAL.steel, R: PAL.madder }, ['S.......S', '.S.....S.', '..S...S..', '...S.S...', '....S....', '...S.S...', '..R...R..', '.R.R.R.R.', '..R...R..']),
    dish: spr({ S: PAL.steel, R: PAL.madder, B: PAL.steelDark }, ['R...R...R', '.R..R..R.', 'SSSSSSSSS', '.SBSBSBS.', '..SSSSS..']),
    charm: spr({ G: '#FFFFFF', H: PAL.ink }, ['..GGG..', '.GGGGG.', 'GGHGHGG', 'GGGGGGG', 'GGHGHGG', '.GGGGG.', '..GGG..'])
  };

  // ---- The Moth Host (Plate 07). hp is in "stitches" of a Point-2 needle. ----
  const MOTHS = {
    nibbler:    { name: 'Nibbler',    sprite: 'nibbler',    hp: 0.75, pts: 50,  ptsDive: 100, dust: 1, r: 0.42, diveSpeed: 6.2, wob: 5, wobAmp: 1.6, shotEvery: 1.5, note: 'Dives in pairs and curls back up into place.' },
    casebearer: { name: 'Casebearer', sprite: 'casebearer', hp: 0.75, pts: 80,  ptsDive: 160, dust: 2, r: 0.45, diveSpeed: 5.4, wob: 2.4, wobAmp: 3.4, shotEvery: 1.8, cased: true, note: 'Wears a silk case that soaks up the first stitch.' },
    spinner:    { name: 'Spinner',    sprite: 'spinner',    hp: 2,    pts: 150, ptsDive: 400, ptsEscort: 800, dust: 3, silk: 1, r: 0.52, diveSpeed: 5.8, wob: 3, wobAmp: 1.2, shotEvery: 1.2, note: 'Leads the swarm. Dives to cast the cocoon draw.' },
    lappet:     { name: 'Lappet',     sprite: 'lappet',     hp: 0.75, pts: 100, ptsDive: 200, dust: 2, r: 0.5,  diveSpeed: 5.6, wob: 3, wobAmp: 2.2, shotEvery: 1.7, splits: true, packet: 0.25, note: 'Splits into two Nibblers when stitched.' },
    hawk:       { name: 'Hawk',       sprite: 'hawk',       hp: 1,    pts: 120, ptsDive: 240, dust: 2, r: 0.5,  diveSpeed: 8.5, shotEvery: 0.5, note: 'Strafes straight down, dropping frass. Never returns.' },
    looper:     { name: 'Looper',     sprite: 'looper',     hp: 2,    pts: 100, ptsDive: 200, dust: 2, r: 0.45, shotEvery: 1.7, note: 'Inches across in loops, leaving silk knots that drift down.' },
    wick:       { name: 'Wick',       sprite: 'wick',       hp: 1,    pts: 200, ptsDive: 400, dust: 3, r: 0.4,  diveSpeed: 6.5, note: 'Carries a coal of Glare. If it lands, it burns a hole.' }
  };

  // ---- Keepers (Plate 08). soft: offsets from centre in world units; damage x2 there, x0.6 elsewhere. ----
  const KEEPERS = {
    tinea: { name: 'Mother Tinea', sprite: 'tinea', hp: 90, pts: 3000, silk: 5, dust: 60, cell: 0.2, halfW: 2.9, halfH: 2.3,
      soft: [{ x: 0, r: 0.75 }], softName: 'Her egg-heavy belly',
      phases: ['Sheds Nibblers from her wings', 'Spins a net across the field, one gap wide'], phaseTag: ['She sheds', 'She spins'],
      charts: ['bp_herringbone', 'bp_darner'] },
    atlas: { name: 'The Atlas', sprite: 'atlas', hp: 150, pts: 5000, silk: 8, dust: 90, cell: 0.22, halfW: 3.3, halfH: 2.0,
      soft: [{ x: -2.0, r: 0.6 }, { x: 2.0, r: 0.6 }], softName: 'The pale windows in her wings',
      phases: ['Eyespots fire madder beads at you', 'Wingtips strike like snake heads'], phaseTag: ['Eyespots open', 'Wingtips strike'],
      charts: ['bp_chain', 'bp_chenille'] },
    unraveller: { name: 'The Unraveller', sprite: 'unraveller', hp: 220, pts: 8000, silk: 12, dust: 130, cell: 0.22, halfW: 3.3, halfH: 2.3,
      soft: [{ x: 0, r: 0.9 }], softName: 'Its mouth, while it chews', chews: true,
      phases: ['Pulls the top rows of the cloth away', 'Glare pours in through the gap', 'Bites the thread it holds'], phaseTag: ['It pulls', 'Glare pours in', 'It bites'],
      charts: ['bp_beading', 'bp_couching'] }
  };

  // ---- The first Night: 3 Panels, each 2 Rows then a Keeper. ----
  const PANELS = [
    { name: 'Panel I', keeper: 'tinea', rows: [
      { spinners: 2, mids: 6, nibs: 8,  diveEvery: 2.6, fireEvery: 2.6 },
      { spinners: 4, mids: 8, nibs: 10, diveEvery: 2.2, fireEvery: 2.2 } ] },
    { name: 'Panel II', keeper: 'atlas', rows: [
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 4, hawks: 4, diveEvery: 2.0, fireEvery: 2.0 },
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 3, hawks: 4, loopers: 3, diveEvery: 1.8, fireEvery: 1.8 } ] },
    { name: 'Panel III', keeper: 'unraveller', rows: [
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 3, wickEvery: 4, hawks: 5, loopers: 3, diveEvery: 1.6, fireEvery: 1.7 },
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 2, wickEvery: 3, hawks: 6, loopers: 4, diveEvery: 1.4, fireEvery: 1.5 } ] }
  ];

  // ---- Spool Wall: threads (weapons). Bought with Dust, kept for good; weights II/III cost +90/+160. ----
  const WEIGHT_COST = [0, 90, 160];
  const THREADS = {
    running:    { name: 'Running Stitch', price: 0,   color: PAL.linen,      rate: [0.30, 0.23, 0.23], desc: 'One stitch, straight up.',
      weights: ['One stitch, straight up', 'Stitches a third more often', 'Every stitch pierces one moth'] },
    backstitch: { name: 'Backstitch',     price: 120, color: PAL.madder,     rate: [0.34, 0.26, 0.26], desc: 'Two stitches side by side.',
      weights: ['Two stitches side by side', 'Stitches a third more often', 'Three stitches side by side'] },
    herringbone:{ name: 'Herringbone',    price: 180, color: PAL.saffron,    rate: [0.56, 0.28, 0.30], desc: 'Three stitches that zigzag outward.', chart: 'bp_herringbone',
      weights: ['Three stitches, 20° spread', 'Stitches twice as often', 'Five stitches, 30° spread'] },
    chain:      { name: 'Chain Stitch',   price: 220, color: PAL.madderPale, rate: [0.42, 0.42, 0.42], desc: 'Each link jumps on to a second moth.', chart: 'bp_chain',
      weights: ['Each link jumps on to a second moth', 'Links jump on to a third moth', 'Jumps bite as hard as the first stitch'] },
    knot:       { name: 'French Knot',    price: 240, color: PAL.knot,       rate: [0.95, 0.95, 0.5],  desc: 'A slow knot that bursts across three lanes.', chart: 'bp_knot',
      weights: ['A slow knot that bursts across three lanes', 'Bursts across five lanes', 'Knots twice as often'] },
    couching:   { name: 'Couching Wire',  price: 260, color: PAL.steel,      rate: [0.95, 0.6, 0.6],   desc: 'Hold to charge. A silver lance through a whole column. Charging slows your needle by half.', chart: 'bp_couching',
      weights: ['A silver lance through a whole column', 'Charges faster', 'The lance runs two lanes wide'] }
  };

  // ---- Needle Case: needles (ships). Bought with Silk, owned for good. Pips: Ply, Pace, Eye, Point. ----
  const NEEDLES = {
    sharps:   { name: 'Sharps',   price: 0,   ply: 2, pace: 3, eye: 2, point: 2, trait: 'Steady',        traitDesc: 'No tricks. Forgives a late dodge.' },
    between:  { name: 'Between',  price: 40,  ply: 1, pace: 5, eye: 2, point: 2, trait: 'Short Stroke',  traitDesc: 'Double-tap to sidestep two lanes.' },
    darner:   { name: 'Darner',   price: 60,  ply: 2, pace: 2, eye: 3, point: 2, trait: 'Wide Weave',    traitDesc: 'Every thread fans one lane wider.', chart: 'bp_darner' },
    chenille: { name: 'Chenille', price: 80,  ply: 3, pace: 2, eye: 4, point: 1, trait: 'Big Eye',       traitDesc: 'Carries two threads; swap at will.', chart: 'bp_chenille' },
    sail:     { name: 'Sail',     price: 100, ply: 4, pace: 1, eye: 1, point: 3, trait: 'Palm Guard',    traitDesc: 'Shrugs off one cocoon draw each row.', chart: 'bp_sail' },
    beading:  { name: 'Beading',  price: 140, ply: 1, pace: 4, eye: 1, point: 4, trait: 'Through-Bead',  traitDesc: 'Every shot pierces one moth.', chart: 'bp_beading' }
  };

  // ---- Gimp's Bench: tempers. Dust. Permanent on every needle (owner direction; the bible had them per-Night). ----
  const TEMPER_COST = [40, 90, 160, 260];
  const TEMPERS = {
    point: { name: 'Point', max: 4, desc: 'Each tier: stitches bite harder; tier IV stitches pierce Casebearer cases', chartAt: 4 },
    eye:   { name: 'Eye',   max: 4, desc: 'Each tier: stitch more often', chartAt: 4 },
    ply:   { name: 'Ply',   max: 3, desc: 'Each tier: one more ply wound on' },
    pace:  { name: 'Pace',  max: 3, desc: 'Each tier: quicker side to side' }
  };

  // ---- Notions Drawer: consumables. Dust. Single use, three tray slots. ----
  const NOTIONS = {
    thimble: { name: 'Thimble',        price: 60,  sprite: 'thimble', desc: 'Takes the next hit for you.' },
    ripper:  { name: 'Seam Ripper',    price: 110, sprite: 'ripper',  desc: 'Unpicks the front row of the swarm.' },
    beeswax: { name: 'Beeswax',        price: 50,  sprite: 'beeswax', desc: 'Stitch twice as fast for ten seconds.' },
    chalk:   { name: "Tailor's Chalk", price: 40,  sprite: 'chalk',   desc: 'Marks the next three dives before they start.' },
    pin:     { name: 'Safety Pin',     price: 70,  sprite: 'pin',     desc: 'The next cocoon draw slips off.' },
    button:  { name: 'Brass Button',   price: 150, sprite: 'button',  desc: 'One more spare needle. One per Hem visit.', perVisit: true, chart: 'bp_button' },
    shears:  { name: 'Pinking Shears', price: 80,  sprite: 'shears',  desc: 'Snips every thread the Host has in the air.', chart: 'bp_shears' },
    dish:    { name: 'Pin Dish',       price: 45,  sprite: 'dish',    desc: 'Draws every mote of Dust to your needle for twelve seconds.' }
  };

  // ---- Charms: temporary power-ups shaken loose from stitched moths. ----
  const CHARMS = {
    gold:   { name: 'Gold Leaf',    color: PAL.saffron,    dur: 12, desc: 'Dust counts double.' },
    bobbin: { name: 'Quick Bobbin', color: PAL.madderPale, dur: 10, desc: 'Stitch much faster.' },
    staple: { name: 'Long Staple',  color: PAL.steelHi,    dur: 8,  desc: 'Stitches pass through every moth.' },
    fan:    { name: 'Fan Fold',     color: PAL.blue,       dur: 10, desc: 'Every volley fans one lane wider.' },
    starch: { name: 'Starch',       color: PAL.paper,      dur: 6,  desc: 'Stiff as a board: nothing snaps a ply.' },
    tangle: { name: 'Tangle',       color: PAL.green,      dur: 6,  desc: 'The Host flies through treacle.' },
    egg:    { name: 'Darning Egg',  color: PAL.tan,        dur: 0,  desc: 'Winds one ply back on.' },
    twin:   { name: 'Double Stitch',color: PAL.madder,     dur: 0,  desc: 'A second needle sews beside you until it is hit.' }
  };

  // ---- The Pattern: permanent stitches. Silk. Each row unlocks left to right. ----
  const PATTERN = {
    rows: [
      { name: 'Hands',   nodes: ['steady', 'quick', 'second'] },
      { name: 'Eye',     nodes: ['keen', 'chalkline', 'sight'] },
      { name: 'Pockets', nodes: ['deep', 'credit', 'sweepings'] },
      { name: 'Cushion', nodes: ['sparepin', 'mended', 'lastknot'] }
    ],
    nodes: {
      steady:    { name: 'Steady Hands',  cost: 20, desc: 'After a hit, nothing can touch your needle for half as long again.' },
      quick:     { name: 'Quick Hands',   cost: 30, desc: 'A tenth more Pace on every needle.' },
      second:    { name: 'Second Thread', cost: 40, desc: 'A combo holds twice as long before it slips.' },
      keen:      { name: 'Keen Eye',      cost: 20, desc: 'Your needle draws Dust in from half as far again.' },
      chalkline: { name: 'Chalk Line',    cost: 30, desc: 'Every dive is faintly marked a beat before it starts.' },
      sight:     { name: 'Pattern Sight', cost: 40, desc: 'Pattern charts turn up twice as often.' },
      deep:      { name: 'Deep Pockets',  cost: 25, desc: 'Two of the same notion share a slot.' },
      credit:    { name: "Tuck's Credit", cost: 35, desc: 'A tenth off everything in the Notions Drawer.' },
      sweepings: { name: 'Sweepings',     cost: 45, desc: '1 Silk per 100 Dust left at a snap.' },
      sparepin:  { name: 'Spare Pin',     cost: 30, desc: 'One more spare needle in the cushion every Night.' },
      mended:    { name: 'Mended Ply',    cost: 60, desc: 'One ply is wound back on at the start of every Row.' },
      lastknot:  { name: 'Last Knot',     cost: 90, desc: 'Once a Night, the last snap is caught and you fly on with one ply.' }
    }
  };

  // ---- Pattern charts (blueprints). Found in flight; each unseals one thing at the Hem. ----
  const CHARTS = {
    bp_herringbone: { name: 'Herringbone chart',   unseals: 'Herringbone at the Spool Wall',   from: 'Mother Tinea' },
    bp_darner:      { name: 'Darner chart',        unseals: 'the Darner in the Needle Case',   from: 'Mother Tinea' },
    bp_chain:       { name: 'Chain Stitch chart',  unseals: 'Chain Stitch at the Spool Wall',  from: 'The Atlas' },
    bp_chenille:    { name: 'Chenille chart',      unseals: 'the Chenille in the Needle Case', from: 'The Atlas' },
    bp_beading:     { name: 'Beading chart',       unseals: 'the Beading in the Needle Case',  from: 'The Unraveller' },
    bp_couching:    { name: 'Couching Wire chart', unseals: 'Couching Wire at the Spool Wall', from: 'The Unraveller' },
    bp_knot:        { name: 'French Knot chart',   unseals: 'French Knot at the Spool Wall',   from: 'the Moth Host', loose: true },
    bp_sail:        { name: 'Sail chart',          unseals: 'the Sail in the Needle Case',     from: 'the Moth Host', loose: true },
    bp_gilt:        { name: 'Gilt Temper chart',   unseals: 'tier IV of Point and Eye at the Bench', from: 'the Moth Host', loose: true },
    bp_button:      { name: 'Brass Button chart',  unseals: 'Brass Buttons in the Notions Drawer',   from: 'the Moth Host', loose: true },
    bp_shears:      { name: 'Pinking Shears chart',unseals: 'Pinking Shears in the Notions Drawer',  from: 'the Moth Host', loose: true }
  };

  const TUNING = {
    fieldW: 14, fieldH: 18.67, playerY: 1.5, spares: 2, traySlots: 3,
    comboWindow: 2.5, comboStep: 8, comboMax: 5,
    charmChance: 0.07, chartChance: 0.012, magnet: 1.7, dropSpeed: 2.3,
    cleanRowDust: 20, panelSilk: 1
  };

  ST.content = { PAL, SPRITES, MOTHS, KEEPERS, PANELS, THREADS, WEIGHT_COST, NEEDLES, TEMPERS, TEMPER_COST, NOTIONS, CHARMS, PATTERN, CHARTS, TUNING };
})(typeof window !== 'undefined' ? (window.ST = window.ST || {}) : (globalThis.ST = globalThis.ST || {}));
