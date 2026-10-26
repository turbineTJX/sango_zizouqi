import {panMapTo} from './map-target-ui-helpers.mjs';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(81,'guandu-200'),out='outputs/city-spacing-ui',port=process.env.SPACING_UI_PORT||'4339';
mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Map server exited: '+code)));server.stderr.on('data',data=>process.stderr.write(data));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{
  localStorage.setItem('sango-sovereign-v2',raw);
  localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
 },serializeCampaign(s));
 const main=page.locator('.national-world');
 const closeMenu=async()=>{const close=page.locator('.modal [data-action="close"]');if(await close.count())await close.click();};
 const spacing=async()=>{
  const box=async id=>main.locator(`[data-city="${id}"] .map-city-model .town-foundation`).boundingBox();
  const a=await box('xuchang'),b=await box('atlas-qiao');assert.ok(a&&b);assert.ok(b.x>a.x+a.width,'Xuchang and Qiao overlap');
  return {gapPixels:Math.round(b.x-a.x-a.width),cityWidth:Math.round(a.width)};
 };
 for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  await page.setViewportSize(viewport);await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.reload();await main.waitFor();
  await page.locator('#national-city-search').selectOption('xuchang');await closeMenu();
  const before=await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
  await page.locator('[data-map-view="settlements"]').click();const settlements=await spacing();
  await page.screenshot({path:`${out}/${name}-settlements.png`});
  await page.locator('[data-map-view="city"]').click();
  assert.equal(await main.getAttribute('data-map-detail'),'interior');
  const city=main.locator('[data-city="xuchang"]');assert.match(await city.getAttribute('class'),/is-town-focused/);
  await city.locator('.map-city-scene [data-city-building="farm"] .city-district-hit').click();
  assert.equal(await page.locator('.city-building-card').count(),1);
  await page.screenshot({path:`${out}/${name}-interior.png`});
  await main.focus();await page.keyboard.press('Escape');
  for(let i=0;i<10;i++){
   const size=await main.evaluate(el=>Math.min(el.viewBox.baseVal.width,el.viewBox.baseVal.height));if(size>=110)break;
   await page.locator('[data-map-view="out"]').click();
  }
  await panMapTo(page,{x:741,y:440});
  const regional=await spacing();assert.ok(regional.gapPixels>regional.cityWidth,'countryside should be wider than the city footprint');
  const junction=main.locator('[data-junction="junction:atlas-qiao:xuchang"]');assert.equal(await junction.isVisible(),true);
  await page.screenshot({path:`${out}/${name}-region.png`});
  await junction.locator('.junction-banner').click();assert.match(await page.locator('.strategy-panel').innerText(),/鄢陵/);await page.locator('.strategy-panel .map-panel-close').click();
  assert.equal(await page.evaluate(async ()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  results.push({name,settlements,regional});
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({passed:true,results,errors},null,2));
 console.log('PASS countryside spacing, real regional junction, city building interaction and read-only zoom on desktop/mobile');
}catch(error){if(browser)await browser.contexts()[0]?.pages()[0]?.screenshot({path:out+'/failure.png'});throw error;}
finally{await browser?.close();server.kill();}
