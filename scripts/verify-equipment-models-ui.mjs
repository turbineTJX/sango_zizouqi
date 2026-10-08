import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {setStatus} from '../tactics.mjs';
import {allLearnedTacticIds} from '../tactic-learning.mjs';
import {equipmentEntry} from '../tests/helpers/current-battle.mjs';
import {buildingCombatState} from '../building-rules.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/equipment-models/ui';mkdirSync(out,{recursive:true});
function fixture(type,side=0){
 const actor=equipmentEntry('dun',type),enemy=equipmentEntry('wen','archer');
 const s=generateBattle({...defaultCustomBattle(),seed:11231,ownTeam:[side?enemy:actor],enemyTeam:[side?actor:enemy]}),b=s.battle;lockDeployment(b);const u=b.sides[side].units[0],foe=b.sides[1-side].units[0],place=(a,x,y)=>Object.assign(a,side?{x:13-x,y:7-y}:{x,y});
 place(u,3,3);place(foe,9,6);foe.cooldown=999;setStatus(b,foe,'root',100,{sourceId:foe.id,sourceName:foe.name});
 for(const a of [u,foe])a.skillReady=Object.fromEntries(allLearnedTacticIds(a).map(id=>[id,999]));
 const a={id:'target',name:'箭塔',kind:'arrowTower',type:'building',side:1-side,hp:1000,maxHp:1000,...buildingCombatState('arrowTower',1)};place(a,type==='ram'?4:6,3);b.buildings=[a];
 const serialize=()=>{validateSave(structuredClone(s));return JSON.stringify(s);};
 const base=serialize();stepBattle(b,{aiSides:[]});assert.equal(u.formType,type);const deploying=serialize();
 for(let i=0;i<12&&a.hp===1000;i++)stepBattle(b,{aiSides:[]});assert.ok(a.hp<1000);const ready=serialize();
 a.hp=0;setStatus(b,foe,'stasis',100,{sourceId:foe.id,sourceName:foe.name});stepBattle(b,{aiSides:[]});assert.equal(u.formType,null);
 return {base,deploying,ready,recovered:serialize()};
}
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4253'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(async()=>{
  const save=sessionStorage.getItem('equipment-model-fixture');if(save)localStorage.setItem('sango-historical-battle-v1',save);
  const {BattleArt}=await import('/art-battle.mjs'),original=BattleArt.prototype.update;
  BattleArt.prototype.update=function(...args){window.equipmentArt=this;return original.apply(this,args);};
 });
 await page.goto('http://127.0.0.1:4253/#historical-battle');
 const load=async save=>{await page.evaluate(save=>sessionStorage.setItem('equipment-model-fixture',save),save);await page.goto('http://127.0.0.1:4253/#historical-battle');await page.reload();await page.locator('#battle-board').waitFor();await page.waitForFunction(()=>window.equipmentArt);};
 for(const type of ['ram','siege','tower'])for(const side of [0,1]){
  const label=type+(side?'-enemy':''),saves=fixture(type,side);await load(saves.base);const unit=page.locator('[data-unit="dun"]');assert.equal(await unit.getAttribute('data-combat-type'),'halberd');assert.equal(await unit.locator('[data-model-type]').count(),0);
  for(const stage of ['deploying','ready']){
   await load(saves[stage]);await page.waitForFunction(()=>equipmentArt.models?.hasUnit('dun'));await page.waitForTimeout(150);
   assert.equal(await unit.getAttribute('data-combat-type'),type);assert.equal(await unit.locator('[data-model-type="'+type+'"]').count(),1);
   assert.equal(await page.evaluate(()=>equipmentArt.models.objects.get('unit-dun').key),'builtin:'+type);
   assert.equal(await page.evaluate(()=>equipmentArt.models.objects.get('unit-dun').tilt.rotation.y),side?Math.PI:0);
   assert.ok((await page.locator('[data-inspect="dun"].unit-nameplate').getAttribute('aria-label')).includes({ram:'冲车',siege:'投石车',tower:'井栏'}[type]));
   const before=await page.evaluate(()=>localStorage.getItem('sango-historical-battle-v1'));await page.screenshot({path:out+'/'+label+'-'+stage+'-desktop.png'});assert.equal(await page.evaluate(()=>localStorage.getItem('sango-historical-battle-v1')),before);
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);await page.screenshot({path:out+'/'+label+'-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.setViewportSize({width:1440,height:1000});
  // Simulate a WebGL failure: the exact vector equipment remains visible.
  await page.evaluate(()=>equipmentArt.models.renderer.domElement.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await page.waitForTimeout(100);
  assert.equal(await unit.locator('.unit-equipment-model').evaluate(el=>getComputedStyle(el).visibility),'visible');await page.screenshot({path:out+'/'+label+'-fallback.png'});
  await load(saves.recovered);await page.waitForTimeout(100);assert.equal(await unit.getAttribute('data-combat-type'),'halberd');assert.equal(await unit.locator('[data-model-type]').count(),0);assert.equal(await page.evaluate(()=>equipmentArt.models?.hasUnit('dun')||false),false);await page.screenshot({path:out+'/'+label+'-recovered.png'});
  results.push({type,side,deploying:true,ready:true,desktop:true,mobile:true,fallback:true,recovered:true});
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/summary.json',JSON.stringify({results,errors},null,2));console.log('PASS equipment model transitions, specific silhouettes, fallback, recovery and desktop/mobile');
}catch(error){if(page){await page.screenshot({path:out+'/failure.png'});console.log((await page.locator('body').innerText()).slice(-1800));console.log(await page.evaluate(async()=>{const raw=sessionStorage.getItem('equipment-model-fixture'),saved=localStorage.getItem('sango-historical-battle-v1');let validation;try{const {validateSave}=await import('./engine.mjs');validateSave(JSON.parse(raw));validation='valid';}catch(e){validation=e.message;}return {hash:location.hash,fixtureBytes:raw?.length,savedBytes:saved?.length,validation};}));}throw error;}finally{await browser?.close();server.kill();}
