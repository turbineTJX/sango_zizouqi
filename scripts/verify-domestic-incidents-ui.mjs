import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign} from '../strategic-campaign.mjs';
import {assignDomestic,setDomesticAutoApprove,ACTIONS} from '../domestic.mjs';
import {setRelationshipType} from '../relationships.mjs';
import {peacefulCities} from '../tests/helpers/field-campaign.mjs';
import {fundCities} from '../tests/resource-fixtures.mjs';
import {setBuildingLevel} from '../tests/building-fixtures.mjs';
import {PAGE_GUIDE_STORAGE_KEY} from '../page-guides.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const port=4193,base='http://127.0.0.1:'+port,out='outputs/domestic-incidents-ui';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let serverError='';server.stderr.on('data',b=>serverError+=b);
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const action=k=>page.locator('[data-action="'+k+'"]'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));
function fixture(joint,seed=joint?2710938419:3171201372){
 const s=peacefulCities(newCampaign(7));fundCities(s,40000);setDomesticAutoApprove(s,true);const c=s.cities.find(c=>c.id==='xuchang'),people=s.campaign.idle.filter(o=>o.location===c.id);setBuildingLevel(c,'drill',1);
 for(const [id,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&id!=='fair')c.domestic.cooldowns[id]=10000;
 for(const p of people.slice(0,joint?2:1))assignDomestic(s,c.id,'commerce',p.unit.id);
 if(joint)setRelationshipType(s,people[0].unit.id,people[1].unit.id,'sworn',100);
 beginExecution(s);s.campaign.domestic.incidents.seed=seed;advanceCampaignDay(s);return s;
}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.equal(serverError,'');
 const s=fixture(false),expected=s.campaign.domestic.incidents.events;assert.equal(expected[0].code,'marketAbuse');
 await context.addInitScript(key=>localStorage.setItem(key,JSON.stringify({version:1,enabled:false,seen:[]})),PAGE_GUIDE_STORAGE_KEY);
 await context.addInitScript(raw=>{if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);},serializeCampaign(s));await page.goto(base+'/#strategy');await page.locator('.sovereign-hud').waitFor();
 const card=page.locator('[data-report-node]').filter({hasText:'强夺市货'});await card.waitFor();assert.match(await card.innerText(),/荀彧.+夏侯惇强夺/);assert.doesNotMatch(await card.innerText(),/%|概率|undefined/);assert.match(await card.innerText(),/预备兵减少800.+友好度下降12/);
 await page.screenshot({animations:'disabled',path:out+'/cross-domain-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({animations:'disabled',path:out+'/cross-domain-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await card.locator('[data-action="activity-alert-record"]').click();await page.locator('.officer-activity-ledger').waitFor();assert.equal((await saved()).campaign.day,2);await action('close').last().click();await card.waitFor();
 await page.reload();await card.waitFor();assert.deepEqual((await saved()).campaign.domestic.incidents.events,expected);
 await card.locator('[data-action="domestic-alert-city"]').click();assert.ok((await saved()).campaign.activity.nodes.filter(n=>n.phase==='incident').every(n=>n.read));
 await page.locator('[data-city-incident]').waitFor();await page.screenshot({animations:'disabled',path:out+'/city-story-mobile.png',fullPage:true});await action('close').last().click();
 const positive=fixture(false,260931841);await context.addInitScript(raw=>{if(!localStorage.getItem('incident-positive-fixture')){localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('incident-positive-fixture','1');}},serializeCampaign(positive));await page.reload();const good=page.locator('[data-report-node]').filter({hasText:'市肆解纷'});await good.waitFor();assert.match(await good.innerText(),/本城金增加2000.+友好度提高12/);assert.equal(await good.getAttribute('data-report-tone'),'notice');await page.screenshot({animations:'disabled',path:out+'/positive-mobile.png',fullPage:true});
 const joint=fixture(true);await context.addInitScript(raw=>{if(!localStorage.getItem('incident-joint-fixture')){localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('incident-joint-fixture','1');}},serializeCampaign(joint));await page.reload();const pair=page.locator('[data-report-node]').filter({hasText:'同心协力'});await pair.waitFor();assert.equal(joint.campaign.domestic.incidents.events[0].officerIds.length,2);assert.match(await pair.innerText(),/默契有加/);await page.screenshot({animations:'disabled',path:out+'/joint-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,crossDomain:expected[0],positive:positive.campaign.domestic.incidents.events[0],joint:joint.campaign.domestic.incidents.events[0],desktop:[1440,1000],mobile:[390,844],errors},null,2));console.log('Domestic incident UI passed: cross-domain report, daily record, reload, acknowledgement, city story, friendship gain and joint report.');
}catch(e){await page.screenshot({animations:'disabled',path:out+'/failure.png',fullPage:true});console.error(errors);throw e;}finally{await browser.close();server.kill();}
