import {completeTechnologyBuilding} from '../building-durability.mjs';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {ACTIONS,assignDomestic} from '../domestic.mjs';
import {fundCities} from '../tests/resource-fixtures.mjs';
import {peacefulCities} from '../tests/helpers/field-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/technology-tree/ui';mkdirSync(out,{recursive:true});
const state=peacefulCities(newCampaign(1)),city=state.cities.find(c=>c.id==='xuchang'),officer=state.campaign.idle.find(o=>o.location===city.id);fundCities(state,100000);city.domestic.techs=['watchtower'];completeTechnologyBuilding(city,'watchtower');
for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='research')city.domestic.cooldowns[key]=1000;
assert.equal(assignDomestic(state,city.id,'technology',officer.unit.id),null);beginExecution(state);for(let i=0;i<3;i++)advanceCampaignDay(state);const save=serializeCampaign(state),progress=city.domestic.research.progress;validateCampaign(JSON.parse(save));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4238'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>localStorage.setItem('sango-sovereign-v2',save),save);await page.goto('http://127.0.0.1:4238/#strategy');
 if(await page.locator('.modal [data-action="close"]').count())await page.locator('.modal [data-action="close"]').first().click();
 await page.locator('.faction-navigation [data-kind="city"]').click();await page.locator('.city-directory-item[data-id="xuchang"]').click();await page.locator('[data-action="map-quick-manage"][data-id="xuchang"]').click();
 const tree=page.locator('[data-city-technology="xuchang"]');await tree.waitFor();assert.match(await tree.innerText(),/本城开放10项/);assert.equal(await tree.locator('[data-technology-state="researching"]').count(),1);assert.equal(await tree.locator('progress').getAttribute('value'),String(progress));assert.match(await tree.locator('.technology-progress').innerText(),/已研究3个工作日/);
 assert.equal(await tree.locator('[data-technology="watchtower"]').getAttribute('data-technology-state'),'complete');assert.match(await tree.locator('.technology-tower').innerText(),/32/);
 await tree.locator('.technology-progress').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/desktop.png'});
 await tree.locator('.technology-other>summary').focus();assert.equal(await page.evaluate(()=>document.activeElement?.tagName),'SUMMARY');await page.keyboard.press('Enter');assert.equal(await tree.locator('[data-technology="longbow"]').getAttribute('data-technology-state'),'foreign');await tree.locator('[data-technology="longbow"] summary').click();assert.match(await tree.locator('[data-technology="longbow"]').innerText(),/没有长弓兵资质/);
 await page.setViewportSize({width:390,height:844});await tree.locator('.technology-progress').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await tree.evaluate(el=>el.scrollWidth>el.clientWidth),false);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));validateCampaign(stored);assert.equal(stored.cities.find(c=>c.id==='xuchang').domestic.research.progress,progress);assert.deepEqual(errors,[]);
 writeFileSync(out+'/summary.json',JSON.stringify({progress,workedDays:3,localNodes:10,allNodes:20,visionRadius:32,errors},null,2));console.log('PASS city technology tree: real saved progress, conditions, persistent watchtower, keyboard and desktop/mobile layout');
}catch(error){if(page){await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('body').innerText()).slice(-5000));}throw error;}finally{await browser?.close();server.kill();}
