import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,launchExpedition} from '../strategic-campaign.mjs';
import {metropolitanMembers} from '../metropolitan-areas.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(81,'guandu-200'),members=metropolitanMembers(s,s.cities.find(c=>c.id==='jinyang'));
const out='outputs/map-detail-ui',port='4308';mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const save=sessionStorage.getItem('detail-fixture');if(save)localStorage.setItem('sango-sovereign-v2',save);});await page.goto(`http://127.0.0.1:${port}/#strategy`);
 const load=async state=>{await page.evaluate(save=>sessionStorage.setItem('detail-fixture',save),serializeCampaign(state));await page.reload();await page.locator('.national-world').waitFor();};
 const main=page.locator('.national-world'),level=()=>main.getAttribute('data-map-detail');
 const pin=id=>page.locator(`.national-world [data-city="${id}"],.national-world [data-junction="${id}"]`);
 const sync=async()=>{const v=await main.evaluate(el=>Object.fromEntries(['x','y','width','height'].map(k=>[k,el.viewBox.baseVal[k]]))),r=await page.locator('.radar-viewport').evaluate(el=>Object.fromEntries(['x','y','width','height'].map(k=>[k,+el.getAttribute(k)])));for(const k in v)assert.ok(Math.abs(v[k]-r[k])<.001);};
 const closeMenu=async()=>{const close=page.locator('.modal [data-action="close"]');if(await close.count())await close.click();};
 await load(s);assert.equal(await level(),'metropolis');assert.equal(await pin('atlas-lishi').isVisible(),false);
 await page.locator('#national-city-search').selectOption('jinyang');await closeMenu();await page.locator('[data-map-view="metropolis"]').click();assert.equal(await level(),'metropolis');
 const before=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 await page.screenshot({path:out+'/metropolis.png'});await page.locator('[data-metropolis-focus="jinyang"] .metropolis-halo').click();assert.equal(await level(),'settlements');
 for(const n of members)assert.equal(await pin(n.id).isVisible(),true,n.name);assert.equal(await page.locator('[data-metropolis-focus="jinyang"]').isVisible(),false);await sync();await page.screenshot({path:out+'/settlements.png'});
 await page.locator('[data-map-view="metropolis"]').click();const metro=page.locator('[data-metropolis-focus="jinyang"]');await metro.focus();await page.keyboard.press('Enter');assert.equal(await level(),'settlements');
 // Native zoom controls cross each layer and reverse in the same order.
 const trace=[await level()];await main.focus();for(let i=0;i<20&&await level()!=='interior';i++){await page.keyboard.press('+');const l=await level();if(l!==trace.at(-1))trace.push(l);}
 assert.equal(await level(),'interior');assert.equal(await main.locator('.is-town-focused [data-city-building]').count(),9);await sync();
 await main.locator('.is-town-focused [data-city-building="farm"] .city-district-hit').click();assert.equal(await page.locator('.city-building-card').count(),1);await page.screenshot({path:out+'/interior.png'});
 await main.focus();for(let i=0;i<25&&await level()!=='metropolis';i++){await page.keyboard.press('-');const l=await level();if(l!==trace.at(-1))trace.push(l);}
 assert.deepEqual(trace,['settlements','interior','settlements','metropolis']);assert.equal(await page.locator('.city-building-card').count(),0);await sync();
 // Ports and passes use the same third layer and real model source.
 for(const n of members.filter(n=>['gate','port'].includes(n.kind))){await page.locator('#national-city-search').selectOption(n.id);await closeMenu();await page.locator('[data-map-view="city"]').click();assert.equal(await level(),'interior');assert.equal(await pin(n.id).locator('[data-city-building]').count(),9);await page.locator('[data-map-view="metropolis"]').click();}
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),before);
 // Real wheel zoom also reveals the intermediate layer before buildings.
 await page.locator('[data-map-view="metropolis"]').click();const wheelTrace=[await level()],box=await main.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
 for(let i=0;i<20&&await level()!=='interior';i++){await page.mouse.wheel(0,-100);await page.waitForTimeout(40);const l=await level();if(l!==wheelTrace.at(-1))wheelTrace.push(l);}
 assert.deepEqual(wheelTrace,['metropolis','settlements','interior']);await sync();
 await page.setViewportSize({width:390,height:844});await load(s);await page.locator('[data-map-view="metropolis"]').click();assert.equal(await level(),'metropolis');await page.screenshot({path:out+'/mobile-metropolis.png'});
 await page.locator('[data-map-view="settlements"]').click();assert.equal(await level(),'settlements');await page.screenshot({path:out+'/mobile-settlements.png'});
 await page.locator('[data-map-view="city"]').click();assert.equal(await level(),'interior');await main.locator('.is-town-focused [data-city-building="farm"] .city-district-hit').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await sync();await page.screenshot({path:out+'/mobile-interior.png'});
 // Opening a group in a command map changes only the camera and keeps the route draft.
 const marching=newCampaign(203,'guandu-200'),home=marching.cities.find(c=>c.id==='xuchang'),ids=home.units.slice(0,2).map(u=>u.id);
 assert.equal(launchExpedition(marching,{cityId:home.id,officerIds:ids,leader:ids[0],advisor:ids[0],deputy:null,target:'chenliu',policy:'auto'}),null);
 await page.setViewportSize({width:1440,height:1000});await load(marching);await page.locator(`[data-campaign-army="${marching.armies[0].id}"] [data-map-army-card]`).click();await page.locator('.modal [data-action="campaign-order"]').click();await page.locator('.map-command-screen').waitFor();
 await page.locator('[data-map-view="metropolis"]').click();const draft=await page.locator('.map-point-menu').allTextContents();await page.locator('[data-metropolis-focus="xuchang"] .metropolis-halo').click();assert.equal(await level(),'settlements');assert.deepEqual(await page.locator('.map-point-menu').allTextContents(),draft);await sync();
 await page.locator('[data-command-city="chenliu"] .city-size-mark').click();assert.match((await page.locator('.map-point-menu').allTextContents()).join(''),/陈留/);await page.locator('[data-action="campaign-command-cancel"]').first().click();
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({passed:true,trace,wheelTrace,checks:['default metropolis overview','native and keyboard group expansion','all member kinds','progressive keyboard and wheel zoom','reverse zoom','detail-card closure','read-only camera','radar sync','portrait levels and layout','command draft retained']},null,2));console.log('PASS progressive metropolis, settlement and interior zoom, desktop/mobile, radar and route planning');
}catch(error){if(browser){const page=browser.contexts()[0]?.pages()[0];await page?.screenshot({path:out+'/failure.png'});}throw error;}finally{await browser?.close();server.kill();}
