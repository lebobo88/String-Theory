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

    weevil: spr(MOTH, ['...D...D...', '....D.D....', '...DDDDD...', '..DBBBBBD..', '.DBBDBDBBD.', '.DBBBDBBBD.', '.DBBDBDBBD.', '..DBBBBBD..', '...DD.DD...']),
    firefly: spr(MOTH, ['.D.....D.', '..D...D..', '...DRD...', 'TT.DDD.TT', 'TTTDDDTTT', '.TTDDDTT.', '...GYG...', '...YYY...', '....Y....']),
    silkworm: spr(MOTH, ['...........', '.WW.WW.WW..', 'WTTWTTWTTW.', 'WTTWTTWTTRD', 'WTTWTTWTTW.', '.WW.WW.WW..', '.D..D..D...']),
    beetle: spr({ A: PAL.darkBrown, B: PAL.brown, C: PAL.ochre, E: PAL.madder }, [
      '......A.......A......', '.......A.....A.......', '........AEEEA........', '.......AEEEEEA.......', '.....AAAAAAAAAAA.....',
      '...AABBBBBABBBBBAA...', '..ABBBCBBBABBBCBBBA..', '.ABBBBBBBBABBBBBBBBA.', '.ABBCBBBBBABBBBBCBBA.', '.ABBBBBCBBABBCBBBBBA.',
      '.ABBBBBBBBABBBBBBBBA.', '..ABBBCBBBABBBCBBBA..', '...AABBBBBABBBBBAA...', '.....AAAAAAAAAAA.....', '....A..A.....A..A....']),
    empress: spr({ A: PAL.darkBrown, W: PAL.linen, T: PAL.tan, G: PAL.saffron, R: PAL.madder }, [
      '....A.....G.G.G.....A....', '.....A....GGGGG....A.....', '......A...AGGGA...A......', '.......A..ARARA..A.......',
      'WWW.....AAAAAAAAA.....WWW', 'WTWWW...AWWWAWWWA...WWWTW', 'WTTTWWW.AWTWAWTWA.WWWTTTW', 'WTTTTTWWAWWWAWWWAWWTTTTTW',
      '.WTTTTTTAWTWAWTWATTTTTTW.', '.WTTGTTTAWWWAWWWATTTGTTW.', '..WTTTTTAWTWAWTWATTTTTW..', '..WWTTTWAWWWAWWWAWTTTWW..',
      '...WWTWW.AWTWTWA.WWTWW...', '....WWW..AWWWWWA..WWW....', '..........AWTWA..........', '..........AWWWA..........', '...........AAA...........']),
    king: spr({ A: PAL.darkBrown, B: PAL.madder, G: PAL.saffron, D: PAL.tan, E: PAL.linen, F: PAL.glare }, [
      '..........G.G.G.G..........', '..........GGGGGGG..........', '..A.......AGGGGGA.......A..', '...A......AFAAAFA......A...',
      '....A.....AAAAAAA.....A....', 'BBB..A...AADDDDDAA...A..BBB', 'BBBBB.AAAADDEEEDDAAAA.BBBBB', 'ABBBBBBBAADDEAEDDAABBBBBBBA',
      'ABBGBBBBBADDEAEDDABBBBBGBBA', '.ABBBBBBBADDEAEDDABBBBBBBA.', '.ABBBBGBBADDEEEDDABBGBBBBA.', '..ABBBBBBADDEAEDDABBBBBBA..',
      '..AABBBBBAADEEEDAABBBBBAA..', '...AABBBAA.ADDDDA.AABBBAA..', '....AAAAA..ADADDA..AAAAA...', '...........ADADDA..........',
      '............AAAA...........', '.............AA............']),
    tapestry: spr(NEEDLE, ['.....A.....', '....CBC....', '....CBC....', '...FCBCF...', '..FFCBCFF..', '.DFFCBCFFD.', 'DDF.CBC.FDD', 'D...C.C...D', '....C.C....', '....CBC....', '...DCBCD...', '....CBC....']),
    embroidery: spr(NEEDLE, ['.....A.....', '.....B.....', '....CBC....', '...UCBCU...', '..UUCBCUU..', '.UUECBCEUU.', 'UUE.CBC.EUU', 'U...C.C...U', '....C.C....', '....CBC....', '....CBC....', '.....B.....']),
    quilter: spr(NEEDLE, ['......A......', '.....CBC.....', '....DCBCD....', '...DECBCED...', '..DEDCBCDED..', '.DEDECBCEDED.', 'DEDEDC.CDEDED', 'DDDDDC.CDDDDD', '.....C.C.....', '.....CBC.....', '....CCBCC....', '.....CBC.....']),
    bobbin: spr({ O: PAL.brass, R: PAL.madder, H: PAL.madderDeep }, ['.OOO.', 'OOOOO', '.RHR.', '.HRH.', '.RHR.', 'OOOOO', '.OOO.']),
    patch: spr({ A: PAL.linen, R: PAL.madder, T: PAL.tan }, ['AAAAAAA', 'ATTRTTA', 'ATTRTTA', 'ARRRRRA', 'ATTRTTA', 'ATTRTTA', 'AAAAAAA']),
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
    spinner:    { name: 'Spinner',    sprite: 'spinner',    hp: 2,    pts: 150, ptsDive: 400, ptsEscort: 800, dust: 3, silk: 1, silkChance: 0.4, r: 0.52, diveSpeed: 5.8, wob: 3, wobAmp: 1.2, shotEvery: 1.2, note: 'Squad leader. Uses a capture beam that steals a life. Destroy it to win the ship back.' },
    lappet:     { name: 'Lappet',     sprite: 'lappet',     hp: 0.75, pts: 100, ptsDive: 200, dust: 2, r: 0.5,  diveSpeed: 5.6, wob: 3, wobAmp: 2.2, shotEvery: 1.7, splits: true, packet: 0.25, note: 'Splits into two Nibblers when destroyed.' },
    hawk:       { name: 'Hawk',       sprite: 'hawk',       hp: 1,    pts: 120, ptsDive: 240, dust: 2, r: 0.5,  diveSpeed: 8.5, shotEvery: 0.5, note: 'Flies straight down the screen, shooting as it goes.' },
    looper:     { name: 'Looper',     sprite: 'looper',     hp: 2,    pts: 100, ptsDive: 200, dust: 2, r: 0.45, shotEvery: 1.7, note: 'Crosses the screen dropping floating mines. Shoot the mines to clear them.' },
    weevil:     { name: 'Weevil',     sprite: 'weevil',     hp: 3,    pts: 180, ptsDive: 360, dust: 3, r: 0.45, diveSpeed: 9.5, wob: 0, wobAmp: 0, shotEvery: 9, charge: true, note: 'Tough. Charges straight down at where you are standing.' },
    firefly:    { name: 'Firefly',    sprite: 'firefly',    hp: 1,    pts: 150, ptsDive: 300, dust: 2, r: 0.4,  diveSpeed: 6.8, wob: 4, wobAmp: 1.2, shotEvery: 9, bursts: true, note: 'Explodes into a ring of shots when destroyed. Keep your distance.' },
    silkworm:   { name: 'Silkworm',   sprite: 'silkworm',   hp: 2,    pts: 140, ptsDive: 280, dust: 3, r: 0.48, diveSpeed: 4.5, wob: 2, wobAmp: 1.5, shotEvery: 1.4, turret: true, note: 'Sits in formation and fires aimed shots. Destroy it first.' },
    wick:       { name: 'Wick',       sprite: 'wick',       hp: 1,    pts: 200, ptsDive: 400, dust: 3, r: 0.4,  diveSpeed: 6.5, note: 'Carries a fireball. If it reaches the bottom it leaves a burning patch.' }
  };

  // ---- Keepers (Plate 08). soft: offsets from centre in world units; damage x2 there, x0.6 elsewhere.
  // The bible draws three Keepers (Panels II, IV, V) but its Night's chart has a Keeper row under every Panel,
  // so Panels I and III use stand-ins built from existing Host charts: the Great Lappet and the Great Wick. ----
  /* move: [x amplitude, x speed, y]. attacks[phase] = list of [kind, seconds between, option].
     Kinds: fan (n shots), aimed (n), silk, net, strike, glare, coal, knot, spawn (enemy type), ring (n), pull. */
  const KEEPERS = {
    greatlappet: { name: 'The Great Lappet', sprite: 'lappet', hp: 150, pts: 2000, silk: 5, dust: 45, cell: 0.3, halfW: 2.2, halfH: 1.8, softY: 0, standIn: true,
      soft: [{ x: 0, r: 0.6 }], softName: 'The pale stripe down her back', move: [4, 0.7, 14.6],
      phases: ['Fires spreads of shots', 'Spawns Lappets that split when destroyed'], phaseTag: ['Spread shots', 'Spawning Lappets'],
      attacks: [[['fan', 1.6, 4]], [['fan', 2.0, 5], ['spawn', 4.2, 'lappet']]], charts: ['bp_button'] },
    tinea: { name: 'Mother Tinea', sprite: 'tinea', hp: 230, pts: 3000, silk: 5, dust: 60, cell: 0.2, halfW: 2.9, halfH: 2.3, softY: -1.3,
      soft: [{ x: 0, r: 0.75 }], softName: 'Her belly', move: [3.6, 0.6, 14.2],
      phases: ['Spawns Nibblers from her wings', 'Sends a net down the screen with one gap to fly through'], phaseTag: ['Spawning Nibblers', 'Find the gap in the net'],
      attacks: [[['spawn', 2.6, 'nibbler'], ['silk', 1.4]], [['spawn', 4.0, 'nibbler'], ['silk', 1.8], ['net', 4.6]]], charts: ['bp_herringbone', 'bp_darner'] },
    greatwick: { name: 'The Great Wick', sprite: 'wick', hp: 300, pts: 4000, silk: 6, dust: 75, cell: 0.38, halfW: 2.0, halfH: 2.2, softY: -1.6, standIn: true,
      soft: [{ x: 0, r: 0.7 }], softName: 'The fireball it carries', move: [3.4, 0.55, 14.6],
      phases: ['Drops fireballs that leave burning patches', 'Calls in Wicks carrying more fireballs'], phaseTag: ['Fireballs', 'Wicks incoming'],
      attacks: [[['coal', 1.8], ['fan', 2.6, 3]], [['coal', 2.2], ['fan', 2.2, 5], ['spawn', 3.2, 'wick']]], charts: ['bp_gilt'] },
    atlas: { name: 'The Atlas', sprite: 'atlas', hp: 380, pts: 5000, silk: 8, dust: 90, cell: 0.22, halfW: 3.3, halfH: 2.0, softY: 0.4,
      soft: [{ x: -2.0, r: 0.6 }, { x: 2.0, r: 0.6 }], softName: 'The pale spots on her wings', move: [2.6, 0.5, 14.4],
      phases: ['Fires aimed shots from the eyespots on her wings', 'Strikes down whole columns after a warning'], phaseTag: ['Aimed shots', 'Column strikes'],
      attacks: [[['aimed', 1.1, 2]], [['aimed', 1.5, 2], ['strike', 2.6], ['fan', 3.4, 5]]], charts: ['bp_chain', 'bp_chenille'] },
    unraveller: { name: 'The Unraveller', sprite: 'unraveller', hp: 480, pts: 8000, silk: 12, dust: 130, cell: 0.22, halfW: 3.3, halfH: 2.3, softY: -1.7, noWings: true,
      soft: [{ x: 0, r: 0.9 }], softName: 'Its mouth, only while it is open', chews: true, move: [2.2, 0.4, 14.4],
      phases: ['Fires wide spreads and drops mines', 'Adds light beams that fill whole columns', 'Pulls your ship toward it'], phaseTag: ['Spreads and mines', 'Light beams', 'It pulls you in'],
      attacks: [[['fan', 1.9, 5], ['knot', 2.6]], [['fan', 1.9, 6], ['knot', 2.6], ['glare', 3.3]], [['fan', 1.25, 6], ['knot', 2.4], ['glare', 4.0], ['pull', 0]]], charts: ['bp_beading', 'bp_couching'] },
    beetle: { name: 'The Carpet Beetle', sprite: 'beetle', hp: 600, pts: 10000, silk: 14, dust: 150, cell: 0.26, halfW: 2.7, halfH: 1.9, softY: 1.4, noWings: true, added: true,
      soft: [{ x: 0, r: 0.7 }], softName: 'Its head; the shell shrugs off most damage', move: [4.4, 0.8, 14.4], armour: 0.35,
      phases: ['Rains shots and sends Weevils charging', 'Strikes columns and drops mines', 'Everything at once, faster'], phaseTag: ['Weevil charge', 'Column strikes', 'Frenzy'],
      attacks: [[['fan', 1.5, 5], ['spawn', 3.6, 'weevil']], [['fan', 1.7, 6], ['strike', 2.2], ['knot', 2.4]], [['fan', 1.1, 7], ['strike', 1.8], ['spawn', 3.0, 'weevil'], ['ring', 3.4, 10]]], charts: ['bp_cross', 'bp_quilter'] },
    empress: { name: 'The Silk Empress', sprite: 'empress', hp: 720, pts: 12000, silk: 16, dust: 170, cell: 0.24, halfW: 3.0, halfH: 2.1, softY: -0.4, added: true,
      soft: [{ x: 0, r: 0.7 }], softName: 'Her body, between the wings', move: [3.2, 0.65, 14.3],
      phases: ['Weaves nets and fires swaying silk', 'Calls Spinners and Silkworms to guard her', 'A storm of silk rings'], phaseTag: ['Nets', 'Her guard arrives', 'Silk storm'],
      attacks: [[['net', 3.6], ['silk', 0.9], ['aimed', 2.2, 1]], [['net', 4.2], ['silk', 1.1], ['spawn', 4.0, 'spinner'], ['spawn', 5.5, 'silkworm']], [['net', 3.4], ['ring', 2.0, 12], ['aimed', 1.4, 2], ['silk', 1.2]]], charts: ['bp_satin', 'bp_embroidery'] },
    king: { name: 'The Moth King', sprite: 'king', hp: 950, pts: 20000, silk: 25, dust: 250, cell: 0.24, halfW: 3.2, halfH: 2.2, softY: 1.9, added: true,
      soft: [{ x: -0.5, r: 0.45 }, { x: 0.5, r: 0.45 }], softName: 'His eyes, under the crown', move: [3.8, 0.75, 14.2],
      phases: ['Sends his swarm and fires spreads', 'Aimed shots and column strikes', 'Light beams and nets', 'Everything he has'], phaseTag: ['The swarm', 'Aimed fire', 'Beams and nets', 'Last stand'],
      attacks: [[['spawn', 2.4, 'nibbler'], ['fan', 1.6, 6]], [['aimed', 1.0, 3], ['strike', 2.4], ['spawn', 4.5, 'firefly']], [['glare', 2.8], ['net', 4.4], ['fan', 1.8, 6], ['knot', 2.8]], [['aimed', 1.2, 3], ['ring', 2.4, 14], ['strike', 2.6], ['glare', 3.6], ['spawn', 3.6, 'weevil'], ['pull', 0]]], charts: ['bp_tapestry'] }
  };

  // ---- A Night: five Panels. Every Panel is Row 1, Row 2, the Sampler, then its Keeper (20 rows on the Night's chart). ----
  const STAGES = ['row', 'row', 'row', 'sampler', 'keeper'];
  const STAGE_LABEL = ['1', '2', '3', 'B', 'X'];
  const W = (o) => Object.assign({ spinners: 4, mids: 8, nibs: 10 }, o);
  const PANELS = [
    { name: 'Stage 1', keeper: 'greatlappet', patches: ['selvage'], sampler: 'wave', rows: [
      { spinners: 2, mids: 6, nibs: 8, diveEvery: 2.5, fireEvery: 2.5 }, W({ diveEvery: 2.3, fireEvery: 2.3 }), W({ lappetEvery: 5, hawks: 2, diveEvery: 2.1, fireEvery: 2.1 }) ] },
    { name: 'Stage 2', keeper: 'tinea', patches: ['moththick', 'olddarn'], sampler: 'eight', rows: [
      W({ lappetEvery: 4, hawks: 3, diveEvery: 2.0, fireEvery: 2.0 }), W({ lappetEvery: 3, hawks: 4, diveEvery: 1.9, fireEvery: 1.9 }), W({ lappetEvery: 3, hawks: 4, loopers: 2, diveEvery: 1.8, fireEvery: 1.8 }) ] },
    { name: 'Stage 3', keeper: 'greatwick', patches: ['thincloth', 'boro'], sampler: 'spiral', rows: [
      W({ lappetEvery: 3, hawks: 4, loopers: 2, diveEvery: 1.8, fireEvery: 1.8 }), W({ lappetEvery: 3, wickEvery: 5, hawks: 4, loopers: 3, diveEvery: 1.7, fireEvery: 1.7 }), W({ lappetEvery: 3, wickEvery: 4, wormEvery: 6, hawks: 5, loopers: 3, diveEvery: 1.6, fireEvery: 1.7 }) ] },
    { name: 'Stage 4', keeper: 'atlas', patches: ['atlasreach', 'lantern'], sampler: 'eight', rows: [
      W({ lappetEvery: 3, wickEvery: 4, wormEvery: 5, hawks: 5, loopers: 3, diveEvery: 1.6, fireEvery: 1.6 }), W({ lappetEvery: 2, wickEvery: 4, weevilEvery: 6, hawks: 5, loopers: 4, diveEvery: 1.5, fireEvery: 1.6 }), W({ lappetEvery: 2, wickEvery: 4, weevilEvery: 5, wormEvery: 5, hawks: 6, loopers: 4, diveEvery: 1.5, fireEvery: 1.5 }) ] },
    { name: 'Stage 5', keeper: 'unraveller', patches: ['looseend'], sampler: 'rosette', rows: [
      W({ lappetEvery: 2, wickEvery: 3, weevilEvery: 5, hawks: 6, loopers: 4, diveEvery: 1.5, fireEvery: 1.5 }), W({ lappetEvery: 2, wickEvery: 3, flyEvery: 5, wormEvery: 5, hawks: 6, loopers: 5, diveEvery: 1.4, fireEvery: 1.5 }), W({ lappetEvery: 2, wickEvery: 3, weevilEvery: 4, flyEvery: 5, hawks: 7, loopers: 5, diveEvery: 1.4, fireEvery: 1.4 }) ] },
    { name: 'Stage 6', keeper: 'beetle', patches: ['lining', 'mothballs'], sampler: 'heart', rows: [
      W({ lappetEvery: 2, weevilEvery: 3, flyEvery: 5, wormEvery: 4, hawks: 7, loopers: 5, diveEvery: 1.4, fireEvery: 1.4 }), W({ lappetEvery: 2, wickEvery: 3, weevilEvery: 3, flyEvery: 4, hawks: 7, loopers: 5, diveEvery: 1.3, fireEvery: 1.4 }), W({ lappetEvery: 2, weevilEvery: 3, flyEvery: 4, wormEvery: 4, hawks: 8, loopers: 6, diveEvery: 1.3, fireEvery: 1.3 }) ] },
    { name: 'Stage 7', keeper: 'empress', patches: ['silkroad', 'loom'], sampler: 'star', rows: [
      W({ lappetEvery: 2, wickEvery: 3, weevilEvery: 3, flyEvery: 4, wormEvery: 3, hawks: 8, loopers: 6, diveEvery: 1.3, fireEvery: 1.3 }), W({ lappetEvery: 2, weevilEvery: 3, flyEvery: 3, wormEvery: 3, hawks: 8, loopers: 6, diveEvery: 1.2, fireEvery: 1.3 }), W({ lappetEvery: 2, wickEvery: 3, weevilEvery: 2, flyEvery: 3, wormEvery: 3, hawks: 9, loopers: 7, diveEvery: 1.2, fireEvery: 1.2 }) ] },
    { name: 'Stage 8', keeper: 'king', patches: ['heart'], sampler: 'rosette', rows: [
      W({ lappetEvery: 2, wickEvery: 3, weevilEvery: 2, flyEvery: 3, wormEvery: 3, hawks: 9, loopers: 7, diveEvery: 1.2, fireEvery: 1.2 }), W({ lappetEvery: 2, wickEvery: 2, weevilEvery: 2, flyEvery: 3, wormEvery: 2, hawks: 10, loopers: 7, diveEvery: 1.1, fireEvery: 1.2 }), W({ lappetEvery: 2, wickEvery: 2, weevilEvery: 2, flyEvery: 2, wormEvery: 2, hawks: 10, loopers: 8, diveEvery: 1.1, fireEvery: 1.1 }) ] }
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
    looseend:   { name: 'The Loose End', art: 'fringe',  desc: 'The far edge of the cloth, where the thread hangs free.', mark: '' },
    lining:     { name: 'The Lining',    art: 'lines',   desc: 'Behind the cloth. Quieter, with less to pick up.', mark: 'Fewer enemies per wave; coins are worth 25% less', mods: { thin: 1, dust: 0.75 } },
    mothballs:  { name: 'Mothball Row',  art: 'holes',   desc: 'Something has been keeping the moths out. It makes them angry.', mark: 'Enemies have 25% more health; gems from the boss are doubled', mods: { hp: 1.25, keeperSilkMul: 2 } },
    silkroad:   { name: 'Silk Road',     art: 'darn',    desc: 'Spinners travel this way in numbers.', mark: 'Spinners always drop a gem', mods: { spinnerSilk: 1 } },
    loom:       { name: 'Loom Shadow',   art: 'boro',    desc: 'The great loom overhead drops what it finds.', mark: 'Power-ups drop twice as often; enemy shots are 20% faster', mods: { charms: 2, shotSpeed: 1.2 } },
    heart:      { name: 'Heart of the Cloth', art: 'eyes', desc: 'The centre of the Coverlet, and the Moth King\'s court. The final stage.', mark: '' }
  };

  // ---- The Sampler: 40 moths trace a pattern and never fire. Stitch them all. ----
  const SAMPLER = { count: 40, pts: 100, perfectPts: 2400, perfectSilk: 3, gap: 0.3, speed: 0.105, order: ['nibbler', 'nibbler', 'casebearer', 'lappet'] };

  // ---- Difficulty: scales enemy health, speed and fire, and what a run pays. ----
  const MODES = {
    normal:    { name: 'Normal',    hp: 1,   speed: 1,    fire: 1,    pay: 1,   need: null },
    hard:      { name: 'Hard',      hp: 1.5, speed: 1.15, fire: 1.25, pay: 1.5, need: 'normal' },
    nightmare: { name: 'Nightmare', hp: 2.2, speed: 1.3,  fire: 1.6,  pay: 2.2, need: 'hard' }
  };

  // ---- Spool Wall: threads (weapons). Bought with Dust, kept for good; weights II/III cost +90/+160. ----
  const WEIGHT_COST = [0, 400, 900];
  const THREADS = {
    running:    { name: 'Single Stitch', price: 0,   color: PAL.linen,      rate: [0.30, 0.23, 0.23], desc: 'One shot, straight ahead.',
      weights: ['One shot, straight ahead', 'Fires 30% faster', 'Shots pierce through one enemy'] },
    backstitch: { name: 'Double Stitch',  price: 350, color: PAL.madder,     rate: [0.34, 0.26, 0.26], desc: 'Two shots side by side.',
      weights: ['Two shots side by side', 'Fires 30% faster', 'Three shots side by side'] },
    herringbone:{ name: 'Spread Stitch',  price: 600, color: PAL.saffron,    rate: [0.56, 0.28, 0.30], desc: 'Three shots that fan outward.', chart: 'bp_herringbone',
      weights: ['Three shots in a fan', 'Fires twice as fast', 'Five shots in a wider fan'] },
    chain:      { name: 'Chain Stitch',   price: 800, color: PAL.madderPale, rate: [0.42, 0.42, 0.42], desc: 'A hit jumps on to a second nearby enemy.', chart: 'bp_chain',
      weights: ['Hits jump to a second enemy', 'Hits jump to a third enemy', 'Jumps do full damage'] },
    knot:       { name: 'Knot Bomb',      price: 900, color: PAL.knot,       rate: [0.95, 0.95, 0.5],  desc: 'A slow bomb that explodes and damages everything nearby.', chart: 'bp_knot',
      weights: ['A slow bomb with a small blast', 'A much bigger blast', 'Fires twice as fast'] },
    couching:   { name: 'Wire Laser',     price: 1000, color: PAL.steel,      rate: [0.95, 0.6, 0.6],   desc: 'Charges up, then fires a beam that hits everything in its column. Your ship moves at half speed while it charges.', chart: 'bp_couching',
      weights: ['A beam through the whole column', 'Charges faster', 'The beam is twice as wide'] },
    cross:      { name: 'Cross Stitch',   price: 1100, color: PAL.blue,      rate: [0.36, 0.36, 0.30], desc: 'Two diagonal shots that bounce off the side walls.', chart: 'bp_cross',
      weights: ['Two diagonal shots that bounce off the walls', 'Shots bounce twice and hit harder', 'Adds a third shot straight ahead'] },
    satin:      { name: 'Satin Stitch',   price: 1200, color: PAL.green,     rate: [0.11, 0.11, 0.085], desc: 'A rapid stream of light shots that weaves from side to side.', chart: 'bp_satin',
      weights: ['A rapid weaving stream of light shots', 'Two streams side by side', 'Fires faster'] }
  };

  // ---- Needle Case: needles (ships). Bought with Silk, owned for good. Pips: Ply, Pace, Eye, Point. ----
  const NEEDLES = {
    sharps:   { name: 'Sharps',   price: 0,   ply: 2, pace: 3, eye: 2, point: 2, trait: 'Balanced',      traitDesc: 'Smaller hitbox and longer invincibility after a hit.' },
    between:  { name: 'Between',  price: 60,  ply: 1, pace: 5, eye: 2, point: 2, trait: 'Dash',          traitDesc: 'Fast and fragile. Double-tap a direction to dash.' },
    darner:   { name: 'Darner',   price: 90,  ply: 2, pace: 2, eye: 3, point: 2, trait: 'Wide Shot',     traitDesc: 'Every weapon fires two extra side shots.', chart: 'bp_darner' },
    chenille: { name: 'Chenille', price: 120,  ply: 3, pace: 2, eye: 4, point: 1, trait: 'Two Weapons',   traitDesc: 'Carries two weapons. Swap between them any time.', chart: 'bp_chenille' },
    sail:     { name: 'Sail',     price: 150, ply: 4, pace: 1, eye: 1, point: 3, trait: 'Heavy',         traitDesc: 'Slow and tough. Blocks one capture beam every wave.', chart: 'bp_sail' },
    beading:  { name: 'Beading',  price: 200, ply: 1, pace: 4, eye: 1, point: 4, trait: 'Piercing',      traitDesc: 'Fragile and hard-hitting. Every shot pierces one enemy.', chart: 'bp_beading' },
    quilter:  { name: 'Quilter',  price: 180, ply: 3, pace: 2, eye: 2, point: 2, trait: 'Padded',       traitDesc: 'Starts every wave with a one-hit shield.', chart: 'bp_quilter' },
    embroidery: { name: 'Embroidery', price: 220, ply: 2, pace: 3, eye: 2, point: 1, trait: 'Guided',    traitDesc: 'Every shot curves toward the nearest enemy.', chart: 'bp_embroidery' },
    tapestry: { name: 'Tapestry', price: 260, ply: 2, pace: 3, eye: 3, point: 2, trait: 'Bobbin Drone', traitDesc: 'A small drone flies beside you and fires with you.', chart: 'bp_tapestry' }
  };

  // ---- Gimp's Bench: tempers. Dust. Permanent on every needle (owner direction; the bible had them per-Night). ----
  const TEMPER_COST = [120, 300, 650, 1200, 2000];
  const TEMPERS = {
    point: { name: 'Damage', max: 5, desc: 'Each level: shots hit harder. Level IV breaks Casebearer armour in one hit', chartAt: 4 },
    eye:   { name: 'Fire rate', max: 5, desc: 'Each level: fire faster', chartAt: 4 },
    ply:   { name: 'Shield', max: 3, desc: 'Each level: take one more hit before losing a life' },
    pace:  { name: 'Speed', max: 3, desc: 'Each level: move faster' },
    magnet: { name: 'Magnet', max: 3, desc: 'Each level: pull in coins and pickups from 35% farther away' },
    luck:  { name: 'Luck', max: 3, desc: 'Each level: power-ups and blueprints drop 20% more often' }
  };

  // ---- Notions Drawer: consumables. Dust. Single use, three tray slots. ----
  const NOTIONS = {
    thimble: { name: 'Thimble',        price: 120, sprite: 'thimble', desc: 'Blocks the next hit.' },
    ripper:  { name: 'Seam Ripper',    price: 220, sprite: 'ripper',  desc: 'Destroys the front row of enemies. Damages a boss.' },
    beeswax: { name: 'Beeswax',        price: 100, sprite: 'beeswax', desc: 'Double fire rate for 10 seconds.' },
    chalk:   { name: "Tailor's Chalk", price: 80,  sprite: 'chalk',   desc: 'Shows a warning line before the next 3 dive attacks.' },
    pin:     { name: 'Safety Pin',     price: 140, sprite: 'pin',     desc: 'Blocks the next capture beam.' },
    button:  { name: 'Brass Button',   price: 400, sprite: 'button',  desc: '+1 life. Limit one per hideout visit.', perVisit: true, chart: 'bp_button' },
    shears:  { name: 'Pinking Shears', price: 160, sprite: 'shears',  desc: 'Clears every enemy shot on screen.', chart: 'bp_shears' },
    dish:    { name: 'Magnet Dish',    price: 90,  sprite: 'dish',    desc: 'Pulls every coin and pickup to your ship for 12 seconds.' },
    patch:   { name: 'Patch Kit',      price: 200, sprite: 'patch',   desc: 'Restores your shield to full.' },
    drone:   { name: 'Bobbin Drone',   price: 240, sprite: 'bobbin',  desc: 'A drone flies beside you and fires with you for 25 seconds.', chart: 'bp_drone' }
  };

  // ---- Charms: temporary power-ups shaken loose from stitched moths. ----
  const CHARMS = {
    gold:   { name: 'Double Coins', color: PAL.saffron,    dur: 12, desc: 'Coins are worth double.' },
    bobbin: { name: 'Rapid Fire',   color: PAL.madderPale, dur: 10, desc: 'Fire 60% faster.' },
    staple: { name: 'Piercing Shots',color: PAL.steelHi,   dur: 8,  desc: 'Shots pass through every enemy.' },
    fan:    { name: 'Wide Shot',    color: PAL.mist,       dur: 10, desc: 'Two extra side shots.' },
    starch: { name: 'Invincible',   color: PAL.paper,      dur: 6,  desc: 'Nothing can hurt you.' },
    tangle: { name: 'Slow Motion',  color: PAL.green,      dur: 6,  desc: 'Enemies and their shots move at half speed.' },
    egg:    { name: 'Shield +1',    color: PAL.tan,        dur: 0,  desc: 'Restores one shield.' },
    homing: { name: 'Guided Shots', color: PAL.blue,       dur: 10, desc: 'Shots curve toward the nearest enemy.' },
    drone:  { name: 'Bobbin Drone', color: PAL.brass,      dur: 15, desc: 'A drone flies beside you and fires with you.' },
    bomb:   { name: 'Unravel',      color: PAL.madderHi,   dur: 0,  desc: 'Damages every enemy on screen and clears their shots.' },
    twin:   { name: 'Twin Ship',    color: PAL.madder,     dur: 0,  desc: 'A second ship flies and fires beside you until it is hit.' }
  };

  // ---- The Pattern: permanent stitches. Silk. Each row unlocks left to right. ----
  const PATTERN = {
    rows: [
      { name: 'Ship',     nodes: ['steady', 'quick', 'second'] },
      { name: 'Senses',   nodes: ['keen', 'chalkline', 'sight'] },
      { name: 'Wallet',   nodes: ['deep', 'credit', 'sweepings'] },
      { name: 'Survival', nodes: ['sparepin', 'mended', 'lastknot'] },
      { name: 'Arsenal',  nodes: ['headstart', 'overtime', 'bargain'] }
    ],
    nodes: {
      steady:    { name: 'Recovery',      cost: 30, desc: 'Stay invincible 50% longer after taking a hit.' },
      quick:     { name: 'Speed Boost',   cost: 45, desc: '+10% speed on every ship.' },
      second:    { name: 'Combo Keeper',  cost: 60, desc: 'Your combo lasts twice as long before it resets.' },
      keen:      { name: 'Coin Magnet',   cost: 30, desc: 'Pick up coins from 50% farther away.' },
      chalkline: { name: 'Dive Warning',  cost: 45, desc: 'A faint warning line appears before every dive attack.' },
      sight:     { name: 'Blueprint Finder', cost: 60, desc: 'Blueprints drop twice as often.' },
      deep:      { name: 'Bigger Slots',  cost: 40, desc: 'Each item slot holds two of the same item.' },
      credit:    { name: 'Discount',      cost: 55, desc: '10% off every item.' },
      sweepings: { name: 'Coin Exchange', cost: 70, desc: 'When a run ends in game over, earn 1 gem for every 100 coins you hold.' },
      sparepin:  { name: 'Extra Life',    cost: 50, desc: 'Start every run with one more life.' },
      mended:    { name: 'Shield Repair', cost: 90, desc: 'Restore 1 shield at the start of every stage.' },
      headstart: { name: 'Head Start',    cost: 40, desc: 'Start every run with a one-hit shield already up.' },
      overtime:  { name: 'Overtime',      cost: 60, desc: 'Power-ups last 30% longer.' },
      bargain:   { name: 'Bargain',       cost: 80, desc: 'Weapon levels and ship upgrades cost 15% less.' },
      lastknot:  { name: 'Second Chance', cost: 140, desc: 'Once per run, survive the hit that would end it and keep flying with 1 shield.' }
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
    bp_cross:       { name: 'Cross Stitch blueprint', unseals: 'the Cross Stitch weapon', from: 'The Carpet Beetle' },
    bp_quilter:     { name: 'Quilter blueprint',    unseals: 'the Quilter ship',        from: 'The Carpet Beetle' },
    bp_satin:       { name: 'Satin Stitch blueprint', unseals: 'the Satin Stitch weapon', from: 'The Silk Empress' },
    bp_embroidery:  { name: 'Embroidery blueprint', unseals: 'the Embroidery ship',     from: 'The Silk Empress' },
    bp_tapestry:    { name: 'Tapestry blueprint',   unseals: 'the Tapestry ship',       from: 'The Moth King' },
    bp_drone:       { name: 'Bobbin Drone blueprint', unseals: 'the Bobbin Drone item', from: 'any enemy (rare drop)', loose: true },
    bp_knot:        { name: 'Knot Bomb blueprint',  unseals: 'the Knot Bomb weapon',   from: 'any enemy (rare drop)', loose: true },
    bp_sail:        { name: 'Sail blueprint',       unseals: 'the Sail ship',     from: 'any enemy (rare drop)', loose: true },
    bp_gilt:        { name: 'Level IV blueprint',   unseals: 'level IV of the Damage and Fire rate upgrades', from: 'The Great Wick, or any enemy (rare drop)', loose: true },
    bp_button:      { name: 'Brass Button blueprint', unseals: 'the Brass Button item',   from: 'The Great Lappet, or any enemy (rare drop)', loose: true },
    bp_shears:      { name: 'Pinking Shears blueprint', unseals: 'the Pinking Shears item',  from: 'any enemy (rare drop)', loose: true }
  };

  const TUNING = {
    fieldW: 14, fieldH: 18.67, playerY: 1.5, spares: 2, traySlots: 3,
    comboWindow: 2.5, comboStep: 8, comboMax: 5, comboCoin: 0.25,
    charmChance: 0.045, chartChance: 0.01, magnet: 1.7, dropSpeed: 2.3,
    cleanRowDust: 12, panelSilk: 2,
    stageHp: 0.2, stageSpeed: 0.04, stageShot: 0.05     // per stage: enemies get tougher, faster, and their shots quicker
  };

  ST.content = { PAL, SPRITES, MOTHS, KEEPERS, PANELS, STAGES, STAGE_LABEL, PATCHES, SAMPLER, MODES, THREADS, WEIGHT_COST, NEEDLES, TEMPERS, TEMPER_COST, NOTIONS, CHARMS, PATTERN, CHARTS, TUNING };
})(typeof window !== 'undefined' ? (window.ST = window.ST || {}) : (globalThis.ST = globalThis.ST || {}));
