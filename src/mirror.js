import { createEngineer } from './engineer.js';
import * as THREE from 'three';
import { Reflector } from '../assets/vendor/Reflector.js';

export function installMirror(game, interaction) {
    const {root:avatar,head,limbs,animate}=createEngineer();
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
        head.userData.update?.(dt);
        for(const {leg,arm,side} of limbs){
            const target=moving?Math.sin(phase)*.32*side:0;
            leg.rotation.x=THREE.MathUtils.damp(leg.rotation.x,target,14,dt);
            arm.rotation.x=-leg.rotation.x*.65;
        }
        animate(dt,moving,phase);
        previous.copy(player.position);initialized=true;
        avatar.updateMatrixWorld(true);
    };
    game.mirror={reflector,avatar,head,update,dispose:()=>reflector.getRenderTarget().dispose()};
}
