import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign,advanceCampaignDay,beginExecution,activeBattles,chooseEncounter} from '../strategic-campaign.mjs';
import {retreatDestinations} from '../strategic-retreat.mjs';
import {fieldFromCity,approachDestination} from '../tests/helpers/field-campaign.mjs';
import {setDomesticAutoApprove} from '../domestic.mjs';
import {chooseMapTarget,locateMapTarget,chooseCommandTarget} from './map-target-ui-helpers.mjs';

const out='outputs/map-targets-ui',port='4317';mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser,page;const errors=[],checks=[];
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const load=async s=>{
  await page?.close();page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(save=>{localStorage.clear();localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(s));
  await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world,.arena-stage').first().waitFor();
 };
 const saved=()=>page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const s=newCampaign(81,'guandu-200');await load(s);
 // Geography selection and camera navigation never issue a command.
 await page.locator('[data-action="scout-open"]').first().click();const beforeScout=await saved();
 await page.locator('#scout-city').click();assert.equal(await page.locator('[data-action="map-target-confirm"]').isDisabled(),true);
 const pin=await locateMapTarget(page,'xuchang');assert.equal(await page.locator('[data-action="map-target-confirm"]').isDisabled(),true);
 await pin.locator('.city-size-mark').click();assert.equal(await saved(),beforeScout);
 await page.screenshot({path:out+'/scout-city-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.screenshot({path:out+'/scout-city-mobile.png',fullPage:true});await page.keyboard.press('Escape');assert.match(await page.locator('#scout-city').innerText(),/选择派出城市/);assert.equal(await saved(),beforeScout);
 await chooseMapTarget(page,'#scout-city','xuchang');assert.match(await page.locator('#scout-city').innerText(),/许昌/);assert.equal(await saved(),beforeScout);
 await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1000});checks.push('map click, locate-only search, cancel/Escape, confirm-only draft, desktop/mobile');
 // A real relay officer and his actual city exercise a transport draft.
 await page.locator('#national-city-search').selectOption('luoyang');
 await page.locator('.modal [data-action="campaign-pick"][data-task="transfer"]').click();
 await page.locator('[data-personnel-choice="person-195"]').check();await page.locator('[data-action="campaign-command-next"]').click();
 assert.equal(await page.locator('.map-command-screen').count(),1);assert.equal(await page.locator('#command-destination').count(),0);
 await chooseCommandTarget(page,'chenliu');
 for(const [key,value] of Object.entries({gold:23,grain:47,manpower:10})){const field=page.locator(`[data-transfer-cargo="${key}"]`);await field.fill(String(value));await field.blur();}
 const beforeTransport=await saved();await page.locator('[data-kind="relay"]').click();
 for(const id of ['luoyang','chenliu'])assert.equal(await page.locator(`[data-command-city="${id}"]`).getAttribute('data-map-target'),'unavailable');
 const relay=await locateMapTarget(page,'xuchang');await relay.locator('.city-size-mark').click();await page.keyboard.press('Escape');
 assert.match(await page.locator('[data-kind="relay"]').innerText(),/选择接力据点/);
 await chooseMapTarget(page,'[data-kind="relay"]','xuchang');assert.match(await page.locator('[data-kind="relay"]').innerText(),/许昌/);
 for(const [key,value] of Object.entries({gold:23,grain:47,manpower:10}))assert.equal(await page.locator(`[data-transfer-cargo="${key}"]`).inputValue(),String(value));
 assert.equal(await saved(),beforeTransport);await page.screenshot({path:out+'/transport-desktop.png',fullPage:true});
 await page.locator('[data-action="campaign-command-next"]').click();assert.match(await page.locator('.modal-body').innerText(),/接力：许昌/);assert.equal(await saved(),beforeTransport);
 await page.locator('[data-action="campaign-command-cancel"]').click();checks.push('transfer uses full map; relay excludes endpoints; cargo and selections survive round trip; review/cancel spends nothing');
 // Diplomacy keeps goal, budget and officer fields until the original confirm.
 await page.locator('[data-action="faction-diplomacy"]').first().click();await page.locator('#diplomacy-goal').selectOption('buyGrain');await page.locator('.diplomacy-panel>details').first().locator('summary').click();await page.locator('#diplomacy-feeBudget').fill('321');
 const beforeDiplomacy=await saved(),foreign=s.cities.find(c=>c.owner==='sunce');
 await chooseMapTarget(page,'[data-kind="diplomacy"]',foreign.id);
 assert.equal(await page.locator('#diplomacy-goal').inputValue(),'buyGrain');assert.equal(await page.locator('#diplomacy-feeBudget').inputValue(),'321');assert.equal(await page.locator('#diplomacy-target').inputValue(),'sunce');assert.equal(await saved(),beforeDiplomacy);
 await page.locator('[data-kind="diplomacy"]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#diplomacy-target').inputValue(),'sunce');assert.equal(await saved(),beforeDiplomacy);checks.push('diplomacy faction selected via its city; complete form survives confirmation and cancellation');
 // Use a real national road encounter and its initial deployment council.
 const war=newCampaign(117,'guandu-200');setDomesticAutoApprove(war,true);
 const edge=war.roads.find(r=>r.includes('xuchang')),near=edge.find(id=>id!=='xuchang');
 const own=fieldFromCity(war,'xuchang',{target:near}),enemyCity=war.cities.find(c=>!['cao','neutral'].includes(c.owner)&&c.units.length),enemy=fieldFromCity(war,enemyCity.id);
 enemy.location=near;enemy.route=['xuchang'];enemy.target='xuchang';approachDestination(war,own,.1);beginExecution(war);
 for(let i=0;i<30&&!activeBattles(war).some(r=>r.armyIds.includes(own.id));i++)advanceCampaignDay(war);
 const r=activeBattles(war).find(r=>r.armyIds.includes(own.id));assert.ok(r);chooseEncounter(war,r.id,true);await load(war);
 if(await page.getByRole('heading',{name:'战略奏报',exact:true}).count())await page.locator('.modal-header [data-action="close"]').click();
 await page.locator('.retreat-council summary').click();await page.locator('[data-retreat-batch]').fill('123');const beforeRetreat=await saved();
 const destinations=retreatDestinations(war,r.battle),next=destinations.find(n=>n.id!==r.battle.sides[0].retreatDestination);assert.ok(next);
 await page.locator('[data-kind="retreat"]').click();
 assert.deepEqual((await page.locator('[data-map-target="eligible"],[data-map-target="selected"]').evaluateAll(ns=>ns.map(n=>n.dataset.commandCity))).sort(),destinations.map(n=>n.id).sort());
 const destinationPin=await locateMapTarget(page,next.id);await destinationPin.locator('.city-size-mark,.atlas-gate-outline,.junction-banner').first().focus();await page.keyboard.press('Enter');assert.equal(await saved(),beforeRetreat);
 await page.keyboard.press('Escape');assert.equal(await page.locator('[data-retreat-batch]').inputValue(),'123');assert.equal(await saved(),beforeRetreat);
 await page.setViewportSize({width:390,height:844});await page.locator('[data-kind="retreat"]').click();await locateMapTarget(page,next.id);
 await page.locator(`[data-command-city="${next.id}"]`).focus();await page.keyboard.press('Enter');await page.screenshot({path:out+'/retreat-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.locator('[data-action="map-target-confirm"]').click();assert.equal(await page.locator('[data-retreat-batch]').inputValue(),'123');assert.match(await page.locator('[data-kind="retreat"]').innerText(),new RegExp(next.name));
 const expected=JSON.parse(beforeRetreat);expected.campaign.battles.find(x=>x.id===r.id).battle.sides[0].retreatDestination=next.id;
 assert.deepEqual(JSON.parse(await saved()),expected);checks.push('retreat legal nodes, keyboard selection, cancel, original council/batch preserved, only confirmed destination changes');
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS '+checks.join('\nPASS '));
}catch(error){await page?.screenshot({path:out+'/failure.png',fullPage:true});throw error;}finally{await browser?.close();server.kill();}
