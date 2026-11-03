const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
        headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader']
    });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        const errors = [];
        let popups = 0, creditRequests = 0;
        page.on('pageerror', error => errors.push(error.message));
        page.on('popup', () => popups++);
        page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/CREDITS.md')) creditRequests++; });
        const url = process.env.ECHO_TEST_URL || 'http://127.0.0.1:8765';
        await page.goto(url);
        const initialUrl = page.url();
        await page.waitForFunction(() => window.__game?.state === 'menu');
        // Select About and then Credits using the game's keyboard controls.
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('KeyE');
        await page.waitForSelector('#about-screen.active');
        await page.keyboard.press('KeyE');
        await page.waitForSelector('#credits-screen.active');
        await page.waitForFunction(() => document.querySelectorAll('#credits-roll h3').length > 5);
        assert.equal(popups, 0);
        assert.equal(page.url(), initialUrl);
        const text = await page.locator('#credits-roll').innerText();
        for (const name of ['Three.js', 'MIT license', 'Jura', 'SIL Open Font License', 'Remstage Music', 'Typewriter', 'New Identity']) assert.ok(text.includes(name), name);
        const offset = await page.evaluate(() => window.__game.credits.offset);
        await page.waitForFunction(offset => window.__game.credits.offset < offset - 5, offset);
        await page.keyboard.press('Space');
        const pausedAt = await page.evaluate(() => window.__game.credits.offset);
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => window.__game.credits.offset), pausedAt);
        await page.keyboard.press('Space');
        await page.waitForFunction(offset => window.__game.credits.offset < offset, pausedAt);
        await page.keyboard.press('PageDown');
        await page.keyboard.press('PageDown');
        assert.equal(await page.evaluate(() => window.__game.credits.paused), true);

        const three = page.locator('#credits-roll a[href$="/assets/vendor/THREE-LICENSE.txt"]');
        assert.equal(await three.count(), 1);
        assert.equal(await page.locator('#credits-roll a[href$="/assets/fonts/Jura-OFL.txt"]').count(), 1);
        const license = await page.request.get(await three.getAttribute('href'));
        assert.equal(license.status(), 200);
        assert.match(await license.text(), /Permission is hereby granted/);
        const screenshotDir = process.env.ECHO_SCREENSHOTS;
        if (screenshotDir) {
            fs.mkdirSync(screenshotDir, { recursive: true });
            await page.waitForFunction(() => getComputedStyle(document.getElementById('credits-screen')).opacity === '1');
            await page.screenshot({ path: path.join(screenshotDir, 'credits-desktop.png') });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.keyboard.press('PageDown');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const back = await page.locator('#btn-credits-back').boundingBox();
        assert.ok(Math.abs(back.x + back.width / 2 - 195) < 2);
        assert.ok(back.y + back.height > 770 && back.y + back.height < 844);
        if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, 'credits-mobile.png') });
        await page.keyboard.press('KeyE');
        await page.waitForSelector('#about-screen.active');
        assert.equal(await page.evaluate(() => window.__game.credits.active), false);
        assert.equal(await page.evaluate(() => window.__game.credits.frame), null);
        const stoppedAt = await page.evaluate(() => window.__game.credits.offset);
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => window.__game.credits.offset), stoppedAt);
        await page.keyboard.press('KeyE');
        await page.waitForSelector('#credits-screen.active');
        await page.waitForFunction(() => window.__game.credits.frame !== null);
        assert.ok(await page.evaluate(() => window.__game.credits.offset > document.getElementById('credits-viewport').clientHeight - 20));
        assert.equal(creditRequests, 1, 'reopening uses the loaded attribution file');
        await page.keyboard.press('Escape');
        await page.waitForSelector('#about-screen.active');

        const safe = await page.evaluate(async () => {
            const { renderCredits } = await import('./src/credits.js');
            const node = document.createElement('div');
            node.appendChild(renderCredits('## Test\n\n<img src=x onerror=alert(1)> [unsafe](javascript:alert(1))'));
            return { executable: node.querySelectorAll('img,script,a').length, text: node.textContent };
        });
        assert.equal(safe.executable, 0);
        assert.ok(safe.text.includes('<img'));
        assert.deepEqual(errors, []);
        await page.close();

        // A failed attribution fetch must leave Back working and allow retry.
        const retryPage = await browser.newPage();
        let unavailable = true;
        await retryPage.route('**/CREDITS.md', route => unavailable
            ? route.fulfill({ status: 404, body: 'missing' }) : route.continue());
        await retryPage.goto(url);
        await retryPage.waitForFunction(() => window.__game?.state === 'menu');
        await retryPage.click('#btn-about');
        await retryPage.click('#btn-credits');
        await retryPage.waitForFunction(() => document.getElementById('credits-status').textContent.includes('Не удалось'));
        await retryPage.keyboard.press('PageDown');
        assert.equal(await retryPage.locator('#credits-status').isVisible(), true);
        await retryPage.keyboard.press('KeyE');
        await retryPage.waitForSelector('#about-screen.active');
        unavailable = false;
        await retryPage.keyboard.press('KeyE');
        await retryPage.waitForFunction(() => document.querySelectorAll('#credits-roll h3').length > 5);
        await retryPage.keyboard.press('KeyE');
        await retryPage.waitForSelector('#about-screen.active');
        console.log('PASS: in-game credits, preserved attributions/license links, upward roll, pause/manual reading, keyboard return, mobile layout, restart, safe text rendering and fetch-error recovery');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
