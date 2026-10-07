import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS,nationalWorld,nationalRoster} from '../national-scenarios.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const port='4231',out='outputs/reference-scenarios';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],checks=[];
 const samples={'coalition-190':'force-6','warlords-194':'lijue','red-cliffs-208':'sunquan','hanzhong-219':'force-2','all-heroes-251':'force-29'};
 for(const spec of NATIONAL_SCENARIOS.filter(s=>s.rosterDistribution==='reference')){
  const page=await browser.newPage({viewport:{width:1440,height:1050}});page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${port}/`);await page.locator('[data-action="strategy"]').click();
  assert.equal(await page.locator('[data-action="select-national-scenario"]').count(),7);
  const ribbon=page.locator(`[data-scenario="${spec.id}"]`);assert.match(await ribbon.locator('span').innerText(),spec.kind==='fictional'?/架空/:/历史改编/);await ribbon.click();
  assert.equal(await page.locator('.ruler-strip [data-faction]').count(),spec.factions.length);assert.equal(await page.locator('[data-action="launch-national"]').isDisabled(),true);
  const faction=samples[spec.id],button=page.locator(`.ruler-strip [data-faction="${faction}"]`);await button.scrollIntoViewIfNeeded();await button.click();assert.equal(await page.locator('.force-summary h2').innerText(),NATIONAL_FACTIONS[faction].name);
  const world=nationalWorld(spec.id),roster=nationalRoster(spec.id,world.cities);assert.equal(await page.locator('.force-numbers b').first().innerText(),String(world.cities.filter(c=>c.owner===faction).length));assert.equal(await page.locator('.force-numbers b').last().innerText(),String(roster.filter(o=>o.faction===faction).length));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:`${out}/${spec.id}-faction.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  if(spec.layout==='reference'){
   const last=page.locator('.ruler-strip [data-faction]').last();await last.scrollIntoViewIfNeeded();await last.click();assert.equal(await last.getAttribute('aria-pressed'),'true');await button.scrollIntoViewIfNeeded();await button.click();await page.screenshot({path:`${out}/all-rulers-mobile.png`,fullPage:true});
  }
  await page.locator('[data-action="launch-national"]').click();await page.locator('.national-world').waitFor();assert.equal(await page.locator('.national-world [data-city]').count(),76);assert.equal(await page.locator('.national-world [data-junction]').count(),70);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));assert.equal(saved.campaign.scenarioId,spec.id);assert.equal(saved.campaign.playerFaction,faction);
  await page.setViewportSize({width:1440,height:1050});await page.locator('[data-map-view="national"]').click();await page.screenshot({path:`${out}/${spec.id}-map.png`});
  await page.reload();await page.locator('.national-world').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).campaign.playerFaction),faction);
  checks.push({scenario:spec.id,rulers:spec.factions.length,officers:roster.length,player:faction});await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1050}});await page.goto(`http://127.0.0.1:${port}/`);await page.locator('[data-action="strategy"]').click();await page.screenshot({path:`${out}/scenario-list.png`});await page.close();
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS all five new scenarios: source numbers, faction selection, mobile scrolling, real launch and reload');
}finally{await browser?.close();server.kill();}
