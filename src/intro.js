import * as THREE from 'three';

/**
 * ECHO opening — 10 seconds, synchronized with the approved English MP3s.
 * The full approved 8-second WAN animation shows the hand approaching and then
 * withdrawing from the same emergency shutdown button. Alarm lighting, radio
 * processing, the fracture, impact and white flash are created locally.
 */
export class IntroSequence {
    constructor(game) {
        this.game = game;
        this.elapsed = 0;
        this.active = false;
        this.playedDaughter = false;
        this.playedHero = false;
        this.alarmStarted = false;
        this.radioPreludePlayed = false;
        this.explosionPlayed = false;
        this.shatterStarted = false;
        this.audioRoutingReady = false;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x030507);
        this.camera = new THREE.OrthographicCamera(-1.78, 1.78, 1, -1, 0.1, 10);
        this.camera.position.z = 3;
        this.backgroundGeometry = new THREE.PlaneGeometry(2, 2);

        this.video = document.createElement('video');
        this.video.src = './assets/intro_reactor_motion.mp4';
        this.video.playsInline = true;
        this.video.muted = true;
        this.video.preload = 'auto';
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('aria-hidden', 'true');
        this.video.addEventListener('error', () => {
            console.warn('Intro: MP4 unavailable. A still frame will be shown instead.');
        });

        this.texture = new THREE.VideoTexture(this.video);
        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        this.fallbackTexture = new THREE.TextureLoader().load('./assets/intro_first_frame.jpg');
        this.fallbackTexture.colorSpace = THREE.SRGBColorSpace;
        const videoMat = new THREE.MeshBasicMaterial({map: this.fallbackTexture, toneMapped: false});
        this.videoPlane = new THREE.Mesh(new THREE.PlaneGeometry(2,2), videoMat);
        this.videoPlane.position.z = -0.2;
        this.scene.add(this.videoPlane);
        this.video.addEventListener('playing', () => {
            videoMat.map = this.texture;
            videoMat.needsUpdate = true;
            this._setFragmentMap(this.texture);
        });

        // The white flash and black title backdrop are actual Three.js quads.
        this.white = this._makeOverlay(0xffffff, 0.2);
        this.alarmOverlay = this._makeOverlay(0x9b0710, 0.12);
        this.black = this._makeOverlay(0x010205, 0.4);

        const crackGeom = this._makeCrackGeometry();
        this.crackMaterial = new THREE.LineBasicMaterial({
            color: 0xddefff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false
        });
        this.cracks = new THREE.LineSegments(crackGeom, this.crackMaterial);
        this.cracks.position.z = 0.02;
        this.scene.add(this.cracks);
        this.crackVertexCount = crackGeom.attributes.position.count;
        crackGeom.setDrawRange(0, 0);

        this.shatterGroup = new THREE.Group();
        this.shatterPieces = this._makeShatterPieces();
        this.shatterPieces.forEach(piece => this.shatterGroup.add(piece.mesh));
        this.shatterGroup.visible = false;
        this.shatterGroup.position.z = -0.18;
        this.scene.add(this.shatterGroup);

        this.alarmAudio = new Audio('./assets/alarm_siren.mp3');
        this.alarmAudio.preload = 'auto';
        this.alarmAudio.loop = true;
        this.alarmAudio.volume = 0.32;
        this.explosionAudio = new Audio('./assets/intro_explosion.mp3');
        this.explosionAudio.preload = 'auto';
        this.explosionAudio.volume = 0.92;
        this.daughter = new Audio('./assets/intro_daughter.mp3');
        this.hero = new Audio('./assets/intro_hero.mp3');
        this.daughter.preload = 'auto';
        this.hero.preload = 'auto';
        this.daughter.volume = 0.68;
        this.hero.volume = 0.95;

        this.interface = document.getElementById('intro-interface');
        this.caption = document.getElementById('intro-caption');
        this.title = document.getElementById('intro-title');
        this.skipButton = document.getElementById('intro-skip');
        if (this.skipButton) this.skipButton.addEventListener('click', () => this.finish());
        this._onResize();
    }

    _makeOverlay(color, z) {
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
            toneMapped: false
        });
        const mesh = new THREE.Mesh(this.backgroundGeometry, material);
        mesh.position.z = z;
        this.scene.add(mesh);
        return mesh;
    }

    _makeCrackGeometry() {
        // Deterministic fractures. Each crack is a pair of 3D vertices.
        // The main ray endpoints are also reused as the boundaries for the
        // shatter fragments, so the breakup follows the visible crack pattern.
        let seed = 12711;
        const rnd = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        const points = [];
        const segment = (a, b) => points.push(a[0], a[1], 0, b[0], b[1], 0);
        const center = [-0.30, 0.08];
        this.crackCenter = new THREE.Vector2(center[0], center[1]);
        this.crackRays = [];
        for (let ray = 0; ray < 12; ray++) {
            let point = center;
            const theta = ray * Math.PI * 2 / 12 + rnd() * 0.23;
            const reach = 0.55 + rnd() * 1.05;
            const steps = 3 + Math.floor(rnd()*3);
            for (let k = 1; k <= steps; k++) {
                const r = reach * k / steps;
                const next = [center[0] + Math.cos(theta)*r + (rnd()-.5)*.12,
                              center[1] + Math.sin(theta)*r + (rnd()-.5)*.12];
                segment(point, next);
                if (k >= 2) {
                    let twig = next;
                    const twist = theta + (rnd() > .5 ? 1 : -1) * (.65 + rnd()*.55);
                    for (let m = 0; m < 2; m++) {
                        const nextTwig = [twig[0] + Math.cos(twist)*(.12+m*.07),
                                          twig[1] + Math.sin(twist)*(.12+m*.07)];
                        segment(twig,nextTwig);
                        twig=nextTwig;
                    }
                }
                point = next;
            }
            this.crackRays.push({
                angle: Math.atan2(point[1] - center[1], point[0] - center[0]),
                endpoint: new THREE.Vector2(point[0], point[1])
            });
        }
        this.crackRays.sort((a, b) => a.angle - b.angle);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        return geometry;
    }

    _rayToBounds(angle) {
        const c = this.crackCenter;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const candidates = [];
        if (Math.abs(dx) > 1e-5) {
            const tx1 = (-1 - c.x) / dx;
            const tx2 = (1 - c.x) / dx;
        }
        const pushCandidate = (t) => {
            if (t <= 0) return;
            const x = c.x + dx * t;
            const y = c.y + dy * t;
            if (x >= -1.001 && x <= 1.001 && y >= -1.001 && y <= 1.001) {
                candidates.push({t, point: new THREE.Vector2(x, y)});
            }
        };
        if (Math.abs(dx) > 1e-5) {
            pushCandidate((-1 - c.x) / dx);
            pushCandidate((1 - c.x) / dx);
        }
        if (Math.abs(dy) > 1e-5) {
            pushCandidate((-1 - c.y) / dy);
            pushCandidate((1 - c.y) / dy);
        }
        candidates.sort((a, b) => a.t - b.t);
        return candidates.length ? candidates[0].point : new THREE.Vector2(c.x + dx, c.y + dy);
    }

    _makeFragmentGeometry(points) {
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].y);
        shape.closePath();
        const geom = new THREE.ShapeGeometry(shape);
        const pos = geom.attributes.position;
        const uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            uv[i * 2] = (x + 1) * 0.5;
            uv[i * 2 + 1] = (y + 1) * 0.5;
        }
        geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        return geom;
    }


    _makeShatterPieces() {
        const pieces = [];
        let seed = 8842;
        const rnd = () => {
            seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
            return seed / 4294967296;
        };
        const center = this.crackCenter.clone();
        const rays = this.crackRays;
        for (let i = 0; i < rays.length; i++) {
            const a = rays[i];
            const b = rays[(i + 1) % rays.length];
            const outerA = this._rayToBounds(a.angle);
            const outerB = this._rayToBounds(b.angle);
            const geom = this._makeFragmentGeometry([
                center,
                a.endpoint,
                outerA,
                outerB,
                b.endpoint
            ]);
            const mat = new THREE.MeshBasicMaterial({
                map: this.fallbackTexture,
                transparent: true,
                opacity: 0,
                toneMapped: false,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.visible = false;

            const centroid = new THREE.Vector2(
                (center.x + a.endpoint.x + outerA.x + outerB.x + b.endpoint.x) / 5,
                (center.y + a.endpoint.y + outerA.y + outerB.y + b.endpoint.y) / 5
            );
            const dir = centroid.clone().sub(center).normalize();
            const velocity = new THREE.Vector3(
                dir.x * (0.42 + rnd() * 0.62),
                dir.y * (0.42 + rnd() * 0.62),
                0
            );
            const spin = (rnd() - 0.5) * 4.2;
            pieces.push({
                mesh,
                velocity,
                spin,
                delay: rnd() * 0.075,
                driftX: 0,
                driftY: 0
            });
        }
        return pieces;
    }


    _setFragmentMap(map) {
        if (!this.shatterPieces) return;
        this.shatterPieces.forEach(piece => {
            piece.mesh.material.map = map;
            piece.mesh.material.needsUpdate = true;
        });
    }


    _onResize() {
        const aspect = window.innerWidth / Math.max(1,window.innerHeight);
        this.camera.left = -aspect;
        this.camera.right = aspect;
        this.camera.top = 1;
        this.camera.bottom = -1;
        this.camera.updateProjectionMatrix();
        // Fit video to the screen with cinematic crop but no letterboxing.
        const imageAspect = 16/9;
        const width = 2*Math.max(aspect,imageAspect);
        const height = width/imageAspect;
        const overlays = [this.white,this.alarmOverlay,this.black];
        this.videoPlane.scale.set(width/2,height/2,1);
        this.shatterGroup.scale.set(width/2,height/2,1);
        overlays.forEach(plane => plane.scale.set(aspect,1,1));
    }

    start() {
        this.stop();
        this.elapsed = 0;
        this.active = true;
        this.playedDaughter = false;
        this.playedHero = false;
        this.radioPreludePlayed = false;
        this.explosionPlayed = false;
        this.shatterStarted = false;
        this.white.material.opacity = 0;
        this.alarmOverlay.material.opacity = 0;
        this.black.material.opacity = 0;
        this.crackMaterial.opacity = 0;
        this.cracks.geometry.setDrawRange(0,0);
        this.videoPlane.visible = true;
        this.videoPlane.position.set(0,0,-0.2);
        this.videoPlane.rotation.set(0,0,0);
        this.videoPlane.material.map = this.fallbackTexture;
        this.videoPlane.material.needsUpdate = true;
        this._setFragmentMap(this.fallbackTexture);
        this.shatterGroup.visible = false;
        this.shatterGroup.position.set(0,0,-0.18);
        this.shatterGroup.rotation.set(0,0,0);
        this.shatterPieces.forEach(piece => {
            piece.mesh.visible = false;
            piece.mesh.material.opacity = 0;
            piece.mesh.position.set(0, 0, 0);
            piece.mesh.rotation.set(0,0,0);
            piece.mesh.scale.set(1,1,1);
        });
        this.alarmAudio.currentTime = 0;
        this.explosionAudio.pause();
        this.explosionAudio.currentTime = 0;
        this.daughter.currentTime = 0;
        this.hero.currentTime = 0;
        this.daughter.playbackRate = 1;
        this.hero.playbackRate = 1;
        try { this.video.currentTime = 0; } catch (_) {}
        this._ensureAudioRouting();
        if (this.game.audioCtx?.state === 'suspended') this.game.audioCtx.resume();
        this._startAlarm();
        this.interface?.classList.add('active');
        this.title?.classList.remove('visible');
        this.caption && (this.caption.textContent = '');
        document.body.classList.add('intro-active');
        this.video.play().catch(error => {
            console.warn('Intro: video playback blocked; keeping still-frame fallback.', error);
        });
    }

    _ensureAudioRouting() {
        const ctx = this.game.audioCtx;
        if (!ctx || this.audioRoutingReady) return;
        try {
            // Daughter's voice passes through a narrow radio band and mild saturation.
            this.daughterSource = ctx.createMediaElementSource(this.daughter);
            this.radioHighpass = ctx.createBiquadFilter();
            this.radioHighpass.type = 'highpass';
            this.radioHighpass.frequency.value = 680;
            this.radioLowpass = ctx.createBiquadFilter();
            this.radioLowpass.type = 'lowpass';
            this.radioLowpass.frequency.value = 1750;
            this.radioSaturation = ctx.createWaveShaper();
            const curve = new Float32Array(512);
            for (let i = 0; i < curve.length; i++) {
                const x = (i * 2 / (curve.length - 1)) - 1;
                curve[i] = Math.tanh(x * 4.2) / Math.tanh(4.2);
            }
            this.radioSaturation.curve = curve;
            this.radioSaturation.oversample = '2x';

            // Quantized signal adds the crunchy, bandwidth-limited character
            // of a weak/old radio connection without changing the source MP3.
            this.radioBitcrusher = ctx.createWaveShaper();
            const crush = new Float32Array(512);
            const steps = 22;
            for (let i = 0; i < crush.length; i++) {
                const x = (i * 2 / (crush.length - 1)) - 1;
                crush[i] = Math.round(x * steps) / steps;
            }
            this.radioBitcrusher.curve = crush;
            this.radioBitcrusher.oversample = 'none';

            this.radioGain = ctx.createGain();
            this.radioGain.gain.value = 0.76;

            // More noticeable, but still intelligible, radio signal flutter.
            this.radioFlutter = ctx.createOscillator();
            this.radioFlutterGain = ctx.createGain();
            this.radioFlutter.type = 'sine';
            this.radioFlutter.frequency.value = 8.5;
            this.radioFlutterGain.gain.value = 0.085;
            this.radioFlutter.connect(this.radioFlutterGain).connect(this.radioGain.gain);
            this.radioFlutter.start();

            this.daughterSource.connect(this.radioHighpass)
                .connect(this.radioLowpass)
                .connect(this.radioSaturation)
                .connect(this.radioBitcrusher)
                .connect(this.radioGain)
                .connect(ctx.destination);
            this.audioRoutingReady = true;
        } catch (error) {
            console.warn('Intro: radio processing unavailable; using clean voice.', error);
        }
    }

    _startAlarm() {
        if (!this.game.soundEnabled || this.alarmStarted) return;
        this.alarmStarted = true;
        this.alarmAudio.currentTime = 0;
        this.alarmAudio.volume = 0.32;
        this.alarmAudio.play().catch(() => console.warn('Intro: alarm audio playback unavailable'));
    }

    _stopAlarm() {
        if (!this.alarmStarted) return;
        this.alarmStarted = false;
        try {
            this.alarmAudio.pause();
            this.alarmAudio.currentTime = 0;
        } catch (_) {}
    }

    _playRadioStatic(delay = 0, duration = 0.09, gainAmount = 0.05) {
        const ctx = this.game.audioCtx;
        if (!ctx || !this.game.soundEnabled) return;
        const startAt = ctx.currentTime + delay;
        const length = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        filter.type = 'bandpass';
        filter.frequency.value = 1850;
        filter.Q.value = 1.1;
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.linearRampToValueAtTime(gainAmount, startAt + 0.016);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        source.buffer = buffer;
        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start(startAt);
    }

    _playExplosion() {
        if (!this.game.soundEnabled || this.explosionPlayed) return;
        this.explosionPlayed = true;
        try {
            this.explosionAudio.pause();
            this.explosionAudio.currentTime = 0;
            this.explosionAudio.volume = 0.92;
            this.explosionAudio.playbackRate = 1.0;
            this.explosionAudio.play().catch(() => {
                console.warn('Intro: explosion audio playback unavailable');
            });
        } catch (error) {
            console.warn('Intro: explosion audio could not be started.', error);
        }
    }

    _speak(audio, subtitle, options = {}) {
        if (this.caption) this.caption.textContent = subtitle;
        if (!this.game.soundEnabled) return;
        audio.currentTime = 0;
        audio.playbackRate = options.rate || 1;
        audio.play().catch(() => console.warn('Intro: audio playback unavailable'));
        if (options.radio && this.radioGain && this.game.audioCtx) {
            const now = this.game.audioCtx.currentTime;
            this.radioGain.gain.cancelScheduledValues(now);
            this.radioGain.gain.setValueAtTime(0.74, now);
            this.radioGain.gain.setValueAtTime(0.36, now + 0.28);
            this.radioGain.gain.setValueAtTime(0.74, now + 0.37);
            this.radioGain.gain.setValueAtTime(0.42, now + 0.76);
            this.radioGain.gain.setValueAtTime(0.74, now + 0.87);
        }
    }

    update(dt) {
        if (!this.active) return;
        this.elapsed += dt;
        const t = this.elapsed;
        this._onResizeIfChanged();

        // Immediate alarm atmosphere: stronger red pulses and slight light flicker.
        if (t < 8.9) {
            const pulse = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.55)), 5);
            this.alarmOverlay.material.opacity = 0.05 + pulse * 0.22;
        } else {
            this.alarmOverlay.material.opacity = 0;
        }

        // A short radio hiss arrives just before the daughter speaks.
        if (t >= 2.0 && !this.radioPreludePlayed) {
            this.radioPreludePlayed = true;
            this._playRadioStatic(0, 0.20, 0.105);
            this._playRadioStatic(0.22, 0.075, 0.065);
        }

        if (t >= 2.22 && !this.playedDaughter) {
            this.playedDaughter = true;
            this._speak(this.daughter, 'Папа?', {radio: true});
            // Broken-signal crackles briefly cut across the transmission.
            this._playRadioStatic(0.34, 0.065, 0.075);
            this._playRadioStatic(0.79, 0.085, 0.085);
            this._playRadioStatic(1.08, 0.10, 0.06);
        }

        // Hero's line lands right before the hand withdraws.
        if (t >= 4.35 && !this.playedHero) {
            this.playedHero = true;
            this._speak(this.hero, 'Ещё одну секунду.', {rate: 1.14});
        }

        // After the line, the image begins to shake.
        if (t >= 7.15 && t < 9.35) {
            const strength = Math.min(1, (t - 7.15) / 0.55) * 0.018;
            this.videoPlane.position.x = (Math.sin(t * 33.0) + Math.sin(t * 20.0) * 0.5) * strength;
            this.videoPlane.position.y = Math.sin(t * 27.0) * strength * 0.7;
            this.videoPlane.rotation.z = Math.sin(t * 24.0) * strength * 0.65;
        } else {
            this.videoPlane.position.set(0, 0, -0.2);
            this.videoPlane.rotation.z = 0;
        }

        // Explosion first, then visible cracking.
        if (t >= 8.18 && !this.explosionPlayed) {
            this._stopAlarm();
            this._playExplosion();
        }

        if (t >= 8.52 && t < 8.88) {
            const grow = Math.min(1, (t - 8.52) / 0.36);
            const n = Math.floor((this.crackVertexCount * grow) / 2) * 2;
            this.cracks.geometry.setDrawRange(0, n);
            this.crackMaterial.opacity = Math.min(.98, (t - 8.52) * 3.2);
        }

        // After the cracks, the screen shatters into moving fragments.
        if (t >= 8.90) {
            if (!this.shatterStarted) {
                this.shatterStarted = true;
                this.videoPlane.visible = false;
                this.shatterGroup.visible = true;
                this.shatterPieces.forEach(piece => {
                    piece.mesh.visible = true;
                    piece.mesh.material.opacity = 1;
                });
            }
            const p = Math.min(1, (t - 8.90) / 0.62);
            this.shatterPieces.forEach(piece => {
                const q = Math.max(0, p - piece.delay);
                piece.mesh.position.x = piece.velocity.x * q * 1.6;
                piece.mesh.position.y = piece.velocity.y * q * 1.45;
                piece.mesh.rotation.z = piece.spin * q;
                piece.mesh.material.opacity = Math.max(0, 1 - q * 2.1);
            });
        }

        // Flash after the shatter.
        if (t >= 9.55) {
            if (t < 9.83) this.white.material.opacity = Math.min(1, (t - 9.55) / 0.1);
            else this.white.material.opacity = Math.max(0, 1 - (t - 9.83) / 0.32);
        }
        if (t >= 10.17) this.black.material.opacity = Math.min(1, (t - 10.17) / 0.24);
        if (t >= 10.47) {
            if (this.title) this.title.classList.add('visible');
            if (this.caption) this.caption.textContent = '';
        }
        if (t >= 11.7) this.finish();
    }

    _onResizeIfChanged() {
        const width = window.innerWidth, height = window.innerHeight;
        if (width!==this._width || height!==this._height) {
            this._width = width;this._height=height;this._onResize();
        }
    }

    stop() {
        this.active = false;
        this.video.pause();
        this.daughter.pause();
        this.hero.pause();
        this.alarmAudio.pause();
        this.explosionAudio.pause();
        this._stopAlarm();
        if (this.interface) this.interface.classList.remove('active');
        document.body.classList.remove('intro-active');
        if (this.caption) this.caption.textContent = '';
        if (this.title) this.title.classList.remove('visible');
    }

    finish() {
        if (!this.active) return;
        this.stop();
        this.game._onIntroFinished();
    }
}
