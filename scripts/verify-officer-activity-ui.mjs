import {setBuildingLevel} from '../tests/building-fixtures.mjs';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './automatic-domestic-campaign.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {cityStaffStatus,acknowledgeDomesticAlerts,pendingDomesticAlerts} from '../domestic-feedback.mjs';
import {officerActivities,recordOfficerActivities} from '../officer-activity.mjs';
import {peacefulCities} from '../tests/helpers/field-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=peacefulCities(newCampaign(81,'guandu-200')),c=s.cities.find(c=>c.id==='xuchang');s.cities.forEach(c=>c.gold=40000);s.gold=s.cities.filter(c=>c.owner===s.campaign.playerFaction).reduce((n,c)=>n+c.gold,0);
for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='fair')c.domestic.cooldowns[key]=1000;

for(const o of cityStaffStatus(s,c).idle.slice(0,1))assert.equal(assignDomestic(s,c.id,'commerce',o.unit.id),null);
beginExecution(s);advanceCampaignDay(s);recordOfficerActivities(s);
acknowledgeDomesticAlerts(s,pendingDomesticAlerts(s).map(e=>e.id));
const workers=[...officerActivities(s).values()].filter(o=>o.siteId===c.id&&o.buildingKey==='commerce');assert.equal(workers.length,1);
const save=serializeCampaign(s),port='4218',out='outputs/officer-activity-ui';mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'on'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{localStorage.setItem('sango-sovereign-v2',sessionStorage.getItem('officer-activity-fixture')||save);},save);
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();await page.locator('[data-map-view="city"]').click();
 const city=page.locator('.national-world [data-city="xuchang"]');assert.equal(await city.locator('[data-city-officer]').count(),1);assert.equal(await city.locator('.town-officer-overflow').count(),0);
 const portrait=city.locator('[data-city-officer]').first();
 const before=await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 await page.screenshot({path:out+'/building-portraits.png'});
 await portrait.click();await page.locator('[data-info-section="activity"]').waitFor();assert.equal(await page.locator('[data-activity-day]').count(),1);assert.match(await page.locator('.officer-activity-ledger').innerText(),/市场|建设市场/);
 assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before);await page.screenshot({path:out+'/daily-record.png'});
 await page.locator('.modal-header [data-action="close"]').click();
 await city.locator('[data-city-building="commerce"] .city-district-hit').click();assert.equal(await page.locator('.city-building-staff button').count(),workers.length);await page.screenshot({path:out+'/building-staff.png'});
 await page.locator('[data-city-card-close]').click();await page.setViewportSize({width:390,height:844});await page.locator('[data-map-view="city"]').click();
 await city.locator('[data-city-officer]').first().focus();await page.keyboard.press('Enter');await page.locator('[data-info-section="activity"]').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.locator('[data-info-section="activity"]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mobile-record.png'});
 assert.equal(await page.locator('[data-action="campaign-activity-page"]').count(),0);
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({passed:true,workers:workers.map(o=>o.name),checks:['real worker portraits','current state without civil history','actual staff list','portrait click opens current status','keyboard and mobile','read-only inspection','current state without history'],errors},null,2));console.log('PASS real building portraits, current status, read-only details, overflow, current state without history and mobile');
}catch(e){if(browser){const page=browser.contexts()[0]?.pages()[0];if(page){await page.screenshot({path:out+'/failure.png'});console.log((await page.locator('body').innerText()).slice(0,1200));}}throw e;}finally{await browser?.close();server.kill();}
