import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const name of ['recovery-bed','archive-desk','service-console','radio','task-lamp']) {
    const file = fs.readFileSync(new URL(`../assets/models/${name}.glb`, import.meta.url));
    assert.equal(file.readUInt32LE(0), 0x46546c67, `${name}: GLB header`);
    assert.equal(file.readUInt32LE(4), 2);
    assert.equal(file.readUInt32LE(8), file.length);
    const jsonLength = file.readUInt32LE(12);
    const gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
    const binaryOffset = 20 + jsonLength;
    assert.equal(file.readUInt32LE(binaryOffset + 4), 0x004e4942);
    assert.equal(gltf.buffers.length, 1);
    assert.ok(!gltf.buffers[0].uri, `${name}: self-contained asset`);
    assert.equal(gltf.buffers[0].byteLength, file.readUInt32LE(binaryOffset));
    assert.ok(gltf.meshes.length >= 3 && gltf.meshes.length <= 9, `${name}: merged material batches`);
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
        const position = gltf.accessors[primitive.attributes.POSITION];
        const normal = gltf.accessors[primitive.attributes.NORMAL];
        assert.equal(position.count, normal.count);
        assert.ok(position.count > 0 && position.count % 3 === 0);
        for (const i of [0,1,2]) assert.ok(Number.isFinite(position.min[i]) && position.min[i] <= position.max[i]);
    }
    for (const view of gltf.bufferViews) assert.ok(view.byteOffset + view.byteLength <= gltf.buffers[0].byteLength);
}
console.log('PASS: five self-contained GLB props, valid geometry buffers and merged materials');
