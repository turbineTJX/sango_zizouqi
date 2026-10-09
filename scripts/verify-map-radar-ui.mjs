import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4204',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
const out='outputs/map-radar-ui';
try{
 await mkdir(out,{recursive:true});await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4204/#strategy');
 const fixture=await page.evaluate(async()=>{const {newCampaign,launchExpedition}=await import('/strategic-campaign.mjs');const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),ids=c.units.slice(0,2).map(u=>u.id);const error=launchExpedition(s,{cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[0],target:'chenliu',policy:'auto'});if(error)throw Error(error);return s;});
 await page.addInitScript(s=>{if(!sessionStorage.getItem('radar-fixture')){localStorage.setItem('sango-sovereign-v2',JSON.stringify(s));sessionStorage.setItem('radar-fixture','1');}},fixture);
 await page.reload();const main=page.locator('.national-world'),radar=page.locator('[data-strategy-radar]');await main.waitFor();
 const view=async()=>main.evaluate(s=>{const v=s.viewBox.baseVal;return {x:v.x,y:v.y,width:v.width,height:v.height};});
 const sync=async()=>{const v=await view(),f=await radar.locator('.radar-viewport').evaluate(r=>Object.fromEntries(['x','y','width','height'].map(k=>[k,+r.getAttribute(k)])));for(const key in v)assert.ok(Math.abs(v[key]-f[key])<.001);};
 const initial=await view();assert.equal(initial.width,360);assert.equal(initial.x+180,+await main.getAttribute('data-focus-x'));assert.equal(initial.y+180,+await main.getAttribute('data-focus-y'));assert.equal(await page.locator('[data-map-view="national"]').count(),0);
 await page.locator('.city-directory [data-city="xuchang"]').click();
 await page.locator('.strategy-map-panel').screenshot({path:out+'/desktop.png'});
 const stateBefore=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 const box=await radar.boundingBox();await radar.click({position:{x:box.width*.18,y:box.height*.82}});assert.ok((await view()).y>500);await sync();
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),stateBefore);
 // Drag the national radar, then zoom and pan the main map with the keyboard.
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.3,{steps:4});await page.mouse.up();await sync();
 await main.focus();const beforePan=await view();await page.keyboard.press('ArrowLeft');assert.ok((await view()).x<beforePan.x);await page.keyboard.press('+');assert.ok((await view()).width<beforePan.width);await sync();const wheelBox=await main.boundingBox(),wheelBefore=await view();await page.mouse.move(wheelBox.x+wheelBox.width/2,Math.max(50,wheelBox.y+wheelBox.height/2));await page.mouse.wheel(0,-100);await page.waitForTimeout(100);assert.ok((await view()).width<wheelBefore.width);await sync();
 await page.locator('[data-map-view="selected"]').click();const centered=await view();assert.ok(Math.abs(centered.x+centered.width/2-507)<.01);
 await page.locator('.city-directory [data-city="town-9"]').click();let v=await view();assert.ok(Math.abs(v.x+v.width/2-758)<.01);
 // Main-map camera is carried into command planning, whose radar must not create a route.
 await page.locator('[data-action="campaign-tab"][data-tab="army"]').click();await page.locator('#army-select').selectOption(fixture.armies[0].id);await page.locator('[data-action="campaign-order"]').click();await page.locator('.map-command-screen').waitFor();
 const destination=await page.locator('.map-point-menu').innerText(),b=await radar.boundingBox();await radar.click({position:{x:b.width*.3,y:b.height*.75}});assert.equal(await page.locator('.map-point-menu').innerText(),destination);await sync();
 await page.locator('[data-map-view="selected"]').click();await page.locator('.map-command-screen').screenshot({path:out+'/command-desktop.png'});
 await page.locator('[data-action="campaign-command-cancel"]').first().click();await page.setViewportSize({width:390,height:844});await page.locator('.strategy-map-panel').scrollIntoViewIfNeeded();
 const m=await radar.boundingBox();await radar.tap({position:{x:m.width*.6,y:m.height*.4}});await sync();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.locator('.strategy-map-panel').screenshot({path:out+'/mobile.png'});
 await radar.focus();await page.keyboard.press('Home');await sync();assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,initial,errors,checks:['local focus','radar click and drag','viewport sync','city selection','keyboard pan and zoom','command draft unchanged','mobile layout']},null,2));console.log('PASS: local operation map and national radar, desktop and mobile');
}catch(e){if(browser){const p=browser.contexts()[0]?.pages()[0];if(p){await p.screenshot({path:out+'/failure.png',fullPage:true});console.log(await p.locator('body').innerText());}}throw e;}finally{await browser?.close();server.kill();}
