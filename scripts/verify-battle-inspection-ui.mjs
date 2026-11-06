import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,validateSave} from '../engine.mjs';
import {setStatus} from '../tactics.mjs';
const d=defaultCustomBattle();d.ownTeam=['cao','jia','liao','dun','chu','yu'].map(id=>({id,type:'spear',troops:3000,level:5}));d.enemyTeam=['shao','yan','wen','he','ju','tian'].map(id=>({id,type:'spear',troops:3000,level:5}));
const s=generateBattle(d);assert.equal(lockDeployment(s.battle),null);setStatus(s.battle,s.battle.sides[0].units[0],'confuse',6);validateSave(s);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4214'},stdio:'pipe',windowsHide:true});let browser;
const out='outputs/battle-detail-review';await mkdir(out,{recursive:true});
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});browser=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
 for(const [name,viewport]of [['desktop',{width:1440,height:900}],['mobile',{width:844,height:390}],['small-mobile',{width:667,height:375}]]){
  const context=await browser.newContext({viewport,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(raw=>{localStorage.setItem('sango-historical-battle-v1',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0}));},JSON.stringify(s));
  await page.goto('http://127.0.0.1:4214/#historical-battle');await page.waitForFunction(()=>document.querySelector('#battle-board')?.dataset.modelStatus==='ready');assert.equal(await page.locator('[data-action="step-scenario"],[data-action="campaign-day"]').count(),0);
  await page.evaluate(async()=>{const {BattleEffects}=await import('/battle-effects.mjs'),update=BattleEffects.prototype.update;BattleEffects.prototype.update=function(b,...args){window.inspectionBattleSnapshot=b;return update.call(this,b,...args);};});
  const clickUnit=async id=>{const el=page.locator(`[data-unit="${id}"] .map-portrait-row`),r=await el.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await el.tap();};
  const snapshot=()=>page.evaluate(()=>JSON.stringify(window.inspectionBattleSnapshot));
  await clickUnit('cao');assert.equal(await page.locator('#inspect-unit').inputValue(),'cao');const before=await snapshot();
  assert.equal(await page.locator('.battle-inspection-more').getAttribute('open'),null);assert.match(await page.locator('.battle-brief-effects').innerText(),/混乱/);
  const status=page.locator('.effect-tile[data-status="confuse"]'),statusName=status.locator('summary[data-status-trigger]');
  assert.equal(await status.getAttribute('open'),null,'status descriptions start folded behind the status name');
  await statusName.hover();assert.ok(await status.locator('.effect-details').isVisible(),'hovering the status name shows its own description');
  await page.mouse.move(4,4);assert.equal(await status.getAttribute('open'),null,'pointer exit closes an unpinned description');
  await statusName.tap();assert.equal(await status.getAttribute('open'),'','touch pins the status description');
  await page.mouse.move(4,4);assert.equal(await status.getAttribute('open'),'','a clicked description stays open');
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/${name}-status.png`,animations:'disabled'});
  await statusName.tap();assert.equal(await status.getAttribute('open'),null,'clicking the same status name closes it');
  await page.locator('#inspect-unit').focus();await statusName.focus();assert.ok(await status.locator('.effect-details').isVisible(),'keyboard focus shows the same description');
  await statusName.press('Escape');assert.equal(await status.getAttribute('open'),null);assert.equal(await page.locator('.battle-unit-inspection').count(),1,'Esc closes the status before the unit panel');
  assert.doesNotMatch(await page.locator('.battle-brief-effects').innerText(),/状态详情/);
  await page.locator('.modal-body').evaluate(el=>{el.scrollTop=0;});
  const geometry=await page.locator('.modal').evaluate(el=>{const r=el.getBoundingClientRect(),body=el.querySelector('.modal-body');return {width:r.width,screenWidth:innerWidth,bodyHeight:body.clientHeight,contentHeight:body.scrollHeight,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};});
  assert.ok(geometry.inside);assert.ok(await page.locator('.battle-brief-tactics').evaluate(el=>{const b=el.closest('.modal-body').getBoundingClientRect(),r=el.getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom;}),'core stats and tactic counts appear before the longer status explanations');if(name!=='desktop')assert.ok(geometry.width/viewport.width<.46,'the battle remains the larger area');
  await page.screenshot({path:`${out}/${name}.png`,animations:'disabled'});
  await page.locator('.battle-inspection-more>summary').click();assert.ok(await page.locator('.battle-inspection-more .attribute-card').first().isVisible());await page.locator('.battle-inspection-more>summary').click();
  await page.locator('.battle-brief-tactic').first().tap();await page.locator('.text-detail-view').waitFor();assert.match(await page.locator('.text-detail-view').innerText(),/剩余.*次/);await page.locator('.modal-footer [data-action="close"]').tap();await page.locator('.battle-unit-inspection').waitFor();
  await clickUnit('jia');assert.equal(await page.locator('#inspect-unit').inputValue(),'jia');assert.ok(await page.locator('.modal-body').evaluate(el=>el.scrollHeight/el.clientHeight<1.5),'the brief without temporary effects needs at most a short scroll');await page.locator('#inspect-unit').selectOption('shao');assert.equal(await page.locator('#inspect-unit').inputValue(),'shao');assert.equal(await snapshot(),before,'viewing, switching and opening details never change combat state');
  await page.keyboard.press('Escape');assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-label'),'继续战斗');
  await page.locator('[data-action="pause"]').tap();assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-label'),'暂停');await clickUnit('cao');assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-label'),'继续战斗','opening during combat pauses it');
  await page.locator('[data-action="battle-inspection-resume"]').tap();assert.equal(await page.locator('.battle-unit-inspection').count(),0);assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-label'),'暂停','explicit continue closes and resumes');
  await clickUnit('jia');await page.locator('.modal-footer [data-action="close"]').tap();assert.equal(await page.locator('[data-action="pause"]').getAttribute('aria-label'),'继续战斗','return and close keep the battle paused');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));results.push({name,...geometry,readOnly:true,switching:true,tacticReturn:true,closeKeepsPaused:true,explicitResume:true});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({results,errors},null,2));console.log('PASS compact battle inspection: desktop, two landscape phones, touch switching, folds, tactic return, read-only viewing, pause and explicit continue.');
}finally{await browser?.close();server.kill();}
