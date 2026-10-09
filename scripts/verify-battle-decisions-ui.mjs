import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,openReinforcementCouncil,validateSave} from '../engine.mjs';
import {pendingArmyAppointments} from '../postbattle-appointments.mjs';
import {recommendArmyAppointments} from '../army-appointments.mjs';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../tests/helpers/auto-domestic-campaign.mjs';
import {fieldFromCity} from '../tests/helpers/field-campaign.mjs';
import {pendingActivityReports,acknowledgeActivityReports} from '../activity-nodes.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/player-ai-decisions/battle-ui',port='4224',origin='http://127.0.0.1:'+port;
await mkdir(out,{recursive:true});
const s=newCampaign(1);fieldFromCity(s,'xuchang',{target:'guandu'});fieldFromCity(s,'guandu',{target:'xuchang'});beginExecution(s);
for(let i=0;i<30&&!activeBattles(s).length;i++)advanceCampaignDay(s);
const r=activeBattles(s)[0];chooseEncounter(s,r.id,true);lockDeployment(r.battle);
for(const u of r.battle.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}
const army=s.armies.find(a=>a.id===r.armyIds.find(id=>s.armies.find(a=>a.id===id)?.faction==='cao')),leader=r.battle.sides[0].units.find(u=>u.id===army.leader);
Object.assign(leader,{x:0,y:0,retreatAt:leader.hp});advanceCampaignStep(s);
for(const u of r.battle.sides[1].units){u.battleDamage+=u.hp;u.hp=0;u.status='defeated';}
advanceCampaignStep(s);assert.ok(pendingArmyAppointments(s).some(p=>p.armyId===army.id));acknowledgeActivityReports(s,pendingActivityReports(s).map(n=>n.id));validateCampaign(JSON.parse(serializeCampaign(s)));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
 page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',JSON.stringify(s));},s);
 await page.goto(origin+'/#strategy');await page.getByRole('heading',{name:'战后军团任命'}).waitFor();
 await page.screenshot({path:out+'/appointment-dialog-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/appointment-dialog-mobile.png',fullPage:true});
 await page.locator('[data-action="close"]').click();await page.getByRole('heading',{name:'战后军团任命'}).waitFor();await page.reload();await page.getByRole('heading',{name:'战后军团任命'}).waitFor();
 const roles=recommendArmyAppointments(army);for(const role of ['leader','advisor']){const select=page.locator(`[data-postbattle-appointment-role="${role}"][data-army-id="${army.id}"]`);if(!await select.isDisabled())await select.selectOption(roles[role]);}
 await page.locator('[data-action="postbattle-appointments-confirm"]').click();assert.equal(await page.locator('[data-postbattle-appointment-role]').count(),0);
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-action="campaign-battles"]').click();await page.locator('.battle-overview').waitFor();await page.locator('[data-action="campaign-replay"]').first().click();
 await page.locator('.battle-appointments').waitFor();assert.match(await page.locator('.battle-appointments').innerText(),/军团长.*→/);
 const saved=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 await page.screenshot({path:out+'/postbattle-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/postbattle-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),saved);
 await page.close();page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 const battle=generateBattle(defaultCustomBattle());await page.addInitScript(s=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!localStorage.getItem('sango-historical-battle-v1'))localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s));},battle);
 await page.goto(origin+'/#historical-battle');await page.locator('.battle-council').waitFor();assert.match(await page.locator('.battle-council').innerText(),/战前会议/);assert.equal(await page.locator('[data-role="deputy"],[data-scenario-role="deputy"]').count(),0);assert.ok(!await page.locator('body').innerText().then(s=>s.includes('副将')));
 await page.screenshot({path:out+'/council-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/council-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 await page.close();page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 const d=defaultCustomBattle();d.ownTeam=['cao','jia','liao'].map(id=>({id,type:'spear',troops:3000,level:5}));d.ownTeamRoles={leader:'cao',advisor:'jia'};d.reinforcements=[{side:0,name:'支援军',tick:5,team:[{id:'person-255',type:'spear',troops:3000,level:5}],roles:{leader:'person-255',advisor:'person-255'}}];
 const wave=generateBattle(d);lockDeployment(wave.battle);for(let i=0;i<8&&!wave.battle.reinforcementCouncil;i++)stepBattle(wave.battle,{aiSides:[]});assert.equal(openReinforcementCouncil(wave.battle),null);validateSave(wave);
 const armyId=wave.battle.sides[0].units.find(u=>u.id==='cao').armyId;
 await page.addInitScript(s=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!localStorage.getItem('sango-historical-battle-v1'))localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s));},wave);await page.goto(origin+'/#historical-battle');await page.locator('.battle-council').waitFor();
 await page.locator('.battle-council details').first().locator('summary').click();const leaderSelect=page.locator(`[data-battle-appointment-role="leader"][data-army-id="${armyId}"]`);assert.equal(await leaderSelect.locator('option[value="person-255"]').count(),0);
 await leaderSelect.selectOption('liao');await page.locator(`[data-action="battle-appointments-confirm"][data-army-id="${armyId}"]`).click();
 await page.reload();await page.locator('.battle-council').waitFor();assert.equal(await page.locator(`[data-battle-appointment-role="leader"][data-army-id="${armyId}"]`).inputValue(),'liao');
 await page.screenshot({path:out+'/reinforcement-council-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/reinforcement-council-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 await browser.close();browser=null;
 const military=spawn(process.execPath,['scripts/verify-military-flow-ui.mjs'],{env:{...process.env,PLAYWRIGHT_MODULE:process.env.PLAYWRIGHT_MODULE||'playwright',SANGO_UI_ORIGIN:origin},stdio:'pipe',windowsHide:true});let output='';military.stdout.on('data',d=>output+=d);military.stderr.on('data',d=>output+=d);const code=await new Promise((resolve,reject)=>{military.once('exit',resolve);military.once('error',reject);});await writeFile(out+'/military-ui.txt',output);assert.equal(code,0,output);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,errors,postbattleDialog:true,postbattleReport:true,prebattleCouncil:true,reinforcementAppointments:true,twoArmyRoles:true,militaryFlow:true},null,2));console.log('PASS battle councils, postbattle appointment dialog and reports, two-role military management, desktop/mobile and reload.');
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:out+'/failure.png',fullPage:true});throw error;}finally{await browser?.close();server.kill();}
