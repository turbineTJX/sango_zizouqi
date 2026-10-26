import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './automatic-domestic-campaign.mjs';
import {assignDomestic,assignmentFor,beginDomesticTurn,cancelDomestic,ACTIONS} from '../domestic.mjs';
import {cityStaffStatus,acknowledgeDomesticAlerts,pendingDomesticAlerts} from '../domestic-feedback.mjs';
import {mapNode} from '../road-network.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/prefectures-ui',port=process.env.PREFECTURES_UI_PORT||'4349';mkdirSync(out,{recursive:true});
let fixture;
for(let seed=1;seed<=40&&!fixture;seed++){
 const s=newCampaign(seed,'guandu-200'),c=mapNode(s,'xuchang'),u=cityStaffStatus(s,c).idle[0].unit;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='agriculture'&&key!=='build_farm')c.domestic.cooldowns[key]=1000;
 assert.equal(assignDomestic(s,c.id,'agriculture',u.id),null);beginDomesticTurn(s);const a=assignmentFor(s,u.id);
 if(a.action&&mapNode(s,a.action.siteId).kind==='junction')fixture={s,c,a,siteId:a.action.siteId};
}
assert.ok(fixture);const {s,c,a,siteId}=fixture,construction=serializeCampaign(s),actionId=a.action.id;
const pausedState=JSON.parse(construction);cancelDomestic(pausedState,a.officerId);acknowledgeDomesticAlerts(pausedState,pendingDomesticAlerts(pausedState).map(e=>e.id));validateCampaign(pausedState);const paused=serializeCampaign(pausedState);
let mainConstruction;
for(let seed=1;seed<=40&&!mainConstruction;seed++){
 const world=newCampaign(seed,'guandu-200'),city=mapNode(world,'xuchang'),u=cityStaffStatus(world,city).idle[0].unit;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='agriculture'&&key!=='build_farm')city.domestic.cooldowns[key]=1000;
 assert.equal(assignDomestic(world,city.id,'agriculture',u.id),null);beginDomesticTurn(world);
 if(assignmentFor(world,u.id).action?.siteId===city.id)mainConstruction=serializeCampaign(world);
}
assert.ok(mainConstruction);
for(let i=0;i<60&&a.action?.id===actionId;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
assert.equal(c.domestic.buildingSites.farm.filter(id=>id===siteId).length,1);
acknowledgeDomesticAlerts(s,pendingDomesticAlerts(s).map(e=>e.id));validateCampaign(JSON.parse(serializeCampaign(s)));const completed=serializeCampaign(s);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Map server exited: '+code)));server.stderr.on('data',data=>process.stderr.write(data));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));const raw=sessionStorage.getItem('prefecture-fixture');if(raw)localStorage.setItem('sango-sovereign-v2',raw);});
 await page.goto(`http://127.0.0.1:${port}/#strategy`);
 const main=page.locator('.national-world'),pref=main.locator(`[data-junction="${siteId}"]`);
 const load=async raw=>{await page.evaluate(raw=>sessionStorage.setItem('prefecture-fixture',raw),raw);await page.reload();await main.waitFor();};
 const onMap=async locator=>{
  const result=await locator.evaluate(el=>{
   const hidden=[];let opacity=1;for(let p=el;p&&p instanceof Element;p=p.parentElement){const style=getComputedStyle(p);if(style.display==='none'||style.visibility==='hidden'||+style.opacity<1)hidden.push({tag:p.tagName,classes:p.getAttribute('class'),display:style.display,visibility:style.visibility,opacity:style.opacity});opacity*=+style.opacity;}
   const r=el.getBoundingClientRect(),hit=el.querySelector('.map-building-hit').getBoundingClientRect(),top=document.elementFromPoint(hit.x+hit.width/2,hit.y+hit.height/2),metro=top?.closest('[data-metropolis-focus]');
   return {visible:!hidden.some(p=>p.display==='none'||p.visibility==='hidden')&&opacity>.9&&r.width>0&&r.height>0,width:r.width,height:r.height,hidden,clickable:el.contains(top),obstruction:top&&!el.contains(top)?{tag:top.tagName,classes:top.getAttribute('class'),metro:metro?.dataset.metropolisFocus,markerClass:metro?.getAttribute('class'),glyphTransform:metro?.querySelector('[data-map-glyph]').getAttribute('transform')}:null};
  });assert.equal(result.visible,true,'a physical building must remain painted on the ordinary map: '+JSON.stringify(result));
  assert.equal(result.clickable,true,'buildings must not be obscured by map labels: '+JSON.stringify(result));
 };
 const overview=async(state,expected,name)=>{
  await load(state);await page.locator('[data-map-view="selected"]').click();assert.equal(await main.getAttribute('data-map-detail'),'metropolis');
  const building=pref.locator('.map-city-model [data-map-building="farm"]');assert.equal(await building.getAttribute('data-building-state'),expected);await onMap(building);
  assert.ok(await building.locator('image').count()>0);assert.equal(await building.locator('.city-compact-scaffold').count(),expected==='built'?0:1);
  await onMap(main.locator('[data-city="xuchang"] .map-city-model [data-map-building="farm"]'));
  const before=await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
  await building.locator('.map-building-hit').click();assert.match(await page.locator('.city-building-card').innerText(),/农田/);assert.equal(await main.getAttribute('data-map-detail'),'metropolis');
  await page.screenshot({path:`${out}/${name}-overview-${expected}.png`});await page.locator('[data-city-card-close]').click();assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before);
 };
 const inspect=async()=>{
  await page.locator('#national-city-search').selectOption(siteId);assert.match(await page.locator('.strategy-panel').innerText(),/许昌都市圈/);
  await page.locator('.strategy-panel [data-action="map-city-inspect"]').click();assert.match(await pref.getAttribute('class'),/is-town-focused/);
  assert.equal(await pref.locator('.map-city-scene .town-foundation').count(),0);
  await pref.locator('.map-city-scene [data-city-building="farm"] .city-district-hit').click();
  assert.match(await page.locator('.city-building-card').innerText(),/府内设施/);
 };
 for(const [name,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  await page.setViewportSize(viewport);
  await overview(construction,'construction',name);await overview(paused,'paused',name);await overview(completed,'built',name);
  await load(mainConstruction);await page.locator('[data-map-view="selected"]').click();
  const mainWork=main.locator('[data-city="xuchang"] .map-city-model [data-map-building="farm"]');assert.equal(await mainWork.getAttribute('data-building-state'),'construction');await onMap(mainWork);assert.equal(await mainWork.locator('.city-compact-scaffold').count(),1);
  const mainSaved=await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));await mainWork.locator('.map-building-hit').click();assert.match(await page.locator('.city-building-card').innerText(),/城内设施[\s\S]*施工中/);
  await page.screenshot({path:`${out}/${name}-overview-city-construction.png`});await page.locator('[data-city-card-close]').click();assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),mainSaved);
  await load(construction);const before=await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
  await inspect();assert.equal(await pref.locator('.city-scaffold').count(),1);assert.match(await page.locator('.city-building-card').innerText(),/施工中/);
  await page.screenshot({path:`${out}/${name}-construction.png`});assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before);
  await load(completed);const saved=await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
  await inspect();assert.equal(await pref.locator('.city-scaffold').count(),0);assert.equal(await pref.locator('.map-city-scene [data-city-building="farm"]').getAttribute('data-level'),'1');
  await page.screenshot({path:`${out}/${name}-completed.png`});await page.locator('[data-city-card-close]').click();
  await page.locator('[data-map-view="metropolis"]').click();await page.locator('[data-metropolis-focus="xuchang"] .metropolis-halo').click();
  assert.equal(await main.locator('[data-region-kind="prefecture"]').count(),24);assert.equal(await main.locator(`[data-map-region="${siteId}"]`).getAttribute('data-region-metropolis'),'xuchang');
  await page.screenshot({path:`${out}/${name}-regions.png`});assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({passed:true,siteId,siteName:mapNode(s,siteId).name,constructionDay:JSON.parse(construction).campaign.day,completedDay:s.campaign.day,checks:['named regions form metropolis','real paid construction at a prefecture','ordinary map paints city buildings and prefecture construction/paused/completed facilities','ordinary city construction can be inspected','completed farm stays outside city','no invented city walls','building details','read-only inspection','desktop/mobile'],errors},null,2));
 console.log('PASS prefecture regions, metropolis membership, ordinary-map buildings/worksites and desktop/mobile facility inspection');
}catch(error){if(browser)await browser.contexts()[0]?.pages()[0]?.screenshot({path:out+'/failure.png'});throw error;}
finally{await browser?.close();server.kill();}
