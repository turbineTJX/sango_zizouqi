import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';import {makeOfficer} from '../engine.mjs';import {peacefulCities} from '../tests/helpers/field-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=peacefulCities(newCampaign(71)),id='person-533',c=s.cities.find(c=>c.id==='xuchang');for(const t of s.cities)t.units=t.units.filter(u=>u.id!==id);for(const a of s.armies)a.units=a.units.filter(u=>u.id!==id);s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==id);s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);c.units.push({...makeOfficer(id,2000),homeCity:c.id});validateCampaign(JSON.parse(serializeCampaign(s)));
const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(raw=>localStorage.setItem('sango-sovereign-v2',raw),serializeCampaign(s));await page.goto('http://127.0.0.1:4175/#strategy');await page.locator('.strategy-clock').waitFor();await page.locator('svg [data-city="xuchang"]').click();
await page.locator('[data-action="city-domestic"]:visible').click();
await page.locator('#overlay-root [data-task="domestic"][data-direction="commerce"]').click();
assert.ok(await page.locator('[data-personnel-choice="'+id+'"]').count());
const row=page.locator('tr').filter({has:page.locator('[data-personnel-choice="'+id+'"]')});assert.equal(await row.locator('[data-id="marketYield"]').count(),1);assert.equal(await row.locator('[data-id="grainSale"]').count(),1);
const saved=()=>page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));const before=await saved();
await row.locator('[data-action="ability-reference"][data-id="marketYield"]').click();assert.match(await page.locator('#overlay-root').innerText(),/25%/);await page.keyboard.press('Escape');assert.equal(await saved(),before);
await mkdir('outputs/work-traits-ui',{recursive:true});await page.screenshot({path:'outputs/work-traits-ui/desktop.png'});
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:'outputs/work-traits-ui/mobile.png'});
assert.deepEqual(errors,[]);console.log('PASS live domestic picker shows command traits, effect detail and unchanged saved state; desktop/mobile.');
}finally{await browser.close();}


