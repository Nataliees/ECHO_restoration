import * as THREE from 'three';

// Convex Voronoi cells tile the complete pane. Their shared edges are also the cracks.
function clip(polygon,nx,ny,bound){
    const result=[];
    for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length];
        const da=a.x*nx+a.y*ny-bound,db=b.x*nx+b.y*ny-bound;
        if(da<=1e-8)result.push(a);
        if((da<0)!==(db<0)){const t=da/(da-db);result.push(new THREE.Vector2(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t));}
    }
    return result;
}

export function buildGlassShatter(renderer){
    let seed=8842;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const impact=new THREE.Vector2(-.3,.08),sites=[impact.clone()];
    for(const [radius,count]of [[.14,8],[.38,12],[.76,16],[1.45,20]])for(let i=0;i<count;i++){
        const angle=(i+random()*.5)/count*Math.PI*2;
        sites.push(new THREE.Vector2(THREE.MathUtils.clamp(impact.x+Math.cos(angle)*radius*(.8+random()*.4),-.98,.98),THREE.MathUtils.clamp(impact.y+Math.sin(angle)*radius*(.8+random()*.4),-.98,.98)));
    }
    const polygons=sites.map(site=>{
        let cell=[new THREE.Vector2(-1,-1),new THREE.Vector2(1,-1),new THREE.Vector2(1,1),new THREE.Vector2(-1,1)];
        for(const other of sites)if(other!==site){cell=clip(cell,other.x-site.x,other.y-site.y,(other.lengthSq()-site.lengthSq())/2);if(!cell.length)break;}
        return cell;
    }).filter(cell=>cell.length>=3);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#10202b';ctx.fillRect(0,0,512,256);
    const wash=ctx.createLinearGradient(0,0,0,256);wash.addColorStop(0,'#6e9daf');wash.addColorStop(.45,'#1a2836');wash.addColorStop(.7,'#05090e');wash.addColorStop(1,'#53737f');ctx.fillStyle=wash;ctx.fillRect(0,0,512,256);
    ctx.fillStyle='#d9f4ff';ctx.fillRect(82,24,12,140);ctx.fillRect(238,48,100,7);ctx.fillRect(418,32,20,104);
    ctx.fillStyle='#cf5334';ctx.fillRect(350,90,17,72);
    const environment=new THREE.CanvasTexture(canvas);environment.colorSpace=THREE.SRGBColorSpace;environment.mapping=THREE.EquirectangularReflectionMapping;
    const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(environment);generator.dispose();environment.dispose();
    const pieces=[],edges=new Map();
    for(const polygon of polygons){
        const center=polygon.reduce((v,p)=>v.add(p),new THREE.Vector2()).multiplyScalar(1/polygon.length);
        const shape=new THREE.Shape();shape.moveTo(polygon[0].x-center.x,polygon[0].y-center.y);
        polygon.slice(1).forEach(p=>shape.lineTo(p.x-center.x,p.y-center.y));shape.closePath();
        const geometry=new THREE.ExtrudeGeometry(shape,{depth:.016,bevelEnabled:true,bevelSize:.0018,bevelThickness:.003,bevelSegments:1,steps:1,curveSegments:1});geometry.translate(0,0,-.008);
        const face=new THREE.MeshPhysicalMaterial({color:0xc4e0e5,metalness:0,roughness:.055,transmission:.86,thickness:.025,ior:1.49,envMap:target.texture,envMapIntensity:1.3,clearcoat:1,clearcoatRoughness:.035,transparent:true,opacity:1,side:THREE.DoubleSide,attenuationColor:0x83b3c3,attenuationDistance:1});
        const edge=new THREE.MeshPhysicalMaterial({color:0xa9d6e4,metalness:.25,roughness:.16,envMap:target.texture,envMapIntensity:1.8,transparent:true,opacity:.9,side:THREE.DoubleSide});
        const mesh=new THREE.Mesh(geometry,[face,edge]);mesh.position.set(center.x,center.y,0);mesh.visible=false;
        const dir=center.clone().sub(impact).normalize(),burst=.45+random()*.75;
        pieces.push({mesh,center,materials:[face,edge],velocity:new THREE.Vector3(dir.x*burst,dir.y*burst,.25+random()*.9),spin:new THREE.Vector3((random()-.5)*4,(random()-.5)*5,(random()-.5)*3),delay:random()*.045});
        for(let i=0;i<polygon.length;i++){
            const a=polygon[i],b=polygon[(i+1)%polygon.length];
            if(Math.abs(a.x-b.x)<1e-7&&Math.abs(a.x)>.999||Math.abs(a.y-b.y)<1e-7&&Math.abs(a.y)>.999)continue;
            const key=[a.toArray().map(v=>v.toFixed(5)).join(','),b.toArray().map(v=>v.toFixed(5)).join(',')].sort().join('|');
            if(!edges.has(key))edges.set(key,{a,b,distance:a.clone().add(b).multiplyScalar(.5).distanceTo(impact)});
        }
    }
    const points=[];[...edges.values()].sort((a,b)=>a.distance-b.distance).forEach(({a,b})=>points.push(a.x,a.y,0,b.x,b.y,0));
    const cracks=new THREE.BufferGeometry();cracks.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    return {pieces,cracks,environmentTarget:target};
}
