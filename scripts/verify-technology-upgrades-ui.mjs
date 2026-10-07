import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4237'},stdio:'pipe',windowsHide:true});
const out='outputs/technology-upgrades/ui';mkdirSync(out,{recursive:true});let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));const action=id=>page.locator('[data-action="'+id+'"]'),settle=()=>page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));
 const draft=defaultCustomBattle();await page.addInitScript(d=>{if(!sessionStorage.getItem('upgrade-fixture')){localStorage.setItem('sango-custom-draft-v46',JSON.stringify(d));sessionStorage.setItem('upgrade-fixture','1');}},draft);
 await page.goto('http://127.0.0.1:4237/');await action('campaign-lobby').click();await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();
 const type=page.locator('[data-scenario-type="cao"]');assert.equal(await type.locator('option').count(),12);assert.equal(await type.locator('option[value="ship"]').count(),0);
 await type.selectOption('whiteHorse');await settle();await page.locator('[data-scenario-ship="cao"]').focus();await page.locator('[data-scenario-ship="cao"]').selectOption('louShip');await settle();await page.locator('[data-scenario-siege="cao"]').focus();await page.locator('[data-scenario-siege="cao"]').selectOption('tower');await settle();
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.scenarioSiege),'cao');await page.screenshot({path:out+'/battle-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/battle-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewportSize({width:1440,height:1000});
 for(let i=0;i<3;i++)await action('scenario-setup-next').click();await action('scenario-setup-confirm').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-custom-draft-v46')));validateCustomBattle(saved);assert.equal(saved.ownTeam[0].type,'whiteHorse');assert.deepEqual(saved.ownTeam[0].equipment,{ship:'louShip',siege:'tower'});
 const campaign=newCampaign(33,'heroes-251','force-2'),city=campaign.cities.find(c=>c.id==='atlas-fuling'),unit=city.units[0];city.gold=100000;city.domestic.techs.push('militaryRegistry','crossbow','efficientConstruction','siegeEngineering','shipbuilding');syncResourceTotals(campaign);
 validateCampaign(JSON.parse(serializeCampaign(campaign)));
 await page.addInitScript(save=>{if(location.search.includes('equipment-city=1'))localStorage.setItem('sango-sovereign-v2',save);},serializeCampaign(campaign));
 await page.evaluate(save=>localStorage.setItem('sango-sovereign-v2',save),serializeCampaign(campaign));await page.goto('http://127.0.0.1:4237/?equipment-city=1#strategy');
 if(await page.locator('.modal [data-action="close"]').count())await page.locator('.modal [data-action="close"]').first().click();

 await page.locator('.faction-navigation [data-kind="city"]').click();await page.locator('.city-directory-item[data-id="atlas-fuling"]').click();await page.locator('[data-action="map-quick-manage"][data-id="atlas-fuling"]').click();await page.locator('.city-command-hub [data-task="draft"]').click();
 await page.locator('[data-command-type="'+unit.id+'"]').selectOption('crossbow');await settle();await page.locator('[data-command-ship="'+unit.id+'"]').selectOption('louShip');await settle();await page.locator('[data-command-siege="'+unit.id+'"]').selectOption('tower');await settle();await page.screenshot({path:out+'/city-desktop.png'});
 await action('campaign-command-next').click();await action('campaign-pick-confirm').click();
 const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));validateCampaign(current);const actualCity=current.cities.find(c=>c.id==='atlas-fuling'),actual=actualCity.units.find(u=>u.id===unit.id);assert.equal(actual.type,'crossbow');assert.deepEqual(actual.equipment,{ship:'louShip',siege:'tower'});assert.ok(actualCity.gold<city.gold);assert.equal(campaign.cities.find(c=>c.id==='atlas-fuling').units[0].type,unit.type);
 assert.deepEqual(errors,[]);writeFileSync(out+'/summary.json',JSON.stringify({custom:saved.ownTeam[0],cityUnit:actual,spent:city.gold-actualCity.gold},null,2));console.log('PASS synchronized troop and equipment UI, isolated drafts, paid city submission, keyboard focus and desktop/mobile layout');
}catch(e){if(page){await page.screenshot({path:out+'/failure.png',fullPage:true});console.log(await page.locator('.modal').allInnerTexts());console.log('controls',await page.locator('[data-command-type]').evaluateAll(es=>es.map(e=>e.outerHTML))); }throw e;}finally{await browser?.close();server.kill();}
