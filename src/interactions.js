import * as THREE from 'three';
import { notes, endings, fragments, storyRequirements } from './story.js';

export class Interactions {
    constructor(game) {
        this.game = game;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 3.8;
        this.screenCenter = new THREE.Vector2(0, 0);
        this.hoveredObject = null;
    }

    update() { this.updateHover(); }

    updateHover() {
        if (!this.game.ui) return;
        if (this.game.state !== 'play') {
            if (this.hoveredObject) this._setHighlight(this.hoveredObject, false);
            this.hoveredObject = null;
            this.game.ui.hidePrompt();
            return;
        }
        this.raycaster.setFromCamera(this.screenCenter, this.game.camera);
        const hits = this.raycaster.intersectObjects(this.game.interactables, true);
        let target = null;
        for (const hit of hits) {
            let obj = hit.object;
            while (obj && !this.game.interactables.includes(obj)) obj = obj.parent;
            if (obj) { target = obj; break; }
        }
        if (target === this.hoveredObject) return;
        if (this.hoveredObject) this._setHighlight(this.hoveredObject, false);
        this.hoveredObject = target;
        if (target) {
            this._setHighlight(target, true);
            this.game.ui.showPrompt(this._getPrompt(target));
        } else this.game.ui.hidePrompt();
    }

    _setHighlight(group, on) {
        group.traverse(child => {
            if (!child.material) return;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(mat => {
                if (!('emissiveIntensity' in mat)) return;
                if (mat.userData.echoBaseEmissive === undefined) mat.userData.echoBaseEmissive = mat.emissiveIntensity;
                mat.emissiveIntensity = mat.userData.echoBaseEmissive + (on ? 0.48 : 0);
            });
        });
    }

    _exitLocked(group) {
        return !(group.userData.requires || []).every(id => this.game.memory.hasFragment(id));
    }

    _getPrompt(group) {
        const d = group.userData;
        switch (d.type) {
            case 'note': return `[E] Читать · ${d.label}`;
            case 'drawing': return `[E] Восстановить · ${d.label}`;
            case 'toy': return `[E] Осмотреть · ${d.label}`;
            case 'radio': return '[E] Воспроизвести последнюю передачу';
            case 'mirror': return '[E] Выбрать судьбу памяти';
            case 'exit': return this._exitLocked(group) ? '[E] Дверь заблокирована · не все улики найдены' : '[E] Перейти к следующему акту';
            default: return '[E] Взаимодействовать';
        }
    }

    interact() {
        if (this.game.state !== 'play' || !this.hoveredObject) return;
        const d = this.hoveredObject.userData;
        switch (d.type) {
            case 'note': this._readNote(d.id); break;
            case 'drawing': this._collectFragment(d.fragment); break;
            case 'toy': this._collectFragment(d.fragment); break;
            case 'radio': this._playRecoveredRecording(); break;
            case 'mirror': this._openMirror(); break;
            case 'exit': this._useExit(this.hoveredObject); break;
        }
    }

    _readNote(id) {
        const note = notes[id];
        if (!note) return;
        this.game.memory.markNoteRead(id);
        this.game.ui.showNote(note);
        this.game.playBlip();
        if (this.game.memory.canRestoreEvacuationEvidence()) {
            const added = this.game.memory.addFragment('evacuation_records');
            if (added) this.game.ui.queueNotification('ФРАГМЕНТ 02 ВОССТАНОВЛЕН · ЭВАКУАЦИОННЫЙ ПРОТОКОЛ');
        }
        this.game.refreshActHUD();
        this.game.saveState();
    }

    _collectFragment(id) {
        if (!id || !fragments[id]) return;
        const added = this.game.memory.addFragment(id);
        if (!added) {
            this.game.ui.showSubtitle('Этот фрагмент уже восстановлен.', 2300);
            return;
        }
        const frag = fragments[id];
        this.game.ui.showNote({title: `ФРАГМЕНТ ${frag.number} · ${frag.title}`, author: frag.category, body: `${frag.subtitle}\n\n${frag.detail}`});
        this.game.playBlip();
        const current = this.hoveredObject;
        if (current) {
            this._setHighlight(current, false);
            const idx = this.game.interactables.indexOf(current);
            if (idx >= 0) this.game.interactables.splice(idx, 1);
            this.game.scene.remove(current);
            this.hoveredObject = null;
            this.game.ui.hidePrompt();
        }
        this.game.refreshActHUD();
        this.game.saveState();
    }

    _playRecoveredRecording() {
        const first = this.game.memory.markEvent('radio_echo');
        this.game.saveState();
        this.game.refreshActHUD();
        this.game.playRecoveredRecording(first);
    }

    _useExit(group) {
        if (this._exitLocked(group)) {
            const missing = (group.userData.requires || []).filter(id => !this.game.memory.hasFragment(id));
            const explanations = {
                child_drawing: 'детский рисунок',
                radio_echo: 'запись на приёмнике',
                evacuation_records: 'три документа об эвакуации'
            };
            this.game.ui.showSubtitle('Доступ закрыт. Не найдено: ' + missing.map(id => explanations[id] || id).join(', '), 4600);
            return;
        }
        const next = group.userData.nextLevel;
        if (!Number.isInteger(next)) return;
        this.game.playBlip();
        this.game.loadLevel(next);
    }

    _openMirror() {
        if (!this.game.memory.hasFragment('toy_memory')) {
            this.game.ui.showSubtitle('Зеркало пока не отвечает. Сначала найдите восстановленную игрушку.', 4300);
            return;
        }
        const available = this.game.memory.getAvailableEndings();
        this.game.state = 'ending';
        if (document.pointerLockElement) document.exitPointerLock();
        this.game.ui.showEndingChoice(available, endingId => {
            if (!endingId) {
                this.game.state = 'play';
                return;
            }
            const ending = endings[endingId];
            if (!ending) {
                this.game.state = 'play';
                return;
            }
            this.game.unlockedEndings.add(endingId);
            this.game.saveState();
            this.game.playBlip();
            this.game.ui.showEnding(ending, {onBackToMenu: () => this.game.backToMenu()});
        });
    }
}
