import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
import {endingCampaign} from '../tests/helpers/ending-campaign.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';
const out=resolve('.local/campaign-ending-'+Date.now()),base=process.env.GAME_URL||'http://127.0.0.1:4338';await mkdir(out,{recursive:true});
const server=process.env.GAME_URL?null:spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4338',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 if(server)await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 // Enter an ordinary new game before using the real import UI.
 await page.locator('[data-action="strategy"]').click();await page.locator('[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();await page.locator('button[data-action="select-national-faction"][data-faction="cao"]').click();await page.locator('[data-action="launch-national"]').click();
 for(const kind of ['victory','defeat','observer']){
  const fixture=endingCampaign(kind);await importSaveFixture(page,fixture);await page.locator('.campaign-ending').waitFor();
  assert.match(await page.locator('#ending-title').innerText(),kind==='victory'?/天下一统/:kind==='defeat'?/征途落幕/:/袁绍.*统一天下/);
  if(kind==='victory'){await page.locator('.ending-toolbar [data-guide-action="open"]').click();await page.locator('.page-guide-coach[data-guide-topic="ending"]').waitFor();assert.equal(await page.locator('#page-guide-title').innerText(),'整局回顾');await page.locator('[data-guide-action="close"]').first().click();await page.locator('.campaign-ending').waitFor();}
  await page.reload();await page.locator('.campaign-ending').waitFor();
  const downloaded=page.waitForEvent('download');await page.locator('[data-action="ending-export"]').click();const file=join(out,kind+'.json');await (await downloaded).saveAs(file);assert.equal(JSON.parse(await readFile(file,'utf8')).finished,fixture.finished);
  await page.locator('[data-action="ending-map"]').click();await page.locator('.sovereign-hud').waitFor();await page.locator('[data-action="ending-show"]').click();await page.locator('.campaign-ending').waitFor();
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:join(out,kind+'-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});
 }
 await page.locator('[data-action="ending-new"]').click();await page.locator('[data-action="select-national-scenario"]').first().waitFor();
 await page.locator('[data-action="select-national-scenario"][data-scenario="heroes-251"]').click();await page.locator('button[data-action="select-national-faction"][data-faction="sunce"]').click();await page.locator('[data-action="launch-national"]').click();await page.locator('.sovereign-hud').waitFor();assert.equal(await page.locator('.campaign-ending').count(),0);
 assert.deepEqual(errors,[]);await writeFile(join(out,'result.json'),JSON.stringify({passed:true,scope:'Controlled terminal-day fixtures, not natural unification evidence',checks:['common final-day victory/defeat/observer','import/reload terminal page','export final state','return to map and recap','390px display','restart selection and fresh game'],errors},null,2));console.log('Campaign ending UI passed: '+out);
}finally{await browser?.close();server?.kill();}
