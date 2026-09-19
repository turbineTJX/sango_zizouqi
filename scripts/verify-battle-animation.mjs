import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4298'},stdio:'pipe',windowsHide:true});
let browser;
const out='outputs/local-art/animation';await mkdir(out,{recursive:true});
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(new Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4298');
 await page.evaluate(async()=>{
  const {BattleEffects,isMajorCast}=await import('./battle-effects.mjs'),{BattleArt}=await import('./art-battle.mjs');
  window.invalidCutins=[];const update=BattleEffects.prototype.update;BattleEffects.prototype.update=function(...args){window.fx=this;const result=update.apply(this,args);for(const cast of this.cinematics)if(!isMajorCast(cast.events))invalidCutins.push(cast.events[0].label);return result;};
  const updateArt=BattleArt.prototype.update;BattleArt.prototype.update=function(...args){window.sprites=this;window.actualBattle=args[0];return updateArt.apply(this,args);};
 });
 await page.locator('[data-action="campaign-lobby"]').click();await page.locator('[data-action="launch-history"]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.has-unit-art').length>8);
 await page.screenshot({path:out+'/formation.png'});
 await page.clock.install();
 await page.locator('[data-action="pause"]').click();
 const captured=new Set();
 for(let i=0;i<750;i++){
  await page.clock.runFor(100);
  const state=await page.evaluate(()=>{
   const cast=fx.cinematics[0],p=cast?(fx.clock-cast.start)/cast.duration:0;
   return {small:!cast&&fx.items.some(e=>e.skill&&!e.ongoing&&!e.cinematic),smallCritical:!cast&&fx.items.some(e=>e.skill&&e.critical&&!e.cinematic),tick:actualBattle.tick,cast:cast?.events[0].label,critical:cast?.events.some(e=>e.critical),p,normal:!cast&&fx.items.some(e=>e.damage&&!e.skill),art:document.querySelectorAll('.has-unit-art').length};
  });
  const key=state.cast?'major':state.smallCritical?'critical-local':state.small?'minor':state.normal?'melee':null;
  if(key&&!captured.has(key)&&(state.cast?state.p>.18&&state.p<.4:true)){
   if(key==='melee')await page.clock.runFor(320);
   await page.screenshot({path:out+'/'+key+'.png'});captured.add(key);
   console.log('Captured',key,state);
  }
  if(captured.size===4)break;
 }
 for(const key of ['minor','major','melee','critical-local'])assert.ok(captured.has(key),key+' must appear in real combat');assert.deepEqual(await page.evaluate(()=>invalidCutins),[]);
 await page.locator('[data-action="pause"]').click();
 await page.clock.runFor(50);
 const clock=await page.evaluate(()=>({fx:fx.clock,art:sprites.clock}));const frozen=await page.evaluate(()=>sprites.canvas.toDataURL());
 await page.clock.runFor(600);assert.deepEqual(await page.evaluate(()=>({fx:fx.clock,art:sprites.clock})),clock);assert.ok(await page.evaluate(()=>sprites.canvas.toDataURL())===frozen,'paused formation pixels must remain frozen');
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(50);await page.screenshot({path:out+'/mobile.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="pause"]').click();await page.clock.runFor(2400);
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({captured:[...captured],errors,paused:true,reducedMotion:true},null,2));
 console.log('Battle animation UI checks passed');
}finally{await browser?.close();server.kill();}

