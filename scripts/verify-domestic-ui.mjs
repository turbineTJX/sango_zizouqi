import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base=process.env.GAME_URL||'http://127.0.0.1:4183',out='outputs/domestic-cooperation-ui';await mkdir(out,{recursive:true});
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2'))),action=k=>page.locator(`[data-action="${k}"]`);
async function pause(){if(await action('campaign-run').count()&&await action('campaign-run').innerText()==='暂停世界')await action('campaign-run').click();}
try{
 await page.goto(base+'/#strategy');await page.locator('.strategy-clock').waitFor();assert.equal(await page.locator('[data-domestic-direction]').count(),5);
 assert.match(await page.locator('.strategy-panel').innerText(),/预备兵/);assert.match(await page.locator('.strategy-panel').innerText(),/城内士兵/);
 await page.locator('#domestic-reserve').fill('900');await page.locator('#domestic-reserve').press('Tab');assert.equal((await saved()).campaign.domestic.reserveGold,900);
 await page.getByLabel('商业负责人',{exact:true}).selectOption({index:1});
 await page.getByLabel('商业负责人',{exact:true}).selectOption({index:1});
 assert.equal((await saved()).campaign.domestic.assignments.length,2);
 assert.equal(await page.locator('[data-direction="commerce"] [data-domestic-officer]').count(),2);
 assert.match(await page.locator('[data-direction="commerce"]').innerText(),/同城同方向可自动协作/);
 await page.screenshot({path:out+'/assignments-desktop.png',fullPage:true});
 await action('campaign-begin').click();await pause();const started=await saved();assert.ok(started.campaign.domestic.events.some(e=>e.phase==='start'));
 for(let i=0;i<18&&(await saved()).campaign.day<11;i++){
  if(await action('campaign-auto').count()){await action('campaign-auto').first().click();await pause();}
  else {await action('campaign-day').click();await pause();}
 }
 const progressed=await saved();assert.equal(progressed.campaign.day,11);assert.equal(progressed.campaign.domestic.assignments.length,2);
 assert.ok(progressed.campaign.domestic.events.some(e=>['complete','failure'].includes(e.phase)));
 assert.ok(progressed.campaign.domestic.cooperation['xuchang:commerce']);
 assert.equal(progressed.campaign.domestic.events.filter(e=>e.phase==='cooperation').length,1);
 await page.locator('[data-action="campaign-tab"][data-tab="city"]').click();
 assert.match(await page.locator('[data-cooperation-direction="commerce"]').innerText(),/当次协作机会/);
 await page.screenshot({path:out+'/cooperation-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.locator('[data-direction="commerce"]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/cooperation-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.setViewportSize({width:1440,height:1000});
 await page.reload();await page.locator('.strategy-clock').waitFor();assert.equal((await saved()).campaign.domestic.seed,progressed.campaign.domestic.seed);
 assert.equal((await saved()).campaign.domestic.assignments.length,2);
 assert.deepEqual((await saved()).campaign.domestic.cooperation,progressed.campaign.domestic.cooperation);
 await page.getByLabel('农业负责人',{exact:true}).selectOption({index:1});assert.equal((await saved()).campaign.domestic.assignments.length,2);assert.equal(await page.locator('[data-direction="commerce"] [data-domestic-officer]').count(),1);
 await page.locator('[data-direction="agriculture"] [data-action="domestic-dismiss"]').click();assert.equal((await saved()).campaign.domestic.assignments.length,1);assert.equal(await page.locator('[data-direction="commerce"] [data-domestic-officer]').count(),1);
 await page.getByLabel('商业负责人',{exact:true}).selectOption({index:1});assert.equal((await saved()).campaign.domestic.assignments.length,2);assert.deepEqual((await saved()).campaign.domestic.cooperation,progressed.campaign.domestic.cooperation);
 await page.screenshot({path:out+'/results-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,day:progressed.campaign.day,events:progressed.campaign.domestic.events.length,cooperation:progressed.campaign.domestic.cooperation,errors},null,2));console.log('Domestic UI: multiple officers, single-officer removal, cooperation records, budget, results, reassign, reload and mobile passed.');
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});console.error(errors);throw e;}finally{await browser.close();}
