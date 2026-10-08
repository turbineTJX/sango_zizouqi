
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/TJX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const action=n=>page.locator('[data-action="'+n+'"]');
try{
 await page.goto('http://127.0.0.1:4173/');
 await action('strategy').click();await page.locator('[data-scenario="guandu-200"]').click();await page.locator('[data-faction="cao"][data-action="select-national-faction"]').click();await action('launch-national').click();
 await action('map-directory-toggle').click();await page.locator('.city-directory-item[data-city="xuchang"]').click();
 assert.equal(await page.locator('.strategy-panel #domestic-reserve').count(),0);
 assert.equal(await page.locator('.strategy-panel .talent-panel').count(),0);
 assert.equal(await page.locator('.strategy-panel [data-tab="battles"]').count(),0);
 await action('campaign-affairs').click();await page.locator('#domestic-reserve').waitFor();assert.equal(await page.locator('.modal .talent-panel').count(),1);await page.locator('.modal [data-action="close"]').first().click();
 await page.locator('.strategy-panel [data-action="campaign-info-detail"][data-kind="city"]').click();
 assert.equal(await page.locator('.info-object-list').count(),0);assert.equal(await action('campaign-info-home').count(),0);
 await page.screenshot({path:'outputs/ui-scope-city-detail.png',animations:'disabled'});
 await page.locator('.modal [data-action="close"]').first().click();
 await action('campaign-info').click();await action('campaign-info-detail').filter({hasText:'许昌'}).click();assert.equal(await page.locator('.info-object-list').count(),1);await action('campaign-info-back').click();await page.locator('.modal [data-action="close"]').first().click();
 await page.locator('[data-action="campaign-tab"][data-tab="officers"]').click();
 assert.equal(await page.locator('.strategy-panel [data-action="campaign-personnel"]').count(),0);
 await action('campaign-city-personnel').click();assert.equal(await page.locator('[data-personnel-filter="city"]').count(),0);
 await page.locator('.modal [data-action="campaign-person-detail"]').first().click();await action('campaign-person-back').click();assert.equal(await page.locator('[data-personnel-filter="city"]').count(),0);
 await page.screenshot({path:'outputs/ui-scope-city-roster.png',animations:'disabled'});
 assert.deepEqual(errors,[]);console.log('UI scope checks passed');
}finally{await browser.close();}
