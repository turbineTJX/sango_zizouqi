import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4197'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(new Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4197');const action=n=>page.locator(`[data-action="${n}"]`);await page.locator('.mode-selection').waitFor();
 await action('campaign-lobby').click();await action('launch-history').click();await page.waitForFunction(()=>document.querySelectorAll('.has-unit-art').length>0);await mkdir('outputs/local-art',{recursive:true});
 await page.waitForFunction(()=>document.querySelector('#battle-board').dataset.modelStatus==='ready');
 await page.screenshot({path:'outputs/local-art/deployment.png',fullPage:true});
 await page.locator('[data-panel="tools"]').click();
 const before=await page.evaluate(()=>localStorage.getItem('sango-historical-battle-v1'));
 await action('art-mode').click();assert.equal(await page.locator('.art-sprites').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('sango-historical-battle-v1')),before);
 await action('art-mode').click();await page.waitForFunction(()=>document.querySelectorAll('.has-unit-art').length>0);
 // Real start and deterministic pause; no synthetic battle events.
 await action('pause').click();await page.waitForTimeout(1300);await action('pause').click();
 const frozen=await page.locator('.art-sprites').screenshot();await page.waitForTimeout(400);assert.deepEqual(await page.locator('.art-sprites').screenshot(),frozen,'paused sprite animations must freeze');
 await page.screenshot({path:'outputs/local-art/battle.png',fullPage:true});
 await action('lobby').first().click();await action('campaign-lobby').click();
 const models={};
 for(const id of ['history-chibi','history-hefei','history-yiling']){
  await page.locator(`[data-action="select-history"][data-scenario="${id}"]`).click();await action('launch-history').click();
  await page.waitForFunction(()=>Number(document.querySelector('#battle-board')?.dataset.modelCount)>1);await page.waitForTimeout(300);
  models[id]=await page.locator('#battle-board').getAttribute('data-model-count');
  await page.screenshot({path:`outputs/local-art/${id}.png`,fullPage:true});
  if(id==='history-chibi'){await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/local-art/mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});}
  await action('lobby').first().click();await action('campaign-lobby').click();
 }
 await page.evaluate(async()=>{const {art}=await import('./art-assets.mjs');const span=document.createElement('span');span.dataset.artPortrait='cao';document.body.append(span);art.decorate(document);});
 await page.waitForFunction(()=>document.querySelector('[data-art-portrait="cao"] img')?.naturalWidth>0);
 // No local-only payload may be retained in service-worker caches.
 const cached=await page.evaluate(async()=>{const urls=[];for(const key of await caches.keys())for(const r of await(await caches.open(key)).keys())urls.push(r.url);return urls.filter(u=>u.includes('/local-art/'));});assert.deepEqual(cached,[]);
 const fallback=await browser.newPage();await fallback.route('**/local-art/files/**',route=>route.fulfill({status:404,body:'Not found'}));
 await fallback.goto('http://127.0.0.1:4197');await fallback.locator('[data-action="campaign-lobby"]').click();await fallback.locator('[data-action="launch-history"]').click();await fallback.waitForTimeout(600);assert.equal(await fallback.locator('.has-unit-art').count(),0);assert.ok(await fallback.locator('.battle-unit').count()>0);await fallback.close();
 assert.deepEqual(errors,[]);await writeFile('outputs/local-art/ui-result.json',JSON.stringify({errors,models,cached,paused:true,fallback:true},null,2));console.log('Local art UI verification passed',models);
}finally{await browser?.close();server.kill();}
