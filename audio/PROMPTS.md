# Audio to generate

Put each file at the path shown, under `audio/`. Until a file exists the game uses its built-in synth sound.

| Used for | File | Prompt |
|---|---|---|
| fire | `audio/fire.mp3` | Soft quick pluck of a taut cotton thread, short, dry, close-miked, 0.2 seconds |
| kill | `audio/kill.mp3` | Small fabric rip followed by a soft woolly puff, light and satisfying, 0.4 seconds |
| hit | `audio/hit.mp3` | Needle tapping through thick felt, muted thud, 0.15 seconds |
| dust | `audio/coin.mp3` | Tiny bright metallic button clink, single coin pickup, 0.2 seconds |
| silk | `audio/gem.mp3` | Gentle glassy chime with a silky shimmer tail, reward pickup, 0.8 seconds |
| hurt | `audio/hurt.mp3` | Thick yarn snapping under tension with a low thump, 0.5 seconds |
| snap | `audio/gameover.mp3` | A taut string breaking and whipping loose, then a low descending cello note, 2 seconds |
| charm | `audio/powerup.mp3` | Rising harp glissando, three bright notes, cheerful, 0.6 seconds |
| chart | `audio/blueprint.mp3` | Paper unfolding followed by a warm four-note music-box flourish, 1.2 seconds |
| buy | `audio/buy.mp3` | Wooden drawer sliding shut with a brass latch click and a soft coin jingle, 0.6 seconds |
| keeper | `audio/bossdown.mp3` | Large tapestry tearing apart, heavy cloth collapsing, then a triumphant plucked chord, 2.5 seconds |
| lance | `audio/laser.mp3` | Metal wire drawn taut and released, bright zinging whip, 0.5 seconds |
| burst | `audio/bomb.mp3` | Muffled pop of a stuffed cushion bursting, soft debris, 0.6 seconds |
| phase | `audio/bossphase.mp3` | Deep ominous bowed double-bass swell with fluttering moth wings, 1.5 seconds |
| menu | `audio/music_menu.mp3` | Calm night-time lullaby for plucked harp, music box and soft strings, slow 3/4, cosy and a little mysterious, seamless loop |
| hideout | `audio/music_hideout.mp3` | Warm workshop tune: pizzicato strings, upright piano and soft hand percussion, relaxed mid-tempo, seamless loop |
| flight | `audio/music_flight.mp3` | Driving arcade shooter theme played on pizzicato strings, dulcimer and brushed drums with a retro synth bass, 140 bpm, upbeat and determined, seamless loop |
| bonus | `audio/music_bonus.mp3` | Playful fast waltz for music box, glockenspiel and pizzicato strings, bright and bouncy, seamless loop |
| boss | `audio/music_boss.mp3` | Tense boss battle theme: aggressive bowed cello ostinato, pounding toms, plucked strings and dark synth, 160 bpm, seamless loop |

## Status

All 19 files have been generated, trimmed, levelled and exported with these exact names in the ElevenLabs flow
"String Theory game audio" (flow id `hBzYOSiXZ7ujABbLIh90`). They are not in this repo yet: the build session had no
outbound network, so it could not download them. Copy the 19 MP3s into this folder and the game uses them with no code change.
