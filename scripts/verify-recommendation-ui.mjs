import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {rankOfficerCandidates} from '../officer-recommendation.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
const s=newCampaign(42,'heroes-251'),p={task:'domestic',city:'xuchang',direction:'agriculture'},ranking=rankOfficerCandidates(s,cityPersonnel(s,p.city).map(o=>o.unit),p);
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));const out='outputs/recommendation-ui';await mkdir(out,{recursive:true});
try{
 await page.addInitScript(value=>localStorage.setItem('sango-sovereign-v2',value),serializeCampaign(s));await page.goto('http://127.0.0.1:4173/#strategy');
 await page.locator('.city-command-hub [data-task="domestic"]').click();await page.locator('[data-direction="agriculture"][data-action="campaign-command-direction"]').click();
 assert.equal(await page.locator('[data-sort-key="recommended"]').getAttribute('data-sort-current'),'desc');assert.equal(await page.locator('[data-personnel-choice]').first().getAttribute('data-personnel-choice'),ranking[0].unit.id);assert.ok((await page.locator('.task-personnel th').allTextContents()).some(x=>x.includes('农政')));
 assert.ok((await page.locator('.task-personnel th').allTextContents()).some(x=>x.includes('政治')));assert.equal(await page.locator('.task-candidate-detail').count(),0);assert.equal(await page.locator('.personnel-recommendation').count(),0);await page.locator('[data-personnel-choice]').first().check();await page.locator('th [popovertarget]').first().click();assert.equal(await page.locator('.task-trait-popover:popover-open').count(),1);assert.ok(await page.locator('.task-trait-popover:popover-open p').textContent());await page.locator('.task-trait-popover:popover-open button').click();assert.equal(await page.locator('[data-personnel-choice]').first().isChecked(),true);await page.locator('.task-trait-cell [popovertarget]').first().click();assert.equal(await page.locator('.task-trait-popover:popover-open').count(),1);await page.keyboard.press('Escape');await page.screenshot({path:out+'/agriculture-desktop.png',fullPage:true});
 await page.locator('.modal [data-action="campaign-person-detail"]').first().click();await page.locator('[data-action="campaign-person-back"]').click();assert.equal(await page.locator('[data-personnel-choice]').first().isChecked(),true);
 await page.locator('[data-sort-key="politics"]').click();await page.locator('[data-sort-key="recommended"]').click();await page.locator('[data-sort-key="recommended"]').click();assert.equal(await page.locator('[data-personnel-choice]').first().getAttribute('data-personnel-choice'),ranking[0].unit.id);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/agriculture-mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),serializeCampaign(s));assert.deepEqual(errors,[]);console.log('Recommendation UI passed: actual shared ranking, agriculture traits, detail return, sorting override, mobile and read-only save.');
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});throw e;}finally{await browser.close();}
