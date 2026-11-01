import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,COMMAND_RESOURCE} from '../engine.mjs';

const out='work/manual-stratagem/current',port=4497;
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'on'},windowsHide:true,stdio:'pipe'});
let browser;const errors=[],checks=[];
const unit=id=>({id,type:'spear',troops:4000,level:5});
const fixture=leader=>{
 const s=createScenario('custom-battle',4511,20,null,{seed:4511,terrain:'land',ownTeam:[unit(leader),unit('person-668'),unit('chu')],enemyTeam:[unit('shao'),unit('wen'),unit('yan')],ownTeamRoles:{leader,advisor:'person-668'}});
 lockDeployment(s.battle);s.battle.commandProgress=COMMAND_RESOURCE.capacity;return s;
};
const snapshot=page=>page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-historical-battle-v1')));
async function load(s,viewport){
 const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(s=>{
  localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s));
  localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
  localStorage.setItem('sango-audio-v1',JSON.stringify({muted:true}));
 },s);
 await page.goto(`http://127.0.0.1:${port}/#historical-battle`);
 await page.locator('#battle-board').waitFor();
 await page.waitForFunction(()=>document.querySelector('#battle-board')?.dataset.modelStatus==='ready');
 return {page,context};
}
async function expectPaused(page){assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-label'),'继续战斗');}
async function expectRunning(page){assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-label'),'暂停');}
async function expectTickAdvances(page,tick){
 await page.waitForFunction(async tick=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-historical-battle-v1')).battle.tick>tick,tick,{timeout:15000});
}
try{
 await mkdir(out,{recursive:true});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const [label,viewport]of [['desktop',{width:1440,height:900}],['landscape',{width:844,height:390}]]){
  const s=fixture('person-246'),{page,context}=await load(s,viewport);
  // Enter selection from an actively running battle, then verify time freezes.
  await page.locator('[data-action="pause"]').click();await expectRunning(page);
  await page.locator('[data-action="choose-stratagem"]').click();await expectPaused(page);
  await page.locator('[data-command="zhou-redcliffs"]').click();
  const before=await snapshot(page);await page.waitForTimeout(1100);assert.equal((await snapshot(page)).battle.tick,before.battle.tick);
  await page.locator('.battle-unit.side-1 .map-portrait-row').first().click();
  const affected=page.locator('.battle-unit.stratagem-affected');assert.ok(await affected.count()>0);
  assert.equal(await page.locator('#stratagem-area-overlay .area-target-pointer').count(),await affected.count());
  assert.ok((await page.locator('.stratagem-area-heading').innerText()).includes('敌军'));
  for(const el of await affected.all())assert.equal(await el.locator('.unit-map-caption>b').isVisible(),true);
  assert.ok(await page.locator('.stratagem-muted').count()>0);
  await page.mouse.move(70,40);await page.screenshot({path:`${out}/${label}-target.png`});
  await page.locator('[data-area-action="cancel"]').click();await expectPaused(page);
  assert.equal(await page.locator('.stratagem-affected').count(),0);assert.deepEqual((await snapshot(page)).battle,before.battle);
  await page.locator('[data-action="choose-stratagem"]').click();await page.locator('[data-command="heal"]').click();
  await page.locator('.battle-unit.side-0 .map-portrait-row').first().click();assert.equal(await page.locator('[data-area-action="confirm"]').isDisabled(),true);await expectPaused(page);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.stratagem-affected').count(),0);
  await page.locator('[data-action="choose-stratagem"]').click();await page.locator('[data-command="zhou-redcliffs"]').click();
  await page.locator('.battle-unit.side-1 .map-portrait-row').first().click();
  const ids=await affected.evaluateAll(els=>els.map(el=>el.dataset.unit));
  await page.locator('[data-area-action="confirm"]').click();await expectRunning(page);
  assert.equal(await page.locator('#stratagem-area-controls').isHidden(),true);
  assert.deepEqual(await affected.evaluateAll(els=>els.map(el=>el.dataset.unit)),ids);
  assert.equal((await snapshot(page)).battle.commandProgress,0);
  await page.screenshot({path:`${out}/${label}-cast.png`});await expectTickAdvances(page,before.battle.tick);
  await page.waitForFunction(()=>!document.querySelector('.stratagem-affected'),{},{timeout:20000});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  checks.push(`${label}: selection freezes; cancel/empty selection preserve state; targets marked; cast resumes and advances; marks expire`);
  await context.close();
  const army=await load(fixture('cao'),viewport),p=army.page;
  await p.locator('[data-action="choose-stratagem"]').click();await expectPaused(p);
  await p.locator('[data-command="cao-wuchao"]').click();await expectRunning(p);
  assert.equal(await p.locator('.battle-unit.side-0.stratagem-affected').count(),3);
  assert.equal(await p.locator('.battle-unit.side-1.stratagem-affected').count(),0);
  await expectTickAdvances(p,0);checks.push(`${label}: all-army cast resumes and identifies allies`);await army.context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({checks,errors},null,2));console.log(checks.join('\n'));
}finally{await browser?.close();server.kill();}
