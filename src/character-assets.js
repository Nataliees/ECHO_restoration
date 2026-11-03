import * as THREE from 'three';
import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';
let bodyTemplate,headTemplate,skinColor,skinNormal,skinSpecular;
export async function preloadCharacter(){
    const loader=new GLTFLoader(),textures=new THREE.TextureLoader();
    const url=p=>new URL(`../assets/characters/${p}`,import.meta.url).href;
    const [body,scan,color,normal,specular]=await Promise.all([
        loader.loadAsync(url('engineer-body.glb')),loader.loadAsync(url('lee-perry-smith/head.glb')),
        textures.loadAsync(url('lee-perry-smith/color.jpg')),textures.loadAsync(url('lee-perry-smith/normal.jpg')),
        textures.loadAsync(url('lee-perry-smith/specular.jpg'))
    ]);
    bodyTemplate=body.scene;headTemplate=scan.scene.children.find(n=>n.isMesh);
    // These textures are authored for the raw geometry UVs, as in the Three.js example.
    color.colorSpace=THREE.SRGBColorSpace;color.flipY=true;normal.flipY=true;
    specular.flipY=true;specular.colorSpace=THREE.SRGBColorSpace;
    skinColor=color;skinNormal=normal;skinSpecular=specular;
}
export function cloneBody(){
    if(!bodyTemplate)throw new Error('Engineer assets were not preloaded');
    const root=bodyTemplate.clone(true);root.name='engineer-reflection';
    root.traverse(n=>{if(n.isMesh){n.geometry=n.geometry.clone();n.material=n.material.clone();n.castShadow=n.receiveShadow=true;}});
    return root;
}
export function createScannedHead(){
    const root=new THREE.Group();root.name='engineer-head';root.position.y=1.65;
    const original=headTemplate.geometry.index?headTemplate.geometry.toNonIndexed():headTemplate.geometry.clone();
    const p=original.attributes.position, attributes={},closedAttributes={};
    for(const [name,a]of Object.entries(original.attributes)){attributes[name]=[];closedAttributes[name]=[];}
    for(let i=0;i<p.count;i+=3){
        const center=new THREE.Vector3();for(let j=0;j<3;j++)center.add(new THREE.Vector3().fromBufferAttribute(p,i+j));center.multiplyScalar(1/3);
        if(center.y<-1.8)continue; // Remove the scanned shoulders under the work jacket.
        const eyeOpening=[-1,1].some(s=>center.z>1.5&&((center.x-s*.68)/.30)**2+((center.y-1.7)/.105)**2<1);
        if(eyeOpening){
            for(const [name,a]of Object.entries(original.attributes))for(let j=0;j<3;j++)for(let k=0;k<a.itemSize;k++)closedAttributes[name].push(a.array[(i+j)*a.itemSize+k]);
            continue;
        }
        for(const [name,a]of Object.entries(original.attributes))for(let j=0;j<3;j++)for(let k=0;k<a.itemSize;k++)attributes[name].push(a.array[(i+j)*a.itemSize+k]);
    }
    const geometry=new THREE.BufferGeometry();
    for(const [name,array]of Object.entries(attributes))geometry.setAttribute(name,new THREE.Float32BufferAttribute(array,original.attributes[name].itemSize));
    const patchGeometry=new THREE.BufferGeometry();
    for(const [name,array]of Object.entries(closedAttributes))patchGeometry.setAttribute(name,new THREE.Float32BufferAttribute(array,original.attributes[name].itemSize));
    patchGeometry.scale(.057,.057,.057);patchGeometry.translate(0,-.05,-.04);
    original.dispose();geometry.scale(.057,.057,.057);geometry.translate(0,-.05,-.04);
    const material=new THREE.MeshPhysicalMaterial({map:skinColor.clone(),normalMap:skinNormal.clone(),normalScale:new THREE.Vector2(.65,.65),roughness:.68,metalness:0,specularColorMap:skinSpecular.clone(),specularIntensity:.4,clearcoat:.04,clearcoatRoughness:.75});
    material.map.needsUpdate=material.normalMap.needsUpdate=material.specularColorMap.needsUpdate=true;
    const face=new THREE.Mesh(geometry,material);face.castShadow=face.receiveShadow=true;root.add(face);
    const closedLids=new THREE.Mesh(patchGeometry,material);root.add(closedLids);
    const eyes=new THREE.Group();eyes.name='engineer-eyes';root.add(eyes);
    const eyeWhite=new THREE.MeshStandardMaterial({color:0xc5c3b8,roughness:.38});
    const iris=new THREE.MeshStandardMaterial({color:0x493d2c,roughness:.4});
    const pupil=new THREE.MeshStandardMaterial({color:0x101411,roughness:.2});
    const lid=new THREE.MeshStandardMaterial({color:0xaf8c76,roughness:.85});
    const toLocal=p=>new THREE.Vector3(p[0]*.057,p[1]*.057-.05,p[2]*.057-.04);
    function sphere(pos,scale,mat){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),mat);m.position.copy(toLocal(pos));m.scale.set(scale[0]*.057,scale[1]*.057,scale[2]*.057);eyes.add(m);}
    for(const s of [-1,1]){
        const x=s*.68;
        sphere([x,1.7,1.735],[.29,.25,.29],eyeWhite);
        sphere([x,1.7,2.018],[.115,.115,.014],iris);
        sphere([x,1.7,2.033],[.045,.05,.006],pupil);
        for(const upper of [true,false]){
            const points=[];
            for(let i=0;i<=12;i++){const t=Math.PI*i/12;const dx=-.30*Math.cos(t),dy=Math.sin(t)*(upper?.11:-.075);points.push(toLocal([x+dx,1.7+dy,1.94+Math.sin(t)*.055]));}
            eyes.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.0009,6,false),lid));
        }
    }
    let elapsed=0;
    root.userData.update=(dt)=>{elapsed+=dt;const blink=elapsed%4.8<.12;closedLids.visible=blink;eyes.visible=!blink;};
    return root;
}
