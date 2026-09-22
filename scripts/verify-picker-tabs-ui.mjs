import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));await mkdir('outputs/picker-tabs',{recursive:true});
try{
 await page.goto('http://127.0.0.1:4173/');await page.locator('[data-action="campaign-lobby"]').click();await page.locator('[data-action="custom-setup"]').click();await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();
 await page.locator('[data-action="scenario-unit-choose"]').click();
 const heads=page.locator('.task-candidate-list th'),tab=name=>page.locator(`[data-action="task-picker-tab"][data-tab="${name}"]`),next=page.locator('[data-action="scenario-setup-page"]').last();
 assert.equal(await heads.count(),6);
 await page.locator('.task-candidate-list').evaluate(el=>{el.scrollTop=700;});
 const position=()=>page.locator('.task-candidate-list').evaluate(el=>{const edge=el.getBoundingClientRect().top,header=el.querySelector('thead').offsetHeight,row=[...el.querySelectorAll('tbody tr')].find(r=>r.getBoundingClientRect().bottom>edge+header);return {id:row.querySelector('input').dataset.scenarioChoice,offset:row.getBoundingClientRect().top-edge,top:el.scrollTop};});
 const prior=await position();
 const visible=await page.locator('.task-candidate-list').evaluate(el=>{const edge=el.getBoundingClientRect().top+el.querySelector('thead').offsetHeight;return [...el.querySelectorAll('tbody tr')].find(r=>r.getBoundingClientRect().top>edge+4).querySelector('input').dataset.scenarioChoice;});
 await page.locator(`[data-scenario-choice="${visible}"]`).click();await page.locator('[data-action="scenario-unit-choose"]').click();assert.equal((await position()).id,prior.id);
 await page.locator(`.task-candidate-list [data-officer="${visible}"]`).click();await page.locator('.modal [data-action="close"]').last().click();assert.equal((await position()).id,prior.id);assert.ok(Math.abs((await position()).offset-prior.offset)<2);

 for(const name of ['traits','abilities']){await tab(name).click();const current=await position();assert.equal(current.id,prior.id);assert.ok(Math.abs(current.offset-prior.offset)<2);assert.ok(current.top>0);}
 await tab('traits').click();await page.locator('[data-action="task-picker-traits"]').last().click();assert.equal((await position()).id,prior.id);await tab('abilities').click();

 await tab('traits').click();assert.ok(await heads.count()<=6);const first=await heads.allTextContents();await page.locator('[data-action="task-picker-traits"]').last().click();assert.notDeepEqual(await heads.allTextContents(),first);assert.ok(await heads.count()<=6);
 assert.equal(await tab('relations').count(),0);await tab('abilities').click();
 const ids=new Set();let count=0;
 while(true){for(const id of await page.locator('[data-scenario-choice]').evaluateAll(nodes=>nodes.map(n=>n.dataset.scenarioChoice)))ids.add(id);count++;
 const box=await next.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=800,'pagination must stay in viewport');
 if(await next.isDisabled())break;await next.click();assert.ok(count<50);
 }
 assert.equal(ids.size,832);assert.equal(count,35);
 await page.screenshot({path:'outputs/picker-tabs/last-page.png'});
 await page.setViewportSize({width:390,height:844});const box=await next.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=844);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await tab('traits').click();await page.screenshot({path:'outputs/picker-tabs/mobile.png'});
 await page.locator('[data-scenario-query]').fill('曹操');assert.equal(await page.locator('[data-scenario-choice][type=checkbox]').count(),0);assert.match(await page.locator('.picker-row-pages').textContent(),/1 \/ 1/);
 await tab('abilities').click();await page.locator('[data-scenario-query]').fill('');await page.locator('.task-candidate-list').evaluate(el=>el.scrollTop=600);const sortTop=await page.locator('.task-candidate-list').evaluate(el=>el.scrollTop);await page.locator('[data-sort-key="leadership"]').click();assert.equal(await page.locator('.task-candidate-list').evaluate(el=>el.scrollTop),sortTop);
 assert.deepEqual(errors,[]);console.log('Picker tabs passed: bounded columns, all 832 candidates reachable, fixed pagination on desktop/mobile, selection retained and search resets page.');
}finally{await browser.close();}
