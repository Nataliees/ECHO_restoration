# ECHO — third-party asset credits

## Three.js

Three.js r160, GLTFLoader and BufferGeometryUtils: Three.js authors,
MIT license. See `assets/vendor/THREE-LICENSE.txt`.

Other furniture, the toy, ECHO badges, procedural material textures and game
code were created for this project. No Mixamo Soldier or other Mixamo asset
is included.

## Jura interface typeface

Jura by the Jura Project authors, distributed under the SIL Open Font License
1.1. Source: https://github.com/google/fonts/tree/main/ofl/jura
Local font and license: `assets/fonts/Jura.ttf`, `assets/fonts/Jura-OFL.txt`.
The decorative menu frame is an original SVG created for ECHO.

## Background music

Remstage Music — In the house in a heartbeat. Audio file supplied by the project
user, retained unchanged as `assets/background_music.mp3`.

## Typewriter sound

Recording supplied by the project user as `zvuk-pishuschey-mashinki-1.mp3`,
retained as `assets/typewriter.mp3`. Six aligned keystroke excerpts were
extracted for per-character playback; see `tools/build-typewriter.py`.

## Daughter radio prelude

New daughter line supplied by the project user as
`ECHO___Daughter__When_are_you_coming__Daddy___matching_Daddy_line_.mp3`,
retained unchanged as `assets/prologue_daughter.mp3`.
Radio processing is applied at playback time.

## Accept ending cinematic

Video and hero voice recording supplied by the project user. The video stream
is retained unchanged in `assets/ending_accept.mp4`; the voice is embedded at
6 seconds, skipping 950 ms of leading room noise. The original voice recording
is retained unchanged as `assets/ending_accept_hero.mp3`. Rebuild the audio track
with `python tools/build-ending-accept.py`.
