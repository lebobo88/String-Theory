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
    nibbler:    { name: 'Nibbler',    sprite: 'nibbler',    hp: 0.75, pts: 50,  ptsDive: 100, dust: 1, r: 0.42, diveSpeed: 6.2, wob: 5, wobAmp: 1.6, shotEvery: 1.5, note: 'Dives in pairs, then flies back to its place.' },
    casebearer: { name: 'Casebearer', sprite: 'casebearer', hp: 0.75, pts: 80,  ptsDive: 160, dust: 2, r: 0.45, diveSpeed: 5.4, wob: 2.4, wobAmp: 3.4, shotEvery: 1.8, cased: true, note: 'Armoured: its shell absorbs the first hit.' },
    spinner:    { name: 'Spinner',    sprite: 'spinner',    hp: 2,    pts: 150, ptsDive: 400, ptsEscort: 800, dust: 3, silk: 1, r: 0.52, diveSpeed: 5.8, wob: 3, wobAmp: 1.2, shotEvery: 1.2, note: 'Squad leader. Uses a capture beam that steals a life. Destroy it to win the ship back.' },
    lappet:     { name: 'Lappet',     sprite: 'lappet',     hp: 0.75, pts: 100, ptsDive: 200, dust: 2, r: 0.5,  diveSpeed: 5.6, wob: 3, wobAmp: 2.2, shotEvery: 1.7, splits: true, packet: 0.25, note: 'Splits into two Nibblers when destroyed.' },
    hawk:       { name: 'Hawk',       sprite: 'hawk',       hp: 1,    pts: 120, ptsDive: 240, dust: 2, r: 0.5,  diveSpeed: 8.5, shotEvery: 0.5, note: 'Flies straight down the screen, shooting as it goes.' },
    looper:     { name: 'Looper',     sprite: 'looper',     hp: 2,    pts: 100, ptsDive: 200, dust: 2, r: 0.45, shotEvery: 1.7, note: 'Crosses the screen dropping floating mines. Shoot the mines to clear them.' },
    wick:       { name: 'Wick',       sprite: 'wick',       hp: 1,    pts: 200, ptsDive: 400, dust: 3, r: 0.4,  diveSpeed: 6.5, note: 'Carries a fireball. If it reaches the bottom it leaves a burning patch.' }
  };

  // ---- Keepers (Plate 08). soft: offsets from centre in world units; damage x2 there, x0.6 elsewhere.
  // The bible draws three Keepers (Panels II, IV, V) but its Night's chart has a Keeper row under every Panel,
  // so Panels I and III use stand-ins built from existing Host charts: the Great Lappet and the Great Wick. ----
  const KEEPERS = {
    greatlappet: { name: 'The Great Lappet', sprite: 'lappet', hp: 60, pts: 2000, silk: 5, dust: 45, cell: 0.3, halfW: 2.2, halfH: 1.8, softY: 0, standIn: true,
      soft: [{ x: 0, r: 0.6 }], softName: 'The pale stripe down her back',
      phases: ['Fires spreads of shots', 'Spawns Lappets that split when destroyed'], phaseTag: ['Spread shots', 'Spawning Lappets'],
      charts: ['bp_button'] },
    tinea: { name: 'Mother Tinea', sprite: 'tinea', hp: 90, pts: 3000, silk: 5, dust: 60, cell: 0.2, halfW: 2.9, halfH: 2.3, softY: -1.3,
      soft: [{ x: 0, r: 0.75 }], softName: 'Her belly',
      phases: ['Spawns Nibblers from her wings', 'Sends a net down the screen with one gap to fly through'], phaseTag: ['Spawning Nibblers', 'Find the gap in the net'],
      charts: ['bp_herringbone', 'bp_darner'] },
    greatwick: { name: 'The Great Wick', sprite: 'wick', hp: 120, pts: 4000, silk: 6, dust: 75, cell: 0.38, halfW: 2.0, halfH: 2.2, softY: -1.6, standIn: true,
      soft: [{ x: 0, r: 0.7 }], softName: 'The fireball it carries',
      phases: ['Drops fireballs that leave burning patches', 'Calls in Wicks carrying more fireballs'], phaseTag: ['Fireballs', 'Wicks incoming'],
      charts: ['bp_gilt'] },
    atlas: { name: 'The Atlas', sprite: 'atlas', hp: 150, pts: 5000, silk: 8, dust: 90, cell: 0.22, halfW: 3.3, halfH: 2.0, softY: 0.4,
      soft: [{ x: -2.0, r: 0.6 }, { x: 2.0, r: 0.6 }], softName: 'The pale spots on her wings',
      phases: ['Fires aimed shots from the eyespots on her wings', 'Strikes down whole columns after a warning'], phaseTag: ['Aimed shots', 'Column strikes'],
      charts: ['bp_chain', 'bp_chenille'] },
    unraveller: { name: 'The Unraveller', sprite: 'unraveller', hp: 220, pts: 8000, silk: 12, dust: 130, cell: 0.22, halfW: 3.3, halfH: 2.3, softY: -1.7, noWings: true,
      soft: [{ x: 0, r: 0.9 }], softName: 'Its mouth, only while it is open', chews: true,
      phases: ['Fires wide spreads and drops mines', 'Adds light beams that fill whole columns', 'Pulls your ship toward it'], phaseTag: ['Spreads and mines', 'Light beams', 'It pulls you in'],
      charts: ['bp_beading', 'bp_couching'] }
  };

  // ---- A Night: five Panels. Every Panel is Row 1, Row 2, the Sampler, then its Keeper (20 rows on the Night's chart). ----
  const STAGES = ['row', 'row', 'sampler', 'keeper'];
  const STAGE_LABEL = ['1', '2', 'S', 'K'];
  const PANELS = [
    { name: 'Stage 1', keeper: 'greatlappet', patches: ['selvage'], sampler: 'wave', rows: [
      { spinners: 2, mids: 6, nibs: 8,  diveEvery: 2.6, fireEvery: 2.6 },
      { spinners: 4, mids: 8, nibs: 10, diveEvery: 2.3, fireEvery: 2.3 } ] },
    { name: 'Stage 2', keeper: 'tinea', patches: ['moththick', 'olddarn'], sampler: 'eight', rows: [
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 4, hawks: 3, diveEvery: 2.1, fireEvery: 2.1 },
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 3, hawks: 4, diveEvery: 2.0, fireEvery: 2.0 } ] },
    { name: 'Stage 3', keeper: 'greatwick', patches: ['thincloth', 'boro'], sampler: 'wave', rows: [
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 3, hawks: 4, loopers: 2, diveEvery: 1.9, fireEvery: 1.9 },
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 3, wickEvery: 5, hawks: 4, loopers: 3, diveEvery: 1.8, fireEvery: 1.8 } ] },
    { name: 'Stage 4', keeper: 'atlas', patches: ['atlasreach', 'lantern'], sampler: 'eight', rows: [
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 3, wickEvery: 4, hawks: 5, loopers: 3, diveEvery: 1.7, fireEvery: 1.7 },
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 2, wickEvery: 4, hawks: 5, loopers: 4, diveEvery: 1.6, fireEvery: 1.6 } ] },
    { name: 'Stage 5', keeper: 'unraveller', patches: ['looseend'], sampler: 'rosette', rows: [
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 2, wickEvery: 3, hawks: 6, loopers: 4, diveEvery: 1.5, fireEvery: 1.6 },
      { spinners: 4, mids: 8, nibs: 10, lappetEvery: 2, wickEvery: 3, hawks: 7, loopers: 5, diveEvery: 1.4, fireEvery: 1.5 } ] }
  ];

  // ---- The Night's route: one patch per Panel; Panels II to IV offer two. Only Old Darn's text and Mark are the bible's. ----
  const PATCHES = {
    selvage:    { name: 'Selvage Edge',  art: 'selvage', desc: 'The edge of the cloth, where every run begins.', mark: '' },
    moththick:  { name: 'Moth-thick',    art: 'holes',   desc: 'Crowded with moths. Harder, and it pays better.', mark: 'More enemies per wave; coins are worth 50% more', mods: { crowd: 1, dust: 1.5 } },
    olddarn:    { name: 'Old Darn',      art: 'darn',    desc: 'An old repair. The bonus wave here flies a different pattern.', mark: 'A perfect bonus wave pays double gems', mods: { samplerSilk: 2, sampler: 'rosette' } },
    thincloth:  { name: 'Thin Cloth',    art: 'holes',   desc: 'Worn thin. Fire-carrying Wicks gather here.', mark: 'More Wicks; blueprints drop twice as often', mods: { wicks: 3, charts: 2 } },
    boro:       { name: 'Boro Square',   art: 'boro',    desc: 'Patch on patch. A safer way through.', mark: 'Restores 1 shield after every wave', mods: { mend: 1 } },
    atlasreach: { name: 'Atlas Reach',   art: 'eyes',    desc: 'Guarded by Hawks. Harder, and the boss pays better.', mark: 'More Hawks; the boss pays 4 extra gems', mods: { hawks: 4, keeperSilk: 4 } },
    lantern:    { name: 'Lantern Field', art: 'lines',   desc: 'Lit by old lamplight.', mark: 'Power-ups drop twice as often', mods: { charms: 2 } },
    looseend:   { name: 'The Loose End', art: 'fringe',  desc: 'The far edge of the cloth. The final stage.', mark: '' }
  };

  // ---- The Sampler: 40 moths trace a pattern and never fire. Stitch them all. ----
  const SAMPLER = { count: 40, pts: 100, perfectPts: 2400, perfectSilk: 3, gap: 0.3, speed: 0.105, order: ['nibbler', 'nibbler', 'casebearer', 'lappet'] };

  // ---- Spool Wall: threads (weapons). Bought with Dust, kept for good; weights II/III cost +90/+160. ----
  const WEIGHT_COST = [0, 90, 160];
  const THREADS = {
    running:    { name: 'Single Stitch', price: 0,   color: PAL.linen,      rate: [0.30, 0.23, 0.23], desc: 'One shot, straight ahead.',
      weights: ['One shot, straight ahead', 'Fires 30% faster', 'Shots pierce through one enemy'] },
    backstitch: { name: 'Double Stitch',  price: 120, color: PAL.madder,     rate: [0.34, 0.26, 0.26], desc: 'Two shots side by side.',
      weights: ['Two shots side by side', 'Fires 30% faster', 'Three shots side by side'] },
    herringbone:{ name: 'Spread Stitch',  price: 180, color: PAL.saffron,    rate: [0.56, 0.28, 0.30], desc: 'Three shots that fan outward.', chart: 'bp_herringbone',
      weights: ['Three shots in a fan', 'Fires twice as fast', 'Five shots in a wider fan'] },
    chain:      { name: 'Chain Stitch',   price: 220, color: PAL.madderPale, rate: [0.42, 0.42, 0.42], desc: 'A hit jumps on to a second nearby enemy.', chart: 'bp_chain',
      weights: ['Hits jump to a second enemy', 'Hits jump to a third enemy', 'Jumps do full damage'] },
    knot:       { name: 'Knot Bomb',      price: 240, color: PAL.knot,       rate: [0.95, 0.95, 0.5],  desc: 'A slow bomb that explodes and damages everything nearby.', chart: 'bp_knot',
      weights: ['A slow bomb with a small blast', 'A much bigger blast', 'Fires twice as fast'] },
    couching:   { name: 'Wire Laser',     price: 260, color: PAL.steel,      rate: [0.95, 0.6, 0.6],   desc: 'Charges up, then fires a beam that hits everything in its column. Your ship moves at half speed while it charges.', chart: 'bp_couching',
      weights: ['A beam through the whole column', 'Charges faster', 'The beam is twice as wide'] }
  };

  // ---- Needle Case: needles (ships). Bought with Silk, owned for good. Pips: Ply, Pace, Eye, Point. ----
  const NEEDLES = {
    sharps:   { name: 'Sharps',   price: 0,   ply: 2, pace: 3, eye: 2, point: 2, trait: 'Balanced',      traitDesc: 'Smaller hitbox and longer invincibility after a hit.' },
    between:  { name: 'Between',  price: 40,  ply: 1, pace: 5, eye: 2, point: 2, trait: 'Dash',          traitDesc: 'Fast and fragile. Double-tap a direction to dash.' },
    darner:   { name: 'Darner',   price: 60,  ply: 2, pace: 2, eye: 3, point: 2, trait: 'Wide Shot',     traitDesc: 'Every weapon fires two extra side shots.', chart: 'bp_darner' },
    chenille: { name: 'Chenille', price: 80,  ply: 3, pace: 2, eye: 4, point: 1, trait: 'Two Weapons',   traitDesc: 'Carries two weapons. Swap between them any time.', chart: 'bp_chenille' },
    sail:     { name: 'Sail',     price: 100, ply: 4, pace: 1, eye: 1, point: 3, trait: 'Heavy',         traitDesc: 'Slow and tough. Blocks one capture beam every wave.', chart: 'bp_sail' },
    beading:  { name: 'Beading',  price: 140, ply: 1, pace: 4, eye: 1, point: 4, trait: 'Piercing',      traitDesc: 'Fragile and hard-hitting. Every shot pierces one enemy.', chart: 'bp_beading' }
  };

  // ---- Gimp's Bench: tempers. Dust. Permanent on every needle (owner direction; the bible had them per-Night). ----
  const TEMPER_COST = [40, 90, 160, 260];
  const TEMPERS = {
    point: { name: 'Damage', max: 4, desc: 'Each level: shots hit harder. Level IV breaks Casebearer armour in one hit', chartAt: 4 },
    eye:   { name: 'Fire rate', max: 4, desc: 'Each level: fire faster', chartAt: 4 },
    ply:   { name: 'Shield', max: 3, desc: 'Each level: take one more hit before losing a life' },
    pace:  { name: 'Speed', max: 3, desc: 'Each level: move faster' }
  };

  // ---- Notions Drawer: consumables. Dust. Single use, three tray slots. ----
  const NOTIONS = {
    thimble: { name: 'Thimble',        price: 60,  sprite: 'thimble', desc: 'Blocks the next hit.' },
    ripper:  { name: 'Seam Ripper',    price: 110, sprite: 'ripper',  desc: 'Destroys the front row of enemies. Damages a boss.' },
    beeswax: { name: 'Beeswax',        price: 50,  sprite: 'beeswax', desc: 'Double fire rate for 10 seconds.' },
    chalk:   { name: "Tailor's Chalk", price: 40,  sprite: 'chalk',   desc: 'Shows a warning line before the next 3 dive attacks.' },
    pin:     { name: 'Safety Pin',     price: 70,  sprite: 'pin',     desc: 'Blocks the next capture beam.' },
    button:  { name: 'Brass Button',   price: 150, sprite: 'button',  desc: '+1 life. Limit one per hideout visit.', perVisit: true, chart: 'bp_button' },
    shears:  { name: 'Pinking Shears', price: 80,  sprite: 'shears',  desc: 'Clears every enemy shot on screen.', chart: 'bp_shears' },
    dish:    { name: 'Magnet Dish',    price: 45,  sprite: 'dish',    desc: 'Pulls every coin and pickup to your ship for 12 seconds.' }
  };

  // ---- Charms: temporary power-ups shaken loose from stitched moths. ----
  const CHARMS = {
    gold:   { name: 'Double Coins', color: PAL.saffron,    dur: 12, desc: 'Coins are worth double.' },
    bobbin: { name: 'Rapid Fire',   color: PAL.madderPale, dur: 10, desc: 'Fire 60% faster.' },
    staple: { name: 'Piercing Shots',color: PAL.steelHi,   dur: 8,  desc: 'Shots pass through every enemy.' },
    fan:    { name: 'Wide Shot',    color: PAL.blue,       dur: 10, desc: 'Two extra side shots.' },
    starch: { name: 'Invincible',   color: PAL.paper,      dur: 6,  desc: 'Nothing can hurt you.' },
    tangle: { name: 'Slow Motion',  color: PAL.green,      dur: 6,  desc: 'Enemies and their shots move at half speed.' },
    egg:    { name: 'Shield +1',    color: PAL.tan,        dur: 0,  desc: 'Restores one shield.' },
    twin:   { name: 'Twin Ship',    color: PAL.madder,     dur: 0,  desc: 'A second ship flies and fires beside you until it is hit.' }
  };

  // ---- The Pattern: permanent stitches. Silk. Each row unlocks left to right. ----
  const PATTERN = {
    rows: [
      { name: 'Ship',     nodes: ['steady', 'quick', 'second'] },
      { name: 'Senses',   nodes: ['keen', 'chalkline', 'sight'] },
      { name: 'Wallet',   nodes: ['deep', 'credit', 'sweepings'] },
      { name: 'Survival', nodes: ['sparepin', 'mended', 'lastknot'] }
    ],
    nodes: {
      steady:    { name: 'Recovery',      cost: 20, desc: 'Stay invincible 50% longer after taking a hit.' },
      quick:     { name: 'Speed Boost',   cost: 30, desc: '+10% speed on every ship.' },
      second:    { name: 'Combo Keeper',  cost: 40, desc: 'Your combo lasts twice as long before it resets.' },
      keen:      { name: 'Coin Magnet',   cost: 20, desc: 'Pick up coins from 50% farther away.' },
      chalkline: { name: 'Dive Warning',  cost: 30, desc: 'A faint warning line appears before every dive attack.' },
      sight:     { name: 'Blueprint Finder', cost: 40, desc: 'Blueprints drop twice as often.' },
      deep:      { name: 'Bigger Slots',  cost: 25, desc: 'Each item slot holds two of the same item.' },
      credit:    { name: 'Discount',      cost: 35, desc: '10% off every item.' },
      sweepings: { name: 'Coin Exchange', cost: 45, desc: 'When a run ends in game over, earn 1 gem for every 100 coins you hold.' },
      sparepin:  { name: 'Extra Life',    cost: 30, desc: 'Start every run with one more life.' },
      mended:    { name: 'Shield Repair', cost: 60, desc: 'Restore 1 shield at the start of every wave.' },
      lastknot:  { name: 'Second Chance', cost: 90, desc: 'Once per run, survive the hit that would end it and keep flying with 1 shield.' }
    }
  };

  // ---- Pattern charts (blueprints). Found in flight; each unseals one thing at the Hem. ----
  const CHARTS = {
    bp_herringbone: { name: 'Spread Stitch blueprint', unseals: 'the Spread Stitch weapon', from: 'Mother Tinea' },
    bp_darner:      { name: 'Darner blueprint',     unseals: 'the Darner ship', from: 'Mother Tinea' },
    bp_chain:       { name: 'Chain Stitch blueprint', unseals: 'the Chain Stitch weapon', from: 'The Atlas' },
    bp_chenille:    { name: 'Chenille blueprint',   unseals: 'the Chenille ship', from: 'The Atlas' },
    bp_beading:     { name: 'Beading blueprint',    unseals: 'the Beading ship', from: 'The Unraveller' },
    bp_couching:    { name: 'Wire Laser blueprint', unseals: 'the Wire Laser weapon', from: 'The Unraveller' },
    bp_knot:        { name: 'Knot Bomb blueprint',  unseals: 'the Knot Bomb weapon',   from: 'any enemy (rare drop)', loose: true },
    bp_sail:        { name: 'Sail blueprint',       unseals: 'the Sail ship',     from: 'any enemy (rare drop)', loose: true },
    bp_gilt:        { name: 'Level IV blueprint',   unseals: 'level IV of the Damage and Fire rate upgrades', from: 'The Great Wick, or any enemy (rare drop)', loose: true },
    bp_button:      { name: 'Brass Button blueprint', unseals: 'the Brass Button item',   from: 'The Great Lappet, or any enemy (rare drop)', loose: true },
    bp_shears:      { name: 'Pinking Shears blueprint', unseals: 'the Pinking Shears item',  from: 'any enemy (rare drop)', loose: true }
  };

  const TUNING = {
    fieldW: 14, fieldH: 18.67, playerY: 1.5, spares: 2, traySlots: 3,
    comboWindow: 2.5, comboStep: 8, comboMax: 5,
    charmChance: 0.07, chartChance: 0.012, magnet: 1.7, dropSpeed: 2.3,
    cleanRowDust: 20, panelSilk: 2
  };

  ST.content = { PAL, SPRITES, MOTHS, KEEPERS, PANELS, STAGES, STAGE_LABEL, PATCHES, SAMPLER, THREADS, WEIGHT_COST, NEEDLES, TEMPERS, TEMPER_COST, NOTIONS, CHARMS, PATTERN, CHARTS, TUNING };
})(typeof window !== 'undefined' ? (window.ST = window.ST || {}) : (globalThis.ST = globalThis.ST || {}));
