import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const out='outputs/economy-sustainability-20261011',summary=JSON.parse(await readFile(`${out}/summary.json`,'utf8'));
assert.equal(summary.phases.days,2880);assert.equal(summary.phases.naturalRuns,8);assert.equal(summary.phases.deterministicCheckpoints,96);
for(const [file,digest]of Object.entries(summary.sourceHashes))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),digest,file);
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),checks=[];
try{
 for(const [label,viewport]of [['desktop',{width:1440,height:1080}],['mobile',{width:390,height:844}]]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(resolve(out,'report.html')).href);
  assert.equal(await page.locator('h1').innerText(),'经济年度与持续压力验证');assert.equal(await page.locator('details').count(),8);
  assert.ok(await page.locator('body').innerText().then(t=>t.includes('自然战斗样本仍少')&&t.includes('第81天')&&t.includes('18%')));
  await page.locator('details summary').first().click();
  for(const href of await page.locator('a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))))await access(resolve(out,href));
  const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(size.scrollWidth<=size.width);assert.deepEqual(errors,[]);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:resolve(out,`report-${label}.png`),fullPage:false});checks.push({label,viewport,size,errors});await page.close();
 }
 await writeFile(`${out}/report-ui-check.json`,JSON.stringify({pass:true,checks},null,2));console.log('PASS annual evidence, desktop/mobile report, local evidence links and page width');
}finally{await browser.close();}
