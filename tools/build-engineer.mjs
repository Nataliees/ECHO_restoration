// Build a clothed articulated body from the CC0 MakeHuman base anatomy.
// No MakeHuman program code is used. Source and license are kept with the asset.
import fs from 'node:fs';
import * as T from '../assets/vendor/three.module.js';
const source=new URL('../assets/characters/makehuman/base.obj',import.meta.url);
const v=[],uv=[],faces=[];let group='';
for(const line of fs.readFileSync(source,'utf8').split('\n')){
 const a=line.trim().split(/\s+/);
 if(a[0]==='v')v.push(a.slice(1,4).map(Number));
 if(a[0]==='vt')uv.push(a.slice(1,3).map(Number));
 if(a[0]==='g')group=a[1];
 if(a[0]==='f'&&group==='body'){const face=a.slice(1).map(s=>s.split('/').map(x=>Number(x)-1));for(let i=1;i<face.length-1;i++)faces.push([face[0],face[i],face[i+1]]);}
}
const scale=1.82/(8.491+8.168), floor=-8.168;
const world=p=>new T.Vector3(p[0]*scale,(p[1]-floor)*scale,p[2]*scale);
const parts=new Map();
const pivots={torso:new T.Vector3(), 'arm-1':world([1.677,5.246,.146]),'arm--1':world([-1.677,5.246,.146]),'leg-1':world([.98,.7,.145]),'leg--1':world([-.98,.7,.145])};
const rotations={};
for(const s of [-1,1]){
 const shoulder=new T.Vector3(s*1.677,5.246,.146),elbow=new T.Vector3(s*3.129,3.493,.132),wrist=new T.Vector3(s*4.18,2.7,1.4);
 const upperQ=new T.Quaternion().setFromUnitVectors(elbow.clone().sub(shoulder).normalize(),new T.Vector3(s*.22,-1,.04).normalize());
 const movedElbow=elbow.clone().sub(shoulder).applyQuaternion(upperQ).add(shoulder);
 const lowerQ=new T.Quaternion().setFromUnitVectors(wrist.clone().sub(elbow).normalize(),new T.Vector3(s*.12,-1,.075).normalize());
 rotations[`arm-${s}`]={shoulder,elbow,movedElbow,upperQ,lowerQ};
 rotations[`leg-${s}`]=new T.Quaternion().setFromUnitVectors(new T.Vector3(s*.6,-7.5,0).normalize(),new T.Vector3(s*.08,-7.5,0).normalize());
}
function classify(p){const [x,y]=p,s=x<0?-1:1;
 if(Math.abs(x)>1.65&&y>.68)return [`arm-${s}`,Math.abs(x)>4.22&&y<2.7?'skin':'coat'];
 if(y<.68)return [`leg-${s}`,y<-7?'leather':'trousers'];
 return ['torso','coat'];
}
function move(raw,part,material){
 let p=new T.Vector3(...raw);
 if(part.startsWith('arm')){
  const {shoulder,elbow,movedElbow,upperQ,lowerQ}=rotations[part];
  const upper=p.clone().sub(shoulder).applyQuaternion(upperQ).add(shoulder);
  const lower=p.clone().sub(elbow).applyQuaternion(lowerQ).add(movedElbow);
  const t=T.MathUtils.smoothstep(raw[1],elbow.y-.35,elbow.y+.35);
  p=lower.lerp(upper,t);
 }else if(part.startsWith('leg')){
  const pivot=new T.Vector3(raw[0]<0?-.98:.98,.7,.145);p.sub(pivot).applyQuaternion(rotations[part]).add(pivot);
 }
 let point=world(p.toArray()).sub(pivots[part]);
 if(material==='coat'){
  // A loose work jacket covers the anatomical body. Reduce breast/pectoral relief,
  // broaden the waist slightly and add restrained fabric folds at joints.
  if(part==='torso'){
   const y=(raw[1]-floor)*scale;
   const extra=T.MathUtils.clamp((1.4-y)*.025,0,.018);
   point.x*=1.1;point.x+=Math.sign(point.x)*extra;
   point.z=point.z*.93+Math.sign(point.z-.02)*.018;
   if(point.z>.115&&y>1.1&&y<1.51)point.z=.145+Math.cos(point.x*4)*.018;
  }else{point.x+=Math.sign(point.x)*.009;point.z+=Math.sign(point.z)*.009;}
  point.z+=Math.sin(raw[1]*7+raw[0]*1.7)*.0025;
 }
 if(material==='trousers'){point.x*=1.04;point.z+=Math.sign(point.z)*.009;point.z+=Math.sin(raw[1]*8)*.0025;}
 if(material==='leather')point.z+=Math.sign(point.z)*.012;
 return point;
}
for(const face of faces){
 const points=face.map(([i])=>v[i]);const center=points.reduce((p,q)=>p.map((x,i)=>x+q[i]/3),[0,0,0]);
 // The head is supplied by a separate scanned asset; anatomy is fully clothed.
 if(center[1]>6.23)continue;
 const [part,material]=classify(center),key=part+':'+material;
 if(material==='leather')continue; // Feet are covered by purpose-built work boots.
 if(!parts.has(key))parts.set(key,{part,material,positions:[],uvs:[]});const batch=parts.get(key);
 for(const [i,t] of face){batch.positions.push(...move(v[i],part,material).toArray());batch.uvs.push(...(uv[t]||[0,0]));}
}
const gltf={asset:{version:'2.0',generator:'ECHO / CC0 MakeHuman adaptation',copyright:'MakeHuman base mesh: CC0 (2020 Data Collection AB, Joel Palmius, Jonas Hauquier). ECHO clothing adaptations.'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]};
const chunks=[];let offset=0;
function attr(array,size,bounds=false){const f=new Float32Array(array),b=Buffer.from(f.buffer),view=gltf.bufferViews.length;
 gltf.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length,target:34962});chunks.push(b);offset+=b.length;
 const a={bufferView:view,componentType:5126,count:array.length/size,type:size===3?'VEC3':'VEC2'};
 if(bounds){a.min=Array(size).fill(Infinity);a.max=Array(size).fill(-Infinity);array.forEach((n,i)=>{a.min[i%size]=Math.min(a.min[i%size],n);a.max[i%size]=Math.max(a.max[i%size],n);});}
 gltf.accessors.push(a);return gltf.accessors.length-1;
}
const colors={coat:0x424d47,trousers:0x343d3b,leather:0x242723,skin:0xbaa28b},mats={};
for(const [name,hex]of Object.entries(colors)){const c=new T.Color(hex);mats[name]=gltf.materials.length;gltf.materials.push({name,pbrMetallicRoughness:{baseColorFactor:[c.r,c.g,c.b,1],roughnessFactor:name==='skin'?.78:.9,metallicFactor:0},doubleSided:true});}
for(const [part,pivot]of Object.entries(pivots)){
 const node={name:part==='torso'?'engineer-torso':`engineer-${part}`,translation:pivot.toArray(),children:[]};const nodeIndex=gltf.nodes.length;gltf.nodes.push(node);gltf.scenes[0].nodes.push(nodeIndex);
 for(const b of parts.values())if(b.part===part){
  const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));
  // Smooth normals are computed on a welded copy so body parts do not look faceted.
  const normals=new Float32Array(b.positions.length),sums=new Map();
  for(let i=0;i<b.positions.length;i+=9){const a=new T.Vector3(...b.positions.slice(i,i+3)),bb=new T.Vector3(...b.positions.slice(i+3,i+6)),c=new T.Vector3(...b.positions.slice(i+6,i+9));const n=bb.sub(a).cross(c.sub(a));for(let j=0;j<3;j++){const k=b.positions.slice(i+j*3,i+j*3+3).map(x=>x.toFixed(6)).join(',');if(!sums.has(k))sums.set(k,new T.Vector3());sums.get(k).add(n);}}
  for(let i=0;i<b.positions.length;i+=3){const k=b.positions.slice(i,i+3).map(x=>x.toFixed(6)).join(',');sums.get(k).clone().normalize().toArray(normals,i);}
  gltf.meshes.push({name:part+'-'+b.material,primitives:[{attributes:{POSITION:attr(b.positions,3,true),NORMAL:attr([...normals],3),TEXCOORD_0:attr(b.uvs,2)},material:mats[b.material]}]});
  node.children.push(gltf.nodes.length);gltf.nodes.push({mesh:gltf.meshes.length-1,name:part+'-'+b.material});geom.dispose();
 }
}
gltf.buffers[0].byteLength=offset;let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
const bin=Buffer.concat(chunks),h=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+json.length+bin.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(new URL('../assets/characters/engineer-body.glb',import.meta.url),Buffer.concat([h,jh,json,bh,bin]));console.log('Body generated:',bin.length,'bytes');
