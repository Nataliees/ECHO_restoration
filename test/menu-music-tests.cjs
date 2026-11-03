const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
        headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader']
    });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.ECHO_TEST_URL || 'http://127.0.0.1:8765');
        await page.waitForFunction(() => window.__game?.state === 'menu');
        // A real keyboard gesture must unlock audio before menu navigation
        // consumes that event in its capture handler.
        await page.keyboard.press('ArrowDown');
        await page.waitForFunction(() => window.__game.menuMusic.audio.currentTime > 0.1 && window.__game.audioCtx.state === 'running');
        const track = await page.evaluate(() => ({
            src: window.__game.menuMusic.audio.src,
            loop: window.__game.menuMusic.audio.loop,
            level: window.__game.menuMusic.gain.gain.value,
            gameMusicPaused: window.__game.music.audio.paused
        }));
        assert.ok(track.src.endsWith('/assets/menu_music.mp3'));
        assert.equal(track.loop, true);
        assert.ok(track.level > 0);
        assert.equal(track.gameMusicPaused, true);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('KeyE');
        await page.waitForSelector('#about-screen.active');
        const beforeCredits = await page.evaluate(() => window.__game.menuMusic.audio.currentTime);
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.credits.ready);
        assert.equal(await page.evaluate(() => window.__game.credits.speed), 60);
        await page.waitForFunction(time => window.__game.menuMusic.audio.currentTime > time, beforeCredits);
        assert.equal(await page.evaluate(() => window.__game.menuMusic.audio.paused), false);
        await page.keyboard.press('KeyE');
        await page.waitForSelector('#about-screen.active');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('KeyE');
        await page.waitForSelector('#menu-screen.active');
        await page.keyboard.press('ArrowUp'); // Sound is the last menu action.
        await page.keyboard.press('KeyE');
        assert.equal(await page.evaluate(() => window.__game.soundEnabled), false);
        assert.equal(await page.evaluate(() => window.__game.menuMusic.audio.paused), true);
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => !window.__game.menuMusic.audio.paused && window.__game.soundEnabled);
        await page.keyboard.press('ArrowDown'); // Wrap to New Game.
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'prologue');
        assert.equal(await page.evaluate(() => window.__game.menuMusic.audio.paused), true);
        assert.equal(await page.evaluate(() => window.__game.music.audio.paused), true);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__game.state === 'paused');
        assert.equal(await page.evaluate(() => window.__game.menuMusic.audio.paused), true);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'menu' && !window.__game.menuMusic.audio.paused && window.__game.audioCtx.state === 'running');
        await page.evaluate(() => {
            Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        assert.equal(await page.evaluate(() => window.__game.menuMusic.audio.paused), true);
        await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
        await page.waitForFunction(() => !window.__game.menuMusic.audio.paused);
        assert.deepEqual(errors, []);
        console.log('PASS: menu song, keyboard audio unlock, loop, credits at double speed, sound toggle, silent gameplay/pause, return-to-menu recovery and hidden-tab pause');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
