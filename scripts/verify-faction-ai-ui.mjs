import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,beginExecution,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4207',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(new Error('server '+code)));});
 const s=newCampaign(417,'heroes-251');beginExecution(s);validateCampaign(JSON.parse(serializeCampaign(s)));assert.ok(s.campaign.ai.plans.length);
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{if(!sessionStorage.getItem('ai-fixture')){localStorage.setItem('sango-sovereign-v2',raw);sessionStorage.setItem('ai-fixture','1');}},serializeCampaign(s));
 await page.goto('http://127.0.0.1:4207/#strategy');await page.locator('.faction-plans').waitFor();await page.locator('.faction-plans summary').click();
 assert.match(await page.locator('.faction-plans').innerText(),/筹备|集结|出征交战/);
 const out='outputs/faction-ai-ui';await mkdir(out,{recursive:true});await page.locator('.faction-plans').screenshot({path:out+'/desktop.png'});
 const snapshot=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).campaign.ai.plans);
 await page.reload();await page.locator('.faction-plans').waitFor();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).campaign.ai.plans),snapshot);
 await page.setViewportSize({width:390,height:844});await page.locator('.faction-plans summary').click();await page.locator('.faction-plans').screenshot({path:out+'/mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile overflow');assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({plans:snapshot.length,reload:true,mobile:true,errors},null,2));console.log('faction AI desktop/mobile/reload passed');
}finally{await browser?.close();server.kill();}
