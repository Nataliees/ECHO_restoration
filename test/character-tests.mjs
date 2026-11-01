import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../assets/characters/',import.meta.url);
const sums=JSON.parse(fs.readFileSync(new URL('SHA256.json',root),'utf8'));
for(const [name,hash]of Object.entries(sums))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name,root))).digest('hex'),hash,`character asset changed: ${name}`);
function read(name){const b=fs.readFileSync(new URL(name,root));assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));}
const body=read('engineer-body.glb'),scan=read('lee-perry-smith/head.glb');
for(const name of ['engineer-arm-1','engineer-arm--1','engineer-leg-1','engineer-leg--1'])assert.ok(body.nodes.some(n=>n.name===name),`missing articulation: ${name}`);
for(const mesh of body.meshes)for(const p of mesh.primitives){
 const a=body.accessors[p.attributes.POSITION];assert.ok(a.count>0);
 for(const v of [...a.min,...a.max])assert.ok(Number.isFinite(v)&&Math.abs(v)<2,'invalid anatomical scale');
 assert.equal(a.count,body.accessors[p.attributes.NORMAL].count);
 assert.equal(a.count,body.accessors[p.attributes.TEXCOORD_0].count);
}
assert.ok(scan.meshes[0].primitives[0].attributes.TEXCOORD_0!==undefined,'scan needs authored skin UVs');
assert.match(fs.readFileSync(new URL('makehuman/base.obj',root),'utf8').slice(0,400),/released as CC0/);
console.log('PASS: character source checksums, anatomical scale, articulated limbs and scan texture UVs');
