# ECHO — third-party asset credits

## Lee Perry-Smith / Infinite-Realities head scan

Original scan and skin maps: **Lee Perry-Smith, Infinite-Realities**.
License: **Creative Commons Attribution 3.0 Unported (CC BY 3.0)**.

- Original distribution credited by Three.js: https://casual-effects.com/data/
- Three.js example: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_normalmap.html
- Asset source: https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/LeePerrySmith
- License: https://creativecommons.org/licenses/by/3.0/

Files: `assets/characters/lee-perry-smith/`.
ECHO adaptations: scaled and cropped at runtime to fit the engineer's collar;
eye openings adapted and separate eyes/eyelids added; PBR materials and normal
mapping configured; attached to the player-controlled head pivot. These are
adaptations, not an endorsement by the scan author.

## MakeHuman anatomical base

Base mesh: **MakeHuman project**, released as **CC0 1.0 Universal** in September
2020. Copyright holders identified by the original file: Data Collection AB,
Joel Palmius and Jonas Hauquier.

- Source: https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj
- Asset license: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md
- Local license: `assets/characters/makehuman/LICENSE.txt`

Only the CC0 graphical base mesh is used, not MakeHuman application code.
ECHO adaptations: clothed body, neutral arm/leg pose, articulated mesh sections,
workwear geometry and materials. Rebuild using `node tools/build-engineer.mjs`.

## Three.js

Three.js r160, GLTFLoader, BufferGeometryUtils and Reflector: Three.js authors,
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
