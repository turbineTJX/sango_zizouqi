import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment} from '../engine.mjs';
import {setStatus} from '../tactics.mjs';

const port=Number(process.env.BATTLE_HELP_PORT||4498),out='outputs/battle-onboarding/ui',errors=[],checks=[];
const fixture=()=>generateBattle({...defaultCustomBattle(),shieldPercent:0});
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'pipe'});
let browser,page;
async function saved(){return page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-historical-battle-v1'));}
async function load(state,{seen=false}={}){
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(({state,seen})=>{if(!sessionStorage.getItem('help-test-seeded')){localStorage.setItem('sango-historical-battle-v1',JSON.stringify(state));localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-audio-v1',JSON.stringify({muted:true}));if(seen)localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0}));sessionStorage.setItem('help-test-seeded','1');}},{state,seen});
 await page.goto(`http://127.0.0.1:${port}/#historical-battle`);await page.locator('.battle-board').waitFor();
 await page.waitForFunction(()=>document.querySelector('#battle-board')?.dataset.modelStatus==='ready');
 return context;
}
async function bounds(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const r=await page.locator('.modal').boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=await page.evaluate(()=>innerWidth+1)&&r.y+r.height<=await page.evaluate(()=>innerHeight+1));}
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('Help test server exited '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 let context=await load(fixture());
 await page.getByRole('heading',{name:'首次战斗 · 1/4 · 入门',exact:true}).waitFor();const firstSave=await saved();
 await page.screenshot({path:out+'/first-battle.png'});await page.setViewportSize({width:844,height:390});await bounds();await page.screenshot({path:out+'/first-battle-mobile.png'});await page.setViewportSize({width:1440,height:900});
 await page.locator('[data-action="battle-onboarding-next"]').click();await page.getByRole('heading',{name:'首次战斗 · 2/4 · 操作',exact:true}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'首次战斗 · 2/4 · 操作',exact:true}).waitFor();
 await page.locator('[data-action="battle-onboarding-next"]').click();await page.locator('.battle-help').waitFor({state:'hidden'});
 assert.equal(await saved(),firstSave,'reading the prebattle topics preserves the save');
 await page.locator('[data-action="pause"]').click();await page.getByRole('heading',{name:'首次战斗 · 3/4 · 用兵',exact:true}).waitFor();
 const combatSave=await saved();await page.locator('[data-action="battle-onboarding-next"]').click();await page.getByRole('heading',{name:'首次战斗 · 4/4 · 状态',exact:true}).waitFor();
 await page.setViewportSize({width:844,height:390});await bounds();await page.screenshot({path:out+'/first-battle-buffs-mobile.png'});await page.setViewportSize({width:1440,height:900});
 await page.locator('[data-action="battle-onboarding-next"]').click();assert.equal(await saved(),combatSave);await page.reload();await page.locator('.battle-board').waitFor();assert.equal(await page.locator('.battle-help').count(),0);
 checks.push('all four first-battle topics auto-show across the real deployment/combat boundary, persist after reload and finish once');
 await context.close();
 for(const closeMethod of ['button','x','escape']){
  context=await load(fixture());await page.locator('.battle-help').waitFor();
  if(closeMethod==='escape')await page.keyboard.press('Escape');else await page.locator(closeMethod==='x'?'.modal-header [data-action="close"]':'.modal-footer [data-action="close"]').click();
  await page.locator('.battle-help').waitFor({state:'hidden'});await page.locator('[data-action="pause"]').click();assert.equal(await page.locator('.battle-help').count(),0);
  await page.reload();await page.locator('.battle-board').waitFor();assert.equal(await page.locator('.battle-help').count(),0);await context.close();
 }
 checks.push('close button, X and Esc skip every remaining first-battle topic without reopening after combat start or reload');
 context=await load(fixture(),{seen:true});const before=await saved();await page.locator('[data-action="battle-help"]').first().click();
 await page.locator('.battle-help').waitFor();
 for(const [topic,text]of [['basics','部队会自动'],['controls','战斗速度'],['tactics','前排顶住'],['statuses','剩余 N 战斗回合']]){
  await page.locator(`[data-action="battle-help-topic"][data-topic="${topic}"]`).click();assert.ok((await page.locator('.battle-help-content').innerText()).includes(text));
  if(topic==='statuses'){await page.locator('.battle-help .profile-disclosure>summary').click();assert.ok(await page.locator('.battle-help .battle-help-row').count()>40);}
  await bounds();await page.screenshot({path:`${out}/${topic}-desktop.png`});
  await page.setViewportSize({width:844,height:390});await bounds();await page.screenshot({path:`${out}/${topic}-mobile.png`});await page.setViewportSize({width:1440,height:900});
 }
 assert.equal(await saved(),before,'reading every topic preserves the battle save');checks.push('manual topics, complete status legend, desktop/mobile bounds, unchanged save');
 await page.locator('[data-action="battle-help-topic"][data-topic="basics"]').click();await page.locator('[data-action="battle-help-tour"]').click();
 assert.equal(await page.locator('#page-guide-title').innerText(),'战前布阵');
 assert.ok(Number(await page.locator('.page-guide-coach').getAttribute('data-guide-target-count'))>0);
 await page.locator('[data-guide-done]').click();await page.reload();await page.locator('.battle-board').waitFor();assert.equal(await page.locator('.battle-help').count(),0);
 checks.push('manual live tour remains available after first-battle teaching is skipped');
 await context.close();
 const state=fixture(),b=state.battle;lockDeployment(b);const u=b.sides[0].units[0];
 setStatus(b,u,'valor',8,{sourceId:u.id,sourceName:u.name,sourceSkillName:'战法演示'});
 setStatus(b,u,'confuse',5,{sourceId:b.sides[1].units[0].id,sourceName:b.sides[1].units[0].name,sourceSkillName:'混乱演示'});
 context=await load(state,{seen:true});
 await page.locator(`.battle-unit[data-unit="${u.id}"] .map-portrait-row`).click();await page.locator('.battle-unit-inspection').waitFor();
 const initial=await saved(),statuses=page.locator('.battle-brief-effects');assert.match(await statuses.innerText(),/2项/);
 assert.match(await statuses.innerText(),/剩余 8 战斗回合/);assert.match(await statuses.locator('[data-status="confuse"] summary b').innerText(),/^混乱$/);
 assert.match(await statuses.innerText(),/战法演示/);assert.ok(await page.locator('[data-status="valor"] .effect-details').isVisible());
 await page.locator('[data-status="valor"] .status-values>summary').click();assert.match(await statuses.innerText(),/→/);
 for(const [width,height]of [[1440,900],[844,390],[740,360]]){await page.setViewportSize({width,height});await bounds();await page.screenshot({path:`${out}/buff-${width}.png`});}
 assert.equal(await saved(),initial,'status inspection preserves the battle save');
 await page.locator('.modal-header [data-action="close"]').click();assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-label'),'继续战斗');
 await page.keyboard.press('F1');assert.equal(await page.locator('#page-guide-title').innerText(),'战场指挥');
 for(let step=0;step<6;step++){await page.locator(`[data-guide-action="step"][data-guide-index="${step}"]`).click();assert.equal(await page.locator('.page-guide-coach').getAttribute('data-guide-step'),String(step));}
 await page.locator('[data-guide-done]').click();checks.push('live buffs, debuffs, exact duration, provenance, attribute impact, pause retention, six combat tour steps');
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,checks,errors,fixture:'Isolated battle; statuses applied through setStatus for display verification, not natural balance evidence.'},null,2));
 console.log('Battle help UI passed: '+checks.join('; '));
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.txt',(await page.locator('body').innerText()).slice(0,18000));}throw error;}
finally{await browser?.close();server.kill();}
