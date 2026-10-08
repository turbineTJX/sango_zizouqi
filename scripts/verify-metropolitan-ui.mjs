import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,beginExecution,advanceCampaignDay,validateCampaign} from './automatic-domestic-campaign.mjs';
import {assignDomestic,assignmentFor,cancelDomestic,ACTIONS} from '../domestic.mjs';
import {cityStaffStatus,acknowledgeDomesticAlerts,pendingDomesticAlerts} from '../domestic-feedback.mjs';
import {mapNode} from '../road-network.mjs';
import {metropolitanMembers} from '../metropolitan-areas.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/metropolitan-ui',port='4214';mkdirSync(out,{recursive:true});
let s,c,a;
for(let seed=1;seed<30;seed++){
 s=newCampaign(seed,'guandu-200','yuan');s.cities.forEach(c=>c.gold=50000);s.gold=s.cities.filter(c=>c.owner===s.campaign.playerFaction).reduce((n,c)=>n+c.gold,0);c=mapNode(s,'jinyang');
 for(const town of s.cities)if(town.owner!=='yuan')for(const unit of town.units)unit.troops=0;
 for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='build_workshop')c.domestic.cooldowns[key]=1000;
 const u=cityStaffStatus(s,c).idle[0].unit;assert.equal(assignDomestic(s,c.id,'technology',u.id),null);beginExecution(s);a=assignmentFor(s,u.id);
 if(a.action.siteId!==c.id)break;
}
assert.notEqual(a.action.siteId,c.id);const siteId=a.action.siteId,kind=mapNode(s,siteId).kind;
advanceCampaignDay(s);advanceCampaignDay(s);acknowledgeDomesticAlerts(s,pendingDomesticAlerts(s).map(e=>e.id));const construction=serializeCampaign(s);
const interrupted=structuredClone(s);cancelDomestic(interrupted,a.officerId);const paused=serializeCampaign(interrupted);
for(let i=0;i<60&&c.workshop===0;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
assert.equal(c.workshop,1);acknowledgeDomesticAlerts(s,pendingDomesticAlerts(s).map(e=>e.id));const completed=serializeCampaign(s);validateCampaign(JSON.parse(completed));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const save=sessionStorage.getItem('metro-fixture');if(save)localStorage.setItem('sango-sovereign-v2',save);});await page.goto(`http://127.0.0.1:${port}/#strategy`);
 const load=async save=>{await page.evaluate(save=>sessionStorage.setItem('metro-fixture',save),save);await page.reload();await page.locator('.national-world').waitFor();};
 const focus=async id=>{await page.locator('[data-map-view="national"]').click();await page.locator('#national-city-search').selectOption(id);const close=page.locator('.modal [data-action="close"]');if(await close.count())await close.click();await page.locator('[data-map-view="city"]').click();};
 const pin=id=>page.locator(`.national-world [data-city="${id}"],.national-world [data-junction="${id}"]`);
 await load(construction);await focus(siteId);const scene=pin(siteId).locator('.map-city-scene');
 assert.equal(await scene.locator('.city-scaffold').count(),1);assert.equal(await scene.locator('.city-scaffold.is-paused').count(),0);
 const building=scene.locator('[data-city-building="workshop"]');await building.locator('.city-district-hit').click();assert.match(await page.locator('.city-building-card').innerText(),new RegExp('施工中[\\s\\S]*晋阳'));
 await page.screenshot({path:out+'/construction.png'});await page.locator('[data-city-card-close]').click();
 assert.notEqual(await scene.locator('.city-scaffold image').evaluate(el=>getComputedStyle(el).animationName),'none');
 const before=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));await building.focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),before);
 await load(paused);await focus(siteId);assert.equal(await pin(siteId).locator('.city-scaffold.is-paused').count(),1);assert.equal(await pin(siteId).locator('.city-scaffold image').evaluate(el=>getComputedStyle(el).animationName),'none');await page.screenshot({path:out+'/paused.png'});
 await load(completed);await focus(siteId);assert.equal(await pin(siteId).locator('[data-city-building="workshop"]').getAttribute('data-level'),'1');assert.equal(await pin(siteId).locator('.city-scaffold').count(),0);await page.screenshot({path:out+'/completed.png'});
 await focus(c.id);assert.equal(await pin(c.id).locator('[data-city-building="workshop"]').getAttribute('data-level'),'0');
 await page.locator('[data-map-view="national"]').click();await page.locator('#national-city-search').selectOption(c.id);await page.locator('.modal [data-action="city-domestic"]').click();const metro=page.locator('.modal .metropolitan-summary');await metro.waitFor();assert.equal(await metro.locator('button').count(),metropolitanMembers(s,c).length);
 await metro.locator(`[data-town="${siteId}"]`).click();assert.equal(await page.locator('.modal').count(),0);assert.equal(await pin(siteId).getAttribute('class').then(x=>x.includes('is-town-focused')),true);
 // Inspect every member kind through the same map and detail-card interaction.
 for(const n of metropolitanMembers(s,c)){await focus(n.id);assert.equal(await pin(n.id).locator('[data-city-scene] [data-city-building]').count(),9);await pin(n.id).locator('[data-city-building="farm"] .city-district-hit').click();assert.match(await page.locator('.city-building-card').innerText(),new RegExp(n.name));await page.keyboard.press('Escape');}
 await page.setViewportSize({width:390,height:844});await load(completed);await focus(siteId);await pin(siteId).locator('[data-city-building="workshop"] .city-district-hit').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:out+'/mobile.png'});
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({passed:true,siteId,kind,checks:['real remote construction and completion','site-specific animation','paused animation','no duplicated main-city facility','all four member kinds','saved progress','keyboard and read-only details','metropolis navigation','mobile layout']},null,2));console.log('PASS metropolitan construction, animation, completion, site navigation, all four kinds and mobile');
}catch(error){if(browser){const page=browser.contexts()[0]?.pages()[0];await page?.screenshot({path:out+'/failure.png'});}throw error;}finally{await browser?.close();server.kill();}
