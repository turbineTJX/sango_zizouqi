import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const action=x=>page.locator(`[data-action="${x}"]`);
await mkdir('outputs/single-unit-ui',{recursive:true});
try{
 await page.addInitScript(save=>localStorage.setItem('sango-sovereign-v2',save),serializeCampaign(newCampaign(33,'guandu-200')));
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:4173')+'/#strategy');
 await page.locator('.faction-navigation [data-kind="city"]').click();await page.locator('.city-directory-item[data-id="xuchang"]').click();await page.locator('[data-action="map-quick-manage"][data-id="xuchang"]').click();
 await page.locator('.city-command-hub [data-task="draft"]').click();
 assert.equal(await page.locator('[data-personnel-choice]').count(),0);
 await action('campaign-unit-new').first().click();await action('campaign-unit-choose').click();
 assert.equal(await page.locator('[data-personnel-choice][type=checkbox]').count(),0);
 const choice=page.locator('[data-personnel-choice]:not(:disabled)').first(),id=await choice.getAttribute('data-personnel-choice');await choice.click();
 assert.equal(await page.locator('[data-personnel-choice]').count(),0);assert.equal(await page.locator('[data-command-type]').count(),1);
 await page.locator('[data-command-type]').selectOption('spear');assert.equal(await page.locator('[data-command-troops]').getAttribute('type'),'number');await action('troop-max').click();assert.equal(await page.locator('[data-command-troops]').inputValue(),await page.locator('[data-command-troops]').getAttribute('max'));await action('troop-min').click();assert.equal(await page.locator('[data-command-troops]').inputValue(),'1000');await page.screenshot({path:'outputs/single-unit-ui/form.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/single-unit-ui/mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await action('campaign-command-next').click();assert.equal(await page.locator(`[data-muster-unit="${id}"]`).count(),1);await action('campaign-command-back').click();assert.ok(await action('campaign-unit-new').first().isEnabled());await action('campaign-unit-new').first().click();assert.equal(await page.locator('[data-command-type]').count(),0);await action('campaign-unit-choose').click();await page.locator(`[data-personnel-choice="${id}"]`).click();await action('campaign-command-next').click();
 await action('campaign-command-next').click();await action('campaign-pick-confirm').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));assert.equal(saved.cities.find(c=>c.id==='xuchang').units.find(u=>u.id===id).troops,1000);assert.deepEqual(errors,[]);
 console.log('Single-unit ordinary UI passed: separate radio picker, single form, mobile and real city-unit commit.');
}catch(e){await page.screenshot({path:'outputs/single-unit-ui/failure.png'});throw e;}finally{await browser.close();}
