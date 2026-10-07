import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {defaultCustomBattle,validateCustomBattle,swapCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4223'},stdio:'pipe',windowsHide:true});
const output='outputs/historical-reinforcements/events-ui';mkdirSync(output,{recursive:true});let browser,page;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const action=id=>page.locator(`[data-action="${id}"]`);
 await page.goto('http://127.0.0.1:4223/');await action('campaign-lobby').click();await page.locator('[data-history="guandu"]').click();
 const field=(key,i=0)=>page.locator(`[data-custom-event="${key}"][data-index="${i}"]`),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-custom-draft-v46')));
 assert.equal(await field('kind').count(),1);assert.equal(await page.locator('[data-custom-event="kind"]').count(),2);assert.ok(!(await page.locator('.historical-library').innerText()).includes('NaN'));
 await field('tick').fill('3');await field('tick').press('Tab');await field('side').selectOption('0');await field('kind').selectOption('supply-cut');
 await field('duration').fill('2');await field('duration').press('Tab');let d=await saved();validateCustomBattle(d);assert.deepEqual(d.events[0],{kind:'supply-cut',side:0,tick:72,duration:48});
 const before=structuredClone(d);await action('custom-swap').click();assert.deepEqual(await saved(),swapCustomBattle(before));
 await page.locator('[data-action="custom-event-remove"][data-index="1"]').click();await action('custom-event-add').click();assert.equal((await saved()).events.length,2);await page.locator('[data-action="custom-event-remove"][data-index="1"]').click();
 await page.reload();await action('campaign-lobby').click();assert.equal(await field('kind').inputValue(),'supply-cut');assert.equal(await field('tick').inputValue(),'3');assert.equal(await field('duration').inputValue(),'2');assert.equal(await field('side').inputValue(),'1');
 await page.locator('.custom-events').screenshot({path:output+'/editor-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('.custom-events').screenshot({path:output+'/editor-mobile.png',animations:'disabled'});
 await action('launch-custom').click();const review=await page.locator('.modal').innerText();assert.match(review,/定时战役事件/);assert.match(review,/敌军 · 开战后3天 · 断粮 · 持续2天/);assert.match(review,/淳于琼队被消灭后/);
 await page.locator('.modal').screenshot({path:output+'/review-mobile.png',animations:'disabled'});
 const draft=defaultCustomBattle();draft.ownTeam=[{id:'yu',type:'spear',troops:5000,level:10}];draft.enemyTeam=[{id:'shao',type:'spear',troops:5000,level:10}];
 draft.events=[{kind:'supply-cut',side:1,tick:24,duration:48},{kind:'ambush',side:1,tick:24,duration:24}];draft.reinforcements=[{side:0,name:'日期检查后援',tick:26,team:[{id:'cao',type:'spear',troops:3000,level:10}]}];
 const fixture=generateBattle(draft);lockDeployment(fixture.battle);for(let n=0;n<23;n++)stepBattle(fixture.battle);assert.equal(fixture.battle.tick,23);validateSave(fixture);
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),battle=await context.newPage();battle.on('pageerror',e=>errors.push(e.message));
 await battle.addInitScript(raw=>{if(!sessionStorage.getItem('events-fixture')){localStorage.setItem('sango-historical-battle-v1',raw);sessionStorage.setItem('events-fixture','1');}},JSON.stringify(fixture));
 await battle.goto('http://127.0.0.1:4223/#historical-battle');await battle.locator('[data-action="pause"]').first().click();await battle.locator('[data-action="battle-reinforcement-council"]').waitFor();
 const getBattle=()=>battle.evaluate(()=>JSON.parse(localStorage.getItem('sango-historical-battle-v1')));let s=await getBattle();validateSave(s);assert.equal(s.battle.tick,26);assert.ok(s.battle.battleEvents.every(e=>e.triggeredAt===24));assert.equal(s.battle.logs.filter(l=>l.text.includes('事件触发')).length,2);
 const enemy=s.battle.sides[1].units[0];assert.ok(enemy.statuses.hunger);assert.ok(enemy.statuses.confuse);assert.ok(enemy.statuses.disrupted);
 await battle.locator('[data-action="battle-reinforcement-council"]').click();await battle.reload();s=await getBattle();validateSave(s);assert.equal(s.battle.tick,26);assert.ok(s.battle.battleEvents.every(e=>e.triggeredAt===24));
 await battle.screenshot({path:output+'/date-trigger.png',fullPage:true,animations:'disabled'});assert.deepEqual(errors,[]);
 console.log('PASS historical dates, event editing/add/remove, complete swap, reload, review, desktop/mobile, actual timed debuffs and saved reinforcement council');
}catch(e){if(page)await page.screenshot({path:output+'/failure.png',fullPage:true,animations:'disabled'});throw e;}
finally{await browser?.close();server.kill();}
