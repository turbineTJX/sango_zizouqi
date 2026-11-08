import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {mapResourcesReady} from './map-camera-ui-helpers.mjs';
const out=process.env.WATERWAY_REVIEW_OUTPUT||'outputs/shoreline-placement-20261108/ui',port='4397';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port},windowsHide:true,stdio:'pipe'});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(newCampaign(617,'guandu-200')));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.waitForFunction(mapResourcesReady);
 for(let i=0;i<4&&await page.locator('.modal .close-button').count();i++)await page.locator('.modal .close-button').last().click();
 const saved=await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const map=page.locator('.national-world'),reviewed=[];
 for(const [name,id,zoom] of [['yellow-river','guandu',6],['yangtze-han-fork','town-78',5],['poyang-branch','town-76',5],['dongting-bank','town-85',5],['coastal-harbor','town-71',6],['hulao-pass','town-44',7],['xiangyang-bank','town-80',5],['chaohu-ruxu','town-61',5],['taihang-pass','town-43',5],['yangping-pass','town-48',5],['hangu-pass','town-46',5]]){
  if(process.env.WATERWAY_REVIEW_CASE&&!process.env.WATERWAY_REVIEW_CASE.split(',').includes(name))continue;
  if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search summary').click();
  await page.locator('#national-city-search').selectOption(id);await page.keyboard.press('Escape');await map.focus();
  await map.evaluate((svg,{id,zoom})=>{
   const target=svg.querySelector(`[data-junction="${id}"]`),p=new DOMPoint(0,0).matrixTransform(target.getScreenCTM());
   for(let i=0;i<zoom;i++)svg.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:p.x,clientY:p.y,bubbles:true,cancelable:true}));
  },{id,zoom});await page.waitForTimeout(350);await page.waitForFunction(mapResourcesReady);
  const node=map.locator(`[data-junction="${id}"]`);
  if(!await node.count())await page.screenshot({path:`${out}/${name}-failure.png`});
  assert.ok(await node.count(),name+': '+await map.getAttribute('data-camera-view-box'));
  const position=await node.evaluate(el=>{const p=new DOMPoint(0,0).matrixTransform(el.getScreenCTM());return {x:p.x,y:p.y};});
  assert.ok(position.x>=0&&position.x<1440&&position.y>=0&&position.y<1000);
  await page.mouse.move(2,2);await page.screenshot({path:`${out}/${name}.png`});
  reviewed.push(name);
 }
 await page.setViewportSize({width:844,height:390});
 if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search summary').click();
 await page.locator('#national-city-search').selectOption('town-78');await page.keyboard.press('Escape');await page.waitForTimeout(400);await page.waitForFunction(mapResourcesReady);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/waterway-landscape.png'});
 assert.equal(await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);
 await page.reload();await page.waitForFunction(mapResourcesReady);assert.deepEqual(errors,[]);
 const report=await page.evaluate(async()=>{const {nationalWorld}=await import('/national-scenarios.mjs'),{roadPath}=await import('/strategic-movement.mjs'),{mapNode}=await import('/road-network.mjs');const s=nationalWorld('guandu-200');return {ports:s.junctions.filter(n=>n.kind==='port').length,gates:s.junctions.filter(n=>n.kind==='gate').length,route:roadPath(mapNode(s,'town-81'),mapNode(s,'town-82'))};});
 await writeFile(out+'/result.json',JSON.stringify({passed:true,reviewed,...report,errors},null,2));console.log('PASS shoreline placement, waterway branches, saved state, reload, desktop and landscape: '+reviewed.join(', '));
}finally{await browser?.close();server.kill();}
