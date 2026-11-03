const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const artwork = {
    accept: 'truth-accepted.png',
    rewrite: 'history-rewritten.png',
    restart: 'start-again.png'
};

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
        headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader']
    });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        const screenshots = process.env.ECHO_SCREENSHOTS;
        if (screenshots) fs.mkdirSync(screenshots, { recursive: true });
        await page.goto(process.env.ECHO_TEST_URL || 'http://127.0.0.1:8765');
        await page.waitForFunction(() => window.__game?.state === 'menu');
        await page.click('#btn-endings');
        await page.waitForSelector('#endings-screen.active');
        await page.waitForFunction(() => getComputedStyle(document.getElementById('endings-screen')).opacity === '1' && getComputedStyle(document.getElementById('menu-screen')).opacity === '0');
        await page.waitForFunction(() => [...document.querySelectorAll('.ending-entry-image')].every(image => image.complete && image.naturalWidth > 0));
        assert.equal(await page.locator('.ending-entry').count(), 3);
        assert.equal(await page.locator('.ending-entry.is-locked').count(), 3);
        for (const item of await page.locator('.ending-entry').all()) {
            const id = await item.getAttribute('data-ending');
            assert.equal(await item.locator('img').getAttribute('src'), `./assets/endings/${artwork[id]}`);
            assert.equal(await item.evaluate(element => getComputedStyle(element).opacity), '0.5');
            assert.ok((await item.locator('.ending-entry-description').innerText()).length > 100);
            const image = await item.locator('img').boundingBox();
            const copy = await item.locator('.ending-entry-copy').boundingBox();
            assert.ok(copy.x >= image.x + image.width, 'description is to the right of the image');
        }
        assert.equal(await page.evaluate(() => window.__game.unlockedEndings.size), 0, 'reading the archive does not unlock endings');
        const assertFooter = async selector => {
            const box = await page.locator(selector).boundingBox();
            const viewport = page.viewportSize();
            assert.ok(Math.abs(box.x + box.width / 2 - viewport.width / 2) < 2);
            assert.ok(box.y + box.height > viewport.height - 70 && box.y + box.height < viewport.height);
        };
        await assertFooter('#btn-endings-back');
        if (screenshots) await page.screenshot({ path: path.join(screenshots, 'endings-gallery-desktop.png'), fullPage: true });
        await page.evaluate(() => {
            window.__game.unlockedEndings.add('accept');
            window.__game.ui.updateEndingsCounter();
        });
        assert.equal(await page.locator('.ending-entry.is-locked').count(), 2);
        assert.equal(await page.locator('.ending-entry[data-ending="accept"]').evaluate(element => getComputedStyle(element).opacity), '1');

        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('.ending-entry').last().scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await assertFooter('#btn-endings-back');
        if (screenshots) await page.screenshot({ path: path.join(screenshots, 'endings-gallery-mobile.png') });
        await page.click('#btn-endings-back');
        await page.waitForSelector('#menu-screen.active');

        // All three finales show only their own image and the bottom button.
        for (const id of ['accept', 'rewrite', 'restart']) {
            await page.evaluate(async id => {
                const { endings } = await import('./src/story.js');
                const game = window.__game;
                game.state = 'ending';
                game._showScreen(null);
                game.ui.showEnding(endings[id], { onBackToMenu: () => game.backToMenu() });
                if (game.ui.endingCinematic.active) game.ui.endingCinematic.finish();
            }, id);
            await page.waitForSelector('#ending-overlay.final-card.active');
            await page.waitForFunction(() => getComputedStyle(document.getElementById('ending-overlay')).opacity === '1' && getComputedStyle(document.getElementById('endings-screen')).opacity === '0');
            await page.waitForFunction(() => {
                const image = document.querySelector('#ending-visual img');
                return image?.complete && image.naturalWidth > 0;
            });
            assert.equal(await page.locator('#ending-text').textContent(), '');
            assert.equal(await page.locator('#ending-title').isVisible(), false);
            assert.equal(await page.locator('#ending-visual img').getAttribute('src'), `./assets/endings/${artwork[id]}`);
            await assertFooter('#ending-back');
            if (screenshots) await page.screenshot({ path: path.join(screenshots, `ending-card-${id}.png`) });
            await page.click('#ending-back');
            await page.waitForSelector('#menu-screen.active');
        }
        console.log('PASS: original artwork for all three ending cards, readable locked entries at 50%, unlocked state, image/text layout, mobile scrolling and centered bottom buttons');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
