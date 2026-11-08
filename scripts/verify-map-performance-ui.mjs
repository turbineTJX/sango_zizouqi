import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {PERFORMANCE_BUDGETS} from './performance-budgets.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseline=process.argv.includes('--baseline'),out='outputs/map-performance-ui',port='4319';
const sourceSignature=()=>createHash('sha256').update(['art-strategic-map.mjs','map-label-layout.mjs','map-overview-art.mjs','map-overview-layout.mjs','map-detail-level.mjs','map-camera-renderer.mjs','map-sprite-cache.mjs','map-terrain-tiles.mjs','map-route-editor.mjs','strategic-dom.mjs','city-scene.mjs','town-layout.mjs','town-art.mjs','road-network-view.mjs','national-map-view.mjs','national-geography.mjs','strategic-relief.mjs','ancient-atlas-terrain.mjs','metropolitan-map.mjs','city-scene.css','strategic-workspace.css'].map(path=>readFileSync(path,'utf8')).join('\n')).digest('hex');
const signature=sourceSignature();
const roadSignature=()=>createHash('sha256').update(['road-geometry.mjs','map-landscape.mjs','strategic-movement.mjs','strategic-army-markers.mjs','strategic-scout-model.mjs','map-effect-cache.mjs'].map(path=>readFileSync(path,'utf8')).join('\n')).digest('hex');
const roadSourceSignature=roadSignature();
mkdirSync(out,{recursive:true});
const save=serializeCampaign(newCampaign(81,'guandu-200'));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('map verification server exited: '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(process.env.MAP_PROFILE_MODULE){const body=readFileSync(process.env.MAP_PROFILE_MODULE,'utf8');await page.route('**/art-strategic-map.mjs',route=>route.fulfill({body,contentType:'text/javascript'}));}
 await page.addInitScript(save=>{localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},save);
 await page.goto(`http://127.0.0.1:${port}/#strategy`);
 const main=page.locator('.national-world');await main.waitFor();
 if(process.env.MAP_PROFILE_CSS)await page.addStyleTag({content:process.env.MAP_PROFILE_CSS});
 if(!baseline){
  // The previous renderer waited for its complete screenshot resource before
  // timing. Keep the same warm-resource condition, and report cold input too.
  const cold=await main.evaluate(async svg=>{const b=svg.getBoundingClientRect(),start=performance.now();svg.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:b.x+b.width/2,clientY:b.y+b.height/2,bubbles:true,cancelable:true}));const eventMs=performance.now()-start;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return {eventMs,firstPaintMs:performance.now()-start};});
  await page.locator('[data-map-view="selected"]').click();
  await main.locator('.ancient-atlas-terrain[data-preview-ready="true"]').waitFor();
  await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.mapSpritePending==='0');
  await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.cameraRendererReady==='true');
  await main.evaluate((svg,cold)=>{svg.dataset.coldInput=JSON.stringify(cold);},cold);
 }
 await page.locator('[data-map-view="selected"]').click();
 const saved=await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const metricsBefore=(await cdp.send('Performance.getMetrics')).metrics;
 const result=await main.evaluate(async svg=>{
  const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const box=svg.getBoundingClientRect(),clientX=box.x+box.width/2,clientY=box.y+box.height/2;
  const wheel=deltaY=>svg.dispatchEvent(new WheelEvent('wheel',{deltaY,clientX,clientY,bubbles:true,cancelable:true}));
  const view=()=>svg.dataset.cameraViewBox?Object.fromEntries(svg.dataset.cameraViewBox.split(' ').map((n,i)=>[['x','y','width','height'][i],+n])):Object.fromEntries(['x','y','width','height'].map(k=>[k,svg.viewBox.baseVal[k]]));
  const mutations=[];const observer=new MutationObserver(records=>mutations.push(...records));observer.observe(svg,{attributes:true,subtree:true,childList:true});
  const initialView=view(),start=performance.now();for(let i=0;i<12;i++)wheel(-100);
  const eventMs=performance.now()-start;
  // Inspect the scheduled movement frame. A second frame can arrive after
  // the 180ms idle restoration on a busy host, which is a separate operation.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const burstView=view(),burstUpdates=mutations.filter(r=>r.type==='attributes'&&r.target===svg&&r.attributeName==='viewBox').length;
  mutations.length=0;
  const times=[],frameTimes=[];let last=performance.now(),running=true;
  const sample=t=>{frameTimes.push(t-last);last=t;if(running)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  for(let round=0;round<3;round++)for(const delta of [100,-100])for(let i=0;i<12;i++){
   const t=performance.now();wheel(delta);times.push(performance.now()-t);await frames();
  }
  running=false;observer.disconnect();
  const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))];
  const finalView=view();
  return {eventMs,burstUpdates,burstView,initialView,eventP95:percentile(times,.95),eventMax:Math.max(...times),frameP95:percentile(frameTimes.filter(t=>t>0),.95),frameMax:Math.max(...frameTimes),sceneCount:svg.querySelectorAll('[data-city-scene]>.city-scene').length,animationCount:svg.querySelectorAll('[data-camera-animation]').length,finalView,nodeCount:svg.querySelectorAll('*').length};
 });
 const metricsAfter=(await cdp.send('Performance.getMetrics')).metrics;
 result.coldInput=await main.evaluate(svg=>JSON.parse(svg.dataset.coldInput||'null'));
 result.sourceSignature=signature;result.roadSourceSignature=roadSourceSignature;assert.equal(sourceSignature(),signature,'render sources stayed unchanged during measurement');assert.equal(roadSignature(),roadSourceSignature,'road and landscape sources stayed unchanged during measurement');
 result.cpu=Object.fromEntries(metricsAfter.filter(m=>['ScriptDuration','LayoutDuration','RecalcStyleDuration','TaskDuration'].includes(m.name)).map(m=>[m.name,m.value-metricsBefore.find(b=>b.name===m.name).value]));
 assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);
 assert.deepEqual(errors,[]);
 writeFileSync(`${out}/measurement.json`,JSON.stringify(result,null,2));
 if(!baseline){
  assert.ok(result.frameP95<=PERFORMANCE_BUDGETS.desktop.mapFrameP95Ms,'desktop camera frame budget exceeded: '+result.frameP95);
  assert.ok(Math.abs(result.burstView.height-result.initialView.height*.88**12)<.001,'coalescing retains every wheel zoom step');
  assert.equal(result.burstUpdates,0,'a wheel burst transforms the retained scene without changing the root SVG viewport');
  assert.equal(result.animationCount,0,'continuous wheel zoom does not restart SVG animations');
  assert.ok(result.sceneCount<10,'zooming does not build panoramas for all surrounding settlements');
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-map-terrain-base]')].every(el=>el.getAttribute('href').startsWith('blob:')));
  result.terrainPixelError=await main.evaluate(async svg=>{
   const {nationalTerrain}=await import('/national-map-view.mjs'),terrain=svg.querySelector('.ancient-atlas-terrain');
   const opacity=svg.querySelector('.terrain-relief').style.opacity,landscape=svg.querySelector('.terrain-landscape').style.opacity,provinces=svg.querySelector('.atlas-province-labels').style.opacity;
   const style=`<style>.terrain-relief{opacity:${opacity}!important}.terrain-landscape{opacity:${landscape}!important}.atlas-province-labels{opacity:${provinces}!important}</style>`;
   const pixels=async markup=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 1024 1024">'+style+markup+'</svg>');await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,512,512).data;};
   const copy=terrain.cloneNode(true);
   for(const image of copy.querySelectorAll('image'))if(image.getAttribute('href').startsWith('blob:')){const blob=await(await fetch(image.getAttribute('href'))).blob();image.setAttribute('href',await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);}));}
   const a=await pixels(nationalTerrain('summer')),b=await pixels(new XMLSerializer().serializeToString(copy));
   return a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0)/a.length;
  });
  assert.ok(result.terrainPixelError<2,'isolated terrain preserves the source atlas: '+result.terrainPixelError);
  // Include the transition into movement after detailed vectors were visible,
  // near-city zoom below 90 world units, and pauses between wheel inputs.
  // The old pre-paint idle timer repeatedly restored vectors in these cases.
  result.zoomLevels=[];
  for(const size of [560,180,60]){
   await main.evaluate((svg,size)=>{
    svg.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));
    const box=svg.getBoundingClientRect();for(let i=0;i<Math.round(Math.log(size/560)/Math.log(.88));i++)svg.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:box.x+box.width/2,clientY:box.y+box.height/2,bubbles:true,cancelable:true}));
   },size);
   await page.waitForFunction(()=>!document.querySelector('.national-world').classList.contains('map-camera-moving'));
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const sample=await main.evaluate(async svg=>{
    const box=svg.getBoundingClientRect(),intervals=[],events=[],pauses=[],updates=[],frames=[];
    let sampling=true,last=performance.now();const frame=t=>{if(t>last)frames.push(t-last);last=t;if(sampling)requestAnimationFrame(frame);};requestAnimationFrame(frame);
    const observer=new MutationObserver(records=>updates.push(...records));observer.observe(svg,{attributes:true,attributeFilter:['viewBox']});
    for(let i=0;i<30;i++){
     const start=performance.now();svg.dispatchEvent(new WheelEvent('wheel',{deltaY:i%2?100:-100,clientX:box.x+box.width/2,clientY:box.y+box.height/2,bubbles:true,cancelable:true}));events.push(performance.now()-start);
     await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));intervals.push(performance.now()-start);
     if(i===9||i===19){await new Promise(resolve=>setTimeout(resolve,100));pauses.push(!!svg.dataset.cameraViewBox);}
    }
    sampling=false;await Promise.resolve();observer.disconnect();
    const sorted=[...intervals].sort((a,b)=>a-b);
    const sortedFrames=[...frames].sort((a,b)=>a-b);
    return {intervals,eventMax:Math.max(...events),firstMs:intervals[0],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:Math.max(...intervals),frameP95Ms:sortedFrames[Math.floor(sortedFrames.length*.95)],frameMaxMs:Math.max(...frames),rootUpdates:updates.length,retained:!!svg.querySelector('[data-map-camera-scene]'),pauses,nodeCount:svg.querySelectorAll('*').length};
   });
   result.zoomLevels.push({size,...sample});
   writeFileSync(`${out}/measurement.json`,JSON.stringify(result,null,2));
   assert.equal(sample.rootUpdates,0,'camera movement keeps the SVG viewport fixed at size '+size);
   assert.ok(sample.retained&&sample.pauses.every(Boolean),'scene stays live during near zoom and wheel pauses at size '+size);
   assert.equal(await page.locator('[data-camera-preview]').count(),0,'the map never switches to a whole-world screenshot');
   assert.ok(sample.frameP95Ms<=PERFORMANCE_BUDGETS.desktop.mapFrameP95Ms,'detailed zoom frame budget exceeded at size '+size+': '+sample.frameP95Ms);
  }
 }
 await page.screenshot({path:`${out}/${baseline?'before':'after'}.png`});
 if(!baseline){
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  for(let i=0;i<2;i++){
   await page.locator('[data-map-view="territory"]').click();
   await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.cameraRendererReady==='true');
  }
  assert.equal(await page.locator('[data-map-camera-scene]').count(),1,'changing territory visibility reuses the same scene');
  const view=()=>main.evaluate(el=>el.dataset.cameraViewBox);
  const beforeDrag=await view(),box=await main.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down({button:'right'});
  await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+35,{steps:8});await page.waitForTimeout(300);
  assert.ok(await main.evaluate(el=>!!el.dataset.cameraViewBox),'a held gesture retains the camera during an input pause');
  assert.ok(await main.evaluate(el=>el.classList.contains('map-camera-moving')),'held gestures retain the movement rendering mode');
  assert.ok(await main.locator('[data-map-camera-scene]').evaluate(el=>el.style.opacity!=='0'&&el.style.display!=='none'),'the same interactive scene stays visible while dragging');
  await page.screenshot({path:`${out}/movement.png`});
  await page.mouse.up({button:'right'});await settle();await page.waitForFunction(()=>!document.querySelector('.national-world').classList.contains('map-camera-moving'));
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-map-terrain-base]')].every(el=>el.getAttribute('href').startsWith('blob:')));
  assert.equal(await main.evaluate(el=>el.classList.contains('map-camera-moving')),false,'full terrain rendering returns after the gesture');
  assert.notDeepEqual(await view(),beforeDrag);
  await main.evaluate(svg=>svg.dispatchEvent(new CustomEvent('map-inspect-city',{detail:{id:'xuchang'}})));
  await page.waitForTimeout(250);await main.focus();await page.keyboard.press('-');await settle();
  const building=await main.evaluate(svg=>{
   for(const node of svg.querySelectorAll('.is-town-focused [data-city-building] .city-district-hit')){
    const r=node.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2,hit=document.elementFromPoint(x,y);
    if(hit?.closest('[data-city-building]')===node.closest('[data-city-building]'))return {x,y};
   }
   throw Error('No visible building to inspect');
  });
  await main.evaluate((svg,p)=>svg.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:p.x,clientY:p.y,bubbles:true,cancelable:true})),building);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  assert.ok(await main.evaluate(el=>!!el.dataset.cameraViewBox),'click recovery starts while the movement texture is visible');
  await page.mouse.click(building.x,building.y);
  await page.locator('.city-building-card').waitFor();await page.locator('[data-city-card-close]').click();
  result.clickDuringMovement=true;
  await main.focus();await page.keyboard.press('Home');await settle();assert.equal(await page.locator('[data-strategy-radar]').count(),0);
  await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.mapSpritePending==='0');
  const buildsBefore=await main.getAttribute('data-map-sprite-builds');await page.locator('[data-map-view="selected"]').click();await settle();
  assert.equal(await main.getAttribute('data-map-sprite-builds'),buildsBefore,'unchanged entity art reuses its sprite after refocusing');
  await main.evaluate(svg=>svg.dispatchEvent(new CustomEvent('map-inspect-city',{detail:{id:'xuchang'}})));
  await page.waitForFunction(()=>document.querySelector('.ancient-atlas-terrain')?.dataset.tilePending==='0'&&document.querySelector('.national-world')?.dataset.mapSpritePending==='0',null,{timeout:60000});
  result.cache=await main.evaluate(async svg=>{const {mapSpriteCacheStats}=await import('/map-sprite-cache.mjs'),terrain=svg.querySelector('.ancient-atlas-terrain');return {sprites:mapSpriteCacheStats(),terrainBytes:+terrain.dataset.tileBytes,terrainBuilds:+terrain.dataset.tileBuilds,tiles:terrain.querySelectorAll('[data-terrain-tile]').length,errors:[svg.dataset.mapSpriteError,terrain.dataset.tileError].filter(Boolean)};});
  assert.deepEqual(result.cache.errors,[]);assert.ok(result.cache.tiles>0);assert.ok(result.cache.terrainBytes<=64*1024*1024);assert.ok(result.cache.sprites.bytes<=result.cache.sprites.budget);
  result.spritePixelError=await main.evaluate(async svg=>{
   const {citySceneMarkup}=await import('/city-scene.mjs'),{TOWN_FRAME}=await import('/town-art.mjs'),ns='http://www.w3.org/2000/svg',place=svg.querySelector('.is-town-focused'),model=JSON.parse(place.querySelector('[data-city-model]').textContent);
   const live=place.querySelector('.city-scene').cloneNode(true),original=document.createElementNS(ns,'g');original.innerHTML=citySceneMarkup(model);
   const dynamic='.city-officers,.city-site-labels,.city-scaffold,.town-activity,title,.map-building-hit,.city-district-hit';
   for(const node of [live,original])node.querySelectorAll(dynamic).forEach(n=>n.remove());
   const resources=new Map();for(const node of [live,original])for(const image of node.querySelectorAll('image[href]')){const href=image.getAttribute('href');if(!resources.has(href))resources.set(href,fetch(href).then(r=>r.blob()).then(blob=>new Promise(resolve=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.readAsDataURL(blob);})));}
   for(const node of [live,original])for(const image of node.querySelectorAll('image[href]'))image.setAttribute('href',await resources.get(image.getAttribute('href')));
   const css=[...document.styleSheets].filter(s=>s.href?.endsWith('/city-scene.css')).flatMap(s=>[...s.cssRules].map(r=>r.cssText)).join('\n'),bounds=[-TOWN_FRAME.width*.7,-TOWN_FRAME.height*1.4*.53,TOWN_FRAME.width*1.4,TOWN_FRAME.height*1.4];
   // Compare at the cached sprite's native resolution. Comparing a 1024px
   // sprite resampled to 512 with a direct 512px SVG conflates two filters.
   const size=+place.querySelector('.city-scene [data-map-sprite]').dataset.resolution,height=Math.ceil(size*bounds[3]/bounds[2]);
   const pixels=async node=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="${ns}" class="strategy-world national-world" width="${size}" height="${height}" viewBox="${bounds.join(' ')}"><style>${css}</style>${new XMLSerializer().serializeToString(node)}</svg>`);await img.decode();const c=document.createElement('canvas');c.width=size;c.height=height;c.getContext('2d').drawImage(img,0,0);return c.getContext('2d').getImageData(0,0,size,height).data;};
   const a=await pixels(original),b=await pixels(live);return a.reduce((sum,n,i)=>sum+Math.abs(n-b[i]),0)/a.length;
  });
  assert.ok(result.spritePixelError<2,'entity sprite preserves the original model and ground fade: '+result.spritePixelError);
  result.sharedSprite=await page.evaluate(async()=>{
   const {prepareMapSprites}=await import('/map-sprite-cache.mjs'),ns='http://www.w3.org/2000/svg',fixtures=[];
   try{
    for(let i=0;i<2;i++){
     const svg=document.createElementNS(ns,'svg');svg.style.cssText='position:fixed;left:-2000px;width:100px;height:100px';svg.innerHTML='<g data-x="500" data-y="500"><g class="map-city-model" transform="scale(.1)"><rect x="-20" y="-20" width="40" height="40" fill="#658765"/></g></g>';document.body.append(svg);
     const cache=prepareMapSprites(svg);cache.register(svg.querySelector('.map-city-model'),'shared-resource-check');cache.update({x:400,y:400,width:200,height:200},1,false);fixtures.push({svg,cache});
    }
    const deadline=performance.now()+10000;while(fixtures.some(f=>!f.svg.querySelector('[data-map-sprite]'))){if(performance.now()>deadline)throw Error('Shared sprite preparation timed out');await new Promise(resolve=>setTimeout(resolve,10));}
    return {builds:fixtures.reduce((n,f)=>n+(+f.svg.dataset.mapSpriteBuilds||0),0),shared:fixtures[0].svg.querySelector('[data-map-sprite]').getAttribute('href')===fixtures[1].svg.querySelector('[data-map-sprite]').getAttribute('href')};
   }finally{for(const f of fixtures){f.cache.destroy();f.svg.remove();}}
  });
  assert.deepEqual(result.sharedSprite,{builds:1,shared:true},'simultaneous views share one resource build');
  await page.screenshot({path:out+'/near-detail.png'});
  await page.locator('[data-map-view="selected"]').click();await settle();
  await main.evaluate(svg=>svg.dispatchEvent(new CustomEvent('map-inspect-city',{detail:{id:'xuchang'}})));
  await page.waitForFunction(()=>document.querySelector('.ancient-atlas-terrain')?.dataset.tilePending==='0');
  assert.equal(await main.locator('.ancient-atlas-terrain').getAttribute('data-tile-builds'),String(result.cache.terrainBuilds),'returning to the same region reuses high-resolution terrain tiles');
  await page.locator('[data-map-view="selected"]').click();await settle();
  result.route=await main.evaluate(async(svg,save)=>{
   const {attachMapRouteEditor}=await import('/map-route-editor.mjs'),{mapNode}=await import('/map-node-data.mjs'),state=JSON.parse(save),from='xuchang',target='chenliu';
   globalThis.mapRouteCheck={editor:attachMapRouteEditor(svg.parentElement,state,{from,target,route:[target],candidates:[],edit:(index,id)=>{globalThis.mapRouteCheck.edit={index,id};return true;}})};
   const line=globalThis.mapRouteCheck.editor.line,expected=[from,target].map(id=>{const p=mapNode(state,id);return `${p.x},${p.y}`;}).join(' ');
   return {points:line.getAttribute('points'),expected};
  },save);
  assert.equal(result.route.points,result.route.expected,'routes use world coordinates inside the same camera projection');
  await main.evaluate(svg=>{const b=svg.getBoundingClientRect();svg.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:b.x+b.width/2,clientY:b.y+b.height/2,bubbles:true,cancelable:true}));});await settle();
  const routePoints=await main.evaluate(async svg=>{const {mapNode}=await import('/map-node-data.mjs'),state=JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),surface=svg.querySelector('[data-map-camera-scene]'),p=mapNode(state,'xuchang'),m=surface.getScreenCTM(),to=new DOMPoint(p.x,p.y).matrixTransform(m),handle=svg.querySelector('[data-route-handle="0.5"]'),start=new DOMPoint(0,0).matrixTransform(handle.getScreenCTM());return {start:{x:start.x,y:start.y},to:{x:to.x,y:to.y},diameter:handle.querySelector('.route-handle-hit').getBoundingClientRect().width};});
  assert.ok(Math.abs(routePoints.diameter-16)<.5,'route hit handles retain screen size after zoom');
  await page.mouse.move(routePoints.start.x,routePoints.start.y);await page.mouse.down();await page.mouse.move(routePoints.to.x,routePoints.to.y,{steps:8});await page.mouse.up();
  assert.equal(await page.evaluate(()=>globalThis.mapRouteCheck.edit?.id),'xuchang','waypoint snapping uses the rendered world matrix after zoom');
  await page.evaluate(()=>{globalThis.mapRouteCheck.editor.destroy();delete globalThis.mapRouteCheck;});
  assert.equal(await page.locator('#map-season,[data-map-view="in"],[data-map-view="out"]').count(),0);
  assert.equal(await main.locator('[data-map-terrain-base]').count(),4);
  await page.setViewportSize({width:966,height:388});
  assert.ok(await page.locator('.strategy-map-first').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1),'landscape map must fit its actual viewport');
  for(const control of await page.locator('.world-commands button,.world-turn button,.world-toolbar button').all()){
   await control.scrollIntoViewIfNeeded();assert.ok(await control.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1&&(hit===el||el.contains(hit));}),'player commands and their labels remain reachable in short landscape view');
  }
  await page.locator('.world-commands').evaluate(el=>{el.scrollTop=0;});await page.screenshot({path:`${out}/compact-landscape.png`});
  assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);
  assert.deepEqual(errors,[]);
  result.checks=['wheel coalescing without lost steps','no continuous SVG animation','bounded scene loading','terrain and sprite pixel comparison','regional, settlement and near-city wheel performance including input pauses','retained scene without whole-world screenshots','culled entity geometry','bounded sprite and terrain caches','terrain reuse after revisiting a region','shared resource builds across views','building click during zoom','route projection and waypoint snapping after zoom','main-map drag and return to operation focus','removed scenery and zoom buttons','camera leaves save untouched'];
 }
 assert.equal(sourceSignature(),signature,'render sources stayed unchanged through all interaction checks');assert.equal(roadSignature(),roadSourceSignature,'road sources stayed unchanged through all interaction checks');
 writeFileSync(`${out}/${baseline?'before':'after'}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
