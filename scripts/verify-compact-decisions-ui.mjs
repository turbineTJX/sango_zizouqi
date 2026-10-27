import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {fieldFromCity} from '../tests/helpers/field-campaign.mjs';
import {chooseCommandTarget} from './map-target-ui-helpers.mjs';

const out='outputs/compact-decisions-ui',port='4344',errors=[],checks=[];
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const seed=async s=>{
  await page?.close();page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(save=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!sessionStorage.getItem('compact-seeded')){localStorage.setItem('sango-sovereign-v2',save);sessionStorage.setItem('compact-seeded','1');}},serializeCampaign(s));
  await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
  if(await page.getByRole('heading',{name:'战略奏报',exact:true}).isVisible())await page.locator('.modal-header [data-action="close"]').click();
 };
 const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const action=id=>page.locator(`[data-action="${id}"]`);
 const cityCommand=async(city,group,task)=>{
  if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search summary').click();
  await page.locator('#national-city-search').selectOption(city);await page.locator(`[data-action="map-city-commands"][data-group="${group}"]`).click();await page.locator(`.city-command-grid [data-task="${task}"]`).click();
 };
 const mobile=async name=>{await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:`${out}/${name}-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});};
 const s=newCampaign(203,'guandu-200');await seed(s);const original=await saved();
 await cityCommand('luoyang','personnel','transfer');await page.locator('[data-personnel-choice="person-195"]').check();await action('campaign-command-next').click();await chooseCommandTarget(page,'chenliu');
 for(const [key,value]of Object.entries({gold:23,grain:47,manpower:10})){const field=page.locator(`[data-transfer-cargo="${key}"]`);await field.fill(String(value));await field.blur();}
 assert.equal(await page.locator('.command-target-layout > aside .transport-cargo').count(),1);assert.doesNotMatch(await page.locator('.command-target-layout > aside').innerText(),/道路消耗|每日.*行动力|在大地图显示/);
 await page.screenshot({path:out+'/transport-desktop.png',fullPage:true});await mobile('transport');await action('campaign-command-next').click();
 assert.match(await page.locator('.transport-cargo').innerText(),/23[\s\S]*47[\s\S]*10/);await page.locator('.command-decree .decision-details summary').click();assert.equal(await saved(),original);await action('campaign-command-back').click();assert.equal(await page.locator('[data-transfer-cargo="grain"]').inputValue(),'47');await action('campaign-command-next').click();await action('campaign-pick-confirm').click();
 const moved=validateCampaign(JSON.parse(await saved())),worker=moved.campaign.idle.find(o=>o.unit.id==='person-195');assert.equal(worker.destination,'chenliu');assert.equal(worker.cargo.grain,47);assert.equal(worker.cargo.gold,23);assert.equal(worker.cargo.manpower,10);checks.push('transport compact map, mobile, readonly details, preserved cargo and actual dispatch');

 await seed(newCampaign(203,'guandu-200'));const beforeExpedition=await saved();await cityCommand('xuchang','military','expedition');await action('campaign-command-next').click();await page.locator('[data-command-army-unit]').first().check();await action('campaign-command-next').click();await action('campaign-command-next').click();await chooseCommandTarget(page,'chenliu');await action('campaign-command-next').click();
 assert.equal(await page.locator('.army-details-preview').isVisible(),false);assert.match(await page.locator('.command-decree').innerText(),/编制金[\s\S]*携粮[\s\S]*军团长/);
 await page.screenshot({path:out+'/expedition-desktop.png',fullPage:true});await mobile('expedition');await page.locator('.command-decree .decision-details summary').first().click();assert.ok(await page.locator('.army-details-preview').isVisible());assert.equal(await saved(),beforeExpedition);await action('campaign-command-cancel').click();assert.equal(await saved(),beforeExpedition);checks.push('expedition concise cost and appointments, collapsed attributes, mobile and cancellation');

 const military=newCampaign(33,'guandu-200'),army=fieldFromCity(military,'xuchang');army.units.forEach(u=>u.troops=100);await seed(military);
 await page.locator(`[data-campaign-army="${army.id}"]`).press('Enter');await action('map-object-manage').click();await action('army').click();await page.locator('[data-kind="adjust"]').click();const beforeAdjust=await saved();
 await action('military-next').click();assert.ok(await page.locator('[data-military-role="leader"]').count());await page.locator(`[data-military-role="leader"][value="${army.units[1].id}"]`).check();await action('military-next').click();
 assert.equal(await page.locator('.decision-changes').count(),1);assert.equal(await page.locator('.army-details-preview').isVisible(),false);await page.screenshot({path:out+'/military-desktop.png',fullPage:true});await mobile('military');await page.locator('.decision-details summary').click();assert.equal(await saved(),beforeAdjust);await action('military-cancel').click();assert.equal(await saved(),beforeAdjust);
 await action('recruit').click();await page.locator(`[data-military-unit="${army.units[1].id}"]`).check();await action('military-next').click();await action('military-confirm').click();
 if(await page.getByRole('heading',{name:'战略奏报',exact:true}).isVisible())await page.locator('.modal-header [data-action="close"]').click();
 const recruited=validateCampaign(JSON.parse(await saved()));assert.equal(recruited.armies.find(a=>a.id===army.id).units[0].troops,100);assert.ok(recruited.armies.find(a=>a.id===army.id).units[1].troops>100);
 await action('army').click();await page.locator('[data-kind="split"]').click();await page.locator(`[data-military-unit="${army.units[0].id}"]`).check();for(let i=0;i<3;i++)await action('military-next').click();assert.equal(await page.locator('.decision-changes .army-snapshot').count(),3);await action('military-confirm').click();
 if(await page.getByRole('heading',{name:'战略奏报',exact:true}).isVisible())await page.locator('.modal-header [data-action="close"]').click();assert.equal(validateCampaign(JSON.parse(await saved())).armies.length,2);
 await action('army').click();await page.locator('[data-kind="merge"]').click();await page.locator('[data-military-target]').first().check();await action('military-next').click();assert.equal(await page.locator('.decision-changes .army-snapshot').count(),3);await action('military-confirm').click();assert.equal(validateCampaign(JSON.parse(await saved())).armies.length,1);checks.push('military shorter flow, real before/after, readonly cancel, selected recruitment, split/merge and mobile');
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,checks,errors},null,2));console.log(checks.map(s=>'PASS '+s).join('\n'));
}catch(error){await page?.screenshot({path:out+'/failure.png',fullPage:true});throw error;}finally{await browser?.close();server.kill();}
