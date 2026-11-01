import * as THREE from 'three';
import { surface } from './atmosphere.js';
import { makeModel } from './models.js';

export function dressLaterAct(game, level) {
    const lab=level.id==='lab', half=lab?5.7:4.7;
    const group=new THREE.Group();group.name=lab?'laboratory-scenery':'capsule-scenery';
    const wallMap=surface('wall',lab?4:3,1),floorMap=surface('floor',30,30);
    const steel=new THREE.MeshStandardMaterial({color:lab?0x52665e:0x606864,metalness:.5,roughness:.65});
    const dark=new THREE.MeshStandardMaterial({color:0x25322f,metalness:.35,roughness:.8});
    const brass=new THREE.MeshStandardMaterial({color:0x9a8156,metalness:.6,roughness:.4});
    const glow=new THREE.MeshStandardMaterial({color:0xa2c9bd,emissive:0x548779,emissiveIntensity:.5});
    const warm=new THREE.MeshStandardMaterial({color:0xf3d5a1,emissive:0xcc9753,emissiveIntensity:.7});
    function box(pos,size,material=steel,solid=false){
        const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...pos);
        m.castShadow=m.receiveShadow=true;group.add(m);
        if(solid)game.colliders.push({min:new THREE.Vector3(pos[0]-size[0]/2,0,pos[2]-size[2]/2),max:new THREE.Vector3(pos[0]+size[0]/2,size[1],pos[2]+size[2]/2)});
        return m;
    }
    function tube(points,r=.04,material=brass){
        const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),28,r,8,false),material);
        mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
    }
    function prop(name,pos,rotation=0,footprint){
        const m=makeModel(name,pos);m.rotation.y=rotation;group.add(m);
        if(footprint)game.colliders.push({min:new THREE.Vector3(pos[0]-footprint[0]/2,0,pos[2]-footprint[1]/2),max:new THREE.Vector3(pos[0]+footprint[0]/2,3,pos[2]+footprint[1]/2)});
        return m;
    }
    function label(text,pos,width=2.4,rotation=0){
        const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');
        ctx.fillStyle='#152320';ctx.fillRect(0,0,1024,128);ctx.strokeStyle='#8e987d';ctx.strokeRect(8,8,1008,112);
        ctx.fillStyle='#cad6bd';ctx.font='32px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64);
        const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
        const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/8),new THREE.MeshBasicMaterial({map:t}));m.position.set(...pos);m.rotation.y=rotation;group.add(m);
    }
    function spot(pos,target,color,intensity,shadow=false){
        const light=new THREE.SpotLight(color,intensity,22,Math.PI/2.9,.65,2);light.position.set(...pos);light.target.position.set(...target);
        light.castShadow=shadow;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0003;light.shadow.normalBias=.025;
        group.add(light,light.target);return light;
    }
    game.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    game.ambient.color.set(lab?0x8ca89b:0xa4aaa3);game.ambient.intensity=lab?.52:.6;
    game.levelLight.color.set(lab?0x9cc5b7:0xa9bbc9);game.levelLight.intensity=lab?16:12;
    game.scene.fog.color.set(lab?0x172822:0x252b2c);game.scene.fog.density=.022;
    game.floor.material.color.set(lab?0x748579:0x7b827c);game.floor.material.map=floorMap;game.floor.material.bumpMap=floorMap;
    game.floor.material.bumpScale=.027;game.floor.material.roughness=.68;game.floor.material.needsUpdate=true;game.floor.receiveShadow=true;
    for(const obj of game.levelObjects){
        if(obj.geometry?.parameters.height>=4.8){
            obj.material.color.set(lab?0x63766b:0x727b76);obj.material.map=wallMap;obj.material.bumpMap=wallMap;obj.material.bumpScale=.025;obj.material.needsUpdate=true;
        }
        if(obj.geometry?.parameters.height===.045){obj.material.color.set(lab?0x97b8a0:0xe0c9a2);obj.material.opacity=.45;}
        obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
    }
    box([0,4.96,0],[half*2,.1,half*2],dark);
    for(const z of [-half+1,0,half-1])box([0,4.65,z],[half*2,.18,.18]);
    for(const side of [-1,1]){
        for(const z of [-half+1,0,half-1])box([side*(half-.08),2.45,z],[.14,4.8,.18]);
        tube([[side*(half-.16),.25,-half],[side*(half-.16),.25,half]],.055);
        tube([[side*(half-.16),3.8,-half],[side*(half-.16),3.8,half]],.055);
    }
    if(lab){
        label('ECHO / ЛАБОРАТОРИЯ ВОССТАНОВЛЕНИЯ',[0,3.9,-5.7],4.5);
        for(const [x,title] of [[-4.3,'01 / ПРИКАЗ ЭВАКУАЦИИ'],[4.2,'02 / РЕЕСТР ПЕРСОНАЛА']]){
            prop('lab-terminal',[x,0,-4.35],0,[1.7,1]);
            prop('task-lamp',[x-.55,1.05,-4.3]);
            label(title,[x,2.35,-4.45],2.5);
            spot([x-.4,2.8,-3.5],[x,1,-4.2],0xffcf94,30);
        }
        prop('service-console',[0,0,.85],0,[2.2,1]);
        box([0,1.48,1.12],[.5,.65,.06],dark);
        tube([[0,1.03,.95],[0,1.2,1.1],[0,1.45,1.1]],.025);
        label('03 / ЖУРНАЛ РЕАКТОРА',[0,2.8,-.81],2.3);
        // Brass-edged central partition and instrument cluster.
        for(const x of [-1.17,1.17])box([x,2.4,-.78],[.035,4.6,.025],brass);
        for(const x of [-.65,.65]){
            const gauge=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.05,32),brass);gauge.rotation.x=Math.PI/2;gauge.position.set(x,2.15,-.78);group.add(gauge);
            box([x,2.15,-.74],[.02,.23,.015],dark).rotation.z=.6;
        }
        for(const x of [-5.18,5.18])for(const z of [-.8,2.1])prop('archive-rack',[x,0,z],x<0?Math.PI/2:-Math.PI/2,[.7,1.5]);
        for(const z of [-4.9,-2,1,3.8]){
            box([0,.018,z],[.65,.015,.055],glow);
        }
        for(const x of [-.85,.85])box([x,1.3,5.48],[.12,2.6,.2],brass);
        box([0,2.6,5.48],[1.82,.13,.2],steel);
        label('СЕРВИСНЫЙ ПЕРЕХОД / 03',[0,3,5.5],2.6,Math.PI);
        spot([1,4.5,3],[0,.5,0],0xb7d2c3,120,true);
        spot([0,4.1,-3.5],[0,1,-5],0x719c9d,65);
    } else {
        label('ECHO / ОКОНЧАТЕЛЬНОЕ ВОССТАНОВЛЕНИЕ',[0,3.85,-4.65],4.3);
        prop('restoration-pod',[-3.35,0,.55],0,[1.75,2.75]);
        prop('lab-terminal',[-3.5,0,-2.35],0,[1.7,1]);
        prop('lab-terminal',[3.6,0,.75],0,[1.7,1]);
        label('ПРОТОКОЛ ВОССТАНОВЛЕНИЯ',[-3.5,2.4,-2.5],2.2);
        label('ТРИ ПРОТОКОЛА ВЫБОРА',[3.6,2.4,.6],2.2);
        // Low, reachable plinth for the reconstructed toy.
        box([2.2,.17,-1.6],[.85,.34,.85],dark,true);
        box([2.2,.35,-1.6],[.92,.035,.92],brass);
        label('03 / РЕКОНСТРУКЦИЯ',[2.2,.24,-1.14],.75);
        for(const x of [-1.2,1.2]){
            box([x,1.8,-4.51],[.15,3.46,.2],brass);
            box([x*1.15,1.8,-4.52],[.045,3.62,.15],dark);
            box([x*1.6,2.15,-4.4],[.12,.85,.12],warm);
            spot([x*1.6,2.5,-3.9],[x*.4,1.4,-2.7],0xffd5a5,24);
        }
        for(const y of [.1,3.5])box([0,y,-4.5],[2.5,.13,.2],brass);
        box([0,.045,-3.85],[2.7,.09,1.25],dark); // shallow raised threshold, no invisible collision.
        label('ЛИЧНОСТЬ / ПАМЯТЬ / ВЫБОР',[0,3.55,-4.35],2.6);
        spot([0,4.45,-1],[0,.8,-3.5],0xd6e0d5,95,true);
        spot([-3.1,3.8,2],[-3.4,.6,.5],0x8db5bb,55);
        spot([2.2,3,-1.6],[2.2,.4,-1.6],0xffcf96,20);
        // Frontal fill is important: the engineer's face must read in the mirror.
        spot([0,2.8,-4.05],[0,1.4,0],0xffe0b6,19);
        const mirror=game.interactables.find(o=>o.userData.type==='mirror');
        const placeholder=mirror.children[0];mirror.remove(placeholder);placeholder.geometry.dispose();placeholder.material.dispose();
        const matte=new THREE.Mesh(new THREE.PlaneGeometry(2.16,3.12),new THREE.MeshStandardMaterial({color:0x6b7270,roughness:1,metalness:0,transparent:false,opacity:1,side:THREE.DoubleSide}));
        matte.name='matte-mirror';matte.receiveShadow=true;mirror.add(matte);
    }
    // Printable labels for the already-existing documents; no additional plot text.
    const sheet=document.createElement('canvas');sheet.width=256;sheet.height=320;const ink=sheet.getContext('2d');
    ink.fillStyle='#c8c1a7';ink.fillRect(0,0,256,320);ink.fillStyle='#46564d';ink.font='bold 21px sans-serif';ink.fillText('ECHO / ARCHIVE',18,38);
    for(let i=0;i<14;i++)ink.fillRect(18,70+i*15,i%4?215:140,3);
    const map=new THREE.CanvasTexture(sheet);map.colorSpace=THREE.SRGBColorSpace;
    for(const obj of game.interactables)if(obj.userData.type==='note'){
        const m=obj.children[0].material;m.map=map;m.color.set(0xffffff);m.emissive.set(0x2d3528);m.emissiveIntensity=.15;m.needsUpdate=true;
    }
    game.scene.add(group);game.levelObjects.push(group);
}
