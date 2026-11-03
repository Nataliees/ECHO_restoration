// Credits are rendered from the project's attribution file, never as HTML.
export function renderCredits(markdown) {
    const fragment = document.createDocumentFragment();
    const inline = (parent, text) => {
        const pattern = /\x60([^\x60]+)\x60|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s<>]+)/g;
        let position = 0;
        for (const match of text.matchAll(pattern)) {
            parent.appendChild(document.createTextNode(text.slice(position, match.index)));
            const code = match[1];
            const destination = match[3] || match[4]
                || (code && /^assets\//.test(code) && /(?:LICENSE|OFL)[^/]*\.(?:txt|md)$/i.test(code) ? '../' + code : null);
            let node;
            if (destination) {
                const url = new URL(destination, import.meta.url);
                if (['http:', 'https:'].includes(url.protocol)) {
                    node = document.createElement('a');
                    node.href = url.href;
                    node.target = '_blank';
                    node.rel = 'noopener noreferrer';
                }
            }
            if (!node) node = document.createElement(code ? 'code' : 'span');
            node.textContent = code || match[2] || match[4];
            parent.appendChild(node);
            position = match.index + match[0].length;
        }
        parent.appendChild(document.createTextNode(text.slice(position)));
    };
    for (const block of markdown.trim().split(/\n\s*\n/)) {
        const heading = /^(#{1,3})\s+([\s\S]+)/.exec(block);
        const element = document.createElement(heading ? (heading[1].length === 1 ? 'h1' : 'h3') : 'p');
        inline(element, heading ? heading[2].trim() : block.replace(/\n/g, ' '));
        fragment.appendChild(element);
    }
    return fragment;
}

export class CreditsRoll {
    constructor() {
        this.viewport = document.getElementById('credits-viewport');
        this.roll = document.getElementById('credits-roll');
        this.status = document.getElementById('credits-status');
        this.hint = document.getElementById('credits-hint');
        this.active = false;
        this.version = 0;
        this.speed = 60;
        this.roll.addEventListener('focusin', event => {
            if (!this.active || !event.target.closest('a')) return;
            this.paused = true;
            const position = event.target.getBoundingClientRect().top - this.roll.getBoundingClientRect().top;
            this.offset = this.viewport.clientHeight * 0.4 - position;
            this.viewport.scrollTop = 0;
            this.paint();
        });
    }

    async start() {
        this.stop();
        const version = this.version;
        this.active = true;
        this.ready = false;
        this.paused = false;
        this.ended = false;
        this.roll.replaceChildren();
        this.status.textContent = 'Загрузка титров…';
        this.status.hidden = false;
        try {
            if (!this.source) {
                this.source = fetch(new URL('../CREDITS.md', import.meta.url)).then(response => {
                    if (!response.ok) throw new Error('Credits unavailable: HTTP ' + response.status);
                    return response.text();
                }).catch(error => { this.source = null; throw error; });
            }
            const markdown = await this.source;
            if (!this.active || version !== this.version) return;
            this.roll.replaceChildren(renderCredits(markdown));
            this.ready = true;
            this.status.hidden = true;
            this.offset = this.viewport.clientHeight;
            this.lastTime = null;
            this.paint();
            this.frame = requestAnimationFrame(time => this.tick(time));
        } catch (error) {
            if (!this.active || version !== this.version) return;
            console.warn('ECHO credits unavailable', error);
            this.status.hidden = false;
            this.status.textContent = 'Не удалось загрузить титры. Вернитесь назад и попробуйте ещё раз.';
        }
    }

    tick(time) {
        if (!this.active) return;
        if (this.lastTime !== null && !this.paused && !document.hidden) {
            this.offset -= Math.min((time - this.lastTime) / 1000, 0.1) * this.speed;
            const end = -this.roll.offsetHeight;
            if (this.offset <= end) {
                this.offset = end;
                this.ended = true;
                this.paused = true;
                this.status.textContent = 'Спасибо за игру.';
                this.status.hidden = false;
            }
            this.paint();
        }
        this.lastTime = document.hidden ? null : time;
        this.frame = requestAnimationFrame(next => this.tick(next));
    }

    handleKey(event) {
        if (!this.ready) return;
        if (event.code === 'Space') {
            if (event.repeat) return;
            if (this.ended) {
                this.offset = this.viewport.clientHeight;
                this.ended = false;
                this.status.hidden = true;
                this.paused = false;
            } else this.paused = !this.paused;
        } else {
            const backwards = ['ArrowUp', 'PageUp'].includes(event.code);
            const step = event.code.startsWith('Page') ? this.viewport.clientHeight * 0.65 : 80;
            this.offset += (backwards ? 1 : -1) * step;
            this.offset = Math.max(-this.roll.offsetHeight, Math.min(this.viewport.clientHeight, this.offset));
            this.paused = true;
            this.ended = false;
            this.status.hidden = true;
        }
        this.lastTime = null;
        this.paint();
    }

    paint() {
        this.roll.style.transform = 'translateY(' + this.offset + 'px)';
        this.hint.textContent = this.ended ? 'Пробел — повторить · E — назад'
            : this.paused ? 'Пробел — продолжить · E — назад' : 'Пробел — пауза · E — назад';
    }

    stop() {
        this.active = false;
        this.ready = false;
        this.version++;
        cancelAnimationFrame(this.frame);
        this.frame = null;
        this.lastTime = null;
    }
}
