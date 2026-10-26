import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,beginExecution,advanceCampaignDay} from '../tests/helpers/auto-domestic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const fixture=newCampaign(1,'red-cliffs-208');beginExecution(fixture);advanceCampaignDay(fixture);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4217',SANGO_ART:'off'},stdio:'pipe',windowsHide:true}),out='outputs/map-information';let browser,page;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(fixture));
 await page.goto('http://127.0.0.1:4217/#strategy');await page.locator('.national-world').waitFor();await mkdir(out,{recursive:true});
 if(await page.locator('.modal').count())await page.locator('.modal .close-button').click();
 if(await page.locator('.turn-seal').textContent()==='暂停')await page.locator('.turn-seal').click();
 const saved=()=>page.evaluate(async()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before=await saved();
 for(const [width,height]of [[1440,900],[1024,768],[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  assert.equal(await page.locator('#national-city-search').isVisible(),false);
  assert.equal(await page.locator('.map-reports,.map-workspace-actions,.strategy-notice,#map-season,[data-map-view="in"],[data-map-view="out"]').count(),0);
  const dock=await page.locator('.map-information').boundingBox();assert.ok(dock.width<180&&dock.y+dock.height<=height);
  await page.locator('.map-search>summary').click();assert.ok(await page.locator('#national-city-search').isVisible());
  const search=await page.locator('.national-search').boundingBox();assert.ok(search.x>=0&&search.y>=0&&search.x+search.width<=width&&search.y+search.height<=height);
  assert.equal(await page.locator('#national-city-search option[value="xuchang"]').textContent(),'许昌');
  await page.locator('.national-legend>summary').click();assert.equal(await page.locator('#national-city-search').isVisible(),false);assert.ok(await page.locator('.national-legend>div').isVisible());
  await page.screenshot({animations:'disabled',path:`${out}/${width}-expanded.png`});await page.locator('.national-legend>summary').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({animations:'disabled',path:`${out}/${width}.png`});
 }
 await page.setViewportSize({width:1440,height:900});
 await page.locator('.map-search>summary').click();await page.selectOption('#national-city-search','xuchang');await page.locator('.city-command-menu').waitFor();
 assert.equal(await page.locator('#national-city-search').isVisible(),false);
 await page.locator('[data-action="map-city-commands"][data-group="military"]').click();
 assert.deepEqual(await page.locator('.city-command-grid button').allTextContents(),['编制','出征']);
 await page.locator('.city-command-back').click();await page.locator('.city-command-menu [data-action="campaign-info-detail"]').click();
 assert.deepEqual(await page.locator('.modal-footer button').allTextContents(),['管理']);
 assert.equal(await page.locator('.info-identity h3,.info-emblem').count(),0);
 assert.doesNotMatch(await page.locator('.modal').innerText(),/对象详情|当前情报|第\s*\d+\s*(天|旬)/);
 await page.screenshot({animations:'disabled',path:out+'/details-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({animations:'disabled',path:out+'/details-mobile.png'});
 await page.locator('.modal .close-button').click();await page.locator('.world-toolbar [data-action="journal"]').click();assert.equal(await page.locator('#modal-title').textContent(),'日志');
 for(const tab of ['all','domestic','personnel','battle','orders']){
  await page.locator(`[data-action="journal-tab"][data-tab="${tab}"]`).click();assert.ok(await page.locator(`[data-journal-tab="${tab}"]`).isVisible());
  assert.doesNotMatch(await page.locator('.campaign-journal').innerText(),/第\s*\d+\s*(天|旬)|呈案|准奏|成事把握/);
 }
 await page.locator('[data-action="journal-tab"][data-tab="domestic"]').click();
 assert.ok(await page.locator('.campaign-journal-row').count());assert.match(await page.locator('.campaign-journal-row time').first().textContent(),/^208年\d+月\d+日$/);
 await page.screenshot({animations:'disabled',path:out+'/journal-mobile.png'});
 const after=await saved();
 if(after!==before){await writeFile(out+'/before.json',before);await writeFile(out+'/after.json',after);throw Error('Browsing changed the saved game; inspect before.json and after.json');}
 assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,readOnly:true,errors},null,2));
 console.log('PASS: collapsed lookup, accordion, short commands, focused details, unified journal and dates, desktop/mobile/landscape, unchanged save');
}catch(error){await page?.screenshot({path:out+'/failure.png'});throw error;}finally{await browser?.close();server.kill();}
