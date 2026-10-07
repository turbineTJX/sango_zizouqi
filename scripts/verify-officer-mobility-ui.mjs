import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4195',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});browser=await chromium.launch({channel:'msedge',headless:true});await mkdir('outputs/officer-mobility-ui',{recursive:true});
 for(const kind of ['mission','captive']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4195/#strategy');
  const fixture=await page.evaluate(async kind=>{
   const {newCampaign,beginExecution,advanceCampaignDay}=await import('/strategic-campaign.mjs'),s=newCampaign(15);s.cities.forEach(c=>c.gold=100000);s.gold=s.cities.filter(c=>c.owner===s.campaign.playerFaction).reduce((n,c)=>n+c.gold,0);const c=s.cities.find(c=>c.id==='xuchang');let id;
   if(kind==='mission'){const {readyTalent}=await import('/tests/helpers/talent.mjs'),{assignDomestic,ACTIONS}=await import('/domestic.mjs');readyTalent(s,'chenliu');const o=s.campaign.idle.find(o=>o.location===c.id&&o.unit.id!==c.governor&&o.faction==='cao');id=o.unit.id;for(const [k,d]of Object.entries(ACTIONS))if(d.direction==='talent'&&k!=='hire')c.domestic.cooldowns[k]=10000;assignDomestic(s,c.id,'talent',id);beginExecution(s);advanceCampaignDay(s);}
   else {const {resolveOfficerLoss,fateRoll}=await import('/officer-fates.mjs');const unit=c.units[0];id=unit.id;let eventId;for(let i=0;i<10000;i++){const k='ui:'+i,r=fateRoll(s,k);if(r>=.02&&r<.35){eventId=k;break;}}resolveOfficerLoss(s,{unit,faction:'cao',location:'guandu',enemy:'yuan',eventId});}
   return {s,id};
  },kind);
  await page.addInitScript(s=>{if(!sessionStorage.getItem('fixture')){localStorage.setItem('sango-sovereign-v2',JSON.stringify(s));sessionStorage.setItem('fixture','1');}},fixture.s);await page.reload();
  await page.locator('[data-action="campaign-info"]').click();await page.locator('[data-action="campaign-info-tab"][data-kind="officer"]').click();await page.locator(`.info-directory [data-id="${fixture.id}"]`).click();
  const status=page.locator('#overlay-root [data-info-section="status"]');assert.match(await status.innerText(),kind==='mission'?/赴访途中/:/被俘/);await page.screenshot({path:`outputs/officer-mobility-ui/${kind}-desktop.png`,animations:'disabled'});
  if(kind==='captive'){await page.locator('[data-action="personnel-ransom"]').click();assert.match(await status.innerText(),/赎回返城/);const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2')));assert.ok(saved.gold<fixture.s.gold);assert.ok(saved.campaign.idle.find(o=>o.unit.id===fixture.id)?.destination);await page.reload();await page.locator('[data-action="campaign-info"]').click();await page.locator('[data-action="campaign-info-tab"][data-kind="officer"]').click();await page.locator(`.info-directory [data-id="${fixture.id}"]`).click();assert.match(await status.innerText(),/赎回返城/);}
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`outputs/officer-mobility-ui/${kind}-mobile.png`,animations:'disabled'});assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: mission location, prisoner detail, ransom command, saved return journey, desktop and mobile');
}finally{await browser?.close();server.kill();}
