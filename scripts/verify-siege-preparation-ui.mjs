import {fieldFromCity} from '../tests/helpers/field-campaign.mjs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
const s=newCampaign(5);fieldFromCity(s,'guandu',{target:'xuchang'});let r;
for(let n=0;n<30&&!r;n++){
 if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);
 r=activeBattles(s).find(r=>r.awaiting&&r.kind==='siege'&&s.cities.find(c=>c.id===r.cityId).owner==='cao'&&s.campaign.idle.some(o=>o.location===r.cityId&&o.faction==='cao'));
 if(!r)for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);
}
assert.ok(r);const id=s.campaign.idle.find(o=>o.location===r.cityId&&o.faction==='cao').unit.id;
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));const out='outputs/siege-preparation-ui';await mkdir(out,{recursive:true});
try{
 await page.addInitScript(value=>localStorage.setItem('sango-sovereign-v2',value),serializeCampaign(s));await page.goto('http://127.0.0.1:4173/#strategy');
 const open=()=>page.locator(`[data-action="campaign-defense-prepare"][data-battle="${r.id}"]`).first().click();
 await open();await page.locator(`[data-personnel-choice="${id}"]`).check();await page.locator('[data-action="campaign-command-next"]').click();await page.locator('#command-reinforce').check();
 await page.screenshot({path:out+'/formation.png',fullPage:true});await page.locator('[data-action="campaign-command-cancel"]').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),serializeCampaign(s));
 await open();await page.locator(`[data-personnel-choice="${id}"]`).check();await page.locator('[data-action="campaign-command-next"]').click();await page.locator('#command-reinforce').check();await page.locator('[data-action="campaign-command-next"]').click();await page.locator('[data-action="campaign-pick-confirm"]').click();
 const saved=validateCampaign(await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2'))));assert.ok(saved.armies.some(a=>a.defense&&a.units.some(u=>u.id===id)));assert.ok(saved.campaign.battles.find(b=>b.id===r.id).awaiting);assert.deepEqual(errors,[]);
 await page.locator('[data-action="campaign-prepare"][data-battle="'+r.id+'"]').first().click();
 await page.locator('.modal details summary').first().click();await page.locator('[data-action="military-detail"]').first().click();assert.ok((await page.locator('#modal-title').innerText()).includes('部队'));await page.locator('.modal [data-action="close"]').first().click();
 await page.locator('[data-action="encounter-next"]').click();await page.screenshot({path:out+'/council.png',fullPage:true});await page.locator('[data-action="encounter-next"]').click();await page.locator('[name="encounter-control"][value="auto"]').check();await page.locator('[data-action="encounter-confirm"]').click();
 const after=validateCampaign(await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2'))));assert.equal(after.campaign.battles.find(b=>b.id===r.id).awaiting,false);assert.equal(after.campaign.battles.find(b=>b.id===r.id).control,'auto');assert.deepEqual(errors,[]);
 await page.reload();await page.locator('[data-action="campaign-prepare"][data-battle="'+r.id+'"]').first().click();await page.locator('[data-action="encounter-next"]').click();await page.locator('[data-action="encounter-next"]').click();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('[data-action="encounter-confirm"]').click();
 const manual=validateCampaign(await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2'))));assert.equal(manual.battle.deploymentLocked,false);assert.equal(manual.battle.tick,0);await page.locator('[data-action="loadout"]').first().click();assert.equal(await page.locator('[data-action="tactic-up"]').count(),0);assert.deepEqual(errors,[]);
 console.log('Siege preparation UI passed: idle selection, reinforcement, cancel, commit, valid pending battle save.');
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});throw e;}finally{await browser.close();}
