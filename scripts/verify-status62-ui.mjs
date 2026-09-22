import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,validateSave} from '../engine.mjs';
import {createDecoy} from '../battle-status-rules.mjs';
import {setStatus} from '../tactics.mjs';
import {learnFixtureTactics,syncFixtureLearning} from '../tests/helpers/learn-tactics.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const state=createScenario('custom-battle',62,20,null,{seed:62,terrain:'land',ownTeam:[{id:'liao',type:'cavalry',troops:3000,level:10},{id:'cao',type:'spear',troops:3000,level:10}],enemyTeam:[{id:'person-396',type:'cavalry',troops:3000,level:10},{id:'yuanxia',type:'archer',troops:3000,level:10}]}),b=state.battle;
const own=b.sides[0].units[0],enemy=b.sides[1].units[0];
for(const u of [own,enemy]){learnFixtureTactics(u,['concealment']);u.entryStatusesApplied=false;}
syncFixtureLearning(state);lockDeployment(b);createDecoy(b,b.sides[0].units[1]);setStatus(b,own,'attackHaste',6);validateSave(structuredClone(state));
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],out='outputs/status62-ui';await mkdir(out,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(data=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(data)),state);
 await page.goto('http://127.0.0.1:4173/#historical-battle');
 await page.locator('.decoy-marker').waitFor();assert.equal(await page.locator('.decoy-marker').count(),1);assert.equal(await page.locator(`[data-unit="${enemy.id}"]`).count(),0);assert.equal(await page.locator(`[data-unit="${own.id}"].status-stealth`).count(),1);
 await page.screenshot({path:out+'/desktop.png',animations:'disabled'});
 await page.locator('[data-action="unit-stats"]').first().click();await page.locator('#inspect-unit').selectOption(own.id);assert.match(await page.locator('.modal').textContent(),/伏兵/);assert.match(await page.locator('.modal').textContent(),/速攻/);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/mobile.png',animations:'disabled'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,errors},null,2));console.log('Rule 62 UI passed: hidden enemy, own stealth, decoy marker, status details, mobile layout.');
}finally{await browser.close();}
