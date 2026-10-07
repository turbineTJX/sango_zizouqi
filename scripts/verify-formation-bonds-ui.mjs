import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4201'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4201');await page.locator('[data-action="campaign-lobby"]').click();await page.locator('[data-history="xiapi"]').click();
 await page.locator('[data-action="launch-custom"]').click();
 const personal=await page.locator('.personal-bonds').first().innerText();assert.doesNotMatch(personal,/当前 \/ 上限|\d\s*\/\s*\d/);
 await page.locator('[data-action="scenario-launch-confirm"]').click();
 const row=page.locator('#battle-bonds .bond-lit').first();
 assert.ok(await page.locator('.battle-bonds .bond-grade-basic').count()>0);assert.ok(await page.locator('.battle-bonds .bond-grade-advanced').count()>0);
 assert.equal(await page.locator('#battle-bonds .bond-tooltip-card,#battle-bonds .bond-effect,#battle-bonds .bond-members,#battle-bonds .bond-thresholds').count(),0);
 await row.hover();assert.equal(await page.locator('.text-detail-view').count(),0);
 const layout=await page.locator('.battle-layout').boundingBox(),bar=await page.locator('#battle-bonds').boundingBox(),roster=await page.locator('.roster-side-0 .roster-list').boundingBox();assert.ok(layout.height>500);assert.ok(bar.x>=roster.x+roster.width);assert.ok(bar.y<roster.y);
 const bondRows=await page.locator('#battle-bonds .bond-row').all();
 for(let i=0;i<bondRows.length;i++){assert.match(await bondRows[i].innerText(),/\d+\/\d+/);if(i){const previous=await bondRows[i-1].boundingBox(),current=await bondRows[i].boundingBox();assert.equal(current.x,previous.x);assert.ok(current.y>previous.y);}}
 await row.click();const detail=await page.locator('.text-detail-view').innerText();assert.doesNotMatch(detail,/定位|稀缺性|组阵取舍|贡献部队|当前等级|当前状态|完整效果|成长/);assert.match(detail,/点 · 当前/);assert.ok(await page.locator('.text-detail-view tbody tr').count()<=3);
 await mkdir('outputs/formation-bonds',{recursive:true});await page.screenshot({path:'outputs/formation-bonds/desktop-details.png',animations:'disabled'});await page.keyboard.press('Escape');await page.screenshot({path:'outputs/formation-bonds/desktop.png',animations:'disabled'});
 const before=await page.locator('#battle-bonds .bond-heading').allTextContents();
 await page.mouse.move(700,100);
 const transfer=await page.evaluateHandle(()=>new DataTransfer());
 await page.locator('.battle-unit.side-0').nth(1).dispatchEvent('dragstart',{dataTransfer:transfer});
 await page.locator('[data-reserve-bench]').dispatchEvent('drop',{dataTransfer:transfer});
 const after=await page.locator('#battle-bonds .bond-heading').allTextContents();assert.notDeepEqual(after,before);
 for(const viewport of [{width:1024,height:640},{width:900,height:600}]){
  await page.setViewportSize(viewport);
  const column=await page.locator('#battle-bonds').boundingBox(),troops=await page.locator('.roster-side-0 .roster-list').boundingBox();assert.ok(column.x>=troops.x+troops.width);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.ok((await page.locator('.arena-stage').boundingBox()).height>=300);
  await page.screenshot({path:`outputs/formation-bonds/${viewport.width}.png`,fullPage:true,animations:'disabled'});
 }
 await page.setViewportSize({width:390,height:844});
 const mobileRow=page.locator('#battle-bonds .bond-row').first();await mobileRow.click();
 assert.ok(await page.locator('.text-detail-view').isVisible());assert.doesNotMatch(await page.locator('.text-detail-view').innerText(),/完整效果|稀缺性|定位/);
 await page.screenshot({path:'outputs/formation-bonds/mobile-details.png',animations:'disabled'});await page.keyboard.press('Escape');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 const mobileBar=await page.locator('#battle-bonds').boundingBox(),mobileRoster=await page.locator('.roster-side-0 .roster-list').boundingBox();assert.ok(mobileBar.x>=mobileRoster.x+mobileRoster.width);assert.ok(mobileBar.height<=150);
 await page.screenshot({path:'outputs/formation-bonds/mobile.png',fullPage:true,animations:'disabled'});assert.deepEqual(errors,[]);
 await page.locator('[data-action="pause"]').first().click();assert.ok(await page.locator('#battle-bonds').isVisible());assert.ok(await page.locator('#enemy-battle-bonds').isVisible());
 console.log('PASS roster-side vertical progress, actual field points, concise tier details, substitution and desktop/mobile battle visibility');
}finally{await browser?.close();server.kill();}
