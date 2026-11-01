import {treasureRecord,treasureOfficerRows} from '../treasures.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign,validateCampaign} from '../tests/helpers/auto-domestic-campaign.mjs';
import {assignDomestic,beginDomesticTurn} from '../domestic.mjs';
import {scoutCandidates,scoutTargets} from '../scouting.mjs';
import {chooseAssignment} from './assignment-picker-ui-helpers.mjs';
const port=4397,base=`http://127.0.0.1:${port}`,out='outputs/assignment-picker-ui';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'off'},windowsHide:true,stdio:'ignore'});
let browser,page;const errors=[];
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const mobile of (process.argv.includes('--mobile-only')?[true]:[false,true])){
  const s=newCampaign(203,'guandu-200'),city=s.cities.find(c=>c.id==='xuchang'),o=scoutCandidates(s,city.id)[0],target=scoutTargets(s,city.id)[0];
  assert.equal(assignDomestic(s,city.id,'commerce',o.unit.id),null);beginDomesticTurn(s);
  for(const r of treasureOfficerRows(s))if(r.unit.treasureId==='brightArmor')delete r.unit.treasureId;Object.assign(treasureRecord(s,'brightArmor'),{state:'treasury',cityId:null,factionId:city.owner,holderId:null});
  validateCampaign(JSON.parse(serializeCampaign(s)));const raw=serializeCampaign(s),context=await browser.newContext({serviceWorkers:'block',viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(raw=>{if(!sessionStorage.getItem('assignment-seeded')){localStorage.setItem('sango-sovereign-v2',raw);sessionStorage.setItem('assignment-seeded','1');}},raw);
  await page.goto(base+'/#strategy');await page.locator('.national-world').waitFor();
  const action=id=>page.locator(`[data-action="${id}"]`).filter({visible:true}).last();
  const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
  const before=await saved();assert.ok(JSON.parse(before).campaign.domestic.assignments.some(a=>a.officerId===o.unit.id),'browser must load the working-officer fixture');await action('scout-open').click();await chooseAssignment(page,'#scout-city',city.id);
  await page.locator('#scout-officer').click();const choice=page.locator(`[data-assignment-choice="${o.unit.id}"]`);assert.ok(await choice.isEnabled());
  assert.match(await choice.locator('xpath=ancestor::tr').innerText(),/商业负责人/);
  await page.locator('[data-assignment-query]').fill(o.unit.name);await page.locator('[data-field-sort="assignment"][data-sort-key="stat"]').click();await choice.check();
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-officers.png`,fullPage:true});
  await page.locator(`[data-action="campaign-person-detail"][data-officer="${o.unit.id}"]`).click();await action('close').click();assert.ok(await choice.isChecked());
  await action('assignment-picker-confirm').click();await chooseAssignment(page,'#scout-target',target.id);
  await page.locator('#scout-city').click();await action('assignment-picker-cancel').click();assert.match(await page.locator('#scout-target').innerText(),new RegExp(target.name));
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-route.png`,fullPage:true});assert.equal(await saved(),before);
  await action('scout-dispatch').click();assert.match(await page.locator('.decision-risk,.modal-body').last().innerText(),/商业|事务/);assert.equal(await saved(),before);
  assert.equal(await page.locator('[data-action="campaign-order-choice"][data-choice="after"]').count(),0);
  await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-handoff.png`,fullPage:true});
  await page.locator('[data-action="campaign-order-choice"][data-choice="now"]').click();
  const after=JSON.parse(await saved());assert.ok(after.campaign.scouting.tasks.some(t=>t.officerId===o.unit.id));assert.ok(!after.campaign.domestic.assignments.some(a=>a.officerId===o.unit.id));
  await action('close').click();for(let i=0;i<3&&await page.getByRole('heading',{name:'战略奏报',exact:true}).isVisible();i++)await page.locator('.modal-header [data-action="close"]').last().click();await action('faction-diplomacy').click();await page.locator('.diplomatic-staff>summary').click();
  await chooseAssignment(page,'#diplomacy-city-commerce-button',city.id);await page.locator('#diplomacy-officer-commerce-button').click();assert.ok(await page.locator('.personnel-table').isVisible());await action('assignment-picker-cancel').click();
  await action('close').click();await action('treasure-open').click();await page.locator('[data-action="treasure-select"][data-id="brightArmor"]').click();const treasureBefore=await saved();await chooseAssignment(page,'#treasure-recipient',o.unit.id);assert.equal(await saved(),treasureBefore);assert.equal(await page.locator('#treasure-recipient').getAttribute('data-selected'),o.unit.id);await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-treasure.png`,fullPage:true});await action('treasure-cancel').click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile scouting, diplomacy and treasure tables, working officer, search/sort/detail/cancel, route and immediate handoff');
}catch(e){if(page)await page.screenshot({path:`out/failure.png`.replace('out/',out+'/'),fullPage:true}).catch(()=>{});throw e;}
finally{await browser?.close();server.kill();}
