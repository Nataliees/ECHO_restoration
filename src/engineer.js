import { cloneBody, createScannedHead } from './character-assets.js';
import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/utils/BufferGeometryUtils.js';

// CC0 anatomical body, attributed scanned head and ECHO workwear; metres.
export function createEngineer() {
    const root=cloneBody();
    function fabric(){
        const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
        x.fillStyle='#c3c3ba';x.fillRect(0,0,128,128);
        for(let i=0;i<128;i+=3){x.fillStyle=i%2?'#b5b6ad':'#d0d0c7';x.fillRect(i,0,1,128);x.fillRect(0,i,128,1);}
        const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
        map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(3,3);return map;
    }
    const weave=fabric();
    const skin=new THREE.MeshStandardMaterial({color:0xb09883,roughness:.88});
    const coat=new THREE.MeshStandardMaterial({color:0x414a46,roughness:.86,map:weave,bumpMap:weave,bumpScale:.001});
    const panel=new THREE.MeshStandardMaterial({color:0x535c53,roughness:.9,map:weave});
    const trousers=new THREE.MeshStandardMaterial({color:0x333d3c,roughness:.94,map:weave});
    const shirt=new THREE.MeshStandardMaterial({color:0xb4ac93,roughness:.97,map:weave});
    const leather=new THREE.MeshStandardMaterial({color:0x292d28,roughness:.75});
    const metal=new THREE.MeshStandardMaterial({color:0xa7956d,metalness:.65,roughness:.48});
    const orange=new THREE.MeshStandardMaterial({color:0xb88248,roughness:.9});
    function mesh(parent,geometry,material,pos=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...pos);parent.add(m);return m;}
    function oval(parent,pos,size,material){const m=mesh(parent,new THREE.SphereGeometry(1,24,18),material,pos);m.scale.set(...size);return m;}
    function box(parent,pos,size,material){return mesh(parent,new THREE.BoxGeometry(...size),material,pos);}
    function seam(parent,points,r=.0015,material=panel){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,5,false),material);}
    function patch(parent,points,material){
        const geometry=new THREE.BufferGeometry();const vertices=[];
        for(let i=1;i<points.length-1;i++)vertices.push(...points[0],...points[i],...points[i+1]);
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
        return mesh(parent,geometry,material);
    }
    const replacements={coat,trousers,leather,skin};
    root.traverse(n=>{if(n.isMesh){const material=replacements[n.material.name];if(material){n.material.dispose();n.material=material;}}});
    box(root,[0,1.37,.163],[.115,.32,.02],shirt);
    for(const s of [-1,1]){
        // Folded lapels, shoulder reinforcement and functional chest pockets.
        patch(root,[[s*.04,1.55,.15],[s*.14,1.5,.16],[s*.095,1.37,.188],[s*.018,1.47,.188]],panel).material.side=THREE.DoubleSide;
        box(root,[s*.135,1.27,.153],[.135,.14,.026],panel);
        box(root,[s*.135,1.34,.172],[.145,.038,.012],coat);
        oval(root,[s*.135,1.337,.183],[.009,.009,.003],metal);
        seam(root,[[s*.202,1.2,.17],[s*.202,1.35,.17],[s*.067,1.35,.17]]);
        seam(root,[[s*.22,1.4,.095],[s*.23,1.24,.1],[s*.2,1.02,.11]]);
    }
    box(root,[0,1.24,.18],[.016,.43,.01],leather);
    for(let i=0;i<19;i++)box(root,[0,1.045+i*.021,.19],[.012,.007,.005],metal);
    box(root,[.012,1.41,.194],[.02,.035,.006],metal);
    // Embroidered ECHO badge, rendered as a local texture.
    const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');
    ctx.fillStyle='#283c35';ctx.fillRect(0,0,256,128);ctx.strokeStyle='#a39b70';ctx.lineWidth=8;ctx.strokeRect(7,7,242,114);
    ctx.fillStyle='#d0c5a3';ctx.font='bold 43px sans-serif';ctx.fillText('ECHO',24,57);ctx.font='22px sans-serif';ctx.fillText('ENGINEERING',20,94);
    const badge=new THREE.CanvasTexture(c);badge.colorSpace=THREE.SRGBColorSpace;
    mesh(root,new THREE.PlaneGeometry(.14,.07),new THREE.MeshStandardMaterial({map:badge,roughness:.95}),[-.135,1.4,.16]);
    box(root,[.2,1.44,.115],[.04,.09,.018],orange);
    oval(root,[0,.99,0],[.23,.035,.145],leather);box(root,[0,.99,.145],[.055,.042,.012],metal);
    box(root,[.215,.92,0],[.075,.15,.105],leather);
    for(const s of [-1,1])box(root,[s*.13,.99,.14],[.02,.055,.012],coat);

    const head=createScannedHead();root.add(head);
    const limbs=[];
    for(const side of [-1,1]){
        const leg=root.getObjectByName(`engineer-leg-${side}`);
        const arm=root.getObjectByName(`engineer-arm-${side}`);
        // The underlying hands are anatomical MakeHuman meshes, not finger primitives.
        // Reinforced knee panels, cuff stitching and worn boot hardware.
        oval(leg,[0,-.43,.064],[.063,.075,.013],panel);
        const footX=side*.07;
        oval(leg,[footX,-.94,.07],[.073,.025,.15],leather);
        oval(leg,[footX,-.89,.07],[.071,.06,.145],leather);
        mesh(leg,new THREE.CylinderGeometry(.06,.065,.15,24),leather,[footX,-.82,.005]);
        seam(leg,[[footX-.06,-.92,-.04],[footX-.067,-.92,.08],[footX,-.92,.208],[footX+.067,-.92,.08],[footX+.06,-.92,-.04]],.0015,panel);
        for(let i=0;i<4;i++)seam(leg,[[footX-.03,-.81-i*.012,.065+i*.015],[footX+.03,-.81-i*.012,.065+i*.015]],.0015,panel);
        seam(arm,[[side*.04,-.14,.07],[side*.04,-.3,.07],[side*.04,-.44,.06]],.0015,panel);
        if(side===-1){oval(arm,[.015,-.49,.084],[.024,.02,.007],metal);oval(arm,[.015,-.49,.092],[.019,.015,.002],leather);}
        limbs.push({leg,arm,side});
    }
    // Bake decorative parts by material within each articulated group.
    // The face and seams add detail without hundreds of draw calls per reflection.
    for(const group of [root,...limbs.flatMap(l=>[l.leg,l.arm])]){
        const batches=new Map();
        for(const child of [...group.children])if(child.isMesh){
            child.updateMatrix();let g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrix);
            // Textured patches need UVs; add neutral UVs for untextured custom polygons.
            if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
            if(!batches.has(child.material))batches.set(child.material,[]);batches.get(child.material).push(g);
            group.remove(child);child.geometry.dispose();
        }
        for(const [material,geometries] of batches){
            const combined=mergeGeometries(geometries);const m=mesh(group,combined,material);m.castShadow=m.receiveShadow=true;
            geometries.forEach(g=>g.dispose());
        }
    }
    return {root,head,limbs};
}
