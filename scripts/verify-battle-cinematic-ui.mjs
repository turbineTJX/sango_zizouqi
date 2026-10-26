import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,planBattleCouncilsAI,stepBattle,COMMAND_RESOURCE,validateSave} from '../engine.mjs';

const entry=([id,type])=>({id,type,level:10,troops:4000,retreatAt:null});
const initial=createScenario('custom-battle',20261026,null,null,{seed:20261026,terrain:'land',
 ownTeam:[['cao','spear'],['dun','spear'],['liao','cavalry'],['chu','halberd'],['yu','archer'],['jia','archer']].map(entry),
 enemyTeam:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','archer'],['ju','archer'],['tian','spear']].map(entry),ownTeamRoles:{leader:'cao',advisor:'yu'}});
planBattleCouncilsAI(initial.battle,[0,1]);lockDeployment(initial.battle);
const charged=structuredClone(initial);
while(charged.battle.commandProgress<COMMAND_RESOURCE.capacity&&!charged.battle.result)stepBattle(charged.battle,{aiSides:[]});
assert.ok(!charged.battle.result);validateSave(charged);
const port=4346,out='work/battle-cinematic-body-20261026';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);
 await page.evaluate(async()=>{
  const {BattleEffects}=await import('./battle-effects.mjs'),original=BattleEffects.prototype.update;
  BattleEffects.prototype.update=function(b,options){window.fx=this;window.actualBattle=b;return original.call(this,b,options);};
 });
 async function load(state){
  if(await page.locator('#battle-board').count())await page.locator('[data-action="battle-panel"][data-panel="tools"]').click();
  await page.locator('[data-action="settings"]').first().click();
  await page.locator('#import-file').setInputFiles({name:'cinematic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
  await page.locator('#battle-board').waitFor();await page.waitForTimeout(300);
 }
 await load(charged);assert.equal(await page.evaluate(()=>fx.mode),'full');
 await page.clock.install({time:new Date('2026-10-26T01:00:00Z')});await page.clock.pauseAt(new Date('2026-10-26T01:00:00.100Z'));
 await page.locator('[data-action="choose-stratagem"]').click();await page.locator('[data-command="cao-wuchao"]').click();
 const command=await page.evaluate(()=>({name:fx.signals.orders[0]?.name,source:fx.signals.orders[0]?.source,tick:actualBattle.tick}));
 assert.equal(command.source.name,'曹操');assert.equal(command.tick,charged.battle.tick);
 await page.locator('[data-action="pause"]').click();
 const frames=[];let info;
 for(let i=0;i<38;i++){
  const buffer=await page.locator('.arena-stage').screenshot(),raw=await sharp(buffer).resize({width:1000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  frames.push(raw.data);info=raw.info;
  if(i===8)await page.screenshot({path:out+'/military-order.png'});
  if(i===23)await page.screenshot({path:out+'/military-impact.png'});
  await page.clock.runFor(50);
 }
 await sharp(Buffer.concat(frames),{raw:{width:info.width,height:info.height*frames.length,channels:4,pageHeight:info.height}}).gif({loop:0,delay:frames.map((_,i)=>i===frames.length-1?600:50),colours:128,effort:3}).toFile(out+'/military-order.gif');
 await page.locator('[data-action="pause"]').click();await load(initial);await page.locator('[data-action="pause"]').click();
 let found=false;
 for(let i=0;i<1500;i++){
  await page.clock.runFor(50);
  found=await page.evaluate(()=>{const cast=fx.currentCinematic();return !!cast&&(fx.clock-cast.start)/cast.duration>.15&&(fx.clock-cast.start)/cast.duration<.3;});
  if(found)break;
 }
 assert.ok(found,'a genuine major tactic must play');
 await page.locator('[data-action="pause"]').click();await page.clock.runFor(20);
 const frozen=await page.evaluate(()=>({clock:fx.clock,pixels:fx.canvas.toDataURL(),battle:JSON.stringify(actualBattle)}));
 await page.screenshot({path:out+'/tactic.png'});await page.clock.runFor(600);
 assert.deepEqual(await page.evaluate(()=>({clock:fx.clock,pixels:fx.canvas.toDataURL(),battle:JSON.stringify(actualBattle)})),frozen);
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(50);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.screenshot({path:out+'/mobile.png'});
 // Pause keeps the same actual cast available for each presentation preference.
 await page.evaluate(()=>{fx.mode='clear';fx.draw(performance.now());});await page.screenshot({path:out+'/clear.png'});
 await page.evaluate(()=>{fx.mode='full';fx.reduced=true;fx.draw(performance.now());});await page.screenshot({path:out+'/reduced.png'});
 assert.equal(await page.evaluate(()=>JSON.stringify(actualBattle)),frozen.battle);
 assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,command,naturalCharging:true,pause:true,mobile:true,clear:true,reducedMotion:true,errors},null,2));
 console.log(JSON.stringify({passed:true,out,command,errors}));
}finally{await browser?.close();server.kill();}
