import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4198'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const action=x=>page.locator(`[data-action="${x}"]`);
 await page.goto('http://127.0.0.1:4198');await action('campaign-lobby').click();assert.equal(await page.locator('.custom-battle').count(),1);assert.equal(await page.locator('.historical-card').count(),0);
 mkdirSync('outputs/custom-editor',{recursive:true});await page.screenshot({path:'outputs/custom-editor/desktop.png'});
 assert.equal(await page.locator('[data-custom-option="seed"]').count(),0);await page.locator('[data-custom-option="limit"]').fill('15');await page.locator('[data-custom-option="limit"]').press('Tab');
 await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();await action('scenario-setup-cancel').click();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:'outputs/custom-editor/mobile.png'});
 await action('launch-custom').click();await action('scenario-launch-confirm').click();await page.locator('#battle-board').waitFor();assert.match(await page.locator('.arena-title').innerText(),/战前布阵/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-historical-battle-v1')).battle.maxTicks),360);
 await page.reload();await page.locator('#battle-board').waitFor();await action('lobby').first().click();await action('campaign-lobby').click();await action('continue-history').click();await page.locator('#battle-board').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS editor entry, no presets, draft edit, muster, review, launch, mobile, reload, resume');
}finally{await browser?.close();server.kill();}
