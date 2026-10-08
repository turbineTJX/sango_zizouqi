import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,COMMAND_RESOURCE} from '../engine.mjs';
import {setStatus,unitTactics} from '../tactics.mjs';
import {STRATAGEMS} from '../stratagems.mjs';
import {tacticUsesLeft,tacticUseLimit} from '../tactic-tempo.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),port=4331,out='outputs/stratagem-extreme-ui';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
const entry=id=>({id,type:'spear',troops:4000,level:10,retreatAt:null});
function stateFor(key){
 const holder=STRATAGEMS[key].roster[0],state=createScenario('custom-battle',11101,20,null,{seed:11101,terrain:'land',ownTeam:[holder,'chu','dun','yuanxia','he','gao','yan','liao','jin','person-17'].map(entry),enemyTeam:['shao','wen','person-70','person-186','person-516','person-243','person-439'].map(entry),ownTeamRoles:{leader:holder,advisor:holder}}),b=state.battle;
 lockDeployment(b);if(key==='refresh'){while(!b.result&&!b.sides[0].units.some(u=>u.skillCasts>0))stepBattle(b,{aiSides:[]});assert.equal(b.result,null);}
 for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));setStatus(b,u,'phalanx',999);}
 while(!b.result&&b.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b,{aiSides:[]});assert.equal(b.result,null);validateSave(state);return state;
}
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});await mkdir(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],results=[];
 for(const key of ['reinforce','refresh','storm']){
  const state=stateFor(key),page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(data=>{if(!localStorage.getItem('sango-historical-battle-v1'))localStorage.setItem('sango-historical-battle-v1',JSON.stringify(data));},state);
  await page.goto('http://127.0.0.1:'+port+'/#historical-battle');await page.locator('#command-cue').click();const dialog=page.getByRole('dialog',{name:'选择军略'}),card=dialog.locator('[data-command="'+key+'"]');
  const text=await card.innerText();assert.ok(text.includes(STRATAGEMS[key].name)&&text.includes('每场1次'));assert.ok(!text.includes('基础军略')&&!text.includes('专属军略'));if(key==='storm')assert.ok(text.includes('敌我皆受影响'));
  await page.screenshot({path:out+'/'+key+'-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth));await page.screenshot({path:out+'/'+key+'-mobile.png',fullPage:true});
  await card.click();await dialog.waitFor({state:'detached'});const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-historical-battle-v1')));validateSave(saved);assert.equal(saved.battle.tick,state.battle.tick);assert.equal(saved.battle.commandProgress,0);assert.equal(saved.battle.sides[0].stratagemUses[key],1);
  if(key==='reinforce'){const n=saved.battle.sides[0].stratagemEvents[0].units.length;assert.equal(saved.battle.sides[0].units.filter(u=>u.status==='active').length,6+n);}
  if(key==='refresh')for(const u of saved.battle.sides[0].units)for(const t of unitTactics(u).filter(t=>!t.passive))assert.equal(tacticUsesLeft(u,t),tacticUseLimit(u,t));
  if(key==='storm')assert.equal(saved.battle.sides[0].stratagemEvents[0].strikes.length,8);
  await page.reload();assert.deepEqual((await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-historical-battle-v1')))).battle,saved.battle);await page.locator('#command-cue').click();assert.ok(await page.locator('[data-command="'+key+'"]').isDisabled());await page.screenshot({path:out+'/'+key+'-used.png',fullPage:true});results.push({key,desktop:true,mobile:true,actualEffect:true,reload:true,limitedOnce:true});await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({results,errors},null,2));console.log('Extreme military strategies UI passed: mobile and desktop, unified labels, friendly-fire warning, actual effects, once-only stock and reload.');
}finally{await browser?.close();server.kill();}
