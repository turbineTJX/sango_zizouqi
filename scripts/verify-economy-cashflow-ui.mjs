import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,serializeCampaign,beginExecution} from '../strategic-campaign.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {PAGE_GUIDE_STORAGE_KEY} from '../page-guides.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/economy-balanced-20261011/cashflow-ui',port=4299,base=`http://127.0.0.1:${port}`;await mkdir(out,{recursive:true});
const s=newCampaign(1,'all-heroes-251','force-2'),c=s.cities.find(c=>c.id==='town-31');c.gold=0;c.grain=20000;
s.campaign.domestic.assignments=[];s.campaign.domestic.incidents.enabled=false;
for(const [id,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&id!=='sell')c.domestic.cooldowns[id]=10000;
assert.equal(assignDomestic(s,c.id,'commerce','person-367'),null);assert.equal(beginExecution(s),null);
const proposal=s.campaign.domestic.assignments.find(a=>a.officerId==='person-367').proposal;assert.ok(proposal);assert.equal(proposal.expenses.gold,0);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser,page;const errors=[];
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(({raw,key})=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem(key,JSON.stringify({version:1,enabled:false,seen:[]}));},{raw:serializeCampaign(s),key:PAGE_GUIDE_STORAGE_KEY});
 await page.goto(base+'/#strategy');await page.locator('.sovereign-hud').waitFor();
 if(!await page.locator('.domestic-proposal').count())await page.locator('[data-action="domestic-proposals"]').first().click();
 const card=page.locator('.domestic-proposal').filter({hasText:'出售余粮'});await card.waitFor();assert.match(await card.innerText(),/成交后.*30金手续费/);
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));
 let saved=await read();assert.equal(saved.cities.find(t=>t.id===c.id).gold,0);assert.equal(saved.cities.find(t=>t.id===c.id).grain,20000);
 await page.screenshot({path:out+'/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/mobile.png',fullPage:true});
 await page.reload();await page.locator('.domestic-proposal').filter({hasText:'出售余粮'}).waitFor();saved=await read();assert.deepEqual(saved.campaign.domestic.assignments.find(a=>a.officerId==='person-367').proposal,proposal);
 await page.locator('.domestic-proposal').filter({hasText:'出售余粮'}).locator('[data-action="domestic-proposal-approve"]').click();
 saved=await read();assert.equal(saved.cities.find(t=>t.id===c.id).gold,0);assert.equal(saved.cities.find(t=>t.id===c.id).grain,20000);
 const work=saved.campaign.domestic.assignments.find(a=>a.officerId==='person-367');assert.equal(work.proposal,null);assert.equal(work.action.key,'sell');assert.equal(work.action.cost,0);assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,proposal,checks:['cash-zero local sale','fee in sale proceeds','approval does not prepay money or grain','reload preserves exact proposal','desktop and mobile'],errors},null,2));console.log('PASS cash-zero sale proposal, deferred commission, no early settlement, reload and mobile');
}catch(error){if(page)await page.screenshot({path:out+'/failure.png',fullPage:true});throw error;}finally{await browser?.close();server.kill();}
