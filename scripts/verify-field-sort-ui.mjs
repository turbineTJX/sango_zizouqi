import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {newCampaign,serializeCampaign,launchExpedition} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const state=newCampaign(203,'guandu-200'),city=state.cities.find(c=>c.id==='xuchang'),ids=city.units.slice(0,2).map(u=>u.id);
assert.equal(launchExpedition(state,{kind:'expedition',cityId:city.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:'chenliu',policy:'auto'}),null);
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await mkdir('outputs/field-sort-ui',{recursive:true});
try{
 await page.addInitScript(value=>localStorage.setItem('sango-sovereign-v2',value),serializeCampaign(state));
 await page.goto('http://127.0.0.1:4173/#strategy');
 await page.locator('[data-action="campaign-info"]').first().click();
 for(const type of ['city','officer','unit','army','faction']){
  await page.locator(`[data-action="campaign-info-tab"][data-kind="${type}"]`).click();
  const keys=await page.locator('[data-field-sort="info"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.sortKey));
  for(const key of keys){
   const header=page.locator(`[data-field-sort="info"][data-sort-key="${key}"]`);
   for(let turn=0;turn<2;turn++){
    await header.click();
    const direction=await header.getAttribute('data-sort-current');
    const values=await page.locator('table.info-directory').evaluate((table,key)=>{
     const column=[...table.querySelectorAll('thead button')].findIndex(n=>n.dataset.sortKey===key);
     return [...table.querySelectorAll('tbody tr')].map(row=>row.cells[column]?.textContent.trim().replace(/ ↗$/,''));
    },key);
    const compare=(a,b)=>/^[\d,]+$/.test(a)&&/^[\d,]+$/.test(b)?Number(a.replaceAll(',',''))-Number(b.replaceAll(',','')):a.localeCompare(b,'zh-CN',{numeric:true});
    for(let i=1;i<values.length;i++)assert.ok(compare(values[i-1],values[i])*(direction==='asc'?1:-1)<=0,`${type}.${key} ${direction}`);
   }
  }
 }
 await page.locator('[data-action="campaign-info-tab"][data-kind="officer"]').click();
 await page.locator('[data-sort-key="leadership"]').click();
 const before=await page.locator('table.info-directory tbody').textContent();
 await page.locator('table.info-directory [data-action="campaign-info-detail"]').first().click();
 await page.locator('[data-action="campaign-info-back"]').click();
 assert.equal(await page.locator('table.info-directory tbody').textContent(),before);
 await page.screenshot({path:'outputs/field-sort-ui/officers-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'outputs/field-sort-ui/officers-mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.modal [data-action="close"]').first().click();
 await page.locator('.city-command-hub [data-task="domestic"]').click();
 await page.locator('[data-direction="agriculture"][data-action="campaign-command-direction"]').click();
 const choice=page.locator('[data-personnel-choice]:not(:disabled)').first(),id=await choice.getAttribute('data-personnel-choice');
 await choice.check();
 for(const direction of ['asc','desc']){
  await page.locator('[data-field-sort="personnel"][data-sort-key="politics"]').click();
  assert.equal(await page.locator('[data-sort-key="politics"]').getAttribute('data-sort-current'),direction);
  assert.equal(await page.locator(`[data-personnel-choice="${id}"]`).isChecked(),true);
 }
 await page.locator('.modal [data-action="campaign-person-detail"]').first().click();
 await page.locator('[data-action="campaign-person-back"]').click();
 assert.equal(await page.locator(`[data-personnel-choice="${id}"]`).isChecked(),true);
 assert.equal(await page.locator('[data-sort-key="politics"]').getAttribute('data-sort-current'),'desc');
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),serializeCampaign(state));
 assert.deepEqual(errors,[]);
 console.log('Field sorting passed: five directories, both directions, detail return, picker selection retained, mobile layout and unchanged save.');
}finally{await browser.close();}
