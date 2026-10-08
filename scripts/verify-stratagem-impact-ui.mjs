import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,COMMAND_RESOURCE,validateSave} from '../engine.mjs';
import {setStatus,unitTactics} from '../tactics.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),port=4330,out='outputs/stratagem-impact-ui';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 const entry=id=>({id,type:'spear',troops:4000,level:10});
 const state=createScenario('custom-battle',10801,20,null,{seed:10801,terrain:'land',ownTeam:['person-636','person-558','jin','liao','person-46','person-668','dun'].map(entry),enemyTeam:['shao','wen','yan','gao','he','yuanxia','chu'].map(entry),ownTeamRoles:{leader:'person-636',advisor:'person-558'}}),b=state.battle;
 for(const u of b.sides.flatMap(s=>s.units)){u.retreatAt=null;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));setStatus(b,u,'phalanx',999);}
 lockDeployment(b);while(b.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b,{aiSides:[]});validateSave(state);
 await mkdir(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem(location.hash==='#historical-battle'?'sango-historical-battle-v1':location.hash==='#battle-lab'?'sango-battle-lab-v1':'sango-sovereign-v2')));
 const load=async(data=state)=>{await page.goto('http://127.0.0.1:'+port);await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles({name:'impact.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#battle-board').waitFor();};
 const point=async u=>{await page.locator('#battle-board').scrollIntoViewIfNeeded();await page.locator('#battle-board [data-unit="'+u.id+'"]').first().click();};
 for(const [key,side,status] of [['invincible',0,'commandInvincible'],['disrupt',1,'stun']]){
  await page.setViewportSize({width:1440,height:1000});await load();const before=await read();await page.locator('[data-action="choose-stratagem"]').click();assert.equal(await page.locator('.stratagem-options [data-command]').count(),2);
  await page.locator('[data-command="'+key+'"]').click();await point(b.sides[side].units.find(u=>u.status==='active'));
  const hits=await page.locator('#stratagem-area-overlay .area-hit').count();assert.ok(hits>0);assert.equal(await page.locator('.unit-nameplate.stratagem-affected').count(),hits);
  await page.screenshot({path:out+'/'+key+'-desktop.png'});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('#stratagem-area-controls').screenshot({path:out+'/'+key+'-mobile.png'});
  await page.keyboard.press('Escape');assert.deepEqual((await read()).battle,before.battle);
  await page.locator('[data-action="choose-stratagem"]').click();await page.locator('[data-command="'+key+'"]').click();await point(b.sides[side].units.find(u=>u.status==='active'));await page.screenshot({path:out+'/'+key+'-mobile-confirm.png'});assert.ok(await page.locator('[data-area-action="confirm"]').isEnabled());await page.locator('[data-area-action="confirm"]').click();const saved=await read();validateSave(saved);
  assert.equal(saved.battle.commandProgress,0);assert.equal(saved.battle.tick,b.tick);assert.ok(saved.battle.sides[side].units.some(u=>u.statuses[status]));await page.reload();assert.deepEqual((await read()).battle,saved.battle);
  await page.locator('[data-action="choose-stratagem"]').click();assert.ok(await page.locator('[data-command="'+key+'"]').isDisabled());await page.keyboard.press('Escape');results.push({key,hits,desktop:true,mobile:true,cancel:true,cast:true,reload:true,cooldown:true});
 }
 const attributes=[];
 for(const [caster,duration,name]of [['person-520',4,'马良'],['person-226',15,'司马懿']]){
  const data=createScenario('custom-battle',11001,20,null,{seed:11001,terrain:'land',ownTeam:['dun','person-520','person-226','jin','liao','he'].map(entry),enemyTeam:['shao','wen','yan','gao','person-17','person-70','person-186'].map(entry),ownTeamRoles:{leader:caster,advisor:caster}}),battle=data.battle;
  for(const u of battle.sides.flatMap(s=>s.units)){u.retreatAt=null;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));setStatus(battle,u,'phalanx',999);}
  lockDeployment(battle);while(battle.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(battle,{aiSides:[]});validateSave(data);
  await page.setViewportSize({width:1440,height:1000});await load(data);await page.locator('[data-action="choose-stratagem"]').click();const card=await page.locator('[data-command="ward"]').innerText();assert.ok(card.includes(name)&&card.includes(duration+' 回合'));
  await page.locator('[data-command="ward"]').click();const recipient=battle.sides[0].units.find(u=>u.id==='dun');await point(recipient);const preview=await page.locator('.stratagem-area-effect').innerText();assert.ok(preview.includes(name)&&preview.includes(duration+' 回合'));
  await page.screenshot({path:out+'/ward-'+caster+'-desktop.png'});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('#stratagem-area-controls').screenshot({path:out+'/ward-'+caster+'-mobile.png'});
  await page.locator('[data-area-action="confirm"]').click();const saved=await read(),status=saved.battle.sides[0].units.find(u=>u.id==='dun').statuses.magicImmune;assert.equal(status.duration,duration);assert.equal(status.until,saved.battle.tick+duration+1);assert.equal(status.sourceId,caster);validateSave(saved);
  await page.reload();assert.deepEqual((await read()).battle,saved.battle);attributes.push({caster,name,duration,desktop:true,mobile:true,previewMatchesCast:true,reload:true});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({results,attributes,errors},null,2));console.log('Invulnerability, stun and different ward casters UI: natural charging, actual attribute effects, preview, cancellation, confirmation, mobile and reload passed.');
}finally{await browser?.close();server.kill();}
