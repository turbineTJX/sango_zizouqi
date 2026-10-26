import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';
import {PERFORMANCE_BUDGETS} from './performance-budgets.mjs';
import {buildCodeRelease} from './release-lib.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
assert.ok(args.apk&&args.save,'Provide the verification APK and a full natural current save');
const adb=resolve(args.adb||'.local/native-tools/sdk/platform-tools/adb.exe'),out=resolve(args.out||'.local/android-device-'+Date.now());await mkdir(out,{recursive:true});
const exec=promisify(execFile),serial=args.device?['-s',args.device]:[],run=async(...parts)=>(await exec(adb,[...serial,...parts],{windowsHide:true,timeout:60000,maxBuffer:8*1024*1024})).stdout.trim();
const shell=(...parts)=>run('shell',...parts),pkg='com.sango.sovereign',port=Number(args.port||9227),raw=await readFile(resolve(args.save),'utf8'),fixture=JSON.parse(raw),digest=value=>createHash('sha256').update(value).digest('hex');
const result={passed:false,complete:false,startedAt:new Date().toISOString(),apk:{path:resolve(args.apk),sha256:digest(await readFile(resolve(args.apk)))},input:{path:resolve(args.save),sha256:digest(raw),bytes:Buffer.byteLength(raw),day:fixture.campaign.day},budgets:PERFORMANCE_BUDGETS.android,checks:[],errors:[]};
const record=()=>writeFile(join(out,'result.json'),JSON.stringify(result,null,2));await record();let browser,page,rotation,accelerometer,wifi,mobileData,nativeImportFile,shareOpen=false;
const expected=await buildCodeRelease(join(out,'expected-code'));result.expectedRevision=expected.manifest.revision;
const check=async(name,fn)=>{result.currentCheck=name;const start=Date.now();await fn();result.checks.push({name,passed:true,ms:Date.now()-start});result.currentCheck=null;await record();console.log('Passed: '+name);};
const saved=()=>page.evaluate(async()=>await (await import('./save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
async function tapNativeLabel(label){
 for(let i=0;i<10;i++){
  await shell('uiautomator','dump','--compressed','/data/local/tmp/sango-import-check.xml');const xml=await shell('cat','/data/local/tmp/sango-import-check.xml');
  const nodes=[...xml.matchAll(/<node\b([^>]+)/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));
  const node=nodes.find(n=>(n.text===label||n['content-desc']===label)&&n.bounds&&!n.bounds.includes('[0,0][0,0]'));
  if(node){const p=node.bounds.match(/\d+/g).map(Number);await shell('input','tap',String(Math.round((p[0]+p[2])/2)),String(Math.round((p[1]+p[3])/2)));return;}
  await new Promise(ok=>setTimeout(ok,250));
 }
 throw Error('Missing Android file picker target: '+label);
}
async function importThroughNativePicker(){
 const name='sango-qa-'+Date.now()+'.json';nativeImportFile='/sdcard/Download/'+name;await run('push',resolve(args.save),nativeImportFile);
 await page.locator('[data-action="settings"]').first().click();
 await page.evaluate(()=>{window.sangoNativeImport={};document.querySelector('#import-file').addEventListener('change',()=>{window.sangoNativeImport.start=performance.now();const observer=new MutationObserver(()=>{if(document.getElementById('toast').textContent==='存档导入成功'){window.sangoNativeImport.ms=performance.now()-window.sangoNativeImport.start;observer.disconnect();}});observer.observe(document.getElementById('toast'),{subtree:true,childList:true,characterData:true});},{once:true,capture:true});});
 await page.locator('[data-action="import"]').click();await tapNativeLabel('显示根目录');await tapNativeLabel('下载内容');await tapNativeLabel('搜索');await shell('input','text',name.slice(0,-5));await shell('input','keyevent','KEYCODE_ENTER');await tapNativeLabel(name);
 await page.getByText('存档导入成功',{exact:true}).waitFor();result.importMs=await page.evaluate(()=>window.sangoNativeImport.ms);assert.ok(Number.isFinite(result.importMs));result.importMethod='Android native Downloads picker, measured from file selection to durable import success';
}
async function connect(){
 const pid=(await shell('pidof',pkg)).split(' ')[0];assert.ok(pid,'Application is not running');
 await run('forward','tcp:'+port,'localabstract:webview_devtools_remote_'+pid);
 for(let i=0;i<40;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{timeout:1000});break;}catch{await new Promise(ok=>setTimeout(ok,250));}}
 assert.ok(browser,'Verification APK must explicitly enable its WebView debugging');
 page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://localhost'));assert.ok(page,'Expected app-local WebView');page.setDefaultTimeout(30000);page.on('pageerror',e=>{result.errors.push(e.message);(result.errorDetails??=[]).push({message:e.message,stack:e.stack,check:result.currentCheck});console.error('WebView error: '+e.stack);});
 await page.evaluate(()=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));document.querySelector('#page-guide-root [data-guide-action="close"]')?.click();});
}
try{
 const devices=await run('devices');assert.match(devices,/\tdevice\b/,'No authorized real Android device');
 result.device={model:await shell('getprop','ro.product.model'),name:await shell('getprop','ro.product.marketname'),android:await shell('getprop','ro.build.version.release'),webview:(await shell('dumpsys','webviewupdate')).split('\n').find(s=>s.includes('Current WebView package'))?.trim()};
 if(args.install==='true')await check('install signed verification APK',()=>run('install','--no-streaming','-r',resolve(args.apk)));
 await check('cold native launch',async()=>{await shell('am','force-stop',pkg);const start=Date.now();await shell('am','start','-W','-n',pkg+'/.MainActivity');await connect();await page.locator('[data-action="strategy"],.sovereign-hud,.campaign-ending').first().waitFor();result.coldStartMs=Date.now()-start;assert.ok(result.coldStartMs<=result.budgets.coldStartMs);assert.equal(await page.evaluate(()=>Capacitor.isNativePlatform()),true);});
 await check('installed application matches current compiled source',async()=>{const actual=await page.evaluate(async()=>await(await fetch('./release.json')).json());assert.equal(actual.revision,expected.manifest.revision,'Installed APK is stale');result.revision=actual.revision;});
 if(await page.locator('[data-action="strategy"]').count()){
  await page.locator('[data-action="strategy"]').click();if(await page.locator('[data-action="continue-national"]').count())await page.locator('[data-action="continue-national"]').click();else{await page.locator('button[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();await page.locator('button[data-action="select-national-faction"][data-faction="cao"]').click();await page.locator('[data-action="launch-national"]').click();}await page.locator('.sovereign-hud').waitFor();
 }
 await check('native file input imports full natural save',async()=>{if(args['native-file']==='true')await importThroughNativePicker();else{const start=Date.now();await importSaveFixture(page,raw);result.importMs=Date.now()-start;result.importMethod='WebView file input';}await page.locator('.sovereign-hud').waitFor();assert.ok(result.importMs<=result.budgets.importMs);assert.equal(await saved(),raw);});
 await check('complete history and current-engine performance on device',async()=>{
  result.performance=await page.evaluate(async()=>{
   const raw=await(await import('./save-storage.mjs')).readSavedGame('sango-sovereign-v2');
   const m=await import('./verify-runtime.js'),t=performance.now(),s=m.validateCampaign(JSON.parse(raw)),validateMs=performance.now()-t;
   const start=performance.now(),serialized=m.serializeCampaign(s),serializeMs=performance.now()-start;
   const id=Object.keys(s.campaign.activity.officers||{})[0]||s.cities.flatMap(c=>c.units)[0]?.id,historyStart=performance.now();if(id)m.officerActivityDays(s,id,{limit:30});const historyMs=performance.now()-historyStart;
   const dayStart=performance.now(),before=s.campaign.day,battles=m.activeBattles(s).length;m.advanceCampaignDay(s);const dayMs=performance.now()-dayStart;
   return {validateMs,serializeMs,historyMs,dayMs,historyOfficer:id,dayBefore:before,dayAfter:s.campaign.day,activeBattles:battles,nodes:JSON.parse(raw).campaign.activity.nodes.length,roundTripEqual:serialized===raw};
  });
  const p=result.performance;assert.equal(p.roundTripEqual,true);assert.equal(p.dayAfter,p.dayBefore+1);for(const key of ['validateMs','serializeMs','historyMs','dayMs'])assert.ok(p[key]<=result.budgets[key],key+' budget exceeded: '+p[key]);
 });
 await check('manual native archive commits',async()=>{await page.locator('[data-action="settings"]').first().click();await page.locator('[data-action="save"]').click();const name='Android 真机验收 '+Date.now();await page.locator('#archive-name').fill(name);const start=Date.now();await page.locator('[data-action="archive-create"]').click();await page.getByRole('heading',{name,exact:true}).waitFor();result.saveCommitMs=Date.now()-start;assert.ok(result.saveCommitMs<=result.budgets.saveCommitMs);await page.locator('[data-action="close"]').click();});
 await check('real touchscreen map drag meets frame budget without changing the save',async()=>{
  const beforeView=await page.locator('.national-world').getAttribute('viewBox');
  const point=await page.locator('.national-world').evaluate(svg=>{const b=svg.getBoundingClientRect(),left=Math.max(0,b.left),right=Math.min(innerWidth,b.right),top=Math.max(0,b.top),bottom=Math.min(innerHeight,b.bottom);for(const fy of [.5,.3,.7,.15,.85])for(const fx of [.5,.3,.7,.15,.85]){const x=left+(right-left)*fx,y=top+(bottom-top)*fy,target=document.elementFromPoint(x,y);if(target&&svg.contains(target)&&!target.closest('[data-road-from],[data-junction],[data-city],[data-command-city],[data-campaign-army],[data-transport-officer],[data-action],[data-metropolis-focus]'))return {x,y};}throw Error('No visible map background for a drag');});
  await page.evaluate(()=>{window.sangoFrameTimes=[];window.sangoFrameMeasure=true;let last=performance.now();const frame=t=>{window.sangoFrameTimes.push(t-last);last=t;if(window.sangoFrameMeasure)requestAnimationFrame(frame);};requestAnimationFrame(frame);});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});for(let i=1;i<=40;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+i*2,y:point.y+i}]});await page.waitForTimeout(40);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const frames=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{window.sangoFrameMeasure=false;resolve(window.sangoFrameTimes.filter(t=>t>0).sort((a,b)=>a-b));})));assert.ok(frames.length>=20,'Sustained real drag must provide enough frame samples');result.mapFrameSamples=frames.length;result.mapFrameP95Ms=frames[Math.ceil(frames.length*.95)-1];result.mapViews={before:beforeView,after:await page.locator('.national-world').getAttribute('viewBox')};assert.notEqual(result.mapViews.before,result.mapViews.after,'Touch drag must actually move the map');assert.ok(result.mapFrameP95Ms<=result.budgets.mapFrameP95Ms);assert.equal(await saved(),raw);await cdp.detach();
 });
 await check('background and foreground preserve exact current save',async()=>{await shell('input','keyevent','KEYCODE_HOME');await new Promise(ok=>setTimeout(ok,1500));await shell('am','start','-W','-n',pkg+'/.MainActivity');await page.locator('.sovereign-hud').waitFor();assert.equal(await saved(),raw);});
 await check('portrait and landscape preserve state and fit display below Android system bars',async()=>{rotation=await shell('settings','get','system','user_rotation');accelerometer=await shell('settings','get','system','accelerometer_rotation');await shell('settings','put','system','accelerometer_rotation','0');result.nativeLayouts=[];for(const value of ['1','0']){await shell('settings','put','system','user_rotation',value);await page.waitForTimeout(1000);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.equal(await saved(),raw);
  await shell('uiautomator','dump','--compressed','/data/local/tmp/sango-layout-check.xml');const xml=await shell('cat','/data/local/tmp/sango-layout-check.xml'),node=[...xml.matchAll(/<node\b([^>]+)/g)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]]))).find(n=>n.class==='android.webkit.WebView'&&n.package===pkg);assert.ok(node?.bounds,'Native WebView accessibility bounds are required');const bounds=node.bounds.match(/\d+/g).map(Number);assert.ok(bounds[1]>0,'Game content overlaps the visible Android status bar');
  const viewport=await page.evaluate(()=>{const b=document.querySelector('.strategy-map-first').getBoundingClientRect();return {width:innerWidth,height:innerHeight,pageBottom:b.bottom};});assert.ok(viewport.pageBottom<=viewport.height+1,'Map page is taller than the available native viewport');
  for(const control of await page.locator('.world-commands button,.world-turn button,.world-toolbar button').all()){await control.scrollIntoViewIfNeeded();assert.ok(await control.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1&&(hit===el||el.contains(hit));}),'Map commands must be reachable inside the native viewport');}
  await page.locator('.world-commands').evaluate(el=>{el.scrollTop=0;});
  const capture=await exec(adb,[...serial,'exec-out','screencap','-p'],{windowsHide:true,timeout:15000,encoding:'buffer',maxBuffer:8*1024*1024});const width=capture.stdout.readUInt32BE(16),height=capture.stdout.readUInt32BE(20);assert.ok(bounds[0]>=0&&bounds[2]<=width&&bounds[3]<=height);result.nativeLayouts.push({rotation:value,bounds,width,height,viewport});await writeFile(join(out,value==='1'?'landscape.png':'portrait.png'),capture.stdout);
 }});
 await check('native export writes complete JSON and cancel stays local',async()=>{
  await page.locator('[data-action="settings"]').first().click();await page.locator('[data-action="export"]').click();
  // Filesystem may create/truncate its file before its write promise resolves.
  // The real chooser opens only after that promise; observing it also verifies
  // the native share flow without selecting any recipient.
  for(let i=0;i<40;i++){const top=(await shell('dumpsys','activity','activities')).split('\n').find(line=>/topResumedActivity|mResumedActivity/.test(line))||'';if(/(?:Chooser|Resolver)Activity/.test(top)){result.exportActivity=top.trim();shareOpen=true;break;}await new Promise(ok=>setTimeout(ok,250));}
  assert.ok(shareOpen,'Native export must open the Android system share chooser');
  let exported;for(let i=0;i<30;i++){exported=await page.evaluate(async name=>await Capacitor.Plugins.Filesystem.readFile({directory:'CACHE',path:'saves/'+name,encoding:'utf8'}),'君临-第'+fixture.turn+'旬.json').catch(()=>null);if(exported)break;await new Promise(ok=>setTimeout(ok,250));}
  assert.ok(exported?.data===raw,'Exported full save bytes differ: '+digest(exported?.data||'')+' != '+digest(raw));await shell('input','keyevent','KEYCODE_BACK');shareOpen=false;await page.locator('[data-action="close"]').first().click();
 });
 await check('process restart restores full save with Wi-Fi and mobile data disabled',async()=>{wifi=await shell('settings','get','global','wifi_on');mobileData=await shell('settings','get','global','mobile_data');await shell('svc','wifi','disable');await shell('svc','data','disable');await browser.close();browser=null;await shell('am','force-stop',pkg);await shell('am','start','-W','-n',pkg+'/.MainActivity');await connect();await page.locator('[data-action="strategy"]').click();await page.locator('[data-action="continue-national"]').click();await page.locator('.sovereign-hud').waitFor();assert.equal(await saved(),raw);});
 await writeFile(join(out,'memory.txt'),await shell('dumpsys','meminfo',pkg));
 assert.deepEqual(result.errors,[]);result.passed=true;result.complete=true;
}catch(error){result.error=error.stack;console.error(error);process.exitCode=1;}
finally{
 if(shareOpen)await shell('input','keyevent','KEYCODE_BACK').catch(()=>{});
 if(rotation!==undefined)await shell('settings',rotation==='null'?'delete':'put','system','user_rotation',...(rotation==='null'?[]:[rotation]));
 if(accelerometer!==undefined)await shell('settings',accelerometer==='null'?'delete':'put','system','accelerometer_rotation',...(accelerometer==='null'?[]:[accelerometer]));
 if(wifi!==undefined)await shell('svc','wifi',wifi==='1'?'enable':'disable');
 if(mobileData!==undefined)await shell('svc','data',mobileData==='1'?'enable':'disable');
 if(nativeImportFile)await shell('rm','-f',nativeImportFile).catch(()=>{});
 await shell('rm','-f','/data/local/tmp/sango-import-check.xml').catch(()=>{});
 await shell('rm','-f','/data/local/tmp/sango-layout-check.xml').catch(()=>{});
 await browser?.close();await run('forward','--remove','tcp:'+port).catch(()=>{});result.finishedAt=new Date().toISOString();await record();console.log('Android device evidence: '+out);
}
