import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {fieldFromCity} from '../tests/helpers/field-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(217,'guandu-200'),army=fieldFromCity(s,'xuchang');
const nodes=['gate','port'].map(kind=>s.junctions.find(n=>n.kind===kind));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4203',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>localStorage.setItem('sango-sovereign-v2',save),serializeCampaign(s));
 await page.goto('http://127.0.0.1:4203/#strategy');await page.locator('.national-world').waitFor();
 assert.equal(await page.locator('.national-world [data-city]').count(),76);
 assert.equal(await page.locator('.national-world [data-junction]').count(),70);
 mkdirSync('outputs/strategic-nodes',{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:1000});
  for(const n of nodes){
   if(width>1000)await page.locator('#national-city-search').selectOption(n.id);
   else {const marker=page.locator(`.national-world [data-junction="${n.id}"]`);await marker.focus();await marker.press('Enter');}
   const panel=page.locator('.strategy-panel');assert.match(await panel.innerText(),new RegExp(n.name));
   assert.match(await panel.innerText(),/驻守军团/);assert.doesNotMatch(await panel.innerText(),/内政|预备兵|NaN|undefined/);
   assert.equal(await panel.locator('[data-action="city-domestic"],[data-task="domestic"],[data-task="governor"]').count(),0);
   await page.screenshot({path:`outputs/strategic-nodes/${n.kind}-${width}.png`,fullPage:true});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#national-city-search').selectOption('xuchang');
 const marker=page.locator(`.national-world [data-campaign-army="${army.id}"]`).first();await marker.focus();await marker.press('Enter');
 await page.locator('.modal [data-action="campaign-order"]').click();
 for(const n of nodes){
  const target=page.locator(`[data-command-city="${n.id}"]`).first();await target.focus();await target.press('Enter');
  const popup=page.locator('.map-point-menu[role="group"]');assert.match(await popup.innerText(),new RegExp(n.name));
  assert.match(await popup.innerText(),/关卡|港口/);assert.doesNotMatch(await popup.innerText(),/NaN|undefined/);
  await page.locator('[data-action="map-route-back"]').click();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS desktop/mobile: 76 cities, 70 nodes, port/pass panels without domestic actions, route selection, no runtime errors');
}finally{await browser?.close();server.kill();}
