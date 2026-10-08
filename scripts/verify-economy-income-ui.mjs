import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from './automatic-domestic-campaign.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {cityIncomeBreakdown} from '../economy.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(31),c=s.cities.find(c=>c.id==='xuchang'),people=cityPersonnel(s,c.id);
c.governor=people.toSorted((a,b)=>b.unit.politics-a.unit.politics)[0].unit.id;c.manpower=0;
// A real five-day urgent recruitment keeps already-paid work visible within
// its actual turn, without serializing an incomplete daily settlement.
for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='military'&&key!=='urgent')c.domestic.cooldowns[key]=10000;
assert.equal(assignDomestic(s,c.id,'military',people[0].unit.id),null);assert.equal(beginExecution(s),null);
for(let day=1;day<=5;day++)advanceCampaignDay(s);
c.domestic.effects.push({key:'grain',amount:.3,untilTurn:3});
const raw=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(raw))),raw);
const income=cityIncomeBreakdown(s,c);assert.ok(income.work.manpower>0);assert.ok(income.governor.gold>0);assert.ok(income.management.grain>0);
const fmt=n=>Math.round(n).toLocaleString('zh-CN'),format=row=>[['gold','金'],['grain','粮'],['manpower','预备兵']].map(([k,label])=>fmt(row[k])+' '+label).join(' · ');
const extra=Object.fromEntries(['gold','grain','manpower'].map(k=>[k,income.governor[k]+income.management[k]]));
const out='outputs/economy-income-parts/ui';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4288',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('UI server exited: '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);},raw);
 const showCity=async()=>{await page.locator('.strategy-world').waitFor();if(!await page.locator('.strategy-panel').isVisible())await page.locator('[data-action="map-panel-toggle"]').first().click();await page.locator('.strategy-panel').waitFor();};
 await page.goto('http://127.0.0.1:4288/#strategy');await showCity();
 const checks=async()=>{
  const text=await page.locator('.strategy-panel').innerText();
  for(const row of ['城市建设基础／旬：'+format(income.base),'太守与阶段运营加成／旬：'+format(extra),'本旬直接运营已入库：'+format(income.work)])assert.ok(text.includes(row),row);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 };
 const showIncome=async()=>{await page.locator('.strategy-panel p').filter({hasText:'本旬直接运营已入库'}).scrollIntoViewIfNeeded();};
 const before=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));await checks();await showIncome();await page.screenshot({path:out+'/desktop.png'});
 await page.setViewportSize({width:390,height:844});await checks();await showIncome();await page.screenshot({path:out+'/mobile.png'});
 await page.reload();await showCity();await checks();assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),before);assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,day:s.campaign.day,income,errors,checks:['actual completed operation','base and staffed income separated','direct operation already paid','desktop and narrow layout','no inspection mutation','reload values preserved']},null,2));
 console.log('PASS separated city income, actual paid operation, desktop, mobile and reload');
}catch(e){if(page){await page.screenshot({path:out+'/failure.png'});console.log((await page.locator('body').innerText()).slice(0,1600));}throw e;}finally{await browser?.close();server.kill();}
