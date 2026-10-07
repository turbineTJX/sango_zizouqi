import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {fieldFromCity} from '../tests/helpers/field-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(33,'guandu-200'),a=fieldFromCity(s,'xuchang');a.units.forEach(u=>u.troops=100);
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));const out='outputs/military-flow-ui';await mkdir(out,{recursive:true});
const action=id=>page.locator(`[data-action="${id}"]`),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));
try{
 await page.addInitScript(value=>{if(!sessionStorage.getItem('military-fixture')){localStorage.setItem('sango-sovereign-v2',value);sessionStorage.setItem('military-fixture','1');}},serializeCampaign(s));await page.goto('http://127.0.0.1:4173/#strategy');
 assert.equal(await action('campaign-project').count(),0);
 await page.locator('[data-action="campaign-tab"][data-tab="army"]').click();await action('army').click();await page.locator('[data-kind="adjust"]').click();
 const before=await saved();assert.equal(await page.locator('[data-military-role]').count(),0);await action('military-next').click();assert.ok(await page.locator('.compiled-units').count());await action('military-next').click();await page.locator(`[data-military-role="leader"][value="${a.units[1].id}"]`).check();await action('military-detail').first().click();await page.locator('.modal [data-action="close"]').first().click();assert.equal(await page.locator('[data-military-role="leader"]:checked').inputValue(),a.units[1].id);
 await action('military-next').click();await page.screenshot({path:out+'/review.png',fullPage:true});assert.deepEqual(await saved(),before);await action('military-cancel').click();assert.deepEqual(await saved(),before);
 await action('recruit').click();await page.locator(`[data-military-unit="${a.units[1].id}"]`).check();await action('military-next').click();await action('military-confirm').click();const replenished=await saved();assert.equal(replenished.armies.find(b=>b.id===a.id).units[0].troops,100);assert.ok(replenished.armies.find(b=>b.id===a.id).units[1].troops>100);validateCampaign(replenished);
 await action('army').click();await page.locator('[data-kind="split"]').click();await page.locator(`[data-military-unit="${a.units[0].id}"]`).check();await action('military-next').click();await action('military-next').click();await action('military-next').click();await action('military-next').click();await action('military-confirm').click();assert.equal((await saved()).armies.length,2);
 await action('army').click();await page.locator('[data-kind="merge"]').click();await page.locator('[data-military-target]').first().check();await action('military-next').click();await action('military-confirm').click();assert.equal((await saved()).armies.length,1);
 await page.setViewportSize({width:390,height:844});await action('army').click();await page.locator('[data-kind="adjust"]').click();await page.screenshot({path:out+'/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await action('military-cancel').click();
 const final=await saved();await page.reload();assert.deepEqual(await saved(),final);assert.deepEqual(errors,[]);console.log('Military UI passed: draft cancel/detail return, selected recruitment, split, merge, mobile and reload.');
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});throw e;}finally{await browser.close();}
