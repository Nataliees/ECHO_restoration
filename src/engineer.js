import { cloneBody, createScannedHead } from './character-assets.js';
import { addHair } from './hair.js';
import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/utils/BufferGeometryUtils.js';

export function createEngineer() {
    const root=cloneBody();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#eceeed';ctx.fillRect(0,0,128,128);
    for(let i=0;i<128;i+=3){ctx.fillStyle='#dadddc';ctx.fillRect(i,0,1,128);ctx.fillRect(0,i,128,1);}
    const weave=new THREE.CanvasTexture(canvas);weave.colorSpace=THREE.SRGBColorSpace;weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(3,3);
    const coat=new THREE.MeshStandardMaterial({color:0xe4e7e9,map:weave,bumpMap:weave,bumpScale:.0005,roughness:.87,side:THREE.DoubleSide});
    const edge=new THREE.MeshStandardMaterial({color:0xc1c7cc,roughness:.94});
    const skin=new THREE.MeshStandardMaterial({color:0xb09883,roughness:.88});
    const shirt=new THREE.MeshStandardMaterial({color:0xf2f1e9,roughness:.95});
    const trousers=new THREE.MeshStandardMaterial({color:0x252b36,roughness:.9,map:weave});
    const leather=new THREE.MeshStandardMaterial({color:0x211e20,roughness:.48});
    const tieMaterial=new THREE.MeshStandardMaterial({color:0x34313b,roughness:.78});
    const metal=new THREE.MeshStandardMaterial({color:0x8e9a9d,roughness:.4,metalness:.6});
    const ink=new THREE.MeshStandardMaterial({color:0x3b4550,roughness:.7});
    const upper=new THREE.Group();upper.name='engineer-upper-body';root.add(upper);
    function mesh(parent,geometry,material,pos=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...pos);parent.add(m);return m;}
    function oval(parent,pos,size,material){const m=mesh(parent,new THREE.SphereGeometry(1,24,16),material,pos);m.scale.set(...size);return m;}
    function box(parent,pos,size,material){return mesh(parent,new THREE.BoxGeometry(...size),material,pos);}
    function seam(parent,points,r=.001,material=edge){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),14,r,5,false),material);}
    function patch(parent,points,material){const p=[];for(let i=1;i<points.length-1;i++)p.push(...points[0],...points[i],...points[i+1]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return mesh(parent,g,material);}
    const replacements={coat,trousers,leather,skin};root.traverse(n=>{if(n.isMesh){const m=replacements[n.material.name];if(m){n.material.dispose();n.material=m;}}});
    const torso=root.getObjectByName('engineer-torso');upper.add(torso);
    // Long coat panels follow an elliptical silhouette, with a front opening and rear vent.
    const hems=[];
    for(const side of [-1,1]){
        const p=[],uv=[],idx=[],rows=18,cols=32;
        for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
            const t=i/rows,angle=(.055+j/cols*(Math.PI-.075))*side;
            const y=1.095-t*.49,width=.215+t*.067,depth=.16+t*.025;
            const fold=Math.sin(angle*7+t*2)*.003*Math.sin(t*Math.PI/2);
            p.push((width+fold)*Math.sin(angle),y,(depth+fold)*Math.cos(angle));uv.push(j/cols,t);
            if(i<rows&&j<cols){const a=i*(cols+1)+j,b=a+cols+1;idx.push(a,b,a+1,b,b+1,a+1);}
        }
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
        const m=mesh(root,g,coat);m.name=`lab-coat-hem-${side}`;m.castShadow=m.receiveShadow=true;hems.push({mesh:m,base:new Float32Array(p)});
        seam(upper,[[side*.2,1.38,.09],[side*.216,1.12,.105],[side*.235,1.015,.12]]);
        // Waist pocket, turned seam and a discreet rear belt.
        patch(upper,[[side*.09,1.02,.17],[side*.205,1.015,.15],[side*.21,.89,.167],[side*.095,.895,.19]],coat);
        seam(upper,[[side*.09,1.02,.172],[side*.205,1.015,.152],[side*.21,.89,.169],[side*.095,.895,.192]]);
    }
    box(upper,[0,1.385,.172],[.12,.33,.016],shirt);
    const tie=new THREE.Group();tie.name='engineer-tie';upper.add(tie);
    patch(tie,[[-.014,1.49,.185],[.014,1.49,.185],[.024,1.23,.188],[0,1.19,.192],[-.024,1.23,.188]],tieMaterial);
    oval(tie,[0,1.49,.19],[.022,.025,.012],tieMaterial);
    for(const s of [-1,1]){
        // White shirt collar inside broad, folded lapels.
        patch(upper,[[s*.006,1.535,.17],[s*.07,1.54,.16],[s*.064,1.46,.188],[s*.025,1.485,.198]],shirt).material.side=THREE.DoubleSide;
        patch(upper,[[s*.06,1.55,.145],[s*.15,1.49,.155],[s*.105,1.385,.19],[s*.035,1.43,.205]],coat);
        patch(upper,[[s*.105,1.385,.19],[s*.16,1.405,.174],[s*.018,1.22,.19],[s*.035,1.43,.205]],coat);
        seam(upper,[[s*.06,1.55,.146],[s*.15,1.49,.157],[s*.105,1.385,.192],[s*.018,1.22,.192]],.0012,edge);
    }
    for(const y of [1.22,1.065,.91,.755]){
        const z=y>1.09?.186:.187+(1.09-y)*.04;
        oval(root,[.022,y,z],[.008,.008,.003],ink);
        seam(root,[[-.006,y-.015,z-.001],[-.006,y+.015,z-.001]],.0008,edge);
    }
    box(upper,[0,1.06,-.147],[.27,.035,.014],coat);
    // Chest pocket, pens and a clipped ID card rather than military patches.
    box(upper,[-.13,1.36,.15],[.095,.09,.016],coat);
    seam(upper,[[-.18,1.4,.163],[-.08,1.4,.163]],.0012,edge);
    for(const x of [-.145,-.125]){box(upper,[x,1.425,.158],[.007,.065,.007],ink);box(upper,[x,1.44,.166],[.002,.022,.002],metal);}
    const id=document.createElement('canvas');id.width=512;id.height=256;const c=id.getContext('2d');
    c.fillStyle='#e9edef';c.fillRect(0,0,512,256);c.fillStyle='#567f8c';c.fillRect(0,0,512,46);c.fillStyle='#edf1f1';c.font='bold 30px sans-serif';c.fillText('ECHO',20,34);
    c.fillStyle='#bcc5cc';c.fillRect(22,69,110,135);c.fillStyle='#667782';c.beginPath();c.arc(77,112,25,0,Math.PI*2);c.fill();c.fillRect(45,143,64,55);
    c.fillStyle='#384954';c.font='25px sans-serif';c.fillText('ENGINEERING',153,100);c.font='21px monospace';c.fillText('RESTORATION',153,140);c.fillRect(154,179,283,4);c.fillRect(154,194,210,4);
    const badge=new THREE.CanvasTexture(id);badge.colorSpace=THREE.SRGBColorSpace;
    mesh(upper,new THREE.PlaneGeometry(.135,.0675),new THREE.MeshStandardMaterial({map:badge,roughness:.8}),[-.13,1.305,.177]);box(upper,[-.13,1.35,.18],[.024,.025,.007],metal);
    const head=createScannedHead();upper.add(head);
    const motion=new THREE.Group();motion.name='engineer-head-motion';for(const child of [...head.children])motion.add(child);head.add(motion);addHair(motion);
    const limbs=[];
    for(const side of [-1,1]){
        const leg=root.getObjectByName(`engineer-leg-${side}`),arm=root.getObjectByName(`engineer-arm-${side}`);upper.add(arm);
        const footX=side*.07;
        oval(leg,[footX,-.947,.055],[.067,.018,.137],leather);
        oval(leg,[footX,-.91,.06],[.064,.047,.13],leather);
        oval(leg,[footX,-.86,-.012],[.057,.071,.064],leather);
        for(let i=0;i<4;i++)seam(leg,[[footX-.025,-.855-i*.01,.058+i*.013],[footX+.025,-.855-i*.01,.058+i*.013]],.001,ink);
        seam(leg,[[footX-.06,-.94,-.025],[footX-.063,-.94,.09],[footX,-.94,.183],[footX+.063,-.94,.09]],.001,ink);
        // Real hands remain uncovered; sleeve cuffs receive a small white button.
        seam(arm,[[side*.055,-.48,.065],[0,-.49,.075],[-side*.035,-.48,.055]],.001,edge);
        oval(arm,[side*.045,-.48,.072],[.004,.004,.002],ink);
        limbs.push({leg,arm,side,armRest:arm.position.clone()});
    }
    // Merge static decoration per material; retain the articulated head and cloth panels.
    for(const group of [root,upper,...limbs.flatMap(l=>[l.leg,l.arm])]){
        const batches=new Map();for(const child of [...group.children])if(child.isMesh&&!child.name.startsWith('lab-coat-hem')){
            child.updateMatrix();const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrix);
            if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
            if(!batches.has(child.material))batches.set(child.material,[]);batches.get(child.material).push(g);group.remove(child);child.geometry.dispose();
        }
        for(const [material,gs]of batches){const m=mesh(group,mergeGeometries(gs),material);m.castShadow=m.receiveShadow=true;gs.forEach(g=>g.dispose());}
    }
    let time=0;
    function animate(dt,moving,phase){
        time+=dt;const breath=Math.sin(time*1.45);
        upper.position.y=breath*.0017;upper.position.x=Math.sin(time*.63)*.0018;
        upper.rotation.z=Math.sin(time*.7)*.003;
        motion.rotation.x=Math.sin(time*.83)*.004;motion.rotation.y=Math.sin(time*.51)*.008;
        tie.rotation.x=Math.sin(time*1.45-.3)*.008;
        for(const {mesh,base}of hems){const p=mesh.geometry.attributes.position;
            for(let i=0;i<p.count;i++){const w=THREE.MathUtils.clamp((1.095-base[i*3+1])/.49,0,1);p.setXYZ(i,base[i*3]+Math.sin(time*.9+w)*.002*w,base[i*3+1],base[i*3+2]+Math.sin((moving?phase:time*.8)+base[i*3]*8)*w*(moving?.011:.002));}
            p.needsUpdate=true;mesh.geometry.computeVertexNormals();
        }
    }
    return {root,head,limbs,animate};
}
