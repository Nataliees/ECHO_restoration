const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
        headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader']
    });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.ECHO_TEST_URL || 'http://127.0.0.1:8765');
        await page.waitForFunction(() => window.__game?.state === 'menu');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'prologue');
        await page.waitForFunction(() => window.__game.prologue.offset > 1);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__game.state === 'paused');
        assert.deepEqual(await page.locator('#pause-screen button').allTextContents(), ['Продолжить', 'В главное меню']);
        const offset = await page.evaluate(() => window.__game.prologue.offset);
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => window.__game.prologue.offset), offset);
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'prologue');
        await page.keyboard.press('KeyE'); // Finish typing; begin radio.
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__game.audioCtx.state === 'suspended');
        const radioTime = await page.evaluate(() => window.__game.audioCtx.currentTime);
        await page.waitForTimeout(650);
        assert.ok(Math.abs(await page.evaluate(() => window.__game.audioCtx.currentTime) - radioTime) < 0.1);
        await page.keyboard.press('KeyE');
        await page.keyboard.press('KeyE'); // Skip the radio; enter intro.
        await page.waitForFunction(() => window.__game.state === 'intro');
        await page.waitForFunction(() => window.__game.intro.elapsed > 0.1);
        await page.keyboard.press('Escape');
        const introTime = await page.evaluate(() => window.__game.intro.elapsed);
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => window.__game.intro.elapsed), introTime);
        await page.keyboard.press('KeyE');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'play');

        const yaw = await page.evaluate(() => window.__game.player.yaw);
        await page.mouse.move(400, 300);
        await page.mouse.move(460, 340, { steps: 4 });
        await page.waitForFunction(yaw => window.__game.player.yaw !== yaw, yaw);
        await page.mouse.click(400, 300);
        assert.equal(await page.evaluate(() => window.__game.memory.hasFragment('child_drawing')), false);
        await page.evaluate(() => {
            const game = window.__game, object = game.interactables.find(item => item.userData.id === 'drawing_child');
            game.player.setPosition(-2.8, 1.7, -2.6);
            const dx = object.position.x + 2.8, dz = object.position.z + 2.6;
            game.player.yaw = Math.atan2(-dx, -dz);
            game.player.pitch = Math.atan2(object.position.y - 1.7, Math.hypot(dx, dz));
            game.player._applyCamera(); game.scene.updateMatrixWorld(true); game.camera.updateMatrixWorld(true);
            game.interactions.updateHover();
        });
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'dialog');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__game.state === 'paused');
        await page.keyboard.press('KeyE');
        assert.equal(await page.evaluate(() => window.__game.state), 'dialog');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'play');

        // Moral choice and ending choice need no mouse clicks.
        await page.evaluate(() => {
            const game = window.__game;
            game.loadLevel(1);
            for (const id of ['evacuation_order', 'registry_damaged', 'reactor_override']) game.memory.markNoteRead(id);
            game.openMoralChoice();
        });
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'play' && window.__game.levelIndex === 2);
        assert.equal(await page.evaluate(() => window.__game.memory.moralChoice), 'accept');
        await page.evaluate(() => {
            const game = window.__game;
            for (const id of ['child_drawing', 'evacuation_records', 'toy_memory']) game.memory.addFragment(id);
            game.interactions._openMirror();
        });
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'ending-cinematic');
        await page.waitForFunction(() => document.getElementById('ending-video').currentTime > 0.2);
        assert.ok(await page.locator('#ending-video').getAttribute('src').then(src => src.endsWith('/ending_restart.mp4')));
        await page.keyboard.press('Escape');
        const pausedAt = await page.locator('#ending-video').evaluate(video => video.currentTime);
        await page.waitForTimeout(250);
        assert.equal(await page.locator('#ending-video').evaluate(video => video.currentTime), pausedAt);
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => !document.getElementById('ending-video').paused);
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => document.getElementById('ending-cinematic').hidden);
        assert.equal(await page.locator('#ending-overlay').evaluate(element => getComputedStyle(element).opacity), '1');
        assert.equal(await page.locator('#ending-visual img').getAttribute('alt'), 'Создать новую личность');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'menu');

        // Hold decoding to prove that no uncovered 3D frame is shown between
        // the last video frame and the ready final card.
        await page.evaluate(async () => {
            const decode = HTMLImageElement.prototype.decode;
            HTMLImageElement.prototype.decode = function () {
                if (this.src.endsWith('/truth-accepted.png')) {
                    return new Promise(resolve => { window.releaseCard = () => decode.call(this).then(resolve); });
                }
                return decode.call(this);
            };
            const { endings } = await import('./src/story.js');
            const game = window.__game;
            game._showScreen(null); game.state = 'ending';
            game.ui.showEnding(endings.accept, { onBackToMenu: () => game.backToMenu() });
        });
        await page.waitForFunction(() => document.getElementById('ending-video').currentTime > 0.1);
        await page.evaluate(() => { void window.__game.ui.endingCinematic.finish(); });
        await page.waitForTimeout(100);
        assert.equal(await page.locator('#ending-cinematic').evaluate(element => element.hidden), false);
        await page.evaluate(() => window.releaseCard());
        await page.waitForFunction(() => document.getElementById('ending-cinematic').hidden);
        const card = await page.evaluate(() => ({
            opacity: getComputedStyle(document.getElementById('ending-overlay')).opacity,
            decoded: document.querySelector('#ending-visual img').naturalWidth > 0
        }));
        assert.deepEqual(card, { opacity: '1', decoded: true });
        await page.keyboard.press('KeyE');

        await page.evaluate(async () => {
            const { endings } = await import('./src/story.js');
            const game = window.__game;
            game._showScreen(null); game.state = 'ending';
            game.ui.showEnding(endings.rewrite, { onBackToMenu: () => game.backToMenu() });
        });
        const scale = await page.locator('#ending-video').evaluate(video => new DOMMatrix(getComputedStyle(video).transform).a);
        assert.ok(Math.abs(scale * 1352 / 1920 - 1) < 0.01, 'second video picture fills the same width as the first');
        await page.keyboard.press('Escape');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'menu');
        assert.equal(await page.locator('#ending-video').evaluate(video => video.paused), true);
        await page.evaluate(() => window.__game._showScreen('endings-screen'));
        await page.keyboard.press('PageDown');
        assert.ok(await page.locator('#endings-screen').evaluate(element => element.scrollTop > 0), 'the archive can be read without mouse scrolling');
        await page.keyboard.press('KeyE');
        await page.waitForSelector('#menu-screen.active');
        assert.deepEqual(errors, []);
        console.log('PASS: keyboard-only start, E interactions/choices/skip, mouse look without clicks, two-button Escape pause, paused media, enlarged second picture and decoded opaque final-card handoff');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
