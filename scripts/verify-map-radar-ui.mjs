import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,launchExpedition} from '../strategic-campaign.mjs';
import {LOCAL_MAP_SIZE} from '../strategic-map-camera.mjs';
import {recordOfficerActivities} from '../officer-activity.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4204',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
const out='outputs/map-navigation-ui';let browser,page;
try{
 await mkdir(out,{recursive:true});await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('Map server exited: '+code)));});
 const fixture=newCampaign(203,'guandu-200'),home=fixture.cities.find(c=>c.id==='xuchang'),ids=home.units.slice(0,2).map(u=>u.id);
 assert.equal(launchExpedition(fixture,{cityId:home.id,officerIds:ids,leader:ids[0],advisor:ids[0],target:'chenliu',policy:'auto'}),null);
 recordOfficerActivities(fixture);
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(fixture));
 await page.goto('http://127.0.0.1:4204/#strategy');const main=page.locator('.national-world');await main.waitFor();
 const view=()=>main.evaluate(el=>{const v=el.viewBox.baseVal;return {x:v.x,y:v.y,width:v.width,height:v.height};});
 const saved=()=>page.evaluate(async()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const absent=async()=>assert.equal(await page.locator('.strategy-radar,[data-strategy-radar],.radar-viewport').count(),0);
 const contains=async point=>{const v=await view();assert.ok(point.x>=v.x&&point.x<=v.x+v.width&&point.y>=v.y&&point.y<=v.y+v.height);};
 const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const initial=await view();assert.equal(Math.min(initial.width,initial.height),LOCAL_MAP_SIZE);await absent();
 const before=await saved();await page.screenshot({path:out+'/desktop.png'});
 await main.focus();const beforePan=await view();await page.keyboard.press('ArrowLeft');assert.ok((await view()).x<beforePan.x);await page.keyboard.press('+');assert.ok((await view()).width<beforePan.width);
 const wheelBefore=await view(),box=await main.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-100);await frames();assert.ok((await view()).width<wheelBefore.width);
 const dragBefore=await view();await page.mouse.down({button:'right'});await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+40,{steps:4});await page.mouse.up({button:'right'});await frames();assert.notDeepEqual(await view(),dragBefore);
 await page.locator('[data-map-view="national"]').click();assert.deepEqual(await view(),{x:0,y:0,width:1024,height:1024});
 await page.locator('[data-map-view="selected"]').click();await contains(home);assert.ok(Math.min((await view()).width,(await view()).height)<1024);
 await page.locator('#national-city-search').selectOption('luoyang');await page.locator('.modal [data-action="close"]').click();await contains(fixture.cities.find(c=>c.id==='luoyang'));
 await main.focus();await page.keyboard.press('Home');await contains(fixture.cities.find(c=>c.id==='luoyang'));assert.equal(await saved(),before);
 await page.locator('#national-city-search').selectOption('xuchang');await page.locator('.modal [data-action="close"]').click();
 await page.locator(`[data-campaign-army="${fixture.armies[0].id}"] [data-map-army-card]`).click();await page.locator('.modal [data-action="campaign-order"]').click();await page.locator('.map-command-screen').waitFor();await absent();
 const draft=await page.locator('.map-point-menu').allTextContents();await page.locator('[data-map-view="national"]').click();await main.focus();await page.keyboard.press('+');await page.keyboard.press('ArrowLeft');await page.locator('[data-map-view="selected"]').click();assert.deepEqual(await page.locator('.map-point-menu').allTextContents(),draft);assert.equal(await saved(),before);
 await page.screenshot({path:out+'/command-desktop.png'});await page.locator('[data-action="campaign-command-cancel"]').first().click();
 const close=page.locator('.modal [data-action="close"]');if(await close.count())await close.click();
 await page.setViewportSize({width:390,height:844});await absent();await page.locator('[data-map-view="national"]').tap();assert.equal((await view()).width,1024);await page.locator('[data-map-view="selected"]').tap();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.equal(await saved(),before);await page.screenshot({path:out+'/mobile.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,initial,errors,checks:['no minimap on desktop, mobile or command map','local focus','main-map drag','keyboard and wheel zoom','national overview','city search location','return to operation center','command draft retained','read-only camera','mobile touch controls and layout']},null,2));
 console.log('PASS map navigation without a minimap: desktop/mobile, drag, zoom, search, national overview, return, unchanged command draft and save');
}catch(error){
 if(page)await page.screenshot({path:out+'/failure.png'});
 if(typeof error.actual==='string'&&error.actual.startsWith('{')&&typeof error.expected==='string'){
  const changes=[];
  const diff=(a,b,path='')=>{if(changes.length>=12||JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],path+'.'+k);}else changes.push({path,before:b,after:a});};
  diff(JSON.parse(error.actual),JSON.parse(error.expected));console.error('Unexpected save differences:',JSON.stringify(changes));
 }
 throw Error('Map navigation verification failed: '+error.stack.split('\n').filter(line=>/^\s+at /.test(line)).slice(0,3).join('\n'));
}finally{await browser?.close();server.kill();}
