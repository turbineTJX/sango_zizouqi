import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createScenario} from '../scenarios.mjs';
import {unitAttributes,validateSave,lockDeployment} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 const state=createScenario('tactical-three-heroes'),u=state.battle.sides[0].units[0];
 u.hp=100;u.battleDamage=u.initial-100;lockDeployment(state.battle);validateSave(structuredClone(state));
 const stats=unitAttributes(u,state.battle);
 await page.goto('http://127.0.0.1:4173/');
 await page.evaluate(s=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s)),state);
 await page.goto('http://127.0.0.1:4173/#historical-battle');await page.reload();
 await page.locator('[data-panel="intel"]').click();await page.locator('[data-action="unit-stats"]').click();
 await page.locator('#inspect-unit').selectOption(u.id);
 const cards=page.locator('.attribute-card');
 for(const [index,key] of [[0,'attack'],[4,'siege'],[7,'martialPower'],[8,'strategyPower']]){
  const shown=Number((await cards.nth(index).locator('summary b').innerText()).replace(/,/g,''));
  assert.ok(Math.abs(shown-stats[key])<=.051,`${key}: ${shown} != ${stats[key]}`);
 }
 assert.ok(!(await page.locator('body').innerText()).includes('兵力输出系数'));
 assert.match(await page.locator('.unit-state-grid').innerText(),/100/);
 await mkdir('outputs/troop-panel-ui',{recursive:true});
 await cards.first().scrollIntoViewIfNeeded();
 await page.screenshot({path:'outputs/troop-panel-ui/100-soldiers.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);console.log('100-soldier panel matches combat attributes; no separate troop multiplier.');
}finally{await browser.close();}
