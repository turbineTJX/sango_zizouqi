import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),out='outputs/talent-economy-20261011';
const browser=await chromium.launch({channel:'msedge',headless:true}),checks=[];
try{
 for(const [label,viewport]of [['desktop',{width:1440,height:1080}],['mobile',{width:390,height:844}]]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(resolve(out,'report.html')).href);
  assert.equal(await page.locator('h1').innerText(),'优秀人才应当创造超过俸禄的价值');assert.equal(await page.locator('details').count(),8);
  assert.ok(await page.locator('table').count()>=13);await page.locator('details summary').first().click();
  const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(size.scrollWidth<=size.width);assert.deepEqual(errors,[]);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:resolve(out,`report-${label}.png`),fullPage:false});checks.push({label,viewport,size,errors});await page.close();
 }
 await writeFile(`${out}/report-ui-check.json`,JSON.stringify({pass:true,checks},null,2));console.log('PASS desktop/mobile report, actual tables and evidence disclosures, no page overflow');
}finally{await browser.close();}
