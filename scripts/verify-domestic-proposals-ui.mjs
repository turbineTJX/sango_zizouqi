import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {peacefulCities} from '../tests/helpers/field-campaign.mjs';
import {fundCities} from '../tests/resource-fixtures.mjs';
import {PAGE_GUIDE_STORAGE_KEY} from '../page-guides.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const port=4192,base='http://127.0.0.1:'+port,out='outputs/domestic-proposals-ui';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let serverError='';server.stderr.on('data',b=>serverError+=b);
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const saved=()=>page.evaluate(async ()=>JSON.parse(await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'))),action=k=>page.locator('[data-action="'+k+'"]');
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.equal(serverError,'');
 const make=()=>{const s=peacefulCities(newCampaign(7));fundCities(s,40000);const c=s.cities.find(c=>c.id==='xuchang'),officers=s.campaign.idle.filter(o=>o.location===c.id);for(const [key,def]of Object.entries(ACTIONS))if(['technology','commerce'].includes(def.direction)&&!['research','build_commerce'].includes(key))c.domestic.cooldowns[key]=10000;assignDomestic(s,c.id,'technology',officers[0].unit.id);assignDomestic(s,c.id,'commerce',officers[1].unit.id);return {s,c,officers};};
 const {s,c,officers}=make();c.budget.goldReserve=c.gold;
 await context.addInitScript(({raw,guideKey})=>{if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem(guideKey,JSON.stringify({version:1,enabled:false,seen:[]}));},{raw:serializeCampaign(s),guideKey:PAGE_GUIDE_STORAGE_KEY});
 await page.goto(base+'/#strategy');await page.locator('.sovereign-hud').waitFor();await action('campaign-begin').click();await page.locator('.domestic-alert-list,.domestic-proposal').first().waitFor();if(await page.locator('.domestic-alert-list').count())await action('close').last().click();await page.locator('.domestic-proposal').first().waitFor();console.log('Conflict cards loaded');
 assert.equal(await page.locator('.domestic-proposal').count(),2);assert.equal((await saved()).cities.find(c=>c.id==='xuchang').gold,40000);
 assert.ok(await action('domestic-proposal-approve').first().isDisabled());
 await page.screenshot({path:out+'/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.ok(await page.locator('.modal-body').evaluate(el=>el.scrollWidth<=el.clientWidth+2));
 await page.setViewportSize({width:1440,height:1000});const first=(await saved()).campaign.domestic.assignments.find(a=>a.proposal).proposal;
 await page.reload();await page.locator('.domestic-proposal').first().waitFor();assert.deepEqual((await saved()).campaign.domestic.assignments.find(a=>a.proposal).proposal,first);
 // Resolving a conflict changes the explicit reserve; opening the budget never pays.
 await page.locator('.domestic-proposal').first().locator('[data-action="campaign-info-detail"]').click();await page.locator('[data-city-budget-key="goldReserve"]').fill('0');await action('city-budget-save').click();
 console.log('Reserve saved');assert.equal((await saved()).cities.find(c=>c.id==='xuchang').gold,40000);await action('close').last().click();await page.locator('.domestic-proposal').first().waitFor();
 assert.ok(await action('domestic-proposal-approve').first().isEnabled());await action('domestic-proposal-approve').first().click();
 const paidState=await saved(),paid=paidState.campaign.domestic.assignments.find(a=>a.action).action;
 assert.equal(paidState.cities.find(c=>c.id==='xuchang').gold,40000-paid.cost);await page.screenshot({path:out+'/approved-desktop.png',fullPage:true});
 // The city list retains per-person work and separately offers governor delegation.
 await action('close').last().click();await action('faction-domestic').first().click();await page.locator('.domestic-work-overview').waitFor();
 let work=await page.locator('.domestic-work-overview').innerText();assert.ok(work.includes(officers[0].unit.name));assert.ok(work.includes(officers[1].unit.name));assert.match(work,/已付|待支用/);assert.match(work,/天/);
 await page.screenshot({path:out+'/personnel-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/personnel-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.ok(await page.locator('.modal-body').evaluate(el=>el.scrollWidth<=el.clientWidth+2));
 await page.setViewportSize({width:1440,height:1000});const remaining=paidState.campaign.domestic.assignments.find(a=>a.proposal).proposal;
 await page.locator('[data-action="domestic-governor-approval"][data-city="xuchang"]').click();
 let state=await saved();assert.equal(state.cities.find(c=>c.id==='xuchang').domestic.approvalGovernor,'cao');assert.equal(state.cities.find(c=>c.id==='xuchang').gold,40000-paid.cost-remaining.pick.cost);assert.equal(state.campaign.domestic.assignments.filter(a=>a.proposal).length,0);
 await page.screenshot({path:out+'/governor-desktop.png',fullPage:true});await page.reload();await page.locator('.sovereign-hud').waitFor();await action('faction-domestic').first().click();
 assert.equal(await page.locator('[data-action="domestic-governor-approval"][data-city="xuchang"]').getAttribute('aria-checked'),'true');
 const once=(await saved()).cities.find(c=>c.id==='xuchang').gold;await page.locator('[data-action="domestic-governor-approval"][data-city="xuchang"]').click();assert.equal((await saved()).cities.find(c=>c.id==='xuchang').gold,once);
 assert.ok((await page.locator('.domestic-work-overview').innerText()).includes(officers[0].unit.name));await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/decided-mobile.png',fullPage:true});
 // Decline the opening batch through both real UI controls without payment.
 const declined=make();declined.c.budget.goldReserve=declined.c.gold;
 await page.evaluate(async raw=>{await (await import('/save-storage.mjs')).writeSavedGame('sango-sovereign-v2',raw);},serializeCampaign(declined.s));
 await page.reload();await page.locator('.sovereign-hud').waitFor();await action('campaign-begin').click();await page.locator('.domestic-alert-list,.domestic-proposal').first().waitFor();if(await page.locator('.domestic-alert-list').count())await action('close').last().click();await page.locator('.domestic-proposal').first().waitFor();
 assert.equal(await page.locator('.domestic-proposal').count(),2);await action('domestic-proposal-reject').first().click();assert.equal(await page.locator('.domestic-proposal').count(),1);
 assert.equal((await saved()).cities.find(c=>c.id==='xuchang').gold,40000);await action('domestic-proposal-reject-page').click();
 const declinedSave=await saved();assert.equal(declinedSave.campaign.day,1);assert.equal(declinedSave.campaign.domestic.assignments.filter(a=>a.proposal||a.action).length,0);assert.equal(declinedSave.cities.find(c=>c.id==='xuchang').gold,40000);
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,conflicts:2,paid:paid.cost+remaining.pick.cost,governor:'cao',desktop:[1440,1000],mobile:[390,844],errors},null,2));
 console.log('Domestic governance UI passed: real conflict, reserve adjustment, exact payment, personnel fees/time, local delegation, reload and mobile layout.');
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});console.error(errors);throw e;}finally{await browser.close();server.kill();}
