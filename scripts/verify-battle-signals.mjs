import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4299'},stdio:'pipe',windowsHide:true});
const out='outputs/local-art/signals';await mkdir(out,{recursive:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(new Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4299');
 await page.evaluate(async()=>{
  const {BattleEffects}=await import('./battle-effects.mjs'),{BattleArt}=await import('./art-battle.mjs');
  const update=BattleEffects.prototype.update;BattleEffects.prototype.update=function(...args){window.fx=this;window.actualBattle=args[0];return update.apply(this,args);};
  const updateArt=BattleArt.prototype.update;BattleArt.prototype.update=function(...args){window.sprites=this;return updateArt.apply(this,args);};
 });
 await page.locator('[data-action="campaign-lobby"]').click();await page.locator('[data-action="launch-history"]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.has-unit-art').length>8);
 await page.clock.install();await page.locator('[data-action="pause"]').click();
 let enemy=false;
 for(let i=0;i<1200;i++){
  await page.clock.runFor(100);
  const s=await page.evaluate(()=>({ready:actualBattle.commandProgress>=12000,enemy:fx.signals.orders.some(e=>e.side===1),cinematic:fx.isCinematicPlaying()}));
  if(s.enemy&&!enemy){await page.clock.runFor(50);await page.screenshot({path:out+'/enemy-order.png'});enemy=true;}
  if(s.ready&&!s.cinematic)break;
 }
 assert.equal(await page.evaluate(()=>actualBattle.commandProgress>=12000),true);
 await page.locator('#command-cue').click();await page.locator('[data-command="assault"]').click();await page.clock.runFor(50);
 const order=await page.evaluate(()=>fx.signals.orders.find(e=>e.key==='assault'&&e.side===0));assert.ok(order);assert.equal(await page.evaluate(()=>fx.isCinematicPlaying()),false);
 await page.screenshot({path:out+'/military-order.png'});
 const frozen=await page.evaluate(()=>fx.canvas.toDataURL());await page.clock.runFor(450);assert.ok(await page.evaluate(()=>fx.canvas.toDataURL())===frozen,'paused status/command canvas is stable');
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(50);await page.screenshot({path:out+'/mobile-order.png'});
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-action="pause"]').click();
 for(let i=0;i<240&&!enemy;i++){await page.clock.runFor(100);enemy=await page.evaluate(()=>fx.signals.orders.some(e=>e.side===1));if(enemy){await page.clock.runFor(50);await page.screenshot({path:out+'/enemy-order.png'});}}
 assert.ok(enemy,'an enemy military order should become visible');
 // Load an unmodified, valid snapshot reached through real tactical combat.
 const control=await browser.newPage({viewport:{width:1440,height:1000}});control.on('pageerror',e=>errors.push(e.message));await control.goto('http://127.0.0.1:4299');
 const found=await control.evaluate(async()=>{
  const {createScenario}=await import('./scenarios.mjs'),{lockDeployment,stepBattle,validateSave}=await import('./engine.mjs');
  const wanted=['stun','confuse','burn','shield'],snapshots={};
  for(const id of ['tactical-three-heroes','tactical-control-zhang','history-yiling']){
   const s=createScenario(id),b=s.battle;lockDeployment(b);
   for(let i=0;i<160&&!b.result;i++){
    stepBattle(b);
    for(const key of wanted)if(!snapshots[key]&&b.sides.flatMap(s=>s.units).some(u=>u.status==='active'&&u.statuses?.[key]?.until>b.tick))snapshots[key]=structuredClone(s);
   }
  }
  window.statusSnapshots=snapshots;
  for(const s of Object.values(snapshots))validateSave(structuredClone(s));
  return Object.keys(snapshots);
 });
 assert.ok(found.includes('stun'));assert.ok(found.includes('confuse'));assert.ok(found.includes('burn'));assert.ok(found.includes('shield'));
 const snapshots=await control.evaluate(()=>statusSnapshots);
 for(const key of ['stun','confuse','burn','shield']){
  // Isolated pages prevent the previous battle's unload autosave replacing the snapshot.
  const shot=await browser.newPage({viewport:{width:1440,height:1000}});shot.on('pageerror',e=>errors.push(e.message));
  await shot.addInitScript(s=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s)),snapshots[key]);
  await shot.goto('http://127.0.0.1:4299/#historical-battle');await shot.locator('#battle-board').waitFor();
  await shot.waitForFunction(()=>document.querySelectorAll('.has-unit-art').length>0);await shot.waitForTimeout(200);
  const name={stun:'眩晕',confuse:'混乱',burn:'灼烧',shield:'护盾'}[key];assert.ok(await shot.locator(`.status-badge[title^="${name}"]`).count()>0,key+' must be loaded on a real unit');
  await shot.screenshot({path:out+'/'+key+'.png'});
  if(key==='stun'){
   await shot.emulateMedia({reducedMotion:'reduce'});await shot.reload();await shot.locator('#battle-board').waitFor();await shot.waitForTimeout(200);await shot.screenshot({path:out+'/reduced-motion.png'});
   await shot.evaluate(()=>localStorage.setItem('sango-art-mode','builtin'));await shot.reload();await shot.locator('#battle-board').waitFor();await shot.waitForTimeout(150);await shot.screenshot({path:out+'/builtin-status.png'});
  }
  await shot.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({enemy,own:true,states:found,paused:true,errors},null,2));console.log('Military and status UI verification passed',found);
}finally{await browser?.close();server.kill();}
