// Original ECHO props. Run: node tools/build-models.mjs (no npm dependencies).
import * as T from '../assets/vendor/three.module.js';
import fs from 'node:fs';
const out = new URL('../assets/models/', import.meta.url);
fs.mkdirSync(out, {recursive:true});
const paints = {
    steel: [0x64716a,.62,.5], dark: [0x202b29,.45,.6], enamel: [0x9aa89d,.25,.48],
    brass: [0x92794c,.7,.4], cloth: [0x7e8c7d,0,.98], rubber: [0x171e1c,0,.95],
    screen: [0x6db9b1,.15,.3,0x28544c], ivory: [0xc6ba95,0,.9], red: [0x994c3c,.2,.5]
};
let root;
function part(geo, color, pos=[0,0,0], rotation=[0,0,0]) {
    const m=new T.Mesh(geo);m.userData.paint=color;m.position.set(...pos);m.rotation.set(...rotation);root.add(m);return m;
}
function rounded(pos,size,color='steel',r=.04) {
    const [w,h,d]=size, radius=Math.min(r,w/3,h/3,d/3);
    const x=-w/2+radius, y=-h/2+radius, a=w/2-radius,b=h/2-radius;
    const s=new T.Shape();s.moveTo(x,y-radius);s.lineTo(a,y-radius);s.quadraticCurveTo(a+radius,y-radius,a+radius,y);
    s.lineTo(a+radius,b);s.quadraticCurveTo(a+radius,b+radius,a,b+radius);s.lineTo(x,b+radius);
    s.quadraticCurveTo(x-radius,b+radius,x-radius,b);s.lineTo(x-radius,y);s.quadraticCurveTo(x-radius,y-radius,x,y-radius);
    const bevel=Math.min(radius*.45,d/4);
    const geo=new T.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:4});
    geo.translate(0,0,-d/2+bevel);return part(geo,color,pos);
}
function rod(a,b,r=.025,color='steel') {
    const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
    const obj=part(new T.CylinderGeometry(r,r,delta.length(),12),color,start.add(end).multiplyScalar(.5).toArray());
    obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return obj;
}
function cable(points,r=.014,color='rubber') {
    return part(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,6,false),color);
}
function dial(pos,r=.06,color='brass') {
    return part(new T.CylinderGeometry(r,r,.045,20),color,pos,[Math.PI/2,0,0]);
}
function lathe(pos,profile,color) {return part(new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),24),color,pos);}
function model(name,build){root=new T.Group();build();root.updateMatrixWorld(true);writeGLB(name,root);}
function writeGLB(name,group) {
    // Bake and merge by material: detailed props stay inexpensive to render.
    const batches=new Map();group.traverse(o=>{
        if(!o.isMesh)return;
        const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
        const key=o.userData.paint;
        if(!batches.has(key))batches.set(key,{pos:[],norm:[]});
        batches.get(key).pos.push(...g.attributes.position.array);batches.get(key).norm.push(...g.attributes.normal.array);g.dispose();
    });
    const gltf={asset:{version:'2.0',generator:'ECHO original prop builder'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]};
    const chunks=[];let offset=0;
    function attribute(data,bounds){
        const values=new Float32Array(data);const buffer=Buffer.from(values.buffer);const view=gltf.bufferViews.length;
        gltf.bufferViews.push({buffer:0,byteOffset:offset,byteLength:buffer.length,target:34962});chunks.push(buffer);offset+=buffer.length;
        const item={bufferView:view,componentType:5126,count:data.length/3,type:'VEC3'};
        if(bounds){item.min=[Infinity,Infinity,Infinity];item.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i++){const c=i%3;item.min[c]=Math.min(item.min[c],data[i]);item.max[c]=Math.max(item.max[c],data[i]);}}
        gltf.accessors.push(item);return gltf.accessors.length-1;
    }
    for(const [key,data] of batches){
        const [hex,metal,rough,emit]=paints[key],color=new T.Color(hex),e=new T.Color(emit||0);
        const material=gltf.materials.length;
        gltf.materials.push({name:key,pbrMetallicRoughness:{baseColorFactor:[color.r,color.g,color.b,1],metallicFactor:metal,roughnessFactor:rough},emissiveFactor:[e.r,e.g,e.b]});
        gltf.meshes.push({name:`${name}-${key}`,primitives:[{attributes:{POSITION:attribute(data.pos,true),NORMAL:attribute(data.norm,false)},material}]});
        gltf.nodes.push({mesh:gltf.meshes.length-1,name:`${name}-${key}`});gltf.scenes[0].nodes.push(gltf.nodes.length-1);
    }
    gltf.buffers[0].byteLength=offset;
    let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
    const bin=Buffer.concat(chunks);const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
    header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+bin.length,8);
    jh.writeUInt32LE(json.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
    fs.writeFileSync(new URL(`${name}.glb`,out),Buffer.concat([header,jh,json,bh,bin]));console.log(name,Math.round((json.length+bin.length)/1024)+' KiB');
    group.traverse(o=>o.geometry?.dispose());
}
model('recovery-bed',()=>{
    // Origin: floor below the centre of the bed, head toward +Z.
    rounded([0,.43,0],[1.3,.22,2.22],'dark',.09);
    rounded([0,.61,-.18],[1.24,.2,1.7],'cloth',.1);
    rounded([0,.79,.82],[1.24,.19,.73],'cloth',.1).rotation.x=-.33;
    rounded([0,.93,.86],[.88,.14,.38],'ivory',.08);
    for(const x of [-.49,.49])for(const z of [-.84,.84]){
        rod([x,.17,z],[x,.43,z],.045);rod([x-.05,.14,z],[x+.05,.14,z],.025);
        part(new T.TorusGeometry(.075,.028,6,16),'rubber',[x,.12,z],[0,Math.PI/2,0]);
    }
    for(const x of [-.7,.7]){
        cable([[x,.56,-.86],[x,.93,-.82],[x,1.02,-.5],[x,1.02,.45],[x,.9,.6],[x,.56,.65]],.027,'steel');
        for(const z of [-.55,.3])rod([x,.6,z],[x,1.01,z],.018);
    }
    for(let i=0;i<5;i++)rounded([0,.72,-.76+i*.27],[1.15,.012,.013],'enamel',.003);
    cable([[-.52,.5,.9],[-.83,.4,.95],[-.85,.17,.3],[-.7,.1,-.35]],.018);
    rounded([.37,.44,-1.13],[.37,.13,.035],'enamel',.015);
});
model('archive-desk',()=>{
    rounded([0,.95,0],[2.2,.12,1.25],'enamel',.045);
    rounded([0,.88,0],[2.08,.08,1.12],'dark',.025);
    for(const x of [-.89,.89]){
        rounded([x,.44,.05],[.4,.82,1.02],'steel',.035);
        for(const y of [.22,.48,.74]){
            rounded([x,y,.58],[.36,.22,.05],'dark',.012);
            rod([x-.09,y+.02,.625],[x+.09,y+.02,.625],.014,'brass');
            rounded([x,y-.055,.612],[.13,.035,.012],'ivory',.003);
        }
        for(const z of [-.4,.4])rod([x,.04,z],[x,.16,z],.04);
    }
    rod([-.7,.25,-.4],[.7,.25,-.4],.024);
    for(let i=0;i<5;i++)rounded([.62+i*.008,1.018+i*.009,.13],[.4,.008,.29],'ivory',.004).rotation.y=.16;
    // Rear presentation board, offset to line up with the drawing.
    rounded([.05,1.72,-.73],[1.7,1.65,.075],'dark',.035);
    for(const x of [-.73,.83])rod([x,1,-.67],[x,2.45,-.67],.015,'brass');
    for(const x of [-.65,.75])for(const y of [1.08,2.36])dial([x,y,-.674],.016,'brass');
});
model('service-console',()=>{
    rounded([0,.49,0],[2.1,.94,.9],'steel',.08);
    rounded([0,1,0],[2.2,.09,1],'enamel',.035);
    rounded([0,.51,.47],[1.83,.72,.045],'dark',.02);
    for(const x of [-.66,.66]){
        for(let i=0;i<8;i++)rounded([x,.29+i*.06,.505],[.31,.017,.025],'steel',.003);
        dial([x,.8,.515],.028);
    }
    rounded([0,.55,.51],[.5,.38,.035],'enamel',.02);
    for(const x of [-.15,0,.15])dial([x,.56,.55],.034,x===0?'red':'brass');
    for(const x of [-.87,.87])for(const z of [-.31,.31])rod([x,.03,z],[x,.14,z],.045);
    cable([[.88,.25,.4],[1,.15,.6],[.8,.045,.75],[.3,.045,.7]],.02);
});
model('radio',()=>{
    rounded([0,0,0],[.86,.52,.27],'steel',.04);
    rounded([0,0,.15],[.79,.45,.035],'dark',.022);
    rounded([-.1,.09,.178],[.4,.18,.015],'screen',.012);
    for(let i=0;i<10;i++)rounded([-.27+i*.032,-.115,.18],[.012,.105,.008],'steel',.002);
    for(const x of [.2,.3])dial([x,.07,.19],.042);
    dial([.27,-.155,.2],.07,'red');
    rod([-.34,.25,-.03],[-.39,.82,-.06],.009,'steel');
    cable([[-.3,.21,0],[-.27,.36,0],[.25,.36,0],[.3,.21,0]],.024,'rubber');
    cable([[.42,-.12,0],[.53,-.2,.1],[.52,-.3,.23],[.3,-.3,.26]],.012);
    for(const x of [-.34,.34])for(const y of [-.2,.2])dial([x,y,.184],.012);
    // Scale marks on the receiver display.
    for(let i=0;i<9;i++)rounded([-.27+i*.04,.08,.19],[.004,i%2?.045:.07,.004],'ivory',.001);
});
model('task-lamp',()=>{
    lathe([0,0,0],[[.14,0],[.16,.025],[.15,.045],[.08,.07]],'dark');
    rod([0,.05,0],[0,.35,0],.021,'brass');
    rod([0,.35,0],[.13,.6,-.02],.018,'steel');
    dial([0,.35,.02],.043);
    lathe([.13,.6,-.02],[[.2,0],[.19,.035],[.12,.17],[.06,.21],[.025,.22]],'brass');
    part(new T.SphereGeometry(.055,12,8),'ivory',[.13,.62,-.02]);
    cable([[0,.02,-.08],[-.07,.012,-.2],[-.1,.01,-.32],[.08,.01,-.4]],.009);
});
model('archive-rack',()=>{
    for(const x of [-.65,.65])rounded([x,1.35,0],[.09,2.7,.6],'steel',.02);
    rounded([0,1.35,-.28],[1.3,2.7,.06],'dark',.02);
    for(const y of [.12,.73,1.34,1.95,2.62])rounded([0,y,0],[1.3,.07,.6],'enamel',.015);
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){
        const x=-.49+col*.245,y=.43+row*.61;
        rounded([x,y,.04],[.19,.46,.43],col%3===0?'ivory':'dark',.015);
        rounded([x,y+.04,.265],[.1,.16,.008],'enamel',.002);
        dial([x,y-.12,.28],.019,'brass');
    }
});
model('lab-terminal',()=>{
    rounded([0,.5,0],[1.45,.92,.78],'steel',.06);
    rounded([0,1,0],[1.65,.1,.95],'enamel',.035);
    for(const x of [-.58,.58])rod([x,1,-.3],[x,1.85,-.3],.025);
    rounded([0,1.45,-.33],[1.42,.84,.12],'dark',.04);
    rounded([-.38,1.49,-.255],[.45,.53,.012],'screen',.012);
    for(let i=0;i<6;i++)rounded([-.38,1.32+i*.06,-.245],[.32,.008,.005],'ivory',.001);
    for(const x of [-.5,.5])dial([x,.68,.414],.055);
    for(let i=0;i<7;i++)rounded([-.36+i*.12,.34,.41],[.06,.13,.02],'dark',.006);
    cable([[.6,.8,.4],[.8,.55,.48],[.7,.1,.5],[.4,.05,.5]],.015);
});
model('restoration-pod',()=>{
    rounded([0,.2,0],[1.65,.28,2.6],'dark',.12);
    rounded([0,.43,-.1],[1.37,.2,2.2],'enamel',.12);
    rounded([0,.58,-.1],[1.13,.16,1.96],'cloth',.09);
    rounded([0,.72,-.72],[.85,.17,.4],'ivory',.07);
    for(const z of [-.98,1.02]){
        cable([[-.78,.3,z],[-.79,1.6,z],[-.55,2.12,z],[0,2.3,z],[.55,2.12,z],[.79,1.6,z],[.78,.3,z]],.08,'steel');
        cable([[-.66,.75,z],[-.66,1.6,z],[-.45,2,z],[0,2.13,z],[.45,2,z],[.66,1.6,z]],.018,'screen');
    }
    for(const x of [-.8,.8])rod([x,.3,-.98],[x,.3,1.02],.045,'brass');
    rounded([.81,1.15,.64],[.14,.45,.4],'dark',.035);
    rounded([.89,1.18,.65],[.015,.27,.26],'screen',.008);
    cable([[-.8,.45,-1],[-.9,.15,-1.2],[-.65,.04,-1.4],[.2,.04,-1.4]],.025);
});
model('memory-bear',()=>{
    const sphere=(p,scale,color)=>{const m=part(new T.SphereGeometry(1,20,14),color,p);m.scale.set(...scale);return m;};
    sphere([0,-.045,0],[.15,.18,.11],'cloth');
    sphere([0,.17,0],[.155,.145,.125],'cloth');
    for(const x of [-.125,.125]){sphere([x,.285,0],[.06,.064,.04],'cloth');sphere([x,.285,.031],[.034,.036,.014],'ivory');}
    sphere([0,.13,.11],[.09,.065,.04],'ivory');
    sphere([0,.16,.148],[.024,.018,.014],'rubber');
    for(const x of [-.055,.055])sphere([x,.21,.113],[.013,.014,.009],'rubber');
    for(const side of [-1,1]){
        sphere([side*.17,-.045,.015],[.065,.12,.065],'cloth');
        sphere([side*.1,-.19,.08],[.075,.06,.1],'cloth');
        sphere([side*.1,-.19,.16],[.044,.037,.019],'ivory');
    }
    rounded([0,.025,.12],[.075,.035,.02],'red',.009);
});
