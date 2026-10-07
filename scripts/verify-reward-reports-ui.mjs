import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,activeBattles,chooseEncounter} from '../strategic-campaign.mjs';
import {assignDomestic,ACTIONS,TECHS,cancelDomestic} from '../domestic.mjs';
import {cityStaffStatus,pendingDomesticAlerts,acknowledgeDomesticAlerts} from '../domestic-feedback.mjs';
import {startTalentProject,resolveTalentOffers,discoverTalent} from '../talent-lifecycle.mjs';
import {talentKey,projectNeed} from '../talent-core.mjs';
import {readyTalent} from '../tests/helpers/talent.mjs';
import {peacefulCities} from '../tests/helpers/field-campaign.mjs';
import {addCityGold} from '../city-resources.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
function makeFixture(){
const s=peacefulCities(newCampaign(81,'guandu-200')),c=s.cities.find(c=>c.id==='xuchang');addCityGold(s,c,100000-c.gold);
const officer=cityStaffStatus(s,c).idle[0].unit;
const scientist=cityStaffStatus(s,c).idle[1].unit;
const outcome=kind=>s.campaign.activity.nodes.find(n=>n.result?.reward?.kind===kind&&n.cityId===c.id&&n.faction==='cao');
for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='build_commerce')c.domestic.cooldowns[key]=10000;
for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='research')c.domestic.cooldowns[key]=10000;
assignDomestic(s,c.id,'commerce',officer.id);
assignDomestic(s,c.id,'technology',scientist.id);
for(let i=0;i<65&&['building','technology'].some(kind=>!outcome(kind));i++){
 if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);
}
const building=outcome('building');assert.ok(building);
const technology=outcome('technology');assert.ok(technology);
const p=readyTalent(s);p.cityId='chenliu';discoverTalent(s,p.id,'cao');addCityGold(s,c,-180);
startTalentProject(s,{officerId:officer.id,action:{key:'hire',targetId:p.id,cost:180}},c);s.campaign.talent.projects[talentKey(p.id,'cao')].progress=projectNeed(p.id);resolveTalentOffers(s,cancelDomestic);
const talent=s.campaign.activity.nodes.find(n=>n.category==='talent'&&n.phase==='signed'&&n.officerId===p.id);assert.ok(talent);
while(s.campaign.phase!=='planning'){for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);}
acknowledgeDomesticAlerts(s,pendingDomesticAlerts(s).filter(n=>![building.id,talent.id,technology.id].includes(n.id)).map(n=>n.id));
return s;
}
// Reuse only a validated save produced by this script's real daily simulation.
const s=process.argv.includes('--reuse-fixture')?validateCampaign(JSON.parse(await readFile('outputs/reward-reports/fixture.json','utf8'))):makeFixture();
const outcome=kind=>s.campaign.activity.nodes.find(n=>n.result?.reward?.kind===kind&&n.cityId==='xuchang'&&n.faction==='cao');
const building=outcome('building'),technology=outcome('technology'),talent=outcome('officer');assert.ok(building&&technology&&talent);
const raw=serializeCampaign(s);validateCampaign(JSON.parse(raw));
const out='outputs/reward-reports';await mkdir(out,{recursive:true});await writeFile(out+'/fixture.json',raw);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4291',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser,page;const errors=[];
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('Server exited '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);},raw);
 await page.goto('http://127.0.0.1:4291/#strategy');await page.getByRole('heading',{name:'战略奏报',exact:true}).waitFor();
 const talentCard=page.locator(`[data-report-node="${talent.id}"]`),buildingCard=page.locator(`[data-report-node="${building.id}"]`);
 const technologyCard=page.locator(`[data-report-node="${technology.id}"]`);assert.ok((await technologyCard.innerText()).includes(TECHS[technology.result.reward.technologyId].description));
 assert.match(await talentCard.innerText(),/新入麾下/);assert.equal(await talentCard.locator('.reward-attributes dd').count(),5);assert.match(await talentCard.innerText(),/签约时在陈留/);
 assert.equal(await buildingCard.locator('.reward-building-art').count(),1);assert.match(await buildingCard.innerText(),new RegExp(building.result.reward.afterLevel+'级'));
 await buildingCard.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/building-desktop.png'});await talentCard.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/talent-desktop.png'});
 await technologyCard.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/technology-desktop.png'});
 const saved=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 await talentCard.getByRole('button',{name:'查看武将',exact:true}).click();await page.locator('[data-info-kind="officer"]').waitFor();await page.locator('#modal-panel-root .close-button').click();await talentCard.waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),saved);
 await page.setViewportSize({width:390,height:844});await talentCard.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/talent-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 await technologyCard.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/technology-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 await buildingCard.getByRole('button',{name:'查看设施',exact:true}).click();await page.locator('.city-building-card').waitFor();assert.equal(await page.locator('.city-building-card').getAttribute('data-city-id'),building.result.reward.siteId);assert.match(await page.locator('.city-building-card').innerText(),/市场/);await page.screenshot({path:out+'/building-location-mobile.png'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),saved);await page.locator('[data-action="reward-return-report"]').click();await talentCard.waitFor();
 await page.getByRole('button',{name:'确认',exact:true}).click();await page.locator('.harvest-strip').waitFor();
 const receipts=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2'))),receipt=receipts.campaign.activity.nodes.findLast(n=>n.phase==='harvest'&&n.faction==='cao');
 const strip=page.locator('.harvest-strip');assert.equal(await strip.getAttribute('data-harvest-turn'),String(receipt.result.turn));await strip.locator(':scope > summary').click();await page.screenshot({path:out+'/harvest-mobile.png'});assert.match(await strip.innerText(),/各城金净变化/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 const confirmed=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));await strip.getByRole('button',{name:'查看成果',exact:true}).click();await page.getByRole('heading',{name:'本旬成果',exact:true}).waitFor();
 await page.locator('[data-action="activity-alert-record"]').first().click();await page.locator('.activity-selected').waitFor();await page.getByRole('button',{name:'返回成果',exact:true}).click();await page.getByRole('heading',{name:'本旬成果',exact:true}).waitFor();await page.locator('#modal-panel-root .close-button').click();assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),confirmed);
 await page.setViewportSize({width:1440,height:1000});await strip.locator(':scope > summary').click();await page.screenshot({path:out+'/harvest-desktop.png'});
 await page.reload();await page.locator('.harvest-strip').waitFor();assert.equal(await page.locator('.domestic-alert-list').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),confirmed);assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,buildingNode:building.id,talentNode:talent.id,technologyNode:technology.id,siteId:building.result.reward.siteId,turn:receipt.result.turn,errors},null,2));
 console.log('PASS outcome cards, exact facility location, source/detail return, desktop/mobile, harvest receipt, no read mutations or repeat rewards');
}catch(error){if(page){await page.screenshot({path:out+'/failure.png'});console.error(JSON.stringify({errors,text:(await page.locator('body').innerText()).slice(0,1200)}));}throw error;}finally{await browser?.close();server.kill();}
