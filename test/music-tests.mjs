import assert from 'node:assert/strict';
import { BackgroundMusic } from '../src/music.js';
const listeners=new Map();
globalThis.document={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn)};
globalThis.window={addEventListener(){}};
globalThis.Audio=class{constructor(src){this.src=src;this.paused=true;this.currentTime=0;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
const game={introSeen:false,state:'prologue',soundEnabled:true,audioCtx:null};
const music=new BackgroundMusic(game);
for(const state of ['menu','prologue','intro']){game.state=state;music.update(10);assert.equal(music.audio.paused,true,`silent during ${state}`);}
game.introSeen=true;game.state='play';music.update(10);await Promise.resolve();await Promise.resolve();
assert.equal(music.audio.paused,false);assert.ok(music.audio.volume>.044&&music.audio.volume<=.045);assert.equal(music.audio.loop,true);
game.state='memory';music.update(10);assert.ok(music.audio.volume<.013,'duck under the recovered voice');
game.soundEnabled=false;music.update(1);assert.ok(music.audio.paused&&music.audio.muted);
game.soundEnabled=true;game.state='play';music.update(1);await Promise.resolve();await Promise.resolve();
document.hidden=true;listeners.get('visibilitychange')();assert.equal(music.audio.paused,true,'pause without relying on a hidden-tab RAF');
document.hidden=false;game.state='menu';music.update(1);assert.equal(music.audio.paused,true);
music.audio.currentTime=40;music.reset();assert.equal(music.audio.currentTime,0);
console.log('PASS: music only after intro, quiet gain, voice ducking, loop, mute and background-tab pause');
