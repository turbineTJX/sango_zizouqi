import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {citySceneState,citySceneMarkup,sceneDistricts} from '../city-scene.mjs';
import {acknowledgeDomesticAlerts,pendingDomesticAlerts} from '../domestic-feedback.mjs';
import {fundCities} from '../tests/resource-fixtures.mjs';
import {TOWN_TERRAINS,TOWN_FOUNDATIONS,TOWN_ART} from '../town-art.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const state=newCampaign(203,'guandu-200');fundCities(state,40000);acknowledgeDomesticAlerts(state,pendingDomesticAlerts(state).map(e=>e.id));
const port='4317',out='outputs/town-spaces-ui';mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},windowsHide:true,stdio:'pipe'});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>localStorage.setItem('sango-sovereign-v2',save),serializeCampaign(state));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
 if(await page.locator('.modal-header [data-action="close"]').count())await page.locator('.modal-header [data-action="close"]').click();
 await page.evaluate(async sources=>{await Promise.all(sources.map(async src=>{const i=new Image();i.src=src;await i.decode();}));},[...Object.values(TOWN_TERRAINS),...Object.values(TOWN_FOUNDATIONS),TOWN_ART.buildings,TOWN_ART.construction]);
 const main=page.locator('.national-world'),before=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 const choose=async id=>{await page.locator('[data-map-view="settlements"]').click();await page.waitForTimeout(280);await page.locator('#national-city-search').selectOption(id);if(await page.locator('.modal-header [data-action="close"]').count())await page.locator('.modal-header [data-action="close"]').click();await page.locator('[data-map-view="city"]').click();await page.waitForTimeout(280);};
 await choose('xuchang');assert.equal(await main.locator('.is-town-focused [data-town-space="large"]').count(),2);
 const compact=await main.locator('.is-town-focused .map-city-model').getAttribute('transform'),detail=await main.locator('.is-town-focused .map-city-scene').getAttribute('transform');assert.equal(compact,detail);
 for(const facility of await main.locator('.is-town-focused [data-city-building]').all()){
  const hit=facility.locator('.city-district-hit'),position=await hit.evaluate(el=>{const r=el.getBoundingClientRect(),building=el.closest('[data-city-building]');for(const y of [.2,.5,.8])for(const x of [.2,.5,.8]){const p={x:r.width*x,y:r.height*y};if(document.elementFromPoint(r.x+p.x,r.y+p.y)?.closest('[data-city-building]')===building)return p;}throw Error('No hit point: '+building.dataset.cityBuilding);});
  await hit.click({position});assert.equal(await page.locator('.city-building-card').count(),1);await page.locator('[data-city-card-close]').click();
 }
 await page.screenshot({path:out+'/city-desktop.png'});
 await choose('chenliu');assert.equal(await main.locator('.is-town-focused .city-scene [data-town-space="small"]').count(),1);
 const pass=state.junctions.find(n=>n.kind==='gate'),harbor=state.junctions.find(n=>n.kind==='port');
 for(const [place,kind]of [[pass,'gate'],[harbor,'port']]){await choose(place.id);assert.equal(await main.locator(`.is-town-focused .city-scene [data-town-space="${kind}"]`).count(),1);assert.equal(await main.locator('.is-town-focused [data-city-building]').count(),sceneDistricts(citySceneState(state,place)).length);}
 await choose('xuchang');await page.locator('[data-map-view="metropolis"]').click();await main.focus();const trace=[await main.getAttribute('data-map-detail')],weights=[];
 for(let i=0;i<22&&trace.at(-1)!=='interior';i++){await page.keyboard.press('+');const level=await main.getAttribute('data-map-detail');if(level!==trace.at(-1))trace.push(level);weights.push(await main.evaluate(el=>+el.style.getPropertyValue('--interior-opacity')));}
 assert.deepEqual(trace,['metropolis','settlements','interior']);assert.ok(weights.some(n=>n>0&&n<1));
 await page.waitForTimeout(280);for(let i=0;i<22&&await main.getAttribute('data-map-detail')!=='metropolis';i++)await page.keyboard.press('-');
 assert.equal(await main.getAttribute('data-map-detail'),'metropolis');
 const after=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 if(after!==before){const changes=[];const diff=(a,b,path='')=>{if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object')for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],path+'.'+key);else if(changes.length<20)changes.push({path,before:a,after:b});};diff(JSON.parse(before),JSON.parse(after));throw Error('Viewing changed save: '+JSON.stringify(changes));}
 await page.setViewportSize({width:390,height:844});await choose('xuchang');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await main.locator('.is-town-focused [data-city-building="commerce"]').focus();await page.keyboard.press('Enter');const box=await page.locator('.city-building-card').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390&&box.y+box.height<=844);await page.screenshot({path:out+'/city-mobile.png'});
 // Visual model samples use real site limits, and deliberately do not simulate construction.
 const places=[state.cities.find(c=>c.id==='luoyang'),state.cities.find(c=>c.id==='chenliu'),pass,harbor];
 const cards=places.flatMap(place=>{const model=citySceneState(state,place);return [false,true].map(developed=>{const sample=structuredClone(model);if(developed)for(const d of sample.districts){d.level=Math.min(d.limit,Math.max(d.level,3));sample.levels[d.key]=d.level;}return `<article><h2>${place.name} · ${{large:'大城',small:'小城',gate:'关卡',port:'港口'}[model.layout.kind]} · ${developed?'建设后示意':'现状'}</h2><svg class="strategy-world" viewBox="-285 -210 570 425">${citySceneMarkup(sample)}</svg></article>`;});});
 await page.setViewportSize({width:1500,height:1520});await page.setContent(`<html><head><base href="http://127.0.0.1:${port}/"><link rel="stylesheet" href="city-scene.css"><style>body{margin:0;background:#cbb888;font-family:'Microsoft YaHei',serif;--serif:serif}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px}article{background:#dfcd9a;border:1px solid #79643e;border-radius:6px;overflow:hidden}h2{margin:10px 16px;font-size:18px;color:#3d4736}svg{width:100%;height:310px}.city-district{pointer-events:none}.city-site-labels,.city-officers{display:none}</style></head><body><main>${cards.join('')}</main></body></html>`);
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,500));});await page.screenshot({path:out+'/spaces-comparison.png',fullPage:true});assert.deepEqual(errors,[]);
 writeFileSync(out+'/result.json',JSON.stringify({passed:true,trace,weights,checks:['four actual settlement models','identical world footprints','all city facility hit targets','site-specific build limits','continuous zoom weights','reverse zoom','read-only save','desktop and portrait layout','model expansion samples']},null,2));console.log('PASS four settlement spaces, continuous zoom, facility access, read-only saves and desktop/mobile');
}catch(error){if(browser)await browser.contexts()[0]?.pages()[0]?.screenshot({path:out+'/failure.png'});throw error;}finally{await browser?.close();server.kill();}
