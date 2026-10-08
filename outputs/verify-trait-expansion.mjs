import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('C:/Users/TJX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1400,height:1000}});await page.setContent(await readFile('outputs/独立特性设计稿.html','utf8'));assert.equal(await page.locator('article:visible').count(),65);await page.selectOption('#tier','专属');assert.equal(await page.locator('article:visible').count(),15);await page.screenshot({path:'outputs/trait-expansion-exclusive.png'});await page.selectOption('#tier','全部');await page.fill('#search','曹仁');assert.ok(await page.locator('article:visible').count()>0);await page.fill('#search','');await page.selectOption('#state','已接入');assert.equal(await page.locator('article:visible').count(),65);await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:'outputs/trait-expansion-mobile.png'});console.log('Preview passed: 65 live, fifteen exclusives, search and mobile.');}finally{await browser.close();}

