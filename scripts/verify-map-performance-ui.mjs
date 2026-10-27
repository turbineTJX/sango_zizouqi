import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {PERFORMANCE_BUDGETS} from './performance-budgets.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const baseline=process.argv.includes('--baseline'),out='outputs/map-performance-ui',port='4319';
const sourceSignature=()=>createHash('sha256').update(['art-strategic-map.mjs','map-camera-preview.mjs','strategic-dom.mjs','city-scene.mjs','town-layout.mjs','town-art.mjs','road-network-view.mjs','national-map-view.mjs','metropolitan-map.mjs','city-scene.css','strategic-workspace.css'].map(path=>readFileSync(path,'utf8')).join('\n')).digest('hex');
const signature=sourceSignature();
mkdirSync(out,{recursive:true});
const save=serializeCampaign(newCampaign(81,'guandu-200'));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(process.env.MAP_PROFILE_MODULE){const body=readFileSync(process.env.MAP_PROFILE_MODULE,'utf8');await page.route('**/art-strategic-map.mjs',route=>route.fulfill({body,contentType:'text/javascript'}));}
 await page.addInitScript(save=>{localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},save);
 await page.goto(`http://127.0.0.1:${port}/#strategy`);
 const main=page.locator('.national-world');await main.waitFor();
 if(process.env.MAP_PROFILE_CSS)await page.addStyleTag({content:process.env.MAP_PROFILE_CSS});
 if(!baseline){await main.locator('.ancient-atlas-terrain[data-preview-ready="true"]').waitFor();await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.cameraPreviewReady==='true');}
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
  await frames();
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
 result.sourceSignature=signature;assert.equal(sourceSignature(),signature,'render sources stayed unchanged during measurement');
 result.cpu=Object.fromEntries(metricsAfter.filter(m=>['ScriptDuration','LayoutDuration','RecalcStyleDuration','TaskDuration'].includes(m.name)).map(m=>[m.name,m.value-metricsBefore.find(b=>b.name===m.name).value]));
 assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);
 assert.deepEqual(errors,[]);
 if(!baseline){
  assert.ok(result.frameP95<=PERFORMANCE_BUDGETS.desktop.mapFrameP95Ms,'desktop camera frame budget exceeded: '+result.frameP95);
  assert.ok(Math.abs(result.burstView.height-result.initialView.height*.88**12)<.001,'coalescing retains every wheel zoom step');
  assert.equal(result.burstUpdates,0,'a wheel burst transforms the cached layer without laying out the root SVG');
  assert.equal(result.animationCount,0,'continuous wheel zoom does not restart SVG animations');
  assert.ok(result.sceneCount<10,'zooming does not build panoramas for all surrounding settlements');
  await page.waitForFunction(()=>[...document.querySelectorAll('.ancient-atlas-terrain>g>image')].every(el=>el.getAttribute('href').startsWith('data:image/svg+xml')));
  result.terrainPixelError=await main.evaluate(async svg=>{
   const {nationalTerrain}=await import('/national-map-view.mjs'),terrain=svg.querySelector('.ancient-atlas-terrain');
   const opacity=svg.querySelector('.terrain-relief').style.opacity,provinces=svg.querySelector('.atlas-province-labels').style.opacity;
   const style=`<style>.terrain-relief,.terrain-landscape{opacity:${opacity}!important}.atlas-province-labels{opacity:${provinces}!important}</style>`;
   const pixels=async markup=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 1024 1024">'+style+markup+'</svg>');await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,512,512).data;};
   const a=await pixels(nationalTerrain('summer')),b=await pixels(new XMLSerializer().serializeToString(terrain));
   return a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0)/a.length;
  });
  assert.ok(result.terrainPixelError<2,'isolated terrain preserves the source atlas: '+result.terrainPixelError);
 }
 await page.screenshot({path:`${out}/${baseline?'before':'after'}.png`});
 if(!baseline){
  const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  for(let i=0;i<2;i++){
   await page.locator('[data-map-view="territory"]').click();
   await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.cameraPreviewReady==='true');
  }
  const view=()=>main.evaluate(el=>({x:el.viewBox.baseVal.x,y:el.viewBox.baseVal.y}));
  const beforeDrag=await view(),box=await main.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down({button:'right'});
  await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+35,{steps:8});await page.waitForTimeout(300);
  assert.ok(await main.locator('.ancient-atlas-terrain').evaluate(el=>[...el.querySelectorAll('image')].every(image=>image.getAttribute('href').startsWith('blob:'))),'a held gesture must not return to vector terrain during an input pause');
  assert.ok(await main.evaluate(el=>el.classList.contains('map-camera-moving')),'held gestures retain the movement rendering mode');
  assert.ok(await main.locator('[data-camera-vectors]').evaluate(el=>el.style.display==='none'),'held gestures reuse a texture instead of laying out all map vectors');
  await page.screenshot({path:`${out}/movement.png`});
  await page.mouse.up({button:'right'});await settle();await page.waitForFunction(()=>[...document.querySelectorAll('.ancient-atlas-terrain>g>image')].every(el=>el.getAttribute('href').startsWith('data:image/svg+xml')));
  assert.equal(await main.evaluate(el=>el.classList.contains('map-camera-moving')),false,'full terrain rendering returns after the gesture');
  assert.notDeepEqual(await view(),beforeDrag);
  await main.focus();await page.keyboard.press('Home');await settle();assert.equal(await page.locator('[data-strategy-radar]').count(),0);
  assert.equal(await page.locator('#map-season,[data-map-view="in"],[data-map-view="out"]').count(),0);
  assert.equal(await main.locator('.ancient-atlas-terrain>g>image').count(),4);
  await page.setViewportSize({width:966,height:388});
  assert.ok(await page.locator('.strategy-map-first').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1),'landscape map must fit its actual viewport');
  for(const control of await page.locator('.world-commands button,.world-turn button,.world-toolbar button').all()){
   await control.scrollIntoViewIfNeeded();assert.ok(await control.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1&&(hit===el||el.contains(hit));}),'player commands and their labels remain reachable in short landscape view');
  }
  await page.locator('.world-commands').evaluate(el=>{el.scrollTop=0;});await page.screenshot({path:`${out}/compact-landscape.png`});
  assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);
  assert.deepEqual(errors,[]);
  result.checks=['wheel coalescing without lost steps','no continuous SVG animation','bounded scene loading','terrain pixel comparison','cached movement texture and vector restoration','main-map drag and return to operation focus','removed scenery and zoom buttons','camera leaves save untouched'];
 }
 writeFileSync(`${out}/${baseline?'before':'after'}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
