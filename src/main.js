/* String Theory — boot, input, the frame loop and the Night's flow between screens. */
(function (ST) {
  'use strict';
  const C = ST.content, STEP = 1 / 60, PACE = 0.0025;   // PACE: see loop() (perf B2)

  // ---------- a very small synth: plucks, like a string ----------
  let ac = null;
  function pluck(freq, dur, type, vol, slide) {
    if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'triangle'; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const SOUNDS = {
    fire: () => pluck(660, 0.06, 'triangle', 0.025, 1.3), kill: () => pluck(392, 0.14, 'triangle', 0.07, 0.5), hit: () => pluck(520, 0.05, 'square', 0.02),
    dust: () => pluck(1175, 0.05, 'sine', 0.03), silk: () => { pluck(784, 0.2, 'sine', 0.06); pluck(1175, 0.3, 'sine', 0.04); },
    hurt: () => pluck(160, 0.4, 'sawtooth', 0.1, 0.4), snap: () => { pluck(220, 0.9, 'sawtooth', 0.12, 0.2); pluck(110, 1.1, 'triangle', 0.12, 0.3); },
    charm: () => { pluck(523, 0.12, 'triangle', 0.07); setTimeout(() => pluck(784, 0.2, 'triangle', 0.07), 90); },
    chart: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => pluck(f, 0.25, 'triangle', 0.08), i * 90)),
    buy: () => { pluck(659, 0.1, 'triangle', 0.07); setTimeout(() => pluck(988, 0.18, 'triangle', 0.07), 80); },
    keeper: () => [392, 330, 262, 196, 131].forEach((f, i) => setTimeout(() => pluck(f, 0.5, 'sawtooth', 0.08, 0.6), i * 140)),
    lance: () => pluck(1400, 0.3, 'sawtooth', 0.05, 0.3), burst: () => pluck(120, 0.3, 'square', 0.06, 0.5), phase: () => pluck(98, 0.8, 'sawtooth', 0.09, 1.5)
  };

  /* Recorded audio. Each entry names a file under audio/ and the prompt it should be generated from
     (ElevenLabs sound effects / music). Files that are missing fall back to the synth plucks above,
     so the game always has sound; drop the files in and they take over with no code change. */
  const AUDIO = {
    sfx: {
      fire:   ['fire.mp3',   'Soft quick pluck of a taut cotton thread, short, dry, close-miked, 0.2 seconds'],
      kill:   ['kill.mp3',   'Small fabric rip followed by a soft woolly puff, light and satisfying, 0.4 seconds'],
      hit:    ['hit.mp3',    'Needle tapping through thick felt, muted thud, 0.15 seconds'],
      dust:   ['coin.mp3',   'Tiny bright metallic button clink, single coin pickup, 0.2 seconds'],
      silk:   ['gem.mp3',    'Gentle glassy chime with a silky shimmer tail, reward pickup, 0.8 seconds'],
      hurt:   ['hurt.mp3',   'Thick yarn snapping under tension with a low thump, 0.5 seconds'],
      snap:   ['gameover.mp3','A taut string breaking and whipping loose, then a low descending cello note, 2 seconds'],
      charm:  ['powerup.mp3','Rising harp glissando, three bright notes, cheerful, 0.6 seconds'],
      chart:  ['blueprint.mp3','Paper unfolding followed by a warm four-note music-box flourish, 1.2 seconds'],
      buy:    ['buy.mp3',    'Wooden drawer sliding shut with a brass latch click and a soft coin jingle, 0.6 seconds'],
      keeper: ['bossdown.mp3','Large tapestry tearing apart, heavy cloth collapsing, then a triumphant plucked chord, 2.5 seconds'],
      lance:  ['laser.mp3',  'Metal wire drawn taut and released, bright zinging whip, 0.5 seconds'],
      burst:  ['bomb.mp3',   'Arcade game bomb explosion: a compact deep boom with a sharp crack at the start, followed by a quick spray of small debris and snapping threads, powerful and satisfying, tight tail, 0.9 seconds'],
      phase:  ['bossphase.mp3','Deep ominous bowed double-bass swell with fluttering moth wings, 1.5 seconds'],
      // weapons: one voice each (the bobbin plays the same sound quieter and higher)
      fire_backstitch:  ['fire_double.mp3', 'Layered: two short arcade pews made from a plucked metal string with a fast downward pitch sweep, the second 70 ms later and three semitones higher, over a faint whip swish, 0.2 seconds. Picked by the owner from four candidates (thread laser)', 0.22, 'fire'],
      fire_chain:       ['fire_chain.mp3',  'Short bright metallic chain-link jingle with a light zip, like a tiny chain flicked, dry, 0.3 seconds', 0.25, 'fire'],
      fire_herringbone: ['fire_spread.mp3', 'Soft fabric fan snapping open with a breathy spray of thread, wide and airy, dry, 0.3 seconds', 0.25, 'fire'],
      fire_knot:        ['fire_knot.mp3',   'Arcade game heavy launcher shot: a deep punchy bass thump with a hard wooden knock on top, like a small mortar firing a dense ball, tight weighty low end, immediate attack, dry, 0.4 seconds', 0.4, 'fire'],
      fire_cross:       ['fire_cross.mp3',  'Two crossing thread whips, a quick sharp X shaped swish, crisp, dry, 0.25 seconds', 0.25, 'fire'],
      fire_satin:       ['fire_satin.mp3',  'Very short silky tick, a smooth light thread flick for rapid fire, soft and high, 0.08 seconds', 0.14, 'fire'],
      // the four newest weapons (rework): stand-ins until the files are generated (the fourth entry is the stand-in)
      fire_daisy:       ['fire_daisy.mp3',   'A small loop of thread flicked off a spinning ring: a soft bright pluck with a short airy whirr, like a petal snapped free, dry, 0.2 seconds', 0.2, 'fire_satin'],
      fire_feather:     ['fire_feather.mp3', 'A light feather quill flicked through the air: a breathy soft swish with a tiny high flutter at the end, dry, 0.15 seconds', 0.18, 'fire_satin'],
      fire_blanket:     ['fire_blanket.mp3', 'A thread loop thrown out like a lasso and whipping back: a quick rising whoosh then a softer falling one, a rope-like swoosh there and back, dry, 0.35 seconds', 0.25, 'fire_cross'],
      fire_pins:        ['fire_pins.mp3',    'A dressmaker pin flicked from the fingers: a tiny bright metallic tick with a short thin whistle, dry, 0.15 seconds', 0.22, 'fire_chain'],
      pin_stick:        ['pin_stick.mp3',    'A steel pin pushed firmly into taut linen: a soft muffled thup with a faint metallic tick on top, close and dry, 0.12 seconds', 0.25, 'hit'],
      petal_block:      ['petal_block.mp3',  'A stray bullet caught in a loop of silk thread: a soft springy twang and a puff of fabric, gentle and warm, 0.25 seconds', 0.35, 'deflect'],
      charge:           ['laser_charge.mp3','A metal wire being wound tighter, rising pitch creak and hum building tension, 0.8 seconds', 0.3, null],
      armour:           ['armour.mp3',      'Needle glancing off a hard thimble, small bright metallic tink, dry, 0.15 seconds', 0.4, 'hit'],
      deflect:          ['deflect.mp3',     'Thread snapping back off a stiff leather shield, dull slap with a short twang, 0.25 seconds', 0.4, 'hit'],
      // ship
      dash:        ['dash.mp3',        'Short quick whoosh of a sewing needle darting sideways through cloth, soft fabric swish with a faint thread zip, dry, 0.4 seconds', 0.5, null],
      graze:       ['graze.mp3',       'Tiny close near-miss whisper, a thread whipping past the ear with a faint glassy tick, 0.15 seconds', 0.3, null],
      xstitch:     ['xstitch.mp3',     'Two quick stitches pulled tight in an X, a neat double tug with a small bright bell tap, 0.25 seconds', 0.35, null],
      slow_in:     ['slow_in.mp3',     'Time slowing down: a held breath, sound pulled down in pitch like a music box winding to a stop, soft, 0.7 seconds', 0.5, null],
      slow_out:    ['slow_out.mp3',    'Time snapping back to speed: a quick rising pitch whoosh like a music box spinning back up, soft, 0.4 seconds', 0.45, null],
      sp_ready:    ['sp_ready.mp3',    'A spool of thread wound full and ready: a bright rising three note chime with a taut string hum, 0.6 seconds', 0.55, 'charm'],
      low_shield:  ['low_shield.mp3',  'Warning: a fraying rope creaking under strain with two low muffled heartbeat thumps, tense, 0.9 seconds', 0.6, 'hurt'],
      life_lost:   ['life_lost.mp3',   'A thick rope snapping and a needle clattering to a wooden floor, a short sad falling note, 1 second', 0.7, 'hurt'],
      bomb_use:    ['bomb_use.mp3',    'A held bomb let go in a cloth room: a deep soft boom that opens into a wide ring of threads snapping outward all at once, then a short bright shimmer as bullets turn to loose thread, powerful but clean, 1.1 seconds', 0.85, 'burst'],
      bomb_save:   ['bomb_save.mp3',   'A last-second save: a sharp rising intake of breath cut by a deep soft boom, a rewinding tape-like zip as the hit is undone, then a bright relieved chime, 1 second', 0.85, 'burst'],
      bomb_get:    ['bomb_get.mp3',    'A heavy round spool of thread dropped into a wooden drawer with a soft thump, then a small clink of a brass latch, 0.5 seconds', 0.6, 'charm'],
      loose:       ['loose.mp3',       'A single thread coming loose and swinging free with a tiny sparkling ping, light and airy, 0.4 seconds', 0.4, 'charm'],
      pin:         ['pin.mp3',         'A small brass tack pressed into wood, a short tick with a bright metallic ring, 0.15 seconds', 0.3, 'hit'],
      pin_shot:    ['pin_shot.mp3',    'A tiny sewing pin flicked upward, a very short thin zip with a faint glassy tick, 0.1 seconds', 0.15, 'fire'],
      charm_up:    ['charm_up.mp3',    'The same bright three note harp rise played again and climbing a step higher, with a small shimmer on top, 0.7 seconds', 0.6, 'charm'],
      recharge:    ['recharge.mp3',    'A spool winding full very fast, a quickening ratchet that ends in a bright taut hum and a small chime, 0.7 seconds', 0.6, 'sp_ready'],
      spool_on:    ['spool_on.mp3',    'A huge heavy spool snagging in a tangle of thread, a thick low creak and a dull thud, slow and weighty, 0.8 seconds', 0.6, 'charm'],
      patch:       ['patch.mp3',       'A shot thudding into a stretched canvas patch, taut drum-like whump, 0.3 seconds', 0.5, 'hit'],
      repad:       ['repad.mp3',       'Stuffing a cushion: two soft plump wool puffs and a quick stitch pulled closed, 0.5 seconds', 0.5, 'charm'],
      tcut:        ['tether_cut.mp3',  'A taut thread slicing through soft fabric, quick clean zip and a small tear, 0.2 seconds', 0.35, 'hit'],
      // specials, one per ship
      sp_sharps:     ['sp_tieoff.mp3',    'A knot yanked tight then a ring of threads unravelling outward into a shower of small coins, bright and satisfying, 1.2 seconds', 0.8, 'phase'],
      sp_between:    ['sp_basting.mp3',   'A needle streaking across the whole width of a cloth at great speed, long fast zipping whoosh ending in a taut string hum, 1 second', 0.8, 'phase'],
      sp_darner:     ['sp_darn.mp3',      'Rapid weaving of a patch: quick criss-cross thread passes speeding up, then everything slowing to a thick muffled hush, 1.2 seconds', 0.8, 'phase'],
      sp_chenille:   ['sp_lasso.mp3',     'A heavy spool swung in a full circle on a thick cord, deep whirling whoosh with a whip crack at the end, 0.9 seconds', 0.8, 'phase'],
      sp_sail:       ['sp_fullsail.mp3',  'A big canvas sail snapping full of wind, then a heavy rushing charge with a deep horn-like bow note, powerful, 1.4 seconds', 0.8, 'phase'],
      sp_beading:    ['sp_beads.mp3',     'A string of glass beads let go: eight quick bright glassy pings fanning out one after another, 1 second', 0.8, 'phase'],
      sp_quilter:    ['sp_quilt.mp3',     'Soft bullets caught in a thick quilt: a flurry of padded thumps gathering into one warm rising chime, 1 second', 0.8, 'phase'],
      sp_embroidery: ['sp_signature.mp3', 'An elegant flourish: a fast swirling thread drawn in a signature loop with a shimmering harp glissando, 1 second', 0.8, 'phase'],
      sp_tapestry:   ['sp_loom.mp3',      'A great loom beam sweeping forward: deep wooden clack, a taut thread stretched tight, then a long rising sweep, 1.4 seconds', 0.8, 'phase'],
      // bosses
      boss_stun:   ['boss_stun.mp3',   'A huge creature dazed: a heavy thud, a wobbling off-key string and loose threads fluttering down, 1 second', 0.8, 'hit'],
      in_lappet:   ['in_lappet.mp3',   'A single dry leaf drifting down in silence and settling on cloth, a held breath, then huge moth wings snapping open with a burst of dust and a dark string hit, 4 seconds', 0.9, 'phase'],
      lap_fold:    ['lap_fold.mp3',    'Large papery wings folding shut and a dry leaf beginning to fall, a soft descending whistle, 0.7 seconds', 0.6, null],
      lap_land:    ['lap_land.mp3',    'A heavy soft body slapping flat onto stretched cloth and a ripple running out along it, low whump with a taut fabric shudder, 0.7 seconds', 0.8, 'burst'],
      lap_split:   ['lap_split.mp3',   'One moth peeling apart into three with papery fluttering and an eerie rising triple whisper, 1 second', 0.7, 'phase'],
      in_tinea:    ['in_tinea.mp3',    'A seam ripping open stitch by stitch, threads snapping one after another, something large and wet pushing through cloth, small things skittering, ominous low drone, 4 seconds', 0.9, 'phase'],
      tin_lay:     ['tin_lay.mp3',     'Three soft sticky plops, egg sacs dropped onto fabric, with a faint wet pulse, 0.6 seconds', 0.6, null],
      tin_pop:     ['tin_pop.mp3',     'A small silk sac bursting, a soft wet pop with a puff of fibres, 0.25 seconds', 0.55, 'kill'],
      tin_split:   ['tin_split.mp3',   'A thick silk cocoon splitting open down its length, slow tearing with a hollow crack, 0.9 seconds', 0.8, 'phase'],
      in_wick:     ['in_wick.mp3',     'Silence, a match strikes and flares, then three iron lanterns lighting one after another each with a deep thud and a roar of flame, ending in a hot white whoosh, 4 seconds', 0.9, 'phase'],
      wick_light:  ['wick_light.mp3',  'A fuse lit and hissing along a string, sharp sputtering sparks, 0.8 seconds', 0.6, null],
      wick_swell:  ['wick_swell.mp3',  'A fireball swelling: a low roar of flame growing and rising in pitch, threatening, 1.2 seconds', 0.6, null],
      wick_misfire:['wick_misfire.mp3','A fireball bursting in the face of the one holding it: a fat muffled explosion, a surprised wheeze of flame and sparks crackling out, 1 second', 0.9, 'burst'],
      in_atlas:    ['in_atlas.mp3',    'Two enormous velvet curtains drawing closed with a long heavy sweep, a low choir-like drone, then two great eyelids opening with a wet click each and a cold sweeping tone, 4 seconds', 0.9, 'phase'],
      atl_open:    ['atl_open.mp3',    'A huge eye opening: a slow leathery lid peeling back with a low glassy hum, 0.7 seconds', 0.6, null],
      atl_spotted: ['atl_spotted.mp3', 'Caught in a searchlight: a sharp alarming string stab with a rising whine, 0.5 seconds', 0.75, 'hurt'],
      atl_sweep:   ['atl_sweep.mp3',   'A giant wing dragged across cloth, long heavy velvet scrape rushing from one side to the other, 0.9 seconds', 0.7, null],
      in_unraveller:['in_unraveller.mp3','A single thread being pulled, a whole weave coming undone in a quickening spiral of ripping, then a deep hollow sucking void and iron hooks rising, 4 seconds', 0.9, 'phase'],
      unr_snag:    ['unr_snag.mp3',    'An iron hook catching and a line going taut, sharp clink then a creaking reel winding in, 0.8 seconds', 0.7, 'hurt'],
      unr_unravel: ['unr_unravel.mp3', 'A whole row of knitting pulled out at once, fast rippling unravelling zip, 0.7 seconds', 0.7, null],
      unr_inhale:  ['unr_inhale.mp3',  'A vast mouth breathing in: a long deep hollow inward rush of air dragging loose threads with it, 1.5 seconds', 0.75, 'phase'],
      in_beetle:   ['in_beetle.mp3',   'Heavy thumps under a floor getting closer, something circling beneath, then a wooden frame splintering as a hard shell bursts through and rolls past, three sharp knocks on wood, and a metallic shing, 4 seconds', 0.9, 'phase'],
      btl_aim:     ['btl_aim.mp3',     'A hard shell clicking shut and a heavy ball starting to spin up on cloth, ratcheting clicks rising, 0.7 seconds', 0.6, null],
      btl_bounce:  ['btl_bounce.mp3',  'A heavy hard ball knocking off a wooden rail, a solid billiard-like clack, 0.25 seconds', 0.7, 'hit'],
      btl_slam:    ['btl_slam.mp3',    'A heavy armoured ball crashing full speed into a wooden frame and flipping over, big crunch, rattling shell and a dazed wobble, 1 second', 0.9, 'burst'],
      in_empress:  ['in_empress.mp3',  'Silk strands shooting across a room one at a time, each a quick taut zing, building a web, then something descending slowly on one creaking thread, a delicate sinister music-box phrase, the line cut with a snip, 4 seconds', 0.9, 'phase'],
      emp_spin:    ['emp_spin.mp3',    'Silk being spun fast from a spinneret, a fine whirring thread drawn out with a soft high whine, 0.7 seconds', 0.55, null],
      emp_cocoon:  ['emp_cocoon.mp3',  'Something being wrapped tight in silk, three quick winding swishes and a muffled squeeze, 0.7 seconds', 0.7, 'hurt'],
      emp_fall:    ['emp_fall.mp3',    'A taut silk line snipped and a large body dropping onto cloth, sharp snip, a short fall and a soft heavy thud, 0.8 seconds', 0.8, 'burst'],
      in_king:     ['in_king.mp3',     'A thousand moths pouring in from every side, a rising storm of fluttering wings swirling into a vortex, the light dimming with a deep organ-like drone, four golden crown pieces locking into place each with a bright metallic strike, then a final thunderous chord, 6 seconds', 1, 'phase'],
      ins_lappet: ['ins_lappet.mp3', 'The last 1.7 seconds of in_lappet.mp3 with a short fade in: the sting for the Great Lappet when its entrance has been seen before', 0.9, 'phase'],
      ins_tinea: ['ins_tinea.mp3', 'The last 1.7 seconds of in_tinea.mp3 with a short fade in: the sting for the Mother Tinea when its entrance has been seen before', 0.9, 'phase'],
      ins_wick: ['ins_wick.mp3', 'The last 1.7 seconds of in_wick.mp3 with a short fade in: the sting for the Great Wick when its entrance has been seen before', 0.9, 'phase'],
      ins_atlas: ['ins_atlas.mp3', 'The last 1.7 seconds of in_atlas.mp3 with a short fade in: the sting for the Atlas when its entrance has been seen before', 0.9, 'phase'],
      ins_unraveller: ['ins_unraveller.mp3', 'The last 1.7 seconds of in_unraveller.mp3 with a short fade in: the sting for the Unraveller when its entrance has been seen before', 0.9, 'phase'],
      ins_beetle: ['ins_beetle.mp3', 'The last 1.7 seconds of in_beetle.mp3 with a short fade in: the sting for the Carpet Beetle when its entrance has been seen before', 0.9, 'phase'],
      ins_empress: ['ins_empress.mp3', 'The last 1.7 seconds of in_empress.mp3 with a short fade in: the sting for the Silk Empress when its entrance has been seen before', 0.9, 'phase'],
      ins_king: ['ins_king.mp3', 'The last 1.7 seconds of in_king.mp3 with a short fade in: the sting for the Moth King when its entrance has been seen before', 0.9, 'phase'],
      out_lappet: ['out_lappet.mp3', 'A dry crack and papery crinkle as a large dead leaf stiffens, then a gust of wind peels dry leaves away with a rustle, a second stronger gust scatters the rest, the wind dies away to a breath, cinematic, 3.6 seconds', 1, 'keeper'],
      out_tinea: ['out_tinea.mp3', 'A soft fabric thump, then tiny fabric-tearing nibbling ticks that speed up faster and faster for two seconds, then a muffled cloth sagging flat with a sigh, and finally one small moth fluttering up and away, cinematic, 3.8 seconds', 1, 'keeper'],
      out_wick: ['out_wick.mp3', 'A large flame sputtering and guttering out with three small snuffing puffs and a final hiss of smoke in the first 1.3 seconds, one second of near silence, then three heavy electrical switch clunks one after another as big lights come back on, cinematic, 4 seconds', 1, 'keeper'],
      out_atlas: ['out_atlas.mp3', 'An unstable wavering searchlight hum that locks into a held tone, then two slow heavy deep soft thuds like giant eyelids closing with the hum cutting out on the second, then a long dusty shimmering exhale as something huge crumbles to dust and drifts away, cinematic, 3.8 seconds', 1, 'keeper'],
      out_unraveller: ['out_unraveller.mp3', 'A choked gulp, a scissor snip, then a long steady zipping of knitting being unravelled row by row with soft wooden loom shuttle clacks underneath for two and a half seconds, a final sharp thread pluck, then a small bright chime glint, cinematic, 4.4 seconds', 1, 'keeper'],
      out_beetle: ['out_beetle.mp3', 'A hard shell scraping as a heavy armoured beetle flips onto its back, then a bouncing series of hard shell cracks with short thuds that come quicker and quicker like a dropped ball settling, ending in one biggest crack with a heavy thud and settling dust, cinematic, 3.6 seconds', 1, 'keeper'],
      out_empress: ['out_empress.mp3', 'A spinning wheel whirring faster and faster with a rising silk whine for under two seconds, stopping dead with a taut string twang, a small silk snap, then a slow creaking rope hauling something heavy upward with a rising whoosh and a few delicate water drops at the end, cinematic, 4.2 seconds', 1, 'keeper'],
      out_king: ['out_king.mp3', 'A deep slow-motion impact with time stretching, a falling crystalline shimmer, a clear glass jewel clink on a hard floor with two tiny bounces, a beat of silence, then an explosive burst of hundreds of moth wings fluttering away into the distance while a long warm orchestral dawn chord swells and resolves with a soft sparkle, epic and cinematic, 6.2 seconds', 1, 'keeper'],
      king_swarm:  ['king_swarm.mp3',  'A body bursting apart into a cloud of moths, an explosion of hundreds of fluttering wings scattering, 0.9 seconds', 0.75, 'phase'],
      king_eclipse:['king_eclipse.mp3','The lights going out: a deep descending drone as a shadow passes over, with a faint cold shimmer left behind, 1.5 seconds', 0.8, 'phase'],
      king_jewel:  ['king_jewel.mp3',  'A crown jewel shattering, bright crystalline crack with glittering fragments, 0.5 seconds', 0.75, 'silk'],
      // menus
      ui_tap:   ['ui_tap.mp3',   'A single soft press of a covered button into cloth, small muted click, 0.08 seconds', 0.3, null],
      ui_tab:   ['ui_tab.mp3',   'A paper label flicked over, light crisp flip, 0.12 seconds', 0.3, null],
      ui_fail:  ['ui_fail.mp3',  'A thread pulled and refusing to give, a short dull double thud, gentle and not harsh, 0.25 seconds', 0.4, null],
      ui_equip: ['ui_equip.mp3', 'A spool dropped onto its spindle and seated with a wooden click and a short thread zip, 0.3 seconds', 0.45, 'buy'],
      ui_start: ['ui_start.mp3', 'A needle threaded and pulled taut, quick zip rising to a bright confident pluck, 0.5 seconds', 0.5, 'chart'],
      find:      ['find.mp3',      'A small bright treasure found: a soft glassy chime of two rising notes, a faint sparkle of tiny bells after it, warm and quick, 0.8 seconds', 0.7, 'chart'],
      find_pick: ['find_pick.mp3', 'A coin-sized charm sewn on and snapped tight: one soft thread pull, then a warm round plucked note with a short shimmer, 0.7 seconds', 0.6, 'buy'],
      keepsake:  ['keepsake.mp3',  'An heirloom unwrapped from tissue paper: a rustle, then a slow warm three-note music-box phrase that settles on a gentle held chord, 1.6 seconds', 0.8, 'chart'],
      thorns:    ['thorns.mp3',    'A ring of tiny needles flung outward at once: a quick sharp metallic shiver and a short airy whoosh, 0.5 seconds', 0.55, 'burst'],
      // fireworks
      fw_launch: ['fw_launch.mp3', 'A firework rocket launch: a thread zipping fast up through cloth with a soft rising whistle, dry abrupt end, 0.6 seconds', 0.8, 'dash'],
      fw_pop:    ['fw_pop.mp3',    'A distant firework burst: a muffled soft boom like thick cloth whumping, followed by a light crackle of tiny sparks, warm and round, 0.9 seconds', 0.8, 'burst'],
      fw_ring:   ['fw_ring.mp3',   'A bright firework burst: a sharp ting-pop like a wire hoop pulled taut, then a short glittering shimmer fading quickly, 0.9 seconds', 0.8, 'xstitch'],
      fw_willow: ['fw_willow.mp3', 'A willow firework: one soft pop at the start, then a long gentle falling glitter of sparkles raining down and fading, 1.8 seconds', 0.8, 'silk'],
      fw_cross:  ['fw_cross.mp3',  'A crossette firework: one pop at the start, a short pause, then a rapid cluster of seven small sharp crackling snaps, 0.9 seconds', 0.8, 'xstitch'],
      fw_finale: ['fw_finale.mp3', 'A fireworks finale volley: six quick rocket whooshes one after another, then five booming bursts in rapid succession with crackle, 1.5 seconds', 0.8, 'burst'],
      fw_crown:  ['fw_crown.mp3',  'The biggest firework of the show: a deep warm boom, a bright plucked harp chord blooming over it, then a long shimmering glitter tail, 2 seconds', 1, 'chart'],
      fw_spark:  ['fw_spark.mp3',  'One tiny soft firework pop with a brief delicate sparkle, 0.5 seconds', 0.5, 'silk'],
      // films: the sounds and music stings the directed films declare (src/films/*.js), played by name on the film clock through
      // src/film-kit.js; prompt = the film's desc, volume 1 (the film's own gain sets the level), no stand-in (until a file loads, the film's old single track plays)
      wick_in_sting: ['wick_in_sting.mp3', 'Entrance sting for the Great Wick, a boss made of lamplight. Near silence with one low held cello note for the first second; at 1.0 s a single high bowed-glass harmonic as a match flares, hanging in the air for two seconds; three rising hits of low brass and big drum at 3.36, 4.06 and 4.56 s, each bigger than the last; from 4.6 s a low string tremolo climbing and swelling under a cymbal roll to a full bright brass chord that lands at 6.05 s; the chord holds, warm, through 7 s and dies away by 8.8 s. Dark, ceremonial, a little menacing. Instrumental, 8.8 seconds', 1, null],
      wick_scratch: ['wick_scratch.mp3', 'Extreme close-up of a wooden match: a dry gritty scrape along sandpaper for half a second, then at 0.5 s the head bursts alight with a sharp phosphorus hiss and a soft roar that settles into a small steady flame crackle. Dry, no reverb, very close, 1.9 seconds', 1, null],
      wick_catch: ['wick_catch.mp3', 'An oil lantern catching light: a soft deep whump of flame taking, the ring of an iron cage knocked and one creak of a chain as it starts to swing, 1.1 seconds', 1, null],
      wick_fuse: ['wick_fuse.mp3', 'A fuse burning fast along a thread: a bright spitting hiss that rises in pitch and stops dead, 0.5 seconds', 1, null],
      wick_swing: ['wick_swing.mp3', 'Three heavy lanterns swinging slowly on chains in a silent dark room: slow overlapping iron creaks, one every half second, with the soft flutter of flame as each passes, 1.5 seconds', 1, null],
      wick_eyes: ['wick_eyes.mp3', 'Two embers opening in the dark, one then the other 0.16 s apart: each a soft breathy puff of a coal catching, a little crackle, close and intimate, 0.7 seconds', 1, null],
      wick_whiteout: ['wick_whiteout.mp3', 'A coal waking: a low furnace roar that swells for 0.65 s into a huge bright rush of flame and a white blast of air at 0.65 s, then a long airy hiss with embers ticking that fades by 1.8 s, 1.8 seconds', 1, null],
      wick_brand: ['wick_brand.mp3', 'Letters being branded into cloth one after another: fourteen quick small sizzles in a row over three quarters of a second, then a soft smoulder, 1.3 seconds', 1, null],
      wick_down_sting: ['wick_down_sting.mp3', 'Death sting for the Great Wick, a boss made of lamplight. A single deep low brass swell rising for just over a second as his flame takes a last breath, cut off at 1.14 s; then a slow, sad low cello line over a soft pedal for two seconds; three small plucked harp notes falling at 3.34, 3.5 and 3.64 s; at 3.8 s everything stops dead. Near silence with one high glassy held tone from 3.95 s; three soft low string notes, each lower, at 5.13, 5.38 and 5.6 s, and silence again from 5.75 s. Then four warm chords, each brighter and fuller than the last, landing exactly at 6.33, 6.63, 6.93 and 7.28 s, the last a full major chord of brass and strings that rings out and dies away by 8.8 s. Solemn, then relieved. Instrumental, 8.8 seconds', 1, null],
      wick_gasp: ['wick_gasp.mp3', 'A big flame taking one last huge breath: a deep rising roar of air being sucked into a fire for 1.1 s, swelling to a bright soft blast at 1.1 s, then a falling sigh of flame that fades by 1.8 s. Slowed, heavy, cinematic, 1.8 seconds', 1, null],
      wick_melt: ['wick_melt.mp3', 'Candle wax melting and running: a quiet low simmer the whole length, with soft wet drips falling one after another, slow at first then faster, about twelve in all, the later ones landing with a small sizzle on a hot flame. Close and intimate, 2.4 seconds', 1, null],
      wick_gutter: ['wick_gutter.mp3', 'A candle flame guttering in molten wax: one wet spitting sputter and a short stutter of air, the flame catching again weaker; over by 0.4 s, 0.5 seconds', 1, null],
      wick_drown: ['wick_drown.mp3', 'A candle wick drowning in its own wax: a tiny last hiss and a soft wet pop at 0.1 s, then a thin sizzle dying away to complete silence by 0.8 s. Very close, very quiet, nothing after, 1.4 seconds', 1, null],
      wick_smoke: ['wick_smoke.mp3', 'A thread of smoke rising from a snuffed candle into beams of light: an almost silent airy breath that rises slowly in pitch, with a faint glassy shimmer swelling in from 0.5 s and fading by 1.8 s, 1.8 seconds', 1, null],
      wick_choke: ['wick_choke.mp3', 'An oil lantern choked by smoke: the flame coughs twice, a breathy gulp and a muffled pop as it goes out, then the small tick of its brass cage cooling at 0.5 s, 0.7 seconds', 1, null],
      wick_breaker: ['wick_breaker.mp3', 'A big old theatre breaker thrown in an empty hall: a heavy mechanical CLUNK that echoes once, then the low hum of a bank of tungsten lamps warming up, rising for 0.4 s and settling to a quiet steady electric hum that fades by 1.1 s, 1.1 seconds', 1, null],
      tinea_in_sting: ['tinea_in_sting.mp3', 'Entrance sting for Mother Tinea, a clothes moth that lays her eggs inside cloth, filmed in macro. A very low sub drone with a faint high glassy string harmonic from the start, cold and still; two slow muffled heartbeat thumps at 1.7 and 2.4 s; dry col legno taps on the strings at 3.25, 3.6, 3.98 and 4.16 s, then five faster ones at 4.25, 4.32, 4.37, 4.4 and 4.42 s; a reversed cymbal swell from 3.9 s that cuts to silence at 4.47 s; from 4.6 s a huge slow low brass and choir swell rising for a second and a half; a hard cold hit at 6.23 s (low piano cluster with glass and a gong); then a pale, high string chord with a few slow celesta notes falling like lint, fading out by 9.2 s. Cold, intimate, creeping, a little horrifying. Instrumental, 9.2 seconds', 1, null],
      tinea_weave: ['tinea_weave.mp3', 'Inside a piece of linen, magnified: slow deep woody creaks of rope-thick threads under tension, like a ship\'s rigging heard up close, very dry and near, with a faint hiss of air moving through the weave; the creaks come every half second or so and grow slightly tighter toward the end, 2.4 seconds', 1, null],
      tinea_breath: ['tinea_breath.mp3', 'Something enormous pressing up against cloth from behind: a muffled, soft, heavy pressure swell like a held breath through fabric, with fibres crackling as they stretch, peaking at 0.4 s and easing off, 0.9 seconds', 1, null],
      tinea_feel: ['tinea_feel.mp3', 'Insect feelers probing through a weave: quick, dry, light tapping like fingertips on stiff canvas, a thin scratch drawn along a thread at 0.6 s, then two last searching taps at 1.0 and 1.15 s, 1.3 seconds', 1, null],
      tinea_snap: ['tinea_snap.mp3', 'One rope-thick thread snapping under strain: a deep tight twang that parts with a fibrous crack, the loose end whipping through the air, a short ringing tail, 0.7 seconds', 1, null],
      tinea_unzip: ['tinea_unzip.mp3', 'Five thread snaps one after another, each faster than the last (at 0.0, 0.09, 0.14, 0.17 and 0.19 s), running into a short tearing rattle, 0.5 seconds', 1, null],
      tinea_burst: ['tinea_burst.mp3', 'A seam bursting open toward the listener, slowed down: a deep, slowed fabric rip that roars closer, many thread pops inside it, a heavy wet chitinous push at 0.6 s as something forces through, then a rush of air and lint against the lens that rises to a white hiss and cuts off at 1.75 s, 2.3 seconds', 1, null],
      tinea_settle: ['tinea_settle.mp3', 'After a white flash: a soft airy hush like snow falling on cloth, a few tiny ticks of fibres landing, a low fabric shiver at 0.2 s, everything slowly fading, 2.6 seconds', 1, null],
      tinea_out_sting: ['tinea_out_sting.mp3', 'Death sting for Mother Tinea, a time-lapse of a day passing while moths eat her away. A cold glassy chord struck at 0 s; from 0.4 s a quick ticking pulse twelve to the second, like a time-lapse camera, under a pale high string line that rises and falls once over three seconds (dawn to dusk); the ticking stops dead at 3.7 s; a low soft cello note for the night; a single high celesta note at 4.2 s; from 4.4 s a slow, tender rising figure on solo violin and harp for one and a half seconds; at 5.8 s a warm open major chord blooms as the light comes up and holds, fading by 7.2 s. Melancholy, delicate, cold turning gentle. Instrumental, 7.2 seconds', 1, null],
      tinea_still: ['tinea_still.mp3', 'A killing blow that freezes: a soft heavy woollen thud, then a high crystalline crackle spreading outward for a second, like frost forming fast on a window, 1.3 seconds', 1, null],
      tinea_hours: ['tinea_hours.mp3', 'A day going by in a time-lapse: a quiet mechanical camera shutter clicking twelve times a second throughout, under a muffled airy whoosh that swells to a peak at 1.6 s and falls away to a low hush by 3.2 s, then stops, 3.4 seconds', 1, null],
      tinea_nibble: ['tinea_nibble.mp3', 'Moths eating wool, sped up: tiny dry nibbling and snipping ticks, sparse at first, then faster and denser until they blur into a soft crackle at 2.6 s, then stop, 3 seconds', 1, null],
      tinea_frost: ['tinea_frost.mp3', 'Frost ferns growing across glass: a delicate bright glassy crackling that spreads, with two shimmering glints at 1.0 and 2.0 s as light passes over it, fading at the end, 3 seconds', 1, null],
      tinea_sag: ['tinea_sag.mp3', 'A large hanging cloth going slack in its frame: a deep soft creak of fabric and wood, a long sigh as it lowers, and a muffled settle at 0.6 s, 1.4 seconds', 1, null],
      tinea_lamp: ['tinea_lamp.mp3', 'An old lamp switched on in a silent room: a sharp click, a tiny flicker buzz at 0.07 s, then a faint cold electric hum that holds and slowly fades, 2 seconds', 1, null],
      tinea_wing: ['tinea_wing.mp3', 'One small moth taking off: a soft dusty flutter of tiny wings close by, rising in pitch as it climbs away, a faint tick as it touches the lamp glass at 1.45 s, 1.7 seconds', 1, null],
      lappet_in_sting: ['lappet_in_sting.mp3', 'Entrance sting for the Great Lappet, a moth that hides as a dead leaf. Instrumental, autumnal and hushed. From 0.5 s a soft high string harmonic fades in as sunlight appears. From 1.25 s a solo celesta plays a slow falling figure, one note at a time, drifting down like a leaf (about one note every 0.45 s, each a step lower, with a little swing), over a held warm string chord; at 2.1 s a low soft swell under it as the leaf passes close, easing back by 3.2 s; the falling notes reach the bottom at 4.7 s and everything stops dead: a held breath of silence. At 5.45 s a sudden full hit: low strings and a soft timpani stroke with a bright harp glissando sweeping up; from 5.9 s a warm French horn melody rises over swelling strings, broad and golden, building to a full warm chord that lands at 7.4 s and holds, then fades out by 9.6 s, 9.6 seconds', 1, null],
      lappet_draught: ['lappet_draught.mp3', 'A cold autumn draught through a gap in a high window in an empty attic: out of silence a soft airy hush rises over a second, a loose window frame creaks once at 0.4 s, a very faint thin whistle rides on top, and it settles into a gentle breathing wind by 2.2 s, 2.2 seconds', 1, null],
      lappet_shaft: ['lappet_shaft.mp3', 'Sunlight breaking through: a soft glassy shimmer swelling over 0.6 s, like a fingertip on the rim of a wine glass with a few tiny high glints of dust catching the light, holding, then thinning away by 1.8 s. Delicate and warm, not musical notes, 1.8 seconds', 1, null],
      lappet_pass: ['lappet_pass.mp3', 'One large dry leaf tumbling right past the listener\'s ear in slow motion: a deep, slowed-down whoosh of air that swells over 0.5 s with a crisp papery crackle at its peak at 0.55 s, then sweeps away and trails off into a soft fluttering rustle that fades by 1.9 s. Close, intimate, large, 1.9 seconds', 1, null],
      lappet_flutter: ['lappet_flutter.mp3', 'A single dry leaf seesawing down through still air: a light papery flutter, three soft rustling flips about 0.3 s apart, each a little quieter. Close, dry, no reverb, 1 seconds', 1, null],
      lappet_land: ['lappet_land.mp3', 'A dry leaf settling onto a stretched cloth: a tiny papery tick on contact, a soft scrape as it slides a finger\'s width and stops, then a faint dusty sigh; silent by 0.9 s, 0.9 seconds', 1, null],
      lappet_stir: ['lappet_stir.mp3', 'Something alive inside a dead leaf: one tiny dry crinkle, like a fingernail pressed into a dried leaf, very close, 0.35 seconds', 1, null],
      lappet_crack: ['lappet_crack.mp3', 'A dead leaf cracking open into wings: a sharp, loud dry crack like a stiff old book snapped open or a brittle leaf split along its spine, with a deep soft woody thump under it, then at 0.1 s a big soft puff of powdery dust bursting out and hissing away into the air, settling by 1.5 s, 1.5 seconds', 1, null],
      lappet_wings: ['lappet_wings.mp3', 'A great moth lifting off: three heavy slow wingbeats, each a soft papery whump of moving air, at 0, 0.42 and 0.84 s, the first the biggest, with dry leaf litter skittering across cloth after each; then a soft fluttering hover that fades by 1.8 s, 1.8 seconds', 1, null],
      lappet_down_sting: ['lappet_down_sting.mp3', 'Death sting for the Great Lappet. Instrumental. A single dry pizzicato pluck at 0 s, then a low cello note that sags downward over a second. From 1.0 s tremolo strings rise with the wind, a surge at 1.62 s and a peak at 2.52 s; at 2.6 s they thin to one high sustained violin note (a skeleton held up to the light) that hangs alone until 4.11 s; from 4.11 s a run of tiny falling harp notes, faster and faster, ending on a soft muted pluck at 4.96 s; from 5.41 s a warm, quiet major chord in low strings and a single soft French horn, settling, gone by 7.4 s, 7.4 seconds', 1, null],
      lappet_snap: ['lappet_snap.mp3', 'A brittle dead leaf snapped in the hand: a sharp dry crack at 0 s, close, then a quick sharp intake of air through a gap, as if a window had been flung open, by 0.6 s, 0.8 seconds', 1, null],
      lappet_wither: ['lappet_wither.mp3', 'A leaf drying and curling in fast motion: a slow crinkling of thin paper tightening on itself, falling slightly in pitch over 1.3 s, 1.3 seconds', 1, null],
      lappet_gale: ['lappet_gale.mp3', 'A gale through an open attic window: a low moan rising out of nothing over the first 0.6 s into a full roaring wind with flapping cloth, gusts peaking at 0.6 s and 1.5 s, then the roar held and hollow (as if heard slowed down) from 1.6 s to 3.0 s, a last hard gust at 3.1 s, and it drops away into a thin dying whistle that is gone by 4.2 s, 4.2 seconds', 1, null],
      lappet_strip: ['lappet_strip.mp3', 'A gust tearing thin, old fabric away: a fast dry rip of loose weave lasting 0.3 s and a flurry of small dry fragments skittering and tumbling away downwind, fading by 1.1 s, 1.1 seconds', 1, null],
      lappet_veins: ['lappet_veins.mp3', 'The veins of a skeleton leaf breaking one by one: about ten tiny dry ticks like the thinnest twigs snapping, starting slow at 0 s and quickening, the last at 0.85 s, each with a faint glassy shimmer, 1 seconds', 1, null],
      lappet_last: ['lappet_last.mp3', 'The last thin strip of a leaf snapping and whirling away: one high, thin crack at 0 s, then a fluttering whir that rushes past very close and away over 0.8 s, trailing off by 1.3 s, 1.3 seconds', 1, null],
      lappet_still: ['lappet_still.mp3', 'The wind dropping: a long soft exhale of air into stillness over 1.2 s, one tiny dry tick of something settling at 1.3 s, then a quiet warm room tone that fades by 2.0 s, 2 seconds', 1, null],
      atlas_in_sting: ['atlas_in_sting.mp3', 'Entrance sting for the Atlas, a moth too big for the world. Near silence at first: a very low sub-bass drone, felt more than heard, swelling slowly from 0 s; at 0.5 s a low string cluster joins and climbs slowly in pitch and density for 2.8 s, as if tilting up something that never ends; at 3.3 s the cluster drops away into one enormous low brass-and-organ chord that blooms and holds; from 3.9 s a held breath on top of it; at 4.15 s two high choir voices enter together on a bright open fifth; from 4.5 s choir and strings swell steadily to one huge bright full-orchestra hit with cymbal at 5.33 s; the hit decays into a shimmering haze of high strings and celesta through 6.8 s; a soft low two-note harp figure at 6.76 s; rings out and is gone by 8.4 s. Vast, slow, awed, golden. Instrumental, 8.4 seconds', 1, null],
      atlas_hush: ['atlas_hush.mp3', 'Room tone of a vast dark hall: a low airy hush with a faint glitter of fine dust drifting in it, like specks of mica stirred by a breath; it swells very slightly over its length and stops softly at 3.3 s, 3.4 seconds', 1, null],
      atlas_scales: ['atlas_scales.mp3', 'An enormous wing breathing in the dark: the slow dry rustle of a huge sheet of soft scales shifting, swelling like an inhale for 1.5 s; at 1.6 s one deep fibrous creak of something vast settling; then a slower exhaling rustle that fades by 2.9 s. Close and intimate, but plainly something very big, 2.9 seconds', 1, null],
      atlas_span: ['atlas_span.mp3', 'A huge reveal: one deep soft boom like a sail the size of a building catching the air once, with a long dark tail of hall reverb, fading by 1.3 s, 1.3 seconds', 1, null],
      atlas_open: ['atlas_open.mp3', 'Two great eyes opening at once: a soft heavy parting like velvet drawn apart, a quick shower of fine thread snapping (about twelve tiny pops in the first 0.3 s), and from 0.15 s a warm glassy hum of light swelling into a bright held tone that fades by 1.1 s, 1.1 seconds', 1, null],
      atlas_sweep: ['atlas_sweep.mp3', 'Two beams of light swinging through the air toward the listener: two breathy, glassy whooshes that overlap and rise in pitch as they converge; at 0.83 s they pass right over the listener in one bright rush, cut off at 1.0 s, leaving a faint high glass ring that fades by 1.4 s, 1.4 seconds', 1, null],
      atlas_flare: ['atlas_flare.mp3', 'Light flaring straight into a lens: a rising crystalline shimmer for 0.14 s, then at 0.14 s a soft white blast of air and glass as the picture burns white, then a long airy shimmering tail with faint glitter that fades by 1.6 s, 1.6 seconds', 1, null],
      atlas_blink: ['atlas_blink.mp3', 'Two huge eyelids closing slowly together: a soft heavy fold like velvet, and at 0.4 s a low muffled thump as they shut; nothing after, 0.8 seconds', 1, null],
      atlas_down_sting: ['atlas_down_sting.mp3', 'Death sting for the Atlas, an enormous watching moth. At 0.02 s one sharp low string hit over a reversed cymbal swell, the hit stretched slowly out to 1.17 s; from 1.17 s two high glassy tones waver and slide against each other, unstable and searching, for 1.2 s; at 2.34 s they slide together into one pure held unison note, intense and still; at 3.17 s the note drops a step, softly; at 3.67 s it stops, leaving a low dark pedal; at 4.07 s a long falling cascade of harp and celesta like dust, slowing as it falls, for 1.8 s, while warm low strings rise underneath; at 5.62 s a gentle resolving major chord in strings and soft choir that rings and fades out by 7.4 s. Sad, reverent, then at peace. Instrumental, 7.4 seconds', 1, null],
      atlas_hit: ['atlas_hit.mp3', 'A giant moth struck: a deep soft thump and a huge stiff rustle of wings flinching, heavily slowed, with a long dusty shiver dying away by 1.4 s, 1.4 seconds', 1, null],
      atlas_search: ['atlas_search.mp3', 'Two beams of light thrashing about: two airy, wavering glassy tones sweeping fast back and forth with a breathy whoosh on each pass, about five passes, unstable; stops dead at 1.2 s, 1.2 seconds', 1, null],
      atlas_lock: ['atlas_lock.mp3', 'A gaze locking on: a sudden focused snap of light like a lens clicking into place, then a bright glassy ring that steadies and holds, quietly intense, fading by 0.9 s, 0.9 seconds', 1, null],
      atlas_shut: ['atlas_shut.mp3', 'One huge eyelid closing: a soft heavy fold like a velvet curtain coming down, the hum of light behind it choked off at 0.3 s with a muffled thump, then silence, 0.7 seconds', 1, null],
      atlas_dust: ['atlas_dust.mp3', 'A curtain of fine gold dust falling: a long soft pour like sand sliding off silk, full of tiny glittering ticks and chimes, thick at first and thinning and slowing toward the end, the last grains at 2.2 s, 2.4 seconds', 1, null],
      atlas_settle: ['atlas_settle.mp3', 'The last of the dust settling on cloth in a quiet hall: a few tiny soft ticks, a fading silky hush and the warm low hum of house lights coming up; gone by 1.6 s, 1.6 seconds', 1, null],
      beetle_in_sting: ['beetle_in_sting.mp3', 'Entrance sting for the Carpet Beetle, a heavy armoured beetle that rolls into a ball. Action-film percussion and brass, instrumental. A very low sub rumble and a muffled heartbeat kick from 0 s; three heavy floor-tom hits at 0.55, 0.82 and 1.02 s, each louder; a rising reversed cymbal into 1.16 s; at 1.70 s a huge taiko and low brass stab that cuts to a held high string tone for 0.3 s (a freeze-frame), then the drums drive on; the same stab at 2.55 s, again held 0.3 s; from 2.9 s a low brass swell, slowed and stretched, landing on the biggest stab yet at 3.86 s, held 0.45 s; then rolling, tumbling snare and toms that slow to a stop by 5.1 s; two soft knocks; at 5.47 s a sucked-in reverse swell, and at 6.03 s one enormous hit of full brass, timpani and a sub drop that rings under a fast run of short brass stabs until 6.7 s and decays by 8.9 s, 8.9 seconds', 1, null],
      beetle_rumble: ['beetle_rumble.mp3', 'Something very heavy rolling toward you across a wooden floor in the dark: a low rumble growing louder over 1.1 s, with three heavy wooden thuds as it tumbles over seams at 0.5, 0.77 and 0.97 s, each nearer and louder; a small brass button rattles on the floor after each thud, 1.3 seconds', 1, null],
      beetle_pass: ['beetle_pass.mp3', 'A huge armoured ball rolling past right beside the microphone: a heavy gritty roll that rushes in, peaks at 0.22 s with a deep whoosh of air and the clatter of overlapping plates, and drops away fast (a doppler fall) by 0.7 s, 1 seconds', 1, null],
      beetle_rail: ['beetle_rail.mp3', 'A heavy ball smashing into a hardwood rail with a brass peg in it: an enormous crack of splintering wood with a bright metallic ring at 0 s; from 0.05 s, as if time stopped, only a high suspended ringing for 0.3 s; at 0.35 s the splinters rain down and clatter on felt and the ball rolls away heavily, fading by 1.4 s, 1.4 seconds', 1, null],
      beetle_rail_big: ['beetle_rail_big.mp3', 'The biggest hit: a slowed, deeper version of a heavy ball smashing a hardwood rail, the crack and the brass ring stretched and low at 0 s; from 0.09 s a suspended high ringing for 0.42 s as time stands still; at 0.51 s a burst of splinters clattering down on felt and a heavy rolling rumble that fades by 2.0 s, 2 seconds', 1, null],
      beetle_skid: ['beetle_skid.mp3', 'A heavy ball slowing to a stop on felt: a deep rolling rumble that slows over 0.5 s, a short gritty skid, two soft rocking knocks at 0.6 and 0.75 s, then at 0.95 s a quick creak of plates as it springs up off the felt, 1.2 seconds', 1, null],
      beetle_slam: ['beetle_slam.mp3', 'A great armoured beetle unrolling and slamming flat onto a felt table: a quick leathery snap of plates opening, then at 0.05 s a deep body slam, a boom that shakes the whole wooden table frame, a puff of dust, and a long low rumble with the frame creaking that settles by 2.2 s, 2.2 seconds', 1, null],
      beetle_stamp: ['beetle_stamp.mp3', 'Letters stamped hard one after another: seventeen quick heavy stamps like a press punching metal type, all within 0.5 s, the last landing heavier with a short ring, 1 seconds', 1, null],
      beetle_down_sting: ['beetle_down_sting.mp3', 'Death sting for the Carpet Beetle, a heavy armoured beetle. Instrumental, slowed action-film score. A sharp brass stab at 0 s cut off by 0.12 s; from 0.34 s a deep slowed swell of low strings and a heartbeat sub-kick, as if time has nearly stopped; at 2.06 s a huge slowed taiko hit with a metallic crunch; smaller, higher hits at 3.06, 3.83 and 4.37 s, each quieter and shorter; at 4.78 s a final crack and a cymbal swell that stops dead at 5.2 s; near silence with one high held glassy note from 5.33 s; from 5.77 s a faint ticking pulse that quickens until 7.02 s and stops; at 7.12 s a single low warm chord of brass and strings that settles and fades by 9.2 s, 9.2 seconds', 1, null],
      beetle_crack: ['beetle_crack.mp3', 'A killing blow on armour: a sharp crack of a thick shell splitting at 0 s, then everything drops in pitch and slows, as if time has stopped, into a deep falling whoom that fades by 1.2 s, 1.2 seconds', 1, null],
      beetle_throw: ['beetle_throw.mp3', 'A heavy armoured body thrown and turning over in slow motion: a deep, stretched rush of air rising and falling over 1.7 s, slowed scrabbling of six legs from 0.6 s, a low creak of plates bending; it ends as he lands at 1.7 s, 1.9 seconds', 1, null],
      beetle_plate: ['beetle_plate.mp3', 'A heavy armoured body landing on its back on a felt table in slow motion and one shell plate cracking off: a deep slowed thud and a thick crack of chitin at 0 s, a plate spinning away with a low whirr, then a slowed patter of small hard stitches raining onto felt that fades by 1.6 s, 1.6 seconds', 1, null],
      beetle_last: ['beetle_last.mp3', 'The last of an armoured shell giving way: a final, sharper crack at 0 s that bursts into a spray of small hard pieces, a slowed scatter of them pattering down, then a sudden silence from 0.5 s with only a faint high ringing to 1.4 s, 1.4 seconds', 1, null],
      beetle_coin: ['beetle_coin.mp3', 'A small curved plate with a metal rim dropped onto a felt table, landing on its edge and spinning like a coin: a clack at 0 s, then a wobbling rattle that rises in pitch and speeds up over 1.25 s (like a spinning coin settling), stopping dead at 1.25 s with one final soft click; then silence, 1.5 seconds', 1, null],
      beetle_settle: ['beetle_settle.mp3', 'The room after the fight: a long soft exhale of settling dust, one tiny tick of a stitch dropping onto felt at 0.4 s, and a warm quiet room tone fading by 1.8 s, 1.8 seconds', 1, null],
      empress_in_sting: ['empress_in_sting.mp3', 'Entrance sting for the Silk Empress, a great spider-moth who hangs her web from the moon. Instrumental, cold, elegant and precise. Out of silence a single very high glass harmonic fades in over the first second, like moonlight. At 1.48 s one clear low harp note, plucked and left ringing. At 3.29, 3.66 and 3.96 s three more harp notes, each a step higher and a little quicker, each doubled at the octave; at 4.01, 4.23 and 4.45 s three soft muted string pizzicati answer them, and a fourth at 5.07 s. From 4.87 s a rising run of harp and celesta notes, about fourteen, accelerating up to 5.72 s, over a cold held string chord. From 5.62 s the chord turns minor and descends very slowly in the low strings with a single sustained alto voice humming above it, patient and regal, settling at 6.92 s. At 7.11 s everything stops dead on one plucked note; a soft rising shimmer of strings and glass swells from 7.17 s into a full, bright, high major chord of strings and celesta that lands at 7.78 s, held cold and clear, then dies away by 9.8 s, 9.8 seconds', 1, null],
      empress_moon: ['empress_moon.mp3', 'Moonlight coming up in a silent room: an almost inaudible airy hush with a thin glassy shimmer swelling in over 0.8 s, like a wet fingertip on the rim of a fine glass, then holding faintly to 1.6 s, 1.6 seconds', 1, null],
      empress_drop: ['empress_drop.mp3', 'A single silk line paying out fast as a bead of dew falls on it: a fine, high, falling whistle of thread running off a spool, getting quicker and lower over 0.82 s, and stopping dead at 0.82 s, 0.9 seconds', 1, null],
      empress_taut: ['empress_taut.mp3', 'A silk line snapping taut under a falling dewdrop, heard slowed down and very close: one deep soft twang like a single plucked harp string at 0 s with a glassy ring that wobbles in pitch as the line bounces, three wobbles fading by 0.9 s, and a tiny water-drop tick at 0.25 s, 1.6 seconds', 1, null],
      empress_pluck: ['empress_pluck.mp3', 'A pair of silk lines snapping taut together: a bright, light double twang, like two harp strings plucked at once an octave apart, with a short glassy ring, gone by 0.8 s, 0.8 seconds', 1, null],
      empress_catch: ['empress_catch.mp3', 'A silk line swung through the air and caught on another: a soft quick swish of 0.25 s ending in a tiny, clean, glassy click, like a fingernail on a crystal bead, and a very short ring, 0.6 seconds', 1, null],
      empress_lay: ['empress_lay.mp3', 'Silk being drawn round and round a web very fast: a run of tiny dry ticks and soft silky zips, about fourteen of them, starting slow, quickest in the middle and slowing again to a stop at 0.85 s, each one a little higher than the last, 1.1 seconds', 1, null],
      empress_dew: ['empress_dew.mp3', 'Dew falling from a broken web in the night: a slow patter of the tiniest water drops, a few at first, then a soft brief shower of them at about 1.2 s, thinning to the last few drops by 2.2 s. Very delicate, glassy, no rain hiss, 2.2 seconds (one file for both Silk Empress films: the entrance cues it at gain 0.4, the death at 0.45)', 1, null],
      empress_descend: ['empress_descend.mp3', 'Something large and light coming down a single silk thread: a long, slow, taut creak of a stretched line paying out, rising slightly in pitch, with a soft low breath of air under it; at 1.3 s the line takes the weight with a small deep twang and the creak settles to silence by 1.6 s, 1.6 seconds', 1, null],
      empress_snap: ['empress_snap.mp3', 'A single taut silk line snapped: one sharp, bright, high crack like a fine wire cut under tension, the loose end whipping away through the air with a thin rising zip, gone by 0.5 s, 0.7 seconds', 1, null],
      empress_bloom: ['empress_bloom.mp3', 'Moonlight flaring to white: a soft breathy rise of airy shimmer and high glass, swelling for 0.5 s into a bright, clean, cold bloom of sound like a struck crystal bowl heard from far away, then ringing down to silence by 1.8 s, 1.8 seconds', 1, null],
      empress_down_sting: ['empress_down_sting.mp3', 'Death sting for the Silk Empress. Instrumental, cold and graceful. A single high glass crack at 0 s, slowed and ringing, falling away for 1.3 s. From 1.36 s a spinning figure on harp and celesta, a fast repeating pattern of four notes that speeds up and rises in pitch over 1.8 s, with strings swelling under it, cut off dead at 3.16 s. One low pizzicato note at 3.36 s; three low, heavy, rising string notes at 3.56, 3.86 and 4.12 s, each a step higher, like a rope hauled hand over hand; a fast upward glissando of strings from 4.32 s to 4.89 s, where it stops in silence. Six plucked harp notes falling, at 4.99, 5.24, 5.46, 5.66, 5.84 and 6.02 s, each lower and softer, like strings let go. From 6.24 s a warm, quiet, open major chord in muted strings rises gently and fades away by 8.2 s, 8.2 seconds', 1, null],
      empress_crack: ['empress_crack.mp3', 'A killing blow to something made of silk and glass, slowed down: a deep soft thump, then a bright crack like thin crystal splitting at 0.05 s that rings and falls in pitch, with a soft tearing of silk under it, fading by 1.6 s, 1.6 seconds', 1, null],
      empress_spin: ['empress_spin.mp3', 'A spinning wheel and a spindle whirring up from slow to very fast over 1.8 s, a silky rising whine of thread being wound round and round on top, getting higher and tighter, cut off dead at 1.8 s, 1.9 seconds', 1, null],
      empress_cinch: ['empress_cinch.mp3', 'Silk pulled tight round something and stopped dead: one taut creaking cinch of thread, a short deep twang like a bowstring at 0 s, then a faint creak settling, silent by 0.8 s, 0.9 seconds', 1, null],
      empress_line: ['empress_line.mp3', 'A silk line dropping fast from high above and hooking onto something: a thin falling whistle of 0.14 s that ends in a soft, tight snap as it catches, 0.6 seconds', 1, null],
      empress_haul: ['empress_haul.mp3', 'A heavy silk cocoon hauled up one pull on a rope: a single short creak of taut line under load and a soft rush of air as it lifts, over 0.35 s, 0.5 seconds', 1, null],
      empress_whoosh: ['empress_whoosh.mp3', 'Something hauled up very fast and away into the dark overhead: a rising whoosh that accelerates and climbs in pitch over 0.55 s and is suddenly gone, a faint creak of line at its start, 0.9 seconds', 1, null],
      empress_letgo: ['empress_letgo.mp3', 'A strand of spider silk letting go of its pin: a soft, clean, plucked twang that sags in pitch as the line goes slack, with a few tiny droplets falling and ticking after it, fading by 0.9 s, 0.9 seconds', 1, null],
      empress_still: ['empress_still.mp3', 'The night going quiet as the light comes back: a long soft exhale of air into stillness over 1 s and a faint warm room tone, fading by 1.4 s, 1.4 seconds', 1, null],
      king_in_sting: ['king_in_sting.mp3', 'Entrance sting for the Moth King, the last boss: an eclipse and a coronation, the biggest piece of music in the game. Instrumental, full orchestra and organ. From 0 s a deep organ pedal note alone, very quiet. At 0.5 s high strings fade in on a warm open fifth as a golden sun appears, glowing and noble. From 2.3 s the strings begin to churn and climb in tremolo, low brass and timpani rolls growing underneath, darker and darker, a storm gathering for 1.9 s; at 4.27 s everything cuts off on one piercing high bell-like note and silence. From 4.4 s a cold, vast, still chord of high divided strings and celesta, hushed, holding. Four rising strikes of brass, timpani and a struck bell at 5.6, 6.15, 6.65 and 7.1 s, each a step higher and bigger than the last; a quick ascending harp sweep at 7.3 s and a low ominous two-note horn figure at 7.35 s. At 7.77 s the full orchestra and organ explode into a huge majestic minor-key chord with choir-like brass and cymbals, swelling for 1.75 s; at 9.54 s it drops away to one sustained low note and a deep boom at 9.99 s, then a regal final chord rings out from 9.99 s and fades by 11.5 s, 11.5 seconds', 1, null],
      king_sun: ['king_sun.mp3', 'A great sun appearing: a warm, bright, airy shimmer swelling over 0.6 s, like light itself humming, with a faint high glassy ring on top; it holds, glowing, and thins away by 2 s. Not musical notes, 2 seconds', 1, null],
      king_gather: ['king_gather.mp3', 'Thousands of moths pouring in from every side: a storm of fluttering wings that starts thin and far, spirals closer and thicker, a deep whirling roar building for 1.9 s, then cut off dead at 1.97 s, 2 seconds', 1, null],
      king_diamond: ['king_diamond.mp3', 'The last of the sun going out in an eclipse: five tiny bright crystalline pings in a quick run over 0.2 s, each softer than the last, then at 0.22 s a single piercing flash of light as sound, a brilliant pure crystal tone with a sharp bright attack and a deep sub-bass drop under it, held frozen for a third of a second, then sucked away to nothing by 0.8 s, 1.2 seconds', 1, null],
      king_corona: ['king_corona.mp3', 'Totality: a cold, vast, still shimmer, like wet fingertips on a hundred glass rims at once, very high and airy, with a faint deep wind under it; it swells for 0.6 s and holds, eerie and beautiful, fading by 2.8 s, 2.8 seconds', 1, null],
      king_setjewel: ['king_setjewel.mp3', 'A jewel pulled out of a ring of light on a thread and set in a crown: a quick rising taut zing of a thread drawn tight over 0.4 s, then a bright metallic click of a gem locking into a gold setting at 0.42 s, with a clear chime ringing after it, 0.9 seconds', 1, null],
      king_eyes: ['king_eyes.mp3', 'Two eyes opening in the dark, one then the other 0.12 s apart: each a low, slow breath and a soft ember crackle, intimate and threatening, 0.8 seconds', 1, null],
      king_unveil: ['king_unveil.mp3', 'An eclipse ending as a vast swarm bursts apart: a blinding rush of light like a huge whoosh of air drawn in, then at 0.1 s an explosion of thousands of wings scattering outward in every direction, heavy and slowed down, rolling away by 2.2 s, 2.2 seconds', 1, null],
      king_iris: ['king_iris.mp3', 'An old camera iris closing: a smooth metallic whirr of overlapping metal leaves sliding shut for 0.45 s, ending in a soft deep boom, then a short hush, 1.2 seconds', 1, null],
      king_down_sting: ['king_down_sting.mp3', 'Death sting for the Moth King, the last boss, and the start of the game\'s ending. Instrumental. One huge low orchestral hit with a cymbal at 0 s, cut off dead at 0.45 s; then true silence (the sound of the jewel falling carries the moment alone) until 3.89 s. From 3.89 s a single very soft high sustained violin note, like the ring of the jewel turned into music, held. At 5.35 s a deep low swell of strings and timpani rising fast, a storm of motion with driving low strings, building for 1.4 s; at 6.75 s it breaks into the sunrise: a broad, warm, radiant major-key theme for full orchestra, horns and strings soaring, a choir-like organ under it, rising in waves; at 8.55 s a sparkling harp and celesta run over it as the world mends; it settles into a calm, golden, open major chord at 9.85 s and holds, glowing, to 12.5 s, ready to lead into the ending music, 12.5 seconds', 1, null],
      king_crack: ['king_crack.mp3', 'A crown jewel struck from its setting: a sharp bright crystalline crack and a tiny metal ping as it pops loose, then all sound sucked away into silence by 0.45 s, as if the air were pulled out of the room, 0.6 seconds', 1, null],
      king_fall: ['king_fall.mp3', 'Almost silence: a jewel falling through a dark empty hall in slow motion. Only a faint high airy whistle as it tumbles, turning over slowly about three times a second, and the softest glassy shimmer, barely there, for 3 s, 3.2 seconds', 1, null],
      king_ring: ['king_ring.mp3', 'A jewel landing on a hard floor in an empty hall: a clear bright clink, two smaller bounces at 0.18 and 0.28 s, then one pure high ringing tone, like a struck crystal glass, that trembles a little as the jewel rocks to rest (the tremble gone by 0.9 s) and fades slowly to silence by 3 s, 3 seconds', 1, null],
      king_burst: ['king_burst.mp3', 'A body bursting into thousands of moths far away: a deep soft whump and a sudden explosion of wings, a dry papery flurry, 1 seconds', 1, null],
      king_rush: ['king_rush.mp3', 'A huge swarm of moths racing straight at the listener and past: a roaring rush of thousands of wings growing from far to deafening close over 0.6 s, passing by on every side from 0.6 to 1.0 s with a gust of air, then sweeping away behind and fading by 2.4 s, 2.4 seconds', 1, null],
      king_dawn: ['king_dawn.mp3', 'The sun rising: a deep warm hum of light swelling slowly, with a bright bell-like glint at 0.15 s as the first ray strikes and a long airy shimmer that blooms and settles by 3 s. Glowing and gentle, not musical notes, 3 seconds', 1, null],
      king_mend: ['king_mend.mp3', 'A torn world sewing itself back together: hundreds of needles zipping through cloth and threads drawn tight, soft and quick, a rising patter of little plucks and zips over 1.2 s that settles into a contented soft hush by 1.6 s, 1.6 seconds', 1, null],
      unraveller_in_sting: ['unraveller_in_sting.mp3', 'Entrance sting for the Unraveller, a creature that eats cloth by pulling its threads, filmed as a chase. One taut, very quiet high string harmonic from the start; two dry plucked low bass notes at 0.8 and 1.2 s; at 1.55 s a sharp tearing hit and straight into a driving ostinato of low strings and taut percussion at a racing tempo that speeds up as it goes; at 2.82 s everything drops out but one long slowed metallic swell (a bowed cymbal) for 1.0 s; at 3.9 s the ostinato slams back in harder, faster and climbing; a rising whoosh into a hit at 4.75 s; low brass swelling under it to 5.65 s; at 5.9 s silence, a held breath; at 6.2 s one huge low hit with a steel clang and a hiss of air; a cold low brass chord with a high glassy string holding over it from 6.45 s, fading out by 9.2 s. Driving, relentless, a little sick. Instrumental, 9.2 seconds', 1, null],
      unraveller_tug: ['unraveller_tug.mp3', 'A single thick strand of wool tugged hard from far away, very close: a dry taut creak of yarn snapping straight against coarse knitting, a little fibrous tick, and a faint low thrum of tension; over by 0.4 s, 0.6 seconds', 1, null],
      unraveller_rip: ['unraveller_rip.mp3', 'Yarn ripping free of a knitted cloth: a sharp tearing zip for 0.15 s, a hard twang as it snaps taut, then a fast rattle of loops popping open one after another, fading by 1 s, 1 seconds', 1, null],
      unraveller_run: ['unraveller_run.mp3', 'Knitting unravelling at speed, heard from right beside it: a continuous rasping zip of loops popping open, rising steadily in pitch and speed for 1.2 s, a gap from 1.2 to 2.3 s (the slowed knot covers it), then picking up again faster and higher until it cuts at 3.15 s, with the whoosh of rushing air underneath, 3.3 seconds', 1, null],
      unraveller_knot: ['unraveller_knot.mp3', 'A hard knot of yarn torn apart, slowed right down: a deep stretched creak building for 0.2 s, a heavy fibrous burst at 0.25 s that echoes, then loose fibres pattering down and a long airy tail that fades by 1.1 s, 1.1 seconds', 1, null],
      unraveller_whip: ['unraveller_whip.mp3', 'A camera whip pan past a taut wire: a fast swish of air with a bright metallic zing at its middle, 0.3 s, then a short ringing tail, 0.6 seconds', 1, null],
      unraveller_jaws: ['unraveller_jaws.mp3', 'A huge mouth of rolled wool and steel needles opening: a soft heavy creak of yarn stretching for 0.5 s, a ring of steel points sliding back with a fine metallic shiver, and a hollow wind blowing out of a deep throat that rises and is sucked inward at the end, 1.2 seconds', 1, null],
      unraveller_gulp: ['unraveller_gulp.mp3', 'A great throat swallowing: a deep wet gulp at 0.05 s and a hollow muffled thump, as if heard from inside it, then dead silence, 0.7 seconds', 1, null],
      unraveller_snap: ['unraveller_snap.mp3', 'Big jaws snapping shut with a steel clang and a hiss of mist at 0.0 s; a long thread slurped up fast like a noodle from 0.05 to 0.5 s ending in a wet pop; two crisp steel clicks of hooks springing out at 0.6 and 0.66 s; a low creak of wood settling to 1.6 s, 1.6 seconds', 1, null],
      unraveller_down_sting: ['unraveller_down_sting.mp3', 'Death sting for the Unraveller, a creature that eats cloth, as a loom weaves the world back over it. A choked low brass blare, slowed, cut off at 1.3 s; a rushing reversed swell from 1.34 to 2.1 s that falls into near silence; five heavy low drum and wood hits at 2.83, 3.47, 4.02, 4.52 and 4.95 s, each with a short dark string stab, solemn and mechanical; from 4.95 s a quick spinning pattern of plucked strings and woodblock that speeds up and climbs to 6.38 s; a single clean bright chord on the beat at 6.38 s; then a warm, open, slow string chord, a little relieved, swelling gently from 6.9 s and fading by 9.0 s. Instrumental, 9 seconds', 1, null],
      unraveller_choke: ['unraveller_choke.mp3', 'A huge throat choking on yarn, slowed down: a deep wet gagging retch rising for 0.6 s, a thick thread whipping out of it with a twang at 0.65 s, a long strained wheeze after, 1.6 seconds', 1, null],
      unraveller_spill: ['unraveller_spill.mp3', 'A whole cloth unravelling at once: a rushing roar of thousands of stitches popping and threads zipping loose, sweeping past from low to high over 0.8 s, then a hollow empty hush, 1.5 seconds', 1, null],
      unraveller_shuttle: ['unraveller_shuttle.mp3', 'A giant wooden loom shuttle hurled past, close: a deep fast whoosh of air with the clatter of a spinning pirn inside it, passing from one side to the other over 0.6 s, 0.7 seconds', 1, null],
      unraveller_beat: ['unraveller_beat.mp3', 'A loom reed beating a row of weft home, huge and heavy: one deep hollow wooden CLACK with a thud of packed cloth, a short creak of the frame after, 0.8 seconds', 1, null],
      unraveller_bind: ['unraveller_bind.mp3', 'Something big being bound tight in yarn as it struggles: strained creaks of thread stretching, steel hooks scraping and clicking, a muffled gurgling groan at 1.2 s and another weaker one at 2.2 s, under it all a low tightening rope groan that ends at 3.0 s, 3 seconds', 1, null],
      unraveller_loom: ['unraveller_loom.mp3', 'An old wooden loom running faster and faster: shuttle clacks, slow at first, about one every 0.25 s, speeding up until at 1.2 s they blur into a rattling roll that stops dead at 1.43 s, 1.6 seconds', 1, null],
      unraveller_tie: ['unraveller_tie.mp3', 'A thread pulled through and tied off: a quick zip, a firm soft cinch of a knot at 0.15 s, and one low plucked string ringing out, 1.2 seconds', 1, null],
      unraveller_rest: ['unraveller_rest.mp3', 'A great cloth settling taut in its frame: a soft fabric shiver, a faint creak of the wooden frame at 0.4 s, then a quiet warm room tone that fades out, 1.8 seconds', 1, null],
      title_sting: ['title_sting.mp3', 'Title music for String Theory, a stitched-cloth arcade game: the first thing a player hears. Instrumental. Starts at once, with no silence: a soft breath of high strings and one clear bowed-glass note that hangs (0 to 1.3 s), a small shimmer as a thread passes through a needle\'s eye at 0.82 s. At 1.70 s a low soft pizzicato thump. From 1.86 s a run of twelve plucked notes (harp or celesta over pizzicato strings), one for each letter of the name, rising up a scale and coming faster and faster: at 1.86, 2.30, 2.53, 2.71, 2.85, 3.01, 3.23, 3.43, 3.58, 3.71, 3.84, 3.95 s. From 4.09 s a rising string tremolo and a held breath, tightening like a thread pulled taut, swelling to 5.05 s. THE HIT at 5.05 s: one big bright full-orchestra chord, low drum and brass under a ringing harp glissando and a cymbal, the moment the name is complete. It blooms and settles into a warm, hopeful held chord with a soft choir pad, decaying gently from 5.9 s to silence at 7.4 s, ending calm under the title page (the page is fully up at 6.9 s). Cinematic, wondrous, hand-made, not bombastic; a little magic, 7.4 seconds', 1, null],
      title_glint: ['title_glint.mp3', 'Extreme close-up of a steel needle catching the light: a tiny high metallic shimmer, like a fingertip ringing a fine wire, airy and soft, fading over 1.4 s, 1.4 seconds', 1, null],
      title_thread: ['title_thread.mp3', 'A thread drawn through the eye of a needle, very close: a soft silky friction that rises for 0.2 s, a tiny bright tick at 0.2 s as it passes through the eye, then a smooth whisper of thread sliding on, fading by 0.9 s, 0.9 seconds', 1, null],
      title_pierce: ['title_pierce.mp3', 'A sharp needle pushed through taut canvas, close and dry: a short fibrous creak for 0.05 s, then a soft deep "thup" as it pops through, with a breath of air after it, 0.7 seconds', 1, null],
      title_sew: ['title_sew.mp3', 'Hand sewing at speed, close: quick soft pulls of thread through cloth ("zip"), one for each letter, twelve in all and faster and faster, at 0, 0.44, 0.67, 0.85, 0.99, 1.15, 1.37, 1.57, 1.72, 1.85, 1.98, 2.09 s, each with a faint glassy sparkle on top, dry, no reverb, 2.3 seconds', 1, null],
      title_pull: ['title_pull.mp3', 'A long thread pulled taut, very close: a slow creak of stretching fibre rising in pitch and tension, trembling at the end, cut off dead at 0.96 s (the snap lands there), 1 seconds', 1, null],
      title_snap: ['title_snap.mp3', 'The thread snapping when pulled tight: one sharp bright "tick-twang" at the very start, with a short metallic ring and a soft whoosh of the loose end whipping away, fading over 1.3 s, 1.3 seconds', 1, null],
      title_settle: ['title_settle.mp3', 'Fine dust and fibres settling in a quiet room after a sudden release: a soft airy hush with faint glittering ticks, fading slowly to nothing over 2 s, 2 seconds', 1, null],
      title_sting_short: ['title_sting_short.mp3', 'The short version of the title music, for every launch after the first. Instrumental. Starts at once (out of a breath of silence 0.1 s long) on the last three rising plucks of the full version (harp or celesta over pizzicato) at 0.0, 0.13, 0.25 s; from 0.39 s a quick rising string tremolo, tightening; THE HIT at 1.02 s, the same big bright orchestral chord, harp glissando and cymbal as the full version; it settles into the same warm held chord and fades to silence by 3.2 s (the page is fully up at 2.5 s), 3.2 seconds', 1, null],
      ending_sting: ['ending_sting.mp3', 'The music for the end of the whole game, played straight after the Moth King\'s death music, which ends on a calm, golden, open major chord held by strings. Instrumental. Warm and tender, full of wonder, never loud. From 0 s that same calm golden major chord, soft strings and a little organ, held and breathing, as if it never stopped. At 1.1 s a soft rising harp figure as something small lifts off. From 2.55 s a music box (or celesta) plays a simple, tender rising melody, one note each at 2.55, 3.15, 3.75, 4.35, 4.95, 5.55 and 6.15 s, seven notes climbing, over warm low strings that move underneath. At 6.95 s the eighth note, higher and held, with soft warm horns entering under it. At 7.95 s a gentle resolving harp chord, like a knot tied. From 8.4 s the whole theme opens out: broad, warm strings and horns carrying the music box melody, swelling gently, never loud. At 10.1 s the melody comes home on its final cadence, a warm major chord, and holds. From 11.4 s a quick soft descending run of celesta notes for half a second, then a shimmering swell of high strings and a wordless choir-like pad rising to 12.1 s; then everything settles back into the same calm golden chord the piece began on, ringing out quietly and fading away by 15 s, 15 seconds', 1, null],
      ending_morning: ['ending_morning.mp3', 'Morning light coming into a quiet room: a soft warm hush of air that swells gently over 1 s, with a faint high glassy shimmer of sunlight on top; it holds, still and peaceful, and thins away by 2.6 s. No birds, no music, 2.6 seconds', 1, null],
      ending_lift: ['ending_lift.mp3', 'A small needle-shaped ship lifting gently off cloth and setting off: a soft airy rising whoosh over 0.6 s with a thin, sweet, silvery hum of steel on top, and from 0.3 s the faint quick rustle of a thread being drawn out behind it; fades by 1.4 s, 1.4 seconds', 1, null],
      ending_sew: ['ending_sew.mp3', 'A small cross-stitch picture being sewn very quickly: six soft needle-through-cloth ticks in a quick run over 0.45 s, each with the faint zip of thread pulled through, ending with a tiny soft pluck as the thread pulls snug at 0.48 s. Gentle, close, warm, 0.6 seconds', 1, null],
      ending_last: ['ending_last.mp3', 'The last and biggest cross-stitch picture sewn: nine soft needle-through-cloth ticks over 0.75 s, slowing a little toward the end, each with the faint zip of thread, then at 0.78 s a soft warm glassy bloom like light settling, fading by 1.1 s, 1.1 seconds', 1, null],
      ending_knot: ['ending_knot.mp3', 'A thread being tied off in a knot and drawn tight: a quick soft rustle of a loop for 0.15 s, the small taut creak of thread pulled tight at 0.18 s, then one soft bright pluck, like a single damped harp string, at 0.22 s that rings briefly and fades by 1 s, 1 seconds', 1, null],
      ending_letters: ['ending_letters.mp3', 'Words being sewn on, one letter at a time: a run of soft quick needle ticks, about one every 0.06 s for 1.1 s, each with a faint thread zip, very light and even, 1.2 seconds', 1, null],
      ending_gold: ['ending_gold.mp3', 'Light running down a long thread and then filling everything: a quick soft descending trickle of tiny glassy chimes over 0.55 s, then a warm bright airy swell rising to a peak at 0.7 s, with a gentle shimmer, settling into a calm hush and fading by 2.4 s. Soft, no impact, 2.4 seconds', 1, null]
    },
    music: {
      menu:    ['music_menu.mp3',    'Calm night-time lullaby for plucked harp, music box and soft strings, slow 3/4, cosy and a little mysterious, seamless loop'],
      hideout: ['music_hideout.mp3', 'Warm workshop tune: pizzicato strings, upright piano and soft hand percussion, relaxed mid-tempo, seamless loop'],
      flight:  ['music_flight.mp3',  'Driving arcade shooter theme played on pizzicato strings, dulcimer and brushed drums with a retro synth bass, 140 bpm, upbeat and determined, seamless loop'],
      bonus:   ['music_bonus.mp3',   'Playful fast waltz for music box, glockenspiel and pizzicato strings, bright and bouncy, seamless loop'],
      boss:    ['music_boss.mp3',    'Tense boss battle theme: aggressive bowed cello ostinato, pounding toms, plucked strings and dark synth, 160 bpm, seamless loop'],
      boss2:   ['music_boss2.mp3',   'Darker, heavier boss battle theme for the late game: low string ostinato, war drums, harpsichord stabs and a growling synth bass, 170 bpm, relentless, instrumental, seamless loop'],
      final:   ['music_final.mp3',   'Epic final boss theme: full string orchestra over driving drums, a choir-like pad, plucked dulcimer carrying a heroic melody, desperate and grand, 176 bpm, instrumental, seamless loop']
    }
  };
  /* Playback uses plain <audio> elements, not fetch + decode: fetch is blocked when index.html is opened
     straight from disk (file://), and elements work there and on a server alike. */
  const audio = { el: {}, ok: {}, pool: {}, turn: {}, last: {}, buf: {}, decoding: false, tried: false, track: null, cur: null, old: null, duck: 0 };
  function loadAudio() {
    if (audio.tried || typeof Audio === 'undefined') return; audio.tried = true;
    const all = Object.assign({}, AUDIO.sfx); for (const k in AUDIO.music) all['music:' + k] = AUDIO.music[k];
    for (const k in all) {
      const a = new Audio(); a.preload = 'auto'; a.loop = k.indexOf('music:') === 0;
      a.addEventListener('canplaythrough', () => { audio.ok[k] = true; }, { once: true });
      a.addEventListener('error', () => { audio.ok[k] = false; });
      a.src = 'audio/' + all[k][0]; audio.el[k] = a; audio.pool[k] = [a]; audio.turn[k] = 0;
    }
  }
  /* Effects are also decoded into memory where the page is served (the phone app, a web server): playing a decoded buffer costs
     far less than starting an <audio> element, which matters with two weapons firing all the time. Opened from disk, fetch is
     blocked, nothing is decoded, and the elements below are used as before. */
  function decodeAudio() {
    if (!ac || audio.decoding || typeof fetch === 'undefined' || !/^https?:$/.test(location.protocol)) return; audio.decoding = true;
    const keys = Object.keys(AUDIO.sfx); let i = 0;
    const next = () => { if (i >= keys.length) return; const k = keys[i++];
      fetch('audio/' + AUDIO.sfx[k][0]).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))).then(buf => { audio.buf[k] = buf; }).catch(() => { /* the element is still there */ }).then(next); };
    next(); next(); next();
  }
  function playSample(k, vol, rate) {
    const buf = audio.buf[k];
    if (buf && ac && ac.state === 'running') {
      const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; if (rate && rate !== 1) src.playbackRate.value = rate;
      g.gain.value = Math.max(0, Math.min(1, vol)); src.connect(g); g.connect(ac.destination); src.start(); return src;
    }
    const pool = audio.pool[k]; let a = pool.find(x => x.paused || x.ended);
    if (!a) { if (pool.length < 4) { a = audio.el[k].cloneNode(); pool.push(a); } else a = pool[audio.turn[k]++ % pool.length]; }
    a.volume = Math.max(0, Math.min(1, vol)); try { a.currentTime = 0; if (rate && rate !== 1) { a.preservesPitch = false; a.playbackRate = rate; } else if (a.playbackRate !== 1) a.playbackRate = 1; } catch (e) { /* not seekable yet */ }
    const p = a.play(); if (p && p.catch) p.catch(() => { /* no user gesture yet */ });
    return a;
  }
  /* Music never cuts: the new track fades in while the old one fades out, and both follow audio.level (volume setting, ducking, pause). */
  function playMusic(name) {
    if (name && !audio.ok['music:' + name]) name = name === 'final' ? (audio.ok['music:boss2'] ? 'boss2' : 'boss') : name === 'boss2' ? 'boss' : name;
    if (audio.track === name && (!name || (audio.cur && !audio.cur.paused))) return;
    if (audio.cur) { if (audio.old && audio.old !== audio.cur) audio.old.pause(); audio.old = audio.cur; audio.cur = null; }
    audio.track = name; const key = 'music:' + name, a = name && audio.ok[key] ? audio.el[key] : null;
    if (!a) { if (name) audio.track = null; return; }
    if (a === audio.old) audio.old = null;
    a.volume = 0; try { a.currentTime = 0; } catch (e) { /* not seekable yet */ }
    audio.cur = a; const p = a.play(); if (p && p.catch) p.catch(() => { audio.track = null; audio.cur = null; });   // retried on the next poll, after a click
  }
  function mixMusic(dt, level) {
    const step = dt / 0.9;
    if (audio.cur) { const v = audio.cur.volume, t = level; audio.cur.volume = Math.max(0, Math.min(1, v < t ? Math.min(t, v + step * Math.max(0.2, t)) : Math.max(t, v - step))); }
    if (audio.old) { const v = audio.old.volume - step * 0.6; if (v <= 0.01) { audio.old.pause(); audio.old = null; } else audio.old.volume = v; }
  }
  /* Which sound a boss cue plays. Anything not listed is silent. */
  const CUE_SFX = {
    'greatlappet:fold': 'lap_fold', 'greatlappet:land': 'lap_land', 'greatlappet:split': 'lap_split', 'greatlappet:caught': 'deflect',
    'tinea:lay': 'tin_lay', 'tinea:pop': 'tin_pop', 'tinea:split': 'tin_split', 'tinea:hatch': 'kill', 'tinea:seal': 'deflect',
    'greatwick:light': 'wick_light', 'greatwick:swell': 'wick_swell', 'greatwick:misfire': 'wick_misfire', 'greatwick:boom': 'burst', 'greatwick:throw': 'burst', 'greatwick:snuff': 'tcut', 'greatwick:blink': 'dash',
    'atlas:open': 'atl_open', 'atlas:spotted': 'atl_spotted', 'atlas:sweep': 'atl_sweep', 'atlas:drag': 'atl_sweep', 'atlas:strike': 'lance',
    'unraveller:snag': 'unr_snag', 'unraveller:snap': 'tcut', 'unraveller:bite': 'hurt', 'unraveller:unravel': 'unr_unravel', 'unraveller:restitch': 'xstitch', 'unraveller:inhale': 'unr_inhale', 'unraveller:choke': 'boss_stun', 'unraveller:hookaim': 'btl_aim',
    'beetle:aim': 'btl_aim', 'beetle:bounce': 'btl_bounce', 'beetle:slam': 'btl_slam', 'beetle:burrow': 'unr_unravel', 'beetle:erupt': 'burst', 'beetle:larvae': 'tin_lay',
    'empress:spin': 'emp_spin', 'empress:weave': 'emp_spin', 'empress:cocoon': 'emp_cocoon', 'empress:free': 'repad', 'empress:fall': 'emp_fall', 'empress:snapline': 'tcut', 'empress:puppet': 'atl_open', 'empress:storm': 'unr_inhale',
    'king:swarm': 'king_swarm', 'king:reform': 'atl_open', 'king:eclipse': 'king_eclipse', 'king:jewel': 'king_jewel', 'king:wrongjewel': 'deflect', 'king:crown': 'sp_ready', 'king:pair': 'xstitch', 'king:fail': 'atl_spotted', 'king:pass': 'charm', 'king:laststand': 'unr_unravel',
    stun: 'boss_stun'
  };
  const SHORT_SFX = { greatlappet: 'ins_lappet', tinea: 'ins_tinea', greatwick: 'ins_wick', atlas: 'ins_atlas', unraveller: 'ins_unraveller', beetle: 'ins_beetle', empress: 'ins_empress', king: 'ins_king' };
  const DEATH_SFX = { greatlappet: 'out_lappet', tinea: 'out_tinea', greatwick: 'out_wick', atlas: 'out_atlas', unraveller: 'out_unraveller', beetle: 'out_beetle', empress: 'out_empress', king: 'out_king' };
  const FILM_SFX = { greatlappet: 'in_lappet', tinea: 'in_tinea', greatwick: 'in_wick', atlas: 'in_atlas', unraveller: 'in_unraveller', beetle: 'in_beetle', empress: 'in_empress', king: 'in_king' };
  const GAP = { graze: 90, xstitch: 280, deflect: 120, armour: 70, tcut: 180, hit: 40, dust: 35, kill: 30, ui_tap: 60, pin_stick: 80, petal_block: 90 };   // least milliseconds between two plays of one sound
  ST.audioState = audio;
  ST.AUDIO = AUDIO;


  class Game {
    constructor(THREE) {
      this.store = new ST.save.SaveStore();
      this.slot = -1; this.profile = ST.save.freshProfile();
      this.ui = new ST.UI(this);
      this.canvas = document.getElementById('cloth');
      this.renderer = new ST.Renderer(this.canvas, THREE, { shadows: this.profile.settings.shadows });
      // effects that keep their own time (the fireworks) ask for their sounds here; `alt` plays until the named sound has a file
      this.renderer.hook = { sfx: (n, g, r, alt) => { const k = AUDIO.sfx[n] ? n : alt; if (k) this.sfx(k, g, r); }, buzz: p => this.buzz(p) };
      this.sheet = null;   // a results sheet waiting for a celebration to end (sheetTick)
      this.sim = null; this.state = 'title'; this.midNight = false; this.visit = {};
      this.evbuf = []; this.perf = { t: 0, frames: 0, sim: 0, hud: 0, draw: 0 }; this.drawDt = 0; this.hudN = 0; this.hudNow = true;
      this.keys = {}; this.pointer = null; this.steer = null; this.aim = null; this.tap2 = null; this.touch = false; this.one = { notion: -1, special: false, bomb: false, dash: 0 }; this.lastTap = 0; this.lastKey = { code: '', t: 0 };
      this.acc = 0; this.last = 0; this.frame = 0;
      loadAudio();
      this.bind();
      this.ui.title();
      requestAnimationFrame(t => this.loop(t));
      if (ST.Perf) ST.Perf.attach(this);   // ---- perf (B2) ---- warm-up behind the title, first-launch calibration, ?perf=1
    }
    /* Play a sound by name. gain scales it, rate re-pitches it. A sound whose file is missing plays its stand-in; unknown names are silent. */
    /* Android's back button or gesture (called from MainActivity). True = handled here; false = nothing left to go back from,
       so the app steps into the background the way any Android app does at its first screen. */
    back() {
      const c = this.renderer && this.renderer.cine;
      if (c && c.active) { c.skip(); this.hush(); return true; }
      if (this.state === 'flight') { this.pause(); return true; }
      if (this.state === 'paused') { this.resume(); return true; }
      return !!(this.ui && this.ui.back && this.ui.back());
    }
    hush() {   // a skipped film takes its sound with it
      const a = this.filmSnd; this.filmSnd = null; if (!a) return;
      try { if (a.stop) a.stop(); else if (a.pause) a.pause(); } catch (e) { /* already ended */ }
    }
    sfx(name, gain, rate) {
      const st = this.profile.settings; if (!st.sound) return;
      const v = (st.sfxVol === undefined ? 0.8 : st.sfxVol) / 0.8; if (v <= 0) return;
      const def = AUDIO.sfx[name]; let k = name;
      if (!audio.ok[k] && def && def[3]) k = def[3];
      const now = performance.now(), gap = GAP[name] || 25; if (now - (audio.last[name] || 0) < gap) return; audio.last[name] = now;
      const base = def && def[2] ? def[2] : name === 'fire' ? 0.22 : name === 'dust' ? 0.35 : 0.6;
      if (audio.ok[k] || audio.buf[k]) return playSample(k, base * (gain || 1) * v, rate); else if (SOUNDS[k] && v > 0) SOUNDS[k]();
    }
    /* The first-run lesson. Each step shows one prompt and moves on when the player has done it (or after a while, so nobody gets stuck). */
    teach(sim) {
      const t = this.tutor, pl = sim.player, coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches, ui = this.ui;
      const say = (a, b) => { if (ui.coach) ui.coach(a, b); else if (t.said !== a) { t.said = a; ui.toast(a, b); } };
      if (sim.phase !== 'play') return;
      if (t.x !== null) { t.moved += Math.abs(pl.x - t.x); t.up += Math.max(0, pl.y - t.y); } t.x = pl.x; t.y = pl.y;
      t.t += 1 / 60; if (sim.focusOn) t.slow += 1 / 60;
      const steps = [
        [coarse ? 'Drag anywhere to fly' : 'Fly with the arrow keys, or drag', 'The ship moves as far as your finger does', () => t.moved > 6],
        ['Fly forward and back too', 'Closer shots hit harder with some weapons', () => t.up > 2.5],
        [coarse ? 'Flick sideways to dash' : 'Press Shift to dash', 'A dash passes straight through bullets', () => t.dashed],
        [coarse ? 'Lift your finger to slow time' : 'Hold F to slow time', 'It lasts while the Slow bar does', () => t.slow > 0.4],
        [coarse ? 'Tap with a second finger when the bar is full' : 'Press E when the bar is full', 'Flying close to bullets fills your special', () => t.special]
      ];
      if (t.step >= steps.length) { if (ui.coach) ui.coach(null); this.tutor = null; this.profile.codex.taught = true; this.saved(); return; }
      const s = steps[t.step]; say(s[0], s[1]);
      if (s[2]() || t.t > (t.step === 4 ? 20 : 14)) { t.step++; t.t = 0; t.moved = 0; t.up = 0; t.slow = 0; if (t.step === 4 && pl.sp < 1) pl.sp = Math.max(pl.sp, 0.85); }
    }
    /* A big moment: dip the music under it. */
    duck(sec) { audio.duck = Math.max(audio.duck, sec); }
    buzz(pattern) { const ua = navigator.userActivation; if (ua && !ua.hasBeenActive) return;   // before the first tap the browser refuses (and logs it)
      if (this.profile.settings.haptics !== false && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* not allowed here */ } } }
    music() {   // pick the track for where the player is
      const s = this.sim, st = this.state;
      const boss = s && s.boss ? (s.panel >= 7 ? 'final' : s.panel >= 4 ? 'boss2' : 'boss') : null;
      const t = !this.profile.settings.sound ? null : (st === 'flight' || st === 'paused' || st === 'tally') && s ? (boss || (s.sampler ? 'bonus' : 'flight')) : (st === 'hem' || st === 'route' || st === 'finds') ? 'hideout' : 'menu';
      playMusic(t);
    }
    mix(dt) {
      const st = this.profile.settings, vol = st.musicVol === undefined ? 0.6 : st.musicVol;
      audio.duck = Math.max(0, audio.duck - dt);
      const filming = this.renderer.cine && this.renderer.cine.active;
      mixMusic(dt, st.sound ? vol * 0.7 * (this.state === 'paused' ? 0.35 : 1) * (filming ? 0.15 : audio.duck > 0 ? 0.45 : 1) : 0);
    }
    saved() { if (this.slot >= 0) this.store.save(this.slot, this.profile); }
    applySettings() { const st = this.profile.settings; if (ST.Perf) ST.Perf.adopt(this.profile); /* ---- perf (B2): a save without a tier pick takes this phone's ---- */ this.renderer.setShadows(st.shadows); const g = st.graphics || 'auto'; if (g !== this.gfx) { this.gfx = g; this.renderer.setQuality(g); } }
    openPocket(i, name) {
      let p = this.store.load(i); if (!p) p = this.store.create(i, name);
      this.slot = i; this.profile = p; this.saved(); this.applySettings(); this.toTitle();
    }
    closeBook() {   // a Night has ended: write it in the Ledger
      const r = this.sim && this.sim.record; if (!r || this.sim.booked) return; this.sim.booked = true;
      this.store.record({ mender: this.profile.mender, needle: r.needle, stitches: r.stitches, reached: r.reached, won: r.won, fray: r.fray | 0, date: new Date().toISOString().slice(0, 10) });
    }

    // ---------- flow ----------
    toTitle() { this.state = 'title'; this.sim = null; this.midNight = false; this.ui.hudVisible(false); this.renderer.clear(); if (this.slot < 0) this.ui.title(); else this.ui.menu(); }
    toPockets() { this.state = 'title'; this.sim = null; this.ui.hudVisible(false); this.ui.pockets(); }
    /* The Exchange's overnight reset reads the calendar here, in the shell, and never in the sim. */
    today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    exchange(dir, n) { ST.exchangeDay(this.profile, this.today()); const r = ST.exchange(this.profile, dir, n); if (r.ok) { this.sfx('buy'); this.saved(); } return r; }
    openHem(mid) { this.state = 'hem'; this.midNight = !!mid; this.visit = {}; if (ST.exchangeDay(this.profile, this.today())) this.saved(); this.ui.hudVisible(false); if (mid) this.keep('hem'); this.ui.hem(); }
    keep(at) { this.profile.run = at && this.sim ? this.sim.snapshot(at) : null; this.saved(); }
    continueRun() {
      const snap = this.profile.run; if (!snap) return this.beginNight();
      this.sim = ST.Sim.restore(this.profile, snap); this.renderer.clear();
      if (snap.at === 'after') {
        const nx = this.sim.advance();
        if (nx === 'won') { this.profile.run = null; this.saved(); this.sim = null; return this.openHem(false); }
        if (nx === 'hem') return this.openHem(true);
      } else if (snap.at === 'hem') return this.openHem(true);
      this.fly();
    }
    beginNight() {
      this.sim = new ST.Sim(this.profile, (Date.now() & 0x7fffffff) || 1); this.profile.run = null;
      this.midNight = false; this.renderer.clear(); this.state = 'route'; this.ui.hudVisible(false); this.ui.route();
    }
    flyPatch(id) {
      if (!this.sim) return; this.sim.setPatch(id); this.midNight = false;
      const sim = this.sim;   // rework: unique items: First Pick, before the first wave of a new run
      if (!sim.startOffered && !sim.finds.length && sim.panel === 0 && sim.row === 0 && sim.d.perk.findPick > 0 && sim.openOffer('start')) { this.state = 'finds'; this.nextState = 'route'; this.findNext = () => this.fly(); this.ui.finds(); return; }
      this.fly();
    }
    fly() {
      // first ever flight: a short lesson that waits for you to do each thing
      if (this.sim && this.profile.stats.nights === 0 && this.sim.panel === 0 && this.sim.row === 0 && !(this.profile.codex.taught)) this.tutor = { step: 0, t: 0, moved: 0, up: 0, slow: 0, x: null, y: null };
      this.sfx('ui_start');
      this.sim.startStage(); this.keep('stage'); this.state = 'flight'; this.ui.hide(); this.ui.hudVisible(true); this.acc = 0; this.steer = null; this.aim = null; this.tap2 = null; this.pump(); this.ui.hud(this.sim); requestAnimationFrame(() => this.renderer.resize()); }
    depart() { if (this.midNight && this.sim) { this.state = 'route'; this.ui.route(); } else this.beginNight(); }
    continueNight() {
      const res = this.sim && this.sim.result;
      if (!res || res.kind === 'snap' || res.last) { this.sim = null; this.renderer.clear(); this.openHem(false); return; }
      if (this.sim.offer) { this.state = 'finds'; this.nextState = 'tally'; this.findNext = () => this.continueNight(); this.ui.finds(); return; }   // rework: unique items: pick one of three finds first
      const nx = this.sim.advance();
      if (nx === 'hem') { this.renderer.clear(); this.openHem(true); } else this.fly();
    }
    /* The find choice sheet's buttons: take one (then carry on to wherever the run was going), or throw the three back (Second Look). */
    pickFind(i) {
      const sim = this.sim; if (!sim || !sim.offer) return;
      const id = sim.takeFind(i); this.sfx('find_pick'); this.saved();
      const next = this.findNext; this.findNext = null; this.state = this.nextState || 'tally';
      if (next) next();
    }
    rerollFind() { const sim = this.sim; if (sim && sim.rerollOffer()) { this.sfx('find_pick'); this.ui.finds(); return true; } this.sfx('ui_fail'); return false; }
    takePocket(id) { if (ST.shop.buyNotion(this.profile, id, null).ok) { this.sfx('buy'); this.saved(); this.ui.tally(this.sim.result, null); } }
    pause() { if (this.state === 'flight') { this.state = 'paused'; this.ui.pause(); } }
    resume() { if (this.state === 'paused') { this.state = 'flight'; this.ui.hide(); this.last = 0; } }
    abandon() { if (this.sim) { if (!this.sim.record) this.sim.closeNight(false); this.closeBook(); this.profile.run = null; this.saved(); } this.sim = null; this.renderer.clear(); this.openHem(false); }
    useNotion(i) { this.one.notion = i; }
    special() { this.one.special = true; }
    bomb() { this.one.bomb = true; }

    // ---------- input ----------
    bind() {
      const wake = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } else if (ac.state === 'suspended') ac.resume(); decodeAudio(); };
      window.addEventListener('keydown', e => {
        wake();
        if (this.state !== 'flight' && this.state !== 'paused') return;
        const k = e.code;
        if (k === 'Escape' || k === 'KeyP') { if (this.state === 'flight') this.pause(); else this.resume(); e.preventDefault(); return; }
        if (this.state !== 'flight') return;
        if (this.renderer.cine && this.renderer.cine.active) { if (!e.repeat) { this.renderer.cine.skip(); this.hush(); } e.preventDefault(); return; }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].indexOf(k) >= 0) e.preventDefault();
        if (!e.repeat) {
          const now = performance.now(), dir = (k === 'ArrowLeft' || k === 'KeyA') ? -1 : (k === 'ArrowRight' || k === 'KeyD') ? 1 : 0;
          if (dir) { if (this.lastKey.code === k && now - this.lastKey.t < 260) this.one.dash = dir; this.lastKey = { code: k, t: now }; this.steer = null; this.touch = false; }
          if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') this.one.notion = +k.slice(5) - 1;
          if (k === 'KeyE' || k === 'KeyX' || k === 'Enter') this.one.special = true;
          if (k === 'KeyB' || k === 'KeyV') this.one.bomb = true;
          if (k === 'ShiftLeft' || k === 'ShiftRight') this.one.dash = this.keys.ArrowLeft || this.keys.KeyA ? -1 : this.keys.ArrowRight || this.keys.KeyD ? 1 : (this.sim && this.sim.player.x > 0 ? -1 : 1);
        }
        this.keys[k] = true;
      });
      window.addEventListener('keyup', e => { this.keys[e.code] = false; });
      /* Touch and mouse: drag anywhere and the ship moves as far as your finger does (or, in "follow" mode, flies to it).
         A quick sideways flick dashes. A tap with a second finger fires the special. Lifting off slows time while the focus spool lasts. */
      const st = document.getElementById('stage'), F = ST.FIELD, T = C.TUNING;
      const perPx = () => { const a = this.renderer.project(-F.HW, F.PY).x, b = this.renderer.project(F.HW, F.PY).x; return F.HW * 2 / ((b - a) || 1); };
      const worldPt = e => { const ya = this.renderer.project(0, F.PY).y, yb = this.renderer.project(0, F.PY + T.roam).y; return { x: this.renderer.worldX(e.clientX), y: F.PY + (e.clientY - ya) / ((yb - ya) || 1) * T.roam + 1.6 }; };
      const follow = () => this.profile.settings.controls === 'follow';
      const fence = a => { a.x = Math.max(-F.HW + 0.5, Math.min(F.HW - 0.5, a.x)); a.y = Math.max(F.PY, Math.min(F.PY + T.roam, a.y)); return a; };
      const flick = (p, e, now) => { const dx = e.clientX - p.x0, dy = e.clientY - p.y0; return now - p.t0 < 230 && Math.abs(dx) > 30 && Math.abs(dx) > 1.5 * Math.abs(dy) ? Math.sign(dx) : 0; };
      st.addEventListener('pointerdown', e => {
        wake(); if (this.state !== 'flight' || !this.sim || (e.target.closest && e.target.closest('button'))) return;
        if (this.renderer.cine && this.renderer.cine.active) { this.renderer.cine.skip(); this.hush(); e.preventDefault(); return; }
        const now = performance.now(); this.touch = e.pointerType !== 'mouse';
        if (this.steer && this.steer.id !== e.pointerId) { this.tap2 = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: now }; e.preventDefault(); return; }
        const pl = this.sim.player;
        this.steer = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: now };
        this.aim = fence(follow() ? worldPt(e) : { x: pl.x, y: pl.y });
        try { st.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
        e.preventDefault();
      });
      st.addEventListener('pointermove', e => {
        const p = this.steer; if (!p || p.id !== e.pointerId || !this.aim) return;
        if (follow()) this.aim = fence(worldPt(e)); else { const k = perPx(); this.aim.x += (e.clientX - p.x) * k; this.aim.y -= (e.clientY - p.y) * k; fence(this.aim); }
        p.x = e.clientX; p.y = e.clientY;
      });
      const up = e => {
        const now = performance.now();
        if (this.tap2 && this.tap2.id === e.pointerId) {
          const d = flick(this.tap2, e, now), still = Math.hypot(e.clientX - this.tap2.x0, e.clientY - this.tap2.y0) < 26;
          if (d) this.one.dash = d; else if (still && now - this.tap2.t0 < 400) this.one.special = true;
          this.tap2 = null; return;
        }
        if (this.steer && this.steer.id === e.pointerId) { const d = e.type === 'pointerup' ? flick(this.steer, e, now) : 0; if (d) this.one.dash = d; this.steer = null; this.aim = null; }
      };
      st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
      window.addEventListener('pointerdown', wake, { passive: true });
      window.addEventListener('resize', () => this.renderer.resize());
      // Screen off, app in the background, tab hidden: stop drawing and stop every sound. (Android also calls sleep/wake from MainActivity,
      // because a WebView is not always told it is hidden when the screen turns off.)
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.sleep(); else this.wake(); });
      window.addEventListener('pagehide', () => this.sleep());
    }
    input() {
      const k = this.keys, st = this.profile.settings;
      const move = ((k.ArrowRight || k.KeyD) ? 1 : 0) - ((k.ArrowLeft || k.KeyA) ? 1 : 0), moveY = ((k.ArrowUp || k.KeyW) ? 1 : 0) - ((k.ArrowDown || k.KeyS) ? 1 : 0);
      const drag = move === 0 && moveY === 0 && this.steer && this.aim;
      return { move, moveY, targetX: drag ? this.aim.x : null, targetY: drag ? this.aim.y : null, fire: st.autofire || !!k.Space || !!this.steer,
        notion: this.one.notion, dash: this.one.dash, special: this.one.special, bomb: this.one.bomb,
        focus: !!k.KeyF || (this.touch && !this.steer && st.liftSlow !== false) };
    }

    // ---------- frame ----------
    sleep() {
      if (this.asleep) return; this.asleep = true;
      this.pause(); this.hush();
      for (const m of [audio.cur, audio.old]) if (m && !m.paused) { m.pause(); m._slept = true; }
      for (const k in audio.pool) for (const a of audio.pool[k]) { try { a.pause(); } catch (e) { /* never played */ } }
      if (ac && ac.state === 'running' && ac.suspend) ac.suspend();
    }
    wake() {
      if (!this.asleep) return; this.asleep = false; this.last = 0;
      if (ac && ac.state === 'suspended') ac.resume();
      for (const m of [audio.cur, audio.old]) if (m && m._slept) { m._slept = false; const p = m.play(); if (p && p.catch) p.catch(() => { /* needs a tap */ }); }
      requestAnimationFrame(t => this.loop(t));
    }
    loop(ts) {
      if (this.asleep) return;   // nothing is drawn or stepped while the screen is off; wake() starts the loop again
      requestAnimationFrame(t => this.loop(t));
      if (ST.Perf && ST.Perf.busy) { this.last = 0; return; }   // ---- perf (B2) ---- the frame test owns the screen while it runs
      const dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : STEP; this.last = ts; this.frame++;
      if (this.frame % 20 === 0) this.music();
      this.mix(dt);
      const r = this.renderer, P = this.perf, now = () => performance.now();
      P.t += dt;
      if (P.t >= 0.5) { if (this.profile.settings.showFps) this.ui.fps(Math.round(P.frames / P.t), r.quality, r.gl.getPixelRatio(), P.sim / Math.max(1, P.frames), P.hud / Math.max(1, P.frames), P.draw / Math.max(1, P.frames)); else this.ui.fps(null); P.t = 0; P.frames = 0; P.sim = 0; P.hud = 0; P.draw = 0; }
      if (this.state === 'flight' || (this.state === 'tally' && this.sim)) {
        const events = this.evbuf; events.length = 0;
        const filming = r.cine && r.cine.active;
        let stepped = 0;
        if (this.state === 'flight' && !filming) {
          this.acc += dt;
          const t0 = now();
          // at most three steps a frame (covers 20 frames a second): a long frame must not make the next one longer
          // ---- perf (B2) ---- frame times jitter by a millisecond or two around the display's period. A frame that is a hair short
          // of one step still takes one (the clock may run up to PACE behind and catches up on its own), so a 60Hz screen gets exactly
          // one step per frame instead of an occasional none-then-two (a visible hitch), and 120Hz alternates cleanly.
          while (this.acc >= STEP - PACE && stepped < 3) {
            this.acc -= STEP; stepped++;
            this.sim.update(STEP, this.input());
            this.one.notion = -1; this.one.special = false; this.one.bomb = false; this.one.dash = 0;
            for (const e of this.sim.events) events.push(e);
            if (this.sim.phase === 'done') { this.acc = 0; break; }
          }
          if (this.acc > STEP) this.acc = 0; else if (this.acc < -PACE) this.acc = -PACE;
          P.sim += now() - t0;
        }
        this.drawDt += dt;
        // screens faster than 60Hz: nothing new to show until the game has stepped, so don't draw it twice
        if (!stepped && !filming && this.state === 'flight' && this.drawDt < 0.05) return;
        const t1 = now();
        this.pump(events);
        r.sync(this.sim, this.drawDt, events);
        if (this.sheet) this.sheetTick(this.drawDt);
        const t2 = now();
        if (++this.hudN >= 6 || this.hudNow) { this.hudN = 0; this.hudNow = false; this.ui.hud(this.sim); }   // ten times a second, not every frame
        P.hud += now() - t2; P.draw += t2 - t1; P.frames++; this.drawDt = 0;
      } else {
        if (this.tutor && this.state !== 'paused') { if (this.ui.coach) this.ui.coach(null); this.tutor = null; }
        if (this.sheet) { this.sheet = null; document.body.classList.remove('celebrating'); }
        // paused: the picture holds exactly as it was (the same frame, redrawn a few times a second so a resize still shows)
        if (this.state === 'paused' && r.still) { this.drawDt += dt; if (this.drawDt < 0.2) return; r.still(); this.drawDt = 0; return; }
        // menus: thirty frames a second is plenty behind a sheet of paper
        this.drawDt += dt; if (this.drawDt < 1 / 31) return;
        r.idle(this.drawDt); this.drawDt = 0; P.frames++;
      }
    }
    /* A results sheet never covers a celebration. It waits (at least s.t seconds) until the renderer says the fireworks after a
       perfect bonus wave, or a boss's death and the flourish after it, are over; the picture keeps drawing the whole time, and
       goes on drawing under the sheet. The cap makes sure the sheet always comes. Then the light version of the celebration
       carries on round the sheet (renderer.afterglowAround). */
    sheetTick(dt) {
      const s = this.sheet, r = this.renderer; s.t -= dt; s.cap -= dt;
      const busy = s.cap > 0 && !!(r.celebrating && r.celebrating());
      document.body.classList.toggle('celebrating', busy);
      if (s.t > 0 || busy) return;
      this.sheet = null;
      if (this.state !== 'tally') return;
      s.show();
      if (r.afterglowAround) r.afterglowAround(document.querySelector('#overlay .sheet'));
    }
    pump(events) {
      const ui = this.ui, sim = this.sim, r = this.renderer, fired = this.firedTmp || (this.firedTmp = { l: false, b: false }); fired.l = fired.b = false;
      if (this.state === 'flight' && sim.player) {   // sounds for states that change without an event
        const pl = sim.player, w = this.was || (this.was = { focus: false, ready: false, charge: false });
        if (sim.focusOn !== w.focus) { w.focus = sim.focusOn; this.sfx(sim.focusOn ? 'slow_in' : 'slow_out'); }
        const ready = pl.sp >= 1; if (ready !== w.ready) { w.ready = ready; if (ready) { this.sfx('sp_ready'); this.buzz(18); } }
        const ch = pl.charge > 0.05 || pl.charge2 > 0.05; if (ch !== w.charge) { w.charge = ch; if (ch) this.sfx('charge'); }
        if (this.tutor) this.teach(sim);
      }
      for (const e of events || sim.events) {
        switch (e.t) {
          case 'stage': {
            const id = e.keeper ? C.PANELS[sim.panel].keeper : null, film = id && r.cine && ST.bossScripts && ST.bossScripts[id];
            if (film) {   // the boss's entrance film carries its name; a shorter cut once you have seen it
              const seen = this.profile.codex.cine || (this.profile.codex.cine = {});
              r.cine.play(id, { short: !!seen[id] }); this.filmSnd = this.sfx(seen[id] ? SHORT_SFX[id] : FILM_SFX[id]); seen[id] = true; this.saved();
            } else { ui.banner(e.keeper ? e.label : e.panelName + ' \u00b7 ' + e.label, e.keeper ? e.panelName + ' \u00b7 Boss' : e.hint || (e.sampler ? 'They never shoot back. Get them all.' : e.patch), 1800); if (e.keeper) this.sfx('phase'); }
            this.hudNow = true; break; }
          case 'petal': this.sfx('petal_block'); break;               // (weapons) a Lazy Daisy petal takes a bullet
          case 'pin': this.sfx('pin_stick', e.src === 'B' ? 0.6 : 1); break;   // (weapons) a Tacking Pin goes into the cloth
          case 'fire': { const b = e.src === 'B', key = b ? 'b' : 'l'; if (!fired[key]) { fired[key] = true; const n = e.thread === 'running' || e.thread === 'couching' ? 'fire' : 'fire_' + e.thread; if (e.thread !== 'couching') this.sfx(n, b ? 0.6 : 1, (b ? 1.3 : 1) * (0.97 + Math.random() * 0.06)); } break; }   // a touch of pitch drift so steady fire never sounds like a machine
          case 'hit': case 'bosshit': this.sfx('hit'); break;
          case 'uncase': this.sfx('armour'); break;
          case 'thread': this.sfx('graze'); break;                  // (waves) a thread caught in the thread round
          case 'wrong': this.sfx('deflect'); break;                 // a plain moth shot in the gold round
          case 'elite': case 'convoybreak': this.sfx('armour'); break;
          case 'burned': this.sfx('hit'); break;
          case 'guard': case 'bossblock': this.sfx('deflect'); break;
          case 'dash': this.sfx('dash'); this.buzz(12); if (this.tutor) this.tutor.dashed = true; break;
          case 'graze': this.sfx('graze'); break;
          case 'xstitch': this.sfx('xstitch'); break;
          case 'tcut': this.sfx('tcut'); break;
          case 'cue': { const n = CUE_SFX[e.boss + ':' + e.cue] || CUE_SFX[e.cue]; if (n) this.sfx(n); if (e.cue === 'stun') { this.buzz(25); this.duck(1); } break; }
          case 'kill': this.sfx('kill'); if (e.mult > 1 || e.pts >= 200) ui.floater(r.project(e.x, e.y), '+' + e.pts, e.mult > 1 ? 'hot' : ''); break;
          case 'dust': this.sfx('dust'); break;
          case 'silk': this.sfx('silk'); ui.floater(r.project(sim.player.x, 2.6), '+' + e.v + (e.v === 1 ? ' gem' : ' gems'), 'silk'); break;
          case 'charm': this.sfx(e.lv > 1 ? 'charm_up' : e.id === 'bomb' ? 'bomb_get' : e.id === 'recharge' ? 'recharge' : e.id === 'spool' ? 'spool_on' : 'charm', e.up ? 1.15 : 1, e.up ? 1.2 : 1 + 0.06 * Math.max(0, (e.lv || 1) - 1)); if (e.up) this.buzz(20); ui.toast(e.name + (e.lv > 1 ? ' ' + ['', '', 'II', 'III'][e.lv] : ''), e.lv > 1 ? 'Lasts longer and hits harder: step ' + e.lv + ' of 3.' : e.desc); break;
          case 'bomb': this.sfx(e.save ? 'bomb_save' : 'bomb_use'); this.buzz(e.save ? [30, 40, 60] : 50); this.duck(1.1); ui.banner(e.save ? 'Saved' : 'Bomb', e.save ? 'The hit never landed' : 'Bullets cleared', 900); break;
          case 'loose': this.sfx('loose'); break;
          case 'pin': this.sfx('pin'); break;
          case 'brace': this.sfx('hit'); break;
          case 'chart': this.sfx('chart'); ui.toast('Blueprint found', 'Unlocks ' + e.unseals + ' in the hideout'); break;
          case 'packet': this.sfx('charm'); ui.toast('Item found', e.name); break;
          case 'find': this.sfx('find'); this.buzz(18); ui.toast('Find: ' + e.name, e.desc); this.hudNow = true; break;   // rework: unique items
          case 'keepsake': this.sfx('keepsake'); ui.toast('Keepsake: ' + e.name, e.desc + ' Wear it in the hideout.'); break;
          case 'thorns': this.sfx('thorns'); break;
          case 'felt': this.sfx('repad'); ui.toast('Shield restored', 'Felt Lining'); break;
          case 'bombfree': this.sfx('charm'); ui.toast('Bomb returned', 'Knotted Fuse'); break;
          case 'notion': this.sfx('buy'); ui.toast(e.name, C.NOTIONS[e.id].desc); break;
          case 'slip': this.sfx('charm'); ui.toast(e.why, 'Capture beam blocked.'); break;
          case 'captured': this.sfx('hurt'); ui.toast('Captured!', e.dual ? 'Your twin ship was taken.' : 'You lost a life. Destroy that Spinner to get the ship back as a twin.'); break;
          case 'double': this.sfx('chart'); ui.toast('Twin ship', 'Ship rescued. Two ships, double fire, until one is hit.'); break;
          case 'thimble': this.sfx('hit'); ui.toast('Thimble', 'Hit blocked.'); break;
          case 'hurt': case 'undouble': this.sfx('hurt'); this.buzz(45); if (sim.player.ply === 1 && sim.d.ply > 1) this.sfx('low_shield'); break;
          case 'spare': this.sfx('life_lost'); this.buzz([70, 50, 70]); ui.banner('Life lost', e.spares + (e.spares === 1 ? ' life left' : ' lives left'), 1400); break;
          case 'lastknot': this.sfx('chart'); ui.banner('Second Chance', 'You survive with 1 shield', 1500); break;
          case 'snap': this.sfx('snap'); break;
          case 'phase': this.sfx('phase'); ui.banner(e.tag, e.name + ' · Phase ' + e.phase, 1500); break;
          case 'keeperdown': {   // each boss has its own death film, which carries its own closing card; without one, the plain banner
            const id = e.id || C.PANELS[sim.panel].keeper;
            if (r.cine && r.cine.has && r.cine.has(id, 'death')) { r.cine.play(id, { kind: 'death' }); this.filmSnd = this.sfx(DEATH_SFX[id]); this.duck(4); }
            else { this.sfx('keeper'); this.duck(2.5); ui.banner(e.name, 'Boss defeated', 2000); }
            this.buzz([40, 60, 140]); break; }
          case 'lance': this.sfx('lance'); break;
          case 'special': if (this.tutor) this.tutor.special = true; this.sfx('sp_' + e.id); this.buzz(30); this.duck(1.2); ui.banner(e.name, 'Special', 900); break;
          case 'patch': this.sfx('patch'); this.buzz(15); break;
          case 'repad': this.sfx('repad'); ui.toast('Pad re-stuffed', 'Next hit blocked.'); break;
          case 'burst': if (!e.quiet) this.sfx('burst'); break;
          case 'stageclear': if (e.last) { this.closeBook(); this.profile.run = null; this.saved(); } else this.keep('after'); this.state = 'tally'; this.pocket = e.info.kind === 'row' ? this.rollPocket() : null; this.sheet = { t: 0.3, cap: 9, show: () => this.ui.tally(e, this.pocket) }; break;
          case 'snapped': this.closeBook(); this.profile.run = null; this.saved(); this.state = 'tally'; this.sheet = { t: 0.3, cap: 9, show: () => this.ui.snapped(e) }; break;
        }
      }
    }
    rollPocket() {
      const ids = Object.keys(C.NOTIONS).filter(id => { const n = C.NOTIONS[id]; return !n.perVisit && (!n.chart || this.profile.charts[n.chart]); });
      const out = []; while (out.length < 3 && ids.length) out.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]);
      return out;
    }
  }

  ST.boot = function (THREE) {
    if (!THREE) { new ST.UI({ profile: ST.save.freshProfile() }).fail('Three.js could not be loaded. Check your connection and reload, or put three.module.min.js in the vendor folder.'); return; }
    try { ST.game = new Game(THREE); } catch (err) { console.error(err); new ST.UI({ profile: ST.save.freshProfile() }).fail('This device could not start WebGL: ' + err.message); }
  };
})(window.ST);
