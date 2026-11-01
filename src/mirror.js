import * as THREE from 'three';
import { Reflector } from '../assets/vendor/Reflector.js';

function createEngineer() {
    const root = new THREE.Group(); root.name = 'engineer-reflection';
    const skin = new THREE.MeshStandardMaterial({color:0x96795f,roughness:.88});
    const coat = new THREE.MeshStandardMaterial({color:0x394d4c,roughness:.8});
    const shirt = new THREE.MeshStandardMaterial({color:0xb7b8a4,roughness:.93});
    const dark = new THREE.MeshStandardMaterial({color:0x292e29,roughness:.95});
    const eye = new THREE.MeshStandardMaterial({color:0x171b18,roughness:.5});
    const metal = new THREE.MeshStandardMaterial({color:0xc5ab6d,metalness:.5,roughness:.5});
    const ellipsoid=(parent,pos,scale,material)=>{
        const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,16),material);
        m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;
    };
    const torso = new THREE.Mesh(new THREE.LatheGeometry([[.13,0],[.14,.08],[.15,.28],[.16,.48],[.12,.56],[.07,.58]].map(p=>new THREE.Vector2(...p)),24),coat);
    torso.position.y=.96;torso.scale.x=1.65;root.add(torso);
    ellipsoid(root,[0,1.38,.14],[.067,.17,.02],shirt);
    // Collar, zipper, belt and an engineer's identification plate.
    for(const side of [-1,1])ellipsoid(root,[side*.075,1.53,.142],[.055,.045,.019],shirt).rotation.z=side*.5;
    ellipsoid(root,[0,1.25,.155],[.012,.18,.012],metal);
    ellipsoid(root,[0,.99,0],[.23,.035,.14],dark);
    ellipsoid(root,[-.13,1.38,.15],[.06,.034,.015],metal);
    const head=new THREE.Group();head.position.y=1.65;root.add(head);
    ellipsoid(head,[0,.05,0],[.125,.17,.12],skin);
    ellipsoid(head,[0,.16,-.025],[.128,.08,.11],dark);
    ellipsoid(head,[0,-.055,.018],[.095,.075,.09],skin);
    ellipsoid(head,[0,.035,.12],[.025,.047,.032],skin);
    for(const side of [-1,1]){
        ellipsoid(head,[side*.124,.035,0],[.024,.043,.025],skin);
        ellipsoid(head,[side*.048,.068,.108],[.027,.013,.014],shirt);
        ellipsoid(head,[side*.048,.068,.12],[.01,.01,.006],eye);
        ellipsoid(head,[side*.049,.091,.108],[.032,.009,.01],dark);
    }
    ellipsoid(head,[0,-.025,.112],[.036,.006,.008],dark);
    const limbs=[];
    for(const side of [-1,1]){
        const leg=new THREE.Group();leg.position.set(side*.115,.96,0);root.add(leg);
        ellipsoid(leg,[0,-.39,0],[.095,.43,.095],coat);
        ellipsoid(leg,[0,-.85,.045],[.1,.08,.17],dark);
        const arm=new THREE.Group();arm.position.set(side*.255,1.47,0);root.add(arm);
        ellipsoid(arm,[side*.035,-.23,0],[.075,.27,.075],coat);
        ellipsoid(arm,[side*.045,-.51,.015],[.05,.075,.045],skin);
        limbs.push({leg,arm,side});
    }
    return {root,head,limbs};
}

export function installMirror(game, interaction) {
    const {root:avatar,head,limbs}=createEngineer();
    avatar.visible=false;game.scene.add(avatar);game.levelObjects.push(avatar);
    const reflector = new Reflector(new THREE.PlaneGeometry(2.16,3.12),{
        color:0xc7cfcc,textureWidth:game.player?.isMobile ? 384 : 768,
        textureHeight:game.player?.isMobile ? 512 : 1024,clipBias:.003,multisample:0
    });
    reflector.name='live-mirror';reflector.userData.showCharacter=true;
    interaction.add(reflector);
    const reflect=reflector.onBeforeRender;
    reflector.onBeforeRender=function(...args){
        // The body is visible to the reflected camera only, never over the first-person view.
        avatar.visible=reflector.userData.showCharacter;
        try { reflect.apply(this,args); } finally { avatar.visible=false; }
    };
    let phase=0;
    const previous = new THREE.Vector3(); let initialized=false;
    const update = dt => {
        const player=game.player;
        if(!player)return;
        const distance=initialized?Math.hypot(player.position.x-previous.x,player.position.z-previous.z):0;
        phase+=Math.min(distance,.2)*7;
        const moving=game.state==='play' && distance>.0001;
        avatar.position.set(player.position.x,0,player.position.z);
        avatar.rotation.y=player.yaw+Math.PI;
        head.rotation.x=-player.pitch;
        for(const {leg,arm,side} of limbs){
            const target=moving?Math.sin(phase)*.32*side:0;
            leg.rotation.x=THREE.MathUtils.damp(leg.rotation.x,target,14,dt);
            arm.rotation.x=-leg.rotation.x*.65;
        }
        previous.copy(player.position);initialized=true;
        avatar.updateMatrixWorld(true);
    };
    game.mirror={reflector,avatar,head,update,dispose:()=>reflector.getRenderTarget().dispose()};
}
