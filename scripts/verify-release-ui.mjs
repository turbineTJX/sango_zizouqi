import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {build} from 'esbuild';
import {ROOT,buildCodeRelease,packedDataPlugin} from './release-lib.mjs';
import {newCampaign,serializeCampaign,beginExecution,advanceCampaignStep,validateCampaign} from '../strategic-campaign.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const directory=join(ROOT,'.local','verify-release-'+Date.now()),code=join(directory,'code');
await mkdir(directory,{recursive:true});const {pack,manifest}=await buildCodeRelease(code);
await build({stdin:{contents:"export {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignStep,advanceCampaignDay} from './strategic-campaign.mjs';export {NATIONAL_SCENARIOS} from './national-scenarios.mjs';",resolveDir:ROOT,loader:'js'},
 bundle:true,platform:'browser',format:'esm',target:'es2022',outfile:join(code,'verify-runtime.js'),plugins:[packedDataPlugin(pack)]});
const port=4218,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[join(code,'server.mjs')],{cwd:code,env:{...process.env,PORT:String(port),SANGO_ART:'off',SANGO_ASSET_ROOT:join(directory,'no-art')},stdio:'pipe',windowsHide:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true}),context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:960}}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const state=newCampaign(7),initial=serializeCampaign(state);
async function preferences(context){await context.addInitScript(raw=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);},initial);}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(ok=>setTimeout(ok,100));}
 await preferences(context);await page.goto(base+'/#strategy');await page.locator('.sovereign-hud').waitFor({timeout:60000});
 const actual=await page.evaluate(async()=>{const runtime=await import('./verify-runtime.js');return runtime.serializeCampaign(runtime.newCampaign(7));});assert.equal(actual,initial,'packed new campaign equals source campaign');
 const nationalExpected=NATIONAL_SCENARIOS.map(spec=>serializeCampaign(newCampaign(203,spec.id)));
 const nationalActual=await page.evaluate(async()=>{const runtime=await import('./verify-runtime.js');return runtime.NATIONAL_SCENARIOS.map(spec=>runtime.serializeCampaign(runtime.newCampaign(203,spec.id)));});assert.deepEqual(nationalActual,nationalExpected,'all seven national scenario rosters and maps retain source values');
 const simulation=newCampaign(7);beginExecution(simulation);for(let i=0;i<48;i++)advanceCampaignStep(simulation);
 const checkpoint=serializeCampaign(simulation),continued=validateCampaign(JSON.parse(checkpoint));for(let i=0;i<24;i++)advanceCampaignStep(continued);
 const packedRun=await page.evaluate(async()=>{const runtime=await import('./verify-runtime.js'),state=runtime.newCampaign(7);runtime.beginExecution(state);for(let i=0;i<48;i++)runtime.advanceCampaignStep(state);const checkpoint=runtime.serializeCampaign(state),continued=runtime.validateCampaign(JSON.parse(checkpoint));for(let i=0;i<24;i++)runtime.advanceCampaignStep(continued);return {checkpoint,continued:runtime.serializeCampaign(continued)};});
 assert.equal(packedRun.checkpoint,checkpoint);assert.equal(packedRun.continued,serializeCampaign(continued));
 const settings=page.locator('[data-action="settings"]');await settings.first().click();
 const download=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const exported=await download,saveFile=join(directory,'save.json');await exported.saveAs(saveFile);
 const raw=await readFile(saveFile,'utf8');assert.deepEqual(JSON.parse(raw),JSON.parse(initial));
 await page.locator('#import-file').setInputFiles(saveFile);await page.locator('.sovereign-hud').waitFor();await page.reload();await page.locator('.sovereign-hud').waitFor();
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);await page.reload();await page.locator('.sovereign-hud').waitFor();await context.setOffline(false);
 const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});await preferences(mobile);const phone=await mobile.newPage();phone.on('pageerror',error=>errors.push(error.message));await phone.goto(base+'/#strategy');await phone.locator('.sovereign-hud').waitFor();
 assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await phone.screenshot({path:join(directory,'mobile.png'),fullPage:true});await mobile.close();
 const broken=await browser.newContext({serviceWorkers:'block'});await preferences(broken);await broken.route('**/game-data.bin',async route=>{const bytes=Buffer.from(pack.bytes);bytes[30]^=1;await route.fulfill({status:200,body:bytes,contentType:'application/octet-stream'});});
 const failed=await broken.newPage();await failed.goto(base);await failed.getByText('游戏文件缺失、损坏或版本不一致，请重新安装。已有存档仍保留。',{exact:false}).waitFor();assert.equal(await failed.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),initial);await broken.close();
 assert.deepEqual(errors,[]);await writeFile(join(directory,'result.json'),JSON.stringify({passed:true,revision:manifest.revision,checks:['source / packed campaign parity','export and import','reload persistence','offline reload','touch viewport','corrupt data rejected without losing saves'],errors},null,2));
 console.log('Packed release UI passed (simulation and deterministic continuation included): '+directory);
}finally{await browser.close();server.kill();}
