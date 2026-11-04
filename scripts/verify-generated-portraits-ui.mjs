import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {observeBanditCamps} from '../bandit-state.mjs';

const out='outputs/generated-portraits-ui',port=4397,errors=[],s=newCampaign(521200,'coalition-190');
// A constructed report exposes real saved generated officers to inspect the UI.
const camp=s.campaign.bandits.camps.find(c=>c.units.some(u=>u.sex===0)&&c.units.some(u=>u.sex===1));assert.ok(camp);
observeBanditCamps(s,'cao',n=>n.id===camp.nodeId);validateCampaign(JSON.parse(serializeCampaign(s)));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'on'},windowsHide:true,stdio:'pipe'});
let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 await mkdir(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{if(!localStorage.getItem('generic-seeded')){localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('generic-seeded','1');}localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(s));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
 await page.waitForFunction(async()=>{const {art}=await import('/art-assets.mjs');return art.pack.generatedPortraits.male.length===100&&art.pack.generatedPortraits.female.length===74;});
 if(await page.locator('#modal-title').count())await page.locator('.modal-header [data-action="close"]').click();
 const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before=await saved();
 const open=async()=>{await page.locator(`[data-action="bandit-open"][data-camp="${camp.id}"] path`).first().click({force:true});await page.getByRole('heading',{name:camp.name,exact:true}).waitFor();await page.locator('.modal-body [data-art-portrait] img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));};
 await open();const urls=await page.locator('.modal-body [data-art-portrait] img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src')));assert.equal(urls.length,camp.units.length);
 const coverage=await page.evaluate(async units=>{
  const {art}=await import('/art-assets.mjs'),pools=art.pack.generatedPortraits;
  for(const u of units){const url=art.portraitURL(u.id);if(!pools[u.sex===1?'female':'male'].includes(url))throw Error('Wrong generic sex pool');for(const scene of ['battle','detail','report'])if(art.portraitURL(u.id,scene)!==url)throw Error('Scene changed face');}
  for(const url of [...pools.male,...pools.female]){const img=new Image();img.src=url;await img.decode();}
  return {male:pools.male.length,female:pools.female.length,decoded:pools.male.length+pools.female.length};
 },camp.units);
 await page.screenshot({path:out+'/camp-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:out+'/camp-mobile.png',animations:'disabled'});
 assert.equal(await saved(),before);await page.setViewportSize({width:1440,height:900});await page.reload();await page.locator('.national-world').waitFor();await page.waitForFunction(async()=>{const {art}=await import('/art-assets.mjs');return art.pack.generatedPortraits.female.length===74;});await open();
 assert.deepEqual(await page.locator('.modal-body [data-art-portrait] img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src'))),urls);assert.equal(await saved(),before);assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,...coverage,checks:['real generated male and female camp officers','desktop and mobile','all generic files decoded','scene consistency','reload consistency','viewing preserves save'],errors},null,2)+'\n');console.log('PASS generated portraits: '+JSON.stringify(coverage));
}catch(error){await page?.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill();}
