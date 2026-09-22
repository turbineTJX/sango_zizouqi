import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const unit=(id,type,troops=3000)=>({id,type,troops,level:10});
const state=createScenario('custom-battle',73000009,20,null,{seed:73000009,terrain:'land',ownTeam:[unit('person-396','cavalry',6000),unit('person-646','spear',1500),unit('person-123','halberd',1500)],enemyTeam:[unit('jin','spear'),unit('yuanxia','archer'),unit('person-610','crossbow')]});
lockDeployment(state.battle);for(let i=0;i<45&&!state.battle.result;i++)stepBattle(state.battle);
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],out='outputs/battle-info-ui';await mkdir(out,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(data=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(data)),state);
 await page.goto('http://127.0.0.1:4173/#historical-battle');await page.locator('[data-action="unit-stats"]').first().click();
 const current=page.locator('[data-battle-info="current"]');assert.equal(await current.count(),1);assert.match(await current.textContent(),/战场位置/);
 await page.screenshot({path:out+'/unit-desktop.png',animations:'disabled'});
 await page.locator('#inspect-unit').selectOption('jin');assert.match(await current.textContent(),/敌军/);
 await page.locator('.modal [data-action="unit-officer"]').click();assert.equal(await current.count(),1);
 await page.locator('.modal [data-action="unit-stats"]').click();
 await page.locator('.modal .tactic-chip').first().click();assert.equal(await page.locator('[data-battle-info="tactic"]').count(),1);assert.match(await page.locator('[data-battle-info="tactic"]').textContent(),/当前可用情况/);
 await page.screenshot({path:out+'/tactic-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/tactic-mobile.png',animations:'disabled'});
 await page.locator('[data-action="inspection-back"]').click();assert.equal(await current.count(),1);assert.equal(await page.locator('#inspect-unit').inputValue(),'jin');await page.screenshot({path:out+'/unit-mobile.png',animations:'disabled'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,errors},null,2));console.log('Battle info UI passed: both sides, unit/officer/tactic navigation, desktop and mobile.');
}finally{await browser.close();}
