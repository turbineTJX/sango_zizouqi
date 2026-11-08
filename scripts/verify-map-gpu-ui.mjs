import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const port=4336,out='outputs/map-gpu-ui',save=serializeCampaign(newCampaign(81,'guandu-200'));
await mkdir(out,{recursive:true});
const files=['art-strategic-map.mjs','art-assets.mjs','map-gpu-renderer.mjs','map-gpu-resources.mjs','map-gpu-assets.mjs','map-gpu-city.mjs','map-gpu-geometry.mjs','vendor/pixi/pixi.mjs','map-screen-labels.mjs','map-texture-worker.mjs','map-camera-renderer.mjs','map-route-editor.mjs','town-geometry.mjs','city-scene.mjs','national-map-view.mjs','assets/manifest.json','city-scene.css'];
const fingerprint=async()=>createHash('sha256').update(Buffer.concat(await Promise.all(files.map(f=>readFile(f))))).digest('hex');
const signature=await fingerprint(),server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
const result={sourceSignature:signature,targetFPS:60,frameP95LimitMs:20,scenes:[]};
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('Server exited: '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[],graphicsWarnings=[],requests=[];
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('console',m=>{if(m.text().includes('GPU map fallback'))console.log(m.text());if(/INVALID_|Framebuffer is incomplete|pool key limit/.test(m.text()))graphicsWarnings.push(m.text());});
 await page.addInitScript(save=>{localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));globalThis.__mapRasterCalls=[];for(const name of ['toBlob','toDataURL']){const f=HTMLCanvasElement.prototype[name];HTMLCanvasElement.prototype[name]=function(...args){globalThis.__mapRasterCalls.push(name);return f.apply(this,args);};}},save);
 const start=Date.now();await page.goto('http://127.0.0.1:'+port+'/#strategy');const svg=page.locator('.national-world');await svg.waitFor();
 result.cold=await svg.evaluate(async svg=>{const b=svg.getBoundingClientRect(),t=performance.now();svg.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:b.x+b.width/2,clientY:b.y+b.height/2,bubbles:true,cancelable:true}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {inputToPaintMs:performance.now()-t};});
 try{await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.mapGPUReady==='true',{},{timeout:30000});}catch(e){result.state=await svg.evaluate(s=>({...s.dataset}));result.errors=errors;throw e;}
 result.cold.mapReadyMs=Date.now()-start;await page.screenshot({path:out+'/initial.png'});
 await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.mapSpritePending==='0');
 result.coarseWheel=await svg.evaluate(async svg=>{
  const frames=[],events=[];let last=0,running=true;const sample=t=>{if(last)frames.push(t-last);last=t;if(running)requestAnimationFrame(sample);};requestAnimationFrame(sample);
  const b=svg.getBoundingClientRect();for(let round=0;round<3;round++)for(const delta of [-100,100])for(let i=0;i<12;i++){const t=performance.now();svg.dispatchEvent(new WheelEvent('wheel',{deltaY:delta,clientX:b.x+b.width/2,clientY:b.y+b.height/2,bubbles:true,cancelable:true}));events.push(performance.now()-t);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}running=false;
  const sorted=[...frames].sort((a,b)=>a-b);return {frameP95:sorted[Math.floor(sorted.length*.95)],frameMax:Math.max(...frames),over33:frames.flatMap((t,i)=>t>33.4?[i]:[]),eventMax:Math.max(...events)};
 });
 for(const size of [560,180,60]){
  await svg.evaluate((svg,size)=>{svg.dispatchEvent(new CustomEvent('sango-map-camera',{detail:{view:{x:512-size/2,y:512-size/2,width:size,height:size}}}));},size);
  // The public controller's keyboard reset then real wheel input controls all measurements.
  await page.locator('[data-map-view="selected"]').click();
  await svg.evaluate((svg,size)=>{const view=()=>Object.fromEntries(svg.dataset.cameraViewBox.split(' ').map(Number).map((v,i)=>[['x','y','width','height'][i],v]));const b=svg.getBoundingClientRect();let v=view();const delta=Math.log(size/v.height)*100/Math.log(1/.88);svg.dispatchEvent(new WheelEvent('wheel',{deltaY:delta,clientX:b.x+b.width/2,clientY:b.y+b.height/2,bubbles:true,cancelable:true}));},size);
  await page.waitForTimeout(500);
  try{await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.mapSpritePending==='0',{},{timeout:30000});}catch(e){result.state=await svg.evaluate(s=>({...s.dataset}));throw e;}
  const before=(await cdp.send('Performance.getMetrics')).metrics;
  if(process.env.MAP_GPU_CPU_PROFILE&&size===560){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
  const scene=await svg.evaluate(async(svg,size)=>{
   const frames=[],events=[],longTasks=[],observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask',buffered:false});
   let running=true,last=0;const sample=t=>{if(last)frames.push(t-last);last=t;if(running)requestAnimationFrame(sample);};requestAnimationFrame(sample);
   const b=svg.getBoundingClientRect();for(let i=0;i<120;i++){
    const t=performance.now();svg.dispatchEvent(new WheelEvent('wheel',{deltaY:i%24<12?-5:5,clientX:b.x+b.width*.52,clientY:b.y+b.height*.52,bubbles:true,cancelable:true}));events.push(performance.now()-t);await new Promise(r=>requestAnimationFrame(r));
   }
   running=false;observer.disconnect();const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor(a.length*p)]||0;
   return {size,frameP95:percentile(frames,.95),frameMax:Math.max(...frames),framesOver33:frames.filter(t=>t>33.4).length,frames:frames.length,eventP95:percentile(events,.95),longTasks,domNodes:svg.querySelectorAll('*').length,resources:JSON.parse(svg.dataset.mapGPUStats),view:svg.dataset.cameraViewBox};
  },size);
  const after=(await cdp.send('Performance.getMetrics')).metrics;scene.cpu=Object.fromEntries(after.filter(m=>['ScriptDuration','LayoutDuration','RecalcStyleDuration','TaskDuration'].includes(m.name)).map(m=>[m.name,m.value-before.find(b=>b.name===m.name).value]));
  if(process.env.MAP_GPU_CPU_PROFILE&&size===560){const {profile}=await cdp.send('Profiler.stop');await writeFile(out+'/wide.cpuprofile',JSON.stringify(profile));const top=profile.nodes.filter(n=>n.hitCount).sort((a,b)=>b.hitCount-a.hitCount).slice(0,25).map(n=>({function:n.callFrame.functionName,url:n.callFrame.url.split('/').at(-1),line:n.callFrame.lineNumber+1,hits:n.hitCount}));console.log(JSON.stringify({profile:top}));}
  result.scenes.push(scene);await page.screenshot({path:out+'/size-'+size+'.png'});console.log(JSON.stringify(scene));
 }
 result.rasterCalls=await page.evaluate(()=>globalThis.__mapRasterCalls);
 const settle=()=>page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.mapGPUReady==='true'&&document.querySelector('.national-world')?.dataset.mapSpritePending==='0');
 for(let i=0;i<2;i++)await page.locator('[data-map-view="territory"]').click();
 assert.equal(await page.locator('[data-map-camera-scene]').count(),1);
 const beforeDrag=await svg.getAttribute('data-camera-view-box'),box=await svg.boundingBox();
 await page.mouse.move(box.x+box.width*.55,box.y+box.height*.55);await page.mouse.down({button:'right'});await page.mouse.move(box.x+box.width*.55+70,box.y+box.height*.55+35,{steps:8});await page.mouse.up({button:'right'});
 assert.notEqual(await svg.getAttribute('data-camera-view-box'),beforeDrag);
 await svg.evaluate(s=>s.dispatchEvent(new CustomEvent('map-inspect-city',{detail:{id:'xuchang'}})));await page.waitForTimeout(220);await settle();
 await svg.focus();await page.keyboard.press('-');await page.waitForTimeout(220);await settle();
 const building=await svg.evaluate(svg=>{for(const p of svg.querySelectorAll('.is-town-focused [data-city-building] .city-district-hit')){const r=p.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2,hit=document.elementFromPoint(x,y);if(hit?.closest('[data-city-building]')===p.closest('[data-city-building]'))return {x,y};}throw Error('No visible building hit area');});
 await svg.evaluate((s,p)=>s.dispatchEvent(new WheelEvent('wheel',{deltaY:-20,clientX:p.x,clientY:p.y,bubbles:true,cancelable:true})),building);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));await page.mouse.click(building.x,building.y);await page.locator('.city-building-card').waitFor();await page.screenshot({path:out+'/building.png'});await page.locator('[data-city-card-close]').click();result.buildingClickDuringZoom=true;
 await svg.focus();for(let i=0;i<7;i++)await page.keyboard.press('-');await page.waitForTimeout(220);await settle();
 result.route=await svg.evaluate(async(svg,save)=>{
  const {attachMapRouteEditor}=await import('/map-route-editor.mjs'),{mapNode}=await import('/map-node-data.mjs'),s=JSON.parse(save),from='xuchang',target='chenliu';
  globalThis.__gpuRoute={editor:attachMapRouteEditor(svg.parentElement,s,{from,target,route:[target],candidates:[],edit:(index,id)=>{globalThis.__gpuRoute.edit={index,id};return true;}})};
  return {actual:globalThis.__gpuRoute.editor.line.getAttribute('points'),expected:[from,target].map(id=>{const p=mapNode(s,id);return `${p.x},${p.y}`;}).join(' ')};
 },save);assert.equal(result.route.actual,result.route.expected);
 await svg.evaluate(s=>{const r=s.getBoundingClientRect();s.dispatchEvent(new WheelEvent('wheel',{deltaY:-50,clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));});await page.waitForTimeout(220);
 const handle=await svg.evaluate(async svg=>{const {mapNode}=await import('/map-node-data.mjs'),s=JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),h=svg.querySelector('[data-route-handle="0.5"]'),p=mapNode(s,'xuchang'),to=new DOMPoint(p.x,p.y).matrixTransform(svg.querySelector('[data-map-camera-scene]').getScreenCTM()),start=new DOMPoint(0,0).matrixTransform(h.getScreenCTM());return {start:{x:start.x,y:start.y},to:{x:to.x,y:to.y},diameter:h.querySelector('.route-handle-hit').getBoundingClientRect().width};});
 assert.ok(Math.abs(handle.diameter-16)<.5);await page.mouse.move(handle.start.x,handle.start.y);await page.mouse.down();await page.mouse.move(handle.to.x,handle.to.y,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>globalThis.__gpuRoute.edit?.id),'xuchang');await page.evaluate(()=>globalThis.__gpuRoute.editor.destroy());result.route.snappedAfterZoom=true;
 await page.setViewportSize({width:966,height:388});await page.waitForTimeout(250);assert.ok(await page.locator('.strategy-map-first').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1));await page.screenshot({path:out+'/landscape.png'});
 result.rawTownRequests=requests.filter(url=>/\/assets\/town\//.test(url));result.graphicsWarnings=graphicsWarnings;
 await page.context().setOffline(true);await svg.evaluate(s=>s.dispatchEvent(new CustomEvent('map-inspect-city',{detail:{id:'luoyang'}})));await page.waitForTimeout(400);result.offlineParentFallback=await svg.evaluate(s=>s.dataset.mapGPUReady==='true');if(!result.offlineParentFallback)result.offlineState=await svg.evaluate(s=>({...s.dataset}));assert.ok(result.offlineParentFallback);await page.context().setOffline(false);
 result.savedUnchanged=(await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')))===save;
 result.errors=errors;assert.equal(await fingerprint(),signature);
 await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');
 assert.deepEqual(errors,[]);assert.deepEqual(graphicsWarnings,[]);assert.deepEqual(result.rawTownRequests,[],'source art must be compiled rather than decoded in the live map');assert.deepEqual(result.rasterCalls,[],'GPU map must not rasterize SVG or encode PNG at runtime');assert.ok(result.savedUnchanged);
 for(const scene of result.scenes){assert.equal(scene.resources.backend,'webgl');assert.equal(scene.resources.errors,0);assert.ok(scene.resources.artBytes<=64*1024*1024);assert.ok(scene.resources.terrainBytes<=64*1024*1024);assert.ok(scene.frameP95<=20,'60 FPS frame target missed at '+scene.size+': '+scene.frameP95);}
 assert.ok(result.coarseWheel.frameP95<=20,'mouse wheel frame target missed: '+result.coarseWheel.frameP95);
 const beforeFallback=await svg.evaluate(s=>s.dataset.cameraViewBox);
 const lost=await page.locator('.map-gpu-canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=gl?.getExtension('WEBGL_lose_context');extension?.loseContext();return !!extension;});
 assert.ok(lost);await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.mapGPUDisabled==='true'&&document.querySelector('.ancient-atlas-terrain')?.dataset.previewReady==='true');await page.waitForTimeout(300);assert.deepEqual(errors,[]);assert.equal(await svg.evaluate(s=>s.dataset.cameraViewBox),beforeFallback);assert.equal(await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),save);result.contextLossFallback=true;await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');
 console.log('GPU map verification passed');
}catch(e){await writeFile(out+'/result.json',JSON.stringify({...result,failure:e.stack},null,2)+'\n');throw e;}finally{await browser?.close();server.kill();}
