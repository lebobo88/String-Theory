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
      // fireworks
      fw_launch: ['fw_launch.mp3', 'A firework rocket launch: a thread zipping fast up through cloth with a soft rising whistle, dry abrupt end, 0.6 seconds', 0.8, 'dash'],
      fw_pop:    ['fw_pop.mp3',    'A distant firework burst: a muffled soft boom like thick cloth whumping, followed by a light crackle of tiny sparks, warm and round, 0.9 seconds', 0.8, 'burst'],
      fw_ring:   ['fw_ring.mp3',   'A bright firework burst: a sharp ting-pop like a wire hoop pulled taut, then a short glittering shimmer fading quickly, 0.9 seconds', 0.8, 'xstitch'],
      fw_willow: ['fw_willow.mp3', 'A willow firework: one soft pop at the start, then a long gentle falling glitter of sparkles raining down and fading, 1.8 seconds', 0.8, 'silk'],
      fw_cross:  ['fw_cross.mp3',  'A crossette firework: one pop at the start, a short pause, then a rapid cluster of seven small sharp crackling snaps, 0.9 seconds', 0.8, 'xstitch'],
      fw_finale: ['fw_finale.mp3', 'A fireworks finale volley: six quick rocket whooshes one after another, then five booming bursts in rapid succession with crackle, 1.5 seconds', 0.8, 'burst'],
      fw_crown:  ['fw_crown.mp3',  'The biggest firework of the show: a deep warm boom, a bright plucked harp chord blooming over it, then a long shimmering glitter tail, 2 seconds', 1, 'chart'],
      fw_spark:  ['fw_spark.mp3',  'One tiny soft firework pop with a brief delicate sparkle, 0.5 seconds', 0.5, 'silk']
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
  const GAP = { graze: 90, xstitch: 280, deflect: 120, armour: 70, tcut: 180, hit: 40, dust: 35, kill: 30, ui_tap: 60 };   // least milliseconds between two plays of one sound
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
      this.keys = {}; this.pointer = null; this.steer = null; this.aim = null; this.tap2 = null; this.touch = false; this.one = { notion: -1, special: false, dash: 0 }; this.lastTap = 0; this.lastKey = { code: '', t: 0 };
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
    buzz(pattern) { if (this.profile.settings.haptics !== false && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* not allowed here */ } } }
    music() {   // pick the track for where the player is
      const s = this.sim, st = this.state;
      const boss = s && s.boss ? (s.panel >= 7 ? 'final' : s.panel >= 4 ? 'boss2' : 'boss') : null;
      const t = !this.profile.settings.sound ? null : (st === 'flight' || st === 'paused' || st === 'tally') && s ? (boss || (s.sampler ? 'bonus' : 'flight')) : (st === 'hem' || st === 'route') ? 'hideout' : 'menu';
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
      this.store.record({ mender: this.profile.mender, needle: r.needle, stitches: r.stitches, reached: r.reached, won: r.won, date: new Date().toISOString().slice(0, 10) });
    }

    // ---------- flow ----------
    toTitle() { this.state = 'title'; this.sim = null; this.midNight = false; this.ui.hudVisible(false); this.renderer.clear(); if (this.slot < 0) this.ui.title(); else this.ui.menu(); }
    toPockets() { this.state = 'title'; this.sim = null; this.ui.hudVisible(false); this.ui.pockets(); }
    openHem(mid) { this.state = 'hem'; this.midNight = !!mid; this.visit = {}; this.ui.hudVisible(false); if (mid) this.keep('hem'); this.ui.hem(); }
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
    flyPatch(id) { if (!this.sim) return; this.sim.setPatch(id); this.midNight = false; this.fly(); }
    fly() {
      // first ever flight: a short lesson that waits for you to do each thing
      if (this.sim && this.profile.stats.nights === 0 && this.sim.panel === 0 && this.sim.row === 0 && !(this.profile.codex.taught)) this.tutor = { step: 0, t: 0, moved: 0, up: 0, slow: 0, x: null, y: null };
      this.sfx('ui_start');
      this.sim.startStage(); this.keep('stage'); this.state = 'flight'; this.ui.hide(); this.ui.hudVisible(true); this.acc = 0; this.steer = null; this.aim = null; this.tap2 = null; this.pump(); this.ui.hud(this.sim); requestAnimationFrame(() => this.renderer.resize()); }
    depart() { if (this.midNight && this.sim) { this.state = 'route'; this.ui.route(); } else this.beginNight(); }
    continueNight() {
      const res = this.sim && this.sim.result;
      if (!res || res.kind === 'snap' || res.last) { this.sim = null; this.renderer.clear(); this.openHem(false); return; }
      const nx = this.sim.advance();
      if (nx === 'hem') { this.renderer.clear(); this.openHem(true); } else this.fly();
    }
    takePocket(id) { if (ST.shop.buyNotion(this.profile, id, null).ok) { this.sfx('buy'); this.saved(); this.ui.tally(this.sim.result, null); } }
    pause() { if (this.state === 'flight') { this.state = 'paused'; this.ui.pause(); } }
    resume() { if (this.state === 'paused') { this.state = 'flight'; this.ui.hide(); this.last = 0; } }
    abandon() { if (this.sim) { if (!this.sim.record) this.sim.closeNight(false); this.closeBook(); this.profile.run = null; this.saved(); } this.sim = null; this.renderer.clear(); this.openHem(false); }
    useNotion(i) { this.one.notion = i; }
    special() { this.one.special = true; }

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
        notion: this.one.notion, dash: this.one.dash, special: this.one.special,
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
            this.one.notion = -1; this.one.special = false; this.one.dash = 0;
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
            } else { ui.banner(e.keeper ? e.label : e.panelName + ' \u00b7 ' + e.label, e.keeper ? e.panelName + ' \u00b7 Boss' : e.sampler ? 'They never shoot back. Get them all.' : e.patch, 1800); if (e.keeper) this.sfx('phase'); }
            this.hudNow = true; break; }
          case 'fire': { const b = e.src === 'B', key = b ? 'b' : 'l'; if (!fired[key]) { fired[key] = true; const n = e.thread === 'running' || e.thread === 'couching' ? 'fire' : 'fire_' + e.thread; if (e.thread !== 'couching') this.sfx(n, b ? 0.6 : 1, (b ? 1.3 : 1) * (0.97 + Math.random() * 0.06)); } break; }   // a touch of pitch drift so steady fire never sounds like a machine
          case 'hit': case 'bosshit': this.sfx('hit'); break;
          case 'uncase': this.sfx('armour'); break;
          case 'guard': case 'bossblock': this.sfx('deflect'); break;
          case 'dash': this.sfx('dash'); this.buzz(12); if (this.tutor) this.tutor.dashed = true; break;
          case 'graze': this.sfx('graze'); break;
          case 'xstitch': this.sfx('xstitch'); break;
          case 'tcut': this.sfx('tcut'); break;
          case 'cue': { const n = CUE_SFX[e.boss + ':' + e.cue] || CUE_SFX[e.cue]; if (n) this.sfx(n); if (e.cue === 'stun') { this.buzz(25); this.duck(1); } break; }
          case 'kill': this.sfx('kill'); if (e.mult > 1 || e.pts >= 200) ui.floater(r.project(e.x, e.y), '+' + e.pts, e.mult > 1 ? 'hot' : ''); break;
          case 'dust': this.sfx('dust'); break;
          case 'silk': this.sfx('silk'); ui.floater(r.project(sim.player.x, 2.6), '+' + e.v + (e.v === 1 ? ' gem' : ' gems'), 'silk'); break;
          case 'charm': this.sfx('charm', e.up ? 1.15 : 1, e.up ? 1.2 : 1); if (e.up) this.buzz(20); ui.toast(e.name, e.desc); break;
          case 'chart': this.sfx('chart'); ui.toast('Blueprint found', 'Unlocks ' + e.unseals + ' in the hideout'); break;
          case 'packet': this.sfx('charm'); ui.toast('Item found', e.name); break;
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
          case 'burst': this.sfx('burst'); break;
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
