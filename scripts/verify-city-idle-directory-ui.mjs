import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './automatic-domestic-campaign.mjs';
import {assignDomestic} from '../domestic.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {factionDirectoryRows} from '../faction-directory.mjs';
import {recordOfficerActivities} from '../officer-activity.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(203,'guandu-200'),own=s.cities.filter(c=>c.owner==='cao'),gray=own.find(c=>c.id!=='xuchang'&&cityStaffStatus(s,c).idle.length),target=own.find(c=>!['xuchang',gray.id].includes(c.id)&&cityStaffStatus(s,c).idle.length);
assert.ok(target);for(const o of cityStaffStatus(s,gray).idle)assert.equal(assignDomestic(s,gray.id,'commerce',o.unit.id),null);
const candidates=cityStaffStatus(s,target).idle;for(const o of candidates.slice(1))assert.equal(assignDomestic(s,target.id,'commerce',o.unit.id),null);
const candidate=candidates[0].unit;recordOfficerActivities(s);validateCampaign(JSON.parse(serializeCampaign(s)));
const out='outputs/city-idle-directory',port='4221';mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{if(!localStorage.getItem('idle-directory-seeded')){localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('idle-directory-seeded','1');}},serializeCampaign(s));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();const before=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 await page.locator('.faction-navigation [data-kind="city"]').click();const list=page.locator('.map-quick-directory');await list.waitFor({state:'visible'});assert.equal(await list.locator('[data-action="map-quick-select"]').count(),own.length);
 const grayRow=list.locator(`[data-action="map-quick-select"][data-id="${gray.id}"]`),targetRow=list.locator(`[data-action="map-quick-select"][data-id="${target.id}"]`);assert.ok((await grayRow.getAttribute('class')).includes('city-fully-assigned'));assert.equal(await targetRow.getAttribute('data-idle-count'),'1');
 assert.notEqual(await grayRow.evaluate(e=>getComputedStyle(e).backgroundColor),await targetRow.evaluate(e=>getComputedStyle(e).backgroundColor));await grayRow.click();assert.ok(await list.isVisible());assert.equal(await grayRow.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.national-world').getAttribute('data-focus-x'),String(gray.x));
 await targetRow.click();assert.ok(await list.isVisible());assert.equal(await page.locator('.national-world').getAttribute('data-focus-y'),String(target.y));assert.match(await list.locator('.map-quick-staff').innerText(),new RegExp(candidate.name));
 await targetRow.scrollIntoViewIfNeeded();const listScroll=await list.locator('.city-directory-list').evaluate(e=>e.scrollTop);assert.ok(listScroll>0);await targetRow.click();assert.equal(await list.locator('.city-directory-list').evaluate(e=>e.scrollTop),listScroll);
 await list.locator('[data-filter="idle"]').click();assert.equal(await list.locator('.city-fully-assigned').count(),0);await list.locator('[data-filter="all"]').click();
 await list.locator('#map-quick-query').fill(candidate.name);assert.equal(await list.locator('[data-action="map-quick-select"]').count(),1);await list.locator('#map-quick-query').fill('');assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),before);await list.locator('.city-fully-assigned').first().scrollIntoViewIfNeeded();await page.screenshot({path:out+'/desktop.png',animations:'disabled'});
 for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.ok(await list.isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await grayRow.focus();await page.keyboard.press('Enter');assert.ok(await list.isVisible());await targetRow.click();assert.ok(await list.isVisible());assert.ok(await list.getByRole('button',{name:'安排事务',exact:true}).isVisible());}
 await page.screenshot({path:out+'/mobile.png',animations:'disabled'});
 await list.getByRole('button',{name:'安排事务',exact:true}).click();await page.locator('.domestic-workbench').waitFor();assert.match(await page.locator('.city-staff-summary').innerText(),new RegExp(candidate.name));
 await page.locator('.domestic-workbench .domestic-direction[data-direction="agriculture"] [data-action="campaign-pick"]').click();await page.locator(`[data-personnel-choice="${candidate.id}"]`).check();
 // The current picker confirms a selected civil officer directly.
 const next=page.locator('[data-action="campaign-command-next"]');if(await next.count())await next.click();await page.locator('[data-action="campaign-pick-confirm"]').click();
 await page.locator('.domestic-workbench').waitFor();await page.locator('.modal-header [data-action="close"]').click();await list.waitFor({state:'visible'});assert.equal(await targetRow.getAttribute('data-idle-count'),'0');assert.ok((await targetRow.getAttribute('class')).includes('city-fully-assigned'));
 await list.locator('[data-filter="idle"]').click();assert.equal(await list.locator(`[data-action="map-quick-select"][data-id="${target.id}"]`).count(),0);await list.locator('[data-filter="all"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));validateCampaign(saved);assert.equal(saved.campaign.day,1);assert.equal(factionDirectoryRows(saved,'city').find(c=>c.id===target.id).idle,0);
 await page.reload();await page.locator('.national-world').waitFor();await page.locator('.faction-navigation [data-kind="city"]').click();assert.equal(await list.locator(`[data-action="map-quick-select"][data-id="${target.id}"]`).getAttribute('data-idle-count'),'0');
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({ownCities:own.length,grayCity:gray.id,assignedCity:target.id,officer:candidate.id,day:saved.campaign.day,errors,checks:['scope','two states','idle-first','idle filter','officer search','map location','keyboard','320/390 mobile','real appointment','immediate refresh','reload','read-only browse']},null,2));console.log('PASS own city scope, highlight/gray, idle-first, search/filter, map focus, keyboard, desktop/mobile, real appointment refresh, reload and read-only browsing');
}finally{await browser?.close();server.kill();}
