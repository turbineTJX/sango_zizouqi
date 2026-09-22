import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4197',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4197/#strategy');
 const fixture=await page.evaluate(async()=>{
  const {newCampaign,launchExpedition}=await import('/strategic-campaign.mjs');const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang');
  for(let i=0;i<2;i++){const ids=c.units.slice(0,1).map(u=>u.id);const error=launchExpedition(s,{kind:'expedition',cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[0],deputy:null,target:'chenliu',policy:'auto'});if(error)throw Error(error);}
  localStorage.setItem('sango-sovereign-v2',JSON.stringify(s));return s;
 });
 await page.addInitScript(s=>localStorage.setItem('sango-sovereign-v2',JSON.stringify(s)),fixture);await page.reload();
 const marks=page.locator('.army-map-marker');await marks.first().waitFor();assert.equal(await marks.count(),2);
 await marks.first().click();assert.ok(await page.locator('#overlay-root [data-info-section="overview"]').count());
 await page.keyboard.press('Escape');await marks.last().focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#overlay-root [data-info-section="status"]').count());await page.keyboard.press('Escape');
 await mkdir('outputs/army-map-ui',{recursive:true});await page.screenshot({path:'outputs/army-map-ui/desktop.png'});
 await page.setViewportSize({width:390,height:844});await marks.first().click();assert.ok(await page.locator('#overlay-root [data-info-section="overview"]').count());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'outputs/army-map-ui/mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS: stationary armies, mouse details, keyboard details, mobile details; '+fixture.armies.map(a=>a.id).join(', '));
}finally{await browser?.close();server.kill();}





