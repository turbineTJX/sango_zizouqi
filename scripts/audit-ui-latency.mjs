// Measure real UI handlers in an isolated browser profile. Timing wrappers are
// served through test routes; production modules and user saves are not edited.
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {createScenario} from '../scenarios.mjs';
import {planBattleCouncilsAI,lockDeployment} from '../engine.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';
const mode=process.argv.find(a=>a.startsWith('--mode='))?.slice(7)||'all';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'outputs/ui-latency-audit-20261027'+(mode==='all'?'':'/'+mode),port='4367';await mkdir(out,{recursive:true});
const initial=newCampaign(81,'guandu-200');initial.campaign.domestic.autoApprove=true;
const nationalRaw=serializeCampaign(initial);
const entry=([id,type])=>({id,type,level:10,troops:4000,retreatAt:null});
const battle=createScenario('custom-battle',20261026,null,null,{seed:20261026,terrain:'land',
 ownTeam:[['cao','spear'],['dun','spear'],['liao','cavalry'],['chu','halberd'],['yu','crossbow'],['jia','archer']].map(entry),
 enemyTeam:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','longbow'],['ju','archer'],['tian','spear']].map(entry)});
planBattleCouncilsAI(battle.battle,[0,1]);lockDeployment(battle.battle);
const exported={
 'national-map-view.mjs':['nationalArtMap'], 'strategic-view.mjs':['strategicView'],
 'art-strategic-map.mjs':['attachStrategicMap','detachStrategicMap'],
 'strategic-dom.mjs':['patchStrategicDOM'],'map-camera-preview.mjs':['prepareMapCameraPreview'],
 'strategic-campaign.mjs':['serializeCampaign','validateCampaign'],'engine.mjs':['stepBattle']
};
const classes={'art-battle.mjs':{BattleArt:['draw','measure','update']},'art-models.mjs':{ModelLayer:['draw']},'battle-effects.mjs':{BattleEffects:['draw']},'battle-labels.mjs':{BattleLabels:['layout']}};
const sources={},hashes={};
for(const file of ['app.js',...Object.keys(exported),...Object.keys(classes),'art-assets.mjs','presentation-style.mjs','native-model-batches.mjs','archive-reader.mjs','campaign-runner.mjs','campaign-worker.mjs','game-save-validation.mjs','save-archives.mjs']){
 let body=await readFile(file,'utf8');hashes[file]=createHash('sha256').update(body).digest('hex');
 for(const name of exported[file]||[]){
  const from='export function '+name+'(';
  if(!body.includes(from))throw Error('Timing target missing: '+file+' '+name);
  body=body.replace(from,'function __audit_'+name+'(')+`\nexport function ${name}(...args){return globalThis.__uiAudit?__uiAudit.call('${name}',__audit_${name},args,this):__audit_${name}.apply(this,args);}\n`;
 }
 for(const [type,methods]of Object.entries(classes[file]||{}))for(const method of methods){
  body+=`\n{const original=${type}.prototype.${method};${type}.prototype.${method}=function(...args){const a=globalThis.__uiAudit;if(!a)return original.apply(this,args);${type==='ModelLayer'&&method==='draw'?`a.modelInfo={objects:this.objects.size,calls:this.renderer?.info.render.calls,triangles:this.renderer?.info.render.triangles};if(!a.renderer&&this.renderer){const gl=this.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');a.renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}`:''}return a.call('${type}.${method}',original,args,this);};}\n`;
 }
 if(file==='app.js'){
  const timing=['render','renderModal','updateBattle','save','act','openModal','refreshArchives'].map(name=>`${name}=__uiAudit.wrap('${name}',${name});`).join('\n');
  body+=`\n${timing}\nart.decorate=__uiAudit.wrap('art.decorate',art.decorate);\n__uiAudit.snapshot=()=>({day:state.campaign?.day,tick:state.battle?.tick,paused:ui.paused,modal:ui.modal,speed:ui.speed,computing:ui.campaignComputing});\n`;
 }
 sources[file]=body;
}
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;const result={date:'2026-10-27',browser:'Microsoft Edge headless',complete:false,sourceHashes:hashes,steps:[],errors:[]};
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 async function open(raw,route,key){
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage();
  await context.route('**/*',async request=>{const file=new URL(request.request().url()).pathname.slice(1);if(sources[file])await request.fulfill({body:sources[file],contentType:'text/javascript'});else await request.continue();});
  await page.addInitScript(({raw,key})=>{
   localStorage.setItem(key,raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
   const a=globalThis.__uiAudit={tag:'initial',calls:[],longTasks:[],frames:[],stack:[],renderer:null,modelInfo:null};
   a.call=(name,fn,args,receiver)=>{
    const frame={children:0},start=performance.now(),tag=a.tag;a.stack.push(frame);let value;
    try{value=fn.apply(receiver,args);return value;}
    finally{const ms=performance.now()-start;a.stack.pop();if(a.stack.length)a.stack.at(-1).children+=ms;
     a.calls.push({tag,name,ms,selfMs:Math.max(0,ms-frame.children)});
     if(value?.then)value.then(()=>a.calls.push({tag,name:name+':complete',ms:performance.now()-start,selfMs:0}),()=>{});
    }
   };
   a.wrap=(name,fn)=>function(...args){return a.call(name,fn,args,this);};
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(...args){return this.canvas.width===2048&&this.canvas.height===2048?a.call('raster-2048',draw,args,this):draw.apply(this,args);};
   new PerformanceObserver(list=>{for(const e of list.getEntries())a.longTasks.push({tag:a.tag,ms:e.duration,start:e.startTime});}).observe({type:'longtask',buffered:true});
   let last=performance.now();const sample=t=>{a.frames.push({tag:a.tag,ms:t-last});last=t;requestAnimationFrame(sample);};requestAnimationFrame(sample);
  },{raw,key});
  page.on('pageerror',error=>result.errors.push(error.message));
  const start=Date.now();await page.goto(`http://127.0.0.1:${port}/${route}`);
  await page.locator(route==='#strategy'?'.national-world':'#battle-board').waitFor();
  if(route==='#strategy')await page.waitForFunction(()=>document.querySelector('.national-world')?.dataset.cameraPreviewReady==='true');
  await page.waitForTimeout(800);
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  return {context,page,cdp,startupMs:Date.now()-start};
 }
 async function measure(session,label,action,settle=700){
  const {page,cdp}=session;await page.evaluate(label=>{__uiAudit.tag=label;},label);
  const before=(await cdp.send('Performance.getMetrics')).metrics,start=Date.now();await action();
  await page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));const actionMs=Date.now()-start;
  await page.waitForTimeout(settle);
  const after=(await cdp.send('Performance.getMetrics')).metrics;
  const detail=await page.evaluate(label=>{
   const a=__uiAudit,calls=a.calls.filter(c=>c.tag===label),byName=new Map();
   for(const c of calls){const row=byName.get(c.name)||{name:c.name,count:0,totalMs:0,selfMs:0,maxMs:0};row.count++;row.totalMs+=c.ms;row.selfMs+=c.selfMs;row.maxMs=Math.max(row.maxMs,c.ms);byName.set(c.name,row);}
   const frames=a.frames.filter(f=>f.tag===label&&f.ms>0).map(f=>f.ms).sort((a,b)=>a-b),tasks=a.longTasks.filter(t=>t.tag===label);
   return {calls:[...byName.values()].sort((a,b)=>b.selfMs-a.selfMs),longTaskCount:tasks.length,longTaskMaxMs:Math.max(0,...tasks.map(t=>t.ms)),frameP95Ms:frames[Math.floor(frames.length*.95)],frameMaxMs:frames.at(-1),snapshot:a.snapshot(),renderer:a.renderer,modelInfo:a.modelInfo,portraits:document.querySelectorAll('img[data-officer-art]').length,nodes:document.querySelectorAll('*').length};
  },label);
  const metrics=Object.fromEntries(after.filter(m=>['LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration','JSHeapUsedSize'].includes(m.name)).map(m=>[m.name,m.name==='JSHeapUsedSize'?m.value:m.value-before.find(b=>b.name===m.name).value]));
  const row={label,actionMs,...detail,metrics};result.steps.push(row);await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({label,actionMs,longTaskMaxMs:row.longTaskMaxMs,frameMaxMs:row.frameMaxMs,top:row.calls.slice(0,4)}));
 }
 if(mode!=='battle'){
 const map=await open(nationalRaw,'#strategy','sango-sovereign-v2');result.mapStartupMs=map.startupMs;
 const close=async()=>{
  for(let i=0;i<4;i++){
   if(await map.page.locator('.modal-backdrop').count())await map.page.locator('.modal-header [data-action="close"]').last().click();
   else if(await map.page.locator('.map-command-screen [data-action="close"]').count())await map.page.locator('.map-command-screen [data-action="close"]').click();
   else break;
  }
 };
 await measure(map,'map-idle',async()=>{},1600);
 if(mode==='cache'){
  for(let i=0;i<3;i++){await measure(map,'cache-open-'+i,()=>map.page.locator('[data-action="journal"]').first().click());await measure(map,'cache-close-'+i,close,1400);}
 }else{
 for(const [label,selector]of [
  ['officer-directory','[data-action="faction-directory"][data-kind="officer"]'],
  ['campaign-info','[data-action="campaign-info"]'],
  ['journal','[data-action="journal"]'],
  ['domestic','[data-action="faction-domestic"]'],
  ['scouting','[data-action="scout-open"]'],
  ['settings','[data-action="settings"]']
 ]){
  await measure(map,label,()=>map.page.locator(selector).first().click());
  await measure(map,label+'-close',close);
 }
 await measure(map,'city-directory-open',()=>map.page.locator('[data-action="map-quick-open"][data-kind="city"]').first().click());
 const city=map.page.locator('[data-action="map-quick-select"]').nth(1);
 if(await city.count())await measure(map,'city-select',()=>city.click());
 if(await map.page.locator('.map-object-menu').count())await map.page.locator('[data-action="map-object-close"]').click();
 await measure(map,'begin-and-commit',async()=>{
  await map.page.locator('.turn-seal').click();await map.page.waitForFunction(()=>!__uiAudit.snapshot().computing,{},{timeout:180000});
 });
 await close();if(!(await map.page.evaluate(()=>__uiAudit.snapshot().paused)))await map.page.locator('.turn-seal').click();
 await measure(map,'day-and-commit',async()=>{await map.page.locator('.turn-day').click();await map.page.waitForFunction(()=>!__uiAudit.snapshot().computing,{},{timeout:180000});});
 await close();
 const naturalPath=process.argv.find(a=>a.startsWith('--save='))?.slice(7)||'.local/save-storage-verification-1793076105410/campaign.json';
 try{
  const raw=await readFile(naturalPath,'utf8');
  result.naturalSave={path:naturalPath,bytes:Buffer.byteLength(raw)};
  await measure(map,'natural-save-cold-archive-list',()=>map.page.evaluate(async raw=>{
   const {openSaveStorage}=await import('/save-storage.mjs'),{writeArchive,listArchives}=await import('/save-archives.mjs'),{validateGameSave}=await import('/game-save-validation.mjs'),{ArchiveReader}=await import('/archive-reader.mjs');
   const reader=new ArchiveReader(),options={inspect:(...args)=>reader.inspect(...args)};
   const store=await openSaveStorage({database:'sango-ui-latency-audit'});
   try{
    for(let i=0;i<3;i++)await writeArchive(store,{name:'Natural '+i,data:raw},validateGameSave,options);
    store.close();const cold=await openSaveStorage({database:'sango-ui-latency-audit'});
    try{const t=performance.now();const entries=await listArchives(cold,validateGameSave,options);__uiAudit.archiveList={count:entries.length,ms:performance.now()-t,errors:entries.filter(e=>e.error).map(e=>e.error)};}finally{cold.close();}
   }finally{store.close();reader.destroy();}
  },raw));
  result.naturalSave.archiveList=await map.page.evaluate(()=>__uiAudit.archiveList);
 }catch(error){result.naturalSave={path:naturalPath,error:error.message};}
 }
 await map.context.close();
 }
 if(mode!=='cache'){
 const combat=await open(nationalRaw,'#strategy','sango-sovereign-v2');
 await importSaveFixture(combat.page,battle);await combat.page.locator('#battle-board').waitFor();
 await combat.page.waitForFunction(()=>__uiAudit.modelInfo?.objects>=12||document.querySelector('#battle-board')?.dataset.modelStatus==='fallback');
 await combat.page.waitForTimeout(700);result.battleStartupMs=combat.startupMs;
 await measure(combat,'battle-paused',async()=>{},2500);
 await measure(combat,'battle-playing',()=>combat.page.locator('[data-action="pause"]').first().click(),6500);
 await measure(combat,'battle-paused-after-play',()=>combat.page.locator('[data-action="pause"]').first().click(),2500);
 await combat.context.close();
 }
 for(const [file,hash]of Object.entries(hashes))if(createHash('sha256').update(await readFile(file)).digest('hex')!==hash)throw Error('Measured source changed: '+file);
 result.complete=true;await writeFile(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log('UI latency evidence: '+out+'/result.json');
}finally{await browser?.close();server.kill();}
