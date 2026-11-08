import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';
import {prepareDesktopPreview} from './start-desktop.mjs';
const out=join(process.cwd(),'.local','verify-map-gpu-desktop-'+Date.now()),profile=join(out,'profile');await mkdir(profile,{recursive:true});
const prepared=await prepareDesktopPreview();let application;
try{
 application=await _electron.launch({executablePath:prepared.executablePath,args:[prepared.stage],env:{...prepared.env,SANGO_VERIFY:'1',SANGO_USER_DATA:profile},timeout:60000});
 let page=await application.firstWindow();const errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))warnings.push(m.text());});
 await application.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())w.webContents.setBackgroundThrottling(false);});
 await page.waitForLoadState('domcontentloaded');assert.equal(await page.evaluate(()=>location.origin),'sango://game');
 await page.locator('[data-action="strategy"]').click();
 await page.locator('button[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();
 await page.locator('button[data-action="select-national-faction"][data-faction="cao"]').click();
 await page.locator('[data-action="launch-national"]').click();
 await page.locator('.national-world').waitFor();
 // A hidden regular window throttles RAF. An offscreen native window exercises
 // the same signed-origin code, CSP, worker and local art without showing a test UI.
 const probe=application.waitForEvent('window');await application.evaluate(({BrowserWindow},preload)=>{const w=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{preload,offscreen:true,backgroundThrottling:false,nodeIntegration:false,contextIsolation:true,sandbox:true}});w.webContents.setFrameRate(60);void w.loadURL('sango://game/#strategy');},join(prepared.stage,'preload.cjs'));page=await probe;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))warnings.push(m.text());});
 try{await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.mapGPUReady==='true'&&document.querySelector('.national-world')?.dataset.mapSpritePending==='0',null,{timeout:30000});}catch(error){const state=await page.evaluate(()=>({url:location.href,body:document.body.innerText.slice(0,1500),map:document.querySelector('.national-world')?.dataset}));await writeFile(join(out,'failure.json'),JSON.stringify({state,errors,warnings},null,2));console.log(JSON.stringify({out,state,errors,warnings}));throw error;}
 const initialSave=await page.evaluate(async()=>await(await import('./save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const result=await page.locator('.national-world').evaluate(async svg=>{
  const times=[];let last=0,running=true;const frame=t=>{if(last)times.push(t-last);last=t;if(running)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  const b=svg.getBoundingClientRect();for(let i=0;i<90;i++){svg.dispatchEvent(new WheelEvent('wheel',{deltaY:i%18<9?-5:5,clientX:b.x+b.width/2,clientY:b.y+b.height/2,bubbles:true,cancelable:true}));await new Promise(r=>requestAnimationFrame(r));}running=false;
  const sorted=[...times].sort((a,b)=>a-b);return {frameP95:sorted[Math.floor(sorted.length*.95)],frameMax:Math.max(...times),resources:JSON.parse(svg.dataset.mapGPUStats)};
 });
 assert.equal(result.resources.backend,'webgl');assert.equal(result.resources.errors,0);assert.deepEqual(errors,[]);
 assert.equal(await page.evaluate(async()=>await(await import('./save-storage.mjs')).readSavedGame('sango-sovereign-v2')),initialSave);
 await page.screenshot({path:join(out,'map.png')});await writeFile(join(out,'result.json'),JSON.stringify({...result,errors,codeRevision:prepared.revision},null,2)+'\n');console.log(JSON.stringify({out,...result}));
}finally{await application?.close();}
