const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const output=process.env.ECHO_SCREENSHOTS||path.join(require('node:os').tmpdir(),'echo-browser-check');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.ECHO_TEST_URL||'http://127.0.0.1:8765');await page.waitForFunction(()=>window.__game?.state==='menu');
 assert.equal(await page.locator('#btn-continue').isDisabled(),true);
 assert.equal(await page.locator('#btn-return-branch').isDisabled(),true);
 await page.waitForTimeout(650);await page.screenshot({path:path.join(output,'menu-new.png')});
 await page.click('#btn-endings');await page.waitForSelector('#endings-screen.active');assert.match(await page.locator('#menu-endings').innerText(),/Пока ни один/);await page.click('#btn-endings-back');
 await page.click('#btn-about');await page.waitForSelector('#about-screen.active');await page.click('#btn-about-back');
 await page.click('#btn-start');await page.waitForFunction(()=>window.__game.state==='prologue');await page.waitForFunction(()=>window.__game.prologue.sound.count>0);await page.click('#prologue-skip');assert.equal(await page.evaluate(()=>window.__game.prologue.sound.nodes.size),0);assert.ok(Math.abs(await page.evaluate(()=>{const t=window.__game.prologue.radio.timeline;return t.voiceStart-t.textEnd;})-.5)<.001);await page.waitForFunction(()=>window.__game.state==='intro');await page.click('#intro-skip');await page.waitForFunction(()=>window.__game.state==='play');
 async function focus(id,x,z){
  await page.evaluate(({id,x,z})=>{const g=window.__game,o=g.interactables.find(o=>o.userData.id===id||o.userData.type===id);if(!o)throw Error('missing '+id);g.player.setPosition(x,1.7,z);const dx=o.position.x-x,dz=o.position.z-z;g.player.yaw=Math.atan2(-dx,-dz);g.player.pitch=Math.atan2(o.position.y-1.7,Math.hypot(dx,dz));g.player._applyCamera();g.scene.updateMatrixWorld(true);g.camera.updateMatrixWorld(true);g.interactions.updateHover();if(g.interactions.hoveredObject!==o)throw Error('unreachable '+id);},{id,x,z});
 }
 async function read(id,x,z){await focus(id,x,z);await page.keyboard.press('KeyE');await page.waitForSelector('#note-overlay.active');await page.keyboard.press('KeyE');}
 await read('drawing_child',-2.8,-2.6);await focus('emergency_receiver',2.6,-2.8);await page.keyboard.press('KeyE');await page.waitForSelector('#recording-overlay.active');await page.keyboard.press('KeyE');
 await focus('exit',0,3.1);await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__game.levelIndex===1);
 await focus('reactor_override',0,2.7);await page.keyboard.press('KeyE');assert.equal(await page.locator('#note-overlay').evaluate(n=>n.classList.contains('active')),false);
 await read('evacuation_order',-4.3,-2.7);await read('registry_damaged',4.2,-2.7);await read('reactor_override',0,2.7);
 await page.waitForSelector('#moral-overlay.active');await page.screenshot({path:path.join(output,'first-choice.png')});
 await page.click('#moral-accept');await page.waitForFunction(()=>window.__game.levelIndex===2&&window.__game.state==='play');
 const mirror=await page.evaluate(()=>{const g=window.__game,m=g.scene.getObjectByName('matte-mirror');let reflective=false;g.scene.traverse(o=>{if(o.isReflector)reflective=true;});return {matte:!!m,transparent:m.material.transparent,opacity:m.material.opacity,roughness:m.material.roughness,hero:!!g.scene.getObjectByName('engineer-reflection'),reflective};});
 assert.deepEqual(mirror,{matte:true,transparent:false,opacity:1,roughness:1,hero:false,reflective:false});
 await finish(['accept','restart'],'accept');await page.click('#btn-return-branch');await page.click('#moral-accept');
 // Save a location and view, then reload the whole page in the same browser profile.
 await page.evaluate(()=>{const g=window.__game;g.player.setPosition(.7,1.7,2.5);g.player.yaw=.4;g.player.pitch=-.1;g.saveState();});
 await page.keyboard.press('Escape');await page.waitForSelector('#pause-screen.active');await page.click('#btn-back-menu');
 await page.reload();await page.waitForFunction(()=>window.__game?.state==='menu');await page.click('#btn-continue');
 const restored=await page.evaluate(()=>{const p=window.__game.player;return {x:p.position.x,z:p.position.z,yaw:p.yaw,pitch:p.pitch};});assert.deepEqual(restored,{x:.7,z:2.5,yaw:.4,pitch:-.1});
 await page.waitForTimeout(650);await page.screenshot({path:path.join(output,'matte-mirror-scene.png')});
 async function finish(expected,ending){
  await read('memory_toy',2.2,-.3);await focus('final_mirror',0,-2.3);await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__game.state==='ending');
  assert.deepEqual(await page.locator('.ending-option').evaluateAll(ns=>ns.map(n=>n.dataset.ending)),expected);
  await page.click(`[data-ending="${ending}"]`);if(['accept','rewrite'].includes(ending)){await page.waitForSelector('#ending-cinematic',{state:'visible'});await page.click('#ending-skip');}await page.click('#ending-back');await page.waitForSelector('#menu-screen.active');
 }
 await finish(['accept','restart'],'accept');
 await page.click('#btn-endings');await page.waitForSelector('#endings-screen.active');assert.match(await page.locator('#menu-endings').innerText(),/Принять правду/);await page.click('#btn-endings-back');
 await page.reload();await page.waitForFunction(()=>window.__game?.state==='menu');await page.click('#btn-return-branch');await page.waitForSelector('#moral-overlay.active');
 assert.equal(await page.evaluate(()=>window.__game.memory.hasFragment('toy_memory')),false,'checkpoint does not retain later toy');
 await page.click('#moral-justify');await page.waitForFunction(()=>window.__game.levelIndex===2&&window.__game.state==='play');await finish(['rewrite','restart'],'rewrite');
 await page.click('#btn-return-branch');await page.click('#moral-accept');await finish(['accept','restart'],'restart');
 assert.equal(await page.locator('#menu-endings li').count(),3);
 await page.waitForTimeout(650);await page.screenshot({path:path.join(output,'menu-completed.png')});
 const resources=await page.evaluate(()=>{const g=window.__game;g.hasActiveRun=true;g.state='play';const render=()=>{g.renderer.render(g.scene,g.camera);return {...g.renderer.info.memory};};g.loadLevel(2);const before=render();for(let i=0;i<3;i++){g.loadLevel(0);render();g.loadLevel(1);render();g.loadLevel(2);render();}g.backToMenu();return {before,after:(g.loadLevel(2),render())};});
 assert.deepEqual(resources.after,resources.before);
 await page.evaluate(()=>window.__game.backToMenu());assert.equal(await page.locator('#btn-exit').count(),0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({errors,mirror,restored,resources,branches:2,endings:3}));
 await browser.close();
})();
