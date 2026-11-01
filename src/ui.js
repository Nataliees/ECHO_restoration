import { fragments, notes, storyRequirements, endings } from './story.js';

export class UI {
    constructor(game) {
        this.game = game;
        const get = id => document.getElementById(id);
        this.subtitleEl = get('subtitle-box');
        this.promptEl = get('interact-prompt');
        this.journalEl = get('memory-journal');
        this.counterEl = get('endings-counter');
        this.menuEndingsEl = get('menu-endings');
        this.actLabel = get('act-label');
        this.actHeading = get('act-heading');
        this.actObjective = get('act-objective');
        this.actProgress = get('act-progress');
        this.noteOverlay = get('note-overlay');
        this.noteText = get('note-text');
        this.noteTitle = get('note-title');
        this.noteAuthor = get('note-author');
        this.noteClose = get('note-close');
        this.recordingOverlay = get('recording-overlay');
        this.recordingStatus = get('recording-status');
        this.recordingTranscript = get('recording-transcript');
        this.recordingClose = get('recording-close');
        this.endingOverlay = get('ending-overlay');
        this.endingChoiceEl = get('ending-choice');
        this.endingVisual = get('ending-visual');
        this.endingTitle = get('ending-title');
        this.endingStatus = get('ending-status');
        this.endingText = get('ending-text');
        this.endingBack = get('ending-back');
        this.journalOverlay = get('journal-overlay');
        this.journalList = get('journal-list');
        this.journalSummary = get('journal-summary');
        this.journalNotes = get('journal-notes');
        this.journalClose = get('journal-close');
        this.journalBtn = get('btn-journal');
        this.soundBtn = get('btn-sound');
        this._subtitleTimer = null;
        this._notification = null;
        this._noteHandler = null;
        this._journalHandler = null;
        this._endingHandler = null;
        this._journalOpen = false;
        this._endingBack = null;
        this._bind();
    }

    _bind() {
        this.noteClose?.addEventListener('click', () => this.hideNote());
        this.journalClose?.addEventListener('click', () => this.toggleJournal(false));
        this.journalBtn?.addEventListener('click', () => {
            if (this.game.state === 'play') this.toggleJournal();
        });
        this.soundBtn?.addEventListener('click', () => {
            const on = this.game.toggleSound();
            this.soundBtn.textContent = on ? 'ЗВУК / ВКЛ' : 'ЗВУК / ВЫКЛ';
        });
        this.recordingClose?.addEventListener('click', () => this.game.finishRecoveredRecording());
        this.endingBack?.addEventListener('click', () => this._endingBack?.());
    }

    showSubtitle(text, duration = 4000) {
        if (!this.subtitleEl) return;
        this.subtitleEl.textContent = text;
        this.subtitleEl.classList.add('visible');
        clearTimeout(this._subtitleTimer);
        this._subtitleTimer = setTimeout(() => this.subtitleEl?.classList.remove('visible'), duration);
    }

    showPrompt(text) {
        if (!this.promptEl) return;
        this.promptEl.textContent = text;
        this.promptEl.classList.add('visible');
    }
    hidePrompt() { this.promptEl?.classList.remove('visible'); }

    queueNotification(text) {
        if (this.noteOverlay?.classList.contains('active')) this._notification = text;
        else this.showSubtitle(text, 5000);
    }

    updateAct(level, memory) {
        if (!level) return;
        this.actLabel && (this.actLabel.textContent = `АКТ ${level.act} / 03`);
        this.actHeading && (this.actHeading.textContent = level.name.toUpperCase());
        const objective = this._objectiveFor(level, memory);
        this.actObjective && (this.actObjective.textContent = objective);
        if (this.actProgress) {
            const count = Object.keys(fragments).filter(id => memory.hasFragment(id)).length;
            this.actProgress.textContent = `ВОССТАНОВЛЕНО ${count}/3 · ${memory.notesRead.size} ДОК.`;
        }
        this.updateMemoryJournal(memory);
    }

    _objectiveFor(level, memory) {
        if (level.id === 'airlock') {
            const drawing = memory.hasFragment('child_drawing');
            const radio = memory.hasEvent('radio_echo');
            if (drawing && radio) return 'Фрагмент восстановлен. Найдите шлюз перехода.';
            if (drawing) return 'Включите повреждённый приёмник и прослушайте запись.';
            if (radio) return 'Найдите детский рисунок.';
        }
        if (level.id === 'lab') {
            if (memory.hasFragment('evacuation_records')) return 'Протокол восстановлен. Найдите выход из лаборатории.';
            const read = storyRequirements.evidenceNotes.filter(id => memory.hasNote(id)).length;
            return `Изучите документы: ${read}/3. Не делайте выводов о судьбе семьи.`;
        }
        if (level.id === 'capsule') {
            if (memory.hasFragment('toy_memory')) return 'Подойдите к зеркалу. Окончательное решение за вами.';
            return 'Найдите восстановленную игрушку, затем подойдите к зеркалу.';
        }
        return level.objective;
    }

    updateMemoryJournal(memory) {
        const all = Object.values(fragments);
        const fragmentCount = all.filter(f => memory.hasFragment(f.id)).length;
        const render = (container, detailed) => {
            if (!container) return;
            container.replaceChildren();
            all.forEach(frag => {
                const found = memory.hasFragment(frag.id);
                const el = document.createElement(detailed ? 'li' : 'div');
                el.className = found ? (detailed ? 'found' : 'journal-item collected') : (detailed ? 'locked' : 'journal-item');
                el.textContent = detailed
                    ? `${frag.number} / ${found ? frag.title + ' — ' + frag.subtitle : 'ФРАГМЕНТ НЕ ВОССТАНОВЛЕН'}`
                    : `${frag.number} / ${found ? frag.title : 'НЕИЗВЕСТНО'}`;
                container.appendChild(el);
            });
        };
        render(this.journalEl, false);
        render(this.journalList, true);
        if (this.journalSummary) {
            const signal = memory.hasEvent('radio_echo') ? 'прослушана' : 'не найдена';
            this.journalSummary.textContent = `ФРАГМЕНТЫ ${fragmentCount}/3 · РАДИОЗАПИСЬ: ${signal.toUpperCase()}`;
        }
        if (this.journalNotes) {
            this.journalNotes.replaceChildren();
            const foundNotes = Object.entries(notes).filter(([id]) => memory.hasNote(id));
            if (!foundNotes.length) {
                const empty = document.createElement('li');
                empty.className = 'locked';
                empty.textContent = 'Документы не обнаружены.';
                this.journalNotes.appendChild(empty);
            } else {
                foundNotes.forEach(([,note]) => {
                    const li = document.createElement('li');
                    li.className = 'found';
                    li.textContent = note.title;
                    this.journalNotes.appendChild(li);
                });
            }
        }
    }

    toggleJournal(force) {
        if (!this.journalOverlay) return;
        const open = force === undefined ? !this._journalOpen : !!force;
        if (open === this._journalOpen) return;
        this._journalOpen = open;
        if (open) {
            this.updateMemoryJournal(this.game.memory);
            this.game.state = 'journal';
            this.journalOverlay.classList.add('active');
            if (document.pointerLockElement) document.exitPointerLock();
            this._journalHandler = e => {
                if (e.code === 'KeyJ' || e.code === 'Escape') this.toggleJournal(false);
            };
            window.addEventListener('keydown', this._journalHandler);
        } else {
            this.journalOverlay.classList.remove('active');
            if (this._journalHandler) window.removeEventListener('keydown', this._journalHandler);
            this._journalHandler = null;
            if (this.game.state === 'journal') this.game.state = 'play';
        }
    }

    updateEndingsCounter() {
        const count = this.game.unlockedEndings.size;
        if (this.counterEl) this.counterEl.textContent = `ФИНАЛЫ ${count}/3`;
        if (this.menuEndingsEl) this.menuEndingsEl.textContent = `ОТКРЫТЫЕ ФИНАЛЫ: ${count} / 3`;
    }

    resetForMenu() {
        this.hidePrompt();
        this.subtitleEl?.classList.remove('visible');
        this.noteOverlay?.classList.remove('active');
        this.recordingOverlay?.classList.remove('active');
        this.endingOverlay?.classList.remove('active');
        this.journalOverlay?.classList.remove('active');
        for (const [key, handler] of [['_noteHandler', this._noteHandler], ['_journalHandler',this._journalHandler], ['_endingHandler',this._endingHandler]]) {
            if (handler) window.removeEventListener('keydown', handler);
            this[key] = null;
        }
        this._notification = null;
        this._journalOpen = false;
        this._endingBack = null;
    }

    showNote(note) {
        if (!this.noteOverlay) return;
        const info = typeof note === 'string' ? {title: 'ЗАПИСЬ', author: 'АРХИВ', body: note} : note;
        this.noteTitle && (this.noteTitle.textContent = info.title || 'ЗАПИСЬ');
        this.noteAuthor && (this.noteAuthor.textContent = info.author || 'АРХИВ ECHO');
        this.noteText && (this.noteText.textContent = info.body || '');
        this.noteOverlay.classList.add('active');
        this.game.state = 'dialog';
        if (document.pointerLockElement) document.exitPointerLock();
        if (this._noteHandler) window.removeEventListener('keydown', this._noteHandler);
        this._noteHandler = e => {
            if (e.code === 'KeyE' || e.code === 'Escape') this.hideNote();
        };
        window.addEventListener('keydown', this._noteHandler);
    }

    hideNote() {
        this.noteOverlay?.classList.remove('active');
        if (this._noteHandler) window.removeEventListener('keydown', this._noteHandler);
        this._noteHandler = null;
        if (this.game.state === 'dialog') this.game.state = 'play';
        if (this._notification) {
            const text = this._notification;
            this._notification = null;
            this.showSubtitle(text, 5200);
        }
    }

    showTransmission() {
        this.recordingOverlay?.classList.add('active');
        this.updateTransmission('ПОИСК СИГНАЛА', '');
    }

    updateTransmission(status, caption) {
        this.recordingStatus && (this.recordingStatus.textContent = status);
        this.recordingTranscript && (this.recordingTranscript.textContent = caption);
    }

    hideTransmission() { this.recordingOverlay?.classList.remove('active'); }

    showEndingChoice(available, onChoose) {
        if (!this.endingOverlay || !this.endingChoiceEl) return;
        this.endingOverlay.classList.add('active');
        this.endingChoiceEl.replaceChildren();
        this.endingChoiceEl.classList.add('active');
        this.endingVisual?.classList.remove('visible');
        this.endingText && (this.endingText.textContent = '');
        this.endingTitle && (this.endingTitle.textContent = 'ПРОТОКОЛ ВОССТАНОВЛЕНИЯ');
        this.endingStatus && (this.endingStatus.textContent = 'Выбор нельзя будет отменить.');
        if (this.endingBack) this.endingBack.hidden = true;

        for (const id of ['accept', 'rewrite', 'restart']) {
            const entry = endings[id];
            const enabled = available.includes(id);
            const button = document.createElement('button');
            button.className = 'menu-btn ending-option';
            button.disabled = !enabled;
            const title = document.createElement('strong');
            title.textContent = entry.label;
            const detail = document.createElement('small');
            detail.textContent = id === 'accept'
                ? 'Сохранить все воспоминания и принять ответственность за своё решение.'
                : id === 'rewrite'
                    ? 'Стереть воспоминание о собственном решении и отказаться от ответственности.'
                    : 'Создать новую личность и добровольно оставить прежнюю семью и жизнь позади.';
            button.dataset.ending = id;
            button.setAttribute('aria-label', `${entry.label}. ${detail.textContent}`);
            button.append(title, detail);
            if (!enabled) {
                const lock = document.createElement('span');
                lock.className = 'ending-locked';
                lock.textContent = 'ТРЕБУЕТСЯ 3/3 ВОСПОМИНАНИЯ';
                button.appendChild(lock);
            }
            button.addEventListener('click', () => {
                if (!enabled) return;
                this._closeEndingChoice();
                onChoose(id);
            });
            this.endingChoiceEl.appendChild(button);
        }
        if (this._endingHandler) window.removeEventListener('keydown', this._endingHandler);
        this._endingHandler = e => {
            if (e.code === 'Escape') {
                this._closeEndingChoice();
                this.endingOverlay.classList.remove('active');
                this.game.state = 'play';
            }
        };
        window.addEventListener('keydown', this._endingHandler);
    }

    _closeEndingChoice() {
        this.endingChoiceEl?.classList.remove('active');
        this.endingChoiceEl?.replaceChildren();
        if (this._endingHandler) window.removeEventListener('keydown', this._endingHandler);
        this._endingHandler = null;
    }

    showEnding(ending, opts = {}) {
        this._endingBack = opts.onBackToMenu || null;
        if (this.endingText) this.endingText.textContent = ending.text;
        if (this.endingTitle) this.endingTitle.textContent = ending.title;
        if (this.endingStatus) this.endingStatus.textContent = ending.status;
        if (this.endingVisual) {
            this.endingVisual.className = `ending-visual visible ending-${ending.id}`;
            this.endingVisual.textContent = ending.id === 'restart' ? 'NEW IDENTITY' : 'ECHO';
        }
        if (this.endingBack) this.endingBack.hidden = false;
        this.endingOverlay?.classList.add('active');
        this.updateEndingsCounter();
    }
}
