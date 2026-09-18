import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.GAME_URL||'http://127.0.0.1:4173',output='outputs/strategic-ui';await mkdir(output,{recursive:true});
const action=name=>page.locator(`[data-action="${name}"]`);
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));
async function pauseMap(){if(await action('campaign-run').count()&&await action('campaign-run').innerText()==='暂停世界')await action('campaign-run').click();}
async function day(){await action('campaign-day').click();}
try{
  await page.goto(base+'/#strategy');await page.locator('.strategy-clock').waitFor();
  assert.match(await page.locator('.strategy-clock').innerText(),/第 1 旬/);
  await page.locator('#campaign-governor').selectOption({index:1});
  await page.locator('[data-action="campaign-project"][data-project="farm"]').click();
  assert.equal((await saved()).cities.find(c=>c.id==='xuchang').project.key,'farm');
  await page.screenshot({path:output+'/planning-desktop.png',fullPage:true});
  await action('campaign-begin').click();await pauseMap();
  for(let i=0;i<12&&!await action('campaign-auto').count();i++)await day();
  await action('campaign-auto').first().click();await pauseMap();
  await day();await day();
  const before=await saved(),r=before.campaign.battles.find(r=>!r.settled);assert.ok(r.battle.tick>0);
  await page.locator(`[data-action="campaign-focus"][data-battle="${r.id}"]`).last().click();
  await page.locator('#battle-board').waitFor();assert.equal(await page.locator('#battle-terrain').count(),0);
  const after=await saved();assert.equal(after.campaign.battles.find(b=>b.id===r.id).battle.tick,r.battle.tick);
  assert.equal(after.campaign.focusId,r.id);assert.match(await page.locator('#campaign-battle-bar').innerText(),/世界第/);
  await page.screenshot({path:output+'/takeover-desktop.png',fullPage:true});
  // Reload mid-battle: load current state, pause, and retain configuration lock.
  await page.reload();await page.locator('#battle-board').waitFor();assert.match(await action('pause').innerText(),/继续战斗/);
  for(let i=0;i<12&&await page.locator('#battle-board').count();i++)await day();
  await page.locator('.strategy-clock').waitFor();assert.equal((await saved()).campaign.phase,'planning');
  const paused=await saved();assert.equal(paused.campaign.day,11);assert.equal(paused.cities.find(c=>c.id==='xuchang').farm,2);
  await action('campaign-begin').click();await page.locator('#battle-board').waitFor();await action('pause').click();
  assert.equal((await saved()).campaign.focusId,r.id);
  await action('campaign-map').click();await page.locator('.strategy-clock').waitFor();
  await page.locator(`[data-action="campaign-history"][data-battle="${r.id}"]`).click();await page.locator('.snapshot-board').waitFor();
  await page.locator('#campaign-snapshot-day').selectOption({index:0});assert.equal(await page.locator('.modal [data-command]').count(),0);
  await page.screenshot({path:output+'/daily-snapshot.png',fullPage:true});await action('close').first().click();
  await page.setViewportSize({width:390,height:844});await page.locator('[data-action="campaign-tab"][data-tab="city"]').click();
  await page.screenshot({path:output+'/mobile-map.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile map does not overflow horizontally');
  // Trial modes continue using their independent save and battle clock.
  await action('lobby').click();await page.locator('.campaign-lobby').waitFor();await action('launch-history').click();await page.locator('#battle-board').waitFor();
  assert.equal(await page.locator('#campaign-battle-bar').count(),0);assert.equal(await page.locator('#battle-terrain').isDisabled(),true);
  await action('pause').click();await action('pause').click();await page.locator('[data-panel="tools"]').click();
  await page.locator('[data-action="step-scenario"][data-steps="10"]').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-historical-battle-v1')).battle.tick),10);
  assert.deepEqual(errors,[]);await writeFile(output+'/result.json',JSON.stringify({passed:true,errors,strategicDay:(await saved()).campaign.day},null,2));
  console.log('Strategic UI: planning, domestic actions, encounter, delegate, takeover, reload, turn boundary, return, snapshot, mobile, historical mode passed.');
}catch(error){await page.screenshot({path:output+'/failure.png',fullPage:true});console.error('Page errors:',errors);throw error;}finally{await browser.close();}
