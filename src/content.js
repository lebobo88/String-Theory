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
    greenPale: '#A9C08A', blue: '#5568A6', knot: '#6E1A24',
    rose: '#E6A1B8', teal: '#5FB0A4', rust: '#D9783A', violet: '#9A7AD0'   // the four newest weapons
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

    shieldbug: spr(MOTH, ['...D.....D...', '....D...D....', '....BBDBB....', '...BBTDTBB...', '..BBTBDBTBB..', '..BBBBDBBBB..', '.WWWWWWWWWWW.', '.WTWWWWWWWTW.', '..WWWWWWWWW..', '....WWWWW....']),
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
    shieldbug:  { name: 'Shield Bug', sprite: 'shieldbug',  hp: 1.5,  pts: 160, ptsDive: 320, dust: 3, r: 0.46, diveSpeed: 5.2, wob: 2, wobAmp: 1.4, shotEvery: 1.6, guard: true, note: 'Holds a shield in front while it keeps formation: straight shots bounce off. Hit it from an angle, with a blast or a beam, or when it dives.' },
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
      attacks: [[['fan', 1.6, 4]], [['fan', 2.0, 5], ['spawn', 4.2, 'lappet']]], charts: ['bp_button', 'bp_daisy'] },
    tinea: { name: 'Mother Tinea', sprite: 'tinea', hp: 230, pts: 3000, silk: 5, dust: 60, cell: 0.2, halfW: 2.9, halfH: 2.3, softY: -1.3,
      soft: [{ x: 0, r: 0.75 }], softName: 'Her belly', move: [3.6, 0.6, 14.2],
      phases: ['Spawns Nibblers from her wings', 'Sends a net down the screen with one gap to fly through'], phaseTag: ['Spawning Nibblers', 'Find the gap in the net'],
      attacks: [[['spawn', 2.6, 'nibbler'], ['silk', 1.4]], [['spawn', 4.0, 'nibbler'], ['silk', 1.8], ['net', 4.6]]], charts: ['bp_herringbone', 'bp_darner'] },
    greatwick: { name: 'The Great Wick', sprite: 'wick', hp: 300, pts: 4000, silk: 6, dust: 75, cell: 0.38, halfW: 2.0, halfH: 2.2, softY: -1.6, standIn: true,
      soft: [{ x: 0, r: 0.7 }], softName: 'The fireball it carries', move: [3.4, 0.55, 14.6],
      phases: ['Drops fireballs that leave burning patches', 'Calls in Wicks carrying more fireballs'], phaseTag: ['Fireballs', 'Wicks incoming'],
      attacks: [[['coal', 1.8], ['fan', 2.6, 3]], [['coal', 2.2], ['fan', 2.2, 5], ['spawn', 3.2, 'wick']]], charts: ['bp_gilt', 'bp_feather'] },
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
      attacks: [[['spawn', 2.4, 'nibbler'], ['fan', 1.6, 6]], [['aimed', 1.0, 3], ['strike', 2.4], ['spawn', 4.5, 'firefly']], [['glare', 2.8], ['net', 4.4], ['fan', 1.8, 6], ['knot', 2.8]], [['aimed', 1.2, 3], ['ring', 2.4, 14], ['strike', 2.6], ['glare', 3.6], ['spawn', 3.6, 'weevil'], ['pull', 0]]], charts: ['bp_tapestry', 'bp_pins'] }
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
      W({ guardEvery: 6, lappetEvery: 2, wickEvery: 3, weevilEvery: 5, hawks: 6, loopers: 4, diveEvery: 1.5, fireEvery: 1.5 }), W({ guardEvery: 6, lappetEvery: 2, wickEvery: 3, flyEvery: 5, wormEvery: 5, hawks: 6, loopers: 5, diveEvery: 1.4, fireEvery: 1.5 }), W({ guardEvery: 6, lappetEvery: 2, wickEvery: 3, weevilEvery: 4, flyEvery: 5, hawks: 7, loopers: 5, diveEvery: 1.4, fireEvery: 1.4 }) ] },
    { name: 'Stage 6', keeper: 'beetle', patches: ['lining', 'mothballs'], sampler: 'heart', rows: [
      W({ guardEvery: 5, lappetEvery: 2, weevilEvery: 3, flyEvery: 5, wormEvery: 4, hawks: 7, loopers: 5, diveEvery: 1.4, fireEvery: 1.4 }), W({ guardEvery: 5, lappetEvery: 2, wickEvery: 3, weevilEvery: 3, flyEvery: 4, hawks: 7, loopers: 5, diveEvery: 1.3, fireEvery: 1.4 }), W({ guardEvery: 5, lappetEvery: 2, weevilEvery: 3, flyEvery: 4, wormEvery: 4, hawks: 8, loopers: 6, diveEvery: 1.3, fireEvery: 1.3 }) ] },
    { name: 'Stage 7', keeper: 'empress', patches: ['silkroad', 'loom'], sampler: 'star', rows: [
      W({ guardEvery: 4, lappetEvery: 2, wickEvery: 3, weevilEvery: 3, flyEvery: 4, wormEvery: 3, hawks: 8, loopers: 6, diveEvery: 1.3, fireEvery: 1.3 }), W({ guardEvery: 4, lappetEvery: 2, weevilEvery: 3, flyEvery: 3, wormEvery: 3, hawks: 8, loopers: 6, diveEvery: 1.2, fireEvery: 1.3 }), W({ guardEvery: 4, lappetEvery: 2, wickEvery: 3, weevilEvery: 2, flyEvery: 3, wormEvery: 3, hawks: 9, loopers: 7, diveEvery: 1.2, fireEvery: 1.2 }) ] },
    { name: 'Stage 8', keeper: 'king', patches: ['heart'], sampler: 'rosette', rows: [
      W({ guardEvery: 4, lappetEvery: 2, wickEvery: 3, weevilEvery: 2, flyEvery: 3, wormEvery: 3, hawks: 9, loopers: 7, diveEvery: 1.2, fireEvery: 1.2 }), W({ guardEvery: 4, lappetEvery: 2, wickEvery: 2, weevilEvery: 2, flyEvery: 3, wormEvery: 2, hawks: 10, loopers: 7, diveEvery: 1.1, fireEvery: 1.2 }), W({ guardEvery: 4, lappetEvery: 2, wickEvery: 2, weevilEvery: 2, flyEvery: 2, wormEvery: 2, hawks: 10, loopers: 8, diveEvery: 1.1, fireEvery: 1.1 }) ] }
  ];
  // ---- fabrics (performance workstream B2): every stage's cloth, its weave, its light, its frame and table. Drawn by bakeCloth in
  // src/render.js. Colours are sRGB. weave: plain, linen, twill, tartan, velvet, knit, felt, damask, royal. Each stays dark enough
  // that every moth and every enemy shot reads on it (docs/PERF.md, "Fabrics"). light: sky, ground (hemisphere), sun (lamp),
  // back (the light behind the cloth), glare (the star-holes). sheen: [colour, strength, sharpness] for velvet and silk.
  const FABRICS = [
    { name: 'Coverlet', weave: 'plain', dens: 6, warp: '#18203D', weft: '#18203D', patchA: '#1D2749', patchB: '#24305A', stitch: '#E6DFD0', mottle: '#8C9AC6', stars: 0.22, seed: 0,
      light: { sky: '#DFE6FF', ground: '#221A2E', sun: '#FFF0D8', back: '#6E5A8A', glare: '#FFF4D6' }, frame: '#3A2C20', lace: '#B9AE96', table: '#0F1428' },
    { name: 'Linen', weave: 'linen', dens: 6.5, warp: '#272923', weft: '#252620', patchA: '#34362D', patchB: '#23241F', stitch: '#C9B38C', mottle: '#A9C08A', stars: 0.2, seed: 11,
      light: { sky: '#D9E6DC', ground: '#1A1E18', sun: '#E9F0E2', back: '#4E6E58', glare: '#F2F8E4' }, frame: '#4B3A2B', lace: '#C9B38C', table: '#0E120E' },
    { name: 'Tartan', weave: 'tartan', dens: 7, warp: '#16261B', weft: '#131A33', alt: '#4A463C', alt2: '#0B0D12', patchA: '#1C2A1F', patchB: '#121729', stitch: '#E3A93C', mottle: '#7A6A4A', stars: 0.16, seed: 23,
      light: { sky: '#F2DCC8', ground: '#24160E', sun: '#FFD9A6', back: '#8A5A36', glare: '#FFE6BC' }, frame: '#3A2C20', lace: '#B5832F', table: '#130D09' },
    { name: 'Velvet', weave: 'velvet', dens: 6, warp: '#24122C', weft: '#341C3C', patchA: '#2C1734', patchB: '#1E0F24', stitch: '#CBD3E4', mottle: '#7A5A9A', stars: 0.24, seed: 37, sheen: ['#8A6AB4', 0.55, 2.2],
      light: { sky: '#DAD4FF', ground: '#1A1226', sun: '#E8E2FF', back: '#5E4A92', glare: '#F2EEFF' }, frame: '#2A1E18', lace: '#A3AEC6', table: '#0B0912' },
    { name: 'Knit', weave: 'knit', dens: 3.2, warp: '#262629', weft: '#4A4234', patchA: '#2E2D30', patchB: '#1C1C1F', stitch: '#E3A93C', mottle: '#C9B38C', stars: 0.2, seed: 41,
      light: { sky: '#EBE2D2', ground: '#1E1812', sun: '#FFE6C4', back: '#7A5A30', glare: '#FFF0D2' }, frame: '#4B3A2B', lace: '#C9B38C', table: '#110E0B' },
    { name: 'Felt', weave: 'felt', dens: 6, warp: '#1A2617', weft: '#24321E', patchA: '#202E1C', patchB: '#141C12', stitch: '#A9C08A', mottle: '#6E8B4E', stars: 0.18, seed: 53,
      light: { sky: '#DFE8D2', ground: '#141A10', sun: '#F4EED8', back: '#5E7A46', glare: '#F4F8E0' }, frame: '#3A2C20', lace: '#B9AE96', table: '#0D110B' },
    { name: 'Silk damask', weave: 'damask', dens: 12, warp: '#0E2127', weft: '#16333A', patchA: '#143036', patchB: '#0C1C21', stitch: '#CBD3E4', mottle: '#6FA3B0', stars: 0.2, seed: 61, sheen: ['#6FA8B8', 0.45, 3],
      light: { sky: '#D6ECF2', ground: '#0E1A1E', sun: '#EEF6FF', back: '#3F7A88', glare: '#E8FAFF' }, frame: '#262A33', lace: '#CBD3E4', table: '#091013' },
    { name: 'Royal weave', weave: 'royal', dens: 7.5, warp: '#1E1036', weft: '#2A1744', alt: '#7A5A24', patchA: '#25143F', patchB: '#170B29', stitch: '#E3A93C', mottle: '#9C7A3A', stars: 0.26, seed: 71, sheen: ['#E3A93C', 0.18, 4],
      light: { sky: '#E4DAFF', ground: '#1C1028', sun: '#FFE6BA', back: '#8A6A3A', glare: '#FFF4D6' }, frame: '#5A4322', lace: '#E3A93C', table: '#0D0914' }
  ];
  PANELS.forEach((p, i) => { p.fabric = FABRICS[i]; });
  // ---- /fabrics ----

  // ---- The Night's route: one patch per Panel; Panels II to IV offer two. Only Old Darn's text and Mark are the bible's. ----
  const PATCHES = {
    selvage:    { name: 'Selvage Edge',  art: 'selvage', desc: 'The edge of the cloth, where every run begins.', mark: '' },
    moththick:  { name: 'Moth-thick',    art: 'holes',   desc: 'Crowded with moths. Harder, and it pays better.', mark: 'More enemies per wave; coins are worth 50% more', foes: 'Big swarms. Chain and Spread do well here.', mods: { crowd: 1, dust: 1.5 } },
    olddarn:    { name: 'Old Darn',      art: 'darn',    desc: 'An old repair. The bonus wave here flies a different pattern.', mark: 'A perfect bonus wave pays double gems', mods: { samplerSilk: 2, sampler: 'rosette' } },
    thincloth:  { name: 'Thin Cloth',    art: 'holes',   desc: 'Worn thin. Fire-carrying Wicks gather here.', mark: 'More Wicks; blueprints drop twice as often', foes: 'Fire-carriers. Shoot them before they reach the bottom.', mods: { wicks: 3, charts: 2 } },
    boro:       { name: 'Boro Square',   art: 'boro',    desc: 'Patch on patch. A safer way through.', mark: 'Restores 1 shield after every wave', mods: { mend: 1 } },
    atlasreach: { name: 'Atlas Reach',   art: 'eyes',    desc: 'Guarded by Hawks. Harder, and the boss pays better.', mark: 'More Hawks; the boss pays 4 extra gems', foes: 'Fast straight divers. Keep moving.', mods: { hawks: 4, keeperSilk: 4 } },
    lantern:    { name: 'Lantern Field', art: 'lines',   desc: 'Lit by old lamplight.', mark: 'Power-ups drop twice as often', mods: { charms: 2 } },
    looseend:   { name: 'The Loose End', art: 'fringe',  desc: 'The far edge of the cloth, where the thread hangs free.', mark: '' },
    lining:     { name: 'The Lining',    art: 'lines',   desc: 'Behind the cloth. Quieter, with less to pick up.', mark: 'Fewer enemies per wave; coins are worth 25% less', mods: { thin: 1, dust: 0.75 } },
    mothballs:  { name: 'Mothball Row',  art: 'holes',   desc: 'Something has been keeping the moths out. It makes them angry.', mark: 'Enemies have 25% more health; gems from the boss are doubled', foes: 'Shield Bugs in every wave. Bring a Cross Stitch, a Knot Bomb or the Wire Laser.', mods: { hp: 1.25, keeperSilkMul: 2, guards: 3 } },
    silkroad:   { name: 'Silk Road',     art: 'darn',    desc: 'Spinners travel this way in numbers.', mark: 'Spinners always drop a gem', mods: { spinnerSilk: 1 } },
    loom:       { name: 'Loom Shadow',   art: 'boro',    desc: 'The great loom overhead drops what it finds.', mark: 'Power-ups drop twice as often; enemy shots are 20% faster', foes: 'Shield Bugs and fast shots.', mods: { charms: 2, shotSpeed: 1.2, guards: 4 } },
    heart:      { name: 'Heart of the Cloth', art: 'eyes', desc: 'The centre of the Coverlet, and the Moth King\'s court. The final stage.', mark: '' }
  };

  // ---- The Sampler: 40 moths trace a pattern and never fire. Stitch them all. ----
  const SAMPLER = { count: 40, pts: 100, perfectPts: 2400, perfectSilk: 3, gap: 0.3, speed: 0.105, order: ['nibbler', 'nibbler', 'casebearer', 'lappet'],
    // Rework: waves. 12 figures (sim.pathPoint), three kinds of round, and the moths change by stage (index = stage).
    // trace: stitch every moth as it flies the figure. gold: only the gold moths count; a plain one breaks the perfect. thread: no moths; catch the falling thread.
    figures: ['wave', 'eight', 'spiral', 'rosette', 'heart', 'star', 'ring', 'clover', 'trefoil', 'lissa', 'knot3', 'eightv'],
    figureName: { wave: 'the wave', eight: 'the figure eight', spiral: 'the spiral', rosette: 'the rosette', heart: 'the heart', star: 'the star', ring: 'the ring', clover: 'the clover', trefoil: 'the trefoil', lissa: 'the lissajous', knot3: 'the three-knot', eightv: 'the upright eight' },
    kinds: { trace: { hint: 'They never shoot back. Get them all.' }, gold: { hint: 'Shoot only the gold moths.' }, thread: { hint: 'Catch the falling thread. Do not shoot.' } },
    byStage: [ ['nibbler', 'nibbler', 'casebearer', 'lappet'], ['nibbler', 'casebearer', 'lappet', 'hawk'], ['wick', 'nibbler', 'casebearer', 'lappet'], ['hawk', 'nibbler', 'wick', 'casebearer'],
      ['firefly', 'nibbler', 'casebearer', 'wick'], ['lappet', 'firefly', 'hawk', 'casebearer'], ['firefly', 'wick', 'hawk', 'lappet'], ['spinner', 'firefly', 'hawk', 'wick', 'lappet'] ],
    thread: { count: 24, gap: 0.45, fall: 1.6, pts: 100 } };

  // ---- Rework: waves. A wave is built from parts, drawn from a shuffled deck per run (Sim.deck): a formation, an entry, twists, and on each
  // stage's third wave a preview of the boss. All authored; the sim only chooses and places. y runs 9.6 to 16.8 (the top of the cloth is 18.67). ----
  const FORM = (() => {
    const P = Math.PI, split = (n, k) => { const a = []; for (let i = 0; i < k; i++) a.push(Math.floor(n / k) + (i < n % k ? 1 : 0)); return a; };
    const ROWS_Y = [16.4, 15.2, 14.0, 12.8, 11.6];
    const layers = (n, flip) => {   // nested V (apex at the bottom) or chevron (apex at the top)
      const L = n <= 16 ? 2 : n <= 30 ? 3 : 4, cs = split(n, L), cmax = cs[0], sp = Math.min(0.95, Math.max(0.9, 11.4 / Math.max(1, cmax - 1))), out = [];
      cs.forEach((c, l) => { for (let i = 0; i < c; i++) { const x = (i - (c - 1) / 2) * sp, a = Math.abs(x) * 0.6; out.push({ x, y: flip ? 16.5 - l * 1.1 - a : 9.7 + l * 1.1 + a }); } });
      return out;
    };
    const rowsFrom = (ws, top, dy, spMax) => {   // centred rows of the given widths, top first
      const wmax = Math.max.apply(null, ws), sp = Math.min(spMax, 11.8 / Math.max(1, wmax - 1)), out = [];
      ws.forEach((w, r) => { for (let i = 0; i < w; i++) out.push({ x: (i - (w - 1) / 2) * sp, y: top - r * dy }); });
      return out;
    };
    return {
      grid: { name: 'Grid', gentle: true, build(n, sp) {
        const ws = sp && sp.spinners !== undefined ? [sp.spinners, sp.mids, sp.mids, sp.nibs, sp.nibs] : split(n, 5), out = [];
        ws.forEach((w, r) => { for (let i = 0; i < w; i++) out.push({ x: (i - (w - 1) / 2) * 1.2, y: ROWS_Y[r] }); });
        return out; } },
      v: { name: 'V', gentle: true, build: (n) => layers(n, false) },
      chevron: { name: 'Chevron', gentle: true, build: (n) => layers(n, true) },
      columns: { name: 'Two columns', gentle: true, build(n) {
        const half = Math.ceil(n / 2), w = Math.max(2, Math.min(4, Math.ceil(half / 7))), hw = (w - 1) * 0.6, c = 2.1 + hw, out = [];
        [-1, 1].forEach((sd, k) => { const m = k ? n - half : half, rs = Math.ceil(m / w), dy = Math.min(1.1, 6.8 / Math.max(1, rs - 1)); let left = m;
          for (let r = 0; r < rs; r++) { const cnt = Math.min(w, left); left -= cnt; for (let j = 0; j < cnt; j++) out.push({ x: sd * c + (j - (cnt - 1) / 2) * 1.2, y: 16.4 - r * dy }); } });
        return out; } },
      diamond: { name: 'Diamond', build(n) {
        const R = n > 44 ? 9 : 7, p = []; for (let r = 0; r < R; r++) p.push(Math.min(r + 1, R - r)); const sum = p.reduce((a, b) => a + b, 0);
        const ws = p.map(v => Math.max(1, Math.round(n * v / sum))); let d = n - ws.reduce((a, b) => a + b, 0), mid = (R - 1) >> 1; while (d !== 0) { ws[mid] += d > 0 ? 1 : -1; d += d > 0 ? -1 : 1; }
        return rowsFrom(ws, 16.5, Math.min(1.15, 6.8 / (R - 1)), 1.2); } },
      ring: { name: 'Ring', build(n) {
        const K = n <= 20 ? 1 : n <= 44 ? 2 : 3, sc = (K === 3 ? [1, 0.68, 0.38] : [1, 0.64]).slice(0, K), tot = sc.reduce((a, b) => a + b, 0), cs = sc.map(s => Math.round(n * s / tot)); cs[0] += n - cs.reduce((a, b) => a + b, 0);
        const out = []; cs.forEach((c, k) => {   // equal steps along the ring's length, not equal angles (an ellipse crowds its tips otherwise)
          const M = 240, cum = [0]; let px = 0, py = 3.5 * sc[k];
          for (let i = 1; i <= M; i++) { const a = i / M * 2 * P, x = 5.9 * sc[k] * Math.sin(a), y = 3.5 * sc[k] * Math.cos(a); cum.push(cum[i - 1] + Math.hypot(x - px, y - py)); px = x; py = y; }
          let i = 0; for (let j = 0; j < c; j++) { const L = (j + (k % 2) * 0.5) / c * cum[M]; while (i < M - 1 && cum[i + 1] < L) i++; const f = (L - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]), a = (i + f) / M * 2 * P;
            out.push({ x: 5.9 * sc[k] * Math.sin(a), y: 13.1 + 3.5 * sc[k] * Math.cos(a) }); } });
        return out; } },
      spiral: { name: 'Spiral', build(n) {
        const out = [], arm = [Math.ceil(n / 2), Math.floor(n / 2)];
        arm.forEach((m, k) => { let th = 0, lx = 0, ly = 0, first = true, cnt = 0;
          while (cnt < m) { const r = 1.1 + 0.57 * th, x = r * Math.cos(th + k * P), y = 0.6 * r * Math.sin(th + k * P);
            if (first || (x - lx) * (x - lx) + (y - ly) * (y - ly) >= 1.1 * 1.1) { out.push({ x, y: 13.1 + y }); lx = x; ly = y; first = false; cnt++; } th += 0.01; } });
        return out; } },
      stagger: { name: 'Stagger', gentle: true, build(n) {
        const out = []; let R = 1; while (true) { let c = 0; for (let r = 0; r < R; r++) c += r % 2 ? 6 : 7; if (c >= n) break; R++; }
        const dy = Math.min(1.0, 6.8 / Math.max(1, R - 1)); let left = n;
        for (let r = 0; r < R; r++) { const w = Math.min(left, r % 2 ? 6 : 7); left -= w; for (let i = 0; i < w; i++) out.push({ x: (i - (w - 1) / 2) * 2, y: 16.5 - r * dy }); }
        return out; } },
      wall: { name: 'Wall with a gap', build(n, sp, rnd) {
        const gx = (rnd() - 0.5) * 7, cells = []; for (let j = 0; j < 11; j++) { const x = (j - 5) * 1.2; if (Math.abs(x - gx) > 1.3) cells.push(x); }
        const rs = Math.ceil(n / cells.length), out = []; let left = n;
        for (let r = 0; r < rs; r++) { const cnt = Math.min(cells.length, left); left -= cnt; const use = cnt === cells.length ? cells : cells.slice().sort((a, b) => Math.abs(a) - Math.abs(b)).slice(0, cnt);
          for (const x of use) out.push({ x, y: 16.4 - r * 0.95 }); }
        return out; } },
      wings: { name: 'Split wings', build(n) {
        const out = []; [-1, 1].forEach((sd, k) => { const m = k ? Math.floor(n / 2) : Math.ceil(n / 2), cw = 6; let left = m;
          for (let r = 0; left > 0; r++) { const cnt = Math.min(cw, left); left -= cnt; for (let i = 0; i < cnt; i++) out.push({ x: sd * (1.6 + i * 0.95), y: 16.3 - r * 0.95 - i * 0.35 }); } });
        return out; } },
      arc: { name: 'Arc', build(n) {
        const K = n <= 24 ? 3 : n <= 44 ? 4 : 5, rad = []; for (let k = 0; k < K; k++) rad.push(6.4 - k * 1.05);
        const sumR = rad.reduce((a, b) => a + b, 0), al = Math.max(0.45, Math.min(1.45, n * 1.05 / (2 * sumR))), len = rad.map(r => r * 2 * al), tl = len.reduce((a, b) => a + b, 0);
        const cs = len.map(l => Math.round(n * l / tl)); cs[0] += n - cs.reduce((a, b) => a + b, 0); const out = [];
        cs.forEach((c, k) => { for (let j = 0; j < c; j++) { const a = c === 1 ? 0 : (j / (c - 1) - 0.5) * 2 * al; out.push({ x: rad[k] * Math.sin(a), y: 10.2 + rad[k] * Math.cos(a) }); } });
        return out; } },
      cloud: { name: 'Loose cloud', build(n, sp, rnd) {
        const cells = []; for (let r = 0; r < 7; r++) for (let j = 0; j < 10; j++) { const x = (j - 4.5 + (r % 2 ? 0.5 : 0)) * 1.25 + (rnd() - 0.5) * 0.3, y = 16.4 - r * 1.0 + (rnd() - 0.5) * 0.3;
          cells.push({ x, y, k: (x / 6.2) * (x / 6.2) + ((y - 13.1) / 3.6) * ((y - 13.1) / 3.6) + rnd() * 0.5 }); }
        cells.sort((a, b) => a.k - b.k); return cells.slice(0, n).map(c => ({ x: c.x, y: c.y })); } }
    };
  })();
  // entries: dur = seconds on the path; per = seconds between moths; row = extra seconds per row (grid-style staggering is kept for the swoop).
  const ENTRIES = {
    swoop:    { name: 'Swoop',          gentle: true, dur: 1.5, per: 0.07, row: 0.25 },
    loops:    { name: 'Loops',          dur: 1.9, per: 0.07, row: 0.2 },
    eight:    { name: 'Figure eight',   dur: 3.2, per: 0.07, row: 0 },
    drop:     { name: 'Top drop',       gentle: true, dur: 1.1, per: 0, row: 0, rand: 1.6 },
    spiral:   { name: 'Spiral',         dur: 3.0, per: 0.07, row: 0 },
    crossing: { name: 'Crossing streams', gentle: true, dur: 1.8, per: 0.06, row: 0.2 },
    pincer:   { name: 'Pincer',         dur: 1.7, per: 0.06, row: 0.15 },
    march:    { name: 'Slow march',     gentle: true, dur: 3.4, per: 0, row: 0.35 }
  };
  // twists: from = first stage (0 = stage 1) it may appear; not = twists it cannot share a wave with.
  const TWISTS = {
    elite:     { name: 'Elite moth',      from: 1, hint: 'A gold-marked moth is tougher. It drops a prize.' },
    convoy:    { name: 'Convoy',          from: 2, not: ['timer'], hint: 'A convoy crosses the cloth. Break it.' },
    shield:    { name: 'Shielded front',  from: 2, hint: 'The front row holds shields. Hit from an angle.' },
    reinforce: { name: 'Reinforcements',  from: 2, not: ['fast'], hint: 'More moths arrive halfway.' },
    timer:     { name: 'Burning thread',  from: 1, not: ['convoy'], hint: 'Clear it before the thread burns through.' },
    captive:   { name: 'Captive ship',    from: 1, hint: 'A captive ship hangs from a spinner. Free it.' },
    split:     { name: 'Splitting moth',  from: 1, hint: 'Marked moths split when they die.' },
    fast:      { name: 'Fast entry',      from: 1, not: ['reinforce'], hint: 'They come in fast.' },
    dim:       { name: 'Dim cloth',       from: 2, hint: 'The lights are low. Your own light shows the way.' },
    weave:     { name: 'Weaving shots',   from: 2, hint: 'Their shots weave from side to side.' }
  };
  // dive weights by stage: single is today's dive; the rest are new. cost = how many dive intervals the pattern uses up.
  const DIVES = {
    cost: { single: 1, group: 1.9, pair: 1.5, trio: 2.0, sweep: 2.0, kami: 2.2 },
    byStage: [ { single: 1, pair: 0.25 }, { single: 1, pair: 0.45, group: 0.25 }, { single: 1, pair: 0.45, group: 0.4, trio: 0.3 }, { single: 1, pair: 0.4, group: 0.5, trio: 0.4, sweep: 0.35 },
      { single: 1, pair: 0.4, group: 0.5, trio: 0.4, sweep: 0.4, kami: 0.3 }, { single: 1, pair: 0.4, group: 0.55, trio: 0.5, sweep: 0.45, kami: 0.4 },
      { single: 1, pair: 0.4, group: 0.6, trio: 0.5, sweep: 0.5, kami: 0.5 }, { single: 1, pair: 0.4, group: 0.6, trio: 0.6, sweep: 0.55, kami: 0.6 } ] };
  // boss previews: the third wave of each stage uses attacks its boss uses, through the same warned and drawn kinds. [kind, seconds between, option]
  const PREVIEWS = {
    fan:    { name: 'Spreads',       hint: 'The Great Lappet fires spreads like these.', list: [['fan', 4.2, 5]] },
    net:    { name: 'Nets',          hint: 'Mother Tinea sends nets like these. Find the gap.', list: [['net', 7.2]] },
    coal:   { name: 'Falling coals', hint: 'The Great Wick drops coals like these.', list: [['coal', 3.4]] },
    aimed:  { name: 'Aimed strikes', hint: 'The Atlas aims at you like this.', list: [['aimed', 3.2, 3], ['strike', 7.0]] },
    glare:  { name: 'Glare',         hint: 'The Unraveller floods columns with light like this.', list: [['glare', 6.5], ['knot', 5.0]] },
    strike: { name: 'Column strikes', hint: 'The Carpet Beetle strikes columns like this.', list: [['strike', 4.4]] },
    web:    { name: 'Web lines',     hint: 'The Silk Empress strings lines like this. Dash through them.', list: [['web', 7.5]] },
    ring:   { name: 'Rings',         hint: 'The Moth King fires rings like this.', list: [['ring', 5.5, 12], ['glare', 8.5]] }
  };
  const PREVIEW_OF = ['fan', 'net', 'coal', 'aimed', 'glare', 'strike', 'web', 'ring'];

  // ---- Difficulty: scales enemy health, speed and fire, and what a run pays. ----
  const MODES = {
    normal:    { name: 'Normal',    hp: 1,   speed: 1,    fire: 1,    pay: 1,   need: null },
    hard:      { name: 'Hard',      hp: 1.5, speed: 1.15, fire: 1.25, pay: 1.5, need: 'normal' },
    nightmare: { name: 'Nightmare', hp: 2.2, speed: 1.3,  fire: 1.6,  pay: 2.2, need: 'hard' }
  };

  /* ---- The Exchange (the hideout counter): coins to gems and back. Each gem bought raises the price by buyStep, each gem sold lowers
     the price by sellStep; both counts fall by recoverPerMin gems for every minute flown, and reset overnight (main.js hands the date to
     ST.exchangeDay). Selling never pays more than 40 and buying never costs less than 150, so a round trip always loses. ---- */
  const EXCH = { buyBase: 150, buyStep: 0.03, sellBase: 40, sellStep: 0.03, recoverPerMin: 1, maxTrade: 500 };

  /* ---- The Fray dial: after a first full clear of a mode, steps 1 to 20 make that mode harder and pay more. Per step: moths and bosses
     get tougher and quicker, and +10% coins and gems. Twists switch on at their `from` step and grow with every step after it. ---- */
  const FRAY = {
    max: 20, pay: 0.1, hp: 0.045, speed: 0.012, fire: 0.025,
    twists: [
      { id: 'elite',  from: 3,  name: 'Elites',          desc: 'An elite moth in every wave.' },
      { id: 'dive',   from: 4,  name: 'Quick dives',     desc: 'Dives start sooner.' },
      { id: 'charm',  from: 5,  name: 'Fewer power-ups', desc: 'Power-ups drop less often.' },
      { id: 'shield', from: 6,  name: 'Thin shields',    desc: 'Shield pickups give less. From step 14 they give nothing while you have two or more.' },
      { id: 'armour', from: 8,  name: 'Armoured bosses', desc: 'Bosses start with part of their fray meter armoured.' },
      { id: 'break',  from: 10, name: 'Short breaks',    desc: 'A broken boss mends sooner.' },
      { id: 'combo',  from: 12, name: 'Short combos',    desc: 'Your combo runs out sooner.' },
      { id: 'mend',   from: 16, name: 'No mending',      desc: 'Shield Repair and Fresh Start stop working.' },
      { id: 'spare',  from: 18, name: 'One life fewer',  desc: 'Start with one life less.' }
    ]
  };
  /* The mode as it is flown at a Fray step: a copy of the plain mode with the step's numbers folded in (so everything in the sim that
     reads mode.hp / speed / fire / pay gets them without further changes). `tw` holds the twist numbers; all zero at step 0. */
  function frayMode(id, step) {
    const m = MODES[id] || MODES.normal, s = Math.max(0, Math.min(FRAY.max, step | 0));
    if (!s) return m;
    const over = id2 => { const t = FRAY.twists.find(x => x.id === id2); return s >= t.from ? s - t.from + 1 : 0; };
    return Object.assign({}, m, { fray: s, hp: m.hp * (1 + FRAY.hp * s), speed: m.speed * (1 + FRAY.speed * s), fire: m.fire * (1 + FRAY.fire * s), pay: m.pay * (1 + FRAY.pay * s), frayPay: FRAY.pay * s,
      tw: { elite: over('elite') > 0, dive: Math.max(0.7, 1 - 0.02 * over('dive')), charm: Math.max(0.6, 1 - 0.03 * over('charm')), shield: s >= 14 ? 2 : s >= 6 ? 1 : 0,
        armour: over('armour') ? Math.min(0.5, 0.05 * (s - 7)) : 0, breakMul: over('break') ? Math.max(0.5, 1 - 0.05 * over('break')) : 1,
        combo: over('combo') ? Math.max(0.6, 1 - 0.04 * over('combo')) : 1, noMend: s >= 16, spare: s >= 18 ? 1 : 0 } });
  }
  /* One line for a step, for the picker: what changes and what it pays. */
  const frayLine = s => s ? 'Moths and bosses ' + Math.round(FRAY.hp * s * 100) + '% tougher, ' + Math.round(FRAY.speed * s * 100) + '% quicker. +' + Math.round(FRAY.pay * s * 100) + '% coins and gems.' : 'Off.';

  // ---- Spool Wall: threads (weapons), levels I to X. Bought with coins (the four newest with gems), kept for good. ----
  /* Cost of the next level, by the level you own (index 1 = level II). About 1.5 times the level before; VIII to X also take gems. */
  const WEIGHT_COST = [0, 400, 900, 1350, 2030, 3040, 4560, 6840, 10260, 15390];
  const WEIGHT_SILK = [0, 0, 0, 0, 0, 0, 0, 20, 35, 60];
  /* A fork is bought once (the first with coins, the second with gems) and then either option can be chosen in the hideout, free. */
  const FORK_COST = [{ dust: 1200, silk: 0 }, { dust: 0, silk: 30 }];
  /* Each weapon has one job (jobMetric: what the balance test measures it on). lv = levels I to X: rate is seconds between volleys
     (charge time for the laser), dmg is per shot in units of the ship's damage; the rest is the weapon's own. forks = the two choices
     at levels IV and VII; mastery = what level X adds; pair = the partner weapon on the bobbin, and what the pairing gives (active
     once the lead weapon is mastered). Only the first three levels of the eight older weapons are what they were. */
  const THREADS = {
    running:    { name: 'Single Stitch', price: 0,   color: PAL.linen,      job: 'Precision', jobMetric: 'soft', desc: 'One fast, precise shot. Hits weak spots 50% harder and frays bosses twice as fast.',
      lv: [{ rate: 0.28, n: 1, dmg: 1.001, pierce: 0 }, { rate: 0.22, n: 1, dmg: 1.073, pierce: 1 }, { rate: 0.20, n: 1, dmg: 1.3, pierce: 2 }, { rate: 0.19, n: 1, dmg: 1.339, pierce: 2 },
        { rate: 0.18, n: 1, dmg: 1.375, pierce: 3 }, { rate: 0.17, n: 1, dmg: 1.408, pierce: 3 }, { rate: 0.165, n: 1, dmg: 1.481, pierce: 3 }, { rate: 0.16, n: 1, dmg: 1.557, pierce: 4 },
        { rate: 0.155, n: 1, dmg: 1.636, pierce: 4 }, { rate: 0.15, n: 1, dmg: 1.716, pierce: 5 }],
      weights: ['One shot, straight ahead', 'Fires faster and pierces one enemy', 'Hits harder and pierces two', 'Hits harder', 'Pierces three', 'Hits harder', 'Fires faster',
        'Pierces four', 'Hits harder', 'Mastered: every fifth shot is a gold needle'],
      forks: [{ at: 4, opts: [{ id: 'point', name: 'Needlepoint', desc: 'Slower, heavier shots that hit weak spots twice as hard.' }, { id: 'tack', name: 'Tacking', desc: 'Quick, light shots that pierce everything.' }] },
        { at: 7, opts: [{ id: 'long', name: 'Long Shot', desc: 'Shots hit harder the farther they fly, up to a third more.' }, { id: 'split', name: 'Split End', desc: 'A shot that kills splits in two.' }] }],
      mastery: { name: 'Gold Needle', desc: 'Every fifth shot is a gold needle: it goes through everything, hits harder and frays three times as fast.' },
      pair: { with: 'couching', name: 'Plumb Line', desc: 'Single Stitch pierces everything; the Wire Laser charges a quarter faster.' } },
    backstitch: { name: 'Double Stitch',  price: 350, color: PAL.madder,     job: 'All-rounder', jobMetric: 'overall', desc: 'Shots side by side. Steady against everything.',
      lv: [{ rate: 0.34, n: 2, dmg: 0.801 }, { rate: 0.28, n: 2, dmg: 0.9 }, { rate: 0.28, n: 3, dmg: 0.8 }, { rate: 0.27, n: 3, dmg: 0.798, pierce: 1 }, { rate: 0.26, n: 3, dmg: 0.794, pierce: 1 },
        { rate: 0.25, n: 4, dmg: 0.592, pierce: 1 }, { rate: 0.245, n: 4, dmg: 0.6, pierce: 1 }, { rate: 0.24, n: 4, dmg: 0.608, pierce: 1 }, { rate: 0.235, n: 4, dmg: 0.616, pierce: 1 }, { rate: 0.23, n: 4, dmg: 0.623, pierce: 1 }],
      weights: ['Two shots side by side', 'Fires faster', 'Three shots side by side', 'Shots pierce one enemy', 'Hits harder', 'Four shots side by side', 'Hits harder',
        'Hits harder', 'Hits harder', 'Mastered: a lighter second row follows every volley'],
      forks: [{ at: 4, opts: [{ id: 'wide', name: 'Wide Rows', desc: 'The shots spread out to cover twice the width.' }, { id: 'tight', name: 'Close Rows', desc: 'The shots bunch together and hit 10% harder.' }] },
        { at: 7, opts: [{ id: 'slant', name: 'Slant', desc: 'The outer shots lean outward, toward the edges.' }, { id: 'lock', name: 'Lockstitch', desc: 'Shots that land together on one target hit harder.' }] }],
      mastery: { name: 'Second Row', desc: 'Every volley is followed by a lighter second row.' },
      pair: { with: 'daisy', name: 'Back to Back', desc: 'Double Stitch fires one more shot; the Lazy Daisy grows two more petals.' } },
    chain:      { name: 'Chain Stitch',   price: 500, color: PAL.madderPale, job: 'Swarms', jobMetric: 'clear', desc: 'A hit jumps on to nearby enemies. Every jump frays a boss a little.', chart: 'bp_chain',
      lv: [{ rate: 0.40, n: 1, dmg: 1.454, jumps: 1, jd: 0.6 }, { rate: 0.36, n: 1, dmg: 1.784, jumps: 2, jd: 0.7 }, { rate: 0.34, n: 1, dmg: 2.247, jumps: 3, jd: 0.8 },
        { rate: 0.33, n: 1, dmg: 2.383, jumps: 3, jd: 0.781 }, { rate: 0.32, n: 1, dmg: 2.524, jumps: 4, jd: 0.762 }, { rate: 0.31, n: 1, dmg: 2.672, jumps: 4, jd: 0.744 },
        { rate: 0.30, n: 1, dmg: 2.825, jumps: 5, jd: 0.726 }, { rate: 0.29, n: 1, dmg: 2.984, jumps: 5, jd: 0.709 }, { rate: 0.28, n: 1, dmg: 3.147, jumps: 5, jd: 0.692 }, { rate: 0.27, n: 1, dmg: 3.316, jumps: 6, jd: 0.675 }],
      weights: ['Hits jump to a second enemy', 'Hits jump to a third enemy', 'Hits jump to a fourth enemy', 'Hits harder', 'Hits jump to a fifth enemy', 'Hits harder',
        'Hits jump to a sixth enemy', 'Hits harder', 'Hits harder', 'Mastered: the jumps cut enemy bullets'],
      forks: [{ at: 4, opts: [{ id: 'long', name: 'Long Chain', desc: 'Jumps reach much farther, and one more time.' }, { id: 'heavy', name: 'Heavy Chain', desc: 'One jump fewer, but every jump hits at full strength.' }] },
        { at: 7, opts: [{ id: 'branch', name: 'Branching', desc: 'The first jump splits to two enemies.' }, { id: 'loop', name: 'Lazy Loop', desc: 'Jumps can come back to an enemy already hit.' }] }],
      mastery: { name: 'Live Chain', desc: 'Every jump cuts the enemy bullets along its path.' },
      pair: { with: 'feather', name: 'Flock', desc: 'Chain Stitch jumps once more; Feather Stitch fires one more shot.' } },
    herringbone:{ name: 'Spread Stitch',  price: 650, color: PAL.saffron,    job: 'Crowds, up close', jobMetric: 'clear', desc: 'A fan of shots, full damage up close and half at the far end. Point-blank hits fray bosses.', chart: 'bp_herringbone',
      lv: [{ rate: 0.50, n: 3, dmg: 1.269, arc: 20 }, { rate: 0.36, n: 3, dmg: 1.246, arc: 20 }, { rate: 0.34, n: 5, dmg: 1.367, arc: 30 }, { rate: 0.33, n: 5, dmg: 1.464, arc: 32 },
        { rate: 0.32, n: 6, dmg: 1.392, arc: 34 }, { rate: 0.31, n: 6, dmg: 1.484, arc: 36 }, { rate: 0.30, n: 7, dmg: 1.43, arc: 38 }, { rate: 0.29, n: 7, dmg: 1.518, arc: 40 },
        { rate: 0.28, n: 7, dmg: 1.565, arc: 40 }, { rate: 0.27, n: 7, dmg: 1.654, arc: 42 }],
      weights: ['Three shots in a fan', 'Fires faster', 'Five shots in a wider fan', 'Hits harder', 'Six shots', 'Hits harder', 'Seven shots', 'Hits harder', 'Hits harder',
        'Mastered: two outer shots bounce off the walls'],
      forks: [{ at: 4, opts: [{ id: 'fan', name: 'Fan', desc: 'A wider cone with two more shots.' }, { id: 'arrow', name: 'Arrowhead', desc: 'The shots meet at one point ahead and lose less with distance.' }] },
        { at: 7, opts: [{ id: 'shrap', name: 'Shrapnel', desc: 'A shot that kills bursts into three small ones.' }, { id: 'blank', name: 'Point Blank', desc: 'Hits close in do 60% more and fray bosses twice as fast.' }] }],
      mastery: { name: 'Herringbone', desc: 'Two outer shots bounce off the walls of the cloth.' },
      pair: { with: 'knot', name: 'Close Quarters', desc: 'Spread Stitch shots cut the enemy bullets they touch; Knot Bomb blasts are a third wider.' } },
    knot:       { name: 'Knot Bomb',      price: 700, color: PAL.knot,       job: 'Area and bullets', jobMetric: 'clear', desc: 'A slow knot that grows as it flies. The blast hits everything near and unravels bullets.', chart: 'bp_knot',
      lv: [{ rate: 0.8, n: 1, dmg: 1.948, burst: 1.6 }, { rate: 0.8, n: 1, dmg: 2.656, burst: 2.6 }, { rate: 0.55, n: 1, dmg: 2.435, burst: 2.6 }, { rate: 0.54, n: 1, dmg: 2.495, burst: 2.6 },
        { rate: 0.52, n: 1, dmg: 2.508, burst: 2.65 }, { rate: 0.50, n: 1, dmg: 2.517, burst: 2.7 }, { rate: 0.48, n: 1, dmg: 2.522, burst: 2.75 }, { rate: 0.46, n: 1, dmg: 2.523, burst: 2.8 },
        { rate: 0.44, n: 1, dmg: 2.519, burst: 2.85 }, { rate: 0.42, n: 1, dmg: 2.51, burst: 2.9 }],
      weights: ['A slow knot with a small blast', 'A much bigger blast', 'Fires faster', 'Hits harder', 'Bigger blast', 'Hits harder', 'Fires faster', 'Bigger blast', 'Hits harder',
        'Mastered: every blast throws four small knots'],
      forks: [{ at: 4, opts: [{ id: 'slip', name: 'Slip Knot', desc: 'Knots fly slower and grow twice as big.' }, { id: 'twin', name: 'Twin Knots', desc: 'Two smaller knots side by side.' }] },
        { at: 7, opts: [{ id: 'double', name: 'Double Knot', desc: 'Each blast bursts again a moment later at half strength.' }, { id: 'french', name: 'French Knot', desc: 'Knots drift toward the nearest enemy.' }] }],
      mastery: { name: 'Granny Knot', desc: 'Every blast throws four small knots outward that burst too.' },
      pair: { with: 'herringbone', name: 'Close Quarters', desc: 'Knot Bomb blasts are a third wider; Spread Stitch shots cut the enemy bullets they touch.' } },
    cross:      { name: 'Cross Stitch',   price: 800, color: PAL.blue,      job: 'Angles and edges', jobMetric: 'cover', desc: 'Diagonal shots that bounce off the walls. Bounced shots hit harder and find side weak spots.', chart: 'bp_cross',
      lv: [{ rate: 0.36, n: 2, dmg: 0.892, bounce: 1 }, { rate: 0.34, n: 2, dmg: 1.149, bounce: 2 }, { rate: 0.30, n: 2, dmg: 1.105, bounce: 3, mid: 0.493 }, { rate: 0.29, n: 2, dmg: 1.108, bounce: 3, mid: 0.573 },
        { rate: 0.28, n: 2, dmg: 1.106, bounce: 3, mid: 0.662 }, { rate: 0.27, n: 2, dmg: 1.1, bounce: 3, mid: 0.76 }, { rate: 0.26, n: 2, dmg: 1.086, bounce: 4, mid: 0.87 },
        { rate: 0.25, n: 2, dmg: 1.067, bounce: 4, mid: 0.988 }, { rate: 0.24, n: 2, dmg: 1.042, bounce: 4, mid: 1.115 }, { rate: 0.23, n: 2, dmg: 1.011, bounce: 4, mid: 1.252 }],
      weights: ['Two diagonal shots that bounce once', 'Shots bounce twice', 'Three bounces, and a third shot straight ahead', 'Hits harder', 'Hits harder', 'Hits harder',
        'Four bounces', 'Hits harder', 'Hits harder', 'Mastered: the first bounce sends a second shot back'],
      forks: [{ at: 4, opts: [{ id: 'wide', name: 'Wide Cross', desc: 'Flatter angles: more bounces, sooner.' }, { id: 'steep', name: 'Long Cross', desc: 'The shots start wide and cross far up the cloth.' }] },
        { at: 7, opts: [{ id: 'rico', name: 'Ricochet', desc: 'Every bounce adds more damage.' }, { id: 'through', name: 'Through Stitch', desc: 'Bounced shots pierce two enemies.' }] }],
      mastery: { name: 'Mirror Cross', desc: 'The first bounce sends a second shot back the other way.' },
      pair: { with: 'blanket', name: 'Selvedge', desc: 'Cross Stitch bounces once more; Blanket Stitch throws one more loop.' } },
    couching:   { name: 'Wire Laser',     price: 900, color: PAL.steel,      job: 'Armour breaker', jobMetric: 'armour', desc: 'Charges, then fires a beam up its whole column. Goes through armour and boss shields. You fly slower while it charges.', chart: 'bp_couching',
      lv: [{ rate: 0.9, n: 1, dmg: 4.824, half: 0.5 }, { rate: 0.6, n: 1, dmg: 4.999, half: 0.5 }, { rate: 0.55, n: 1, dmg: 6.315, half: 1.0 }, { rate: 0.54, n: 1, dmg: 6.666, half: 1.0 },
        { rate: 0.52, n: 1, dmg: 6.956, half: 1.05 }, { rate: 0.50, n: 1, dmg: 7.255, half: 1.1 }, { rate: 0.48, n: 1, dmg: 7.563, half: 1.1 }, { rate: 0.46, n: 1, dmg: 7.879, half: 1.15 },
        { rate: 0.44, n: 1, dmg: 8.203, half: 1.2 }, { rate: 0.42, n: 1, dmg: 8.535, half: 1.25 }],
      weights: ['A beam through the whole column', 'Charges faster', 'Hits harder and twice as wide', 'Hits harder', 'Hits harder', 'Hits harder and wider', 'Charges faster',
        'Hits harder', 'Hits harder', 'Mastered: the beam arcs to two enemies beside it'],
      forks: [{ at: 4, opts: [{ id: 'wide', name: 'Wide Beam', desc: 'A beam two thirds wider that hits a little softer.' }, { id: 'needle', name: 'Needle Beam', desc: 'A thin beam that hits much harder.' }] },
        { at: 7, opts: [{ id: 'glow', name: 'Afterglow', desc: 'The beam lingers and keeps burning for a moment.' }, { id: 'twin', name: 'Twin Wire', desc: 'Two beams, one each side of the ship.' }] }],
      mastery: { name: 'Live Wire', desc: 'Every beam arcs out to the two nearest enemies beside it.' },
      pair: { with: 'running', name: 'Plumb Line', desc: 'The Wire Laser charges a quarter faster; Single Stitch pierces everything.' } },
    satin:      { name: 'Satin Stitch',   price: 1000, color: PAL.green,     job: 'Melts one target', jobMetric: 'mid', desc: 'A rapid weaving stream. Damage builds up while it stays on target, and holds when you move to one nearby.', chart: 'bp_satin',
      lv: [{ rate: 0.11, n: 1, dmg: 0.278 }, { rate: 0.11, n: 2, dmg: 0.19 }, { rate: 0.09, n: 2, dmg: 0.207 }, { rate: 0.088, n: 2, dmg: 0.22 }, { rate: 0.086, n: 2, dmg: 0.234 },
        { rate: 0.084, n: 2, dmg: 0.249 }, { rate: 0.082, n: 2, dmg: 0.265 }, { rate: 0.08, n: 2, dmg: 0.281 }, { rate: 0.078, n: 2, dmg: 0.299 }, { rate: 0.076, n: 2, dmg: 0.317 }],
      weights: ['A rapid weaving stream of light shots', 'Two streams side by side', 'Fires faster', 'Hits harder', 'Hits harder', 'Hits harder', 'Hits harder', 'Hits harder',
        'Hits harder', 'Mastered: at full strength the stream turns gold and frays bosses'],
      forks: [{ at: 4, opts: [{ id: 'deep', name: 'Padded Satin', desc: 'Builds more slowly, to a much greater strength.' }, { id: 'wide', name: 'Wide Satin', desc: 'Three streams that weave wider and pierce, for crowds.' }] },
        { at: 7, opts: [{ id: 'gloss', name: 'Gloss', desc: 'At full strength the shots pierce.' }, { id: 'steady', name: 'Steady Hand', desc: 'Strength fades slowly instead of dropping when you miss.' }] }],
      mastery: { name: 'Sheen', desc: 'At full strength the stream turns gold and frays bosses.' },
      pair: { with: 'pins', name: 'Pinned Down', desc: 'Satin Stitch builds twice as fast; Tacking Pins keep two more pins in the cloth.' } },
    daisy:      { name: 'Lazy Daisy',     price: 0, silk: 60, color: PAL.rose, job: 'Defence', jobMetric: 'defence', desc: 'Petals of thread circle your ship, block bullets and cut what comes close. The top petal throws a stitch ahead.', chart: 'bp_daisy',
      lv: [{ rate: 0.55, n: 4, dmg: 2.918, r: 1.15, grow: 1.4, cut: 1.301 }, { rate: 0.5, n: 5, dmg: 3.618, r: 1.2, grow: 1.3, cut: 1.613 }, { rate: 0.46, n: 5, dmg: 4.438, r: 1.2, grow: 1.2, cut: 2.078 },
        { rate: 0.44, n: 6, dmg: 4.622, r: 1.25, grow: 1.15, cut: 2.112 }, { rate: 0.42, n: 6, dmg: 4.805, r: 1.25, grow: 1.1, cut: 2.393 }, { rate: 0.40, n: 6, dmg: 4.983, r: 1.3, grow: 1.0, cut: 2.37 },
        { rate: 0.38, n: 7, dmg: 5.155, r: 1.3, grow: 0.95, cut: 2.698 }, { rate: 0.36, n: 7, dmg: 5.318, r: 1.35, grow: 0.9, cut: 2.668 }, { rate: 0.35, n: 7, dmg: 5.63, r: 1.35, grow: 0.85, cut: 3.013 },
        { rate: 0.34, n: 8, dmg: 5.956, r: 1.4, grow: 0.8, cut: 3.065 }],
      weights: ['Four petals', 'Five petals', 'Petals hit harder', 'Six petals', 'Petals regrow faster', 'Petals hit harder', 'Seven petals', 'Throws stitches faster', 'Petals hit harder',
        'Mastered: a second ring of petals turns the other way'],
      forks: [{ at: 4, opts: [{ id: 'bloom', name: 'Full Bloom', desc: 'Two more petals in a wider ring.' }, { id: 'bud', name: 'Tight Bud', desc: 'A close ring that spins twice as fast and cuts twice as hard.' }] },
        { at: 7, opts: [{ id: 'seed', name: 'Seed Head', desc: 'A petal that hits bursts into three seeds.' }, { id: 'ever', name: 'Evergreen', desc: 'Petals regrow twice as fast.' }] }],
      mastery: { name: 'Daisy Chain', desc: 'A second ring of petals turns the other way, blocking bullets.' },
      pair: { with: 'backstitch', name: 'Back to Back', desc: 'The Lazy Daisy grows two more petals; Double Stitch fires one more shot.' } },
    feather:    { name: 'Feather Stitch', price: 0, silk: 80, color: PAL.teal, job: 'Hits what you cannot line up', jobMetric: 'cover', desc: 'Light shots that wander toward the nearest enemy. Weaker per shot.', chart: 'bp_feather',
      lv: [{ rate: 0.24, n: 1, dmg: 0.866 }, { rate: 0.21, n: 1, dmg: 1.033 }, { rate: 0.19, n: 1, dmg: 1.246 }, { rate: 0.18, n: 1, dmg: 1.232 }, { rate: 0.17, n: 1, dmg: 1.214 },
        { rate: 0.16, n: 1, dmg: 1.193 }, { rate: 0.15, n: 1, dmg: 1.168 }, { rate: 0.145, n: 1, dmg: 1.178 }, { rate: 0.14, n: 1, dmg: 1.187 }, { rate: 0.135, n: 1, dmg: 1.195 }],
      weights: ['A wandering shot, left and right in turn', 'Fires faster', 'Hits harder', 'Fires faster', 'Hits harder', 'Fires faster', 'Fires faster', 'Hits harder', 'Hits harder',
        'Mastered: every sixth shot is a great feather that goes through everything'],
      forks: [{ at: 4, opts: [{ id: 'quill', name: 'Quill', desc: 'Slower, heavier shots that turn hard.' }, { id: 'down', name: 'Down', desc: 'Two light shots at a time that wander wide.' }] },
        { at: 7, opts: [{ id: 'preen', name: 'Preen', desc: 'Shots that miss turn round and search again.' }, { id: 'plume', name: 'Plume', desc: 'A hit splits into two small feathers.' }] }],
      mastery: { name: 'Great Feather', desc: 'Every sixth shot is a great feather that goes through everything.' },
      pair: { with: 'chain', name: 'Flock', desc: 'Feather Stitch fires one more shot; Chain Stitch jumps once more.' } },
    blanket:    { name: 'Blanket Stitch', price: 0, silk: 100, color: PAL.rust, job: 'Loops and lines', jobMetric: 'clear', desc: 'A shot that loops out and back, going through everything and hitting each enemy twice.', chart: 'bp_blanket',
      lv: [{ rate: 0.62, n: 1, dmg: 1.961, w: 0.825, life: 1.15 }, { rate: 0.56, n: 1, dmg: 2.416, w: 0.87, life: 1.15 }, { rate: 0.5, n: 1, dmg: 2.876, w: 0.9, life: 1.1 },
        { rate: 0.48, n: 1, dmg: 2.881, w: 0.93, life: 1.1 }, { rate: 0.46, n: 1, dmg: 2.882, w: 0.96, life: 1.1 }, { rate: 0.44, n: 1, dmg: 2.878, w: 0.99, life: 1.05 },
        { rate: 0.42, n: 1, dmg: 2.868, w: 1.05, life: 1.05 }, { rate: 0.4, n: 1, dmg: 2.85, w: 1.08, life: 1.0 }, { rate: 0.39, n: 1, dmg: 2.901, w: 1.125, life: 1.0 }, { rate: 0.38, n: 1, dmg: 2.95, w: 1.2, life: 1.0 }],
      weights: ['A loop out and back, left and right in turn', 'A wider loop', 'Hits harder', 'Hits harder', 'Hits harder', 'Loops faster', 'Hits harder', 'Loops faster', 'Hits harder',
        'Mastered: each loop throws three stitches from its top'],
      forks: [{ at: 4, opts: [{ id: 'wide', name: 'Wide Loop', desc: 'Loops sweep half again as wide.' }, { id: 'tight', name: 'Tight Loop', desc: 'Narrow, quick loops that hit harder.' }] },
        { at: 7, opts: [{ id: 'double', name: 'Double Loop', desc: 'Each loop goes round twice, hitting three times.' }, { id: 'pair', name: 'Paired Loops', desc: 'Loops go out both sides at once.' }] }],
      mastery: { name: 'Buttonhole', desc: 'At the top of every loop it throws three stitches outward.' },
      pair: { with: 'cross', name: 'Selvedge', desc: 'Blanket Stitch throws one more loop; Cross Stitch bounces once more.' } },
    pins:       { name: 'Tacking Pins',   price: 0, silk: 120, color: PAL.violet, job: 'Control', jobMetric: 'clear', desc: 'Pins that stick in the cloth and fire up at whatever passes over them.', chart: 'bp_pins',
      lv: [{ rate: 0.62, n: 1, dmg: 4.965, pd: 5.077, every: 0.425, life: 3.5, max: 4 }, { rate: 0.58, n: 1, dmg: 6.333, pd: 6.828, every: 0.4, life: 3.6, max: 4 },
        { rate: 0.54, n: 1, dmg: 7.862, pd: 8.24, every: 0.375, life: 3.8, max: 5 }, { rate: 0.52, n: 1, dmg: 7.902, pd: 4.015, every: 0.362, life: 3.9, max: 5 },
        { rate: 0.5, n: 2, dmg: 3.966, pd: 2.048, every: 0.35, life: 4.0, max: 5 }, { rate: 0.48, n: 2, dmg: 3.974, pd: 2.084, every: 0.338, life: 4.1, max: 5 },
        { rate: 0.46, n: 2, dmg: 3.975, pd: 2.111, every: 0.325, life: 4.2, max: 6 }, { rate: 0.44, n: 2, dmg: 3.969, pd: 2.134, every: 0.312, life: 4.3, max: 6 },
        { rate: 0.42, n: 2, dmg: 3.954, pd: 2.149, every: 0.3, life: 4.4, max: 6 }, { rate: 0.4, n: 2, dmg: 3.931, pd: 2.159, every: 0.288, life: 4.5, max: 6 }],
      weights: ['Four pins at a time', 'Pins fire faster', 'Pins hit harder', 'Five pins at a time', 'Two pins at a throw', 'Pins last longer', 'Six pins at a time', 'Pins hit harder',
        'Pins fire faster', 'Mastered: a pin fires a ring of stitches as it comes loose'],
      forks: [{ at: 4, opts: [{ id: 'map', name: 'Map Pins', desc: 'Pins land wider apart and farther up the cloth.' }, { id: 'push', name: 'Push Pins', desc: 'Pins fire faster but come loose sooner.' }] },
        { at: 7, opts: [{ id: 'cushion', name: 'Pincushion', desc: 'Each pin fires three ways at once.' }, { id: 'hat', name: 'Hatpin', desc: 'Pin shots go through two enemies.' }] }],
      mastery: { name: 'Pinwheel', desc: 'A pin that comes loose spins and fires a ring of eight stitches.' },
      pair: { with: 'satin', name: 'Pinned Down', desc: 'Tacking Pins keep two more pins in the cloth; Satin Stitch builds twice as fast.' } }
  };
  for (const id in THREADS) THREADS[id].rate = THREADS[id].lv.map(l => l.rate);

  // ---- Needle Case: needles (ships). Bought with Silk, owned for good. Pips: Ply, Pace, Eye, Point. ----
  const NEEDLES = {
    sharps:   { name: 'Sharps',   price: 0,   ply: 2, pace: 3, eye: 2, point: 2, trait: 'All-rounder',   traitDesc: 'Smaller hitbox and longer invincibility after a hit.',
      special: 'Tie Off', specialDesc: 'A ring that unravels every nearby bullet into coins.' },
    between:  { name: 'Between',  price: 60,  ply: 1, pace: 5, eye: 2, point: 2, trait: 'Dodger',        traitDesc: 'Fast and fragile. Two dash charges, and dashing through bullets charges your special.',
      special: 'Basting Line', specialDesc: 'Streaks across the cloth and leaves a thread that damages whatever crosses it for three seconds.' },
    darner:   { name: 'Darner',   price: 90,  ply: 2, pace: 2, eye: 3, point: 2, trait: 'Wall',          traitDesc: 'Your lead weapon fires two extra side shots.', chart: 'bp_darner',
      special: 'Darn', specialDesc: 'Weaves a patch over the cloth ahead. Enemies and bullets inside it move at half speed.' },
    chenille: { name: 'Chenille', price: 120,  ply: 3, pace: 2, eye: 4, point: 1, trait: 'Whip',          traitDesc: 'A long, thick tether. The thread to your bobbin cuts every enemy it touches.', chart: 'bp_chenille',
      special: 'Lasso', specialDesc: 'The bobbin swings a full circle around the ship, cutting enemies and bullets.' },
    sail:     { name: 'Sail',     price: 150, ply: 4, pace: 1, eye: 1, point: 3, trait: 'Tank',          traitDesc: 'Slow and tough. A canvas patch blocks one bullet, then re-stitches after five seconds. Blocks one capture beam every wave.', chart: 'bp_sail',
      special: 'Full Sail', specialDesc: 'Charges up the cloth as an invulnerable ram, then drifts back.' },
    beading:  { name: 'Beading',  price: 200, ply: 1, pace: 4, eye: 1, point: 4, trait: 'Glass cannon',  traitDesc: 'Fragile and hard-hitting. Every shot pierces, and every tenth is a heavy bead that goes through everything.', chart: 'bp_beading',
      special: 'String of Beads', specialDesc: 'Locks on to up to eight enemies and sends a homing bead at each.' },
    quilter:  { name: 'Quilter',  price: 180, ply: 3, pace: 2, eye: 2, point: 2, trait: 'Survivor',      traitDesc: 'Starts every wave with a one-hit pad. Eight near-misses re-stuff it.', chart: 'bp_quilter',
      special: 'Quilt', specialDesc: 'Turns nearby bullets into one point of shield.' },
    embroidery: { name: 'Embroidery', price: 220, ply: 2, pace: 3, eye: 2, point: 1, trait: 'Marksman',  traitDesc: 'Lead shots curve toward enemies, and the bobbin flies free to hover under the nearest one.', chart: 'bp_embroidery',
      special: 'Signature', specialDesc: 'For five seconds every shot homes in and hits 50% harder.' },
    tapestry: { name: 'Tapestry', price: 260, ply: 2, pace: 3, eye: 3, point: 2, trait: 'Weaver',        traitDesc: 'Two bobbins, one each side of the ship.', chart: 'bp_tapestry',
      special: 'Loom', specialDesc: 'Stretches a thread across the cloth and sweeps it upward through everything.' }
  };

  // ---- Gimp's Bench: tempers. Dust. Permanent on every needle (owner direction; the bible had them per-Night). ----
  /* Uncapped. Prices: the first five are today's; after that each level costs 1.22 times the one before (VI 2,440, X 5,410, XV 14,610,
     XX 39,480, XXX about 288,000). Every temper uses the same ladder. */
  const TEMPER_COST = [120, 300, 650, 1200, 2000];   // levels I to V (the legacy ladder; temperCost() below is what the shop reads)
  const temperCost = lv => lv < 5 ? TEMPER_COST[lv] : Math.round(2000 * Math.pow(1.22, lv - 4));   // price of level lv+1 when you own lv
  /* What each level adds. `curve` is [levels in this stretch, gain per level] stretches in order; the last stretch goes on for ever.
     Levels I to V (III for the first one) keep their old gains, so an old save flies exactly as before; later levels taper.
     `cap` is a ceiling on the total gain (shield and the others that must stay playable). `marks`: every fifth level from X adds a
     small named bonus, `{ key: amount }` added up in ST.derive (soft: boss weak spots, dmg: all damage, sp: special meter from kills,
     invuln: time safe after a hit, dash: dash recovery, magnet: pickup radius, chart: blueprint drops, charm: power-up drops). */
  const TEMPERS = {
    point: { name: 'Damage', desc: 'Each level: shots hit harder. Level IV breaks Casebearer armour in one hit. The gain shrinks after level V', chartAt: 4,
      curve: [[5, 0.15], [5, 0.08], [10, 0.04], [Infinity, 0.02]],
      marks: { 10: { name: 'Weak spots', desc: 'Boss weak spots take 10% more', soft: 0.1 }, 15: { name: 'Weak spots II', desc: 'Boss weak spots take another 10% more', soft: 0.1 },
        20: { name: 'Weak spots III', desc: 'Boss weak spots take another 10% more', soft: 0.1 }, 25: { name: 'Weak spots IV', desc: 'Boss weak spots take another 10% more', soft: 0.1 }, 30: { name: 'Weak spots V', desc: 'Boss weak spots take another 10% more', soft: 0.1 } } },
    eye:   { name: 'Fire rate', desc: 'Each level: fire faster. The gain shrinks after level V', chartAt: 4,
      curve: [[5, 0.07], [5, 0.0373], [10, 0.0187], [Infinity, 0.0093]],
      marks: { 10: { name: 'Quick spool', desc: 'Kills fill the special meter 10% faster', sp: 0.1 }, 15: { name: 'Quick spool II', desc: 'Kills fill the special meter another 10% faster', sp: 0.1 },
        20: { name: 'Quick spool III', desc: 'Kills fill the special meter another 10% faster', sp: 0.1 }, 25: { name: 'Quick spool IV', desc: 'Kills fill the special meter another 10% faster', sp: 0.1 }, 30: { name: 'Quick spool V', desc: 'Kills fill the special meter another 10% faster', sp: 0.1 } } },
    ply:   { name: 'Shield', desc: 'Levels I to III: one more hit each. After that, one more hit every fourth level, up to level XV',
      curve: [[3, 1], [Infinity, 0.25]], cap: 6,
      marks: { 10: { name: 'Padding', desc: 'Stay safe 10% longer after a hit', invuln: 0.1 }, 15: { name: 'Padding II', desc: 'Stay safe another 10% longer after a hit', invuln: 0.1 },
        20: { name: 'Padding III', desc: 'Stay safe another 10% longer after a hit', invuln: 0.1 }, 25: { name: 'Padding IV', desc: 'Stay safe another 10% longer after a hit', invuln: 0.1 }, 30: { name: 'Padding V', desc: 'Stay safe another 10% longer after a hit', invuln: 0.1 } } },
    pace:  { name: 'Speed', desc: 'Levels I to III: move faster. After that each level adds less, and the ceiling is close',
      curve: [[3, 1.5], [Infinity, 0.5]], decay: 0.85,
      marks: { 10: { name: 'Light foot', desc: 'Dashes come back 8% sooner', dash: 0.08 }, 15: { name: 'Light foot II', desc: 'Dashes come back 8% sooner again', dash: 0.08 },
        20: { name: 'Light foot III', desc: 'Dashes come back 8% sooner again', dash: 0.08 }, 25: { name: 'Light foot IV', desc: 'Dashes come back 8% sooner again', dash: 0.08 }, 30: { name: 'Light foot V', desc: 'Dashes come back 8% sooner again', dash: 0.08 } } },
    magnet: { name: 'Magnet', desc: 'Levels I to III: pull in coins and pickups from 35% farther away. After that each level adds less',
      curve: [[3, 0.35], [3, 0.15], [4, 0.06], [Infinity, 0.02]], cap: 1.8,
      marks: { 10: { name: 'Wide net', desc: 'Pickups are pulled from 10% farther', magnet: 0.1 }, 15: { name: 'Wide net II', desc: 'Pickups are pulled from another 10% farther', magnet: 0.1 },
        20: { name: 'Wide net III', desc: 'Pickups are pulled from another 10% farther', magnet: 0.1 }, 25: { name: 'Wide net IV', desc: 'Pickups are pulled from another 10% farther', magnet: 0.1 }, 30: { name: 'Wide net V', desc: 'Pickups are pulled from another 10% farther', magnet: 0.1 } } },
    luck:  { name: 'Luck', desc: 'Levels I to III: power-ups and blueprints drop 20% more often. After that each level adds less',
      curve: [[3, 0.2], [5, 0.08], [7, 0.03], [Infinity, 0.01]], cap: 1.4,
      marks: { 10: { name: 'Keen eye', desc: 'Blueprints drop 10% more often', chart: 0.1 }, 15: { name: 'Bright charms', desc: 'Power-ups drop 10% more often', charm: 0.1 },
        20: { name: 'Keen eye II', desc: 'Blueprints drop another 10% more often', chart: 0.1 }, 25: { name: 'Bright charms II', desc: 'Power-ups drop another 10% more often', charm: 0.1 }, 30: { name: 'Keen eye III', desc: 'Blueprints drop another 10% more often', chart: 0.1 } } }
  };
  /* Total gain of a temper at level lv (a number of levels, so 1 level of Damage is 0.15). */
  function temperGain(id, lv) {
    const t = TEMPERS[id]; let left = Math.max(0, lv), sum = 0, k = 0;
    for (const [n, g] of t.curve) {
      const take = Math.min(left, n);
      if (t.decay && n === Infinity) sum += g * (1 - Math.pow(t.decay, take)) / (1 - t.decay);   // speed: each level beyond III is 15% smaller than the one before
      else sum += take * g;
      left -= take; k++; if (left <= 0) break;
    }
    return t.cap !== undefined ? Math.min(sum, t.cap) : sum;
  }
  /* The named bonuses a temper at level lv has earned, added up: { soft: .2, dmg: .05, ... }. */
  function temperMarks(id, lv) {
    const out = {}, m = TEMPERS[id].marks;
    for (const at in m) if (lv >= +at) for (const k in m[at]) if (k !== 'name' && k !== 'desc') out[k] = (out[k] || 0) + m[at][k];
    return out;
  }
  /* The next level at which a temper adds a named bonus, after lv (or 0 when it has no more). */
  const temperNextMark = (id, lv) => { const m = TEMPERS[id].marks; for (const at of Object.keys(m).map(Number).sort((a, b) => a - b)) if (at > lv) return at; return 0; };

  // ---- Notions Drawer: consumables. Dust. Single use, three tray slots. ----
  const NOTIONS = {
    thimble: { name: 'Thimble',        price: 120, sprite: 'thimble', desc: 'Blocks the next hit.' },
    ripper:  { name: 'Seam Ripper',    price: 220, sprite: 'ripper',  desc: 'Destroys the front row of moths. On a boss it rips a weak spot and frays it a quarter.' },
    beeswax: { name: 'Beeswax',        price: 100, sprite: 'beeswax', desc: 'Double fire rate for 10 seconds.' },
    chalk:   { name: "Tailor's Chalk", price: 80,  sprite: 'chalk',   desc: 'Shows a warning line before the next 3 dive attacks.' },
    pin:     { name: 'Safety Pin',     price: 140, sprite: 'pin',     desc: 'Blocks the next capture beam.' },
    button:  { name: 'Brass Button',   price: 400, sprite: 'button',  desc: '+1 life. Limit one per hideout visit.', perVisit: true, chart: 'bp_button' },
    shears:  { name: 'Pinking Shears', price: 160, sprite: 'shears',  desc: 'Clears every enemy shot on screen without using a bomb. Does no damage.', chart: 'bp_shears' },
    dish:    { name: 'Magnet Dish',    price: 90,  sprite: 'dish',    desc: 'Pulls every coin and pickup to your ship for 12 seconds.' },
    patch:   { name: 'Patch Kit',      price: 200, sprite: 'patch',   desc: 'Restores your shield to full.' },
    drone:   { name: 'Bobbin Drone',   price: 240, sprite: 'bobbin',  desc: 'A drone flies beside you and fires with you for 25 seconds.', chart: 'bp_drone' }
  };

  // ---- Charms: temporary power-ups shaken loose from stitched moths. ----
  /* up: the power-up's one permanent upgrade, bought with gems in the hideout. Once bought, that power-up always drops in its
     upgraded form. tier: 0, 1 or 2; a tier opens once CHARM_TIERS[tier].need upgrades from the tier before it are owned.
     Prices are set against gem income: about 10 to 15 gems for a run that ends at the first or second boss, about 170 for a
     full Normal run (see docs/DEPARTURES.md, "Power-up upgrades"). */
  const CHARMS = {
    gold:   { name: 'Double Coins', color: PAL.saffron,    dur: 12, desc: 'Coins are worth double.',
      up: { name: 'Triple Coins', dur: 12, tier: 0, cost: 25, desc: 'Coins are worth triple and fly straight to your ship.' } },
    bobbin: { name: 'Rapid Fire',   color: PAL.madderPale, dur: 10, desc: 'Fire 60% faster.',
      up: { name: 'Overdrive', dur: 10, tier: 1, cost: 70, desc: 'Fire twice as fast. Every kill adds half a second.' } },
    staple: { name: 'Piercing Shots',color: PAL.steelHi,   dur: 8,  desc: 'Shots pass through every enemy.',
      up: { name: 'Breaker Shots', dur: 10, tier: 0, cost: 40, desc: 'Shots pass through every enemy, break armour in one hit and get past shields.' } },
    fan:    { name: 'Wide Shot',    color: PAL.mist,       dur: 10, desc: 'Two extra side shots from your lead weapon.',
      up: { name: 'Wider Shot', dur: 10, tier: 1, cost: 80, desc: 'Four extra side shots from your lead weapon, and two from your bobbin.' } },
    starch: { name: 'Invincible',   color: PAL.paper,      dur: 6,  desc: 'Nothing can hurt you.',
      up: { name: 'Unstoppable', dur: 8, tier: 2, cost: 150, desc: 'Nothing can hurt you. Every shot that hits you turns into a coin and charges your special.' } },
    tangle: { name: 'Slow Motion',  color: PAL.green,      dur: 6,  desc: 'Enemies and their shots move at half speed.',
      up: { name: 'Freeze', dur: 8, tier: 0, cost: 45, freeze: 2, desc: 'Enemies and their shots freeze for 2 seconds, then move at half speed for 6 more.' } },
    egg:    { name: 'Shield +1',    color: PAL.tan,        dur: 0,  desc: 'Restores one shield.',
      up: { name: 'Shield +2', dur: 0, tier: 0, cost: 30, desc: 'Restores two shields. Any left over puts up a pad that blocks one hit.' } },
    homing: { name: 'Guided Shots', color: PAL.blue,       dur: 10, desc: 'Shots curve toward the nearest enemy.',
      up: { name: 'Seeker Shots', dur: 10, tier: 1, cost: 90, desc: 'Every shot locks on to the nearest enemy and chases it down, even one behind you.' } },
    drone:  { name: 'Bobbin Drone', color: PAL.brass,      dur: 15, desc: 'A drone flies beside you and fires with you.',
      up: { name: 'Twin Drones', dur: 15, tier: 1, cost: 100, desc: 'Two drones, one on each side, fly with you. Their shots curve toward enemies.' } },
    bomb:   { name: 'Bomb',         color: PAL.madderHi,   dur: 0,  desc: 'Adds one bomb to your stock.',
      up: { name: 'Grand Unravel', dur: 0, tier: 2, cost: 170, desc: 'Every bomb you use hits twice as hard, does more to a boss, and turns every shot it clears into a coin.' } },
    twin:   { name: 'Twin Ship',    color: PAL.madder,     dur: 0,  desc: 'A second ship flies and fires beside you until it is hit.',
      up: { name: 'Triple Ship', dur: 0, tier: 2, cost: 220, desc: 'Two extra ships fly and fire beside you. Each hit costs one of them.' } },
    split:  { name: 'Split Thread', color: PAL.greenPale,  dur: 10, desc: 'Your shots split in two the first time they hit a moth.',
      up: { name: 'Triple Split', dur: 12, tier: 0, cost: 35, desc: 'Your shots split into three the first time they hit a moth.' } },
    mirror: { name: 'Mirror',       color: PAL.steelHi,    dur: 10, desc: 'A second set of shots fires from the top of the cloth, downward.' },
    recharge: { name: 'Recharge',   color: PAL.saffron,    dur: 0,  desc: 'Fills your special.' },
    streak: { name: 'Hot Streak',   color: PAL.madderPale, dur: 12, desc: 'Your fire rate climbs for as long as you are not hit. A hit sets it back.',
      up: { name: 'Blazing Streak', dur: 14, tier: 1, cost: 70, desc: 'Your fire rate climbs twice as fast, and a hit only takes half of it away.' } },
    tack:   { name: 'Tack Trap',    color: PAL.brass,      dur: 12, desc: 'Moths you destroy leave a pin behind that shoots for a few seconds.' },
    fraydust: { name: 'Fray Dust',  color: PAL.mist,       dur: 12, desc: 'Everything you hit frays twice as fast: bosses break sooner and moths take more.',
      up: { name: 'Fray Storm', dur: 14, tier: 2, cost: 110, desc: 'Everything you hit frays three times as fast.' } },
    spool:  { name: 'Tangled Spool', color: PAL.darkBrown, dur: 10, desc: 'Huge damage for 10 seconds, but you move at half speed.',
      up: { name: 'Wound Spool', dur: 12, tier: 2, cost: 120, desc: 'Even more damage for 12 seconds, and you move at two thirds speed.' } }
  };
  /* The order power-up upgrades open in: the first row is open from the start; each row after it opens once you own `need` from the row before. */
  const CHARM_TIERS = [{ name: 'Row 1', need: 0 }, { name: 'Row 2', need: 2 }, { name: 'Row 3', need: 2 }];

  // ---- The Pattern: permanent stitches. Silk. Each row unlocks left to right. ----
  /* Three tiers. The first (rows with no `tier`) is open from the start. The second opens once 6 first-tier perks are owned, the third
     once 5 second-tier perks are owned (the same rule as the power-up rows). The Coin Exchange perk (`sweepings`) is gone: it paid gems for
     nothing. Its price is refunded by the save upgrade. Perks whose system another part of the game owns are read as plain flags (see
     ST.perk in save.js): until that system exists they do nothing. */
  const PATTERN = {
    tiers: [{ name: 'First pattern', need: 0 }, { name: 'Second pattern', need: 6 }, { name: 'Third pattern', need: 5 }],
    rows: [
      { name: 'Ship',     nodes: ['steady', 'quick', 'second'] },
      { name: 'Senses',   nodes: ['keen', 'chalkline', 'sight'] },
      { name: 'Wallet',   nodes: ['deep', 'credit'] },
      { name: 'Survival', nodes: ['sparepin', 'mended', 'lastknot'] },
      { name: 'Arsenal',  nodes: ['headstart', 'overtime', 'bargain'] },
      { name: 'Kit',      tier: 1, nodes: ['bombcache', 'warmbobbin', 'halfspool', 'bombcache2'] },
      { name: 'Finds',    tier: 1, nodes: ['firstpick', 'secondlook', 'heirhook', 'longfray'] },
      { name: 'Purse',    tier: 2, nodes: ['coinsense', 'gemfinder', 'bargain2'] },
      { name: 'Nerve',    tier: 2, nodes: ['sparepin2', 'freshstart', 'lastlight', 'quickstep'] }
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
      sparepin:  { name: 'Extra Life',    cost: 50, desc: 'Start every run with one more life.' },
      mended:    { name: 'Shield Repair', cost: 90, desc: 'Restore 1 shield at the start of every stage.' },
      headstart: { name: 'Head Start',    cost: 40, desc: 'Start every run with a one-hit shield already up.' },
      overtime:  { name: 'Overtime',      cost: 60, desc: 'Power-ups last 30% longer.' },
      bargain:   { name: 'Bargain',       cost: 80, desc: 'Weapon levels and ship upgrades cost 15% less.' },
      lastknot:  { name: 'Second Chance', cost: 140, desc: 'Once per run, survive the hit that would end it and keep flying with 1 shield.' },
      // second pattern
      bombcache:  { name: 'Spare Bomb',    cost: 120, desc: 'Carry one more bomb.' },
      warmbobbin: { name: 'Warm Bobbin',   cost: 170, desc: 'Your bobbin fires at 75% strength instead of 60%.' },
      halfspool:  { name: 'Half Spool',    cost: 240, desc: 'Your special starts every run half full.' },
      bombcache2: { name: 'Bomb Belt',     cost: 330, desc: 'Carry one more bomb, on top of Spare Bomb.' },
      firstpick:  { name: 'First Pick',    cost: 140, desc: 'Start every run by choosing one of three finds.' },
      secondlook: { name: 'Second Look',   cost: 200, desc: 'Once per run, throw back the three finds on offer and draw three new ones.' },
      heirhook:   { name: 'Heirloom Hook', cost: 280, desc: 'Wear one more heirloom.' },
      longfray:   { name: 'Slow Fray',     cost: 380, desc: 'A boss stays broken 25% longer once its fray meter fills.' },
      // third pattern
      coinsense:  { name: 'Coin Sense',    cost: 400, desc: 'Every coin you earn is worth 10% more.' },
      gemfinder:  { name: 'Gem Finder',    cost: 520, desc: 'Bosses drop 20% more gems.' },
      bargain2:   { name: 'Bargain II',    cost: 680, desc: 'Weapon levels and ship upgrades cost another 10% less.' },
      sparepin2:  { name: 'Spare Life II', cost: 460, desc: 'Start every run with one more life, on top of Extra Life.' },
      freshstart: { name: 'Fresh Start',   cost: 600, desc: 'Restore 1 shield at the start of every wave.' },
      lastlight:  { name: 'Last Light',    cost: 780, desc: 'A second Second Chance each run: survive a killing hit again, with 2 shields.' },
      quickstep:  { name: 'Quick Step',    cost: 1000, desc: 'Dashes come back 15% sooner.' }
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
    bp_shears:      { name: 'Pinking Shears blueprint', unseals: 'the Pinking Shears item',  from: 'any enemy (rare drop)', loose: true },
    bp_daisy:       { name: 'Lazy Daisy blueprint',  unseals: 'the Lazy Daisy weapon',  from: 'The Great Lappet' },
    bp_feather:     { name: 'Feather Stitch blueprint', unseals: 'the Feather Stitch weapon', from: 'The Great Wick' },
    bp_blanket:     { name: 'Blanket Stitch blueprint', unseals: 'the Blanket Stitch weapon', from: 'any enemy (rare drop)', loose: true },
    bp_pins:        { name: 'Tacking Pins blueprint', unseals: 'the Tacking Pins weapon', from: 'The Moth King, or any enemy (rare drop)', loose: true }
  };

  // ---- Unique items (rework: unique items). Finds are found in a run and last for it; heirlooms are bought in the hideout and worn; keepsakes are
  // heirlooms a boss drops. `fx` is plain data the sim sums into Sim.fv (see Sim.applyFinds in src/sim.js); every key is listed in FX_KEYS. ----
  /* What each key does (all are fractions unless noted; a fraction of 0.1 is 10%):
     ply (+shields), invuln (longer safety after a hit), dmg, rate (fire rate), speed (ship), magnet, luck (drop chances), coin (coins), sp (special fills),
     dash (dashes return sooner), charm (power-up drops), dur (power-ups last), focus (slow time lasts), bobbin (the bobbin's damage), bossDmg, fray (boss fray fills),
     bomb (bomb damage), bombMax (whole bombs carried, can be negative), bombPerStage (whole bombs given at each stage start), bombRefund (every Nth bomb is free; 0 = off),
     killHeal (every N kills restore a shield; 0 = off), mendWave (shields restored at each wave start), thorns (needles in the ring when hit), edge (coin value near the edges, a
     multiplier; 0 = off), gem (gem drop chance), bonusDust (coin multiplier in bonus waves; 0 = off), bossGem (whole gems), bossDust (boss coins), grazeDust (coins a graze),
     killSp (special per kill), eliteFind (0 to 1: how sure an elite moth's find is, on top of the base chance), waveGuard (1: a one-hit pad at every wave start). */
  const FX_KEYS = ['ply', 'invuln', 'dmg', 'rate', 'speed', 'magnet', 'luck', 'coin', 'sp', 'dash', 'charm', 'dur', 'focus', 'bobbin', 'bossDmg', 'fray', 'bomb', 'bombMax', 'bombPerStage', 'bombRefund',
    'killHeal', 'mendWave', 'thorns', 'edge', 'gem', 'bonusDust', 'bossGem', 'bossDust', 'grazeDust', 'killSp', 'eliteFind', 'waveGuard'];
  const FIND_RARITY = { common: { name: 'Common', weight: 50 }, uncommon: { name: 'Uncommon', weight: 33 }, rare: { name: 'Rare', weight: 17 } };
  /* Six families. Owning `at[0]` or `at[1]` finds of one family adds that step's fx on top (the rows are what you read on the choice sheet). */
  const FIND_FAMILIES = {
    guard:   { name: 'Guard',   color: PAL.steelHi,    at: [2, 4], bonus: [{ invuln: 0.2 }, { ply: 1, thorns: 6 }],                   note: ['Safe 20% longer after a hit', 'One more shield, and a ring of needles when hit'] },
    purse:   { name: 'Purse',   color: PAL.saffron,    at: [2, 4], bonus: [{ coin: 0.1 }, { bossGem: 2, gem: 0.25 }],                 note: ['Coins worth 10% more', 'Bosses drop 2 more gems, and moths drop gems more often'] },
    point:   { name: 'Point',   color: PAL.madderPale, at: [2, 4], bonus: [{ dmg: 0.06 }, { fray: 0.25, bossDmg: 0.1 }],              note: ['6% more damage', 'Bosses take 10% more damage and fray 25% faster'] },
    pace:    { name: 'Pace',    color: PAL.teal,       at: [2, 4], bonus: [{ rate: 0.05 }, { speed: 0.1, dash: 0.15 }],               note: ['5% more fire rate', 'Faster ship, dashes back 15% sooner'] },
    graze:   { name: 'Graze',   color: PAL.violet,     at: [2, 4], bonus: [{ sp: 0.1 }, { bomb: 0.25, grazeDust: 1 }],                note: ['Special fills 10% faster', 'Bombs hit 25% harder, and every near miss gives a coin'] },
    fortune: { name: 'Fortune', color: PAL.greenPale,  at: [2, 4], bonus: [{ luck: 0.1 }, { charm: 0.3, dur: 0.15 }],                 note: ['Drops 10% more common', 'Power-ups drop 30% more often and last 15% longer'] }
  };
  /* Counted charts for the item pictures: 7 wide, 'a' is the family colour, 'b' is paper. */
  const GLYPHS = {
    egg: ['..aaa..', '.aabaa.', 'aaabaaa', 'aaaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..'],
    cuff: ['aaaaaaa', 'abbbbba', 'abbbbba', 'aaaaaaa', 'abbbbba', 'abbbbba', 'aaaaaaa'],
    shield: ['aaaaaaa', 'abbabba', 'abbabba', '.abbba.', '.abbba.', '..aba..', '...a...'],
    thread: ['.......', 'aa...aa', '..a.a..', '...a...', '..b.b..', 'bb...bb', '.......'],
    thorn: ['a..a..a', '.a.a.a.', '..aaa..', 'aaabaaa', '..aaa..', '.a.a.a.', 'a..a..a'],
    coin: ['..aaa..', '.abbba.', 'abaaaba', 'abaaaba', 'abaaaba', '.abbba.', '..aaa..'],
    purse: ['..a.a..', '..aaa..', '.aaaaa.', 'aabbbaa', 'aabbbaa', 'aaaaaaa', '.aaaaa.'],
    gem: ['.aaaaa.', 'abbabba', 'abaaaba', '.abbba.', '..aba..', '...a...', '.......'],
    map: ['aaaaaaa', 'abaabaa', 'aabaaba', 'abbabba', 'aabaaba', 'abaabaa', 'aaaaaaa'],
    crown: ['a.a.a.a', 'aaaaaaa', 'abbabba', 'aaaaaaa', 'abbbbba', 'abbbbba', 'aaaaaaa'],
    point: ['...a...', '..aba..', '..aba..', '.abbba.', '.abbba.', 'abbbbba', 'aaaaaaa'],
    bead: ['..aaa..', '.aabaa.', 'aabbbaa', 'aabbbaa', '.aabaa.', '..aaa..', '.......'],
    bobbin: ['aaaaaaa', '.abbba.', '.abbba.', '.abbba.', '.abbba.', '.abbba.', 'aaaaaaa'],
    twin: ['a.....a', 'ab...ba', '.a...a.', '.a...a.', '..a.a..', '..a.a..', '...a...'],
    wheel: ['..aaa..', '.a.b.a.', 'a..b..a', 'abbbbba', 'a..b..a', '.a.b.a.', '..aaa..'],
    feather: ['.....aa', '....aab', '...aab.', '..aab..', '.aab...', 'ab.....', 'b......'],
    heel: ['.......', '.aa....', '.aa....', '.aaa...', '.aabaaa', '.aaaaaa', 'bbbbbbb'],
    hourglass: ['aaaaaaa', '.abbba.', '..aba..', '...a...', '..aba..', '.abbba.', 'aaaaaaa'],
    gear: ['.a.a.a.', 'aaaaaaa', '.abbba.', 'aabaaba', '.abbba.', 'aaaaaaa', '.a.a.a.'],
    pins: ['a..b..a', 'a..b..a', '.a.b.a.', 'aaaaaaa', 'abababa', 'aaaaaaa', '.aaaaa.'],
    star: ['...a...', '...a...', 'aaabaaa', '.abbba.', '..aba..', '.aa.aa.', 'a.....a'],
    spark: ['...aaa.', '..aa...', '.aaa...', 'aaaaaaa', '...aaa.', '..aa...', '.aa....'],
    knot: ['aa...aa', 'aaa.aaa', '.aaaaa.', '..aba..', '.aaaaa.', 'aaa.aaa', 'aa...aa'],
    bomb: ['....ba.', '...b...', '..aaa..', '.aaaaa.', 'aaabaaa', 'aaaaaaa', '.aaaaa.'],
    clover: ['.aa.aa.', 'aaaaaaa', '.aaaaa.', 'aaaaaaa', '.aa.aa.', '...b...', '...b...'],
    magnet: ['aa...aa', 'aa...aa', 'bb...bb', 'a.....a', 'a.....a', '.a...a.', '..aaa..'],
    ribbon: ['aa...aa', 'aaa.aaa', 'aaaaaaa', '..bab..', '.aa.aa.', '.a...a.', 'aa...aa'],
    tin: ['.aaaaa.', 'aaaaaaa', 'abbbbba', 'abbabba', 'abbbbba', 'aaaaaaa', '.aaaaa.'],
    moth: ['a.....a', 'aa...aa', 'aaa.aaa', 'aabbbaa', '.aabaa.', '..a.a..', '.a...a.'],
    shears: ['a.....a', '.a...a.', '..a.a..', '...a...', '..b.b..', '.b...b.', 'b.....b'],
    lock: ['..aaa..', '.a...a.', '.a...a.', 'aaaaaaa', 'aabbbaa', 'aabaaba', 'aaaaaaa'],
    plate: ['.aaaaa.', 'aabbbaa', 'abbabba', 'abbabba', 'abbabba', 'aabbbaa', '.aaaaa.'],
    jewel: ['..aaa..', '.abbba.', 'abbabba', '.abbba.', '..aba..', '...a...', '.......'],
    flower: ['..a.a..', '.aaaaa.', 'aabbbaa', '.abbba.', 'aabbbaa', '.aaaaa.', '..a.a..'],
    web: ['a..a..a', '.a.a.a.', '..aaa..', 'aaabaaa', '..aaa..', '.a.a.a.', 'a..a..a'],
    eye: ['.......', '..aaa..', '.abbba.', 'abbaabb', '.abbba.', '..aaa..', '.......'],
    wick: ['...b...', '...a...', '..aaa..', '..aaa..', '..aaa..', '..aaa..', '.aaaaa.'],
    sun: ['a..a..a', '.a.a.a.', '..bbb..', 'aabbbaa', '..bbb..', '.a.a.a.', 'a..a..a'],
    pad: ['.aaaaa.', 'abbbbba', 'abababa', 'abbbbba', 'abababa', 'abbbbba', '.aaaaa.']
  };
  const FINDS = {
    darning_egg:     { name: 'Darning Egg',        fam: 'guard',   rar: 'common',   glyph: 'egg',       desc: '+1 shield.', fx: { ply: 1 } },
    padded_cuff:     { name: 'Padded Cuff',        fam: 'guard',   rar: 'common',   glyph: 'cuff',      desc: 'After a hit you stay safe 40% longer.', fx: { invuln: 0.4 } },
    felt_lining:     { name: 'Felt Lining',        fam: 'guard',   rar: 'common',   glyph: 'shield',    desc: 'Every 30 kills, restore one shield.', fx: { killHeal: 30 } },
    mending_thread:  { name: 'Mending Thread',     fam: 'guard',   rar: 'uncommon', glyph: 'thread',    desc: 'Restore one shield at the start of every wave.', fx: { mendWave: 1 } },
    thimble_thorns:  { name: 'Thimble of Thorns',  fam: 'guard',   rar: 'rare',     glyph: 'thorn',     desc: 'Every hit you take fires a ring of needles.', fx: { thorns: 10 } },
    lucky_selvedge:  { name: 'Lucky Selvedge',     fam: 'purse',   rar: 'common',   glyph: 'coin',      desc: 'Coins picked up near the edges of the screen are worth double.', fx: { edge: 2 } },
    coin_purse:      { name: 'Coin Purse',         fam: 'purse',   rar: 'common',   glyph: 'purse',     desc: 'Coins are worth 15% more.', fx: { coin: 0.15 } },
    gem_needle:      { name: 'Gem Needle',         fam: 'purse',   rar: 'common',   glyph: 'gem',       desc: 'Moths drop gems 25% more often.', fx: { gem: 0.25 } },
    moth_map:        { name: 'Moth-Eaten Map',     fam: 'purse',   rar: 'uncommon', glyph: 'map',       desc: 'Moths in bonus waves drop double coins.', fx: { bonusDust: 2 } },
    golden_thimble:  { name: 'Golden Thimble',     fam: 'purse',   rar: 'rare',     glyph: 'crown',     desc: 'Bosses drop 3 more gems and 40% more coins.', fx: { bossGem: 3, bossDust: 0.4 } },
    sharp_tip:       { name: 'Sharpened Tip',      fam: 'point',   rar: 'common',   glyph: 'point',     desc: '+10% damage.', fx: { dmg: 0.1 } },
    heavy_bead:      { name: 'Heavy Bead',         fam: 'point',   rar: 'common',   glyph: 'bead',      desc: 'Bosses take 15% more damage.', fx: { bossDmg: 0.15 } },
    wound_bobbin:    { name: 'Wound Bobbin',       fam: 'point',   rar: 'common',   glyph: 'bobbin',    desc: 'Your bobbin hits 20% harder.', fx: { bobbin: 0.2 } },
    fraying_thread:  { name: 'Fraying Thread',     fam: 'point',   rar: 'uncommon', glyph: 'thread',    desc: 'Boss fray meters fill 25% faster.', fx: { fray: 0.25 } },
    twin_needle:     { name: 'Twin Needle',        fam: 'point',   rar: 'rare',     glyph: 'twin',      desc: '+20% damage and +10% fire rate.', fx: { dmg: 0.2, rate: 0.1 } },
    quick_spool:     { name: 'Quick Spool',        fam: 'pace',    rar: 'common',   glyph: 'wheel',     desc: '+8% fire rate.', fx: { rate: 0.08 } },
    light_thread:    { name: 'Light Thread',       fam: 'pace',    rar: 'common',   glyph: 'feather',   desc: '+10% ship speed.', fx: { speed: 0.1 } },
    nimble_heel:     { name: 'Nimble Heel',        fam: 'pace',    rar: 'uncommon', glyph: 'heel',      desc: 'Dashes come back 20% sooner.', fx: { dash: 0.2 } },
    hourglass_sand:  { name: 'Hourglass Sand',     fam: 'pace',    rar: 'uncommon', glyph: 'hourglass', desc: 'Slow time lasts 40% longer.', fx: { focus: 0.4 } },
    clockwork_bobbin:{ name: 'Clockwork Bobbin',   fam: 'pace',    rar: 'rare',     glyph: 'gear',      desc: '+25% fire rate and +12% ship speed.', fx: { rate: 0.25, speed: 0.12 } },
    pin_cushion:     { name: 'Pin Cushion',        fam: 'graze',   rar: 'common',   glyph: 'pins',      desc: 'Every near miss gives 1 coin.', fx: { grazeDust: 1 } },
    fine_thread:     { name: 'Fine Thread',        fam: 'graze',   rar: 'common',   glyph: 'star',      desc: 'Your special fills 20% faster.', fx: { sp: 0.2 } },
    static_cling:    { name: 'Static Cling',       fam: 'graze',   rar: 'uncommon', glyph: 'spark',     desc: 'Every kill adds 2% to your special.', fx: { killSp: 0.02 } },
    spare_knot:      { name: 'Spare Knot',         fam: 'graze',   rar: 'uncommon', glyph: 'knot',      desc: 'Every stage starts with one more bomb.', fx: { bombPerStage: 1 } },
    knotted_fuse:    { name: 'Knotted Fuse',       fam: 'graze',   rar: 'rare',     glyph: 'bomb',      desc: 'Bombs hit 50% harder, and every third bomb is free.', fx: { bomb: 0.5, bombRefund: 3 } },
    lucky_button:    { name: 'Lucky Button',       fam: 'fortune', rar: 'common',   glyph: 'clover',    desc: 'Drops of every kind are 20% more common.', fx: { luck: 0.2 } },
    magnet_needle:   { name: 'Magnet Needle',      fam: 'fortune', rar: 'common',   glyph: 'magnet',    desc: 'Pickups are drawn in from further away.', fx: { magnet: 0.35 } },
    long_spool:      { name: 'Long Spool',         fam: 'fortune', rar: 'uncommon', glyph: 'bobbin',    desc: 'Power-ups last 25% longer.', fx: { dur: 0.25 } },
    bright_ribbon:   { name: 'Bright Ribbon',      fam: 'fortune', rar: 'uncommon', glyph: 'ribbon',    desc: 'Power-ups drop 40% more often.', fx: { charm: 0.4 } },
    collectors_tin:  { name: "Collector's Tin",    fam: 'fortune', rar: 'uncommon', glyph: 'tin',       desc: 'Elite moths always drop a find.', fx: { eliteFind: 1 } }
  };
  /* Heirlooms: bought once (dust = coins, silk = gems) and worn, two at a time (three with the Heirloom Hook perk). Sidegrades: each gives and takes.
     `for` limits one to a weapon (lead or bobbin) or a ship; elsewhere it sits in its slot and does nothing. A keepsake (`keepsake`: a boss id) is not sold: that boss drops it. */
  const HEIRLOOMS = {
    shears:     { name: "Grandmother's Shears", glyph: 'shears',  col: 'steelHi',    price: { dust: 2400 }, desc: 'Bombs hit twice as hard, but you carry one bomb fewer.', fx: { bomb: 1, bombMax: -1 } },
    weights:    { name: 'Lead Weights',         glyph: 'bead',    col: 'steelDark',  price: { dust: 1800 }, desc: '+20% damage, but the ship is 12% slower.', fx: { dmg: 0.2, speed: -0.12 } },
    slippers:   { name: 'Silk Slippers',        glyph: 'heel',    col: 'rose',       price: { dust: 1800 }, desc: '+20% ship speed, but 10% less damage.', fx: { speed: 0.2, dmg: -0.1 } },
    pendant:    { name: 'Pincushion Pendant',   glyph: 'pins',    col: 'madderPale', price: { dust: 3000 }, desc: '+1 shield, but you fire 15% slower.', fx: { ply: 1, rate: -0.15 } },
    bobbincase: { name: 'Bobbin Case',          glyph: 'bobbin',  col: 'saffron',    price: { dust: 2200 }, desc: 'Your bobbin hits 35% harder, but your lead weapon 8% less.', fx: { bobbin: 0.35, dmg: -0.08 } },
    mothjar:    { name: 'Moth Jar',             glyph: 'moth',    col: 'greenPale',  price: { dust: 2800 }, desc: 'Elite moths always drop a find, but other drops are 15% rarer.', fx: { eliteFind: 1, luck: -0.15 } },
    dummy:      { name: "Tailor's Dummy",       glyph: 'cuff',    col: 'tan',        price: { dust: 3200 }, desc: 'Every stage starts with one more bomb, but coins are worth 20% less.', fx: { bombPerStage: 1, coin: -0.2 } },
    chalkline:  { name: 'Chalk Line',           glyph: 'point',   col: 'linen',      price: { silk: 40 }, for: { thread: ['running'] }, desc: 'Built for the Single Stitch. As your lead: +35% damage, but 15% slower fire.', fx: { dmg: 0.35, rate: -0.15 } },
    chainlink:  { name: 'Chain Link',           glyph: 'wheel',   col: 'madderPale', price: { silk: 40 }, for: { thread: ['chain'] }, desc: 'Built for the Chain Stitch. As your lead: +25% fire rate, but 10% less damage.', fx: { rate: 0.25, dmg: -0.1 } },
    captain:    { name: "Captain's Thimble",    glyph: 'plate',   col: 'steelHi',    price: { silk: 45 }, for: { needle: ['sail'] }, desc: 'Built for the Sail. 30% faster, but one less shield.', fx: { speed: 0.3, ply: -1 } },
    glasseye:   { name: 'Glass Eye',            glyph: 'eye',     col: 'teal',       price: { silk: 45 }, for: { needle: ['beading'] }, desc: 'Built for Beading. +30% damage, but you are safe 30% less time after a hit.', fx: { dmg: 0.3, invuln: -0.3 } },
    dancing:    { name: 'Dancing Shoe',         glyph: 'heel',    col: 'violet',     price: { silk: 40 }, for: { needle: ['between'] }, desc: 'Built for Between. Dashes come back 35% sooner, but 10% less damage.', fx: { dash: 0.35, dmg: -0.1 } },
    // keepsakes: one for each boss
    k_lappet:   { keepsake: 'greatlappet', name: "Lappet's Spangle",   glyph: 'flower', col: 'madderPale', desc: '+10% fire rate.', fx: { rate: 0.1 } },
    k_tinea:    { keepsake: 'tinea',       name: "Tinea's Silk Net",   glyph: 'web',    col: 'steelHi',    desc: 'Pickups are drawn in from further, and coins are worth 10% more.', fx: { magnet: 0.5, coin: 0.1 } },
    k_wick:     { keepsake: 'greatwick',   name: 'Wick Stub',          glyph: 'wick',   col: 'saffron',    desc: 'Bombs hit 50% harder.', fx: { bomb: 0.5 } },
    k_atlas:    { keepsake: 'atlas',       name: "Atlas's Map Pin",    glyph: 'eye',    col: 'teal',       desc: 'Your special fills 25% faster.', fx: { sp: 0.25 } },
    k_loose:    { keepsake: 'unraveller',  name: "Unraveller's Loose End", glyph: 'thread', col: 'violet', desc: 'Boss fray meters fill 30% faster.', fx: { fray: 0.3 } },
    k_plate:    { keepsake: 'beetle',      name: "Beetle's Plate",     glyph: 'plate',  col: 'tan',        desc: 'Blocks the first hit of every wave.', fx: { waveGuard: 1 } },
    k_cocoon:   { keepsake: 'empress',     name: "Empress's Cocoon Silk", glyph: 'pad', col: 'greenPale',  desc: '+1 shield.', fx: { ply: 1 } },
    k_jewel:    { keepsake: 'king',        name: "The King's Jewel",   glyph: 'jewel',  col: 'saffron',    desc: '+10% damage, and power-ups drop 20% more often.', fx: { dmg: 0.1, charm: 0.2 } }
  };
  /* Chances for the drops (read by the sim). */
  const FIND_DROPS = { eliteBase: 0.4, bossOffer: 3, keepsake: 0.25, keepsakeHard: true, ownedBias: 1.6 };

  const TUNING = {
    fieldW: 14, fieldH: 18.67, fieldBot: -3.4, playerY: -1.9, roam: 5.6, focusLast: 2.5, focusFill: 7, bobbinLag: 2.4, tether: 2.6, bobbinDmg: 0.6, graze: 0.07, pressure: 1.1, spares: 2, traySlots: 3,
    comboWindow: 2.5, comboStep: 8, comboMax: 5, comboCoin: 0.25,
    charmChance: 0.045, chartChance: 0.01, magnet: 1.7, dropSpeed: 2.3,
    cleanRowDust: 12, panelSilk: 2,
    stageHp: 0.2, stageSpeed: 0.04, stageShot: 0.05     // per stage: enemies get tougher, faster, and their shots quicker
  };

  ST.content = { PAL, SPRITES, MOTHS, KEEPERS, PANELS, STAGES, STAGE_LABEL, PATCHES, SAMPLER, MODES, EXCH, FRAY, frayMode, frayLine, FORM, ENTRIES, TWISTS, DIVES, PREVIEWS, PREVIEW_OF, THREADS, WEIGHT_COST, WEIGHT_SILK, FORK_COST, NEEDLES, TEMPERS, TEMPER_COST, temperCost, temperGain, temperMarks, temperNextMark, NOTIONS, CHARMS, CHARM_TIERS, PATTERN, CHARTS, TUNING, FX_KEYS, FIND_RARITY, FIND_FAMILIES, GLYPHS, FINDS, HEIRLOOMS, FIND_DROPS };
})(typeof window !== 'undefined' ? (window.ST = window.ST || {}) : (globalThis.ST = globalThis.ST || {}));
