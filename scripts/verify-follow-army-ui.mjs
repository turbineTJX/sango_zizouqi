import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {deployUnit,lockDeployment} from '../engine.mjs';
import {fieldFromCity,approachFieldContact} from '../tests/helpers/field-campaign.mjs';
import {pendingArmyAppointments,confirmPostbattleAppointments} from '../postbattle-appointments.mjs';
import {recommendArmyAppointments} from '../army-appointments.mjs';
import {pendingActivityReports,acknowledgeActivityReports} from '../activity-nodes.mjs';

const s=newCampaign(1),a=fieldFromCity(s,'xuchang',{target:'guandu'});
const enemy=fieldFromCity(s,'guandu',{target:'xuchang'});for(const u of [...a.units,...enemy.units])u.retreatAt=null;a.units.find(u=>u.id==='cao').troops=1000;approachFieldContact(s,a,enemy);beginExecution(s);
for(let i=0;i<30&&!activeBattles(s).length;i++)advanceCampaignDay(s);
const r=activeBattles(s)[0];chooseEncounter(s,r.id,true);
for(const [i,u]of r.battle.sides[0].units.filter(u=>u.status==='active'&&u.id!=='cao').entries())assert.equal(deployUnit(r.battle,u.id,0,i),null);
assert.equal(deployUnit(r.battle,'cao',4,3),null);lockDeployment(r.battle);
for(let i=0;i<2000&&!r.settled;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const pending of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,pending.id,false);advanceCampaignStep(s);}
assert.equal(r.battle.result.winner,0);for(const p of [...pendingArmyAppointments(s)])confirmPostbattleAppointments(s,p.armyId,recommendArmyAppointments(s.armies.find(a=>a.id===p.armyId)));assert.ok(!a.units.some(u=>u.id==='cao'));assert.ok(s.campaign.idle.some(o=>o.unit.id==='cao'&&o.returningHome&&o.destination==='xuchang'));validateCampaign(JSON.parse(serializeCampaign(s)));
acknowledgeActivityReports(s,pendingActivityReports(s).map(n=>n.id));
const out='outputs/follow-army-ui';await mkdir(out,{recursive:true});await writeFile(out+'/save.json',serializeCampaign(s));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4196',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-audio-v1',JSON.stringify({muted:true}));if(!sessionStorage.getItem('follow-fixture')){localStorage.setItem('sango-sovereign-v2',save);sessionStorage.setItem('follow-fixture','1');}},serializeCampaign(s));
 await page.goto('http://127.0.0.1:4196/#strategy');
 const openOfficer=async()=>{await page.locator('[data-action="faction-directory"][data-kind="officer"]').click();await page.locator('[data-action="faction-object"][data-kind="officer"]').filter({hasText:'曹操'}).first().click();};
 await openOfficer();assert.match(await page.locator('[data-info-section="status"]').innerText(),/返城|返回|移动|运输/g);
 assert.doesNotMatch(await page.locator('[data-info-section="overview"]').innerText(),/运输队随行/);
 await page.screenshot({path:out+'/officer-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/officer-mobile.png',animations:'disabled'});
 await page.reload();await openOfficer();assert.match(await page.locator('[data-info-section="status"]').innerText(),/返城|返回|移动|运输/g);assert.deepEqual(errors,[]);
 console.log('PASS: escaped officer returns independently to home city; desktop/mobile, reload and saved journey');
}finally{await browser?.close();server.kill();}
