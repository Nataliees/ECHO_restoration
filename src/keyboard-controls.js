// One capture-phase handler prevents an E press from both opening and closing
// a panel. Mouse movement remains independent of all interaction controls.
export class KeyboardControls {
    constructor(game) {
        this.game = game;
        window.addEventListener('keydown', event => this.handle(event), true);
        document.addEventListener('pointerlockchange', () => {
            const locked = document.pointerLockElement === game.renderer.domElement;
            if (this.wasLocked && !locked && game.state === 'play') game.pause();
            this.wasLocked = locked;
        });
    }

    panel() {
        const game = this.game;
        if (game.state === 'paused') return document.getElementById('pause-screen');
        if (game.state === 'choice') return document.getElementById('moral-overlay');
        if (game.state === 'ending') return document.getElementById('ending-overlay');
        return document.querySelector('.screen.active');
    }

    buttons() {
        const panel = this.panel();
        const selector = panel?.id === 'credits-screen' ? 'button' : 'button, a[href]';
        return [...(panel?.querySelectorAll(selector) || [])]
            .filter(button => !button.disabled && !button.hidden && button.getClientRects().length && getComputedStyle(button).display !== 'none');
    }

    handle(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target.closest?.('input, textarea, [contenteditable="true"]')) return;
        const game = this.game;
        const consume = () => { event.preventDefault(); event.stopImmediatePropagation(); };
        if (event.code === 'Escape') {
            consume();
            if (this.panel()?.id === 'credits-screen') { document.getElementById('btn-credits-back').click(); return; }
            // Escape only pauses. Resuming uses the explicit Continue action;
            // this also avoids a native pointer-unlock event toggling twice.
            if (!event.repeat && game.state !== 'paused') game.pause();
            return;
        }
        if (event.code === 'KeyE') {
            consume();
            if (event.repeat) return;
            if (game.state === 'play') { game._requestPointerLock(); game.interactions.interact(); return; }
            if (game.state === 'dialog') { game.ui.hideNote(); return; }
            if (game.state === 'memory') { game.finishRecoveredRecording(); return; }
            if (game.state === 'journal') { game.ui.toggleJournal(false); return; }
            if (game.state === 'prologue') { game.prologue.skip(); return; }
            if (game.state === 'intro') { game.intro.finish(); return; }
            if (game.state === 'ending-cinematic') {
                const cinematic = game.ui.endingCinematic;
                if (!cinematic.playButton.hidden) cinematic.play();
                else cinematic.finish();
                return;
            }
            const buttons = this.buttons();
            const selected = buttons.includes(document.activeElement) ? document.activeElement : buttons[0];
            selected?.focus({ preventScroll: true });
            selected?.click();
            return;
        }
        if (this.panel()?.id === 'credits-screen' && ['Space','ArrowUp','ArrowDown','PageUp','PageDown'].includes(event.code)) {
            consume(); game.credits.handleKey(event); return;
        }
        const readingPanel = game.state === 'dialog' ? document.getElementById('note-overlay')
            : game.state === 'journal' ? document.getElementById('journal-overlay')
            : this.panel()?.id === 'endings-screen' ? this.panel() : null;
        if (readingPanel && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(event.code)) {
            consume();
            const direction = ['ArrowUp', 'PageUp'].includes(event.code) ? -1 : 1;
            readingPanel.scrollBy(0, direction * (event.code.startsWith('Page') ? innerHeight * 0.75 : 80));
            return;
        }
        if (game.state === 'play' || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS'].includes(event.code)) return;
        const buttons = this.buttons();
        if (!buttons.length) return;
        consume();
        const backwards = ['ArrowUp', 'ArrowLeft', 'KeyW'].includes(event.code);
        const current = buttons.indexOf(document.activeElement);
        const next = current < 0 ? (backwards ? buttons.length - 1 : 0)
            : (current + (backwards ? -1 : 1) + buttons.length) % buttons.length;
        buttons[next].focus({ preventScroll: true });
        buttons[next].scrollIntoView({ block: 'nearest' });
    }
}
