import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {cityVisible} from '../strategic-vision.mjs';
import {cityInformation} from '../information-display.mjs';
import {chooseCommandTarget} from './map-target-ui-helpers.mjs';

const port=4417,out='outputs/information-clarity',origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'off'},windowsHide:true,stdio:'pipe'});
let browser,context,page;const errors=[];
await mkdir(out,{recursive:true});
async function seed(s,viewport){
 await context?.close();context=await browser.newContext({viewport,serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));const raw=serializeCampaign(s);validateCampaign(JSON.parse(raw));
 await page.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-audio-v1',JSON.stringify({muted:true}));},raw);
 await page.goto(origin+'/#strategy');await page.locator('.national-world').waitFor();
}
const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
async function city(id){if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search summary').click();await page.locator('#national-city-search').selectOption(id);}
async function shot(name){await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:`${out}/${name}.png`});}
try{
 await new Promise((yes,no)=>{server.stdout.once('data',yes);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.owner!=='cao'&&!cityVisible(s,c.id));
  const record=s.campaign.vision.factions.cao.cities[c.id];record.day=s.campaign.day;record.data=structuredClone(c);record.data.gold=4321;c.gold=9123;
  await seed(s,viewport);const before=await saved();await city(c.id);
  const card=page.locator('.map-selection-card');assert.ok((await card.innerText()).includes(cityInformation(s,c.id).label));assert.match(await card.innerText(),/4,321/);
  await card.locator('[data-action="campaign-info-detail"]').click();assert.match(await page.locator('.info-dossier').innerText(),/4,321/);
  await shot(`old-intel-${viewport.width}`);await page.locator('.modal-header [data-action="close"]').last().click();assert.equal(await saved(),before);
  await city('xuchang');await page.getByRole('button',{name:'军事',exact:true}).click();await page.getByRole('button',{name:'出征',exact:true}).click();
  await page.locator('[data-command-army-unit]:not(:disabled)').first().check();
  await page.locator('[data-action="campaign-command-next"]').click();await page.locator('[data-action="campaign-command-next"]').click();
  await chooseCommandTarget(page,'chenliu');await page.locator('[data-action="campaign-command-next"]').click();
  const review=page.locator('.command-decree');assert.match(await review.innerText(),/拟携粮/);assert.match(await review.innerText(),/每日耗粮/);assert.match(await review.innerText(),/可用守军/);assert.match(await review.innerText(),/无补给续航/);
  await shot(`departure-${viewport.width}`);await page.locator('[data-action="campaign-command-back"]').click();
  await page.locator('[data-action="campaign-command-next"]').click();assert.match(await review.innerText(),/可用守军/);
  await page.locator('[data-action="campaign-command-cancel"]').click();assert.equal(await saved(),before);
  await page.reload();await page.locator('.national-world').waitFor();assert.equal(await saved(),before);
  console.log(`PASS ${viewport.width}: dated intel, departure review, back/cancel/reload preserve save`);
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/ui-result.json`,JSON.stringify({passed:true,viewports:[1440,390],errors},null,2));
}catch(error){if(page&&!page.isClosed()){await shot('failure');await writeFile(`${out}/failure.txt`,(await page.locator('body').innerText()).slice(0,12000));}throw error;}
finally{await context?.close();await browser?.close();server.kill();}
