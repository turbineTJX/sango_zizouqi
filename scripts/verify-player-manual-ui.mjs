import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const out='outputs/player-manual';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 // File URLs also prove that the delivered manual needs no web server or CDN.
 await page.goto(pathToFileURL(resolve('docs/玩家行动交互图册.html')).href);
 await page.getByRole('heading',{name:'开始普通模式',exact:true}).waitFor();
 const coverage=JSON.parse(await readFile('docs/manual/coverage.json','utf8'));
 assert.equal(await page.locator('.nav-action').count(),coverage.workflows);
 await page.evaluate(async()=>{await Promise.all(Object.values(manual.captures).map(s=>new Promise((ok,no)=>{const image=new Image();image.onload=()=>image.naturalWidth?ok():no(Error(s.file));image.onerror=()=>no(Error(s.file));image.src=s.file;})));});
 await page.screenshot({path:out+'/desktop.png'});
 await page.locator('#search').fill('预算');await page.getByRole('button',{name:'修改城市保留预算',exact:true}).click();
 assert.match(await page.locator('.steps').innerText(),/保存预算/);await page.locator('[data-shot="1"]').click();assert.match(await page.locator('#main-image').getAttribute('src'),/budget-draft/);
 await page.locator('#open-image').click();assert.ok(await page.locator('#lightbox').isVisible());await page.locator('#zoom-size').click();assert.match(await page.locator('#zoom-body').getAttribute('class'),/original/);await page.keyboard.press('Escape');assert.ok(!await page.locator('#lightbox').isVisible());
 await page.locator('#search').fill('not-a-real-action');assert.equal(await page.locator('.empty-main').innerText(),'没有匹配的操作');await page.locator('#clear-search').click();
 // Every action can be selected through the ordinary manual navigation.
 for(const item of coverage.items){await page.goto(pathToFileURL(resolve('docs/玩家行动交互图册.html')).href+'#'+item.id);await page.getByRole('heading',{name:item.name,exact:true}).waitFor();await page.locator('#main-image').evaluate(img=>img.decode());assert.equal(await page.locator('[data-shot]').count(),item.screenshots.length);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
 await page.locator('#search').fill('军略');await page.getByRole('button',{name:'施放范围军略',exact:true}).click();await page.screenshot({path:out+'/battle-flow.png'});
 for(const viewport of [{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(viewport);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}.png`});}
 await page.locator('#clear-search').click();await page.locator('#mobile-select').selectOption(coverage.items.find(a=>a.name==='读取存档').id);await page.getByRole('heading',{name:'读取存档',exact:true}).waitFor();
 // Render a pending-review fixture without modifying real code or its baseline.
 // It uses the real generated template and absolute file-based screenshot URLs.
 const original=await readFile('docs/玩家行动交互图册.html','utf8');
 const match=original.match(/const manual=(.*);\n/);assert.ok(match);
 const stale=JSON.parse(match[1]),budget=stale.maintenance.items.find(i=>i.name==='修改城市保留预算');
 stale.maintenance.pending=1;budget.pending=true;budget.reasons=['关联代码已修改'];budget.changes=['city-budget.mjs'];
 for(const capture of Object.values(stale.captures))capture.file=pathToFileURL(resolve('docs',capture.file)).href;
 const fixture=original.replace(match[0],'const manual='+JSON.stringify(stale).replace(/</g,'\\u003c')+';\n');
 await writeFile(out+'/pending-review.html',fixture);
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(pathToFileURL(resolve(out+'/pending-review.html')).href+'#'+budget.id);
 assert.ok(await page.locator('#sync-banner').isVisible());assert.ok(await page.locator('.sync-warning').isVisible());
 assert.equal(await page.locator('.nav-pending').count(),1);
 await page.locator('#show-maintenance').click();assert.ok(await page.locator('#maintenance').evaluate(el=>el.open));
 assert.match(await page.locator('#sync-current').innerText(),/city-budget.mjs/);
 await page.locator('#sync-pending a').click();await page.getByRole('heading',{name:budget.name,exact:true}).waitFor();
 await page.locator('#search').fill('预算');await page.locator('.nav-action').click();
 await page.screenshot({path:out+'/pending-review.png'});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.locator('#clear-search').click();await page.locator('#mobile-select').selectOption(coverage.items.find(a=>a.name==='读取存档').id);
 assert.equal(await page.locator('.sync-warning').count(),0);
 assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,offline:true,workflows:coverage.workflows,screenshots:coverage.screenshots,search:true,zoom:true,mobileNavigation:true,maintenanceWarning:true,viewports:[[1440,1000],[844,390],[390,844]],errors},null,2)+'\n');
 console.log(`PASS offline manual: ${coverage.workflows} workflows, ${coverage.screenshots} screenshots; search, navigation, zoom, desktop, landscape and phone.`);
}finally{await context.close();await browser.close();}
