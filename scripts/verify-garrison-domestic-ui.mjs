import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],s=newCampaign(521200);
const town='xuchang',armed=s.armies.find(a=>a.faction==='cao'&&a.location===town).units[1].id,idle=s.campaign.idle.find(o=>o.location===town).unit.id;
await page.addInitScript(raw=>{if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);},serializeCampaign(s));
page.on('pageerror',e=>errors.push(e.message));
const out='outputs/garrison-domestic-ui';await mkdir(out,{recursive:true});
const action=x=>page.locator(`[data-action="${x}"]`),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));
async function pick(task,id,direction=''){
 if(task==='domestic')await page.locator('[data-city-disclosure="xuchang:affairs"]').evaluate(el=>el.open=true);if(task==='governor')await page.locator('[data-city-disclosure="xuchang:offices"]').evaluate(el=>el.open=true);
 await page.locator(`[data-action="campaign-pick"][data-task="${task}"]${direction?`[data-direction="${direction}"]`:''}`).click();
 const input=page.locator(`[data-personnel-choice="${id}"]`);assert.equal(await input.isEnabled(),true);await input.check();if(task==='draft')await action('campaign-command-next').click();await action('campaign-command-next').click();await action('campaign-pick-confirm').click();
}
try{
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:4173')+'/#strategy');await page.locator('.city-directory').waitFor();
 await pick('domestic',armed,'commerce');await pick('governor',armed);
 let state=await saved();assert.equal(state.cities.find(c=>c.id===town).governor,armed);assert.ok(state.armies.some(a=>a.units.some(u=>u.id===armed)));assert.ok(state.campaign.domestic.assignments.some(a=>a.officerId===armed));
 await action('campaign-personnel').first().click();
 const row=page.locator(`[data-action="campaign-person-detail"][data-officer="${armed}"]`).locator('..').locator('..');assert.match(await row.innerText(),/驻军/);assert.match(await row.innerText(),/太守/);assert.match(await row.innerText(),/商业负责人/);
 await page.locator('[data-personnel-filter="status"]').selectOption({label:'内政'});assert.equal(await page.locator(`.modal [data-officer="${armed}"]`).count(),1);
 await page.screenshot({path:out+'/combined-duties.png',animations:'disabled'});await action('close').first().click();
 await pick('governor',idle);await pick('domestic',idle,'agriculture');
 await page.locator('[data-action="campaign-tab"][data-tab="officers"]').click();await pick('draft',idle);
 state=await saved();assert.ok(state.armies.some(a=>a.units.some(u=>u.id===idle)));assert.equal(state.cities.find(c=>c.id===town).governor,idle);assert.ok(state.campaign.domestic.assignments.some(a=>a.officerId===idle&&a.direction==='agriculture'));
 await page.reload();await page.locator('.city-directory').waitFor();state=await saved();assert.equal(state.cities.find(c=>c.id===town).governor,idle);
 await page.locator('[data-action="campaign-tab"][data-tab="city"]').click();await page.locator('[data-city-disclosure="xuchang:affairs"]>summary').click();await page.locator('[data-action="campaign-pick"][data-task="domestic"][data-direction="technology"]').click();
 assert.equal(await page.locator(`[data-personnel-choice="${idle}"]`).isEnabled(),true);await page.screenshot({path:out+'/prepared-governor-selectable.png',animations:'disabled'});await action('close').first().click();
 await page.locator('[data-action="campaign-tab"][data-tab="army"]').click();await action('campaign-order').click();await page.locator('#command-destination').selectOption('chenliu');await action('campaign-command-next').click();await action('campaign-pick-confirm').click();
 state=await saved();assert.equal(state.cities.find(c=>c.id===town).governor,null);assert.equal(state.campaign.domestic.assignments.some(a=>[armed,idle].includes(a.officerId)),false);
 await page.reload();await page.locator('.city-directory').waitFor();assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,preparedOfficer:armed,preparedGovernor:idle,errors},null,2));console.log('Garrison UI passed: concurrent duties, filtering, prepare governor, reload, eligibility, march cleanup.');
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error(errors);throw e;}finally{await browser.close();}
