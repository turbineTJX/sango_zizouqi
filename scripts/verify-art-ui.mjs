import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4197'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(new Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('sango-art-mode','builtin');localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0}));});
 await page.goto('http://127.0.0.1:4197');const action=n=>page.locator(`[data-action="${n}"]`);await page.locator('.mode-selection').waitFor();
 const launch=async(target,id)=>{if(id)await target.locator(`[data-action="historical-template"][data-history="${id}"]`).click();await target.locator('[data-action="launch-custom"]').click();await target.locator('[data-action="scenario-launch-confirm"]').click();await target.locator('#battle-board').waitFor();};
 assert.equal(await action('art-mode').count(),0);
 await action('campaign-lobby').click();await launch(page);await page.waitForFunction(()=>document.querySelectorAll('.has-unit-art').length>0);await mkdir('outputs/local-art',{recursive:true});
 await page.waitForFunction(()=>document.querySelector('#battle-board').dataset.modelStatus==='ready');
 await page.screenshot({path:'outputs/local-art/deployment.png',fullPage:true});
 assert.equal(await action('art-mode').count(),0,'Artwork has no display-mode switch');
 assert.equal(await page.evaluate(async()=>(await import('/art-assets.mjs')).art.active),true,'Old disabled-art preferences do not hide artwork');
 // Real start and deterministic pause; no synthetic battle events.
 await action('pause').click();await page.waitForTimeout(1300);await action('pause').click();
 const frozen=await page.locator('.art-sprites').screenshot();await page.waitForTimeout(400);assert.deepEqual(await page.locator('.art-sprites').screenshot(),frozen,'paused sprite animations must freeze');
 await page.screenshot({path:'outputs/local-art/battle.png',fullPage:true});
 await action('lobby').filter({visible:true}).first().click();await action('campaign-lobby').click();
 const models={};
 for(const id of ['chibi','hefei','yiling']){
  await launch(page,id);
  await page.waitForFunction(()=>Number(document.querySelector('#battle-board')?.dataset.modelCount)>1);await page.waitForTimeout(300);
  models[id]=await page.locator('#battle-board').getAttribute('data-model-count');
  await page.screenshot({path:`outputs/local-art/${id}.png`,fullPage:true});
  if(id==='chibi'){await page.setViewportSize({width:844,height:390});await page.screenshot({path:'outputs/local-art/mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});}
  await action('lobby').filter({visible:true}).first().click();await action('campaign-lobby').click();
 }
 await page.evaluate(async()=>{const {art}=await import('./art-assets.mjs');const span=document.createElement('span');span.dataset.artPortrait='cao';document.body.append(span);art.decorate(document);});
 await page.waitForFunction(()=>document.querySelector('[data-art-portrait="cao"] img')?.naturalWidth>0);
 // No local-only payload may be retained in service-worker caches.
 const cached=await page.evaluate(async()=>{const urls=[];for(const key of await caches.keys())for(const r of await(await caches.open(key)).keys())urls.push(r.url);return urls.filter(u=>u.includes('/local-art/'));});assert.deepEqual(cached,[]);
 const fallback=await browser.newPage({viewport:{width:1440,height:1000}});for(const pattern of ['**/assets/**','**/local-art/**'])await fallback.route(pattern,route=>route.fulfill({status:404,body:'Not found'}));
 await fallback.goto('http://127.0.0.1:4197');await fallback.locator('[data-action="campaign-lobby"]').click();await launch(fallback);await fallback.waitForTimeout(600);assert.equal(await fallback.locator('img[data-officer-art]').count(),0);assert.ok(await fallback.locator('.battle-unit').count()>0);await fallback.close();
 assert.deepEqual(errors,[]);await writeFile('outputs/local-art/ui-result.json',JSON.stringify({errors,models,cached,paused:true,fallback:true,artModeSwitch:false,oldDisabledPreferenceIgnored:true},null,2));console.log('Local art UI verification passed',models);
}finally{await browser?.close();server.kill();}
