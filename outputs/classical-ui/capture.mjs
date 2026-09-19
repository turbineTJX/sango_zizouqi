import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);

let browser;
try {

 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const action=name=>page.locator(`[data-action="${name}"]`);
 await page.goto('http://127.0.0.1:4208');
 await page.locator('.mode-selection').waitFor();
 await page.screenshot({path:'outputs/classical-ui/home-desktop.png',fullPage:true,animations:"disabled"});
 await action('settings').click(); await page.locator('.modal').waitFor();
 await page.screenshot({path:'outputs/classical-ui/settings.png',fullPage:true,animations:"disabled"});
 await action('close').first().click();
 await action('strategy').click(); await page.locator('.strategy-page').waitFor();
 await page.screenshot({path:'outputs/classical-ui/strategy-desktop.png',fullPage:true,animations:"disabled"});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'outputs/classical-ui/strategy-mobile.png',fullPage:true,animations:"disabled"});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'strategy mobile overflow');
 await action('lobby').first().click();
 await page.setViewportSize({width:1440,height:1000});
 await action('campaign-lobby').click(); await page.locator('.historical-card').first().waitFor();
 await page.screenshot({path:'outputs/classical-ui/campaign-desktop.png',fullPage:true,animations:"disabled"});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'outputs/classical-ui/campaign-mobile.png',fullPage:true,animations:"disabled"});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'campaign mobile overflow');
 await page.setViewportSize({width:1440,height:1000});
 await action('launch-history').click();await page.locator('#battle-board').waitFor();
 await page.waitForTimeout(1200);
 await page.screenshot({path:'outputs/classical-ui/battle-desktop.png',fullPage:true,animations:"disabled"});
 await action('pause').click(); await page.waitForTimeout(600); await action('pause').click();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'outputs/classical-ui/battle-mobile.png',fullPage:true,animations:"disabled"});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'battle mobile overflow');
 await action('lobby').first().click();
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.context().setOffline(true); await page.reload();await page.locator('.mode-selection').waitFor();
 assert.ok(await page.evaluate(async()=>{const r=await fetch('./landscape-scroll.svg');return r.ok;}),'offline artwork');
 await page.screenshot({path:'outputs/classical-ui/home-mobile.png',fullPage:true,animations:"disabled"});
 assert.deepEqual(errors,[]);
 await writeFile('outputs/classical-ui/result.json',JSON.stringify({errors,mobileOverflow:false,offlineArtwork:true,screens:['home','settings','strategy','campaign','battle']},null,2));
 console.log('PASS: classical theme desktop/mobile, navigation, battle playback, settings and offline artwork');
} finally { await browser?.close(); }
