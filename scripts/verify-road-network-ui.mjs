import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4203',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await mkdir('outputs/road-network-ui',{recursive:true});await page.goto('http://127.0.0.1:4203/#strategy');
 const fixture=await page.evaluate(async()=>{
  const {newCampaign,launchExpedition}=await import('/strategic-campaign.mjs');const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),ids=c.units.slice(0,2).map(u=>u.id);
  const error=launchExpedition(s,{kind:'expedition',cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[0],target:'chenliu',policy:'auto'});if(error)throw Error(error);
  localStorage.setItem('sango-sovereign-v2',JSON.stringify(s));return {state:s,id:s.armies[0].id,target:'junction:chenliu:xuchang'};
 });
 await page.addInitScript(s=>{if(!sessionStorage.getItem('road-test-seeded')){localStorage.setItem('sango-sovereign-v2',JSON.stringify(s));sessionStorage.setItem('road-test-seeded','1');}},fixture.state);
 await page.reload();await page.locator('.national-world').waitFor();assert.equal(await page.locator('.national-world .strategy-junction').count(),23);
 await page.locator('[data-action="campaign-tab"][data-tab="army"]').click();await page.locator('#army-select').selectOption(fixture.id);await page.locator('[data-action="campaign-order"]').click();
 await page.locator('#command-destination').selectOption(fixture.target);assert.match(await page.locator('.command-target-layout aside').innerText(),/野外路口/);
 const marker=page.locator('[data-command-city="'+fixture.target+'"]');assert.equal(await marker.getAttribute('aria-pressed'),'true');await marker.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#command-destination').inputValue(),fixture.target);
 await page.screenshot({path:'outputs/road-network-ui/target-desktop.png',fullPage:true});
 await page.locator('[data-action="campaign-command-next"]').click();assert.match(await page.locator('.command-decree').innerText(),/陈留—许昌路口/);
 await page.locator('[data-action="campaign-pick-confirm"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));assert.equal(saved.armies.find(a=>a.id===fixture.id).target,fixture.target);
 await page.reload();await page.locator('.national-world').waitFor();await page.setViewportSize({width:390,height:844});await page.locator('[data-action="campaign-tab"][data-tab="army"]').click();await page.locator('#army-select').selectOption(fixture.id);await page.locator('[data-action="campaign-order"]').click();await page.locator('#command-destination').selectOption(fixture.target);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 await page.screenshot({path:'outputs/road-network-ui/target-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 await writeFile('outputs/road-network-ui/result.json',JSON.stringify({passed:true,junctions:23,errors},null,2));console.log('PASS road junction targets, review, save, desktop and mobile');
}catch(e){if(browser){const p=browser.contexts()[0]?.pages()[0];if(p){await p.screenshot({path:'outputs/road-network-ui/failure.png',fullPage:true});console.log(await p.locator('body').innerText());}}throw e;}finally{await browser?.close();server.kill();}
