import * as THREE from 'three';

// All surfaces are generated locally; no external textures or network requests.
export function surface(kind, repeatX = 1, repeatY = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    let seed = kind === 'floor' ? 71 : 139;
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    ctx.fillStyle = kind === 'floor' ? '#727674' : '#adb0a6';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 18000; i++) {
        const v = random() > .5 ? 255 : 0;
        ctx.fillStyle = `rgba(${v},${v},${v},${random() * .09})`;
        ctx.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 3);
    }
    // Panel joints and accumulated grime are intentionally subtle.
    ctx.strokeStyle = '#343e3c'; ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 508);
    ctx.strokeStyle = '#c3c4b5'; ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 500, 500);
    for (let i = 0; i < 80; i++) {
        const x = random() * 512, y = random() * 512;
        ctx.strokeStyle = `rgba(31,29,23,${random() * .2})`;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 30, y + random() * 3); ctx.stroke();
    }
    if (kind === 'floor') {
        for (let x = 20; x < 512; x += 24) {
            ctx.strokeStyle = '#4c5350'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x, 15); ctx.lineTo(x, 497); ctx.stroke();
        }
    } else {
        for (const x of [18, 494]) for (const y of [18, 494]) {
            ctx.fillStyle = '#404a45'; ctx.beginPath();ctx.arc(x, y, 4, 0, Math.PI * 2);ctx.fill();
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
}

export function dressAirlock(game) {
    const group = new THREE.Group(); group.name = 'airlock-atmosphere';
    const wallMap = surface('wall', 3, 1);
    const floorMap = surface('floor', 30, 30);
    game.floor.material.color.set(0x737a73);
    game.floor.material.map = floorMap;
    game.floor.material.bumpMap = floorMap;
    game.floor.material.bumpScale = .035;
    game.floor.material.roughness = .72;
    game.floor.material.needsUpdate = true;
    game.floor.receiveShadow = true;
    // At this point only architectural walls use these 5-unit-high boxes.
    for (const object of game.levelObjects) {
        if (object.geometry?.parameters.height === 5) {
            object.material.color.set(0x68736c);
            object.material.map = wallMap;
            object.material.bumpMap = wallMap;
            object.material.bumpScale = .025;
            object.material.metalness = .25;
            object.material.needsUpdate = true;
        }
    }
    const metal = new THREE.MeshStandardMaterial({color: 0x4a514c, roughness: .6, metalness: .65, map: wallMap});
    const dark = new THREE.MeshStandardMaterial({color: 0x242e2c, roughness: .78, metalness: .35});
    const brass = new THREE.MeshStandardMaterial({color: 0x887450, roughness: .45, metalness: .7});
    function mesh(geometry, material, pos) {
        const object = new THREE.Mesh(geometry, material);
        object.position.set(...pos); object.castShadow = object.receiveShadow = true;
        group.add(object);return object;
    }
    const box = (pos, size, material = metal) => mesh(new THREE.BoxGeometry(...size), material, pos);
    const cylinder = (pos, radius, height, material = brass) => mesh(new THREE.CylinderGeometry(radius, radius, height, 12), material, pos);
    // Ceiling and beams close the room and catch the pool of light.
    box([0, 4.95, 0], [9.5, .12, 9.5], dark);
    for (const z of [-3, 0, 3]) box([0, 4.6, z], [9.4, .22, .18]);
    for (const x of [-4.48, 4.48]) {
        for (const y of [.2, 3.45, 3.65]) {
            cylinder([x, y, 0], .055, 9.1).rotation.x = Math.PI / 2;
        }
        // Recessed service panels with louvres, safely outside the walking area.
        for (const z of [-1.5, 1.1]) {
            box([x, 1.6, z], [.16, 1.5, 1.6], dark);
            for (let i = 0; i < 7; i++) box([x > 0 ? x - .1 : x + .1, 1.17 + i * .13, z], [.05, .045, 1.3]);
        }
    }
    // Warm local lamp against cool overhead fill, inspired by the reference.
    const lamp = new THREE.SpotLight(0xffc88a, 24, 8, Math.PI / 2.8, .65, 2);
    lamp.position.set(-3.55, 1.69, -3.85);
    lamp.target.position.set(-2.7, .85, -3.65);
    group.add(lamp, lamp.target);
    const key = new THREE.SpotLight(0xb6d4d1, 105, 18, Math.PI / 2.7, .7, 2);
    key.position.set(1.2, 4.4, -.3);key.target.position.set(-1.2, 0, -2.5);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -.0003; key.shadow.normalBias = .025;
    group.add(key, key.target);
    const fill = new THREE.PointLight(0x7caeb2, 12, 8);
    fill.position.set(3.4, 2.6, -3.3);group.add(fill);
    // Documents read as aged paper, rather than luminous blue placeholders.
    const sheet = document.createElement('canvas'); sheet.width = 256; sheet.height = 320;
    const ink = sheet.getContext('2d');
    ink.fillStyle = '#c7bd9f'; ink.fillRect(0, 0, 256, 320);
    ink.fillStyle = '#4d5b54'; ink.font = 'bold 22px sans-serif'; ink.fillText('ECHO', 24, 42);
    ink.fillStyle = '#776d57'; ink.fillRect(24, 60, 208, 3);
    for (let i = 0; i < 12; i++) ink.fillRect(24, 90 + i * 15, i % 3 === 0 ? 145 : 200, 3);
    const sheetMap = new THREE.CanvasTexture(sheet); sheetMap.colorSpace = THREE.SRGBColorSpace;
    for (const object of game.interactables) {
        if (object.userData.type === 'note') {
            const material = object.children[0].material;
            material.map = sheetMap; material.color.set(0xffffff);
            material.emissive.set(0x302a19); material.emissiveIntensity = .15;
            material.roughness = .96; material.needsUpdate = true;
        }
    }
    // Keep the original ceiling strips subdued rather than neon bright.
    for (const object of game.levelObjects) {
        if (object.geometry?.parameters.height === .045) {
            object.material.color.set(0xb9cec2); object.material.opacity = .5;
        }
        object.traverse(node => { if (node.isMesh) {node.castShadow = true;node.receiveShadow = true;} });
    }
    game.scene.add(group);game.levelObjects.push(group);
}
