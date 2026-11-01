import assert from 'node:assert/strict';
import {Memory} from '../src/memory.js';
import {levels} from '../src/levels.js';
import {fragments, endings, notes, storyRequirements} from '../src/story.js';

assert.equal(levels.length,3, 'exactly three acts');
assert.deepEqual(levels.map(l => l.name), ['Шлюз','Лаборатория','Капсула']);
assert.ok(levels[0].objects.some(o => o.type === 'drawing'));
assert.ok(levels[0].objects.some(o => o.type === 'radio'));
assert.equal(levels[0].objects.some(o => o.type === 'toy'), false, 'toy must not appear in Act I');
assert.equal(levels[1].objects.some(o => o.type === 'toy'), false, 'toy must not appear in Act II');
assert.equal(levels[1].objects.filter(o => o.type === 'note').length,3);
assert.ok(levels[2].objects.some(o => o.type === 'toy'), 'toy belongs in Act III');
assert.ok(levels[2].objects.some(o => o.type === 'mirror'));
assert.deepEqual(Object.keys(endings),['accept','rewrite','restart']);
for (const ending of Object.values(endings)) {
    assert.doesNotMatch(ending.text,/дочь выжила|доч[ье] жив|она спаслась|её спасли/i);
}
for (const act of levels) {
    for(const o of act.objects) {
        if(o.type==='note') assert.ok(notes[o.id], `note ${o.id} needs content`);
        if(o.fragment) assert.ok(fragments[o.fragment], `missing fragment ${o.fragment}`);
    }
}
const memory=new Memory();
assert.deepEqual(memory.getAvailableEndings(), ['rewrite']);
assert.equal(memory.hasFragment('radio_echo'),false);
assert.equal(memory.markEvent('radio_echo'),true);
assert.equal(memory.markEvent('radio_echo'),false);
assert.equal(memory.hasFragment('radio_echo'),true);
assert.equal(memory.canRestoreEvacuationEvidence(),false);
for(const id of storyRequirements.evidenceNotes) memory.markNoteRead(id);
assert.equal(memory.canRestoreEvacuationEvidence(),true);
for(const id of storyRequirements.recoveredFragments) assert.equal(memory.addFragment(id),true);
assert.equal(memory.allFragmentsRecovered(),true);
assert.deepEqual(memory.getAvailableEndings(), ['accept','rewrite','restart'], 'all three endings are enabled after all three fragments');
const copy=new Memory();copy.load(memory.serialize());
assert.deepEqual(copy.serialize(),memory.serialize(), 'save/load preserves flags');
console.log('PASS: three acts, canonical clues, unknown family fate, radio replay, evidence reconstruction, endings, and memory save/restore');
