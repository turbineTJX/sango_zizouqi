
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

 await action('map-quick-open').filter({hasText:'据点'}).first().click();
 const panel=page.locator('.map-quick-directory');await panel.waitFor({state:'visible'});
 await page.locator('#map-quick-query').fill('许昌');
 await panel.locator('[data-action="map-quick-select"]').click();
 assert.equal(await panel.isVisible(),true);assert.equal(await page.locator('.modal').count(),0);
 await panel.locator('[data-action="campaign-info-detail"]').click();assert.equal(await page.locator('.info-object-list').count(),0);await page.locator('.modal [data-action="close"]').first().click();
 assert.equal(await page.locator('#map-quick-query').inputValue(),'许昌');
 await panel.locator('[data-action="map-quick-open"][data-kind="army"]').click();assert.equal(await page.locator('#map-quick-query').inputValue(),'');
 await panel.locator('[data-action="map-quick-open"][data-kind="city"]').click();assert.equal(await page.locator('#map-quick-query').inputValue(),'许昌');
 await page.locator('#map-quick-query').fill('');
 const choices=panel.locator('[data-action="map-quick-select"]');assert.ok(await choices.count()>1);await choices.nth(1).click();assert.equal(await panel.isVisible(),true);
 await page.screenshot({path:'outputs/map-quick-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});await panel.locator('[data-action="map-quick-select"]').first().click();
 await panel.locator('[data-action="campaign-info-detail"]').click();assert.equal(await page.locator('.info-dossier').count(),1);await page.locator('.modal [data-action="close"]').first().click();
 await page.screenshot({path:'outputs/map-quick-mobile.png',animations:'disabled'});
 assert.deepEqual(errors,[]);console.log('UI scope checks passed');
}finally{await browser.close();}
