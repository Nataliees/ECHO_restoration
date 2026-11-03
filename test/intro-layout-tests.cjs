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
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.ECHO_TEST_URL || 'http://127.0.0.1:8765');
        await page.waitForFunction(() => window.__game?.state === 'menu');

        const frame = () => page.evaluate(() => {
            const intro = window.__game.intro;
            const cameraWidth = intro.camera.right - intro.camera.left;
            const cameraHeight = intro.camera.top - intro.camera.bottom;
            return {
                width: innerWidth, height: innerHeight,
                pictureWidth: intro.videoPlane.geometry.parameters.width * intro.videoPlane.scale.x / cameraWidth * innerWidth,
                pictureHeight: intro.videoPlane.geometry.parameters.height * intro.videoPlane.scale.y / cameraHeight * innerHeight,
                glassScale: intro.shatterGroup.scale.toArray(),
                pictureScale: intro.videoPlane.scale.toArray(),
                cracksScale: intro.cracks.scale.toArray()
            };
        });
        const assertCompleteFrame = geometry => {
            assert.ok(geometry.pictureWidth <= geometry.width + 0.1, 'both horizontal edges fit');
            assert.ok(geometry.pictureHeight <= geometry.height + 0.1, 'both vertical edges fit');
            assert.ok(Math.abs(geometry.pictureWidth / geometry.pictureHeight - 16 / 9) < 0.0001, 'landscape aspect stays unchanged');
            assert.ok(Math.abs(geometry.pictureWidth - geometry.width) < 0.1 || Math.abs(geometry.pictureHeight - geometry.height) < 0.1, 'frame uses the available width or height');
            assert.deepEqual(geometry.glassScale, geometry.pictureScale, 'glass effect follows the contained frame');
            assert.deepEqual(geometry.cracksScale, geometry.pictureScale, 'cracks stay aligned to the frame');
        };
        // The still frame must fit even before video playback starts.
        assertCompleteFrame(await frame());
        await page.tap('#btn-start');
        await page.waitForFunction(() => window.__game.state === 'prologue');
        await page.tap('#prologue-skip');
        await page.tap('#prologue-skip');
        await page.waitForFunction(() => window.__game.state === 'intro');
        await page.waitForFunction(() => document.querySelector('#intro-interface.active') && window.__game.intro.video.currentTime > 0.05);

        const screenshots = process.env.ECHO_SCREENSHOTS;
        if (screenshots) fs.mkdirSync(screenshots, { recursive: true });
        const samples = [];
        for (const viewport of [
            { width: 390, height: 844 }, { width: 844, height: 390 },
            { width: 360, height: 800 }, { width: 768, height: 1024 },
            { width: 1440, height: 900 }, { width: 2560, height: 1080 }
        ]) {
            await page.setViewportSize(viewport);
            await page.waitForFunction(({ width, height }) => innerWidth === width && innerHeight === height, viewport);
            await page.waitForFunction(() => {
                const camera = window.__game.intro.camera;
                return Math.abs((camera.right - camera.left) / (camera.top - camera.bottom) - innerWidth / innerHeight) < 0.0001;
            });
            const geometry = await frame();
            assertCompleteFrame(geometry);
            samples.push({ width: geometry.width, height: geometry.height, pictureWidth: geometry.pictureWidth, pictureHeight: geometry.pictureHeight });
            const skip = await page.locator('#intro-skip').boundingBox();
            assert.ok(Math.abs(skip.x + skip.width / 2 - viewport.width / 2) < 2, 'skip remains centered');
            if (screenshots && viewport.width === 390) await page.screenshot({ path: path.join(screenshots, 'intro-phone-portrait.png') });
            if (screenshots && viewport.width === 844) await page.screenshot({ path: path.join(screenshots, 'intro-phone-landscape.png') });
        }
        await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.state === 'play');
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ result: 'PASS: complete landscape intro and still frame, phone rotation, tablet/desktop fit, aligned glass effects and usable skip', samples }));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
