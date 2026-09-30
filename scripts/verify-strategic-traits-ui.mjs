import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {makeOfficer} from '../engine.mjs';
import {fieldFromCity,peacefulCities} from '../tests/helpers/field-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4198',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 const s=peacefulCities(newCampaign(81)),c=s.cities.find(c=>c.id==='xuchang');for(const id of ['person-482','person-195','person-533']){s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);c.units.push({...makeOfficer(id,id==='person-482'?2000:0),homeCity:c.id});}const a=fieldFromCity(s,c.id,{ids:['person-482']});validateCampaign(JSON.parse(serializeCampaign(s)));
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('sango-sovereign-v2',JSON.stringify(s));sessionStorage.setItem('seeded','1');}},s);await page.goto('http://127.0.0.1:4198/#strategy');
 await page.locator(`[data-campaign-army="${a.id}"]`).click();await page.locator('[data-action="march-mode-open"]:visible').click();const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));
 const before=await saved();await page.locator('[data-action="march-mode-select"][data-mode="light"]').click();assert.deepEqual(await saved(),before);await page.locator('.modal [data-action="close"]').last().click();assert.deepEqual(await saved(),before);
 await page.locator('[data-action="march-mode-open"]:visible').click();await page.locator('[data-action="march-mode-select"][data-mode="light"]').click();await mkdir('outputs/strategic-traits-ui',{recursive:true});await page.screenshot({animations:'disabled',path:'outputs/strategic-traits-ui/desktop.png'});await page.locator('[data-action="march-mode-confirm"]').click();assert.equal((await saved()).armies.find(v=>v.id===a.id).marchMode,'light');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-action="march-mode-open"]:visible').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({animations:'disabled',path:'outputs/strategic-traits-ui/mobile.png'});await page.locator('.modal [data-action="close"]').last().click();await page.setViewportSize({width:1440,height:1000});
 await page.locator('svg [data-city="xuchang"]').click();await page.locator('[data-action="campaign-pick"][data-task="transfer"]:visible').last().click();await page.locator('[data-personnel-choice="person-195"]').check();await page.locator('[data-action="campaign-command-next"]').click();await page.locator('#command-destination').selectOption('chenliu');await page.locator('[data-transfer-cycles]').selectOption('2');await page.locator('[data-transfer-cargo="grain"]').fill('100');await page.locator('[data-transfer-cargo="grain"]').blur();const beforeTransfer=await saved();await page.locator('[data-action="campaign-command-next"]').click();assert.match(await page.locator('#overlay-root').innerText(),/2批/);assert.deepEqual(await saved(),beforeTransfer);await page.locator('[data-action="campaign-pick-confirm"]').click();assert.equal((await saved()).campaign.idle.find(o=>o.unit.id==='person-195').convoyCycle.remaining,2);
 assert.deepEqual(errors,[]);await writeFile('outputs/strategic-traits-ui/result.json',JSON.stringify({errors,cancelUnchanged:true,confirmed:true,mobile:true,cycleTransport:true},null,2));console.log('PASS march choice, cancel, confirmation, persisted state, mobile, real cycle transport confirmation');
}finally{await browser?.close();server.kill();}




