const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=process.env.ECHO_SCREENSHOTS || path.join(require('node:os').tmpdir(),'echo-browser-check');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.ECHO_TEST_URL || 'http://127.0.0.1:8765');
 await page.waitForFunction(()=>window.__game?.state==='menu',{timeout:60000});
 await page.click('#btn-start');await page.click('#intro-skip');await page.waitForFunction(()=>window.__game.state==='play');
 await page.evaluate(()=>window.__game.loadLevel(1));await page.waitForTimeout(800);
 await page.screenshot({path:path.join(output,'echo-lab.png')});
 const lab=await page.evaluate(()=>{
  const g=window.__game;
  const inspect=(id,x,z)=>{const obj=g.interactables.find(o=>o.userData.id===id);g.player.setPosition(x,1.7,z);g.camera.lookAt(obj.position);g.camera.updateMatrixWorld(true);g.interactions.updateHover();return g.interactions.hoveredObject?.userData.id;};
  return [inspect('evacuation_order',-4.3,-2.7),inspect('registry_damaged',4.2,-2.7),inspect('reactor_override',0,2.7)];
 });
 assert.deepEqual(lab,['evacuation_order','registry_damaged','reactor_override']);
 await page.evaluate(()=>window.__game.loadLevel(2));await page.waitForTimeout(1000);
 await page.screenshot({path:path.join(output,'echo-capsule.png')});
 await page.evaluate(()=>{const g=window.__game;g.player.setPosition(0,1.7,-2.35);g.player.pitch=-.04;g.player._applyCamera();});await page.waitForTimeout(500);
 await page.screenshot({path:path.join(output,'echo-mirror.png')});
 const mirror=await page.evaluate(()=>{
  const g=window.__game,m=g.mirror;
  const r=m.reflector.getRenderTarget();
  const pixels=new Uint16Array(r.width*r.height*4);
  m.update(.016);g.renderer.render(g.scene,g.camera);g.renderer.readRenderTargetPixels(r,0,0,r.width,r.height,pixels);
  m.reflector.userData.showCharacter=false;g.renderer.render(g.scene,g.camera);
  const noBody=new Uint16Array(pixels.length);g.renderer.readRenderTargetPixels(r,0,0,r.width,r.height,noBody);
  let changed=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==noBody[i]||pixels[i+1]!==noBody[i+1]||pixels[i+2]!==noBody[i+2])changed++;
  m.reflector.userData.showCharacter=true;
  return {changed,avatarHidden:!m.avatar.visible,playerZ:g.player.position.z,reflectedZ:m.reflector.camera.position.z,mirrorZ:m.reflector.getWorldPosition(m.avatar.position.clone()).z};
 });
 console.log('mirror',mirror);assert.ok(mirror.changed>500,'engineer actually contributes pixels to mirror');
 assert.ok(mirror.avatarHidden);assert.ok(Math.abs(mirror.reflectedZ-(2*mirror.mirrorZ-mirror.playerZ))<.001);
 const gates=await page.evaluate(()=>{
  const g=window.__game;
  function focus(id,x,z){const obj=g.interactables.find(o=>o.userData.id===id);g.player.setPosition(x,1.7,z);g.camera.lookAt(obj.position);g.camera.updateMatrixWorld(true);g.interactions.updateHover();return g.interactions.hoveredObject?.userData.id;}
  const toy=focus('memory_toy',2.2,-.3);g.interactions.interact();g.ui.hideNote();
  const mirror=focus('final_mirror',0,-2.3);
  for(const id of ['child_drawing','evacuation_records'])g.memory.addFragment(id);
  g.interactions.interact();
  return {toy,mirror,state:g.state,choices:[...document.querySelectorAll('.ending-option')].map(b=>({text:b.textContent,disabled:b.disabled}))};
 });
 console.log('gates',gates);assert.equal(gates.toy,'memory_toy');assert.equal(gates.mirror,'final_mirror');assert.equal(gates.state,'ending');assert.equal(gates.choices.length,3);assert.ok(gates.choices.every(x=>!x.disabled));
 // Force render after each load to allocate resources, then compare stable third-act totals.
 const resources=await page.evaluate(()=>{
  const g=window.__game;g.state='play';
  function render(){g.mirror?.update(.016);g.renderer.render(g.scene,g.camera);return {...g.renderer.info.memory};}
  g.loadLevel(2);const before=render();
  for(let i=0;i<3;i++){g.loadLevel(0);render();g.loadLevel(1);render();g.loadLevel(2);render();}
  return {before,after:render()};
 });
 console.log(JSON.stringify({errors,lab,resources}));
 assert.equal(errors.length,0);assert.deepEqual(resources.after,resources.before);
 await browser.close();
})();
