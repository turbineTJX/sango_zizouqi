import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign,validateCampaign} from '../tests/helpers/auto-domestic-campaign.mjs';
import {scoutCandidates,scoutRoute,scoutJourney} from '../scouting.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {residentOfficer} from '../city-personnel.mjs';
import {chooseAssignment} from './assignment-picker-ui-helpers.mjs';
import {resumePlayerTime,pausePlayerTime} from './time-control-ui-helpers.mjs';

const out='outputs/scouting-dispatch-ui',port=4398,base=`http://127.0.0.1:${port}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'off'},windowsHide:true,stdio:'pipe'});
let browser,page;const errors=[];
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const mobile of [false,true]){
  const s=newCampaign(203,'guandu-200'),home='xuchang',target='runan',officer=scoutCandidates(s,home)[0].unit.id,city=s.cities.find(c=>c.id===home),trip=scoutJourney(s,home,scoutRoute(s,home,target)),gold=city.gold;
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(raw=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!sessionStorage.getItem('scout-once-seeded')){localStorage.setItem('sango-sovereign-v2',raw);sessionStorage.setItem('scout-once-seeded','1');}},serializeCampaign(s));
  await page.goto(base+'/#strategy');await page.locator('.national-world').waitFor();
  const saved=()=>page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')));
  await page.locator('.world-commands [data-action="scout-open"]').click();await chooseAssignment(page,'#scout-city',home);await chooseAssignment(page,'#scout-officer',officer);await chooseAssignment(page,'#scout-target',target);
  assert.equal(await page.locator('.scout-route').innerText(),`${trip.days} 天`);assert.equal(await page.locator('.scout-cost').innerText(),`${trip.gold} 金`);assert.match(await page.locator('.map-command-footer').innerText(),new RegExp(`${trip.days} 天 · ${trip.gold} 金`));assert.equal((await saved()).cities.find(c=>c.id===home).gold,gold);
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-preview.png`,fullPage:true});
  await page.locator('[data-action="scout-dispatch"]').click();await page.locator('[data-action="scout-recall"]').waitFor();let after=await saved(),task=after.campaign.scouting.tasks.find(t=>t.officerId===officer);assert.equal(task.plannedDays,trip.days);assert.equal(task.paidGold,trip.gold);assert.equal(after.cities.find(c=>c.id===home).gold,gold-trip.gold);assert.equal(after.campaign.day,1);
  await page.locator('.scouting-screen [data-action="close"]').click();await page.reload();await page.locator('.national-world').waitFor();assert.equal((await saved()).cities.find(c=>c.id===home).gold,gold-trip.gold);
  const deadline=Date.now()+120000;
  while(Date.now()<deadline){
   after=await saved();if(!after.campaign.scouting.tasks.some(t=>t.id===task.id))break;
   const reports=page.getByRole('heading',{name:'战略奏报',exact:true});
   if(await reports.isVisible())await page.locator('.modal-header [data-action="close"]').last().click();else await resumePlayerTime(page);
   await page.waitForTimeout(150);
  }
  await pausePlayerTime(page);after=await saved();assert.equal(after.campaign.scouting.tasks.some(t=>t.id===task.id),false,'actual time controls must finish the trip');assert.equal(residentOfficer(after,officer).unit.scouting,undefined);assert.equal(residentOfficer(after,officer).location,home);assert.ok(after.campaign.vision.factions.cao.scouted.length);assert.ok(after.campaign.personnelEvents.some(e=>e.type==='SCOUT_COMPLETE'&&e.officerId===officer));validateCampaign(after);
  while(await page.getByRole('heading',{name:'战略奏报',exact:true}).isVisible())await page.locator('.modal-header [data-action="close"]').last().click();
  assert.equal(await page.locator(`[data-scout-task="${task.id}"]`).count(),0);await page.locator('.world-commands [data-action="scout-open"]').click();assert.equal(await page.locator(`[data-action="scout-recall"][data-officer="${officer}"]`).count(),0);
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-completed.png`,fullPage:true});
  await context.close();
  const poor=newCampaign(203,'guandu-200');poor.cities.find(c=>c.id===home).gold=trip.gold-1;syncResourceTotals(poor);
  const low=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},serviceWorkers:'block'});page=await low.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await low.addInitScript(raw=>localStorage.setItem('sango-sovereign-v2',raw),serializeCampaign(poor));
  await page.goto(base+'/#strategy');await page.locator('.national-world').waitFor();await page.locator('.world-commands [data-action="scout-open"]').click();await chooseAssignment(page,'#scout-city',home);await chooseAssignment(page,'#scout-officer',officer);await chooseAssignment(page,'#scout-target',target);assert.ok(await page.locator('[data-action="scout-dispatch"]').isDisabled());assert.match(await page.locator('#scout-readiness').innerText(),/本城金不足/);await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-insufficient.png`,fullPage:true});await low.close();
  console.log(`PASS ${mobile?'mobile':'desktop'} preview, paid dispatch, reload, actual arrival removes scout, officer release and insufficient funds`);
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({errors,checks:['route time and fee visible before dispatch','source-city payment once','reload preserves payment','actual UI execution finishes scout','completed scout and task disappear','officer automatically released','timed vision retained','poor city cannot dispatch','desktop/mobile']},null,2));
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});await writeFile(out+'/failure.txt',await page.locator('body').innerText());}console.error('Browser errors:',errors);throw error;}
finally{await browser?.close();server.kill();}
