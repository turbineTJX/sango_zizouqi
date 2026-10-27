import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/campaign-responsiveness-ui',port='4361';await mkdir(out,{recursive:true});
const initial=newCampaign(81,'guandu-200','cao',{allAI:true});
const raw=serializeCampaign(initial),server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},windowsHide:true,stdio:'pipe'});
let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},raw);
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
 await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.cameraPreviewReady==='true');
 const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const before=await saved();
 await page.locator('.turn-seal').click();await page.waitForFunction(()=>document.querySelector('.world-turn')?.getAttribute('aria-busy')==='true');
 const frames=await page.evaluate(async()=>{
  const times=[];let last=performance.now();
  for(let i=0;i<20;i++){const now=await new Promise(requestAnimationFrame);times.push(now-last);last=now;}
  return {max:Math.max(...times),p95:[...times].sort((a,b)=>a-b)[Math.floor(times.length*.95)]};
 });
 assert.ok(frames.max<1500,'strategic computation must not monopolize the UI thread');
 const pauseStart=Date.now();await page.locator('.turn-seal').click();
 await page.waitForFunction(()=>document.querySelector('.world-turn')?.getAttribute('aria-busy')==='false');const pauseMs=Date.now()-pauseStart;
 assert.ok(pauseMs<1500,'pause must cancel a day without waiting for strategic computation');
 await page.waitForTimeout(300);assert.equal(await saved(),before,'cancelled calculations cannot consume resources, random states or a day');
 await page.locator('.turn-seal').click();await page.waitForFunction(()=>document.querySelector('.world-turn')?.getAttribute('aria-busy')==='true');
 await page.keyboard.press('F1');await page.locator('#page-guide-root [data-guide-done]').waitFor();
 assert.equal(await page.locator('.world-turn').getAttribute('aria-busy'),'false','opening a guide with the keyboard also cancels uncommitted work');
 assert.equal(await saved(),before);await page.locator('#page-guide-root [data-guide-done]').click();
 await page.locator('.turn-seal').click();await page.waitForFunction(()=>document.querySelector('.world-turn')?.getAttribute('aria-busy')==='false',{},{timeout:120000});
 await page.locator('.turn-seal').click();
 const direct=validateCampaign(JSON.parse(raw));assert.equal(beginExecution(direct),null);
 assert.equal(await saved(),serializeCampaign(direct),'background begin uses the common execution handler');
 await page.evaluate(()=>{globalThis.mapIdentity={svg:document.querySelector('.national-world'),terrain:document.querySelector('.ancient-atlas-terrain'),image:document.querySelector('.ancient-atlas-terrain image')};});
 await page.locator('.turn-day').click();await page.waitForFunction(()=>document.querySelector('.world-turn')?.getAttribute('aria-busy')==='false',{},{timeout:120000});
 advanceCampaignDay(direct);assert.equal(await saved(),serializeCampaign(direct),'the completed daily state equals the foreground engine');
 assert.ok(await page.evaluate(()=>mapIdentity.svg===document.querySelector('.national-world')&&mapIdentity.terrain===document.querySelector('.ancient-atlas-terrain')&&mapIdentity.image===document.querySelector('.ancient-atlas-terrain image')),'daily refresh must retain the SVG, terrain and decoded image nodes');
 const patchChecks=await page.evaluate(async()=>{
  const {patchStrategicDOM}=await import('/strategic-dom.mjs'),root=document.createElement('div');
  root.innerHTML='<main class="strategy-map-first"><svg><g class="national-map-terrain"><path/></g><g data-campaign-army="a1">one</g><g data-campaign-army="a2">two</g></svg></main>';
  const terrain=root.querySelector('.national-map-terrain'),a2=root.querySelector('[data-campaign-army="a2"]');
  patchStrategicDOM(root,'<main class="strategy-map-first"><svg><g class="national-map-terrain" data-preserve-terrain></g><g data-campaign-army="a2">changed</g><g data-campaign-army="a3">new</g></svg></main>');
  return terrain===root.querySelector('.national-map-terrain')&&terrain.childElementCount===1&&a2===root.querySelector('[data-campaign-army="a2"]')&&a2.textContent==='changed'&&!root.querySelector('[data-campaign-army="a1"]')&&!!root.querySelector('[data-campaign-army="a3"]');
 });assert.ok(patchChecks,'entity removal, insertion and reorder preserve the correct identities');
 assert.deepEqual(errors,[]);await page.screenshot({path:out+'/desktop.png'});
 const result={passed:true,framesDuringCalculation:frames,pauseMs,day:direct.campaign.day,checks:['responsive during real strategic calculation','cancel leaves committed save unchanged','keyboard guide cancels pending computation','begin and day match common engine','persistent SVG and terrain nodes','keyed entity reconciliation']};
 await writeFile(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
