import assert from 'node:assert/strict';
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
for (const required of [
  'act-hud','act-label','act-heading','act-objective','act-progress',
  'recording-overlay','recording-status','recording-transcript','recording-close',
  'note-title','note-author','ending-choice','ending-title','ending-status',
  'ending-visual','journal-summary','journal-list','journal-notes','intro-interface'
]) assert.ok(ids.includes(required), `Missing HTML element: ${required}`);
for (const old of ['guilt-overlay','guilt-honest','guilt-dishonest'])
  assert.ok(!ids.includes(old), `Old fourth-act/guilt terminal UI must be removed: ${old}`);
for (const asset of [
  'assets/intro_daughter.mp3','assets/intro_explosion.mp3','assets/intro_reactor_motion.mp4',
  'assets/intro_hero.mp3','assets/alarm_siren.mp3'
]) assert.ok(fs.existsSync(new URL(`../${asset}`, import.meta.url)), `Missing media: ${asset}`);
const recording = fs.readFileSync(new URL('../src/recording.js', import.meta.url), 'utf8');
assert.ok(recording.includes('intro_daughter.mp3'));
assert.ok(recording.includes('intro_explosion.mp3'));
assert.ok(!recording.includes('intro_hero.mp3'),'Hero line must not play in act one');
console.log('PASS: all three-act interface anchors, approved media, and daughter-only radio replay');
