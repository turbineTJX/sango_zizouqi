import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4197',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(new Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1060}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const out='outputs/national-campaign';await mkdir(out,{recursive:true});
 await page.goto('http://127.0.0.1:4197/');await page.locator('[data-action="strategy"]').click();assert.equal(await page.locator('[data-action="launch-national"]').count(),2);await page.screenshot({path:out+'/lobby-desktop.png',fullPage:true});
 await page.locator('[data-action="launch-national"][data-scenario="guandu-200"]').click();await page.locator('.national-world').waitFor();assert.equal(await page.locator('[data-city]').count(),87);assert.equal(await page.locator('.node-city').count(),42);assert.equal(await page.locator('.node-gate').count(),10);assert.equal(await page.locator('.node-port').count(),35);await page.screenshot({path:out+'/map-desktop.png',fullPage:true});
 const savedBeforeMap=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 await page.locator('#national-city-search').selectOption('town-42');assert.match(await page.locator('.strategy-panel-body h2').innerText(),/云南/);assert.match(await page.locator('.national-world').getAttribute('class'),/map-detail/);await page.screenshot({path:out+'/southwest-detail.png',fullPage:true});
 await page.locator('[data-map-view="national"]').click();assert.equal(await page.locator('.national-world').getAttribute('viewBox'),'0 0 1024 1024');
 await page.locator('#map-season').selectOption('winter');assert.equal(await page.locator('.drawn-terrain').getAttribute('data-season'),'winter');
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),savedBeforeMap,'map controls leave the game save unchanged');
 await page.reload();assert.equal(await page.locator('[data-city]').count(),87);assert.match(await page.locator('.strategy-heading').innerText(),/官渡风云/);
 await page.locator('[data-action="lobby"]').click();await page.locator('[data-action="strategy"]').click();await page.locator('[data-action="launch-national"][data-scenario="heroes-251"]').click();assert.match(await page.locator('.strategy-heading').innerText(),/英雄集结/);
 await page.locator('[data-action="campaign-begin"]').click();await page.locator('[data-action="campaign-run"]').click();assert.equal(await page.locator('.strategy-notice').count(),1);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/map-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile overflow');
 await page.locator('[data-action="lobby"]').click();await page.locator('[data-action="strategy"]').click();await page.screenshot({path:out+'/lobby-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'lobby mobile overflow');
 await page.locator('[data-action="continue-national"]').click();assert.match(await page.locator('.strategy-heading').innerText(),/英雄集结/);assert.deepEqual(errors,[]);
 if(process.argv.includes('--audit-save')){const raw=await readFile(out+'/heroes-251-audit-save.json','utf8');await page.goto('http://127.0.0.1:4197/icon.svg');await page.evaluate(raw=>localStorage.setItem('sango-sovereign-v2',raw),raw);await page.goto('http://127.0.0.1:4197/#strategy');assert.match(await page.locator('.strategy-heading').innerText(),/英雄集结/);assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).campaign.day>=61));await page.locator('[data-action="campaign-begin"]').click();await page.locator('[data-action="campaign-run"]').click();await page.reload();assert.match(await page.locator('.strategy-heading').innerText(),/英雄集结/);assert.deepEqual(errors,[]);}
 await writeFile(out+'/result.json',JSON.stringify({passed:true,cities:42,gates:10,ports:35,scenarios:2,errors},null,2));console.log('National campaign UI passed');
}finally{await browser?.close();server.kill();}
