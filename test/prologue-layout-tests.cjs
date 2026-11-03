const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
        headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader']
    });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.ECHO_TEST_URL || 'http://127.0.0.1:8765');
        await page.waitForFunction(() => window.__game?.state === 'menu');
        await page.click('#btn-start');
        await page.waitForFunction(() => window.__game.prologue.sound.ready && window.__game.prologue.radio.ready);
        await page.evaluate(() => { window.__game.state = 'paused'; });
        const samples = [];
        for (const width of [265, 270, 275, 320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            const result = await page.evaluate(async () => {
                const { prologueParagraphs } = await import('./src/prologue.js');
                const prologue = window.__game.prologue;
                let checked = 0;
                const failures = [];
                const rect = index => {
                    const range = document.createRange();
                    range.setStart(prologue.typed.firstChild, index);
                    range.setEnd(prologue.typed.firstChild, index + 1);
                    const bounds = range.getBoundingClientRect();
                    return { x: bounds.x, y: bounds.y };
                };
                for (const source of prologueParagraphs) {
                    prologue.text.replaceChildren();
                    prologue._appendParagraph(source, source.length);
                    for (let index = 0; index < source.length; index++) {
                        if (source[index] !== '\u00a0') continue;
                        prologue._writeParagraph(source, source.length);
                        const expected = rect(index - 1);
                        const end = source.slice(index + 1).search(/[ \n]/);
                        const until = end < 0 ? source.length : index + 1 + end;
                        // Include the instant only the preposition has printed,
                        // before even the NBSP or following word is visible.
                        for (let offset = index; offset <= until; offset++) {
                            prologue._writeParagraph(source, offset);
                            const actual = rect(index - 1);
                            if (Math.abs(actual.x - expected.x) > 0.5 || Math.abs(actual.y - expected.y) > 0.5) {
                                failures.push({ source, offset, expected, actual });
                            }
                            checked++;
                        }
                    }
                    prologue._writeParagraph(source, source.length);
                    if (prologue.paragraph.scrollWidth > prologue.paragraph.clientWidth + 1) failures.push('overflow');
                }
                prologue.beginRadio = () => { prologue.phase = 'radio'; };
                prologue.phase = 'typing';
                prologue.skip();
                return {
                    checked, failures,
                    skipped: Array.from(prologue.text.querySelectorAll('.prologue-typed'), span => span.textContent),
                    expected: prologueParagraphs,
                    hiddenSuffixes: Array.from(prologue.text.querySelectorAll('.prologue-untyped'), span => span.textContent)
                };
            });
            assert.deepEqual(result.failures, [], `stable text layout at width ${width}`);
            assert.deepEqual(result.skipped, result.expected);
            assert.ok(result.hiddenSuffixes.every(text => text === ''));
            samples.push({ width, checkedPrefixes: result.checked });
        }
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ result: 'PASS: prepositions including к семье keep their final position through every typing prefix, skip preserves text and narrow layouts fit', samples }));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
