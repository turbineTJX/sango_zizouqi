import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
import {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';

const out=resolve('.local/save-storage-verification-'+Date.now());await mkdir(out,{recursive:true});
const input=process.argv.find(a=>a.startsWith('--save='))?.slice(7);
const state=input?validateCampaign(JSON.parse(await readFile(input,'utf8'))):newCampaign(20261024,'guandu-200','cao',{allAI:true});
if(!input)while(state.campaign.day<41){const day=state.campaign.day;advanceCampaignDay(state);assert.equal(state.campaign.day,day+1);}
const raw=serializeCampaign(state);validateCampaign(JSON.parse(raw));
assert.ok(raw.length>0,'use a real current-state campaign with battle replays');
const continued=validateCampaign(JSON.parse(raw)),copy=validateCampaign(JSON.parse(raw));advanceCampaignDay(continued);advanceCampaignDay(copy);assert.equal(serializeCampaign(continued),serializeCampaign(copy));
const file=join(out,'campaign.json');await writeFile(file,raw);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4328',SANGO_ART:'off',SANGO_ASSET_ROOT:join(out,'no-art')},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const initial=serializeCampaign(newCampaign(7));
 await context.addInitScript(initial=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!sessionStorage.getItem('storage-seeded')){localStorage.setItem('sango-sovereign-v2',initial);localStorage.setItem('sango-effects-mode','full');sessionStorage.setItem('storage-seeded','1');}},initial);
 await page.goto('http://127.0.0.1:4328/#strategy');await page.locator('.sovereign-hud').waitFor();
 const checks=await page.evaluate(async({raw,initial})=>{
  const {openSaveStorage}=await import('./save-storage.mjs');
  const {writeArchive,readArchive,deleteArchive,listArchives}=await import('./save-archives.mjs');
  const {validateCampaign,serializeCampaign}=await import('./strategic-campaign.mjs');
  const check=(condition,message)=>{if(!condition)throw Error(message);};
  const database='sango-saves-regression';
  const oldDatabase='sango-saves-v1-regression';
  await new Promise((resolve,reject)=>{const request=indexedDB.open(oldDatabase,1);request.onupgradeneeded=()=>request.result.createObjectStore('slots');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('slots','readwrite');tx.objectStore('slots').put(initial,'sango-sovereign-v2');tx.oncomplete=()=>{db.close();resolve();};};});
  const upgraded=await openSaveStorage({database:oldDatabase});check(await upgraded.getItem('sango-sovereign-v2')===initial&&!!(await upgraded.entryVersions()).get('sango-sovereign-v2'),'storage metadata upgrade retains exact game bytes');upgraded.close();
  localStorage.setItem('sango-sovereign-v2',initial);
  let store=await openSaveStorage({database});
  check(await store.getItem('sango-sovereign-v2')===initial,'transfer preserves bytes');
  check(localStorage.getItem('sango-sovereign-v2')===null,'legacy removed after commit');
  check(localStorage.getItem('sango-effects-mode')==='full','preferences retained');
  let quota=false;try{localStorage.setItem('sango-sovereign-v2',raw.repeat(Math.ceil(6*1024*1024/raw.length)));}catch(e){quota=e.name==='QuotaExceededError';}check(quota,'control must reproduce localStorage quota');
  await store.setItem('sango-sovereign-v2',raw);
  const one=await writeArchive(store,{name:'自然长局甲',data:raw},validateCampaign),two=await writeArchive(store,{name:'自然长局乙',data:raw},validateCampaign);
  check((await listArchives(store,validateCampaign)).length===3,'automatic and two full manual saves coexist');
  store.close();store=await openSaveStorage({database});
  check(await store.getItem('sango-sovereign-v2')===raw,'automatic survives connection restart');
  check(serializeCampaign(await readArchive(store,one,validateCampaign))===raw,'full history survives manual reload');
  const put=IDBObjectStore.prototype.put;
  const priorToken=(await store.entryVersions()).get('sango-sovereign-v2');
  IDBObjectStore.prototype.put=function(value,key){if(this.name==='slot-versions'){this.transaction.abort();throw new DOMException('injected metadata abort','AbortError');}return put.call(this,value,key);};
  let metadataFailed=false;try{await store.setItem('sango-sovereign-v2',initial);}catch{metadataFailed=true;}finally{IDBObjectStore.prototype.put=put;}
  check(metadataFailed&&await store.getItem('sango-sovereign-v2')===raw&&(await store.entryVersions()).get('sango-sovereign-v2')===priorToken,'metadata and game bytes roll back in the same transaction');
  IDBObjectStore.prototype.put=function(){this.transaction.abort();throw new DOMException('injected abort','AbortError');};
  let failed=false;try{await store.setItem('sango-sovereign-v2',initial);}catch{failed=true;}finally{IDBObjectStore.prototype.put=put;}
  check(failed&&await store.getItem('sango-sovereign-v2')===raw&&store.peek('sango-sovereign-v2')===raw,'aborted overwrite keeps durable data and preview');
  await listArchives(store,validateCampaign);const other=await openSaveStorage({database});
  await writeArchive(other,{key:two,name:'另一窗口覆盖',data:initial},validateCampaign);check((await listArchives(store,validateCampaign)).find(row=>row.key===two)?.name==='另一窗口覆盖','cached summaries notice another connection overwrite');other.close();
  const legacyKey='sango-manual-save-v1:retained',legacyRaw=JSON.stringify({version:1,name:'转存保留',savedAt:1,data:initial});localStorage.setItem(legacyKey,legacyRaw);
  IDBObjectStore.prototype.put=function(value,key){if(key===legacyKey){this.transaction.abort();throw new DOMException('injected migration abort','AbortError');}return put.call(this,value,key);};
  let failedTransfer;try{failedTransfer=await openSaveStorage({database:'sango-saves-failed-transfer'});}finally{IDBObjectStore.prototype.put=put;}
  check((await failedTransfer.keys()).includes(legacyKey)&&await failedTransfer.getItem(legacyKey)===legacyRaw&&localStorage.getItem(legacyKey)===legacyRaw,'failed transfer remains listed and readable');failedTransfer.close();
  const recovered=await openSaveStorage({database:'sango-saves-failed-transfer'});check(await recovered.getItem(legacyKey)===legacyRaw&&localStorage.getItem(legacyKey)===null,'retry clears legacy only after commit');recovered.close();
  await deleteArchive(store,one);check(await store.getItem(one)===null&&await store.getItem(two)!==null,'delete affects only selected slot');
  store.close();return ['storage metadata upgrade preserves game bytes','metadata and payload atomic rollback','cross-window summary invalidation','legacy byte transfer after commit','small preferences retained','localStorage quota reproduced','large automatic and multiple manual slots','restart and complete history','aborted overwrite rollback','failed transfer stays listed and retry preserves bytes','selected-slot deletion'];
 },{raw,initial});
 // Exercise the application path, not just the storage API.
 await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles(file);
 await page.waitForFunction(async()=>{const {openSaveStorage}=await import('./save-storage.mjs');const store=await openSaveStorage();try{return JSON.parse(await store.getItem('sango-sovereign-v2')).campaign.day===41;}finally{store.close();}});
 await page.reload();await page.locator('.sovereign-hud').waitFor();
 const persisted=await page.evaluate(async()=>{const {openSaveStorage}=await import('./save-storage.mjs');const store=await openSaveStorage();try{return await store.getItem('sango-sovereign-v2');}finally{store.close();}});
 assert.equal(JSON.parse(persisted).campaign.day,41);assert.deepEqual(JSON.parse(persisted).campaign.activity,state.campaign.activity);
 await page.locator('[data-action="settings"]').first().click();await page.locator('[data-action="save"]').click();
 await page.locator('#archive-name').fill('界面长局');await page.locator('[data-action="archive-create"]').click();await page.getByRole('heading',{name:'界面长局',exact:true}).waitFor();
 await page.screenshot({path:join(out,'archives.png'),fullPage:true});assert.deepEqual(errors,[]);
 // An actual application write failure must not produce an import-success toast.
 const nextFile=join(out,'next-day.json');await writeFile(nextFile,serializeCampaign(continued));
 await page.locator('#overlay-root [data-action="settings"]').click();
 await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(key==='sango-sovereign-v2'){IDBObjectStore.prototype.put=original;this.transaction.abort();throw new DOMException('injected application abort','AbortError');}return original.call(this,value,key);};});
 await page.locator('#import-file').setInputFiles(nextFile);await page.getByText('本机存档写入失败，原存档已保留，请在设置中导出当前进度',{exact:true}).waitFor();
 const retained=await page.evaluate(async()=>{const {readSavedGame}=await import('./save-storage.mjs');return JSON.parse(await readSavedGame('sango-sovereign-v2')).campaign.day;});assert.equal(retained,41);assert.deepEqual(errors,[]);
 await writeFile(join(out,'result.json'),JSON.stringify({passed:true,campaignVersion:state.campaign.version,day:state.campaign.day,bytes:Buffer.byteLength(raw),checks:[...checks,'current application import, reload and manual save','failed UI write preserves prior day and reports failure','natural deterministic continuation'],errors},null,2));
 console.log('Large-save browser verification passed: '+out);
}finally{await browser?.close();server.kill();}
