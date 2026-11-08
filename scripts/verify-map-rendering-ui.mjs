import {mapResourcesReady} from './map-camera-ui-helpers.mjs';
import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../tests/helpers/auto-domestic-campaign.mjs';
import {dispatchScout} from '../scouting.mjs';
import {scoutCandidates,scoutTargets} from '../scouting.mjs';
import {resumePlayerTime,pausePlayerTime} from './time-control-ui-helpers.mjs';

const out='outputs/map-rendering-ui';mkdirSync(out,{recursive:true});
const campaign=newCampaign(81,'guandu-200'),city=campaign.cities.find(c=>c.id==='xuchang');
const officer=scoutCandidates(campaign,city.id,'cao')[0],target=scoutTargets(campaign,city.id)[0];
const error=dispatchScout(campaign,city.id,officer.unit.id,target.id);if(error)throw Error(error);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4391'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(process.env.MAP_RENDER_MODULE){const body=readFileSync(process.env.MAP_RENDER_MODULE,'utf8');await page.route('**/art-strategic-map.mjs',route=>route.fulfill({body,contentType:'text/javascript'}));}
 await page.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(campaign));
 await page.goto('http://127.0.0.1:4391/#strategy');await page.waitForFunction(mapResourcesReady);
 for(let i=0;i<4&&await page.locator('.modal .close-button').count();i++)await page.locator('.modal .close-button').last().click();
 const map=page.locator('.national-world');
 const saved=await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 if(process.env.MAP_RENDER_CSS)await page.addStyleTag({content:process.env.MAP_RENDER_CSS});
 const result={errors,samples:[],panels:[]};
 const cdp=await page.context().newCDPSession(page);if(process.env.MAP_RENDER_TRACE)await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline',transferMode:'ReturnAsStream'});
 for(let i=0;i<3;i++){
  const start=Date.now();await page.locator('[data-action="journal"]').first().click();await page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));result.panels.push(Date.now()-start);
  await page.locator('.modal-header [data-action="close"]').click();
 }
 console.log(JSON.stringify({panels:result.panels}));
 if(process.env.MAP_RENDER_TRACE){const done=new Promise(ok=>cdp.once('Tracing.tracingComplete',ok));await cdp.send('Tracing.end');const {stream}=await done;let trace='';for(;;){const r=await cdp.send('IO.read',{handle:stream});trace+=r.data;if(r.eof)break;}await cdp.send('IO.close',{handle:stream});writeFileSync(out+'/timeline.json',trace);}
 for(const [name,size]of [['region',560],['settlement',180],['interior',60]]){
  await map.evaluate((svg,size)=>{svg.focus();svg.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));const box=svg.getBoundingClientRect();for(let i=0;i<Math.round(Math.log(size/560)/Math.log(.88));i++)svg.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:box.x+box.width/2,clientY:box.y+box.height/2,bubbles:true,cancelable:true}));},size);
  await page.waitForTimeout(600);
  const sample=await map.evaluate(async svg=>{
   const frames=[],events=[],box=svg.getBoundingClientRect();let previous=performance.now();
   for(let i=0;i<18;i++){
    const start=performance.now();svg.dispatchEvent(new WheelEvent('wheel',{deltaY:i%2?100:-100,clientX:box.x+box.width/2,clientY:box.y+box.height/2,bubbles:true,cancelable:true}));events.push(performance.now()-start);
    await new Promise(resolve=>requestAnimationFrame(resolve));const now=performance.now();frames.push(now-previous);previous=now;
   }
   return {frames,eventMax:Math.max(...events),nodes:svg.querySelectorAll('*').length,view:svg.dataset.cameraViewBox||svg.getAttribute('viewBox')};
  });
  result.samples.push({name,...sample});console.log(JSON.stringify({name,max:Math.max(...sample.frames),p95:[...sample.frames].sort((a,b)=>a-b)[Math.floor(sample.frames.length*.95)]}));
 }
 await page.waitForTimeout(400);await page.screenshot({path:out+'/interior.png'});
 await page.locator('[data-map-view="selected"]').click();await page.screenshot({path:out+'/scout.png'});
 result.scout=await page.locator('[data-scout-task]').first().evaluate(el=>({text:el.textContent,rect:el.getBoundingClientRect().toJSON(),model:el.querySelector('.army-march-company')?.getBoundingClientRect().toJSON()}));
 assert.match(result.scout.text,/曹军斥候/);assert.ok(result.scout.model.width>35);
 assert.equal(await page.locator('[data-scout-task] .army-portrait-fallback').count(),0);
 assert.equal(await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved,'camera and inspections leave the save untouched');
 if(!process.env.MAP_RENDER_MODULE){
  result.effectCache=await page.evaluate(async()=>{
   const {prepareMapEffects}=await import('/map-effect-cache.mjs'),ns='http://www.w3.org/2000/svg',fixture=document.createElementNS(ns,'svg');
   fixture.setAttribute('viewBox','0 0 1024 1024');fixture.setAttribute('width','512');fixture.setAttribute('height','512');
   fixture.style.cssText='position:fixed;left:-2000px;top:0';
   fixture.innerHTML='<defs><filter id="effect-fixture-blur"><feGaussianBlur stdDeviation="2"/></filter><radialGradient id="effect-fixture-edge"><stop stop-color="black"/><stop offset="1" stop-color="white"/></radialGradient><mask id="effect-fixture-mask"><rect width="1024" height="1024" fill="white"/><circle cx="500" cy="500" r="180" fill="url(#effect-fixture-edge)"/></mask></defs><g class="map-territories"><polygon points="100,100 900,150 800,900 200,850" fill="#719f84"/></g><g class="war-fog" filter="url(#effect-fixture-blur)"><rect width="1024" height="1024" fill="#515a55" opacity=".28" mask="url(#effect-fixture-mask)"/></g>';
   document.body.append(fixture);
   const territory=fixture.querySelector('.map-territories'),polygon=territory.firstChild,fog=fixture.querySelector('.war-fog'),rect=fog.firstChild;
   const style=getComputedStyle(polygon);for(const key of ['stroke','stroke-width','stroke-opacity','vector-effect'])polygon.setAttribute(key,style.getPropertyValue(key));
   const serialize=()=>new XMLSerializer().serializeToString(fixture),before=serialize();
   const pixels=async markup=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(markup);await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,512,512).data;};
   const restore=prepareMapEffects(fixture);
   try{
    const deadline=performance.now()+10000;while(![...fixture.querySelectorAll('[data-map-effect-texture]')].every(n=>n.dataset.mapEffectReady==='true')){if(performance.now()>deadline)throw Error('Effect textures did not decode');await new Promise(ok=>setTimeout(ok,20));}
    // SVG images cannot reference blob resources when used as canvas sources.
    const copy=fixture.cloneNode(true);for(const image of copy.querySelectorAll('image')){const blob=await(await fetch(image.getAttribute('href'))).blob();image.setAttribute('href',await new Promise(ok=>{const reader=new FileReader();reader.onload=()=>ok(reader.result);reader.readAsDataURL(blob);}));}
    const a=await pixels(before),b=await pixels(new XMLSerializer().serializeToString(copy)),pixelError=a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0)/a.length;
    restore();return {pixelError,restored:territory.firstChild===polygon&&fog.firstChild===rect&&serialize()===before};
   }finally{fixture.remove();}
  });
  assert.ok(result.effectCache.pixelError<2,'cached fog and territory preserve source pixels');assert.equal(result.effectCache.restored,true);
  console.log(JSON.stringify({effectCache:result.effectCache}));
 }
 writeFileSync(out+'/'+(process.env.MAP_RENDER_LABEL||'measurement')+'.json',JSON.stringify(result,null,2));
 if(!process.env.MAP_RENDER_MODULE){
  const scoutId=campaign.campaign.scouting.tasks[0].id,scout=page.locator(`[data-scout-task="${scoutId}"]`);
  await resumePlayerTime(page);
  for(let i=0;i<5;i++){
   await page.waitForFunction(id=>document.querySelector(`[data-scout-task="${id}"].is-playing-march`)||document.querySelector('.modal'),scoutId);
   if(await scout.evaluate(el=>el.classList.contains('is-playing-march')))break;
   if(!await page.locator('.modal').count())break;
   await page.locator('.modal [data-action="close"]').first().click();await resumePlayerTime(page);
  }
  await page.waitForFunction(id=>document.querySelector(`[data-scout-task="${id}"]`)?.classList.contains('is-playing-march'),scoutId);
  result.playback=await scout.evaluate(node=>({state:node.dataset.armyState,path:node._marchMotion.points.length,animations:node.getAnimations({subtree:true}).length,legAnimation:getComputedStyle(node.querySelector('.scout-leg-near')).animationName}));
  assert.equal(result.playback.state,'marching');assert.ok(result.playback.path>=2);assert.equal(result.playback.legAnimation,'scout-stride');
  await page.screenshot({path:out+'/scout-marching-desktop.png'});
  if(await page.locator('.modal [data-action="close"]').count())await page.locator('.modal [data-action="close"]').first().click();
  await pausePlayerTime(page);await page.waitForFunction(()=>!document.querySelector('.is-playing-march'));
  await page.setViewportSize({width:390,height:844});await page.locator('[data-map-view="selected"]').click();
  await page.screenshot({path:out+'/scout-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await scout.focus();await page.keyboard.press('Enter');await page.locator('.scouting-screen').waitFor();
  await page.locator('.map-command-screen header [data-action="close"]').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.scout-leg-near').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 }
 assert.deepEqual(errors,[]);
 writeFileSync(out+'/'+(process.env.MAP_RENDER_LABEL||'measurement')+'.json',JSON.stringify(result,null,2));
}catch(error){await page?.screenshot({path:out+'/failure.png'});console.error(error.message);throw error;}finally{await browser?.close();server.kill();}
