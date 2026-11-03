import { BackgroundMusic } from './music.js';
import { KeyboardControls } from './keyboard-controls.js';
import { CreditsRoll } from './credits.js';
import { PrologueSequence } from './prologue.js';
import { dressLaterAct } from './later-acts.js';
import { makeModel } from './models.js';
import { dressAirlock } from './atmosphere.js';
import * as THREE from 'three';
import { buildAirlock } from './scenery.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { Memory } from './memory.js';
import { Interactions } from './interactions.js';
import { SaveSystem } from './save.js';
import { levels } from './levels.js';
import { whispers, endings } from './story.js';
import { IntroSequence } from './intro.js';
import { RecoveredTransmission } from './recording.js';

export class Game {
    constructor() {
        this.state = 'menu';
        this.levelIndex = 0;
        this.colliders = [];
        this.interactables = [];
        this.levelObjects = [];
        this.unlockedEndings = new Set();
        this.soundEnabled = true;
        this.audioCtx = null;
        this._whisperTimeout = null;
        this._whisperStarted = false;
        this.recording = null;
        this.introSeen = true;
        this.hasActiveRun = false;
        this.branchCheckpoint = null;
        this.completedEnding = null;
    }

    init() {
        const save = SaveSystem.load();
        this.levelIndex = save.level || 0;
        this.branchCheckpoint = save.branchCheckpoint || null;
        (save.endings || []).forEach(e => this.unlockedEndings.add(e));

        this.memory = new Memory();
        if (save.memory) this.memory.load(save.memory);
        this.introSeen = !!save.introSeen;
        this.prologueSeen = !!save.prologueSeen || this.introSeen;

        this._initThree();
        this.ui = new UI(this);
        this.interactions = new Interactions(this);
        this.player = new Player(this, this.camera, this.renderer.domElement);
        this._initAudio();
        this.intro = new IntroSequence(this);
        this.prologue = new PrologueSequence(this);

        this.music = new BackgroundMusic(this);
        this.menuMusic = new BackgroundMusic(this, {menu:true,src:'./assets/menu_music.mp3'});
        this.recording = new RecoveredTransmission(this);
        this.credits = new CreditsRoll();
        this._bindUI();
        this.keyboard = new KeyboardControls(this);
        this._updateMenuState();

        window.addEventListener('resize', () => this._onResize());
        this._autosave = setInterval(() => { if (this.hasActiveRun) this.saveState(); }, 1500);
        window.addEventListener('pagehide', () => { if (this.hasActiveRun) this.saveState(); });
        document.addEventListener('visibilitychange', () => { if (document.hidden && this.hasActiveRun) this.saveState(); });
        document.body.classList.add('menu-view');
        this.clock = new THREE.Clock();
        this._animate();
    }

    _initThree() {
        const container = document.getElementById('game-container');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05070a);
        this.scene.fog = new THREE.FogExp2(0x05070a, 0.045);

        this.camera = new THREE.PerspectiveCamera(
            70, window.innerWidth / window.innerHeight, 0.1, 100
        );

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        this.ambient = new THREE.AmbientLight(0x334455, 0.6);
        this.scene.add(this.ambient);
        this.levelLight = null;
        this.floor = null;
    }

    _initAudio() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.audioCtx = null;
        }
    }

    /* ================= UI / меню ================= */
    _bindUI() {
        const startBtn = document.getElementById('btn-start');
        const continueBtn = document.getElementById('btn-continue');
        const resumeBtn = document.getElementById('btn-resume');
        const backMenuBtn = document.getElementById('btn-back-menu');

        document.getElementById('btn-return-branch')?.addEventListener('click', () => this.returnToBranch());
        document.getElementById('btn-endings')?.addEventListener('click', () => {this.ui.updateEndingsCounter();this._showScreen('endings-screen');});
        document.getElementById('btn-endings-back')?.addEventListener('click', () => this._showScreen('menu-screen'));
        document.getElementById('btn-about')?.addEventListener('click', () => this._showScreen('about-screen'));
        document.getElementById('btn-about-back')?.addEventListener('click', () => this._showScreen('menu-screen'));
        document.getElementById('btn-credits').addEventListener('click', () => {
            this._showScreen('credits-screen');
            this.credits.start();
        });
        document.getElementById('btn-credits-back').addEventListener('click', () => this._showScreen('about-screen'));
        document.getElementById('btn-menu-sound').addEventListener('click', () => this.toggleSound());
        if (startBtn) startBtn.addEventListener('click', () => this.startNewGame());
        if (continueBtn) continueBtn.addEventListener('click', () => this.continueGame());
        if (resumeBtn) resumeBtn.addEventListener('click', () => this.resume());
        if (backMenuBtn) backMenuBtn.addEventListener('click', () => this.backToMenu());

    }

    _updateMenuState() {
        const continueBtn = document.getElementById('btn-continue');
        if (continueBtn) {
            const hasSave = typeof SaveSystem.hasSave === 'function'
                ? SaveSystem.hasSave()
                : !!localStorage.getItem('echo_save');
            continueBtn.disabled = !hasSave || this.unlockedEndings.size === 0;
            continueBtn.hidden = false;
        }
        const branch = document.getElementById('btn-return-branch');
        if (branch) {branch.hidden=false;branch.disabled=!this.branchCheckpoint || this.unlockedEndings.size===0;}
        if (this.ui) this.ui.updateEndingsCounter();
    }

    _showScreen(id) {
        if (id !== 'credits-screen') this.credits?.stop();
        document.body.classList.toggle('menu-view', ['menu-screen','about-screen','endings-screen','credits-screen'].includes(id));
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        if (id) {
            const el = document.getElementById(id);
            if (el) el.classList.add('active');
        }
    }

    startNewGame() {
        this.menuMusic?.pause();
        this.music?.reset();        this.prologue?.stop();
        this.prologueSeen=false;
        this.intro?.stop();
        this.finishRecoveredRecording();
        this._stopWhispers();
        this.audioCtx?.resume().catch(()=>{});
        this.hasActiveRun = true;
        this.branchCheckpoint = null;
        this.completedEnding = null;
        this.memory = new Memory();
        this.levelIndex = 0;
        this.introSeen = false;
        this._showScreen(null);
        this.ui.resetForMenu();
        this.state = 'prologue';
        this.introSeen = false;
        this._loadLevel(0);
        if (document.pointerLockElement) this._releasePointerLock();
        this.prologue.start();
    }

    _startIntroVideo() {
        if(this.state!=='prologue')return;
        this.prologueSeen=true;this.state='intro';this.saveState();this.intro.start();
    }

    _onIntroFinished() {
        if (this.state !== 'intro') return;
        this.introSeen = true;
        this.hasActiveRun = true;
        this.state = 'play';
        this.saveState();
        this.ui.announceLocation(levels[this.levelIndex]);
        this.ui.showSubtitle('Проект ECHO. Восстановление памяти запущено.', 4200);
        this._startWhispers();
        this._requestPointerLock();
    }

    continueGame() {
        this.menuMusic?.pause();
        if (!SaveSystem.hasSave() || this.unlockedEndings.size===0) return;
        this.audioCtx?.resume().catch(()=>{});
        const save = SaveSystem.load();
        this.hasActiveRun = true;
        this.branchCheckpoint = save.branchCheckpoint || null;
        this.completedEnding = save.completedEnding || null;
        this.levelIndex = save.level || 0;
        this.memory = new Memory();
        if (save.memory) this.memory.load(save.memory);
        // Older saves reached Act III without a first choice. Resume at the new branch.
        if (this.levelIndex === 2 && !this.memory.moralChoice) {
            this.levelIndex = 1;
            this.memory.fragments.delete('toy_memory');
            this.completedEnding = null;
            save.player = null;
        }
        (save.endings || []).forEach(e => this.unlockedEndings.add(e));

        this.intro?.stop();
        this._showScreen(null);
        this.introSeen = !!save.introSeen;
        this.prologueSeen = !!save.prologueSeen || this.introSeen;
        this.state = (this.levelIndex === 0 && !this.introSeen) ? (this.prologueSeen ? 'intro' : 'prologue') : 'play';
        this.ui.resetForMenu();
        this._loadLevel(this.levelIndex);
        this._restorePlayer(save.player);
        this.saveState();
        if (this.completedEnding && endings[this.completedEnding]) {
            this.state = 'ending';
            this.ui.showEnding(endings[this.completedEnding], {onBackToMenu: () => this.backToMenu()});
            return;
        }
        if (this.state === 'prologue') {
            this.prologue.start();
        } else if (this.state === 'intro') {
            if (document.pointerLockElement) this._releasePointerLock();
            this.intro.start();
        } else {
            this._requestPointerLock();
            this._startWhispers();
            if(this.levelIndex===1 && !this.memory.moralChoice && this.memory.canRestoreEvacuationEvidence())this.openMoralChoice();
        }
    }

    pause() {
        if (!['play','dialog','journal','memory','choice','ending','prologue','intro','ending-cinematic'].includes(this.state)) return;
        this._pausedState = this.state;
        this.saveState();
        this.state = 'paused';
        this.player.clearInput();
        const media = [this.intro?.video, this.intro?.alarmAudio, this.intro?.explosionAudio,
            this.intro?.daughter, this.intro?.hero, this.recording?.daughter,
            this.recording?.explosion, this.ui?.endingCinematic.video];
        this._pausedMedia = [...new Set(media)].filter(item => item && !item.paused && !item.ended);
        this._pausedMedia.forEach(item => item.pause());
        this._audioWasRunning = !!this.audioCtx && this.audioCtx.state !== 'closed';
        if (this._audioWasRunning) {
            this.audioCtx.suspend().catch(() => {});
            // A rapid E, Escape sequence can still have a pending resume.
            this._audioResumePromise?.then(() => {
                if (this.state === 'paused') this.audioCtx.suspend().catch(() => {});
            });
        }
        this.prologue?.radio.pause();
        this.recording?.pause();
        this.music?.pause();
        if (document.pointerLockElement) this._releasePointerLock();
        document.getElementById('pause-screen').classList.add('active');
        document.getElementById('btn-resume').focus({ preventScroll: true });
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = this._pausedState || 'play';
        this._pausedState = null;
        this.player.clearInput();
        document.getElementById('pause-screen').classList.remove('active');
        if (this._audioWasRunning) this._audioResumePromise = this.audioCtx?.resume().catch(() => {});
        this.prologue?.radio.resume();
        this.recording?.resume();
        for (const media of this._pausedMedia || []) {
            if (media === this.ui.endingCinematic.video) this.ui.endingCinematic.play();
            else media.play().catch(() => {});
        }
        this._pausedMedia = [];
        if (this.state === 'play') this._requestPointerLock();
    }

    backToMenu() {
        this._pausedState = null;
        this._pausedMedia = [];
        this.player.clearInput();
        this.music?.pause();        this.prologue?.stop();
        if (this.hasActiveRun) this.saveState();
        this.hasActiveRun = false;
        this.intro?.stop();
        this.finishRecoveredRecording();
        this.state = 'menu';
        this._releasePointerLock();
        if (this.ui) this.ui.resetForMenu();
        this._clearLevel();
        this._showScreen('menu-screen');
        this._updateMenuState();
        this._stopWhispers();
        this.menuMusic?.unlock();
    }

    _releasePointerLock() {
        if (this.keyboard) this.keyboard.wasLocked = false;
        if (document.pointerLockElement) document.exitPointerLock();
    }

    _requestPointerLock() {
        if (!this.renderer || !this.renderer.domElement) return;
        if (this.player && this.player.isMobile) return;
        if (document.pointerLockElement === this.renderer.domElement) return;
        try {
            this.renderer.domElement.requestPointerLock()?.catch(()=>{});
        } catch (e) { /* ignore */ }
    }

    /* ================= Сохранение ================= */
    snapshot() {
        return {
            level: this.levelIndex,
            memory: this.memory.serialize(),
            introSeen: this.introSeen,
            prologueSeen: !!this.prologueSeen,
            player: this.player ? {x:this.player.position.x,z:this.player.position.z,yaw:this.player.yaw,pitch:this.player.pitch} : null
        };
    }

    saveState() {
        SaveSystem.save({...this.snapshot(), endings:Array.from(this.unlockedEndings), branchCheckpoint:this.branchCheckpoint, completedEnding:this.completedEnding});
    }

    _restorePlayer(p) {
        if (!p || !['x','z','yaw','pitch'].every(k=>Number.isFinite(p[k]))) return;
        const half=this.levelIndex===1?5.35:4.35;
        if(Math.abs(p.x)>half || Math.abs(p.z)>half)return;
        const pos=this.resolveCollision(p.x,p.z,p.x,p.z);
        this.player.setPosition(pos.x,1.7,pos.z);this.player.yaw=p.yaw;this.player.pitch=Math.max(-1.5,Math.min(1.5,p.pitch));this.player._applyCamera();
    }

    openMoralChoice() {
        if (!this.memory.canRestoreEvacuationEvidence()) return;
        if (!this.branchCheckpoint) {
            this.branchCheckpoint=this.snapshot();
            this.branchCheckpoint.memory.moralChoice=null;
        }
        this.saveState();this.state='choice';
        if(document.pointerLockElement)this._releasePointerLock();
        this.ui.showMoralChoice(choice=>{
            if (!this.memory.chooseResponsibility(choice)) return;
            this.completedEnding=null;this.state='play';this.ui.hideMoralChoice();this.loadLevel(2);this._requestPointerLock();
        });
    }

    returnToBranch() {
        this.menuMusic?.pause();
        const cp=this.branchCheckpoint;
        if(!cp || this.unlockedEndings.size===0)return;
        this.intro?.stop();this.finishRecoveredRecording();this.ui.resetForMenu();
        this.memory=new Memory();this.memory.load(cp.memory);this.memory.moralChoice=null;
        this.completedEnding=null;this.introSeen=true;this.hasActiveRun=true;
        this._showScreen(null);this.state='play';this._loadLevel(1);this._restorePlayer(cp.player);this.saveState();this.openMoralChoice();
    }

    /* ================= Звук (alias) ================= */
    playBlip() {
        this.playTone(660, 0.08, 'square', 0.04);
    }

    /* ================= Уровни ================= */
    _clearLevel() {
        this.colliders = [];
        this.interactables = [];
        this.levelObjects.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
            obj.traverse(node => {
                node.geometry?.dispose();
                node.shadow?.dispose();
                if (node.material) {
                    const materials = Array.isArray(node.material) ? node.material : [node.material];
                    materials.forEach(mat => {
                        new Set([mat.map, mat.bumpMap, mat.normalMap, mat.specularColorMap, mat.roughnessMap, mat.emissiveMap]).forEach(t => t?.dispose());
                        mat.dispose();
                    });
                }
            });
        });
        this.levelObjects = [];
        if (this.floor) {
            this.scene.remove(this.floor);
            this.floor.geometry.dispose();
            new Set([this.floor.material.map, this.floor.material.bumpMap]).forEach(t => t?.dispose());
            this.floor.material.dispose();
            this.floor = null;
        }
        if (this.levelLight) {
            this.scene.remove(this.levelLight);
            this.levelLight = null;
        }
    }

    _loadLevel(index) {
        this.recording?.stop();
        this.ui?.hideTransmission();
        this._clearLevel();
        const level = levels[index];
        if (!level) return;
        this.levelIndex = index;

        this._buildLevel(level);

        const spawn = level.spawn || { x: 0, y: 1.7, z: 3.5 };
        if (this.player) {
            this.player.setPosition(spawn.x, spawn.y, spawn.z);
        }
        if (this.ui) {
            this.ui.updateAct(level, this.memory);
            this.ui.updateEndingsCounter();
        }
        this.saveState();
        if (this.state === 'play') { this.ui?.announceLocation(level); this._startWhispers(); }
    }

    /* Публичный алиас для interactions.js */
    loadLevel(index) {
        this._loadLevel(index);
    }

    /* ===== Построение уровня из данных ===== */
    _buildLevel(level) {
        // Пол
        const floorGeo = new THREE.PlaneGeometry(60, 60);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0a0f14,
            roughness: 0.9,
            metalness: 0.1
        });
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = 0;
        this.floor.receiveShadow = false;
        this.scene.add(this.floor);

        this.ambient.color.set(level.id === 'airlock' ? 0x879f9b : 0x334455);
        this.ambient.intensity = level.id === 'airlock' ? .55 : .6;
        this.renderer.toneMapping = level.id === 'airlock' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
        this.scene.fog.color.set(level.id === 'airlock' ? 0x192623 : 0x05070a);
        this.scene.fog.density = level.id === 'airlock' ? .025 : .045;

        // Свет уровня
        this.levelLight = new THREE.PointLight(
            level.lightColor || 0x00aaff, level.id === 'airlock' ? 12 : 1.2, 30
        );
        this.levelLight.position.set(0, 4, 0);
        this.scene.add(this.levelLight);

        // Ceiling strips and warning markings make the three spaces legible,
        // without introducing new locations or interactable objects.
        const span = level.id === 'lab' ? 11 : 9;
        const lightMat = new THREE.MeshBasicMaterial({
            color: level.lightColor || 0x4aafd0,
            transparent: true,
            opacity: 0.68
        });
        for (const z of [-3.5, 0, 3.5]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(span, 0.045, 0.11), lightMat);
            rail.position.set(0, 4.75, z);
            this.scene.add(rail);
            this.levelObjects.push(rail);
        }
        const lineMat = new THREE.MeshBasicMaterial({
            color: level.id === 'capsule' ? 0xa2c6d9 : 0x416678,
            transparent: true,
            opacity: 0.55
        });
        for (const x of [-3.2, 3.2]) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 8), lineMat);
            stripe.position.set(x, 0.014, 0);
            this.scene.add(stripe);
            this.levelObjects.push(stripe);
        }

        // Стены
        (level.walls || []).forEach(w => {
            const geo = new THREE.BoxGeometry(w.w, w.h, w.d);
            const mat = new THREE.MeshStandardMaterial({
                color: level.wallColor || 0x223344,
                roughness: 0.8,
                metalness: 0.2
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(w.x, w.y, w.z);
            this.scene.add(mesh);
            this.levelObjects.push(mesh);

            this.colliders.push({
                min: new THREE.Vector3(w.x - w.w / 2, 0, w.z - w.d / 2),
                max: new THREE.Vector3(w.x + w.w / 2, w.h, w.z + w.d / 2)
            });
        });

        const drawingTexture = level.id === 'airlock' ? buildAirlock(this) : null;
        let drawingTextureUsed = false;

        // Объекты
        (level.objects || []).forEach(o => {
            if ((o.type === 'drawing' || o.type === 'toy') && o.fragment && this.memory.hasFragment(o.fragment)) return;
            const group = this._makeObject(o);
            if (group) {
                if (o.type === 'drawing' && drawingTexture) {
                    group.children[0].material.map = drawingTexture;
                    group.children[0].material.color.set(0xffffff);
                    group.children[0].material.emissive.set(0x554a35);
                    group.children[0].material.emissiveMap = drawingTexture;
                    drawingTextureUsed = true;
                }
                this.scene.add(group);
                this.levelObjects.push(group);
                this.interactables.push(group);
            }
        });

        if (drawingTexture && !drawingTextureUsed) drawingTexture.dispose();

        // Выход
        if (level.exit) {
            const exitGroup = this._makeExit(level.exit);
            this.scene.add(exitGroup);
            this.levelObjects.push(exitGroup);
            this.interactables.push(exitGroup);
        }
        if (level.id === 'airlock') dressAirlock(this);
        else dressLaterAct(this, level);
    }

    _makeObject(o) {
        const group = new THREE.Group();
        group.position.set(o.pos[0], o.pos[1], o.pos[2]);
        group.userData = {
            type: o.type,
            id: o.id,
            label: o.label,
            fragment: o.fragment
        };

        if (o.type === 'toy') {
            group.add(makeModel('memory-bear'));
            return group;
        }

        if (o.type === 'radio' && this.levelIndex === 0) {
            group.add(makeModel('radio'));
            return group;
        }

        let mesh;
        switch (o.type) {
            case 'note': {
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.4, 0.5, 0.05),
                    new THREE.MeshStandardMaterial({
                        color: 0xcfe8ff,
                        emissive: 0x2266aa,
                        emissiveIntensity: 0.4
                    })
                );
                break;
            }
            case 'drawing': {
                mesh = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.7, 0.5),
                    new THREE.MeshStandardMaterial({
                        color: 0xffddaa,
                        emissive: 0xaa7722,
                        emissiveIntensity: 0.4,
                        side: THREE.DoubleSide
                    })
                );
                break;
            }
            case 'toy': {
                mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.2, 12, 12),
                    new THREE.MeshStandardMaterial({
                        color: 0xff6688,
                        emissive: 0x662233,
                        emissiveIntensity: 0.4
                    })
                );
                break;
            }
            case 'radio': {
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.86, 0.52, 0.2),
                    new THREE.MeshStandardMaterial({
                        color: 0x20333a,
                        emissive: 0x13525d,
                        emissiveIntensity: 0.5,
                        metalness: 0.55,
                        roughness: 0.28
                    })
                );
                const display = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.59, 0.24),
                    new THREE.MeshBasicMaterial({color: 0x75dbcf})
                );
                display.position.set(-0.06, 0.075, 0.107);
                group.add(display);
                const replayButton = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.087, 0.087, 0.04, 18),
                    new THREE.MeshStandardMaterial({color: 0xb94b4b, emissive: 0x5c1818})
                );
                replayButton.rotation.x = Math.PI / 2;
                replayButton.position.set(0.27, -0.155, 0.13);
                group.add(replayButton);
                break;
            }
            case 'guilt': {
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8, 1.0, 0.3),
                    new THREE.MeshStandardMaterial({
                        color: 0x223344,
                        emissive: 0xff00ff,
                        emissiveIntensity: 0.5
                    })
                );
                break;
            }
            case 'mirror': {
                mesh = new THREE.Mesh(
                    new THREE.PlaneGeometry(1.6, 2.25),
                    new THREE.MeshStandardMaterial({
                        color: 0x8fbbcb,
                        emissive: 0x30576b,
                        emissiveIntensity: 0.4,
                        metalness: 0.95,
                        roughness: 0.06,
                        side: THREE.DoubleSide
                    })
                );
                break;
            }
            default: {
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, 0.3, 0.3),
                    new THREE.MeshStandardMaterial({ color: 0x888888 })
                );
            }
        }

        mesh.userData.baseEmissive = mesh.material.emissiveIntensity;
        group.add(mesh);
        return group;
    }

    _makeExit(exit) {
        const group = new THREE.Group();
        group.position.set(exit.pos[0], exit.pos[1], exit.pos[2]);
        group.userData = {
            type: 'exit',
            label: 'Сервисный переход',
            requires: exit.requires || [],
            nextLevel: exit.nextLevel
        };
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x28434e, emissive: 0x247d91, emissiveIntensity: 0.6, metalness: 0.65
        });
        for (const x of [-0.68, 0.68]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.1, 0.18), frameMat);
            post.position.x = x;
            group.add(post);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.17, 0.18), frameMat);
        top.position.y = 1.05;
        group.add(top);
        const door = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.92),
            new THREE.MeshBasicMaterial({color: 0x153b43, transparent: true, opacity: 0.5, side: THREE.DoubleSide}));
        group.add(door);
        return group;
    }

    refreshActHUD() {
        this.ui?.updateAct(levels[this.levelIndex], this.memory);
    }

    playRecoveredRecording() {
        if (this.state !== 'play' || !this.recording) return;
        this.state = 'memory';
        if (document.pointerLockElement) this._releasePointerLock();
        this.ui.showTransmission();
        this.recording.play(
            (status, line) => this.ui.updateTransmission(status, line),
            () => this.finishRecoveredRecording()
        );
    }

    finishRecoveredRecording() {
        this.recording?.stop();
        this.ui?.hideTransmission();
        if (this.state === 'memory') {this.state = 'play';this._requestPointerLock();}
    }

    /* ================= Коллизии ================= */
    resolveCollision(x0, z0, x1, z1) {
        const radius = 0.35;
        let nx = x1;
        let nz = z1;

        for (const c of this.colliders) {
            if (!c || c.min === undefined) continue;
            if (nx + radius > c.min.x && nx - radius < c.max.x &&
                nz + radius > c.min.z && nz - radius < c.max.z) {
                const overlapX = Math.min(nx + radius - c.min.x, c.max.x - (nx - radius));
                const overlapZ = Math.min(nz + radius - c.min.z, c.max.z - (nz - radius));
                if (overlapX < overlapZ) {
                    nx = (nx > (c.min.x + c.max.x) / 2) ? c.max.x + radius : c.min.x - radius;
                } else {
                    nz = (nz > (c.min.z + c.max.z) / 2) ? c.max.z + radius : c.min.z - radius;
                }
            }
        }
        return { x: nx, z: nz };
    }

    /* ================= Звук ================= */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        if (this.audioCtx) {
            if (this.soundEnabled && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        }
        this.music?.update(0);
        this.menuMusic?.update(0);
        document.getElementById('btn-menu-sound').textContent = this.soundEnabled ? 'Звук: вкл' : 'Звук: выкл';
        document.getElementById('btn-sound').textContent = this.soundEnabled ? 'ЗВУК / ВКЛ' : 'ЗВУК / ВЫКЛ';
        return this.soundEnabled;
    }

    playTone(freq = 440, duration = 0.15, type = 'sine', volume = 0.05) {
        if (!this.soundEnabled || !this.audioCtx) return;
        const ctx = this.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = volume;
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    /* ================= Шёпот ================= */
    _startWhispers() {
        // A fixed message for each act, not random contradictory narration.
        this._stopWhispers();
        const level = levels[this.levelIndex];
        if (!level) return;
        const message = level.triggers?.[0]?.whisper;
        if (!message || !whispers[message]) return;
        this._whisperStarted = true;
        this._whisperTimeout = setTimeout(() => {
            if (this.state === 'play') this.ui?.showSubtitle(whispers[message], 4300);
        }, 900);
    }

    _stopWhispers() {
        clearTimeout(this._whisperTimeout);
        this._whisperTimeout = null;
        this._whisperStarted = false;
    }

    /* ================= Цикл ================= */
    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.intro) this.intro._onResize();
    }

    _animate() {
        requestAnimationFrame(() => this._animate());
        const dt = Math.min(this.clock.getDelta(), 0.05);
        this.music?.update(dt);
        this.menuMusic?.update(dt);
        if (this.state === 'paused') return;

        if (this.ui?.endingCinematic.active) {
            this.ui.endingCinematic.update();
            return;
        }

        if (this.state === 'play') {
            if (this.player) this.player.update(dt);
            if (this.interactions) this.interactions.updateHover();
        }

        if(this.state==='prologue' && this.prologue?.active){
            this.prologue.update(dt);
            if(this.state==='prologue')return;
        }

        if (this.state === 'intro' && this.intro?.active) {
            this.intro.update(dt);
            if (this.intro.active) {
                this.renderer.render(this.intro.scene, this.intro.camera);
                return;
            }
        }
        this.renderer.render(this.scene, this.camera);
    }
}
