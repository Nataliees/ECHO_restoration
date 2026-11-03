# Original ECHO props

These nine meshes were authored for ECHO with the reproducible generator
`tools/build-models.mjs`. No third-party model packs are used.

Run `node tools/build-models.mjs` from the project root to rebuild all GLBs.
Dimensions are metres. +Y is up; fronts face +Z. The radio and teddy bear are centred on their
interaction anchors; furniture origins are at floor level. The lamp origin is
its base. Meshes are merged by material and contain no external dependencies.

Runtime loading uses Three.js r160 GLTFLoader, BufferGeometryUtils and Reflector.
The Three.js MIT license is in `../vendor/THREE-LICENSE.txt`.
