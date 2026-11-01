// Simulate the complete narrative path without WebGL or a browser.
// This exercises actual Interactions/Memory/Story logic with minimal UI stubs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {Memory} from '../src/memory.js';
import {levels} from '../src/levels.js';
import {endings} from '../src/story.js';

const source = fs.readFileSync(new URL('../src/interactions.js',import.meta.url),'utf8')
    .replace("import * as THREE from 'three';", "const THREE = {Raycaster:class{constructor(){this.far=0;}},Vector2:class{constructor(x,y){this.x=x;this.y=y;}}};")
    .replace("from './story.js'", `from '${new URL('../src/story.js', import.meta.url).href}'`);
const stubUrl = new URL('./_interaction-test-stub.mjs', import.meta.url);
fs.writeFileSync(stubUrl, source, 'utf8');
const {Interactions} = await import(stubUrl.href);

globalThis.document = {pointerLockElement:null,exitPointerLock(){}};
const notifications=[];
const chosen=[];
const game={
    state:'play',
    levelIndex:0,
    memory:new Memory(),
    interactables:[],
    scene:{remove(){}},
    ui:{
        hidePrompt(){}, showPrompt(){}, showSubtitle(text){notifications.push(text);},
        showNote(note){game.state='dialog';notifications.push(note.title);},
        queueNotification(text){notifications.push(text);},
        showEndingChoice(choices, handler){chosen.push([...choices]);handler('accept');},
        showEnding(e){notifications.push(e.title);},
        updateMemoryJournal(){}, updateEndingsCounter(){}
    },
    camera:{}, playBlip(){}, saveState(){},refreshActHUD(){},
    playRecoveredRecording(){game.state='memory';},
    loadLevel(next){ game.levelIndex=next;game.state='play';game.interactables=buildObjects(next); },
    unlockedEndings:new Set()
};
const interactions=new Interactions(game);
game.interactions=interactions;
function buildObjects(n){
    const list=levels[n].objects.map(o=>({userData:{...o}, traverse(){},parent:null}));
    if(levels[n].exit) list.push({userData:{type:'exit',...levels[n].exit},traverse(){}});
    return list;
}
function press(id){
    const o=game.interactables.find(o=>o.userData.id===id || (id==='exit'&&o.userData.type==='exit'));
    assert.ok(o,`missing ${id}`);
    interactions.hoveredObject=o;
    interactions.interact();
}
function closeOverlay(){game.state='play';}
game.interactables=buildObjects(0);
press('exit');
assert.equal(game.levelIndex,0,'cannot exit before the drawing and radio');
press('drawing_child');closeOverlay();
assert.equal(game.memory.hasFragment('child_drawing'),true);
assert.ok(!game.interactables.some(x=>x.userData.id==='drawing_child'),'drawing vanishes after collection');
press('exit');assert.equal(game.levelIndex,0,'radio memory also required');
press('emergency_receiver');
assert.equal(game.memory.hasEvent('radio_echo'),true);
assert.equal(game.state,'memory');closeOverlay();
press('exit');assert.equal(game.levelIndex,1);
press('evacuation_order');closeOverlay();
press('registry_damaged');closeOverlay();
assert.equal(game.memory.hasFragment('evacuation_records'),false,'third document needed');
press('reactor_override');closeOverlay();
assert.equal(game.memory.hasFragment('evacuation_records'),true);
press('exit');assert.equal(game.levelIndex,2);
press('final_mirror');assert.equal(chosen.length,0,'toy must be found first');
press('memory_toy');closeOverlay();
assert.equal(game.memory.hasFragment('toy_memory'),true);
press('final_mirror');
assert.deepEqual(chosen[0],['accept','rewrite','restart']);
assert.ok(game.unlockedEndings.has('accept'));
assert.ok(notifications.includes(endings.accept.title));
console.log('PASS: full three-act interaction path including all gates, radio memory and final choice');
