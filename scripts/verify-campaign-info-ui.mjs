import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const action=name=>page.locator((name.startsWith('campaign-info-')?'#overlay-root ':'')+`[data-action="${name}"]`),out='outputs/campaign-info-ui';await mkdir(out,{recursive:true});
try{
 await page.goto('http://127.0.0.1:4173/');await action('strategy').click();await page.locator('[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();await page.locator('[data-action="select-national-faction"][data-faction="cao"]').click();await page.locator('[data-action="launch-national"]').click();
 const before=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 await action('campaign-info').click();
 for(const type of ['city','army','unit','officer','faction']){await page.locator(`[data-action="campaign-info-tab"][data-kind="${type}"]`).click();if(await action('campaign-info-detail').count()){await action('campaign-info-detail').first().click();assert.ok(await page.locator('[data-info-section="overview"]').count());assert.ok(await page.locator('[data-info-section="status"]').count());await action('campaign-info-back').click();}}
 await page.locator('[data-action="campaign-info-tab"][data-kind="city"]').click();await page.locator('#campaign-info-query').fill('许昌');await action('campaign-info-detail').click();
 await page.screenshot({path:out+'/city-desktop.png',fullPage:false,animations:'disabled'});
 await page.locator('[data-info-section="units"] button').first().click();await page.locator('[data-info-section="overview"] [data-kind="officer"]').click();
 await page.screenshot({path:out+'/officer-desktop.png',fullPage:false,animations:'disabled'});
 await action('campaign-info-back').click();await action('campaign-info-back').click();await action('campaign-info-back').click();assert.equal(await page.locator('#campaign-info-query').inputValue(),'许昌');
 await page.setViewportSize({width:390,height:844});await action('campaign-info-detail').click();await page.screenshot({path:out+'/city-mobile.png',fullPage:false,animations:'disabled'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),before);assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,errors},null,2));console.log('Information panels: desktop, mobile, navigation, search and read-only checks passed');
}finally{await browser.close();}
