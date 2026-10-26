import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {watchtowerConstructionFixture,advanceWatchtowerDay} from '../tests/helpers/regional-watchtower.mjs';
import {serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';
import {panMapTo} from './map-target-ui-helpers.mjs';

const {chromium}=createRequire(import.meta.url)('playwright'),out='outputs/regional-watchtower-ui',port='4321';
mkdirSync(out,{recursive:true});
const {s,c}=watchtowerConstructionFixture(),construction=serializeCampaign(s),position=structuredClone(c.domestic.watchtowerPosition);
let days=0;while(!c.domestic.techs.includes('watchtower')&&days++<50)advanceWatchtowerDay(s);
assert.ok(days<50);const complete=serializeCampaign(s);validateCampaign(JSON.parse(complete));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);
 const load=async raw=>{await importSaveFixture(page,raw);await page.reload();await page.locator('.national-world').waitFor();for(let i=0;i<4&&await page.locator('.modal-header [data-action="close"]').isVisible();i++)await page.locator('.modal-header [data-action="close"]').click();};
 const tower=()=>page.locator(`[data-region-watchtower="${c.id}"]`);
 const focus=async()=>{const main=page.locator('.national-world');await main.focus();for(let i=0;i<16;i++){const height=await main.evaluate(n=>n.viewBox.baseVal.height);if(height<=160)break;await page.keyboard.press('+');}await panMapTo(page,position);};
 await load(construction);assert.equal(await tower().count(),1);assert.match(await tower().getAttribute('class'),/is-building/);
 assert.equal(await tower().getAttribute('transform'),`translate(${position.x} ${position.y})`);await focus();await page.screenshot({path:out+'/construction.png'});
 await load(complete);await focus();assert.doesNotMatch(await tower().getAttribute('class'),/is-building/);assert.match(await tower().getAttribute('aria-label'),/视野半径 32/);
 assert.equal(await page.locator(`[data-city="${c.id}"] [data-city-watchtower]`).count(),0);
 const before=await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 await page.screenshot({path:out+'/complete-desktop.png'});
 await tower().locator('.region-tower-hit').click();await page.locator('.modal').waitFor();assert.ok((await page.locator('.modal').innerText()).includes(c.name));await page.locator('.modal-header [data-action="close"]').click();
 assert.equal(await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before);
 await page.reload();await page.locator('.national-world').waitFor();if(await page.locator('.modal-header [data-action="close"]').isVisible())await page.locator('.modal-header [data-action="close"]').click();assert.equal(await tower().getAttribute('transform'),`translate(${position.x} ${position.y})`);
 await page.setViewportSize({width:390,height:844});await focus();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:out+'/complete-mobile.png'});
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({passed:true,position,days,checks:['paid construction worksite','independent tower model','actual radius','no duplicate city tower','read-only inspection','reload retains position','desktop and mobile'],errors},null,2));
 console.log('PASS regional watchtower construction, map placement, inspection, reload and mobile');
}catch(e){await page?.screenshot({path:out+'/failure.png'});throw e;}finally{await browser?.close();server.kill();}
