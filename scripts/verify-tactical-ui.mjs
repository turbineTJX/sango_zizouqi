import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const out='outputs/tactical-ui';await mkdir(out,{recursive:true});
const act=name=>page.locator(`[data-action="${name}"]`);
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-historical-battle-v1')));
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');
 await page.locator('[data-category="tactical"]').click();
 assert.equal(await page.locator('.historical-card').count(),5);
 for(const id of ['tactical-control-lv','tactical-control-zhang','tactical-three-heroes','tactical-shu-defense','tactical-lv-cao']){
  await page.locator(`[data-action="select-history"][data-scenario="${id}"]`).click();
  assert.match(await page.locator('.historical-roster').first().innerText(),/上限/);
  assert.ok(!(await page.locator('.historical-detail').innerText()).includes('NaN'));
  if(id==='tactical-three-heroes')await page.screenshot({path:`${out}/three-heroes.png`,fullPage:true});
  if(id==='tactical-shu-defense'){
   assert.match(await page.locator('.historical-detail').innerText(),/61,800/);
   assert.match(await page.locator('.historical-detail').innerText(),/240/);
  }
  await act('launch-history').click();await page.locator('#battle-board').waitFor();
  const start=await saved();assert.equal(start.testScenario.id,id);
  assert.equal(start.battle.tick,0);
  const units=start.battle.sides[0].units;
  assert.ok(new Set(units.map(u=>u.hp)).size>1);
  if(id==='tactical-three-heroes'){
   assert.equal(units.reduce((n,u)=>n+u.hp,0),8500);assert.equal(start.battle.sides[1].units[0].hp,8500);
   await page.locator('[data-panel="intel"]').click();await act('unit-stats').click();
   assert.match(await page.locator('.unit-state-grid').innerText(),/带兵上限/);
   assert.match(await page.locator('.unit-state-grid').innerText(),/本场初始兵力/);
   await act('close').first().click();await act('close-battle-panel').click();
   await page.screenshot({path:`${out}/three-battle.png`,fullPage:true});
  }
  await act('pause').click();await act('pause').click();await page.locator('[data-panel="tools"]').click();
  await page.locator('[data-action="step-scenario"][data-steps="10"]').click();
  await page.reload();await page.locator('#battle-board').waitFor();assert.equal((await saved()).battle.tick,10);
  assert.match(await act('pause').innerText(),/继续战斗/);
  await page.locator('[data-panel="tools"]').click();await act('retry-scenario').click();
  assert.equal((await saved()).testScenario.seed,start.testScenario.seed);assert.equal((await saved()).battle.tick,0);
  await page.locator('[data-panel="tools"]').click();await act('rematch-scenario').click();
  assert.notEqual((await saved()).testScenario.seed,start.testScenario.seed);
  await act('lobby').first().click();await act('continue-history').click();assert.equal((await saved()).testScenario.id,id);
  await act('lobby').first().click();
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-action="select-history"][data-scenario="tactical-shu-defense"]').click();
 await page.screenshot({path:`${out}/mobile-defense.png`,fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await act('launch-history').click();assert.match(await page.locator('.arena-title').innerText(),/坚守 0 \/ 240/);
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await context.setOffline(true);await page.reload();
 await page.locator('#battle-board').waitFor();assert.equal((await saved()).testScenario.id,'tactical-shu-defense');
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({passed:true,errors},null,2));
 console.log('Tactical UI checks passed: five entries, capacity display, paused refresh, same/new seed, continuation, mobile and offline.');
}finally{await browser.close();}
