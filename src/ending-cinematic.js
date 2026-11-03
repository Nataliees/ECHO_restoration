// Each ending video carries its own audio track, so picture and sound share
// one media clock when playback pauses or resumes.
const ENDING_VIDEOS = {
    accept: '../assets/ending_accept.mp4',
    rewrite: '../assets/ending_rewrite.mp4'
};
export class EndingCinematic {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.session = 0;
        this.overlay = document.getElementById('ending-cinematic');
        this.video = document.getElementById('ending-video');
        this.playButton = document.getElementById('ending-play');
        this.video.addEventListener('ended', () => this.finish());
        this.video.addEventListener('error', () => {
            if (!this.active) return;
            console.warn('Ending video unavailable; showing the ending summary.');
            this.finish();
        });
        this.playButton.addEventListener('click', () => this.play());
        document.getElementById('ending-skip').addEventListener('click', () => this.finish());
        window.addEventListener('keydown', event => {
            if (this.active && event.code === 'Escape' && !event.repeat) this.finish();
        });
        document.addEventListener('visibilitychange', () => {
            if (!this.active) return;
            if (document.hidden) {
                this.resumeOnVisible = !this.video.paused;
                this.video.pause();
            } else if (this.resumeOnVisible) {
                this.resumeOnVisible = false;
                this.play();
            }
        });
    }

    hasVideo(endingId) {
        return typeof ENDING_VIDEOS[endingId] === 'string';
    }

    start(ending, onComplete) {
        this.stop();
        this.active = true;
        this.onComplete = onComplete;
        this.overlay.hidden = false;
        document.body.classList.add('ending-cinematic-active');
        this.overlay.setAttribute('aria-label', `Кат-сцена: ${ending.title}`);
        this.video.setAttribute('aria-label', ending.title);
        this.video.src = new URL(ENDING_VIDEOS[ending.id], import.meta.url).href;
        this.update();
        this.play();
    }

    play() {
        if (!this.active) return;
        const session = this.session;
        this.playButton.hidden = true;
        this.video.play().catch(() => {
            if (this.active && session === this.session) this.playButton.hidden = false;
        });
    }

    update() {
        this.video.muted = !this.game.soundEnabled;
    }

    finish() {
        if (!this.active) return;
        const onComplete = this.onComplete;
        this.stop();
        onComplete?.();
    }

    stop() {
        this.active = false;
        this.session++;
        this.onComplete = null;
        this.resumeOnVisible = false;
        this.video.pause();
        if (this.video.hasAttribute('src')) {
            this.video.removeAttribute('src');
            this.video.load();
        }
        this.overlay.hidden = true;
        this.playButton.hidden = true;
        document.body.classList.remove('ending-cinematic-active');
    }
}
