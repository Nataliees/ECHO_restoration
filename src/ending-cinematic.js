import { BACKGROUND_MUSIC_VOLUME } from './music.js';

// Original video audio is preserved; the menu song follows the video clock
// starting at 0:16 of the song in every ending.
const MUSIC_OFFSET = 16;
const ENDING_VIDEOS = {
    accept: '../assets/ending_accept.mp4',
    rewrite: '../assets/ending_rewrite.mp4',
    restart: '../assets/ending_restart.mp4'
};
export class EndingCinematic {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.session = 0;
        this.overlay = document.getElementById('ending-cinematic');
        this.video = document.getElementById('ending-video');
        this.playButton = document.getElementById('ending-play');
        this.caption = document.getElementById('ending-cinematic-caption');
        this.musicAssetUrl = new URL('../assets/menu_music.mp3', import.meta.url).href;
        this.music = new Audio();
        this.music.preload = 'auto';
        this.music.volume = BACKGROUND_MUSIC_VOLUME;
        // A local blob supports exact MP3 seeks even on a basic HTTP server
        // without byte-range requests. Load once while the player is in menus.
        this.musicReady = fetch(this.musicAssetUrl).then(response => {
            if (!response.ok) throw new Error('Menu song unavailable');
            return response.blob();
        }).then(blob => {
            this.music.src = URL.createObjectURL(blob);
        }).catch(() => {
            this.musicBlocked = true;
            console.warn('Ending music unavailable; keeping the original video soundtrack.');
        });
        this.music.addEventListener('loadedmetadata', () => this._syncMusic(true));
        this.music.addEventListener('error', () => { this.musicBlocked = true; });
        this.video.addEventListener('playing', () => {
            this.buffering = false;
            this._syncMusic(true);
        });
        this.video.addEventListener('waiting', () => {
            this.buffering = true;
            this.music.pause();
        });
        this.video.addEventListener('pause', () => this.music.pause());
        this.video.addEventListener('seeking', () => this.music.pause());
        this.video.addEventListener('seeked', () => this._syncMusic(true));
        this.video.addEventListener('ended', () => this.finish());
        this.video.addEventListener('error', () => {
            if (!this.active) return;
            console.warn('Ending video unavailable; showing the ending card.');
            this.finish();
        });
        this.playButton.addEventListener('click', () => this.play());
        document.getElementById('ending-skip').addEventListener('click', () => this.finish());
        document.addEventListener('visibilitychange', () => {
            if (!this.active || this.game.state === 'paused') return;
            if (document.hidden) {
                this.resumeOnVisible = !this.video.paused;
                this.video.pause();
                this.music.pause();
            } else if (this.resumeOnVisible) {
                this.resumeOnVisible = false;
                this.play();
            }
        });
    }

    hasVideo(endingId) {
        return typeof ENDING_VIDEOS[endingId] === 'string';
    }

    start(ending, onComplete, cardReady = Promise.resolve()) {
        this.stop();
        this.active = true;
        this.onComplete = onComplete;
        this.cardReady = cardReady;
        this.endingId = ending.id;
        this.buffering = false;
        this.musicBlocked = false;
        // UI is constructed before the game's AudioContext, so route lazily.
        if (this.game.audioCtx && !this.musicGain) {
            try {
                this.musicSource = this.game.audioCtx.createMediaElementSource(this.music);
                this.musicGain = this.game.audioCtx.createGain();
                this.musicGain.gain.value = BACKGROUND_MUSIC_VOLUME;
                this.musicSource.connect(this.musicGain).connect(this.game.audioCtx.destination);
                this.music.volume = 1;
            } catch { /* Native volume remains a supported fallback. */ }
        }
        if (this.music.readyState >= 1) this.music.currentTime = MUSIC_OFFSET;
        this.overlay.hidden = false;
        document.body.classList.add('ending-cinematic-active');
        this.overlay.setAttribute('aria-label', `Кат-сцена: ${ending.title}`);
        this.video.setAttribute('aria-label', ending.title);
        this.video.dataset.ending = ending.id;
        this.video.src = new URL(ENDING_VIDEOS[ending.id], import.meta.url).href;
        this.update();
        this.play();
    }

    play() {
        if (!this.active) return;
        const session = this.session;
        this.musicBlocked = false;
        this.game.audioCtx?.resume().catch(() => {});
        this.playButton.hidden = true;
        this.video.play().then(() => {
            if (this.active && session === this.session) this._syncMusic(true);
        }).catch(() => {
            if (this.active && session === this.session) this.playButton.hidden = false;
        });
    }

    _musicAllowed() {
        return this.active && !this.finishing && this.game.soundEnabled &&
            this.game.state !== 'paused' && !document.hidden && !this.buffering &&
            !this.video.paused && !this.video.ended && !this.video.seeking && this.video.readyState >= 3;
    }

    _syncMusic(force = false) {
        this.music.muted = !this.game.soundEnabled;
        if (!this._musicAllowed()) {
            this.music.pause();
            return;
        }
        if (this.music.readyState < 1) return;
        const target = MUSIC_OFFSET + this.video.currentTime;
        if (force || Math.abs(this.music.currentTime - target) > 0.25) this.music.currentTime = target;
        this.music.playbackRate = this.video.playbackRate;
        if (this.music.paused && !this.musicPending && !this.musicBlocked) {
            const session = this.session;
            const pending = this.music.play().catch(error => {
                if (session === this.session && error.name !== 'AbortError' && this._musicAllowed()) this.musicBlocked = true;
            }).finally(() => {
                if (this.musicPending === pending) this.musicPending = null;
                if (!this._musicAllowed()) this.music.pause();
            });
            this.musicPending = pending;
        }
    }

    update() {
        this.video.muted = !this.game.soundEnabled;
        this._syncMusic();
        // Follow the media clock, including seeks, pauses, and skipped playback.
        const time = this.video.currentTime;
        this.caption.hidden = !(this.active && this.endingId === 'accept' && time >= 6 && time < 7.45);
    }

    finish() {
        if (!this.active) return;
        if (this.finishing) return this.finishing;
        const onComplete = this.onComplete;
        const session = this.session;
        this.video.pause();
        this.music.pause();
        // Keep the last video frame on screen until its card is decoded.
        this.finishing = Promise.resolve(this.cardReady).catch(() => {}).then(() => {
            if (!this.active || session !== this.session) return;
            onComplete?.();
            this.stop();
        });
        return this.finishing;
    }

    stop() {
        this.active = false;
        this.session++;
        this.onComplete = null;
        this.finishing = null;
        this.cardReady = null;
        this.endingId = null;
        this.caption.hidden = true;
        this.resumeOnVisible = false;
        this.video.pause();
        this.music.pause();
        if (this.music.readyState >= 1) this.music.currentTime = MUSIC_OFFSET;
        if (this.video.hasAttribute('src')) {
            this.video.removeAttribute('src');
            this.video.load();
        }
        this.overlay.hidden = true;
        this.playButton.hidden = true;
        document.body.classList.remove('ending-cinematic-active');
    }
}
