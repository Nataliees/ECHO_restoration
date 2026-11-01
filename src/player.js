import * as THREE from 'three';

export class Player {
    constructor(game, camera, domElement) {
        this.game = game;
        this.camera = camera;
        this.domElement = domElement;

        this.height = 1.7;
        this.speed = 3.2;
        this.isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
            || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

        this.position = new THREE.Vector3(0, this.height, 3.5);
        this.yaw = 0;
        this.pitch = 0;

        this.keys = Object.create(null);
        this._touch = { forward: 0, strafe: 0, lookX: 0, lookY: 0 };

        this._bindKeyboard();
        if (this.isMobile) this._bindTouch();
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.yaw = 0;
        this.pitch = 0;
        this._applyCamera();
    }

    _bindKeyboard() {
        window.addEventListener('blur', () => {this.keys=Object.create(null);});
        window.addEventListener('keydown', (e) => {
            if(e.repeat && ['KeyE','KeyJ','Escape'].includes(e.code))return;
            if(e.code==='KeyE' && this.game.state==='memory'){this.game.finishRecoveredRecording();return;}
            if (e.code === 'Escape') {
                if (this.game.state === 'play') this.game.pause();
                else if (this.game.state === 'paused') this.game.resume();
                return;
            }
            if (e.code === 'KeyE') {
                if (this.game.state === 'play') this.game.interactions.interact();
                return;
            }
            if (e.code === 'KeyJ') {
                if (this.game.state === 'play') this.game.ui.toggleJournal();
                return;
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement !== this.domElement) return;
            if (this.game.state !== 'play') return;
            this.yaw -= e.movementX * 0.0022;
            this.pitch -= e.movementY * 0.0022;
            this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
        });
    }

    _bindTouch() {
        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        const interactBtn = document.getElementById('btn-interact');

        if (zone && knob) {
            let active = false;
            let id = null;
            let cx = 0, cy = 0;
            const maxDist = 45;

            zone.addEventListener('touchstart', (e) => {
                const t = e.changedTouches[0];
                active = true;
                id = t.identifier;
                const r = zone.getBoundingClientRect();
                cx = r.left + r.width / 2;
                cy = r.top + r.height / 2;
            }, { passive: true });

            zone.addEventListener('touchmove', (e) => {
                if (!active) return;
                for (const t of e.changedTouches) {
                    if (t.identifier !== id) continue;
                    let dx = t.clientX - cx;
                    let dy = t.clientY - cy;
                    const dist = Math.hypot(dx, dy);
                    if (dist > maxDist) {
                        dx = dx / dist * maxDist;
                        dy = dy / dist * maxDist;
                    }
                    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                    this._touch.strafe = Math.max(-1, Math.min(1, dx / maxDist));
                    this._touch.forward = Math.max(-1, Math.min(1, -dy / maxDist));
                }
            }, { passive: true });

            const end = (e) => {
                for (const t of e.changedTouches) {
                    if (t.identifier === id) {
                        active = false;
                        id = null;
                        knob.style.transform = 'translate(-50%, -50%)';
                        this._touch.strafe = 0;
                        this._touch.forward = 0;
                    }
                }
            };
            zone.addEventListener('touchend', end);
            zone.addEventListener('touchcancel', end);

            // Обзор свайпом по правой части экрана
            let lookActive = false;
            let lookId = null;
            let lastX = 0, lastY = 0;
            const lookZone = document.getElementById('game-container');

            lookZone.addEventListener('touchstart', (e) => {
                const t = e.changedTouches[0];
                if (t.clientX < window.innerWidth * 0.4) return;
                lookActive = true;
                lookId = t.identifier;
                lastX = t.clientX;
                lastY = t.clientY;
            }, { passive: true });

            lookZone.addEventListener('touchmove', (e) => {
                if (!lookActive) return;
                for (const t of e.changedTouches) {
                    if (t.identifier !== lookId) continue;
                    this.yaw -= (t.clientX - lastX) * 0.004;
                    this.pitch -= (t.clientY - lastY) * 0.004;
                    this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
                    lastX = t.clientX;
                    lastY = t.clientY;
                }
            }, { passive: true });

            const lookEnd = (e) => {
                for (const t of e.changedTouches) {
                    if (t.identifier === lookId) {
                        lookActive = false;
                        lookId = null;
                    }
                }
            };
            lookZone.addEventListener('touchend', lookEnd);
            lookZone.addEventListener('touchcancel', lookEnd);
        }

        if (interactBtn) {
            interactBtn.addEventListener('click', () => {
                if (this.game.state === 'play') this.game.interactions.interact();
            });
        }
    }

    update(dt) {
        if (this.game.state !== 'play') return;

        let forward = 0;
        let strafe = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe -= 1;

        forward += this._touch.forward;
        strafe += this._touch.strafe;

        const len = Math.hypot(forward, strafe);
        if (len > 1) {
            forward /= len;
            strafe /= len;
        }

        const sin = Math.sin(this.yaw);
        const cos = Math.cos(this.yaw);

        const dx = (-sin * forward + cos * strafe) * this.speed * dt;
        const dz = (-cos * forward - sin * strafe) * this.speed * dt;

        const x0 = this.position.x;
        const z0 = this.position.z;
        const resolved = this.game.resolveCollision(x0, z0, x0 + dx, z0 + dz);
        this.position.x = resolved.x;
        this.position.z = resolved.z;

        this._applyCamera();
    }

    _applyCamera() {
        this.camera.position.set(this.position.x, this.height, this.position.z);
        const dir = new THREE.Vector3(
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        this.camera.lookAt(
            this.camera.position.x + dir.x,
            this.camera.position.y + dir.y,
            this.camera.position.z + dir.z
        );
    }
}