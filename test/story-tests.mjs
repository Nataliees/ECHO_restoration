import assert from 'node:assert/strict';
import { Memory } from '../src/memory.js';
import { levels } from '../src/levels.js';
import { notes, endings, storyRequirements } from '../src/story.js';
assert.equal(levels.length,3);
assert.equal(levels[1].objects.filter(o=>o.type==='note').length,3);
assert.equal(levels[0].objects.some(o=>o.type==='toy'),false);
assert.ok(levels[2].objects.some(o=>o.type==='toy'));
for(const act of levels)for(const o of act.objects)if(o.type==='note')assert.ok(notes[o.id]);
for(const ending of Object.values(endings))assert.doesNotMatch(ending.text,/дочь выжила|доч[ье] жив|она спаслась|её спасли/i);
for(const choice of ['accept','justify']){
 const m=new Memory();assert.equal(m.chooseResponsibility(choice),false,'choice requires evidence');
 assert.deepEqual(m.getAvailableEndings(),[]);
 for(const id of storyRequirements.evidenceNotes)m.markNoteRead(id);
 for(const id of storyRequirements.recoveredFragments)m.addFragment(id);
 assert.equal(m.chooseResponsibility(choice),true);
 assert.deepEqual(m.getAvailableEndings(),choice==='accept'?['accept','restart']:['rewrite','restart']);
 const copy=new Memory();copy.load(m.serialize());assert.deepEqual(copy.serialize(),m.serialize());
 assert.deepEqual(copy.getAvailableEndings(),m.getAvailableEndings());
}
assert.equal(endings.rewrite.title,'Стереть');assert.equal(endings.restart.title,'Создать новую личность');
console.log('PASS: three acts, two moral branches, exactly two endings per run and saved responsibility');
