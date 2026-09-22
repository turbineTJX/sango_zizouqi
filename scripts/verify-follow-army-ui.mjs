import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {deployUnit,lockDeployment} from '../engine.mjs';
import {fieldFromCity} from '../tests/helpers/field-campaign.mjs';

const s=newCampaign(1),a=fieldFromCity(s,'xuchang',{target:'guandu'});
fieldFromCity(s,'guandu',{target:'xuchang'});a.units.find(u=>u.id==='cao').troops=1000;beginExecution(s);
for(let i=0;i<30&&!activeBattles(s).length;i++)advanceCampaignDay(s);
const r=activeBattles(s)[0];chooseEncounter(s,r.id,true);
for(const [i,u]of r.battle.sides[0].units.filter(u=>u.status==='active'&&u.id!=='cao').entries())assert.equal(deployUnit(r.battle,u.id,0,i),null);
assert.equal(deployUnit(r.battle,'cao',4,3),null);lockDeployment(r.battle);
for(let i=0;i<2000&&!r.settled;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const pending of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,pending.id,false);advanceCampaignStep(s);}
assert.equal(r.battle.result.winner,0);assert.equal(a.leader,'cao');assert.equal(a.units.find(u=>u.id==='cao').troops,0);validateCampaign(JSON.parse(serializeCampaign(s)));
const out='outputs/follow-army-ui';await mkdir(out,{recursive:true});await writeFile(out+'/save.json',serializeCampaign(s));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4196',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{if(!sessionStorage.getItem('follow-fixture')){localStorage.setItem('sango-sovereign-v2',save);sessionStorage.setItem('follow-fixture','1');}},serializeCampaign(s));
 await page.goto('http://127.0.0.1:4196/#strategy');
 const openOfficer=async()=>{await page.locator('[data-action="campaign-info"]').click();await page.locator('[data-action="campaign-info-tab"][data-kind="officer"]').click();await page.locator('.info-directory [data-id="cao"]').click();};
 await openOfficer();assert.match(await page.locator('[data-info-section="status"]').innerText(),/随军待整编/);
 await page.screenshot({path:out+'/officer-desktop.png',animations:'disabled'});
 await page.locator('[data-action="campaign-info-back"]').click();await page.locator('[data-action="campaign-info-tab"][data-kind="army"]').click();await page.locator(`.info-directory [data-id="${a.id}"]`).click();
 assert.match(await page.locator('[data-info-section="command"]').innerText(),/曹操/);
 const followers=page.locator('[data-info-section="followers"]');assert.match(await followers.innerText(),/曹操.*保留原任职/);await followers.scrollIntoViewIfNeeded();
 await page.screenshot({path:out+'/army-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:390,height:844});await followers.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/army-mobile.png',animations:'disabled'});
 await page.reload();await openOfficer();assert.match(await page.locator('[data-info-section="status"]').innerText(),/随军待整编/);assert.deepEqual(errors,[]);
 console.log('PASS: victorious army retains Cao, commander and follower details, desktop/mobile, refresh and saved status');
}finally{await browser?.close();server.kill();}
