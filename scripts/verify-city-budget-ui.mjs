import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {updateCityBudgetAlerts} from '../city-budget.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(41),c=s.cities.find(c=>c.id==='xuchang');
const excess=c.units.splice(1);s.campaign.idle.push(...excess.map(unit=>({unit:{...unit,troops:0,wounded:0},faction:c.owner,location:c.id,destination:null,remainingDays:0})));c.units[0].troops=3000;c.units[0].wounded=500;c.manpower=6000;c.gold=200;c.grain=80;
syncResourceTotals(s);updateCityBudgetAlerts(s);const raw=serializeCampaign(s);validateCampaign(JSON.parse(raw));
const out='outputs/city-budget-ui';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4297',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('UI server exited: '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);},raw);
 await page.goto('http://127.0.0.1:4297/#strategy');await page.locator('.strategy-world').waitFor();
 assert.match(await page.locator('.sovereign-resources').innerText(),/各城金合计/);
 assert.match(await page.locator('.city-budget-alerts').innerText(),/许昌/);assert.equal(await page.locator('.city-budget-alerts').isVisible(),true);
 assert.equal(await page.locator('.strategy-world [data-city="xuchang"] .map-city-soldiers text').textContent(),'3,000 / 9,000');
 if(await page.locator('.modal-backdrop').isVisible()){assert.match(await page.locator('.modal-backdrop').innerText(),/钱粮预算不足/);await page.screenshot({path:out+'/report.png'});await page.locator('.modal-backdrop [data-action="close"]').last().click();}
 if(!await page.locator('.strategy-panel').isVisible())await page.locator('[data-action="map-panel-toggle"]').first().click();
 const budget=page.locator('.strategy-panel [data-city-budget="xuchang"]');await budget.waitFor();
 assert.match(await budget.innerText(),/预计收入/);assert.match(await budget.innerText(),/金不足/);assert.match(await budget.innerText(),/粮不足/);
 const stored=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));await page.screenshot({path:out+'/desktop.png'});await budget.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/desktop-budget.png'});
 await page.setViewportSize({width:390,height:844});await budget.scrollIntoViewIfNeeded();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:out+'/mobile.png'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),stored,'viewing and resizing never writes simulation');
 await page.setViewportSize({width:1440,height:1000});const setting=budget.locator('[data-city-budget-key="goldReserve"]');await setting.fill('900');await setting.press('Tab');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).cities.find(c=>c.id==='xuchang').budget.goldReserve===900);
 const changed=JSON.parse(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')));assert.equal(changed.cities.find(c=>c.id==='xuchang').gold,200);assert.equal(changed.cities.find(c=>c.id==='chenliu').budget.goldReserve,500);
 await page.reload();await page.locator('.strategy-world').waitFor();assert.equal(await page.locator('.strategy-world [data-city="xuchang"] .map-city-soldiers text').textContent(),'3,000 / 9,000');
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,errors,checks:['local stores and totals','city warnings','live / total soldier label','desktop','mobile overflow','read-only browsing','local budget changes and save']},null,2));
 console.log('PASS city budgets, shortages, soldier labels, desktop/mobile and save');
}catch(e){if(page){await page.screenshot({path:out+'/failure.png'});console.log((await page.locator('body').innerText()).slice(0,1800));}throw e;}finally{await browser?.close();server.kill();}
