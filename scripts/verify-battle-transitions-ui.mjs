import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,validateSave} from '../engine.mjs';

// Legal unequal armies make the three presentation events easy to observe.
// This is a rendering fixture, not a combat balance or natural-AI audit.
const entry=(id,troops,retreatAt=null)=>({id,type:'spear',troops,level:10,retreatAt});
const state=createScenario('custom-battle',20261028,null,null,{seed:20261028,terrain:'land',mapId:'plain-open',battleKind:'field',
 ownTeam:['cao','dun','liao','chu','yu','jia','person-636'].map((id,i)=>entry(id,3000,i===1?3000:null)),
 ownTeamRoles:{leader:'liao',advisor:'jia'},
 enemyTeam:['shao','yan','wen','he','ju','tian'].map(id=>entry(id,1000))});
lockDeployment(state.battle);validateSave(state);
const out='work/battle-transitions-20261028',port=4353;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
async function record(page,name){
 const area=await page.locator('#battle-board').boundingBox(),frames=[];let info;
 for(let i=0;i<24;i++){
  const image=await page.screenshot({clip:{x:Math.floor(area.x),y:Math.floor(area.y),width:Math.floor(area.width),height:Math.floor(area.height)}});
  const raw=await sharp(image).resize({width:1000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});frames.push(raw.data);info=raw.info;await page.clock.runFor(50);
 }
 await sharp(Buffer.concat(frames),{raw:{width:info.width,height:info.height*frames.length,channels:4,pageHeight:info.height}}).gif({loop:0,delay:frames.map((_,i)=>i===frames.length-1?500:50),effort:3,colours:128}).toFile(out+'/'+name+'.gif');
}
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto(`http://127.0.0.1:${port}`);
 await page.evaluate(async()=>{
  const {BattleEffects}=await import('./battle-effects.mjs'),{BattleArt}=await import('./art-battle.mjs'),{GameAudio}=await import('./game-audio.mjs');
  const update=BattleEffects.prototype.update;BattleEffects.prototype.update=function(b,o){window.fx=this;window.actualBattle=b;return update.call(this,b,o);};
  const updateArt=BattleArt.prototype.update;BattleArt.prototype.update=function(...args){window.bodyView=this;return updateArt.apply(this,args);};
  window.heard=[];const play=GameAudio.prototype.play;GameAudio.prototype.play=function(key,o){const result=play.call(this,key,o);if(result)heard.push(key);return result;};
 });
 await page.locator('[data-action="settings"]').first().click();
 await page.locator('#import-file').setInputFiles({name:'transitions.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await page.locator('#battle-board').waitFor();await page.waitForFunction(()=>bodyView.models?.objects.size>=12);
 assert.equal(await page.evaluate(()=>fx.transitions.items.length),0,'loading stays silent');
 await page.clock.install({time:new Date('2026-10-28T03:00:00Z')});await page.clock.pauseAt(new Date('2026-10-28T03:01:00Z'));
 await page.locator('[data-action="pause"]').click();
 const found=new Set(),samples=[];
 for(let i=0;i<2200&&found.size<4;i++){
  await page.clock.runFor(50);
  const events=await page.evaluate(()=>fx.transitions.items.filter(e=>fx.clock>=e.start+60&&fx.clock<e.end-120).map(e=>({...e,clock:fx.clock})));
  for(const e of events){
   if(found.has(e.kind))continue;found.add(e.kind);samples.push(e);
   if(e.kind==='entry')assert.ok(await page.evaluate(id=>bodyView.models.objects.get('unit-'+id)?.flashMaterials.some(f=>f.material.transparent&&f.material.opacity<f.opacity),e.id),'native arrivals must fade in');
   await page.screenshot({path:out+'/'+e.kind+'.png'});
   if(e.kind==='rout'||e.kind==='entry')await record(page,e.kind);
  }
 }
 assert.deepEqual([...found].sort(),['entry','exit','retreat','rout']);
 const sounds=await page.evaluate(()=>heard);for(const key of ['rout','retreat','withdraw','reinforcement'])assert.ok(sounds.includes(key),key+' must actually play');
 await page.locator('[data-action="pause"]').click();const clock=await page.evaluate(()=>fx.clock);await page.clock.runFor(400);assert.equal(await page.evaluate(()=>fx.clock),clock);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 // The shared sampling drives sprites, native models and reduced-motion UI.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>fx.reduced);
 const reduced=await page.evaluate(async e=>{
  const {transitionFrame}=await import('./battle-transitions.mjs');
  // Re-render a captured presentation receipt, without touching battle state.
  fx.transitions.items=[e];
  fx.clock=e.start+e.duration*.4;fx.draw(performance.now());
  return transitionFrame(e,fx.clock,{reduced:true}).offsetX===0&&fx.reduced;
 },samples.find(e=>e.kind==='rout'));assert.equal(reduced,true);await page.screenshot({path:out+'/reduced.png',fullPage:true});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,samples,sounds,pause:true,mobile:true,reduced,errors},null,2));
 console.log('PASS real retreat, departure, reserve entry, fatal impact, native models, sounds, pause, mobile and reduced motion');
}finally{await browser?.close();server.kill();}
