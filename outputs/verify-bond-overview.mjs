import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/TJX/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {const page=await browser.newPage({viewport:{width:1280,height:900}});await page.setContent(await readFile('outputs/羁绊一览.html','utf8'));assert.equal(await page.locator('tbody tr').count(),Object.keys(BOND_DESIGNS).length);await page.screenshot({path:'outputs/bond-overview.png'});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));console.log('Overview renders all bonds without mobile overflow.');}finally{await browser.close();}
