import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=resolve(process.argv[2]||'outputs/faction-strength-20261011');
const data=JSON.parse(readFileSync(join(base,'summary.json'),'utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(join(base,'report.html')).href);
 for(const mode of data.modes){
  await page.locator('#mode').selectOption(mode.id);
  for(const map of ['all',...mode.maps]){
   await page.locator('#map').selectOption(map);
   assert.equal(await page.locator('#ranking tr').count(),13);
   assert.equal(await page.locator('#matrix tr').count(),13);
   assert.equal(await page.locator('#forces .card').count(),12);
   const text=await page.locator('#ranking').innerText();assert.doesNotMatch(text,/NaN|undefined/);
   const expected=data.summaries.find(s=>s.mode===mode.id&&s.mapId===map).forces;
   const actual=await page.locator('#ranking tr').allTextContents();
   for(const f of expected)assert.ok(actual.some(s=>s.includes(f.name)&&s.includes(f.winPct+'%')));
   if(mode.id==='cost10')assert.equal(new Set(expected.map(f=>f.trainingGold)).size,1);
   checks.push({mode:mode.id,map});
  }
 }
 await page.locator('#mode').selectOption('main10');
 await page.locator('#map').selectOption('all');
 await page.screenshot({path:join(base,'report-desktop.png'),animations:'disabled'});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:join(base,'report-mobile.png'),animations:'disabled'});
 assert.deepEqual(errors,[]);
 writeFileSync(join(base,'ui-check.json'),JSON.stringify({checks,errors,desktop:true,mobile:true},null,2));
 console.log(JSON.stringify({passed:true,contexts:checks.length,errors}));
}finally{await browser.close();}
