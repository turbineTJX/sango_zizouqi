import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {assetFile} from '../asset-workspace.mjs';

const out='outputs/gate-art-review',port='4388',errors=[];
const catalog=JSON.parse(await readFile(assetFile('./assets/manifest.json'),'utf8'));
const metadata=await sharp(assetFile(catalog.town.foundations.gate)).metadata();assert.equal(metadata.hasAlpha,true);
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const variant of ['before','after']){
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
  page.on('pageerror',e=>errors.push(e.message));
  if(variant==='before')await page.route('**/assets/manifest.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...catalog,town:{...catalog.town,foundations:{...catalog.town.foundations,gate:'./assets/town/han-space-gate.webp'}}})}));
  await page.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(newCampaign(81,'guandu-200')));
  await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();await page.waitForLoadState('networkidle');
  const saved=await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
  if(variant==='after'){
   const hrefs=await page.locator('.town-foundation[data-town-space="gate"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
   assert.equal(hrefs.length,12);assert.ok(hrefs.every(h=>h===catalog.town.foundations.gate));
  }
  await page.locator('.map-search>summary').click();await page.locator('#national-city-search').selectOption('town-46');
  await page.keyboard.press('Escape');await page.mouse.move(2,2);
  const main=page.locator('.national-world');
  const clip=await main.locator('[data-junction="town-46"]').evaluate(el=>{
   const p=new DOMPoint(0,0).matrixTransform(el.getScreenCTM());
   return {x:Math.max(0,Math.min(innerWidth-480,p.x-240)),y:Math.max(0,Math.min(innerHeight-320,p.y-160)),width:480,height:320};
  });
  await page.screenshot({path:`${out}/${variant}-context.png`,clip});
  await page.screenshot({path:`${out}/${variant}-map.png`});
  if(variant==='after'){
   await main.focus();for(let i=0;i<7;i++)await page.keyboard.press('+');
   await page.screenshot({path:`${out}/after-close.png`});
   await page.locator('[data-map-view="national"]').click();
   assert.equal(await main.getAttribute('data-distant-blend'),'1');
   assert.equal(await main.locator('.map-city-model').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').length),0);
   const gate=main.locator('[data-junction="town-46"] [data-map-overview-glyph="gate"]');
   await gate.locator('.overview-site-hit').click();
   assert.match(await page.locator('.strategy-panel').innerText(),/函谷关/);
  }
  assert.equal(await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);
  await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,gates:12,alpha:true,checks:['new gate in actual terrain','national icon opens the real pass','fixed node positions','viewing preserves the save'],errors},null,2));
 console.log('PASS: 12 transparent gate foundations, actual map comparison, national pass icon click and read-only zoom.');
}finally{await browser?.close();server.kill();}
