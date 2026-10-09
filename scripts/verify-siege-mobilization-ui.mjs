import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {siegeMobilizationFixture} from '../tests/helpers/siege-mobilization.mjs';
import {advanceCampaignStep,activeBattles,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {siegeDefensePlan} from '../siege-defense.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
const out='outputs/siege-mobilization-ui';await mkdir(out,{recursive:true});
try{
 for(const mode of ['auto','manual','manual-fresh','relinquish']){
  const {s,c}=siegeMobilizationFixture({allAI:false,zeroPrepared:mode==='manual'});advanceCampaignStep(s);
  const r=activeBattles(s)[0],plan=siegeDefensePlan(s,c.id),original=serializeCampaign(s),context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.addInitScript(value=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!sessionStorage.getItem('muster-fixture')){localStorage.setItem('sango-sovereign-v2',value);sessionStorage.setItem('muster-fixture','1');}},original);
  const action=id=>page.locator(`.modal [data-action="${id}"]`).first(),openCouncil=()=>page.locator('.encounter-callout [data-action="campaign-prepare"]').first(),saved=async()=>validateCampaign(await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2'))));
  try{
   await page.goto('http://127.0.0.1:4173/#strategy');await openCouncil().waitFor();
   if(await page.locator('.modal-backdrop').count())await page.locator('.modal [data-action="close"]').last().click();
   await openCouncil().click();
   assert.match(await page.locator('.modal-body').innerText(),/尚无现役守军/);
   await action('encounter-next').click();await action('encounter-next').click();assert.ok(await action('encounter-confirm').isDisabled());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/'+mode+'-pending.png',animations:'disabled'});
   if(mode==='auto'){
    await action('campaign-defense-auto').click();const next=await saved(),guard=next.armies.find(a=>a.defense),city=next.cities.find(x=>x.id===c.id);
    assert.deepEqual(guard.units.map(u=>u.id),plan.officerIds);assert.equal(c.gold-city.gold,plan.gold);assert.equal(c.manpower-city.manpower,plan.men);
    assert.equal(next.campaign.battles[0].awaiting,true);await page.reload();await openCouncil().waitFor();assert.equal(serializeCampaign(await saved()),serializeCampaign(next));
    if(await page.locator('.modal-backdrop').count())await page.locator('.modal [data-action="close"]').last().click();
    await openCouncil().click();await action('encounter-next').click();await action('encounter-next').click();assert.equal(await action('encounter-confirm').isDisabled(),false);
    await page.locator('[name="encounter-control"][value="auto"]').check();await action('encounter-confirm').click();assert.equal((await saved()).campaign.battles[0].awaiting,false);
   }else if(mode.startsWith('manual')){
    await action('campaign-defense-prepare').click();const id=mode==='manual'?c.units[0].id:plan.officerIds[0],troops=mode==='manual'?1000:2000;
    if(mode==='manual')await page.locator(`[data-action="campaign-unit-edit"][data-id="${id}"]`).click();
    else {await action('campaign-unit-new').click();await action('campaign-unit-choose').click();await page.locator(`[data-personnel-choice="${id}"]`).click();}
    await page.locator(`[data-command-troops="${id}"]`).fill(String(troops));await page.locator(`[data-command-troops="${id}"]`).press('Enter');
    await action('campaign-command-next').click();await action('campaign-command-next').click();await action('campaign-pick-confirm').click();
    const next=await saved();assert.ok(next.armies.find(a=>a.defense).units.some(u=>u.id===id&&u.troops===troops));assert.equal(next.campaign.battles[0].awaiting,true);
   }else{
    await action('campaign-defense-relinquish').click();const next=await saved();assert.equal(next.cities.find(x=>x.id===c.id).owner,'yuan');assert.equal(next.campaign.battles.length,0);assert.equal(next.campaign.archive.length,0);
   }
   assert.deepEqual(errors,[]);console.log(`Siege mobilization UI passed: ${mode}, valid saves and narrow viewport.`);
  }catch(e){await page.screenshot({path:out+'/'+mode+'-failure.png',animations:'disabled'});throw e;}finally{await context.close();}
 }
}finally{await browser.close();}
