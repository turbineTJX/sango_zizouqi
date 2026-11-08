import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitTactics} from '../tactics.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
const id=name=>OFFICER_CATALOG.find(u=>u.name===name).id;
const entry=name=>({id:id(name),type:'archer',troops:3000,level:10});
const state=generateBattle({...defaultCustomBattle(),seed:81919,terrain:'land',mapId:'plain-open',battleKind:'field',events:[],ownTeam:['刘禅','刘璋','韩玄','刘度'].map(entry),enemyTeam:['何晏','刘备'].map(entry),reinforcements:[{side:1,name:'敌军补入',tick:30,team:[entry('高柔')]}]}),b=state.battle;
lockDeployment(b);
for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.intent=0;u.retreatAt=null;u.statuses.root={until:999};u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));}
for(let tick=0;tick<29;tick++)stepBattle(b,{aiSides:[],pauseForReinforcements:false});
assert.equal(b.tick,29);assert.ok(!b.sides[1].bondDebuffCasts.some(e=>e.id==='bondEnfeeble'));validateSave(JSON.parse(JSON.stringify(state)));
const out='outputs/bond-trigger-ui',port=4358;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto('http://127.0.0.1:'+port);
 await page.evaluate(async()=>{
  const {BattleEffects}=await import('./battle-effects.mjs'),{BattleBondEffects}=await import('./battle-bond-effects.mjs'),update=BattleEffects.prototype.update,push=BattleBondEffects.prototype.push;
  window.bondTrace=[];
  BattleEffects.prototype.update=function(b,options){window.fx=this;window.actualBattle=b;return update.call(this,b,options);};
  BattleBondEffects.prototype.push=function(receipt,...args){if(receipt.id==='bondEnfeeble')bondTrace.push({...receipt,tick:actualBattle.tick});return push.call(this,receipt,...args);};
 });
 await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles({name:'later-bond.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});await page.locator('#battle-board').waitFor();if(await page.locator('.modal-backdrop').count())await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>bondTrace.length),0);
 await page.clock.install({time:new Date('2026-11-08T08:00:00Z')});await page.clock.pauseAt(new Date('2026-11-08T08:00:01Z'));
 await page.locator('[data-action="pause"]').first().click();
 for(let frame=0;frame<120&&!await page.evaluate(()=>bondTrace.length);frame++)await page.clock.runFor(75);
 const receipt=await page.evaluate(()=>bondTrace[0]);assert.ok(receipt);assert.equal(receipt.kind,'proc');assert.equal(receipt.side,1);assert.equal(receipt.tick,31);assert.equal(receipt.targets.length,4);assert.equal(await page.evaluate(()=>bondTrace.length),1);
 await page.locator('#battle-bond-side').click();await page.clock.runFor(140);
 assert.ok(await page.locator('#enemy-battle-bonds [data-id="bondEnfeeble"]').evaluate(e=>e.classList.contains('bond-flashing')));
 await page.screenshot({path:out+'/desktop-trigger.png',fullPage:true});
 await page.locator('[data-action="pause"]').first().click();const frozen=await page.evaluate(()=>fx.clock);await page.clock.runFor(400);assert.equal(await page.evaluate(()=>fx.clock),frozen);
 await page.setViewportSize({width:844,height:390});await page.locator('[data-action="pause"]').first().click();await page.clock.runFor(100);assert.ok(await page.evaluate(()=>fx.bonds.items.some(e=>e.id==='bondEnfeeble'&&e.kind==='proc')));await page.screenshot({path:out+'/mobile-trigger.png',fullPage:true});
 await page.clock.runFor(2500);assert.equal(await page.evaluate(()=>bondTrace.length),1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,errors,receipt,oneTrigger:true,pause:true,desktop:true,mobile:true},null,2));console.log('PASS real late bond trigger, recipients, single animation, pause and desktop/mobile');
}finally{await browser?.close();server.kill();}
