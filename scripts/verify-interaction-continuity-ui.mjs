import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {scoutCandidates} from '../scouting.mjs';
import {chooseCommandTarget} from './map-target-ui-helpers.mjs';

const port='4371',out='outputs/interaction-continuity-ui',checks=[],errors=[];
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));
 const state=newCampaign(203,'guandu-200');
 await page.addInitScript(raw=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!sessionStorage.getItem('continuity-seeded')){localStorage.setItem('sango-sovereign-v2',raw);sessionStorage.setItem('continuity-seeded','1');}},serializeCampaign(state));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
 if(await page.getByRole('heading',{name:'战略奏报',exact:true}).isVisible())await page.locator('.modal-header [data-action="close"]').click();
 const action=id=>page.locator(`[data-action="${id}"]`),saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const before=await saved();
 const open=async(city,group,task)=>{
  if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search summary').click();
  await page.locator('#national-city-search').selectOption(city);
  await page.locator(`[data-action="map-city-commands"][data-group="${group}"]`).click();await page.locator(`.city-command-grid [data-task="${task}"]`).click();
 };
 await open('luoyang','personnel','transfer');await page.locator('[data-personnel-choice="person-195"]').check();await action('campaign-command-next').click();await chooseCommandTarget(page,'chenliu');
 const grain=page.locator('[data-transfer-cargo="grain"]');
 await grain.fill('47.5');assert.ok(await action('campaign-command-next').isDisabled(),'fractional cargo must disable Next while typing, before blur');
 assert.match(await page.locator('#command-readiness').innerText(),/整数/);
 await grain.fill('47');assert.ok(await action('campaign-command-next').isEnabled());assert.ok(await grain.evaluate(el=>el===document.activeElement));
 assert.match(await page.locator('.command-sidebar-summary').innerText(),/粮 47/);
 // Use a single real pointer sequence; locator retries could hide a swallowed click.
 const next=await action('campaign-command-next').boundingBox();await page.mouse.click(next.x+next.width/2,next.y+next.height/2);
 await page.locator('.command-decree').waitFor({timeout:3000});
 await action('campaign-command-back').click();assert.equal(await grain.inputValue(),'47');await action('campaign-command-cancel').click();assert.equal(await saved(),before);
 checks.push('cargo live validation, stable focus and one-click continuation without blurring first');

 await open('xuchang','military','expedition');
 const choices=page.locator('[data-command-army-unit]:not(:disabled)'),ids=await choices.evaluateAll(els=>els.slice(0,2).map(el=>el.dataset.commandArmyUnit));
 for(const id of ids)await page.locator(`[data-command-army-unit="${id}"]`).check();
 await page.setViewportSize({width:844,height:390});
 await page.locator(`[data-action="campaign-selection-remove"][data-id="${ids[0]}"]`).click();
 assert.equal(await page.locator(`[data-command-army-unit="${ids[0]}"]`).isChecked(),false);assert.equal(await page.locator(`[data-command-army-unit="${ids[1]}"]`).isChecked(),true);
 assert.ok(await page.locator(`[data-action="campaign-selection-remove"][data-id="${ids[1]}"]`).evaluate(el=>el===document.activeElement));
 await page.keyboard.press('Enter');assert.equal(await action('campaign-selection-remove').count(),0);assert.ok(await action('campaign-command-next').isDisabled());
 assert.ok(await choices.first().evaluate(el=>el===document.activeElement));
 await page.screenshot({path:`${out}/selection-cleared.png`});
 await action('campaign-command-cancel').click();assert.equal(await saved(),before);
 checks.push('selected lineup removal, next-chip keyboard focus and no state writes');

 await page.setViewportSize({width:1440,height:900});await page.locator('.world-commands [data-action="scout-open"]').click();
 const city='town-8',target='town-5',via='town-57',officer=scoutCandidates(state,city)[0].unit.id;
 await page.locator('#scout-city').selectOption(city);await page.locator('#scout-officer').selectOption(officer);await page.locator('#scout-target').selectOption(target);
 const point=selector=>page.locator(selector).evaluate(el=>{const m=el.getScreenCTM();return {x:m.e,y:m.f};});
 const handle=await point('[data-route-handle="0.5"]'),drop=await point(`[data-command-city="${via}"]`);
 await page.mouse.move(handle.x,handle.y);await page.mouse.down();await page.mouse.move(drop.x,drop.y,{steps:10});await page.mouse.up();
 assert.equal(await page.locator('.route-handle.pinned').count(),1);
 const route=await page.locator('.route-draft-line').getAttribute('points');
 const dragAgain=await point('[data-route-handle="0.5"]');await page.mouse.move(dragAgain.x,dragAgain.y);await page.mouse.down();await page.mouse.move(drop.x,drop.y,{steps:4});
 await page.keyboard.press('Escape');await page.mouse.up();
 assert.equal(await page.locator('.scouting-screen').count(),1,'Escape cancels the active drag without closing the draft');
 assert.equal(await page.locator('.route-handle.dragging').count(),0);assert.equal(await page.locator('.route-draft-line').getAttribute('points'),route);
 await page.locator(`[data-command-city="${target}"]`).press('Enter');assert.equal(await page.locator('.route-draft-line').getAttribute('points'),route,'reselecting the same map target retains edited route');
 await page.locator('#scout-target').selectOption(target);assert.equal(await page.locator('.route-draft-line').getAttribute('points'),route,'reselecting the same dropdown target retains edited route');
 await page.screenshot({path:`${out}/scouting-preserved-route.png`});
 await action('route-reset').click();assert.equal(await page.locator('.route-handle.pinned').count(),0);assert.notEqual(await page.locator('.route-draft-line').getAttribute('points'),route);
 await page.keyboard.press('Escape');assert.equal(await saved(),before);
 checks.push('Escape cancels only the active drag; same target keeps custom route; explicit reset clears waypoints');
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({passed:true,checks,errors},null,2));console.log(checks.map(s=>'PASS '+s).join('\n'));
}catch(error){await page?.screenshot({path:`${out}/failure.png`});throw error;}finally{await browser?.close();server.kill();}
