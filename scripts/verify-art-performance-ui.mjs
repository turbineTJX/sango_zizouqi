import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {serveAssets} from '../asset-server.mjs';
import {ASSET_ROOT,assetFile} from '../asset-workspace.mjs';
import {loadLocalArt,serveLocalArt} from '../local-art-server.mjs';
import {createScenario} from '../scenarios.mjs';
import {planBattleCouncilsAI,lockDeployment} from '../engine.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';

const root=resolve(import.meta.dirname,'..'),out=resolve(root,process.env.ART_PERFORMANCE_OUT||'work/art-performance-fix-20261027');await mkdir(out,{recursive:true});
const sources=['app.js','art-assets.mjs','art-battle.mjs','art-models.mjs','native-model-batches.mjs','game-audio.mjs','officer-voice-player.mjs','asset-server.mjs','asset-archive.mjs','sw.js','presentation-style.mjs','battle-text-cache.mjs','battle-effects.mjs','battle-cinematic.mjs','art-strategic-map.mjs','server.mjs','packaging/desktop.mjs','scripts/release-lib.mjs','scripts/release-worker-source.mjs'];
const fingerprint=async()=>createHash('sha256').update((await Promise.all(sources.map(f=>readFile(resolve(root,f))))).map(b=>b.toString()).join('\n')).digest('hex');
const fileFingerprints=async()=>Object.fromEntries(await Promise.all(sources.map(async f=>[f,createHash('sha256').update(await readFile(resolve(root,f))).digest('hex')])));
const result={date:'2026-10-27',sourceSignature:await fingerprint(),notes:['Read-only runtime audit; no asset files changed.','Static server uses the actual asset/local-art handlers; service workers are blocked for isolated measurements.','Headless Edge measurements describe this machine and workload, not physical phone GPU performance.']};
result.sourceFilesBefore=await fileFingerprints();
const catalog=JSON.parse(await readFile(assetFile('./assets/manifest.json'),'utf8'));
const officers=JSON.parse(await readFile(assetFile(catalog.officers),'utf8'));
result.inventory={officerCount:Object.keys(officers.officers).length,voiceCount:Object.keys(catalog.voices||{}).length,musicCount:Object.keys(catalog.music||{}).length,town:[]};
for(const [group,entries] of Object.entries(catalog.town))for(const [key,url] of Object.entries(entries)){
 const row={key:group+'.'+key,url};try{const path=assetFile(url),s=await stat(path),m=await sharp(path).metadata();Object.assign(row,{bytes:s.size,width:m.width,height:m.height,decodedRgbaMiB:m.width*m.height*4/1048576});}catch(e){row.error=e.code||e.message;}result.inventory.town.push(row);
}
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.bin':'application/octet-stream','.webmanifest':'application/manifest+json'};
const localArt=await loadLocalArt(root),server=createServer(async(req,res)=>{
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(await serveLocalArt(pathname,res,localArt)||await serveAssets(pathname,res,ASSET_ROOT,req.headers))return;const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+sep)||!mime[extname(path)]){res.writeHead(403);res.end();return;}res.writeHead(200,{'Content-Type':mime[extname(path)],'Cache-Control':'no-cache'});res.end(await readFile(path));}catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));new MutationObserver(()=>{if(!globalThis.firstAppAt&&document.querySelector('#app')?.children.length)globalThis.firstAppAt=performance.now();}).observe(document,{subtree:true,childList:true});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>globalThis.firstAppAt);
 result.startupBaselineMs=await page.evaluate(()=>firstAppAt);
 result.repeatedFetch=await page.evaluate(async url=>{
  performance.clearResourceTimings();const rows=[];for(let i=0;i<2;i++){const response=await fetch(url);const bytes=(await response.arrayBuffer()).byteLength;await new Promise(ok=>setTimeout(ok,10));const t=performance.getEntriesByName(new URL(url,location.href).href).at(-1);rows.push({status:response.status,bytes,cacheControl:response.headers.get('cache-control'),etag:response.headers.get('etag'),lastModified:response.headers.get('last-modified'),transferSize:t?.transferSize,durationMs:t?.duration});}return rows;
 },catalog.town.art.arrowTower);
 const delayed=await context.newPage();
 await delayed.route('**/assets/manifest.json',async route=>{await new Promise(ok=>setTimeout(ok,1100));await route.continue();});
 await delayed.route('**/assets/officers/manifest.json',async route=>{await new Promise(ok=>setTimeout(ok,1100));await route.continue();});
 const lateOfficers=delayed.waitForResponse(response=>response.url().endsWith('/assets/officers/manifest.json'));
 await delayed.goto(base);await delayed.waitForFunction(()=>globalThis.firstAppAt);
 result.startupWithTwo1100msManifestDelaysMs=await delayed.evaluate(()=>firstAppAt);
 await delayed.locator('[data-action="settings"]').first().click();
 await delayed.locator('[data-audio-volume="music"]').evaluate(el=>{globalThis.pendingArtInput=el;el.value='23';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await lateOfficers;await delayed.waitForTimeout(150);
 result.lateCatalogPreservesInput=await delayed.evaluate(()=>pendingArtInput===document.querySelector('[data-audio-volume="music"]')&&pendingArtInput.value==='23');assert.ok(result.lateCatalogPreservesInput);await delayed.close();
 {
  const fixture=createScenario('custom-battle',20261027,null,null,{seed:20261027,terrain:'land',ownTeam:[{id:'cao',type:'spear',level:10,troops:4000}],enemyTeam:[{id:'shao',type:'spear',level:10,troops:4000}]});
  const council=await context.newPage();
  for(const path of ['manifest.json','officers/manifest.json'])await council.route('**/assets/'+path,async route=>{await new Promise(ok=>setTimeout(ok,path==='manifest.json'?2200:800));await route.continue();});
  const ready=council.waitForResponse(response=>response.url().endsWith('/assets/officers/manifest.json'));
  await council.goto(base);await importSaveFixture(council,fixture);await council.locator('.retreat-council>summary').click();await council.locator('[data-retreat-batch]').fill('123');
  await council.locator('[data-retreat-batch]').evaluate(el=>{globalThis.draftBeforeArt=el;});
  const saved=await council.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-battle-lab-v1'));
  await ready;await council.waitForTimeout(150);
  result.lateCatalogPreservesCouncil=await council.evaluate(()=>draftBeforeArt===document.querySelector('[data-retreat-batch]')&&draftBeforeArt.value==='123'&&draftBeforeArt.closest('details').open);assert.ok(result.lateCatalogPreservesCouncil);
  assert.equal(await council.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-battle-lab-v1')),saved);await council.close();
 }
 {
  const map=await context.newPage();
  for(const path of ['manifest.json','officers/manifest.json'])await map.route('**/assets/'+path,async route=>{await new Promise(ok=>setTimeout(ok,path==='manifest.json'?2200:800));await route.continue();});
  const ready=map.waitForResponse(response=>response.url().endsWith('/assets/officers/manifest.json'));await map.goto(base);await importSaveFixture(map,serializeCampaign(newCampaign(81,'guandu-200')));await map.locator('.national-world').waitFor();
  const previous=await map.locator('.national-world').evaluate(el=>{globalThis.mapBeforeArt=el;return el.getAttribute('viewBox');});
  const saved=await map.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
  await ready;await map.waitForTimeout(200);result.lateCatalogPreservesMap=await map.locator('.national-world').evaluate((el,previous)=>el===mapBeforeArt&&el.getAttribute('viewBox')===previous,previous);assert.ok(result.lateCatalogPreservesMap);
  assert.equal(await map.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);await map.close();
 }
 result.portraitSynthetic832=await page.evaluate(async()=>{
  const {art,sanitizeOfficerArt}=await import('/art-assets.mjs'),saved=art.officers,pack=art.pack,descriptor=Object.getOwnPropertyDescriptor(art,'active');
  const entries=Object.fromEntries(Array.from({length:832},(_,i)=>{const id=i===0?'cao':'person-'+i;return [id,{neutral:{url:`./assets/officers/generated/v4/${id}/neutral.png`,width:1536,height:2560}}];}));
  art.officers=sanitizeOfficerArt({version:1,id:'original-officers',officers:entries});
  const loops=10000,run=()=>{let n=0;const start=performance.now();for(let i=0;i<loops;i++)n+=!!art.portraitURL('cao',i%2?'battle':'roster');return {ms:performance.now()-start,resolved:n};};
  try{run();const original=Array.from({length:3},run);Object.defineProperty(art,'active',{configurable:true,get:()=>true});run();const cachedActive=Array.from({length:3},run);return {kind:'Synthetic metadata only; no image files fetched or created',officers:Object.keys(art.officers).length,loops,original,cachedActive};}finally{Object.defineProperty(art,'active',descriptor);art.officers=saved;art.pack=pack;}
 });
 result.pausedSpriteLateLoad=await page.evaluate(async assetURL=>{
  const {art}=await import('/art-assets.mjs'),{BattleArt}=await import('/art-battle.mjs');
  const pack=art.pack,url='/local-art/files/aaaaaaaaaaaaaaaaaaaaaaaa.png',host=document.createElement('div');host.style.cssText='position:fixed;width:800px;height:300px;left:0;top:0';document.body.append(host);
  const savedFetch=await fetch(assetURL),blob=await savedFetch.blob(),blobURL=URL.createObjectURL(blob);
  const originalImage=globalThis.Image;let release;
  globalThis.Image=class extends originalImage{set src(value){if(value===url){release=()=>{super.src=blobURL;};}else super.src=value;}get src(){return super.src;}};
  let effectRefreshes=0;const effects={clock:0,actions:[],cinematics:[],currentCinematic:()=>null,currentActions:()=>[],invalidate:()=>effectRefreshes++};
  const view=new BattleArt(host,effects);view.modelLoading=true;let draws=0;const draw=view.draw.bind(view);view.draw=t=>{draws++;draw(t);};
  try{
   art.pack={id:'local-playtest',portraits:{},criticals:{},troops:{spear:{idle:{url,columns:1,rows:1,frames:1,duration:1}}},models:{}};
   const unit={id:'cao',type:'spear',side:0,x:2,y:2,hp:4000,maxHp:4000,status:'active'};
   view.modelPack=art.pack;view.modelLoading=true;const marker=document.createElement('div');marker.dataset.unit='cao';host.append(marker);
   view.update({id:'late-sprite',tick:0,terrain:'land',sides:[{units:[unit]}],effects:[]},{paused:true,speed:1});
   await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));await new Promise(ok=>setTimeout(ok,200));
   const before=draws,image=art.images.get(url);release();await image.decode();await new Promise(ok=>setTimeout(ok,200));
   const after=draws,ready=host.querySelector('[data-unit]').classList.contains('has-unit-art');view.invalidate();await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
   return {kind:'Synthetic delayed sprite; existing image bytes, paused WebGL fallback path',drawsWhileLoadingFinished:after-before,effectRefreshes,effectClock:effects.clock,imageDecoded:!!image.naturalWidth,hasArtBeforeManualInvalidation:ready,hasArtAfterManualInvalidation:host.querySelector('[data-unit]').classList.contains('has-unit-art')};
  }finally{view.destroy();host.remove();URL.revokeObjectURL(blobURL);globalThis.Image=originalImage;art.pack=pack;art.images.delete(url);}
 },catalog.town.art.arrowTower);
 assert.equal(result.pausedSpriteLateLoad.imageDecoded,true);assert.equal(result.pausedSpriteLateLoad.hasArtBeforeManualInvalidation,true);assert.equal(result.pausedSpriteLateLoad.drawsWhileLoadingFinished,1);
 assert.equal(result.pausedSpriteLateLoad.effectRefreshes,1);assert.equal(result.pausedSpriteLateLoad.effectClock,0);
 result.labelPixels=await page.evaluate(async()=>{
  const {BattleEffects}=await import('/battle-effects.mjs'),{BattleTextCache}=await import('/battle-text-cache.mjs');const result=[];
  for(const ratio of [1,2]){
   const canvas=document.createElement('canvas');canvas.width=800*ratio;canvas.height=180*ratio;const ctx=canvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);
   const fx=Object.assign(Object.create(BattleEffects.prototype),{canvas,ctx,width:800,height:180,textCache:new BattleTextCache()});
   const draw=()=>{ctx.clearRect(0,0,800,180);for(const [i,text]of ['暴击 −180','−9999','恢复 +210','免疫'].entries())fx.label(text,100+i*185,80,'#e7d597',.85,12);return ctx.getImageData(0,0,canvas.width,canvas.height).data;};
   const cached=draw();fx.textCache.clear();fx.textCache=null;const direct=draw();result.push({ratio,meanChannelError:cached.reduce((sum,value,i)=>sum+Math.abs(value-direct[i]),0)/cached.length});
  }return result;
 });
 assert.ok(result.labelPixels.every(sample=>sample.meanChannelError<2),'cached labels retain their original font, stroke and placement');
 await page.evaluate(async()=>{
  const {BattleArt}=await import('/art-battle.mjs'),{ModelLayer}=await import('/art-models.mjs');
  const update=BattleArt.prototype.update;BattleArt.prototype.update=function(...args){globalThis.auditArt=this;return update.apply(this,args);};
  const draw=ModelLayer.prototype.draw;globalThis.auditDraws=0;globalThis.auditModelMs=[];ModelLayer.prototype.draw=function(...args){const start=performance.now();const r=draw.apply(this,args);auditModelMs.push(performance.now()-start);auditDraws++;return r;};
 });
 const entry=([id,type])=>({id,type,level:10,troops:4000,retreatAt:null});
 const state=createScenario('custom-battle',20261027,null,null,{seed:20261027,terrain:'land',ownTeam:[['cao','spear'],['dun','spear'],['liao','cavalry'],['chu','halberd'],['yu','crossbow'],['jia','archer']].map(entry),enemyTeam:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','longbow'],['ju','archer'],['tian','spear']].map(entry)});
 planBattleCouncilsAI(state.battle,[0,1]);lockDeployment(state.battle);
 await importSaveFixture(page,state);await page.waitForFunction(()=>globalThis.auditArt?.models?.objects.size===12&&auditArt.models.batches.batches.size>0);await page.waitForTimeout(600);
 const before=await page.evaluate(()=>auditDraws);await page.waitForTimeout(600);result.pausedDrawsDuring600ms=(await page.evaluate(()=>auditDraws))-before;
 result.initialBattle=await page.evaluate(()=>({models:auditArt.models.objects.size,calls:auditArt.models.renderer.info.render.calls,triangles:auditArt.models.renderer.info.render.triangles}));
 if(process.env.ART_PROFILE_CSS){await page.addStyleTag({content:process.env.ART_PROFILE_CSS});result.profileCSS=process.env.ART_PROFILE_CSS;}
 assert.equal(result.pausedDrawsDuring600ms,0);
 result.graphics=await page.evaluate(()=>{const gl=auditArt.models.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {vendor:debug&&gl.getParameter(debug.UNMASKED_VENDOR_WEBGL),renderer:debug&&gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),devicePixelRatio};});
 await page.locator('[data-action="pause"]').first().click();
 await page.evaluate(()=>{globalThis.auditFrames=[];globalThis.auditModelMs=[];globalThis.auditSampling=true;let last=performance.now();const sample=t=>{auditFrames.push(t-last);last=t;if(auditSampling)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 await page.waitForTimeout(4000);
 result.desktopPlayback=await page.evaluate(()=>{auditSampling=false;const stats=a=>{const sorted=a.filter(x=>x>0).sort((a,b)=>a-b);return {count:sorted.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};};return {framesMs:stats(auditFrames),modelDrawCpuMs:stats(auditModelMs),calls:auditArt.models.renderer.info.render.calls,triangles:auditArt.models.renderer.info.render.triangles};});
 const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Profiler.enable');const metricsBefore=(await cdp.send('Performance.getMetrics')).metrics;await cdp.send('Profiler.start');await page.waitForTimeout(3000);const {profile}=await cdp.send('Profiler.stop'),metricsAfter=(await cdp.send('Performance.getMetrics')).metrics;
 await writeFile(resolve(out,'playback-profile.json'),JSON.stringify(profile));
 const selfTimes=new Map(),byId=new Map(profile.nodes.map(n=>[n.id,n]));for(let i=0;i<(profile.samples||[]).length;i++){const frame=byId.get(profile.samples[i])?.callFrame,key=(frame?.functionName||'(anonymous)')+' '+(frame?.url?.replace(base,'')||'');selfTimes.set(key,(selfTimes.get(key)||0)+(profile.timeDeltas[i]||0)/1000);}
 result.playbackProfile={durationMs:(profile.endTime-profile.startTime)/1000,topSelfMs:[...selfTimes].sort((a,b)=>b[1]-a[1]).slice(0,18),cpu:Object.fromEntries(metricsAfter.filter(m=>['ScriptDuration','LayoutDuration','RecalcStyleDuration','TaskDuration'].includes(m.name)).map(m=>[m.name,m.value-metricsBefore.find(b=>b.name===m.name).value]))};await cdp.detach();
 await page.locator('[data-action="pause"]').first().click();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);
 result.mobileViewportBattle=await page.evaluate(()=>({calls:auditArt.models.renderer.info.render.calls,triangles:auditArt.models.renderer.info.render.triangles,visibleMembers:[...auditArt.models.objects.values()].filter(o=>o.troopRig).map(o=>o.troopRig.filter(r=>r.member.visible).length)}));
 await page.screenshot({path:resolve(out,'battle-mobile.png')});await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(100);await page.screenshot({path:resolve(out,'battle-desktop.png')});
 result.pageErrors=errors;result.sourceSignatureUnchanged=result.sourceSignature===await fingerprint();result.sourceFilesAfter=await fileFingerprints();result.changedSources=sources.filter(f=>result.sourceFilesBefore[f]!==result.sourceFilesAfter[f]);
 assert.deepEqual(errors,[]);assert.ok(result.sourceSignatureUnchanged,'sources stayed unchanged during measurement');assert.ok(result.repeatedFetch[1].transferSize<1000,'warm image request transfers validation metadata only');assert.ok(result.startupWithTwo1100msManifestDelaysMs<2000,'optional art does not block the first screen');
 await writeFile(resolve(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
