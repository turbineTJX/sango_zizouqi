import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
import {writeSourceOfflineManifest} from './source-offline-manifest.mjs';

const root=resolve('.'),out=resolve('.local/source-offline-'+Date.now()),base='http://127.0.0.1:4337';
await mkdir(out,{recursive:true});const manifest=await writeSourceOfflineManifest(root,{check:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4337',SANGO_ART:'off',SANGO_ASSET_ROOT:join(out,'no-art')},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await page.goto(base);await page.locator('[data-action="strategy"]').waitFor();
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const missing=await page.evaluate(async files=>{
  const cache=await caches.open((await caches.keys()).find(k=>k.startsWith('sango-source-')));
  return (await Promise.all(files.map(async file=>await cache.match(new URL(file,location.href))?null:file))).filter(Boolean);
 },manifest.files);assert.deepEqual(missing,[]);
 // This is the first reload after installation, with both network and HTTP cache unavailable.
 await context.setOffline(true);await page.reload();await page.locator('[data-action="strategy"]').waitFor();
 await page.locator('[data-action="strategy"]').click();
 await page.locator('button[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();
 await page.locator('button[data-action="select-national-faction"][data-faction="cao"]').click();
 await page.locator('[data-action="launch-national"]').click();await page.locator('.sovereign-hud').waitFor();
 const saved=()=>page.evaluate(async()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 await page.waitForFunction(async()=>!!await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const before=await saved();await page.locator('[data-action="settings"]').first().click();await page.locator('[data-action="save"]').click();
 await page.locator('#archive-name').fill('首次离线存档');await page.locator('[data-action="archive-create"]').click();await page.getByRole('heading',{name:'首次离线存档',exact:true}).waitFor();
 await page.reload();await page.locator('.sovereign-hud').waitFor();assert.equal(await saved(),before);
 await page.evaluate(async()=>{await import('/vendor/three/loaders/GLTFLoader.js');await import('/vendor/three/loaders/OBJLoader.js');});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.locator('[data-action="settings"]').first().click();await page.locator('[data-action="load"]').click();await page.getByRole('heading',{name:'首次离线存档',exact:true}).waitFor();
 await page.screenshot({path:join(out,'offline-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);
 await writeFile(join(out,'result.json'),JSON.stringify({passed:true,revision:manifest.revision,files:manifest.files.length,checks:['fresh installation covers actual import graph','first offline reload with HTTP cache disabled','offline new game','offline automatic and manual persistence','offline reload and archive listing','dynamic model loaders','mobile width'],errors},null,2));
 console.log('Source first-offline UI passed: '+out);
}finally{await browser?.close();server.kill();}
