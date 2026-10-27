import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/geographic-roads-20261027/ui';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4359',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4359/#strategy');
 const fixture=await page.evaluate(async()=>{const {newCampaign}=await import('/strategic-campaign.mjs');return newCampaign(617,'guandu-200');});
 await importSaveFixture(page,fixture);await page.reload();await page.locator('.national-world').waitFor();
 await page.locator('[data-map-view="national"]').click();
 const report=await page.evaluate(async()=>{
  const {newCampaign}=await import('/strategic-campaign.mjs'),{renderRoads}=await import('/strategic-movement.mjs'),{roadCost}=await import('/road-metrics.mjs');
  const s=newCampaign(617,'guandu-200'),doc=new DOMParser().parseFromString('<svg>'+renderRoads(s)+'</svg>','image/svg+xml');
  const pair=(a,b)=>[...doc.querySelectorAll('[data-road-from]')].find(e=>[e.getAttribute('data-road-from'),e.getAttribute('data-road-to')].sort().join(':')===[a,b].sort().join(':'));
  const ferries=[['atlas-jincheng-port','atlas-jincheng-east-port'],['atlas-huai-port','atlas-huainan-port'],['atlas-jiangzhou-port','atlas-nanjin-port']];
  return {roads:doc.querySelectorAll('[data-road-from]').length,ports:s.junctions.filter(n=>n.kind==='port').length,water:ferries.map(([a,b])=>pair(a,b)?.getAttribute('class')),closed:[['luoyang','xuchang'],['atlas-guangling','atlas-jingkou'],['town-18','town-37']].map(([a,b])=>({drawn:!!pair(a,b),blocked:roadCost(s,a,b)===Infinity})),options:[...document.querySelectorAll('#national-city-search option')].map(e=>e.value)};
 });
 assert.equal(report.roads,249);assert.equal(report.ports,41);assert.ok(report.water.every(x=>x.includes('road-water')));assert.ok(report.closed.every(x=>!x.drawn&&x.blocked));
 for(const id of ['atlas-jincheng-port','atlas-jincheng-east-port','atlas-huai-port','atlas-huainan-port','atlas-jiangzhou-port','atlas-nanjin-port'])assert.ok(report.options.includes(id));
 await page.screenshot({path:out+'/national-desktop.png',fullPage:true});
 await page.locator('.map-search summary').click();await page.locator('#national-city-search').selectOption('town-44');await page.screenshot({path:out+'/hulao-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search summary').click();await page.locator('#national-city-search').selectOption('atlas-huai-port');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/huai-mobile.png',fullPage:true});
 await page.reload();await page.locator('.national-world').waitFor();assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,...report,errors},null,2));console.log('PASS geographic roads, physical ports, reload, desktop and mobile');
}finally{await browser?.close();server.kill();}
