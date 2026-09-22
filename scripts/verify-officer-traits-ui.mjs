import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],out='outputs/officer-traits-ui';
await mkdir(out,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action="strategy"]').click();await page.locator('[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();await page.locator('[data-action="select-national-faction"][data-faction="cao"]').click();await page.locator('[data-action="launch-national"]').click();
 await page.locator('[data-action="campaign-info"]').click();await page.locator('[data-action="campaign-info-tab"][data-kind="officer"]').click();
 await page.locator('#campaign-info-query').fill('荀彧');await page.locator('#overlay-root [data-action="campaign-info-detail"]').click();
 const traits=page.locator('[data-info-section="traits"]');assert.equal(await traits.count(),1);
 if(!await traits.locator('[data-officer-traits]').isVisible())await traits.locator('summary').first().click();
 assert.match(await traits.textContent(),/能吏/);assert.match(await traits.textContent(),/眼力/);assert.match(await traits.textContent(),/调和/);assert.doesNotMatch(await traits.textContent(),/级解锁|急躁|负面/);
 await traits.locator('.passive-skill summary').first().click();await traits.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/traits-desktop.png'});
 await page.setViewportSize({width:390,height:844});await traits.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/traits-mobile.png'});
 const count=await traits.locator('.passive-skill').count();assert.equal(count,5);
 const unit=(id,type)=>({id,type,troops:3000,level:1});
 const state=createScenario('custom-battle',49,20,null,{seed:49,terrain:'land',ownTeam:[unit('cao','spear'),unit('yu','crossbow')],enemyTeam:[unit('jin','spear')]});lockDeployment(state.battle);
 await page.addInitScript(data=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(data)),state);
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:4173/?traits-ui=49#historical-battle');await page.locator('[data-action="unit-stats"]').first().click();await page.locator('.modal [data-action="unit-officer"]').click();
 const battle=page.locator('.modal .passive-panel');assert.match(await battle.textContent(),/开局即可使用/);assert.doesNotMatch(await battle.textContent(),/级解锁|负面|急躁/);assert.equal(await battle.locator('.locked').count(),0);
 await battle.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/traits-battle-desktop.png'});
 await page.setViewportSize({width:390,height:844});await battle.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/traits-battle-mobile.png'});
 assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,traits:count,desktop:true,mobile:true,battle:true,errors},null,2));console.log('Fixed positive traits: campaign and battle officer panels, descriptions and desktop/mobile passed.');
}finally{await browser.close();}
