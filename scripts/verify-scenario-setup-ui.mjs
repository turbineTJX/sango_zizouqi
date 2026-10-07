import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createScenario} from '../scenarios.mjs';
import {validateSave} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const action=name=>page.locator(`.modal [data-action="${name}"]`),next=()=>action('scenario-setup-next').click();
const out='outputs/shared-scenario-setup';await mkdir(out,{recursive:true});
try{
 await page.goto('http://127.0.0.1:4173/');
 await page.locator('[data-action="campaign-lobby"]').click();await page.locator('[data-action="custom-setup"]').click();
 const original=await page.evaluate(()=>localStorage.getItem('sango-custom-draft-v46'));
 await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();
 assert.equal(await page.locator('[data-scenario-choice]').count(),0);await action('scenario-unit-choose').click();assert.equal(await page.locator('[data-scenario-choice][type=checkbox]').count(),0);await page.locator('[data-scenario-query]').fill('荀彧');await page.locator('[data-scenario-choice="person-255"]').click();
 await action('scenario-setup-detail').first().click();
 assert.ok(await page.locator('.officer-four').count());await action('unit-stats').click();assert.ok(await page.locator('.attribute-grid').count());await action('close').last().click();
 assert.equal(await page.locator('[data-scenario-type]').count(),1);
 await page.locator('[data-scenario-type="person-255"]').selectOption('halberd');
 await page.locator('[data-scenario-level="person-255"]').fill('8');await page.locator('[data-scenario-level="person-255"]').press('Tab');
 await action('scenario-setup-cancel').click();assert.equal(await page.evaluate(()=>localStorage.getItem('sango-custom-draft-v46')),original);
 await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();
 assert.equal(await page.locator('[data-scenario-choice]').count(),0);await action('scenario-unit-choose').click();assert.equal(await page.locator('[data-scenario-choice][type=checkbox]').count(),0);await page.locator('[data-scenario-query]').fill('荀彧');await page.locator('[data-scenario-choice="person-255"]').click();
 await page.locator('[data-scenario-type="person-255"]').selectOption('halberd');
 await page.locator('[data-scenario-level="person-255"]').fill('8');await page.locator('[data-scenario-level="person-255"]').press('Tab');
 await page.locator('[data-scenario-troops="person-255"]').evaluate(el=>{el.value='4000';el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.screenshot({path:out+'/single-unit-form.png'});await action('scenario-unit-save').click();assert.ok(await page.locator('.compiled-units').count());assert.equal(await page.locator('[data-scenario-role]').count(),0);await page.screenshot({path:out+'/unit-panel.png'});await action('scenario-setup-back').click();assert.ok(await action('scenario-unit-new').isEnabled());await action('scenario-unit-new').click();assert.equal(await page.locator('[data-scenario-type]').count(),0);assert.ok(await action('scenario-unit-save').isDisabled());await action('scenario-unit-choose').click();await page.locator('[data-scenario-query]').fill('荀彧');await page.locator('[data-scenario-choice="person-255"]').click();await action('scenario-unit-save').click();await next();assert.ok(await page.locator('[data-scenario-army-unit]').count());assert.equal(await page.locator('[data-scenario-choice]').count(),0);await next();await action('scenario-setup-back').click();assert.ok(await action('scenario-unit-new').isEnabled());await next();
 assert.equal(await page.locator('[data-scenario-role="deputy"]').count(),0);assert.equal(await page.locator('[data-action="combat-page"][data-page="relations"]').count(),0);
 await page.locator('[data-action="combat-page"][data-group="data-scenario-role"][data-page="advisor"]').click();
 await page.locator('[data-scenario-role="advisor"][value="person-255"]').check();
 await next();assert.match(await page.locator('.army-details-preview').innerText(),/大地图移动力/);assert.match(await page.locator('.army-details-preview').innerText(),/军团军略/);await page.screenshot({path:out+'/review-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/review-mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.setViewportSize({width:1440,height:1000});
 await action('scenario-setup-confirm').click();
 const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-custom-draft-v46')));
 assert.equal(draft.ownTeam[1].level,8);assert.equal(draft.ownTeamRoles.advisor,'person-255');assert.equal(draft.ownTeamRoles.deputy,null);
 await page.locator('[data-action="launch-custom"]').click();await action('scenario-launch-confirm').click();
 // The engine's normal save validation and deterministic replay cover the committed draft.
 validateSave(createScenario('custom-battle',draft.seed,20,null,draft));
 await page.locator('[data-action="army"]').first().click();
 await action('scenario-setup-detail').first().click();await action('unit-stats').click();await page.locator('.modal .tactic-chip').first().click();await action('inspection-back').click();await action('close').last().click();
 await page.locator('[data-scenario-type="cao"]').selectOption('cavalry');await action('scenario-unit-save').click();await next();await next();await next();await action('scenario-setup-confirm').click();
 await page.locator('[data-action="pause"]').first().click();
 // Once started, army inspection uses shared comparison pages without editable setup controls.
 await page.locator('[data-action="battle-panel"][data-panel="tools"]').click();await page.locator('#battle-tools [data-action="army"]').click();assert.equal(await page.locator('[data-scenario-type]').count(),0);assert.ok(await page.locator('.combat-preview').count());
 assert.deepEqual(errors,[]);console.log('Shared scenario UI passed: ordinary picker/details/formation/appointments/review, cancellation, retained draft, battle setup, locked battle and mobile.');
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});throw e;}finally{await browser.close();}
