import assert from 'node:assert/strict';
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
for (const required of [
  'act-hud','act-label','act-heading','act-objective','act-progress',
  'recording-overlay','recording-status','recording-transcript','recording-close',
  'note-title','note-author','ending-choice','ending-title','ending-status',
  'ending-visual','journal-summary','journal-list','journal-notes','intro-interface','intro-skip','prologue-skip','location-announcement'
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

const recordingSource = recording;
const radioSource = fs.readFileSync(new URL('../src/prologue-radio.js', import.meta.url), 'utf8');
const interactionsSource = fs.readFileSync(new URL('../src/interactions.js', import.meta.url), 'utf8');
const uiSource = fs.readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
assert.ok(recordingSource.includes("this.prelude.play(() => this._playLastFragment(onPhase,onComplete), {full:true})"), 'receiver plays the full prelude audio');
assert.ok(recordingSource.includes("onPhase('ВОССТАНОВЛЕННАЯ ПЕРЕДАЧА', '«Папа, когда ты придёшь?»')"), 'opening receiver subtitle is Russian only');
assert.ok(!recordingSource.includes('When are you coming, Daddy?'), 'English opening subtitle is removed from receiver');
assert.ok(recordingSource.includes("this.prelude.play(() => this._playLastFragment(onPhase,onComplete), {full:true})"), 'receiver plays the full phrase including its opening pause');
assert.ok(recordingSource.includes("this._noise(0.34, 0.24)"), 'radio hiss separates the daughter phrases');
assert.ok(recordingSource.includes("this.explosion.play()"), 'receiver recording ends with the explosion');
assert.ok(radioSource.includes('preNoiseStart') && radioSource.includes('postNoiseStart'), 'radio has static before and after the full voice line');
assert.ok(interactionsSource.includes('_getPromptHint(group)'), 'locked reactor protocol has a separate hint');
assert.ok(uiSource.includes('interact-prompt-hint'), 'locked protocol hint is rendered separately');
assert.match(cssSource, /#intro-skip,#prologue-skip\s*\{[^}]*position:fixed[^}]*bottom:[^}]*left:50%/s, 'intro and prologue skip buttons share bottom-center positioning');
assert.match(cssSource, /#location-announcement\.visible\s*\{[^}]*animation:location-announcement 2s/s, 'location announcement lasts two seconds');
console.log('PASS: full daughter radio line, bottom-centred skip controls, 2-second location cards and locked-document hint');

const receiverHtml = html.slice(html.indexOf('id="recording-overlay"'), html.indexOf('id="ending-overlay"'));
assert.ok(!receiverHtml.includes('RECOVERED AUDIO') && receiverHtml.includes('ВОССТАНОВЛЕННАЯ ЗАПИСЬ'), 'receiver header is Russian-only');
assert.ok(uiSource.includes('russianCaption'), 'receiver UI sanitizes legacy English captions');
console.log('PASS: receiver panel and subtitles contain Russian text only');

const prologueSource = fs.readFileSync(new URL('../src/prologue.js', import.meta.url), 'utf8');
assert.ok(ids.includes('prologue-radio-caption'), 'typed prologue has a dedicated radio subtitle');
assert.ok(prologueSource.includes('«Папа, когда ты придёшь?»'), 'first post-typewriter line has the Russian subtitle');
assert.ok(prologueSource.includes('onVoiceStart:()=>this.showRadioCaption()'), "subtitle appears when the daughter voice begins");
assert.ok(prologueSource.includes('onVoiceEnd:()=>this.hideRadioCaption()'), "subtitle disappears when the daughter voice ends");
assert.ok(radioSource.includes('options.onVoiceStart()') && radioSource.includes('options.onVoiceEnd()'), 'radio schedules subtitle to the audio timeline');
console.log('PASS: Russian subtitle appears on the first daughter line after the typewriter prologue');
