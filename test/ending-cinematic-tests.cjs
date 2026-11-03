const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
        headless: true,
        args: ['--no-sandbox', '--enable-unsafe-swiftshader']
    });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.ECHO_TEST_URL || 'http://127.0.0.1:8765');
        await page.waitForFunction(() => window.__game?.state === 'menu');

        async function chooseEnding(endingId = 'accept', branch = endingId === 'rewrite' ? 'justify' : 'accept') {
            await page.evaluate(branch => {
                const game = window.__game;
                game.hasActiveRun = true;
                game.introSeen = true;
                game.memory.load({
                    moralChoice: branch,
                    fragments: ['child_drawing', 'evacuation_records', 'toy_memory'],
                    notesRead: ['evacuation_order', 'registry_damaged', 'reactor_override']
                });
                game._showScreen(null);
                game.loadLevel(2);
                game.interactions._openMirror();
            }, branch);
            await page.click(`.ending-option[data-ending="${endingId}"]`);
        }

        async function checkEndingMusic() {
            await page.waitForFunction(() => {
                const c = window.__game.ui.endingCinematic;
                return !c.video.paused && !c.music.paused && !c.music.seeking &&
                    Math.abs(c.music.currentTime - 16 - c.video.currentTime) < 0.3;
            });
            const music = await page.evaluate(() => {
                const c = window.__game.ui.endingCinematic;
                return { src: c.musicAssetUrl, seekableBlob: c.music.currentSrc.startsWith('blob:'), gain: c.musicGain.gain.value,
                    menuPaused: window.__game.menuMusic.audio.paused };
            });
            assert.ok(music.src.endsWith('/assets/menu_music.mp3'));
            assert.equal(music.seekableBlob, true, 'MP3 seeks work without HTTP Range support');
            assert.ok(Math.abs(music.gain - 0.14) < 0.00001);
            assert.equal(music.menuPaused, true);
        }

        await chooseEnding();
        await page.waitForFunction(() => {
            const video = document.getElementById('ending-video');
            return !video.paused && video.currentTime > 0.2;
        });
        assert.equal(await page.evaluate(() => window.__game.state), 'ending-cinematic');
        assert.equal(await page.locator('#ending-cinematic-caption').isVisible(), false);
        assert.equal(await page.evaluate(() => window.__game.music.audio.paused), true);
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('echo_save_three_acts_v3')));
        assert.equal(saved.completedEnding, 'accept');
        assert.ok(saved.endings.includes('accept'), 'ending saved before the cinematic ends');
        assert.ok(Math.abs(await page.locator('#ending-video').evaluate(video => video.duration) - 10) < 0.05);
        await checkEndingMusic();
        await page.locator('#ending-video').evaluate(video => { video.currentTime = 1.25; });
        await checkEndingMusic();
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__game.state === 'paused' && window.__game.ui.endingCinematic.music.paused);
        const songPausedAt = await page.evaluate(() => window.__game.ui.endingCinematic.music.currentTime);
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => window.__game.ui.endingCinematic.music.currentTime), songPausedAt);
        await page.keyboard.press('KeyE');
        await checkEndingMusic();

        await page.evaluate(() => window.__game.toggleSound());
        await page.waitForFunction(() => document.getElementById('ending-video').muted);
        assert.equal(await page.evaluate(() => window.__game.ui.endingCinematic.music.muted), true);
        assert.equal(await page.evaluate(() => window.__game.ui.endingCinematic.music.paused), true);
        await page.evaluate(() => window.__game.toggleSound());
        await page.waitForFunction(() => !document.getElementById('ending-video').muted);
        await checkEndingMusic();

        const pausedAt = await page.evaluate(() => {
            Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            document.dispatchEvent(new Event('visibilitychange'));
            return document.getElementById('ending-video').currentTime;
        });
        await page.waitForTimeout(250);
        assert.equal(await page.locator('#ending-video').evaluate(video => video.paused), true);
        assert.equal(await page.evaluate(() => window.__game.ui.endingCinematic.music.paused), true);
        assert.ok(Math.abs(await page.locator('#ending-video').evaluate(video => video.currentTime) - pausedAt) < 0.05);
        await page.evaluate(() => {
            delete document.hidden;
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await page.waitForFunction(() => !document.getElementById('ending-video').paused);
        await checkEndingMusic();
        await page.waitForFunction(() => document.getElementById('ending-video').currentTime >= 6.2);
        assert.ok(await page.locator('#ending-video').evaluate(video => video.webkitAudioDecodedByteCount > 0));
        await page.waitForSelector('#ending-cinematic-caption', { state: 'visible' });
        assert.equal(await page.locator('#ending-cinematic-caption').innerText(), 'Я знал о риске.');
        await page.waitForFunction(() => document.getElementById('ending-video').currentTime >= 7.5);
        assert.equal(await page.locator('#ending-cinematic-caption').isVisible(), false);
        await page.waitForFunction(() => window.__game.state === 'ending');
        await page.waitForSelector('#ending-overlay.active');
        assert.equal(await page.locator('#ending-visual img').getAttribute('alt'), 'Принять правду');
        assert.equal(await page.locator('#ending-video').evaluate(video => video.paused), true);
        assert.equal(await page.evaluate(() => window.__game.ui.endingCinematic.music.paused), true);
        await page.click('#ending-back');

        // Rejected autoplay exposes a real user gesture to resume playback.
        await page.evaluate(() => {
            const video = document.getElementById('ending-video');
            const play = video.play.bind(video);
            let blocked = true;
            video.play = () => {
                if (blocked) { blocked = false; return Promise.reject(new Error('Autoplay blocked')); }
                return play();
            };
        });
        await chooseEnding();
        await page.waitForSelector('#ending-play', { state: 'visible' });
        assert.equal(await page.evaluate(() => window.__game.ui.endingCinematic.music.paused), true);
        await page.click('#ending-play');
        await page.waitForFunction(() => !document.getElementById('ending-video').paused);
        await checkEndingMusic();
        await page.click('#ending-skip');
        await page.waitForSelector('#ending-overlay.active');
        assert.equal(await page.locator('#ending-video').evaluate(video => video.hasAttribute('src')), false);
        assert.equal(await page.evaluate(() => window.__game.ui.endingCinematic.music.paused), true);
        await page.click('#ending-back');

        // A missing video must still let the player read the earned ending.
        await page.route('**/assets/ending_accept.mp4', route => route.fulfill({ status: 404, body: 'missing' }));
        await chooseEnding();
        await page.waitForSelector('#ending-overlay.active');
        assert.equal(await page.locator('#ending-visual img').getAttribute('alt'), 'Принять правду');
        await page.click('#ending-back');
        await page.waitForSelector('#menu-screen.active');

        // The justification branch must select the supplied second video,
        // including its existing soundtrack, and show its own ending summary.
        await chooseEnding('rewrite');
        await page.waitForFunction(() => {
            const video = document.getElementById('ending-video');
            return video.currentTime > 0.3 && !video.paused;
        });
        const rewrite = await page.locator('#ending-video').evaluate(video => ({
            src: video.currentSrc, duration: video.duration, audio: video.webkitAudioDecodedByteCount,
            label: video.getAttribute('aria-label')
        }));
        assert.ok(rewrite.src.endsWith('/assets/ending_rewrite.mp4'));
        await checkEndingMusic();
        assert.ok(Math.abs(rewrite.duration - 5.208333) < 0.1);
        assert.ok(rewrite.audio > 0);
        assert.equal(rewrite.label, 'Стереть');
        assert.equal(await page.locator('#ending-cinematic-caption').isVisible(), false);
        assert.equal(await page.evaluate(() => window.__game.music.audio.paused), true);
        const savedRewrite = await page.evaluate(() => JSON.parse(localStorage.getItem('echo_save_three_acts_v3')));
        assert.equal(savedRewrite.completedEnding, 'rewrite');
        assert.ok(savedRewrite.endings.includes('rewrite'));
        await page.waitForFunction(() => window.__game.state === 'ending');
        await page.waitForSelector('#ending-overlay.active');
        assert.equal(await page.locator('#ending-visual img').getAttribute('alt'), 'Стереть');
        await page.click('#ending-back');

        await chooseEnding('rewrite');
        await page.waitForFunction(() => window.__game.state === 'ending-cinematic');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__game.state === 'paused');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'ending-cinematic');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'ending');
        await page.waitForSelector('#ending-overlay.active');
        assert.equal(await page.locator('#ending-visual img').getAttribute('alt'), 'Стереть');
        assert.equal(await page.locator('#ending-video').evaluate(video => video.hasAttribute('src')), false);
        await page.click('#ending-back');
        await page.waitForSelector('#menu-screen.active');
        // New Identity is available from either moral branch and has its own
        // supplied video, soundtrack, saved ending and final title card.
        await chooseEnding('restart');
        await page.waitForFunction(() => {
            const video = document.getElementById('ending-video');
            return video.currentTime > 0.3 && !video.paused;
        });
        const restart = await page.locator('#ending-video').evaluate(video => ({
            src: video.currentSrc, duration: video.duration, audio: video.webkitAudioDecodedByteCount,
            label: video.getAttribute('aria-label')
        }));
        assert.ok(restart.src.endsWith('/assets/ending_restart.mp4'));
        await checkEndingMusic();
        assert.ok(Math.abs(restart.duration - 6.083333) < 0.1);
        assert.ok(restart.audio > 0);
        assert.equal(restart.label, 'Создать новую личность');
        assert.equal(await page.locator('#ending-cinematic-caption').isVisible(), false);
        assert.equal(await page.evaluate(() => window.__game.music.audio.paused), true);
        const savedRestart = await page.evaluate(() => JSON.parse(localStorage.getItem('echo_save_three_acts_v3')));
        assert.equal(savedRestart.completedEnding, 'restart');
        assert.ok(savedRestart.endings.includes('restart'));
        await page.waitForFunction(() => window.__game.state === 'ending');
        await page.waitForSelector('#ending-overlay.final-card.active');
        assert.equal(await page.locator('#ending-visual img').getAttribute('src'), './assets/endings/start-again.png');
        await page.click('#ending-back');

        await chooseEnding('restart', 'justify');
        await page.waitForFunction(() => window.__game.state === 'ending-cinematic');
        await page.click('#ending-skip');
        await page.waitForSelector('#ending-overlay.final-card.active');
        assert.equal(await page.locator('#ending-visual img').getAttribute('src'), './assets/endings/start-again.png');
        assert.equal(await page.locator('#ending-video').evaluate(video => video.hasAttribute('src')), false);
        await page.click('#ending-back');
        await page.waitForSelector('#menu-screen.active');
        assert.deepEqual(errors, []);
        console.log('PASS: all three ending videos, menu song from 0:16 at gain 0.14, video-clock sync, pause/resume, both moral branches, mute, hidden-tab pause, natural finish, skip, autoplay recovery, missing-video fallback and saved endings');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
