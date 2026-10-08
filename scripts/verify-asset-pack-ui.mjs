import {createRequire} from 'node:module';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {updateCityBudgetAlerts} from '../city-budget.mjs';
import {PROJECT_ROOT} from '../asset-workspace.mjs';

const [release,codeOnly]=process.argv.slice(2);
if(!release||!codeOnly)throw Error('Usage: verify-asset-pack-ui.mjs <split release directory> <code-only release directory>');
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve(PROJECT_ROOT,'outputs/asset-pack-ui');await mkdir(out,{recursive:true});
const state=newCampaign(81,'guandu-200');updateCityBudgetAlerts(state);
const save=serializeCampaign(state),checks=[];
function assertSameSave(current,previous){
 const changes=[];
 function diff(a,b,path=''){
  if(JSON.stringify(a)===JSON.stringify(b))return;
  if(a&&b&&typeof a==='object'&&typeof b==='object')for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],path+'.'+key);
  else if(changes.length<10)changes.push({path,before:b,after:a});
 }
 diff(JSON.parse(current),JSON.parse(previous));assert.deepEqual(changes,[],'Viewing changed save');
}
const freePort=async()=>{const socket=createServer();await new Promise(ok=>socket.listen(0,'127.0.0.1',ok));const port=socket.address().port;await new Promise(ok=>socket.close(ok));return port;};
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const [directory,hasArt] of [[release,true],[codeOnly,false]]){
  const port=await freePort(),env={...process.env,PORT:String(port),SANGO_ART:'off'};delete env.SANGO_ASSET_ROOT;
  const server=spawn(process.execPath,['server.mjs'],{cwd:resolve(directory,'code'),env,windowsHide:true,stdio:'pipe'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
  try{
   await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('Release server exited: '+code)));});
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(save=>{localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},save);
   await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
   const catalog=await page.evaluate(async()=>structuredClone((await import('./asset-catalog.mjs')).assetCatalog));
   assert.equal(catalog.id==='none',!hasArt);
   if(hasArt){
    await page.evaluate(async()=>{const {assetCatalog}=await import('./asset-catalog.mjs');for(const src of Object.values(assetCatalog.town).flatMap(Object.values).filter(Boolean)){const image=new Image();image.src=src;await image.decode();assertImage(image);}function assertImage(image){if(!image.naturalWidth)throw Error('Artwork failed: '+image.src);}});
    const portrait=await page.evaluate(async()=>{const {art}=await import('./art-assets.mjs');const id=Object.keys(art.officers).find(id=>art.officers[id].portrait),src=art.portraitURL(id);if(!src)throw Error('Release officer art missing');const image=new Image();image.src=src;await image.decode();return src;});assert.ok(portrait.startsWith('./assets/'));
   }
   if(await page.locator('.modal-header [data-action="close"]').count())await page.locator('.modal-header [data-action="close"]').click();
   const before=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
   await page.locator('[data-map-view="city"]').click();
   assertSameSave(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),before);
   await page.screenshot({path:resolve(out,hasArt?'split-online.png':'code-only.png')});
   await page.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Offline installation timed out')),20000))]);});
   await page.reload();await page.locator('.national-world').waitFor();await page.waitForFunction(()=>navigator.serviceWorker.controller);
   if(hasArt){
    await page.evaluate(async()=>{const {assetCatalog}=await import('./asset-catalog.mjs');for(const src of ['./assets/manifest.json',...Object.values(assetCatalog.town).flatMap(Object.values).filter(Boolean)])if(!await caches.match(src))throw Error('Missing art cache: '+src);});
   }
   await context.setOffline(true);await page.reload();await page.locator('.national-world').waitFor();
   assert.equal((await page.evaluate(async()=>(await import('./asset-catalog.mjs')).assetCatalog.id))==='none',!hasArt);
   assert.deepEqual(errors,[]);await page.screenshot({path:resolve(out,hasArt?'split-offline.png':'code-only-offline.png')});
   checks.push({mode:hasArt?'split-code-and-art':'code-only',online:true,offline:true,viewingPreservesSave:true});
  }finally{await context.close();server.kill();}
 }
 await writeFile(resolve(out,'result.json'),JSON.stringify({passed:true,checks},null,2)+'\n');console.log('PASS split release and code-only startup, town/officer loading, independent art cache, offline reload and read-only viewing');
}finally{await browser.close();}
