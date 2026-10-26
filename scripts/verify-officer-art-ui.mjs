import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {officerActivities} from '../officer-activity.mjs';
import {activityArtScene,OFFICER_ART_KEYS,OFFICER_ART_SOURCE_KEYS} from '../officer-art-scenes.mjs';
import {OFFICER_ASSET_ROOT} from '../asset-workspace.mjs';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),port='4191',out='outputs/officer-art';mkdirSync(out,{recursive:true});
const manifest=JSON.parse(readFileSync(resolve(OFFICER_ASSET_ROOT,'manifest.json'),'utf8')),expectedImages=Object.values(manifest.officers).reduce((n,s)=>n+Object.keys(s).length,0),expectedSources=Object.values(manifest.officers).reduce((n,s)=>n+OFFICER_ART_SOURCE_KEYS.filter(k=>s[k]).length,0);
const indexFile=resolve(OFFICER_ASSET_ROOT,'batches/index.json'),index=existsSync(indexFile)?JSON.parse(readFileSync(indexFile,'utf8')):{batches:[]},latest=index.batches.at(-1);
const batch=latest?JSON.parse(readFileSync(resolve(OFFICER_ASSET_ROOT,'batches',latest+'.json'),'utf8')):{officerIds:[]};
const sampleIds=[...new Set(['cao','person-99','person-290',...batch.officerIds])].filter(id=>manifest.officers[id]);
const s=newCampaign(81,'guandu-200'),save=serializeCampaign(s),activityScene=activityArtScene(officerActivities(s).get('cao'));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},save);
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
 await page.locator('.sovereign-portrait img').evaluate(img=>img.decode());assert.match(await page.locator('.sovereign-portrait img').getAttribute('src'),/assets\/officers\/generated\/v3\/cao\/portrait.png$/);
 // Current campaigns may immediately present existing strategic alerts. Dismiss
 // the real report before measuring read-only officer inspection.
 if(await page.locator('#overlay-root #modal-title').count()){
  assert.equal(await page.locator('#overlay-root #modal-title').innerText(),'战略奏报');
  await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();await page.locator('#overlay-root .modal-backdrop').waitFor({state:'hidden'});
 }
 const before=await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 await page.locator('[data-action="faction-directory"][data-kind="officer"]').click();await page.locator('[data-action="faction-object"][data-id="cao"]').click();
 const face=page.locator('.info-portrait img');await face.evaluate(img=>img.decode());assert.match(await face.getAttribute('src'),/\/cao\/detail.png$/);assert.equal(await face.evaluate(img=>getComputedStyle(img).objectFit),'contain');const standee=await page.locator('.info-portrait').boundingBox();assert.ok(Math.abs(standee.width/standee.height-.4)<.01);await page.screenshot({path:out+'/detail-desktop.png'});
 await page.locator('[data-action="campaign-info-page"][data-page="当前动态"]').click();await face.evaluate(img=>img.decode());assert.equal(await face.getAttribute('src'),await page.evaluate(async scene=>(await import('/art-assets.mjs')).art.portraitURL('cao',scene),activityScene));
 assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);const mobileStandee=await page.locator('.info-portrait').boundingBox();assert.ok(mobileStandee.height<=230&&mobileStandee.y+mobileStandee.height<=844,'complete mobile standee stays in view');await page.screenshot({path:out+'/detail-mobile.png'});
 const component=await browser.newPage({viewport:{width:1440,height:1000}});await component.goto(`http://127.0.0.1:${port}/assets/officers/gallery.html`);
 const sample=component.locator(sampleIds.map(id=>'section[data-officer-id="'+id+'"] img').join(','));await sample.evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode();})));const decodedSampleImages=await sample.count();assert.equal(await component.locator('img').count(),expectedSources);for(const id of sampleIds)await component.locator('section[data-officer-id="'+id+'"]').screenshot({path:out+'/'+id+'-final.png'});
 await component.goto(`http://127.0.0.1:${port}/`);
 const resolved=await component.evaluate(async()=>{const {art}=await import('/art-assets.mjs');await art.init();return {active:art.active,pack:art.pack.id,urls:Object.keys(art.officers).flatMap(id=>Object.keys(art.officers[id]).map(scene=>art.portraitURL(id,scene)))};});
 assert.ok(resolved.active);assert.equal(resolved.pack,'builtin');assert.equal(resolved.urls.length,expectedImages);assert.equal(new Set(resolved.urls).size,expectedImages);
 await component.evaluate(async()=>{
  const {art}=await import('/art-assets.mjs'),{BattleEffects}=await import('/battle-effects.mjs'),{newCampaign}=await import('/strategic-campaign.mjs'),{domesticAlertsMarkup}=await import('/domestic-feedback.mjs');
  const probe=document.createElement('div');probe.id='format-probes';probe.style.cssText='padding:24px;background:#18342b;';probe.innerHTML=domesticAlertsMarkup(newCampaign(81,'guandu-200'),[{id:'art-report-fixture',phase:'complete',category:'domestic',officerId:'cao',siteId:'xuchang',day:1,text:'示例成果奏报',result:{}}]);document.body.append(probe);art.decorate(probe);
  // The probe can be below the viewport; explicitly load its lazy images before decoding.
  await Promise.all([...probe.querySelectorAll('img')].map(async i=>{i.loading='eager';try{await i.decode();}catch(e){throw Error('Report image decode failed: '+i.src,{cause:e});}}));
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=500;canvas.style.cssText='display:block;width:1024px;height:500px;';probe.append(canvas);
  const url=art.portraitURL('cao','battle');art.image(url);await art.images.get(url).decode();const fx=Object.create(BattleEffects.prototype);Object.assign(fx,{canvas,ctx:canvas.getContext('2d'),width:1024,height:500,reduced:true});fx.drawCutIn({events:[{from:'cao',name:'曹操',side:0,label:'魏武之强'}]},.25,'#f6df9e','#c2ae7b');
 });
 const reportFrame=await component.locator('#format-probes .report-portrait').boundingBox();assert.ok(reportFrame.width>0&&reportFrame.height>0);await component.locator('#format-probes canvas').screenshot({path:out+'/battle-wide.png'});await component.locator('#format-probes .report-dispatch').screenshot({path:out+'/report-reused.png'});
 const reuse=await component.evaluate(async()=>{
  const {art}=await import('/art-assets.mjs'),id=Object.keys(art.officers).find(id=>art.officers[id].neutral&&!art.officers[id].neutral.derivedFrom);if(!id)throw Error('需要至少一张已接入的新母图验证裁剪');
  const root=document.createElement('div');root.id='reuse-probes';root.style.cssText='display:flex;gap:20px;padding:20px;background:#20362f';
  root.innerHTML=['roster','detail','domestic','battle'].map(scene=>`<div><p>${scene}</p><div data-art-portrait="${id}" data-art-scene="${scene}" style="width:${scene==='roster'?128:180}px;height:${scene==='detail'?300:scene==='roster'?128:220}px"><span>人物</span></div></div>`).join('');document.body.append(root);art.decorate(root);
  await Promise.all([...root.querySelectorAll('img')].map(i=>{i.loading='eager';return i.decode();}));
  const first=root.querySelector('[data-art-portrait]'),src=first.querySelector('img').getAttribute('src'),faceHeight=parseFloat(first.querySelector('img').style.height);
  first.dataset.artScene='detail';art.decorate(root);await first.querySelector('img').decode();const fullHeight=first.querySelector('img').style.height;
  if(first.querySelector('img').getAttribute('src')!==src||first.dataset.artShape!=='standee'||faceHeight<=128||fullHeight)throw Error('同URL切换用途后裁剪未正确刷新');
  first.dataset.artScene='roster';art.decorate(root);await first.querySelector('img').decode();
  const savedFailed=new Set(art.failed);for(const key of ['work','command'])if(art.officers[id][key])art.failed.add(art.officers[id][key].url);
  art.decorate(root);await Promise.all([...root.querySelectorAll('img')].map(i=>{i.loading='eager';return i.decode();}));
  const fallbackURLs=[...root.querySelectorAll('img')].map(i=>i.getAttribute('src'));
  art.failed=savedFailed;art.decorate(root);await Promise.all([...root.querySelectorAll('img')].map(i=>{i.loading='eager';return i.decode();}));
  const {BattleEffects}=await import('/battle-effects.mjs'),canvas=document.querySelector('#format-probes canvas'),url=art.portraitURL(id,'battle');art.image(url);await art.images.get(url).decode();
  const fx=Object.create(BattleEffects.prototype);Object.assign(fx,{canvas,ctx:canvas.getContext('2d'),width:1024,height:500,reduced:true});fx.ctx.clearRect(0,0,1024,500);fx.drawCutIn({events:[{from:id,name:'王肃',side:0,label:'军务部署'}]},.25,'#f6df9e','#c2ae7b');
  return {id,url:src,fallbackURLs,expectedPoseURLs:['neutral','work','command'].map(key=>art.officers[id][key]?.url||src),views:[...root.querySelectorAll('[data-art-portrait]')].map(el=>({scene:el.dataset.artScene,source:el.dataset.artSource,background:el.dataset.artBackground,src:el.querySelector('img').getAttribute('src')}))};
 });
 assert.equal(new Set(reuse.fallbackURLs).size,1);assert.equal(new Set(reuse.views.map(v=>v.src)).size,new Set(reuse.expectedPoseURLs).size);await component.locator('#reuse-probes').screenshot({path:out+'/mother-reuse-desktop.png'});await component.locator('#format-probes canvas').screenshot({path:out+'/mother-battle.png'});
 await component.setViewportSize({width:390,height:844});await component.locator('#reuse-probes').evaluate(el=>{el.style.flexWrap='wrap';});await component.locator('#reuse-probes').screenshot({path:out+'/mother-reuse-mobile.png'});
 // A fresh page/context makes the simulated 404 a real first image request,
 // rather than accidentally reusing the cut-in image already decoded above.
 const fallback=await browser.newPage();await fallback.route('**/'+manifest.officers.cao.command.url.slice(2),route=>route.fulfill({status:404,body:'missing'}));
 await fallback.goto(`http://127.0.0.1:${port}/`);
 await fallback.evaluate(async()=>{const {art}=await import('/art-assets.mjs');await art.init();const root=document.createElement('div');root.id='art-probe';root.innerHTML='<span data-art-portrait="cao" data-art-scene="battle"><span>曹</span></span>';document.body.append(root);art.decorate(root);});
 await fallback.waitForFunction(expected=>document.querySelector('#art-probe img')?.getAttribute('src')===expected,manifest.officers.cao.neutral.url);
 await fallback.evaluate(async()=>{const {art}=await import('/art-assets.mjs');art.toggle();art.decorate(document.querySelector('#art-probe'));});assert.equal(await fallback.locator('#art-probe img').count(),0);
 assert.deepEqual(errors,[]);writeFileSync(out+'/ui-result.json',JSON.stringify({passed:true,runtimeImages:expectedImages,sourceTargets:expectedSources,decodedSampleImages,sampleIds,reuse,scenes:OFFICER_ART_KEYS,actualActivityScene:activityScene,checks:['retained portrait thumbnails','full standee aspect and contain','real detail and current activity selection','desktop and mobile','current batch and original smoke sample decode','shared report and battle render','same mother URL supplies four views','same URL scene change refreshes crop','failed pose falls back to neutral','switch removes old image','viewing preserves campaign save'],errors},null,2));console.log('PASS three-source reuse, '+expectedImages+' runtime references, '+decodedSampleImages+' decoded samples, same-URL cropping, fallback, read-only desktop/mobile');
}catch(e){if(browser){const page=browser.contexts()[0]?.pages()[0];await page?.screenshot({path:out+'/ui-failure.png'});}throw e;}finally{await browser?.close();server.kill();}
