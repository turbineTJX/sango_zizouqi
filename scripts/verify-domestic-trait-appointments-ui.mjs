import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {ACTIONS} from '../domestic.mjs';
import {domesticDirectionTraitCatalog} from '../officer-traits.mjs';
const port=4485,out='outputs/domestic-trait-appointments-ui',errors=[];
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'on'},windowsHide:true,stdio:'pipe'});
let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 await context.addInitScript(raw=>{
  localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
  if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);
 },serializeCampaign(newCampaign(203,'guandu-200')));
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const action=id=>page.locator(`[data-action="${id}"]`).filter({visible:true}).last();
 const saved=()=>page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')));
 async function open(city,direction){
  if(page.url().startsWith(`http://127.0.0.1:${port}/`))await page.reload();else await page.goto(`http://127.0.0.1:${port}/#strategy`);
  await page.locator('.national-world').waitFor();
  if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search summary').click();
  await page.locator('#national-city-search').selectOption(city);await action('city-domestic').click();
  await page.locator(`[data-action="domestic-direction-open"][data-direction="${direction}"]`).click();
  await action('campaign-pick').click();await page.locator('.task-personnel').waitFor();
 }
 for(const [city,direction,id,trait]of [['xuchang','agriculture','dun','farmYield'],['town-11','commerce','person-255','taxOrder']]){
  await open(city,direction);const before=await saved(),cell=page.locator(`.task-personnel [data-personnel-choice="${id}"]`);await cell.check();
  assert.deepEqual(await page.locator('.task-personnel th [data-kind="trait"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id)),domesticDirectionTraitCatalog(Object.values(ACTIONS).filter(d=>d.direction===direction)).map(t=>t.id));
  await page.locator(`.task-personnel th [data-id="${trait}"]`).click();
  await page.getByRole('heading',{name:'特性说明',exact:true}).waitFor();await action('close').click();
  assert.ok(await cell.isChecked());assert.deepEqual(await saved(),before);
  for(const [width,height]of [[1440,900],[844,390],[390,844]]){
   await page.setViewportSize({width,height});assert.ok(await page.locator(`.task-personnel th [data-id="${trait}"]`).count());
   await page.locator(`.task-personnel th [data-id="${trait}"]`).scrollIntoViewIfNeeded();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await action('campaign-pick-confirm').isVisible());
   await page.screenshot({path:`${out}/${direction}-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:900});await action('campaign-pick-confirm').click();
  assert.ok((await saved()).campaign.domestic.assignments.some(a=>a.officerId===id&&a.direction===direction));
 }
 await open('xuchang','commerce');
 assert.deepEqual(await page.locator('.task-personnel th [data-kind="trait"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id)),domesticDirectionTraitCatalog(Object.values(ACTIONS).filter(d=>d.direction==='commerce')).map(t=>t.id));
 assert.ok(await page.locator('.task-trait-cell').count());assert.ok((await page.locator('.task-trait-cell').allTextContents()).every(t=>t===''));
 assert.doesNotMatch(await page.locator('.task-personnel').innerText(),/无适用特性/);await page.screenshot({path:`${out}/fixed-trait-columns.png`});
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({passed:true,desktop:true,landscape:true,mobile:true,traitDetailsPreserveSelection:true,realAppointments:true,fixedDirectionColumns:true,emptyCells:true,errors},null,2));
 console.log('Domestic trait appointments: all direction columns, marked holders, empty nonholders, details, real appointments and three viewports passed.');
}catch(e){await page?.screenshot({path:`${out}/failure.png`});throw e;}finally{await browser?.close();server.kill();}
