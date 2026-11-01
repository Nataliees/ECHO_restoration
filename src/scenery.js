import { makeModel } from './models.js';
import * as THREE from 'three';

// The first act has three readable zones; scenery carries no new plot facts.
export function buildAirlock(game) {
    const group = new THREE.Group();
    group.name = 'airlock-scenery';
    function box(pos, size, color, solid = false, glow = false) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size),
            new THREE.MeshStandardMaterial({color, roughness: .65, metalness: .45,
                emissive: glow ? color : 0, emissiveIntensity: glow ? .65 : 0}));
        mesh.position.set(...pos);
        group.add(mesh);
        if (solid) game.colliders.push({
            min: new THREE.Vector3(pos[0]-size[0]/2, 0, pos[2]-size[2]/2),
            max: new THREE.Vector3(pos[0]+size[0]/2, size[1], pos[2]+size[2]/2)
        });
        return mesh;
    }
    function sign(text, pos, width, color = '#a2e5ef') {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a1c24'; ctx.fillRect(0, 0, 1024, 128);
        ctx.fillStyle = color; ctx.font = '36px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 64);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8),
            new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide}));
        mesh.position.set(...pos); group.add(mesh);
        return mesh;
    }
    // Mesh assets replace the old cuboid furniture. Collision footprints stay stable.
    group.add(makeModel('recovery-bed', [-3.45, 0, 1.7]));
    group.add(makeModel('archive-desk', [-2.85, 0, -3.9]));
    group.add(makeModel('service-console', [2.8, 0, -4.25]));
    group.add(makeModel('task-lamp', [-3.55, 1.02, -3.85]));
    for (const [x, z, w, d] of [[-3.45,1.7,1.5,2.5],[-2.85,-3.9,2.2,1.25],[2.8,-4.25,2.1,.9]]) {
        game.colliders.push({min:new THREE.Vector3(x-w/2,0,z-d/2), max:new THREE.Vector3(x+w/2,1,z+d/2)});
    }
    sign('ECHO / ВОССТАНОВЛЕНИЕ', [-3.3, 2.65, 2.9], 2.5).rotation.y = Math.PI;
    sign('01 / ЛИЧНЫЙ АРХИВ', [-2.8, 2.8, -4.6], 2.7);
    sign('02 / ПЕРСОНАЛЬНАЯ СВЯЗЬ', [2.8, 2.8, -4.6], 3);
    sign('КАНАЛ ПОВРЕЖДЁН', [2.6, 1.95, -4.6], 1.9, '#efb18b');
    // Structural ribs, conduits, and floor guidance give scale without blocking clues.
    for (const x of [-4.65, 4.65]) {
        for (const z of [-2.4, .3, 3.5]) box([x, 2.4, z], [.18, 4.8, .2], 0x38505c);
        box([x, 3.8, 0], [.13, .13, 9.2], 0x71838a);
    }
    for (const z of [-2.5, -1, .5, 2]) {
        box([0, .018, z], [.7, .02, .08], 0x6fc7cf, false, true);
    }
    for (const x of [-.92, .92]) box([x, .8, 4.58], [.08, 1.6, .05], 0xe7a16c, false, true);
    sign('03 / СЕРВИСНЫЙ ПЕРЕХОД', [0, 2.8, 4.6], 3).rotation.y = Math.PI;
    // The drawing is visibly a child's picture rather than a blank rectangle.
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 384;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#efdbb1'; ctx.fillRect(0, 0, 512, 384);
    ctx.strokeStyle = '#647b94'; ctx.lineWidth = 6;
    for (const [x, y, h] of [[175, 115, 135], [310, 180, 80]]) {
        ctx.beginPath(); ctx.arc(x, y, 23, 0, Math.PI*2);
        ctx.moveTo(x,y+23);ctx.lineTo(x-3,y+h);
        ctx.moveTo(x,y+50);ctx.lineTo(x-52,y+85);
        ctx.moveTo(x,y+50);ctx.lineTo(x+58,y+85);
        ctx.moveTo(x-3,y+h);ctx.lineTo(x-38,y+h+57);
        ctx.moveTo(x-3,y+h);ctx.lineTo(x+32,y+h+57);ctx.stroke();
    }
    ctx.strokeStyle='#ba6454';ctx.beginPath();ctx.arc(425,62,28,0,Math.PI*2);ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    game.scene.add(group); game.levelObjects.push(group);
    return texture;
}
