/**
 * Recovered residential-sector transmission.
 * Uses the approved English daughter line and explosion audio, NEVER the hero line.
 * Audio remains local and costs no Runway credits.
 */
export class RecoveredTransmission {
    constructor(game) {
        this.game = game;
        this.daughter = new Audio('./assets/intro_daughter.mp3');
        this.explosion = new Audio('./assets/intro_explosion.mp3');
        this.daughter.preload = 'auto';
        this.explosion.preload = 'auto';
        this.daughter.volume = 0.70;
        this.explosion.volume = 0.82;
        this.active = false;
        this.timers = [];
        this.routed = false;
    }

    _later(fn, delay) {
        const timer = setTimeout(() => {
            this.timers = this.timers.filter(x => x !== timer);
            if (this.active) fn();
        }, delay);
        this.timers.push(timer);
    }

    _routeAudio() {
        const ctx = this.game.audioCtx;
        if (!ctx || this.routed) return;
        try {
            const source = ctx.createMediaElementSource(this.daughter);
            const highpass = ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 680;
            const lowpass = ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = 1750;
            const drive = ctx.createWaveShaper();
            const curve = new Float32Array(256);
            for (let i = 0; i < curve.length; i++) {
                const value = i * 2 / (curve.length - 1) - 1;
                curve[i] = Math.tanh(4.0 * value) / Math.tanh(4.0);
            }
            drive.curve = curve;
            drive.oversample = '2x';
            const crush = ctx.createWaveShaper();
            const steps = 18;
            const bitCurve = new Float32Array(256);
            for (let i = 0; i < bitCurve.length; i++) {
                const x = i * 2 / (bitCurve.length - 1) - 1;
                bitCurve[i] = Math.round(x * steps) / steps;
            }
            crush.curve = bitCurve;
            const gain = ctx.createGain();
            gain.gain.value = 0.7;
            source.connect(highpass).connect(lowpass).connect(drive).connect(crush).connect(gain).connect(ctx.destination);
            this.signalGain = gain;
            this.routed = true;
        } catch (err) {
            console.warn('Recovered transmission: radio processing unavailable', err);
        }
    }

    _noise(duration = 0.22, amplitude = 0.16) {
        const ctx = this.game.audioCtx;
        if (!ctx || !this.game.soundEnabled) return;
        const frames = Math.max(2, Math.floor(ctx.sampleRate * duration));
        const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
        const values = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) {
            const envelope = Math.min(1, i / (ctx.sampleRate * 0.025)) * (1 - i / frames);
            values[i] = (Math.random() * 2 - 1) * envelope;
        }
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1750;
        filter.Q.value = 0.75;
        const gain = ctx.createGain();
        gain.gain.value = amplitude;
        source.buffer = buffer;
        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start();
    }

    play(onPhase, onComplete) {
        this.stop();
        this.active = true;
        this._routeAudio();
        this.daughter.currentTime = 0;
        this.explosion.currentTime = 0;
        if (this.game.audioCtx?.state === 'suspended') {
            this.game.audioCtx.resume().catch(() => {});
        }
        onPhase('ПОИСК СИГНАЛА · КАНАЛ ЖИЛОГО СЕКТОРА', '');
        this._noise(0.28, 0.22);
        this._later(() => {
            onPhase('ФРАГМЕНТ ПЕРЕДАЧИ · ДАННЫЕ ПОВРЕЖДЕНЫ', '«Папа?»');
            if (this.game.soundEnabled) {
                if (this.signalGain) {
                    const now = this.game.audioCtx.currentTime;
                    this.signalGain.gain.cancelScheduledValues(now);
                    this.signalGain.gain.setValueAtTime(0.69, now);
                    this.signalGain.gain.setValueAtTime(0.31, now + 0.3);
                    this.signalGain.gain.setValueAtTime(0.68, now + 0.43);
                    this.signalGain.gain.setValueAtTime(0.41, now + 0.78);
                    this.signalGain.gain.setValueAtTime(0.68, now + 0.92);
                }
                this.daughter.play().catch(() => {});
                this._later(() => this._noise(0.07, 0.15), 480);
                this._later(() => this._noise(0.08, 0.13), 1080);
            }
        }, 320);
        this._later(() => {
            onPhase('ОБРЫВ СОЕДИНЕНИЯ · СИЛЬНЫЙ ШУМ', '[ВЗРЫВ · СИГНАЛ УТРАЧЕН]');
            if (this.game.soundEnabled) {
                this._noise(0.08, 0.15);
                this.explosion.play().catch(() => {});
            }
        }, 1810);
        this._later(() => {
            onPhase('ВОССТАНОВЛЕНИЕ ЗАПИСИ ЗАВЕРШЕНО', 'Другие данные недоступны.');
        }, 3950);
        this._later(() => {
            onComplete?.();
        }, 4900);
    }

    stop() {
        this.active = false;
        this.timers.forEach(clearTimeout);
        this.timers.length = 0;
        this.daughter.pause();
        this.explosion.pause();
        try {
            this.daughter.currentTime = 0;
            this.explosion.currentTime = 0;
        } catch (_) {}
    }
}
