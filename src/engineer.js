import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/utils/BufferGeometryUtils.js';

// Original, articulated stylized character; dimensions are in metres.
export function createEngineer() {
    const root=new THREE.Group();root.name='engineer-reflection';
    function fabric(){
        const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
        x.fillStyle='#c3c3ba';x.fillRect(0,0,128,128);
        for(let i=0;i<128;i+=3){x.fillStyle=i%2?'#b5b6ad':'#d0d0c7';x.fillRect(i,0,1,128);x.fillRect(0,i,128,1);}
        const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
        map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(3,3);return map;
    }
    const weave=fabric();
    const skin=new THREE.MeshStandardMaterial({color:0x9e8068,roughness:.88});
    const crease=new THREE.MeshStandardMaterial({color:0x745a48,roughness:.95});
    const coat=new THREE.MeshStandardMaterial({color:0x495c57,roughness:.86,map:weave,bumpMap:weave,bumpScale:.001});
    const panel=new THREE.MeshStandardMaterial({color:0x66716a,roughness:.9,map:weave});
    const trousers=new THREE.MeshStandardMaterial({color:0x333d3c,roughness:.94,map:weave});
    const shirt=new THREE.MeshStandardMaterial({color:0xb4ac93,roughness:.97,map:weave});
    const leather=new THREE.MeshStandardMaterial({color:0x292d28,roughness:.75});
    const hair=new THREE.MeshStandardMaterial({color:0x302e28,roughness:.98});
    const gray=new THREE.MeshStandardMaterial({color:0x68675b,roughness:.97});
    const stubble=new THREE.MeshStandardMaterial({color:0x806c57,roughness:1});
    const white=new THREE.MeshStandardMaterial({color:0xbdbdaf,roughness:.65});
    const iris=new THREE.MeshStandardMaterial({color:0x495d54,roughness:.45});
    const pupil=new THREE.MeshStandardMaterial({color:0x121a18,roughness:.3});
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
    const torso=mesh(root,new THREE.LatheGeometry([[.13,0],[.14,.07],[.145,.27],[.16,.46],[.12,.55],[.065,.58]].map(p=>new THREE.Vector2(...p)),32),coat,[0,.96,0]);torso.scale.x=1.65;
    box(root,[0,1.37,.163],[.115,.32,.02],shirt);
    for(const s of [-1,1]){
        // Folded lapels, shoulder reinforcement and functional chest pockets.
        patch(root,[[s*.04,1.55,.15],[s*.14,1.5,.16],[s*.095,1.37,.188],[s*.018,1.47,.188]],panel).material.side=THREE.DoubleSide;
        oval(root,[s*.195,1.47,.01],[.085,.045,.128],panel);
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

    const head=new THREE.Group();head.name='engineer-head';head.position.y=1.65;root.add(head);
    oval(head,[0,-.09,-.005],[.058,.105,.057],skin);
    // Sculpt the jaw/temples into the base mesh instead of stacking round cheeks.
    const skull=new THREE.SphereGeometry(1,40,32),p=skull.attributes.position;
    for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
        const jaw=y<-.2 ? 1-(Math.abs(y)-.2)*.24 : 1;
        p.setXYZ(i,x*.118*jaw,y*.166+.04,z*.112+(y<0?.012:0));
    }
    skull.computeVertexNormals();mesh(head,skull,skin);
    oval(head,[0,-.074,.045],[.071,.037,.068],skin);
    oval(head,[0,.035,.113],[.018,.045,.025],skin);
    oval(head,[0,.006,.137],[.025,.017,.018],skin);
    for(const s of [-1,1]){
        oval(head,[s*.019,.003,.129],[.012,.011,.014],skin);
        oval(head,[s*.015,-.002,.139],[.006,.003,.003],crease);
        oval(head,[s*.12,.035,-.004],[.023,.041,.02],skin);
        oval(head,[s*.132,.035,.006],[.007,.024,.008],crease);
        oval(head,[s*.049,.055,.104],[.03,.018,.01],skin);
        oval(head,[s*.048,.06,.113],[.025,.011,.008],white);
        oval(head,[s*.048,.06,.12],[.008,.009,.003],iris);
        oval(head,[s*.048,.06,.123],[.0038,.006,.002],pupil);
        seam(head,[[s*.023,.069,.114],[s*.047,.075,.12],[s*.074,.066,.105]],.002,skin);
        seam(head,[[s*.023,.048,.112],[s*.05,.04,.11],[s*.072,.049,.104]],.002,skin);
        seam(head,[[s*.024,.091,.108],[s*.05,.1,.11],[s*.078,.091,.093]],.004,hair);
        seam(head,[[s*.032,-.009,.108],[s*.045,-.027,.105],[s*.049,-.047,.095]],.001,crease);
        // Short sideburns with a little gray at the temples.
        oval(head,[s*.105,.095,-.015],[.017,.066,.07],hair);
        seam(head,[[s*.113,.12,.014],[s*.118,.085,.018],[s*.116,.055,.01]],.003,gray);
    }
    seam(head,[[-.03,-.039,.108],[0,-.041,.116],[.03,-.039,.108]],.0025,crease);
    oval(head,[0,-.047,.109],[.025,.005,.005],skin);
    for(let row=0;row<3;row++)seam(head,[[-.061,.121+row*.014,.091],[0,.128+row*.014,.102],[.061,.121+row*.014,.091]],.0008,crease);
    // Swept hair locks follow the scalp instead of forming a uniform cap.
    oval(head,[0,.171,-.028],[.12,.055,.094],hair);
    for(let i=0;i<9;i++){
        const x=-.094+i*.023;
        seam(head,[[x,.158,.068],[x+.012,.207,.016],[x+.018,.191,-.075]],.008,i%4===0?gray:hair);
    }
    // Individually placed short stubble marks leave the lips and cheekbones readable.
    for(const s of [-1,1])for(let row=0;row<4;row++)for(let col=0;col<6;col++){
        const x=s*(.013+col*.012),y=-.048-row*.012;
        const ny=(y-.04)/.166,jaw=1-(Math.abs(ny)-.2)*.24;
        const skullZ=Math.sqrt(Math.max(0,1-(x/(.118*jaw))**2-ny**2))*.112+.012;
        const chinZ=.045+.068*Math.sqrt(Math.max(0,1-(x/.071)**2-((y+.074)/.037)**2));
        const z=Math.max(skullZ,chinZ)+.0015;
        seam(head,[[x,y,z],[x+s*.001,y-.004,z+.001]],.00065,stubble);
    }
    for(const s of [-1,1])for(let i=0;i<4;i++)seam(head,[[s*(.007+i*.005),-.021,.117],[s*(.008+i*.005),-.028,.116]],.0008,stubble);

    const limbs=[];
    for(const side of [-1,1]){
        const leg=new THREE.Group();leg.name=`engineer-leg-${side}`;leg.position.set(side*.115,.96,0);root.add(leg);
        oval(leg,[0,-.215,0],[.093,.245,.097],trousers);
        oval(leg,[0,-.59,0],[.074,.23,.078],trousers);
        oval(leg,[0,-.44,.068],[.065,.075,.018],panel);
        seam(leg,[[side*.067,-.1,.03],[side*.069,-.4,.04],[side*.055,-.75,.032]],.0018,panel);
        oval(leg,[0,-.81,.033],[.084,.105,.13],leather);
        oval(leg,[0,-.865,.06],[.087,.034,.15],leather);
        box(leg,[0,-.895,.045],[.155,.022,.24],trousers);
        for(let i=0;i<4;i++)seam(leg,[[-.035,-.79-i*.015,.105+i*.006],[.035,-.79-i*.015,.105+i*.006]],.002,panel);
        const arm=new THREE.Group();arm.name=`engineer-arm-${side}`;arm.position.set(side*.255,1.47,0);root.add(arm);
        oval(arm,[side*.022,-.13,0],[.077,.17,.077],coat);
        oval(arm,[side*.035,-.35,.015],[.062,.16,.065],coat);
        oval(arm,[side*.034,-.28,-.04],[.052,.057,.025],panel);
        oval(arm,[side*.035,-.47,.015],[.061,.025,.064],panel);
        seam(arm,[[side*.082,-.1,.035],[side*.086,-.3,.045],[side*.075,-.45,.05]],.0015,shirt);
        oval(arm,[side*.035,-.515,.02],[.041,.047,.027],skin);
        for(let i=0;i<4;i++)oval(arm,[side*.035-.025+i*.016,-.56,.027],[.008,.026,.012],skin);
        oval(arm,[side*.073,-.525,.035],[.014,.029,.014],skin).rotation.z=side*.35;
        if(side===-1){oval(arm,[side*.035,-.46,.067],[.029,.025,.008],metal);oval(arm,[side*.035,-.46,.076],[.022,.018,.002],leather);}
        limbs.push({leg,arm,side});
    }
    // Bake decorative parts by material within each articulated group.
    // The face and seams add detail without hundreds of draw calls per reflection.
    for(const group of [root,head,...limbs.flatMap(l=>[l.leg,l.arm])]){
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
