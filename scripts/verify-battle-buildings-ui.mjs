import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {BUILDING_DESIGNS} from '../data/design/buildings.mjs';
import {completeTechnologyBuilding} from '../building-durability.mjs';
import {TOWN_ART} from '../town-art.mjs';
import {lockDeployment} from '../engine.mjs';
import {setBuildingLevel} from '../tests/building-fixtures.mjs';
import {invadeFromGuandu} from '../tests/helpers/field-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/battle-buildings/ui';mkdirSync(out,{recursive:true});
const kinds=['arrowTower','musicStage','aidCamp'];
function facilities(s){const c=s.cities.find(c=>c.id==='xuchang');c.domestic.techs=['watchtower',...kinds.map(k=>BUILDING_DESIGNS[k].technology)];completeTechnologyBuilding(c,'watchtower');for(const k of kinds)setBuildingLevel(c,k,2,c.id,{hp:1500});return c;}
const cityState=newCampaign(81,'guandu-200');facilities(cityState);const citySave=serializeCampaign(cityState);validateCampaign(JSON.parse(citySave));
const battleState=newCampaign(81);facilities(battleState);invadeFromGuandu(battleState);beginExecution(battleState);let encounter;
for(let i=0;i<8&&!encounter;i++){advanceCampaignDay(battleState);encounter=activeBattles(battleState).find(r=>r.cityId==='xuchang'&&r.kind==='siege');}
assert.ok(encounter);chooseEncounter(battleState,encounter.id,true);lockDeployment(encounter.battle);battleState.battle=encounter.battle;const battleSave=serializeCampaign(battleState);validateCampaign(JSON.parse(battleSave));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4249'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const save=sessionStorage.getItem('building-ui-fixture');if(save)localStorage.setItem('sango-sovereign-v2',save);});
 await page.goto('http://127.0.0.1:4249/#strategy');
 const load=async(save,hash='#strategy')=>{await page.evaluate(save=>sessionStorage.setItem('building-ui-fixture',save),save);await page.goto('http://127.0.0.1:4249/'+hash);await page.reload();if(await page.locator('.modal [data-action="close"]').count())await page.locator('.modal [data-action="close"]').first().click();};
 await load(citySave);if(await page.locator('.modal [data-action="close"]').count())await page.locator('.modal [data-action="close"]').first().click();
 await page.locator('.faction-navigation [data-kind="city"]').click();await page.locator('.city-directory-item[data-id="xuchang"]').click();await page.locator('[data-action="map-quick-manage"][data-id="xuchang"]').click();
 const tree=page.locator('[data-city-technology="xuchang"]');await tree.waitFor();
 for(const kind of kinds){const id=BUILDING_DESIGNS[kind].technology;assert.equal(await tree.locator('[data-technology="'+id+'"]').getAttribute('data-technology-state'),'complete');}
 await tree.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/technology-desktop.png'});
 await page.setViewportSize({width:390,height:844});await tree.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:out+'/technology-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await load(citySave);await page.locator('[data-map-view="city"]').click();const city=page.locator('.national-world [data-city="xuchang"]');
 for(const kind of kinds){const building=city.locator('.map-city-scene [data-city-building="'+kind+'"]');assert.equal(await building.getAttribute('data-level'),'2');assert.equal(await building.locator('.town-facility-'+kind).count(),1);}
 await page.evaluate(async urls=>{for(const src of urls){const image=new Image();image.src=src;await image.decode();if(image.naturalWidth<1000)throw Error('Facility texture failed: '+src);}},kinds.map(k=>TOWN_ART[k]));
 await page.screenshot({path:out+'/city-desktop.png'});
 const saved=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));for(const kind of kinds){const building=city.locator('.map-city-scene [data-city-building="'+kind+'"]');await building.focus();await page.keyboard.press('Enter');const card=page.locator('.city-building-card');assert.match(await card.innerText(),/1,500\s*\/\s*2,000/);assert.ok((await card.innerText()).includes(BUILDING_DESIGNS[kind].name));await page.locator('[data-city-card-close]').click();}
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),saved);
 await load(battleSave);await page.locator('#battle-board').waitFor();
 const battleBefore=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 for(const kind of kinds){const id=encounter.battle.buildings.find(a=>a.kind===kind).id,marker=page.locator('[data-action="inspect-building"][data-building="'+id+'"]');assert.ok((await marker.innerText()).includes(BUILDING_DESIGNS[kind].name));await marker.click();assert.ok((await page.locator('.modal').innerText()).includes(BUILDING_DESIGNS[kind].description));await page.screenshot({path:out+'/battle-'+kind+'.png',animations:'disabled'});}
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),battleBefore);await page.locator('.modal [data-action="close"]').first().click();
 await page.setViewportSize({width:390,height:844});const id=encounter.battle.buildings.find(a=>a.kind==='musicStage').id;await page.locator('[data-action="inspect-building"][data-building="'+id+'"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:out+'/battle-mobile.png',animations:'disabled'});
 validateCampaign(JSON.parse(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'))));assert.deepEqual(errors,[]);
 writeFileSync(out+'/summary.json',JSON.stringify({facilities:kinds,technology:true,cityArtwork:true,battleDetails:true,desktop:true,mobile:true,errors},null,2));console.log('PASS battle facilities: technology, original city artwork, battle details, desktop/mobile and current saved state');
}catch(error){if(page){await page.screenshot({path:out+'/failure.png',fullPage:true});console.log((await page.locator('body').innerText()).slice(-2200));}throw error;}finally{await browser?.close();server.kill();}
