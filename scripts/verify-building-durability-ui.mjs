import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {buildingDurability} from '../building-durability.mjs';
import {peacefulCities} from '../tests/helpers/field-campaign.mjs';
import {fundCities} from '../tests/resource-fixtures.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/building-durability/ui';mkdirSync(out,{recursive:true});
const state=peacefulCities(newCampaign(81)),c=state.cities.find(c=>c.id==='xuchang'),u=state.campaign.idle.find(o=>o.location===c.id).unit;fundCities(state,100000);
for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='build_workshop')c.domestic.cooldowns[key]=1000;
assert.equal(assignDomestic(state,c.id,'technology',u.id),null);beginExecution(state);for(let i=0;i<8;i++)advanceCampaignDay(state);
assert.deepEqual(buildingDurability(c,'workshop'),{hp:400,maxHp:1000});const save=serializeCampaign(state);validateCampaign(JSON.parse(save));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4239'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>localStorage.setItem('sango-sovereign-v2',save),save);await page.goto('http://127.0.0.1:4239/#strategy');
 if(await page.locator('.modal [data-action="close"]').count())await page.locator('.modal [data-action="close"]').first().click();
 await page.locator('.faction-navigation [data-kind="city"]').click();await page.locator('.city-directory-item[data-id="xuchang"]').click();await page.locator('[data-action="map-quick-manage"][data-id="xuchang"]').click();
 const facilities=page.locator('.domestic-facilities');await facilities.locator('summary').first().click();await facilities.scrollIntoViewIfNeeded();assert.match(await facilities.innerText(),/400\s*\/\s*1,000/);assert.match(await facilities.innerText(),/施工中/);await page.screenshot({path:out+'/desktop.png'});
 await page.setViewportSize({width:390,height:844});await facilities.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/mobile.png'});
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));validateCampaign(stored);assert.deepEqual(stored.cities.find(c=>c.id==='xuchang').buildings.workshop.xuchang,{hp:400,maxHp:1000});assert.deepEqual(errors,[]);
 writeFileSync(out+'/summary.json',JSON.stringify({hp:400,maxHp:1000,desktop:true,mobile:true,errors},null,2));console.log('PASS: saved building durability 400/1000, desktop/mobile layout and read-only inspection');
}catch(error){if(page)await page.screenshot({path:out+'/failure.png',fullPage:true});throw error;}finally{await browser?.close();server.kill();}
