import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {createScenario} from '../scenarios.mjs';
import {planBattleCouncilsAI,lockDeployment} from '../engine.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';
const out='outputs/ui-performance-fix-20261027',port='4368';await mkdir(out,{recursive:true});
const raw=serializeCampaign(newCampaign(81,'guandu-200'));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},raw);
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.cameraPreviewReady==='true');
 await page.evaluate(async()=>{
  const {patchMarkup}=await import('/strategic-dom.mjs'),root=document.createElement('div');
  const markup=model=>`<div class="node-city" data-city="fixture"><script data-city-model type="application/json">${JSON.stringify(model)}</script><svg data-city-scene></svg></div><input value=""><input type="checkbox"><textarea>draft</textarea><select><option value="a" selected>A</option><option value="b">B</option></select>`;
  patchMarkup(root,markup({level:1}));const scene=root.querySelector('[data-city-scene]');scene.innerHTML='<path data-runtime-scene="true" />';
  patchMarkup(root,markup({level:1}));if(!scene.firstChild)throw Error('unchanged city model erased its runtime panorama');
  root.querySelector('input').value='pending';root.querySelector('[type=checkbox]').checked=true;root.querySelector('textarea').value='changed';root.querySelector('select').value='b';
  patchMarkup(root,markup({level:1}));
  if(root.querySelector('input').value!==''||root.querySelector('[type=checkbox]').checked||root.querySelector('textarea').value!=='draft'||root.querySelector('select').value!=='a')throw Error('identical source did not reset controlled form properties');
  patchMarkup(root,markup({level:2}));if(scene.firstChild)throw Error('changed city model retained its old panorama');
  const header=document.createElement('div'),heading=title=>`<header><h2>${title}</h2><button class="close-button" data-action="close">×</button></header>`;
  patchMarkup(header,heading('first'));header.querySelector('header').insertAdjacentHTML('afterbegin','<button data-guide-action="open">指引</button>');
  patchMarkup(header,heading('second'));if(header.querySelectorAll('[data-action="close"]').length!==1||header.querySelector('[data-action="close"]').textContent!=='×')throw Error('runtime sibling replaced the logical close control');
 });
 await page.evaluate(()=>{globalThis.identity={svg:document.querySelector('.national-world'),terrain:document.querySelector('.ancient-atlas-terrain'),preview:document.querySelector('[data-camera-preview]')};});
 for(let i=0;i<3;i++){await page.locator('[data-action="journal"]').first().click();await page.locator('.modal-header [data-action="close"]').click();}
 assert.ok(await page.evaluate(()=>identity.svg===document.querySelector('.national-world')&&identity.terrain===document.querySelector('.ancient-atlas-terrain')&&identity.preview===document.querySelector('[data-camera-preview]')),'read-only close preserves the live map and its decoded texture');
 await page.locator('[data-action="faction-directory"][data-kind="officer"]').click();
 const query=page.locator('#faction-directory-query');await query.fill('曹');await page.waitForTimeout(180);
 const composing=await page.evaluate(async()=>{
  const input=document.querySelector('#faction-directory-query'),before=document.querySelector('.modal-body tbody').textContent;
  input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));input.value='曹操';input.setSelectionRange(2,2);
  input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'操'}));
  await new Promise(resolve=>setTimeout(resolve,180));const unchanged=document.querySelector('.modal-body tbody').textContent===before;
  input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'操'}));input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:false,data:'操'}));return unchanged;
 });assert.ok(composing,'IME composition does not rebuild the result list before committing');
 await page.waitForTimeout(180);assert.equal(await query.inputValue(),'曹操');assert.ok(await query.evaluate(el=>document.activeElement===el&&el.selectionStart===2));
 const filtered=await page.locator('.modal-body tbody').innerText();assert.match(filtered,/曹操/);assert.doesNotMatch(filtered,/夏侯惇/);
 await page.locator('.modal-header [data-action="close"]').click();await page.locator('[data-action="scout-open"]').click();
 await page.locator('.map-command-screen header [data-action="close"]').click();assert.equal(await page.locator('.national-world .ancient-atlas-terrain').count(),1,'return from a command page restores real terrain in one render');
 const archives=await page.evaluate(async raw=>{
  const {ArchiveReader}=await import('/archive-reader.mjs'),{openSaveStorage}=await import('/save-storage.mjs'),{writeArchive,listArchives,readArchive}=await import('/save-archives.mjs'),{validateGameSave}=await import('/game-save-validation.mjs'),{serializeCampaign}=await import('/strategic-campaign.mjs');
  const reader=new ArchiveReader(),options={inspect:(...args)=>reader.inspect(...args)},store=await openSaveStorage({database:'sango-ui-performance-archives'});
  const frames=[];let last=performance.now(),running=true;const frame=t=>{frames.push(t-last);last=t;if(running)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  try{
   for(let i=0;i<3;i++)await writeArchive(store,{name:'snapshot '+i,data:raw},validateGameSave,options);
   const rows=await listArchives(store,validateGameSave,options),loaded=await readArchive(store,rows[0].key,validateGameSave,options);
   return {count:rows.length,valid:rows.every(r=>!r.error),same:serializeCampaign(loaded)===raw,maxFrameMs:Math.max(...frames.filter(t=>t>0))};
  }finally{running=false;reader.destroy();store.close();}
 },raw);
 assert.equal(archives.count,3);assert.ok(archives.valid&&archives.same);assert.ok(archives.maxFrameMs<250,'complete save validation runs outside the UI thread');
 const entry=([id,type])=>({id,type,level:10,troops:4000,retreatAt:null});
 const battle=createScenario('custom-battle',20261026,null,null,{seed:20261026,terrain:'land',ownTeam:[['cao','spear'],['dun','spear'],['liao','cavalry'],['chu','halberd'],['yu','crossbow'],['jia','archer']].map(entry),enemyTeam:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','longbow'],['ju','archer'],['tian','spear']].map(entry)});
 planBattleCouncilsAI(battle.battle,[0,1]);lockDeployment(battle.battle);
 await page.evaluate(async()=>{
  const {BattleArt}=await import('/art-battle.mjs'),{ModelLayer}=await import('/art-models.mjs');
  const update=BattleArt.prototype.update;BattleArt.prototype.update=function(...args){globalThis.artUnderTest=this;return update.apply(this,args);};
  const draw=ModelLayer.prototype.draw;globalThis.modelDraws=0;ModelLayer.prototype.draw=function(...args){modelDraws++;return draw.apply(this,args);};
 });
 await importSaveFixture(page,battle);await page.waitForFunction(()=>globalThis.artUnderTest?.models?.objects.size===12&&artUnderTest.models.batches.batches.size>0);await page.waitForTimeout(700);
 const before=await page.evaluate(()=>modelDraws);await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>modelDraws),before,'paused models stop rendering after their invalidation frame');
 const batched=await page.evaluate(()=>({calls:artUnderTest.models.renderer.info.render.calls,triangles:artUnderTest.models.renderer.info.render.triangles}));
 const canvas=page.locator('.art-models');const a=await canvas.screenshot();await writeFile(out+'/batched.png',a);
 await page.evaluate(()=>{artUnderTest.models.batches.enabled=false;artUnderTest.invalidate();});await page.waitForTimeout(120);
 const ordinary=await page.evaluate(()=>({calls:artUnderTest.models.renderer.info.render.calls,triangles:artUnderTest.models.renderer.info.render.triangles}));
 const b=await canvas.screenshot();await writeFile(out+'/ordinary.png',b);
 const pa=await sharp(a).ensureAlpha().raw().toBuffer(),pb=await sharp(b).ensureAlpha().raw().toBuffer();assert.equal(pa.length,pb.length);
 const pixelError=pa.reduce((sum,value,i)=>sum+Math.abs(value-pb[i]),0)/pa.length;
 assert.ok(pixelError<1.5,'instancing preserves the same model geometry, colors, lighting and pose: '+pixelError);assert.equal(batched.triangles,ordinary.triangles);assert.ok(batched.calls<ordinary.calls*.65,'batching substantially reduces native draw calls without reducing geometry');
 await page.evaluate(()=>{artUnderTest.models.batches.enabled=true;artUnderTest.invalidate();});
 await page.locator('[data-action="pause"]').first().click();await page.waitForTimeout(1000);const resumed=await page.evaluate(()=>modelDraws);assert.ok(resumed>before,'resume wakes the real render loop');
 await page.locator('[data-action="pause"]').first().click();await page.waitForTimeout(500);const stopped=await page.evaluate(()=>modelDraws);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>modelDraws),stopped);
 assert.equal(await page.locator('.battle-playback [data-action="audio-toggle"]').count(),1,'incremental battle updates retain exactly one audio control');
 assert.deepEqual(errors,[]);const result={passed:true,archives,batched,ordinary,pixelError,checks:['read-only close retains map and texture','search preserves final text and caret','command return restores terrain','background archives fully validate and load exact state','paused draw loop sleeps and resumes','instanced and ordinary pixels/triangle counts match']};
 await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
