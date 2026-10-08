import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,beginExecution,advanceCampaignDay} from './automatic-domestic-campaign.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {cityStaffStatus,pendingDomesticAlerts,acknowledgeDomesticAlerts} from '../domestic-feedback.mjs';
import {peacefulCities} from '../tests/helpers/field-campaign.mjs';
import {addCityGold} from '../city-resources.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(1,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang');addCityGold(s,c,40000-c.gold);
const officer=cityStaffStatus(s,c).idle[0].unit;
const key=Object.keys(ACTIONS).find(k=>ACTIONS[k].kind==='build'&&ACTIONS[k].direction==='commerce');
for(const [k,d]of Object.entries(ACTIONS))if(d.direction==='commerce'&&k!==key)c.domestic.cooldowns[k]=1000;
assert.equal(assignDomestic(s,c.id,'commerce',officer.id),null);beginExecution(s);
const a=s.campaign.domestic.assignments.find(a=>a.officerId===officer.id);assert.ok(a.action);
// Advance the real project to its last unfinished day; no synthetic completion.
for(let i=0;i<30&&a.action.remaining>1;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
assert.ok(a.action.remaining<=1);acknowledgeDomesticAlerts(s,pendingDomesticAlerts(s).map(e=>e.id));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4204',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{const next=sessionStorage.getItem('feedback-next');if(next){localStorage.setItem('sango-sovereign-v2',next);sessionStorage.removeItem('feedback-next');}else if(!localStorage.getItem('feedback-seeded')){localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('feedback-seeded','1');}},serializeCampaign(s));
 await page.goto('http://127.0.0.1:4204/#strategy');await page.locator('.national-world').waitFor();
 assert.equal(await page.locator('.map-staff-status').count(),s.cities.filter(c=>c.owner==='cao').length);
 assert.match(await page.locator('[data-city="xuchang"] .map-staff-status').textContent(),/1\/6/);
 mkdirSync('outputs/domestic-feedback',{recursive:true});
 await page.locator('[data-map-view="national"]').click();await page.screenshot({path:'outputs/domestic-feedback/city-status.png',fullPage:true});
 await page.locator('[data-action="campaign-run"]').click();
 await page.getByRole('heading',{name:'战略奏报',exact:true}).waitFor({timeout:15000});
 assert.match(await page.locator('.domestic-alert-list').innerText(),/许昌/);
 const date=await page.locator('.sovereign-identity').innerText();assert.match(date,/已暂停|筹划中/);assert.match(await page.locator('.modal-header').innerText(),/已暂停/);await page.waitForTimeout(3400);assert.equal(await page.locator('.sovereign-identity').innerText(),date);
 await page.screenshot({path:'outputs/domestic-feedback/report-desktop.png',fullPage:true});
 const report=page.locator('[data-report-node]').first(),nodeId=await report.getAttribute('data-report-node'),saveBefore=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),data=JSON.parse(saveBefore),node=data.campaign.activity.nodes.find(n=>n.id===nodeId);
 assert.ok(node&&!node.read);assert.equal(await report.locator('.report-message p').textContent(),node.text);
 const pendingCount=await page.locator('[data-report-node]').count();await report.getByRole('button',{name:'查看当日记录 ↗'}).click();await page.locator('.activity-selected').waitFor();
 assert.equal(await page.locator('.activity-selected').getAttribute('data-activity-node'),nodeId);assert.equal(await page.locator('.activity-selected span').textContent(),node.text);assert.ok(await page.locator(`[data-activity-day="${node.day}"]`).count());
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),saveBefore);await page.screenshot({path:'outputs/domestic-feedback/source-record.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:'outputs/domestic-feedback/source-record-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'返回奏报',exact:true}).click();await page.locator('[data-report-node]').first().waitFor();assert.equal(await page.locator('[data-report-node]').count(),pendingCount);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/domestic-feedback/report-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 const reportDay=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).campaign.day);
 await page.getByRole('button',{name:'确认'}).click();assert.equal(await page.locator('.domestic-alert-list').count(),0);
 const planning=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).campaign.phase==='planning');
 assert.match(await page.locator(`[data-action="${planning?'campaign-begin':'campaign-run'}"]`).innerText(),planning?/^进行/:/^暂停/);
 await page.waitForTimeout(3300);const afterDay=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).campaign.day);assert.ok(planning?afterDay===reportDay:afterDay>reportDay,'confirmation respects the campaign planning boundary and resumes an executing day');
 await page.reload();await page.locator('.national-world').waitFor();assert.equal(await page.locator('.domestic-alert-list').count(),0);
 const acknowledged=await page.evaluate(id=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).campaign.activity.nodes.find(n=>n.id===id),nodeId);
 assert.ok(acknowledged.read);assert.equal(acknowledged.text,node.text);
 // A real city-wide loss on day 2 covers source lookup without an officer and
 // confirmation during execution, separately from the construction boundary.
 const disaster=peacefulCities(newCampaign(81,'guandu-200')),town=disaster.cities.find(c=>c.id==='xuchang');town.domestic.opportunities.push({kind:'mold',expires:2,amount:200,saved:0});beginExecution(disaster);advanceCampaignDay(disaster);acknowledgeDomesticAlerts(disaster,pendingDomesticAlerts(disaster).map(n=>n.id));
 await page.evaluate(save=>sessionStorage.setItem('feedback-next',save),serializeCampaign(disaster));await page.reload();await page.locator('.national-world').waitFor();await page.locator('[data-action="campaign-run"]').click();await page.getByRole('heading',{name:'战略奏报',exact:true}).waitFor({timeout:15000});
 const citySaved=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),cityData=JSON.parse(citySaved),cityNode=cityData.campaign.activity.nodes.find(n=>n.category==='domestic'&&n.phase==='event'&&n.result.loss===200&&n.faction==='cao');assert.ok(cityNode);assert.equal(cityNode.officerId,null);assert.equal(cityData.campaign.phase,'executing');
 await page.locator(`[data-report-node="${cityNode.id}"] [data-action="activity-alert-record"]`).click();await page.locator('.activity-selected').waitFor();assert.equal(await page.locator('.activity-selected span').textContent(),cityNode.text);assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),citySaved);
 await page.screenshot({path:'outputs/domestic-feedback/city-source-record-mobile.png',fullPage:true,animations:'disabled'});await page.getByRole('button',{name:'返回奏报',exact:true}).click();await page.getByRole('button',{name:'确认',exact:true}).click();assert.match(await page.locator('[data-action="campaign-run"]').innerText(),/^暂停/);
 await page.waitForFunction(day=>JSON.parse(localStorage.getItem('sango-sovereign-v2')).campaign.day>day,cityData.campaign.day,{timeout:15000});await page.reload();await page.locator('.national-world').waitFor();assert.equal(await page.locator(`[data-report-node="${cityNode.id}"]`).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS real daily source nodes, exact report text, read-only source lookup and return, desktop/mobile, confirmation resumes time, reload does not replay');
}finally{await browser?.close();server.kill();}
