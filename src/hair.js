import * as THREE from 'three';
import { mergeGeometries } from '../assets/vendor/utils/BufferGeometryUtils.js';

// Scalp-fitted short hair with a side part and swept fringe. Local head coordinates.
export function addHair(head) {
    const hair=new THREE.Group();hair.name='engineer-hair';
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#77777c';ctx.fillRect(0,0,256,256);
    for(let i=0;i<160;i++){
        const x=(i*37)%256;ctx.strokeStyle=`rgba(${i%2?30:210},${i%2?30:210},${i%2?34:215},.24)`;ctx.lineWidth=i%3?1:2;
        ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x-15,80,x+12,170,x-7,256);ctx.stroke();
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({color:0x30303a,map,bumpMap:map,bumpScale:.00055,roughness:.65,metalness:.03,side:THREE.DoubleSide});
    const positions=[],uvs=[],indices=[];const rings=24,segments=64;
    for(let i=0;i<=rings;i++)for(let j=0;j<=segments;j++){
        const phi=j/segments*Math.PI*2,front=Math.cos(phi);
        const lower=front>0?.05+.078*Math.pow(front,3):.045+.027*front;
        const end=Math.acos(THREE.MathUtils.clamp((lower-.083)/.118,-1,1));
        const theta=i/rings*end;
        positions.push(.101*Math.sin(theta)*Math.sin(phi),.083+.118*Math.cos(theta),-.043+.106*Math.sin(theta)*Math.cos(phi));
        uvs.push(j/segments,i/rings);
        if(i<rings&&j<segments){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
    }
    const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));cap.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));cap.setIndex(indices);cap.computeVertexNormals();
    const strands=[];
    // Broad overlapping locks give the silhouette shape; their texture supplies finer hairs.
    for(let i=0;i<23;i++){
        const t=i/22,x=.067-t*.11;
        const curve=new THREE.CatmullRomCurve3([
            new THREE.Vector3(x,.18,-.09),new THREE.Vector3(x+.015,.21,-.025),
            new THREE.Vector3(x-.01,.178,.047),new THREE.Vector3(x-.035,.114+(1-t)*.016,.066)
        ]);
        const g=new THREE.TubeGeometry(curve,18,.0055,7,false);
        const p=g.attributes.position;
        for(let k=0;k<p.count;k++){
            const u=Math.floor(k/8)/18,center=curve.getPointAt(Math.min(1,u)),v=new THREE.Vector3().fromBufferAttribute(p,k);
            // Taper the tips; flatten locks slightly along the scalp normal.
            const taper=u>.7?Math.max(.12,(1-u)/.3):1;
            v.sub(center).multiplyScalar(taper).add(center);p.setXYZ(k,v.x,v.y,v.z);
        }
        g.computeVertexNormals();strands.push(g);
    }
    const geometries=[cap.toNonIndexed(),...strands.map(g=>g.toNonIndexed())];
    const combined=mergeGeometries(geometries);const mesh=new THREE.Mesh(combined,material);mesh.castShadow=mesh.receiveShadow=true;hair.add(mesh);
    cap.dispose();strands.forEach(g=>g.dispose());geometries.forEach(g=>g.dispose());
    head.add(hair);return hair;
}
