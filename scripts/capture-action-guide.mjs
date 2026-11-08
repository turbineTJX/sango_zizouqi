import {chooseAssignment} from './assignment-picker-ui-helpers.mjs';
// Real UI captures for the maintained action guide. Isolated browser contexts
// and labelled demonstration saves never touch a player's browser profile.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,validateCampaign,transferOfficer,disbandCityUnits,orderCampaignArmy} from '../strategic-campaign.mjs';
import {roadDistance} from '../strategic-movement.mjs';
import {assignDomestic,cancelDomestic,ACTIONS,setDomesticAutoApprove} from '../domestic.mjs';
import {resolveTalentResignations} from '../talent-lifecycle.mjs';
import {scoutCandidates,scoutTargets,dispatchScout,advanceScouting} from '../scouting.mjs';
import {updateVision} from '../strategic-vision.mjs';
import {COMMAND_RESOURCE} from '../engine.mjs';
import {pendingActivityReports,acknowledgeActivityReports} from '../activity-nodes.mjs';
import {recordOfficerActivities} from '../officer-activity.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {updateCityBudgetAlerts} from '../city-budget.mjs';
import {chooseCommandTarget,chooseMapTarget,panMapTo} from './map-target-ui-helpers.mjs';
import {fieldFromCity,approachDestination} from '../tests/helpers/field-campaign.mjs';
import {busyFixture} from '../tests/helpers/domestic-orders.mjs';
import {siegeMobilizationFixture} from '../tests/helpers/siege-mobilization.mjs';
import {treasureRecord,treasureOfficerRows} from '../treasures.mjs';
import {lordCity,diplomaticOfficerCandidates,assignDiplomat} from '../diplomacy.mjs';
import {proposeDiplomatic,untilDiplomatic} from '../tests/helpers/diplomacy-campaign.mjs';
import {fundCities} from '../tests/resource-fixtures.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,settleBattle,openReinforcementCouncil,validateSave} from '../engine.mjs';
import {resolveOfficerLoss,officerLossResult,fateRoll,updateCaptives,ransomCost} from '../officer-fates.mjs';
import {endingCampaign} from '../tests/helpers/ending-campaign.mjs';
import {pendingArmyAppointments} from '../postbattle-appointments.mjs';
import {recommendArmyAppointments} from '../army-appointments.mjs';
import {setStatus} from '../tactics.mjs';
import {currentBattle} from '../tests/helpers/current-battle.mjs';

if(process.argv[2]==='desktop'){process.argv.push('--capture');await import('./verify-desktop-manual.mjs');process.exit(0);}
if(process.argv[2]==='navigation'){process.argv.push('--capture');await import('./verify-battle-navigation-ui.mjs');process.exit(0);}
if(process.argv[2]==='replay'){process.argv.push('--capture');await import('./verify-campaign-replay-ui.mjs');process.exit(0);}
if(process.argv[2]==='scenario-editor'){process.argv.push('--manual');await import('./verify-scenario-editor-ui.mjs');process.exit(0);}
if(process.argv[2]==='scenario-opening'){process.argv.push('--manual');await import('./verify-scenario-opening-ui.mjs');process.exit(0);}
if(process.argv[2]==='talent-subversion'){
 const capturePort=String(process.env.ACTION_GUIDE_PORT||4383),server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:capturePort},windowsHide:true,stdio:'pipe'});
 try{await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});process.env.GAME_URL=`http://127.0.0.1:${capturePort}`;process.argv.push('--manual');await import('./verify-talent-subversion-ui.mjs');}
 finally{server.kill();}process.exit(0);
}
const group=process.argv[2]||'civic',port=Number(process.env.ACTION_GUIDE_PORT)||4383,origin=`http://127.0.0.1:${port}`,out='docs/images/player-actions';
await mkdir(out,{recursive:true});await mkdir('outputs/action-guide',{recursive:true});
const manifestPath=`${out}/captures.json`,manifest=JSON.parse(await readFile(manifestPath,'utf8').catch(()=>'{}'));
 const files=['battle-onboarding.mjs','battle-help.mjs','page-guide-view.mjs','app.js','military-flow.mjs','city-budget.mjs','page-guides.mjs','strategic-command.mjs','battle-council.mjs','army-appointments-view.mjs','combat-comparison.mjs','status-display.mjs','battle-presentation.css','battle-labels.mjs','battle-health-view.mjs','battle-effects.mjs','battle-info.mjs','battle-inspection-view.mjs','art-battle.mjs','art-models.mjs','strategic.css','faction-directory.mjs','detail-panels.mjs','map-object-menu.mjs','strategic-workspace.css','management-ui.css','assignment-picker.mjs','scouting-view.mjs','diplomacy-view.mjs'];
if(group==='treasure-editor')files.push('treasure-editor.mjs','treasure-editor.css','treasure-catalog.mjs','data/design/treasures.mjs');
if(group==='officerEditor')files.push('officer-editor.mjs','officer-editor.css','officer-library.mjs','officer-library-data.mjs','officer-catalog.mjs','campaign-lobby.mjs');
if(group==='treasures')files.push('treasures.mjs','treasure-view.mjs','treasure-art.mjs','treasure-equipment.mjs','treasure-appearance.mjs','treasure-battle.mjs','treasure-statuses.mjs','data/design/treasures.mjs');
if(group==='loyalty')files.push('talent-core.mjs','talent-lifecycle.mjs','data/design/talent-loyalty.mjs','domestic.mjs','domestic-direction-view.mjs','reward-presentation.mjs','activity-nodes.mjs');
if(group==='armyOrders')files.push('strategic-campaign.mjs','strategic-orders.mjs','strategic-vision.mjs','strategic-army-markers.mjs','map-target-picker.mjs');
if(group==='reports')files.push('reward-presentation.mjs','reward-reports.css','activity-nodes.mjs');
if(['battleHelp','officerInspection'].includes(group))files.push('status-inspection.mjs','data/design/tactics.mjs');
if(group==='tacticPowers')files.push('data/design/tactics.mjs','data/design/assignments.mjs','data/design/tactic-selection.mjs','tactics.mjs','tactic-learning.mjs','tactic-power.mjs','tactic-tempo.mjs','engine.mjs');
const hash=createHash('sha256');for(const f of [...files,'personnel-movement.mjs','strategic-retreat.mjs','data/design/movement-rules.mjs','data/design/traits.mjs','ui-tokens.css','ui-theme.css','ui-fonts/font-face.css','ui-fonts/noto-serif-sc.woff2','ui-materials/ink-grain.svg','ui-materials/cloud-jade-frame.png','ui-materials/ink-silk-panel.png'])hash.update(f).update(await readFile(f));const sourceHash=hash.digest('hex');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'on'},windowsHide:true,stdio:'pipe'});
let browser,page,context,sample='',errors=[];
const a=id=>page.locator(`[data-action="${id}"]`);
const click=async id=>{const modal=page.locator('#overlay-root [data-action="'+id+'"]').filter({visible:true});await (await modal.count()?modal.first():a(id).filter({visible:true}).first()).click();};
const save=()=>page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')));
async function dismiss(){for(let i=0;i<4;i++){if(await page.getByRole('heading',{name:'战略奏报',exact:true}).isVisible())await page.locator('.modal-header [data-action="close"]').last().click();else break;}}
async function load(s=newCampaign(203,'guandu-200'),label='官渡剧本演示开局',battle=false,keepReports=false,firstBattle=false){
 await context?.close();sample=label;context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',acceptDownloads:true});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 if(s?.campaign&&!keepReports)acknowledgeActivityReports(s,pendingActivityReports(s).map(n=>n.id));
 const key=battle?'sango-historical-battle-v1':'sango-sovereign-v2',raw=s?(s.campaign?serializeCampaign(s):JSON.stringify(s)):null;
 await context.addInitScript(({raw,key,firstBattle})=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-audio-v1',JSON.stringify({muted:true}));if(!firstBattle)localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0}));if(raw&&!sessionStorage.getItem('action-guide-seeded')){localStorage.setItem(key,raw);sessionStorage.setItem('action-guide-seeded','1');}},{raw,key,firstBattle});
 await page.goto(origin+(s?battle?'/#historical-battle':'/#strategy':'/'));await page.locator(s?battle?'.arena-stage,[data-action="retry-scenario"]':'.national-world,.strategy-world,.campaign-ending':'[data-action="strategy"]').first().waitFor();if(!keepReports)await dismiss();
 if(battle&&s?.battle&&!s.battle.result){await page.waitForFunction(()=>{const b=document.querySelector('#battle-board');return b?.dataset.modelStatus==='ready'&&Number(b.dataset.modelCount)>=b.querySelectorAll('[data-unit]').length;});await page.locator('#battle-board').evaluate(async el=>{await Promise.all([...el.querySelectorAll('img')].map(img=>img.complete?null:new Promise(ok=>{img.addEventListener('load',ok,{once:true});img.addEventListener('error',ok,{once:true});})));await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));});}
 return s;
}
async function portraitClick(side){const el=page.locator('.battle-unit.side-'+side+' .map-portrait-row').first(),r=await el.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await el.click();}
async function shot(id,title,selector=null,{keepPointer=false}={}){
 if(selector)await page.locator(selector).first().scrollIntoViewIfNeeded();
 await page.evaluate(()=>document.fonts.ready);if(!keepPointer)await page.mouse.move(2,2);await page.waitForTimeout(250);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'horizontal page overflow: '+id);
 await page.screenshot({path:`${out}/${id}.webp`,type:'webp',quality:88,animations:'disabled',style:'#toast{visibility:hidden}',fullPage:['treasure-editor','officerEditor'].includes(group)});
 Object.assign(manifest,JSON.parse(await readFile(manifestPath,'utf8')));
 manifest[id]={title,file:`images/player-actions/${id}.webp`,group,sample,viewport:page.viewportSize(),capturedAt:new Date().toISOString(),sourceHash};
 await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log('CAPTURE '+id+' '+title);
}
async function city(id='xuchang'){
 if(!await page.locator('.national-world').count()){await page.locator('.strategy-world [data-city="'+id+'"]').first().click();return;}
 if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search summary').click();
 await page.locator('#national-city-search').selectOption(id);
}
async function command(task,place='xuchang'){
 await city(place);await page.locator(`[data-action="map-city-commands"][data-group="${['transfer','governor'].includes(task)?'personnel':'military'}"]`).click();await page.locator(`.city-command-grid [data-task="${task}"]`).click();
}
async function info(kind,id,scope='self'){await click('campaign-info');if(scope!=='self')await page.locator('[data-action="info-menu-scope"][data-scope="'+scope+'"]').click();await page.locator(`[data-action="info-menu-list"][data-kind="${kind}"]`).click();if(id)await page.locator(`.info-directory [data-action="campaign-info-detail"][data-id="${id}"]`).click();}
async function military(kind){await page.locator('.faction-navigation [data-action="map-quick-open"][data-kind="army"]').click();await page.locator('[data-action="map-quick-select"][data-kind="army"]').first().click();await page.locator('.map-selection-card [data-action="map-object-manage"]').click();await click('army');await page.locator(`[data-action="military-purpose"][data-kind="${kind}"]`).click();}

const groups={
 async armyOrders(){
  const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang'),army=fieldFromCity(s,home.id,{ids:home.units.filter(u=>!u.cityGuard&&u.id!==home.governor).slice(0,2).map(u=>u.id)});
  assert.equal(orderCampaignArmy(s,army.id,'chenliu'),null);
  army.travel={from:army.location,to:army.route[0],road:'main',progress:roadDistance(s,army.location,army.route[0])/3};recordOfficerActivities(s);updateVision(s);
  await load(s,'筹划阶段中途行军的己方军团，点选后驻守或变更目的地');await city(army.location);await click('map-object-close');
  const card=()=>page.locator(`[data-campaign-army="${army.id}"]`);
  await card().press('Enter');const before=await save();await shot('army-card','军团驻守、变更目的地与兵员粮草');
  await page.setViewportSize({width:844,height:390});await shot('army-card-landscape','手机横屏军团驻守与变更目的地');await click('campaign-order-hold');await shot('army-hold-landscape','手机横屏驻守确认');await page.keyboard.press('Escape');assert.deepEqual(await save(),before);
  await page.setViewportSize({width:1440,height:900});await card().press('Enter');await click('campaign-order');await chooseCommandTarget(page,'chenliu');await shot('march-route','从当前路段位置变更目的地');await click('campaign-command-next');await shot('march-review','变更目的地最终核阅');await click('campaign-command-cancel');assert.deepEqual(await save(),before);
  await card().press('Enter');await click('campaign-order-hold');await shot('army-hold','就地驻守确认与粮草消耗');await click('campaign-confirm-action');
  await page.waitForFunction(async id=>{const raw=await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2');return JSON.parse(raw).armies.find(a=>a.id===id)?.route.length===0;},army.id);
  const held=(await save()).armies.find(a=>a.id===army.id);assert.deepEqual(held.travel,army.travel);assert.equal(held.target,null);assert.equal(held.supply,army.supply);assert.deepEqual(held.units,army.units);
  await page.reload();await card().waitFor();assert.equal(await card().getAttribute('data-army-state'),'stationed');await card().press('Enter');await click('campaign-order');await chooseCommandTarget(page,'chenliu');await click('campaign-command-next');await click('campaign-pick-confirm');
  await page.waitForFunction(async id=>{const raw=await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2');return JSON.parse(raw).armies.find(a=>a.id===id)?.route.length>0;},army.id);
  assert.deepEqual((await save()).armies.find(a=>a.id===army.id).travel,army.travel);
  await card().press('Enter');await click('map-object-manage');await shot('army-menu','军团管理中的驻守与变更目的地');
 },
 async 'treasure-editor'(){
  await load(null,'宝物初始配置编辑演示');await click('treasure-editor');
  await page.locator('[data-treasure-editor-action="select"][data-id="skyHalberd"]').click();
  await page.locator('[data-treasure-editor-field="name"]').fill('试制画戟');
  await page.locator('[data-treasure-editor-field="effect"]').selectOption('resolve');
  await page.locator('[data-treasure-editor-field="steps"]').fill('2');await page.locator('[data-treasure-editor-field="steps"]').press('Tab');
  await page.locator('[data-treasure-editor-action="save"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-treasure-editor-status]')?.textContent==='已保存'&&getComputedStyle(document.getElementById('toast')).opacity==='0');
  await shot('treasure-editor','宝物名称效果与本机配置');await page.setViewportSize({width:844,height:390});await shot('treasure-editor-landscape','宝物编辑器手机横屏');
 },
 async governor(){
  const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='chenliu');
  await load(s,'官渡剧本陈留：实际选人任命太守、另行委托审批及解除');
  await city(c.id);await page.locator('[data-action="map-city-commands"][data-group="personnel"]').click();await shot('governor-entry','城市人事中的太守任命入口');
  await page.locator('.city-command-grid [data-task="governor"]').click();
  const choice=page.locator('[data-personnel-choice]:not(:disabled)').first(),id=await choice.getAttribute('data-personnel-choice');await choice.check();
  const before=await save();await page.keyboard.press('F1');await page.locator('.page-guide-coach[data-guide-topic="governor"]').waitFor();
  await page.waitForFunction(()=>Number(document.querySelector('.page-guide-coach')?.dataset.guideTargetCount)>0);
  await shot('governor-guide','任命太守指引：在真实人选表中比较与选择');
  await page.setViewportSize({width:390,height:844});await shot('governor-guide-mobile','手机上的太守任命指引');
  await page.locator('[data-guide-action="step"][data-guide-index="1"]').click();await page.waitForFunction(()=>Number(document.querySelector('.page-guide-coach')?.dataset.guideTargetCount)>0);
  assert.deepEqual(await save(),before,'reading appointment help never appoints or changes resources');await page.locator('.page-guide-x').click();assert.ok(await choice.isChecked());
  await page.setViewportSize({width:1440,height:900});await shot('governor','比较本城人选并确认太守任命');await click('campaign-pick-confirm');
  let current=await save();assert.equal(current.cities.find(x=>x.id===c.id).governor,id);assert.equal(current.cities.find(x=>x.id===c.id).domestic.approvalGovernor,null,'appointment does not delegate approval');
  await click('faction-domestic');const control=page.locator(`[data-action="domestic-governor-approval"][data-city="${c.id}"]`);await control.scrollIntoViewIfNeeded();await shot('governor-delegation','任命后在城市审批中另行开启委托');
  const undelegated=await save();await page.keyboard.press('F1');await page.locator('.page-guide-coach[data-guide-topic="affairs"]').waitFor();await page.locator('[data-guide-action="step"][data-guide-index="3"]').click();
  await page.waitForFunction(()=>Number(document.querySelector('.page-guide-coach')?.dataset.guideTargetCount)>0);await shot('governor-delegation-guide','内政指引框选城市审批表');
  await page.setViewportSize({width:390,height:844});await shot('governor-delegation-guide-mobile','手机上的太守审批委托指引');assert.deepEqual(await save(),undelegated,'reading delegation help never toggles approval');await page.locator('.page-guide-x').click();
  await page.setViewportSize({width:1440,height:900});await control.click();current=await save();assert.equal(current.cities.find(x=>x.id===c.id).domestic.approvalGovernor,id);await shot('governor-delegated','本城已开启太守审批，仍可随时收回');await click('close');
  await city(c.id);await page.locator('.city-command-menu [data-action="campaign-info-detail"]').click();await page.locator('[data-action="map-object-manage"][data-kind="city"]').click();
  await page.locator(`.city-affairs[data-city-disclosure="${c.id}:offices"]>summary`).click();await shot('governor-assigned','城市管理中的现任太守、审批开关与解除入口','[data-action="campaign-clear-governor"]');
  const assigned=await save();await page.keyboard.press('F1');await page.locator('.page-guide-coach[data-guide-topic="city"]').waitFor();await page.locator('[data-guide-action="step"][data-guide-index="4"]').click();await shot('governor-management-guide','城市指引框选太守管理与解除入口');assert.deepEqual(await save(),assigned);await page.locator('.page-guide-x').click();
  await click('campaign-clear-governor');current=await save();assert.equal(current.cities.find(x=>x.id===c.id).governor,null);assert.equal(current.cities.find(x=>x.id===c.id).domestic.approvalGovernor,null);await shot('governor-removed','解除太守后同步收回本城审批委托');
 },
 async transportCycles(){
  const s=newCampaign(203,'guandu-200'),carrier=treasureOfficerRows(s).find(o=>o.unit.id==='person-195');assert.ok(carrier);
  if(s.cities.find(c=>c.id===carrier.location).units.some(u=>u.id===carrier.unit.id))assert.equal(disbandCityUnits(s,carrier.location,[carrier.unit.id]),null);
  await load(s,'由本剧本实际驻城、无兵无伤兵的国渊安排循环运粮；已有部队时先经共同处理器解散的演示');await command('transfer',carrier.location);await page.locator('[data-personnel-choice="person-195"]').check();await click('campaign-command-next');await chooseCommandTarget(page,'chenliu');
  await page.locator('[data-transfer-cargo="grain"]').fill('47');await page.locator('.transport-options summary').click();await page.locator('[data-transfer-cycles]').selectOption('3');assert.ok(await a('campaign-command-next').isEnabled());await shot('transport-cycles','无部队与伤兵的漕运人员选择真实循环批次');
 },
 async lightTransfer(){
  const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),o=s.campaign.idle.find(o=>o.location===c.id&&o.unit.id!==c.governor&&!o.unit.troops&&!o.unit.wounded);assert.ok(o);
  await load(s,'真正空身、无部队无伤兵且不携物资的人员调任演示');await command('transfer',c.id);await page.locator(`[data-personnel-choice="${o.unit.id}"]`).check();await shot('light-transfer-person','选择真正空身的调任武将');
  await click('campaign-command-next');await chooseCommandTarget(page,'chenliu');await shot('light-transfer-target','空身人员选择终点，金粮与预备兵保持零');await click('campaign-command-next');
  assert.ok(!(await page.locator('.transport-cargo').innerText()).includes('随行兵力'));await shot('transfer-empty-review','空身调任核阅：无随行部队与物资');
 },
 async loyalty(){
  const s=newCampaign(203,'guandu-200'),home='town-8',target='person-409',executor='person-35';
  s.campaign.domestic.loyalty[target]=55;s.campaign.talent.seed=0;
  resolveTalentResignations(s,cancelDomestic);recordOfficerActivities(s);
  await load(s,'低忠诚提醒演示：张勋忠诚55，展示未离职的随机结果；不是自然局验收',false,true);
  const reminder=page.locator('.report-dispatch').filter({hasText:'张勋'});
  await reminder.waitFor();assert.match(await reminder.innerText(),/忠诚偏低（55）/);
  assert.doesNotMatch(await reminder.innerText(),/预计|将于|倒计时|30天/);
  await shot('loyalty-warning','忠诚偏低提醒及人才事务入口');
  await reminder.locator('[data-action="domestic-direction-open"][data-direction="talent"]').click();
  await page.locator('[data-domestic-direction-detail="talent"]').waitFor();
  assert.match(await page.locator('.modal-header').last().innerText(),/人才/);
  await shot('loyalty-talent','直接进入北海人才方向，查看岗位及负责人');
  await page.locator('.domestic-slots .empty:not([disabled])').first().click();
  await page.locator(`[data-personnel-choice="${executor}"]`).check();
  await shot('loyalty-appointment','按魅力及相关特性选择人才负责人');
  await click('campaign-pick-confirm');await page.locator('[data-domestic-officer="'+executor+'"]').waitFor();
  const saved=await save();assert.ok(saved.campaign.domestic.assignments.some(a=>a.cityId===home&&a.direction==='talent'&&a.officerId===executor));
  assert.equal(saved.campaign.domestic.loyalty[target],55,'任命负责人不能提前增加目标忠诚');
  await shot('loyalty-assigned','人才负责人已委任，安抚须实际办理才提高忠诚');
  await click('close');await click('close');await dismiss();
  await page.locator('.faction-navigation [data-action="faction-directory"][data-kind="officer"]').click();
  await page.locator('[data-action="officer-directory-tab"][data-tab="abilities"]').click();
  await page.locator('[data-sort-key="loyalty"]').click();
  await shot('loyalty-roster','人才名册能力页查看当前忠诚');
 },
 async transportMovement(){
  await groups.lightTransfer();
  const s=newCampaign(203,'guandu-200'),unit=s.cities.find(c=>c.id==='xuchang').units.find(u=>u.id==='yuanxia');
  assert.equal(transferOfficer(s,unit.id,'chenliu',{cargo:{gold:0,grain:500,manpower:200}}),null);
  s.campaign.ai.lastPlanDay=s.campaign.day;beginExecution(s);advanceCampaignDay(s);
  const carrier=s.campaign.idle.find(o=>o.unit.id===unit.id);assert.ok(carrier?.journey.progress>0);
  await load(s,'通过共同调任处理器下令并真实推进一天的运兵与物资混载演示，未修改道路、速度或位置');
  await city(carrier.location);await click('map-object-close');
  const marker=page.locator(`[data-transport-officer="${unit.id}"]`);
  await panMapTo(page,await marker.evaluate(el=>({x:+el.dataset.x,y:+el.dataset.y})));
  await shot('transport-running','运输队沿实际道路移动并显示在途位置');
  await marker.press('Enter');await shot('transport-detail','运输队的随行兵力、物资、路段与剩余天数');
  await page.setViewportSize({width:844,height:390});await shot('transport-detail-landscape','手机横屏滚动查看随行物资与兵力','[data-info-section="status"] .info-fields > div:last-child');
  await groups.transportCycles();
 },
 async scouting(){
  const {s,id}=busyFixture(),home='xuchang',target=scoutTargets(s,home)[0];
  assert.ok(target);await load(s,'在办内政人员转任侦察的隔离演示：返回保留原工作，立即执行后才解除');
  await click('scout-open');await shot('scout-source','侦察先确定派出城市');await page.locator('#scout-city').click();await shot('scout-cities','侦察派出城市表');await click('assignment-picker-cancel');await chooseAssignment(page,'#scout-city',home);
  await page.locator('#scout-officer').click();await shot('scout-officers','侦察执行人表');await click('assignment-picker-cancel');await chooseAssignment(page,'#scout-officer',id);
  await page.locator('[data-action="map-target-open"][data-kind="scout-target"]').click();await page.locator(`[data-command-city="${target.id}"]`).press('Enter');await shot('scout-endpoint-map','在地图选择侦察终点并确认');await click('map-target-confirm');await shot('scout-route','侦察终点路线与预计抵达');await page.setViewportSize({width:844,height:390});await shot('scout-landscape','手机横屏地图选点与抵达预览');await page.setViewportSize({width:1440,height:900});
  const before=await save();await click('scout-dispatch');await page.locator('[data-action="campaign-order-choice"][data-choice="now"]').waitFor();
  assert.equal(await page.locator('[data-action="campaign-order-choice"][data-choice="after"]').count(),0);assert.deepEqual(await save(),before);await shot('player-handoff','侦察与在办事务冲突：返回保留原工作，立即执行才中止');
  await click('campaign-command-return');assert.deepEqual(await save(),before);await click('scout-dispatch');await page.locator('[data-action="campaign-order-choice"][data-choice="now"]').click();
  const after=await save();assert.ok(after.campaign.scouting.tasks.some(t=>t.officerId===id));assert.ok(!after.campaign.domestic.assignments.some(a=>a.officerId===id));assert.equal(after.campaign.scouting.tasks.find(t=>t.officerId===id).lastDay,0);await shot('scout-running','侦察派遣后待出发，实际执行才开始观察');
  for(let i=0;i<30&&after.campaign.scouting.tasks.some(t=>t.officerId===id);i++){if(after.campaign.phase==='planning')assert.equal(beginExecution(after),null);for(const battle of activeBattles(after).filter(r=>r.awaiting))chooseEncounter(after,battle.id,false);advanceCampaignDay(after);}
  assert.equal(after.campaign.scouting.tasks.some(t=>t.officerId===id),false);await load(after,'已付费的侦察任务沿真实道路执行至抵达，任务结束并释放负责人，保留限时视野');await click('scout-open');await shot('scout-completed','抵达后斥候和任务消失，已留下的视野保留');
 },
 async affairs(){
  await load();await click('faction-domestic');const before=await save(),second=page.locator('.priority-row').nth(1),direction=await second.getAttribute('data-priority-direction');
  await second.locator('[data-action="faction-priority-up"]').click();assert.equal((await save()).campaign.domestic.priorities.cao[0],direction);
  await click('close');await click('faction-domestic');assert.equal(await page.locator('.priority-row').first().getAttribute('data-priority-direction'),direction);
  assert.ok(await a('faction-appoint').isEnabled());await shot('affairs','筹划阶段调整委任优先级与统一委任','.priority-ledger');
  await click('faction-appoint');assert.ok((await save()).campaign.domestic.assignments.length>before.campaign.domestic.assignments.length);
 },
 async appointmentHelp(){await load();await page.keyboard.press('F1');await shot('guide','按需查看主界面与城市委任指引');},
 async appointments(){
  await load();await shot('map','天下地图与势力命令');await city();await shot('city-menu','城市委任、军事、人事与详情');
  await click('city-domestic');assert.equal(await page.locator('.domestic-direction').count(),6);await shot('domestic','城市委任的六个方向与岗位');
  await page.setViewportSize({width:844,height:390});await shot('domestic-landscape','手机横屏选择六个委任方向');await page.setViewportSize({width:1440,height:900});
  await a('domestic-direction-open').first().click();await shot('direction','方向岗位与当前负责人');await page.locator('.domestic-slots .empty:not([disabled])').first().click();await shot('appointment','按能力与特性选择内政负责人');await page.locator('[data-personnel-choice]:not(:disabled)').first().check();await shot('appointment-selected','选择后直接确认任命');await click('campaign-command-cancel');await click('close');await click('close');
  await click('faction-domestic');await shot('affairs','全势力提案、统一委任与方向优先级');await click('close');
  await click('scout-open');await shot('scout-source','主界面统一侦察，先确定派出城市');await click('close');
  await page.locator('.faction-navigation [data-action="map-quick-open"][data-kind="city"]').click();await shot('city-directory','自辖城市与委任入口');
 },
 async battleHelp(){
  const d=defaultCustomBattle();d.shieldPercent=0;d.ownTeam=['cao','jia','liao'].map(id=>({id,type:'spear',troops:3000,level:5}));d.enemyTeam=['shao','wen','yan'].map(id=>({id,type:'spear',troops:3000,level:5}));
  await load(generateBattle(d),'独立战役首次战斗自动教学，按真实开战边界继续；查看不改变战斗规则',true,false,true);
  await page.getByRole('heading',{name:'首次战斗 · 1/4 · 入门',exact:true}).waitFor();await shot('battle-help-first','首次战斗自动显示操作入门与直接关闭入口');await page.setViewportSize({width:844,height:390});await shot('battle-help-first-landscape','手机横屏首次战斗指引');await page.setViewportSize({width:1440,height:900});
  await click('battle-onboarding-next');await click('battle-onboarding-next');await click('pause');await page.getByRole('heading',{name:'首次战斗 · 3/4 · 用兵',exact:true}).waitFor();await shot('battle-help-first-combat','开战后的实战与状态指引');await click('close');
  await load(generateBattle(d),'独立战役战场指引展示，查看不改变战斗状态',true);
  await click('battle-help');
  for(const topic of ['basics','controls','tactics','statuses']){await page.locator(`[data-action="battle-help-topic"][data-topic="${topic}"]`).click();await shot('battle-help-'+topic,'战场指引 · '+({basics:'入门',controls:'操作',tactics:'用兵',statuses:'状态'})[topic]);}
  const s=generateBattle(d);lockDeployment(s.battle);const u=s.battle.sides[0].units[0];
  setStatus(s.battle,u,'valor',8,{sourceId:u.id,sourceName:u.name,sourceSkillName:'鼓舞演示'});setStatus(s.battle,u,'confuse',5,{sourceId:s.battle.sides[1].units[0].id,sourceName:s.battle.sides[1].units[0].name,sourceSkillName:'混乱演示'});
  await load(s,'通过公共状态接口施加增益和异常，仅用于状态显示演示，不作为自然战斗或平衡证据',true);await portraitClick(0);
  await page.locator('.battle-brief-effects').scrollIntoViewIfNeeded();
  await page.locator('.effect-tile[data-status="confuse"]>summary').hover();
  assert.ok(await page.locator('.effect-tile[data-status="confuse"] .effect-details').isVisible());
  await shot('battle-buffs','悬停状态名直接查看效果、来源与剩余期限',null,{keepPointer:true});
  assert.ok(await page.locator('.effect-tile[data-status="confuse"] .effect-details').isVisible());
  await page.mouse.move(4,4);await page.setViewportSize({width:844,height:390});
  await page.locator('.effect-tile[data-status="confuse"]>summary').click();
  await shot('battle-buffs-landscape','横屏点击状态名固定展开说明','.battle-brief-effects');
 },
 async information(){
  await load();await click('faction-domestic');await shot('affairs','全势力内政提案与方向优先级');
  await load();await click('campaign-info');await page.locator('[data-action="info-menu-scope"][data-scope="all"]').click();await shot('intelligence-menu','按势力范围和对象类别查询');
  await page.locator('[data-action="info-menu-list"][data-kind="city"]').click();await shot('intelligence-directory','据点情报、分类筛选与固定表头');
  const scouts=newCampaign(203,'guandu-200'),officer=scoutCandidates(scouts,'xuchang')[0].unit.id;
  assert.equal(dispatchScout(scouts,'xuchang',officer,'chenliu'),null);
  for(let i=0;i<20&&!scouts.campaign.scouting.tasks[0].contacts.length;i++){scouts.campaign.day++;advanceScouting(scouts);updateVision(scouts);}
  await load(scouts,'沿真实道路取得侦察情报的演示');await click('scout-open');await page.locator('.scout-contact-list>summary').first().click();await click('scout-report');await shot('scout-report','侦察报告的观察日期与具体情报');
 },
 async personnel(){
  await load();await page.locator('[data-action="faction-directory"][data-kind="officer"]').click();
  await shot('personnel','人才名册查看所在、任职和事务');
  await page.locator('[data-action="officer-directory-tab"][data-tab="abilities"]').click();
  await shot('personnel-abilities','能力分栏比较五项能力、等级与忠诚');
  await page.locator('[data-action="officer-directory-tab"][data-tab="aptitudes"]').click();
  await page.locator('[data-sort-key="cavalry"]').click();await page.locator('[data-sort-key="cavalry"]').click();
  await shot('personnel-aptitudes','四系兵种适性，按真实等级比较与排序');
  await page.locator('[data-action="officer-directory-tab"][data-tab="bonds"]').click();
  await shot('personnel-bonds','羁绊独立分栏，显示当前等级并可查看效果');
  await page.locator('[data-action="officer-directory-tab"][data-tab="tactics"]').click();
  await shot('personnel-tactics','战法独立分栏，查看当前兵种战法与专属战法');
  await page.locator('[data-action="officer-directory-tab"][data-tab="stratagems"]').click();
  await page.locator('#faction-directory-query').fill('程昱');
  await page.locator('.personnel-table').getByText('整军肃阵',{exact:true}).waitFor();
  await shot('personnel-stratagems','军略独立分栏，查看各武将持有的军略');
  await page.locator('#faction-directory-query').fill('');
  await page.locator('[data-action="officer-directory-tab"][data-tab="abilities"]').click();
  await page.locator('[data-action="faction-object"][data-kind="officer"]').filter({hasText:'曹操'}).click();
  await shot('officer','完整窗口查看个人资料，返回保留名册');
  await click('directory-back');await page.locator('[data-action="officer-directory-tab"][data-tab="status"]').click();
  await page.locator('.talent-panel>summary').click();await shot('talent','任职栏下方查看人才接洽', '.talent-panel');
 },
 async officerInspection(){
  const d=defaultCustomBattle();d.ownTeam=['cao','jia'].map(id=>({id,type:'spear',troops:3000,level:5}));d.ownTeamRoles={leader:'cao',advisor:'jia'};
  await load(generateBattle(d),'独立战役部队信息核阅',true);await portraitClick(0);
  await page.locator('.battle-inspection-more>summary').click();
  assert.ok((await page.locator('.unit-state-grid').innerText()).includes('兵种适性'));
  assert.doesNotMatch(await page.locator('.attribute-grid').innerText(),/\d+\.\d+/);
  await shot('battle-attributes','完整属性整数显示，移速与攻速采用整数百分比','.attribute-grid');
  await page.locator('.battle-inspection-more>summary').click();
  await shot('battle-unit','部队简报优先显示兵力、战意、护盾与战法，完整属性按需展开');
  await click('unit-officer');assert.equal(await page.locator('[data-aptitude-family]').count(),4);
  await shot('battle-officer-aptitudes','战场所属武将的四系适性','.catalog-aptitudes');
 },
 async tacticPowers(){
  const x=currentBattle('relief','spear');await load(x.state,'真实固定营务小战法与大战法，仅演示查阅，不作为自然战斗证据',true);
  await page.locator('.battle-unit[data-unit="'+x.u.id+'"]').click();await page.locator('.battle-brief-tactics').waitFor();
  await shot('battle-support-kit','同一武将实际携带营务小战法镇静与营务大战法救援');
  await page.locator('.battle-brief-tactic[data-skill="relief"]').click();await shot('battle-support-power','营务大战法说明与部队当前营务威力');
  await page.setViewportSize({width:844,height:390});await shot('battle-support-power-landscape','手机横屏查阅营务大战法');
 },
 async configuration(){
  await load();await click('campaign-info');await page.locator('[data-action="info-menu-scope"][data-scope="all"]').click();await shot('intelligence-menu','按势力范围和对象类别查询');await page.locator('[data-action="info-menu-list"][data-kind="city"]').click();await shot('intelligence-directory','据点当前视野与带日期情报');
  await load(null,'自定义战役配置演示');await click('campaign-lobby');await page.locator('.custom-battle').evaluate(el=>el.scrollIntoView({block:'start'}));await shot('custom-editor','自定义战役的地图场景与军团入口');await click('custom-reinforcement-add');await shot('custom-reinforcements','援军的阵营到达条件与军团编制','.custom-reinforcements');
 },
 async disband(){
  await load();await command('draft');await a('campaign-unit-disband').first().click();await shot('troop-disband','待解散部队与实际返还兵员');await click('campaign-command-next');await shot('troop-disband-review','解散军令最终核阅');
 },
 async refinements(){
  const s=newCampaign(203,'guandu-200'),worker=s.campaign.idle.find(o=>o.location==='xuchang');assert.equal(assignDomestic(s,'xuchang','commerce',worker.unit.id),null);await load(s,'已实际委任负责人的操作演示');await city();await click('city-domestic');await page.locator('[data-action="domestic-direction-open"][data-direction="commerce"]').click();await shot('direction-assigned','现任负责人及解除入口');
  await load();await command('governor');await page.locator('[data-personnel-choice]:not(:disabled)').first().check();await click('campaign-pick-confirm');await page.locator('.faction-navigation [data-action="map-quick-open"][data-kind="city"]').click();await page.locator('[data-action="map-quick-select"][data-kind="city"][data-id="xuchang"]').click();await page.locator('.map-selection-card [data-action="campaign-info-detail"]').click();await page.locator('[data-action="map-object-manage"][data-kind="city"]').click();await page.locator('.city-affairs[data-city-disclosure="xuchang:offices"]>summary').click();await shot('governor-assigned','现任太守与解除任命','[data-action="campaign-clear-governor"]');
  const d=newCampaign(281,'guandu-200'),o=diplomaticOfficerCandidates(d,'cao','commerce')[0];assert.ok(assignDiplomat(d,o.unit.id,'commerce',{choice:'now'}).applied);await load(d,'已实际委任外交负责人的操作演示');await click('faction-diplomacy');await page.locator('.diplomatic-staff>summary').click();await shot('diplomat-assigned','已委任使臣与召回入口','[data-action="diplomacy-dismiss"]');
  const b=generateBattle(defaultCustomBattle());lockDeployment(b.battle);b.battle.commandProgress=COMMAND_RESOURCE.capacity;await load(b,'充能已满的全军军略机制演示',true);await click('choose-stratagem');await shot('stratagem-army','无需选点的全军军略与基础撤退军令');await page.locator('[data-command="cao-wuchao"]').click();await shot('stratagem-army-result','全军型军略点击后直接生效');
  await load(null,'独立战役单军编组操作演示');await click('campaign-lobby');await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();await click('scenario-setup-next');await shot('custom-select','从编好的部队中选队');await click('scenario-setup-next');await shot('custom-roles','独立战役军团任命');await click('scenario-setup-next');await shot('custom-army-review','单军编组核阅确认');
 },
 async reports(){
  const {s}=busyFixture();await load(s,'实际内政逐日推进形成的旬报演示',false,true);await shot('reports','战略奏报与查看事项');await page.locator('[data-action="activity-alert-record"]').first().click();await page.locator('.activity-report-detail').waitFor();await shot('report-detail','所选事项的前后变化、费用与办理结果');await page.getByRole('button',{name:'返回奏报',exact:true}).click();await dismiss();await page.locator('.harvest-strip>summary').click();await shot('harvest','旬收获与城仓净变化','.harvest-strip');
  const b=generateBattle(defaultCustomBattle());lockDeployment(b.battle);for(let i=0;i<3000&&!b.battle.result;i++)stepBattle(b.battle,{aiSides:[0,1]});assert.ok(b.battle.result);settleBattle(b);await load(b,'默认独立战役经共同战斗处理器完整结算的演示',true);await shot('standalone-report','独立战役结果与重试选项');
 },
 async prisonerExchange(){
  const s=newCampaign(15,'guandu-200');fundCities(s,100000);for(const [from,to]of [['cao','yuan'],['yuan','cao']]){const prison=s.cities.find(c=>c.owner===to&&c.units.length).id,unit=s.cities.filter(c=>c.owner===from).flatMap(c=>c.units).find(u=>!['cao','shao'].includes(u.id));let eventId;for(let i=0;i<10000;i++){const key='guide-swap:'+from+':'+i,v=fateRoll(s,key);if(officerLossResult(v,to)==='CAPTIVE'){eventId=key;break;}}assert.equal(resolveOfficerLoss(s,{unit,faction:from,enemy:to,location:prison,eventId}),'CAPTIVE');}const {p}=proposeDiplomatic(s,{goal:'prisoners',direction:'negotiation',other:'yuan'});untilDiplomatic(s,()=>p.status==='pending');await load(s,'双方固定合法被俘人员，经真实谈判形成的交换方案演示');await click('faction-diplomacy');await shot('prisoner-exchange','外交交换俘虏的双方名单与批准');
 },
 async armyStats(){
  const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang'),army=fieldFromCity(s,home.id,{ids:home.units.filter(u=>!u.cityGuard&&u.id!==home.governor).slice(0,2).map(u=>u.id)});army.location='junction:chenliu:xuchang';army.units[0].troops-=175;army.units[0].wounded=175;army.supply-=125;for(const c of s.cities.filter(c=>c.owner===army.faction&&c.id!=='luoyang'))c.grain=0;syncResourceTotals(s);recordOfficerActivities(s);updateCityBudgetAlerts(s);validateCampaign(JSON.parse(serializeCampaign(s)));
  await load(s,'演示存档中仅洛阳有存粮，沿当前有效道路向尉氏军团供粮');await city(army.location);await click('map-object-close');await page.locator(`[data-campaign-army="${army.id}"] [data-map-army-card]`).click();await page.locator('.map-selection-card[data-map-object-kind="army"]').waitFor();await shot('army-card','军团兵员、携粮与当前粮道');
  await click('campaign-info-detail');await shot('army-detail','军团完整情报与补给','[data-info-section="supply"]');await page.locator('[data-action="campaign-info-page"][data-page="所属部队"]').click();await shot('army-units','军团各队现役兵与伤兵');await click('close');
  await page.locator(`[data-campaign-army="${army.id}"]`).press('Enter');await click('map-object-manage');await shot('army-menu','军团管理中的兵员、携粮与供给');
 },
 async cityStats(){
  await load();await city();await shot('city-menu','城市现役、预备、伤兵与城防耐久');await click('campaign-info-detail');await shot('city-detail','城市详情中的兵员与城防数量');
 },
 async nodes(){
  await load();assert.equal((await page.locator('.national-world text').allTextContents()).some(text=>text.includes('未侦察')),false);await shot('map','天下地图与进行按钮');await city();await shot('city-menu','城市名称与一级命令');await click('map-object-close');await page.locator('.national-world [data-city="xuchang"] .map-city-banner').dblclick();await click('map-object-close');await shot('city-interior','近看城内建筑与施工');await page.locator('[data-scene-city="xuchang"] [data-city-building]').first().press('Enter');await shot('building-detail','建筑等级状态与负责人');
  await load();await city('junction:chenliu:xuchang');await shot('node-panel','地点归属、驻军与建筑入口');
  const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang'),army=fieldFromCity(s,home.id,{ids:home.units.filter(u=>!u.cityGuard&&u.id!==home.governor).slice(0,3).map(u=>u.id)});army.location='junction:chenliu:xuchang';
  await load(s,'己方军团驻守尉氏的信息卡片演示');await city(army.location);await click('map-object-close');await page.locator(`[data-campaign-army="${army.id}"]`).press('Enter');await shot('army-card','左键点选军团的信息卡片');await click('map-object-manage');await shot('army-menu','主动进入军团管理');
 },
 async extras(){
  await load();await city();await click('map-object-close');await page.locator('.national-world [data-city="xuchang"] .map-city-banner').dblclick();await click('map-object-close');await shot('city-interior','近看城内建筑与施工');await page.locator('[data-scene-city="xuchang"] [data-city-building]').first().press('Enter');await shot('building-detail','建筑等级状态与负责人');
  await load();await page.locator('.faction-navigation [data-action="faction-directory"][data-kind="officer"]').click();await shot('talent','人才工作与人员动态');
  const s=newCampaign(203,'guandu-200'),army=fieldFromCity(s,'xuchang');army.leader='yuanxia';await load(s,'实际军团长持有急行特性的演示');await page.locator('.faction-navigation [data-action="map-quick-open"][data-kind="army"]').click();await page.locator('[data-action="map-quick-select"][data-kind="army"]').first().click();await page.locator('.map-selection-card [data-action="map-object-manage"]').click();await shot('army-menu','军团管理与行军方式入口');await click('march-mode-open');await shot('march-mode','行军方式速度代价与确认');
  await groups.transportCycles();
  const scouts=newCampaign(203,'guandu-200');const id=scoutCandidates(scouts,'xuchang')[0].unit.id;assert.equal(dispatchScout(scouts,'xuchang',id,'chenliu'),null);for(let i=0;i<20&&!scouts.campaign.scouting.tasks[0].contacts.length;i++){scouts.campaign.day++;advanceScouting(scouts);updateVision(scouts);}await load(scouts,'沿真实道路取得侦察情报的演示');await click('scout-open');await page.locator('.scout-contact-list>summary').first().click();await shot('scout-contacts','任务收到的有日期情报');await click('scout-report');await shot('scout-report','侦察报告的观察日期与具体情报');
 },
 async defense(){
  const {s,c}=siegeMobilizationFixture({allAI:false});advanceCampaignStep(s);const r=activeBattles(s)[0];
  await load(s,'真实接敌的空城守备机制演示');await click('campaign-prepare');await shot('encounter','遭遇敌情与真实日期');await click('encounter-next');await shot('defense','无现役守军时选择整备方式');await click('encounter-next');await shot('encounter-control','选择亲自指挥或自动作战');assert.ok(await a('encounter-confirm').isDisabled());const before=await save();
  await click('campaign-defense-relinquish');await shot('defense-confirm','放弃守城前确认失城后果');await click('close');assert.deepEqual(await save(),before);await click('campaign-defense-relinquish');await click('campaign-confirm-action');assert.equal((await save()).cities.find(x=>x.id===c.id).owner,'yuan');await shot('defense-result','确认放弃后的实际城池归属');
  await load(s,'真实接敌的自动守备编制演示');await click('campaign-prepare');await click('encounter-next');await click('campaign-defense-auto');await shot('defense-auto','自动编制后返回军议');await click('encounter-next');await click('encounter-confirm');await shot('campaign-battle','普通模式进入真实战场');await click('show-council');await page.locator('.retreat-council>summary').click();await shot('retreat-node','普通模式撤离地点与人数设置','.retreat-council');
  await load(s,'真实接敌的手动守备编制演示');await click('campaign-prepare');await click('campaign-defense-prepare');await shot('defense-manual','围城临编沿用本城部队表单');
 },
 async battle(){
  const d=defaultCustomBattle();d.ownTeam=['cao','jia','liao','dun','yuanxia','chu','yu','person-255'].map(id=>({id,type:'spear',troops:3000,level:5}));d.ownTeamRoles={leader:'cao',advisor:'jia'};
  const s=generateBattle(d);await load(s,'独立战役八队布阵演示',true);await shot('battlefield','战前战场与双方部队');await click('show-council');await shot('council','军议设置与底部后备席');await page.locator('.council-appointments>summary').click();await shot('battle-appointments','按实际军团任命指挥','.council-appointments');await page.locator('.retreat-council>summary').click();await page.locator('[data-retreat-batch]').fill('600');await page.locator('[data-retreat-all]').check();await shot('retreat-settings','单队和批量自动撤离人数','.retreat-council');await click('retreat-batch-apply');await shot('battle-intent','开战前意图与重置阵型','#battle-intent');
  await page.locator('.council-unit').first().click();await click('reserve-entry-select');await shot('reserve-position','为真实后备选择入场位置');await page.keyboard.press('Escape');
  await portraitClick(0);await shot('battle-unit','部队实际属性与战法');await click('deployment-select');await page.locator('[data-deploy-x="0"][data-deploy-y="0"]').click();await shot('deployment-preview','站位修改先预览再确认');await click('deployment-cancel');
  const area=defaultCustomBattle();area.ownTeam=['person-246','person-668'].map(id=>({id,type:'spear',troops:3000,level:5}));area.enemyTeam=['shao','wen','yan'].map(id=>({id,type:'spear',troops:3000,level:5}));area.ownTeamRoles={leader:'person-246',advisor:'person-668'};const magic=generateBattle(area);lockDeployment(magic.battle);magic.battle.commandProgress=COMMAND_RESOURCE.capacity;
  await load(magic,'充能已满的范围军略机制演示',true);await click('choose-stratagem');await shot('stratagem-list','可用军略的来源充能与次数');await page.locator('[data-command="zhou-redcliffs"]').click();await portraitClick(1);await shot('stratagem-area','军略范围落点旋转与实际目标');await page.setViewportSize({width:844,height:390});await shot('stratagem-landscape','横屏范围军略与施放按钮');await page.setViewportSize({width:1440,height:900});await page.locator('[data-area-action="cancel"]').click();await click('choose-stratagem');assert.ok(await page.locator('[data-command="zhou-redcliffs"]').isEnabled());await page.locator('[data-command="zhou-redcliffs"]').click();await portraitClick(1);await page.locator('[data-area-action="confirm"]').click();await shot('stratagem-result','确认后执行军略并扣除资源');
  const waveDraft=defaultCustomBattle();waveDraft.ownTeam=['cao','jia','liao'].map(id=>({id,type:'spear',troops:3000,level:5}));waveDraft.ownTeamRoles={leader:'cao',advisor:'jia'};waveDraft.reinforcements=[{side:0,name:'支援军',tick:5,team:[{id:'person-255',type:'spear',troops:3000,level:5}],roles:{leader:'person-255',advisor:'person-255'}}];const wave=generateBattle(waveDraft);lockDeployment(wave.battle);for(let i=0;i<8&&!wave.battle.reinforcementCouncil;i++)stepBattle(wave.battle,{aiSides:[]});assert.equal(openReinforcementCouncil(wave.battle),null);await load(wave,'按真实到达时刻进入军议的援军演示',true);await click('show-council');await shot('reinforcement','援军已抵达进入军议');await page.locator('.council-appointments>summary').click();await shot('reinforcement-roles','援军与原军各自的合法指挥人选','.council-appointments');
 },
 async postbattle(){
  const s=newCampaign(1),approaching=fieldFromCity(s,'xuchang',{target:'guandu'});approachDestination(s,approaching,.1);fieldFromCity(s,'guandu',{target:'xuchang'});beginExecution(s);for(let i=0;i<30&&!activeBattles(s).length;i++)advanceCampaignDay(s);const r=activeBattles(s)[0];chooseEncounter(s,r.id,true);lockDeployment(r.battle);for(const u of r.battle.sides.flatMap(v=>v.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}const army=s.armies.find(a=>a.id===r.armyIds.find(id=>s.armies.find(a=>a.id===id)?.faction==='cao')),leader=r.battle.sides[0].units.find(u=>u.id===army.leader);Object.assign(leader,{x:0,y:0,retreatAt:leader.hp});advanceCampaignStep(s);for(const u of r.battle.sides[1].units){u.battleDamage+=u.hp;u.hp=0;u.status='defeated';}advanceCampaignStep(s);assert.ok(pendingArmyAppointments(s).length);
  await load(s,'控制伤亡以触发缺职的战后任命机制演示，非自然战果');await shot('postbattle-roles','战后军团缺职时暂停补任');await click('close');assert.ok(await a('postbattle-appointments-confirm').isVisible());const roles=recommendArmyAppointments(army);for(const role of ['leader','advisor']){const sel=page.locator(`[data-postbattle-appointment-role="${role}"][data-army-id="${army.id}"]`);if(!await sel.isDisabled())await sel.selectOption(roles[role]);}await click('postbattle-appointments-confirm');await click('campaign-battles');await shot('battle-history','战场战史与战报入口');await a('campaign-replay').first().click();await page.locator('#campaign-replay-frame').evaluate(el=>{el.value=el.max;el.dispatchEvent(new Event('input',{bubbles:true}));});assert.ok(r.report.woundedCapture.received>0);await page.locator('.battle-wounded-capture').scrollIntoViewIfNeeded();await shot('battle-report','实际伤亡、伤兵接收与任命变化');
 },
 async captive(){
  for(const ransom of [true,false]){const s=newCampaign(15);fundCities(s,100000);const home=s.cities.find(c=>c.id===(ransom?'xuchang':'guandu')),unit=home.units.find(u=>u.id!==home.governor)||home.units[0];let eventId;for(let i=0;i<10000;i++){const key='guide-capture:'+i,roll=fateRoll(s,key);if(officerLossResult(roll,ransom?'yuan':'cao')==='CAPTIVE'){eventId=key;break;}}assert.equal(resolveOfficerLoss(s,{unit,faction:ransom?'cao':'yuan',location:ransom?'guandu':'xuchang',enemy:ransom?'yuan':'cao',eventId}),'CAPTIVE');for(let i=0;i<300&&s.campaign.domestic.people.find(p=>p.id===unit.id)?.custody;i++)updateCaptives(s);await load(s,'固定合法被俘结果的'+(ransom?'赎回':'释放')+'机制演示');await info('officer',unit.id,'all');await shot(ransom?'captive':'prisoner',ransom?'己方被俘武将与赎金':'关押敌方武将与释放入口','[data-info-section="custody"]');const before=await save(),action=ransom?'personnel-ransom':'personnel-release';await click(action);await shot(ransom?'ransom-confirm':'release-confirm',ransom?'确认赎金与返城后果':'释放俘虏前确认对象与后果');await click('close');assert.deepEqual(await save(),before);assert.equal(await a('campaign-confirm-action').count(),0);assert.equal(await page.locator('#detail-source-root .info-directory').count(),1);await click(action);await click('campaign-confirm-action');assert.ok(!(await save()).campaign.domestic.people.some(p=>p.id===unit.id&&p.status==='CAPTIVE'));assert.equal(await a('campaign-confirm-action').count(),0);assert.equal(await page.locator('#detail-source-root .info-directory').count(),ransom?1:0);assert.equal(await page.locator('.info-directory').count(),1);await shot(ransom?'ransom-result':'release-result',ransom?'赎回后沿路返城':'释放后返回更新的名册');}
 },
 async system(){
  await load();await click('settings');await shot('settings','声音表现与存档设置');await click('save');await page.locator('#archive-name').waitFor();await shot('save-create','命名并新建手动存档');await page.locator('#archive-name').fill('官渡 · 流程演示');await click('archive-create');await page.locator('.archive-card h3').filter({hasText:'官渡 · 流程演示'}).waitFor();await shot('saves','自动档手动档与读取');await a('archive-overwrite').first().click();await shot('save-overwrite','覆盖指定存档前核对名称');await click('archive-cancel');await a('archive-delete').first().click();await shot('save-delete','删除存档前确认');await click('archive-cancel');await click('close');await click('settings');await shot('save-transfer','导入导出当前进度','[data-action="export"]');const download=page.waitForEvent('download');await click('export');await(await download).saveAs('outputs/action-guide/export.json');await page.locator('#import-file').setInputFiles('outputs/action-guide/export.json');await dismiss();await page.keyboard.press('F1');await shot('guide','按需查看当前页面指引');await page.keyboard.press('Escape');
  await load(endingCampaign('victory'),'控制最终归属后实际结算的结局页面演示，非自然统一');await shot('ending','整局结果与地图回看');
 },
 async army(){
  const s=newCampaign(33,'guandu-200'),army=fieldFromCity(s,'xuchang');army.units.forEach(u=>u.troops=100);
  await load(s,'已动员军团的整军演示存档');await military('adjust');await shot('army-adjust','调整军团编制');await click('military-next');await shot('army-roles','整军中的指挥任命');await click('military-next');await shot('army-review','整军前后变化与费用');await click('military-cancel');
  await click('army');await page.locator('[data-action="military-purpose"][data-kind="split"]').click();await page.locator('[data-military-unit]').first().check();await shot('army-split','选择拆出的部队');await click('military-next');await click('military-next');await click('military-next');await shot('army-split-review','新旧两军核阅');await click('military-confirm');await dismiss();
  await click('army');await page.locator('[data-action="military-purpose"][data-kind="merge"]').click();await page.locator('[data-military-target]').first().check();await shot('army-merge','选择同地合并军团');await click('military-next');await shot('army-merge-review','合并军团核阅');await click('military-confirm');await dismiss();
  await click('recruit');await page.locator('[data-military-unit]').first().check();await shot('army-recruit','选择需要补兵的队伍');await click('military-next');await shot('army-recruit-review','补兵结果与真实用度');await click('military-cancel');
  await click('campaign-order');await chooseCommandTarget(page,'chenliu');await shot('march-route','军团调动与返城选路');await click('campaign-command-next');await shot('march-review','行军命令最终核阅');await click('campaign-command-cancel');
  if(await a('march-mode-open').filter({visible:true}).count()){await click('march-mode-open');await shot('march-mode','行军方式选择与确认');}
 },
 async treasures(){
  const t=newCampaign(7);for(const id of ['brightArmor','artOfWar'])Object.assign(treasureRecord(t,id),{state:'treasury',cityId:null,factionId:'cao',holderId:null});await load(t,'三分类装备与势力国库的隔离演示');await click('treasure-open');await shot('treasures','武器、坐骑、其它和势力国库');await page.locator('[data-action="treasure-select"][data-id="brightArmor"]').click();await page.locator('#treasure-recipient').click();await shot('treasure-recipients','宝物接收武将表');
  const receiver=t.cities.find(c=>c.id==='chenliu').units[0].id;await page.locator('[data-assignment-choice="'+receiver+'"]').check();await click('assignment-picker-confirm');await shot('treasure-grant','授予后直接装备；仅替换同类');await click('treasure-confirm');await shot('treasure-equipped','装备与收回势力国库入口');await page.locator('[data-action="treasure-store"][data-id="brightArmor"]').click();await shot('treasure-returned','原物收回势力国库');await click('close');await page.locator('[data-action="map-quick-open"][data-kind="city"]').first().click();await page.locator('[data-action="map-quick-select"][data-id="xuchang"]').click();await page.locator('[data-action="map-city-commands"][data-group="personnel"]').click();await page.locator('.city-command-grid [data-action="campaign-city-personnel"]').click();await page.locator('#modal-panel-root [data-action="campaign-person-detail"][data-officer="cao"]').click();await shot('treasure-slots','武器坐骑其它三栏同时装备','.unit-treasure');
 },
 async diplomacyRelations(){
  const d=newCampaign(281,'guandu-200'),o=diplomaticOfficerCandidates(d,'cao','commerce')[0];assert.ok(assignDiplomat(d,o.unit.id,'commerce',{choice:'now'}).applied);await load(d,'已实际委任外交负责人的操作演示');await click('faction-diplomacy');await page.locator('.diplomatic-staff>summary').click();await shot('diplomat-assigned','已委任使臣与召回入口','[data-action="diplomacy-dismiss"]');
  const s=newCampaign(15,'guandu-200');fundCities(s,100000);for(const [from,to]of [['cao','yuan'],['yuan','cao']]){const prison=s.cities.find(c=>c.owner===to&&c.units.length).id,unit=s.cities.filter(c=>c.owner===from).flatMap(c=>c.units).find(u=>!['cao','shao'].includes(u.id));let eventId;for(let i=0;i<10000;i++){const key='guide-swap:'+from+':'+i,v=fateRoll(s,key);if(officerLossResult(v,to)==='CAPTIVE'){eventId=key;break;}}assert.equal(resolveOfficerLoss(s,{unit,faction:from,enemy:to,location:prison,eventId}),'CAPTIVE');}const {p}=proposeDiplomatic(s,{goal:'prisoners',direction:'negotiation',other:'yuan'});untilDiplomatic(s,()=>p.status==='pending');await load(s,'双方固定合法被俘人员，经真实谈判形成的交换方案演示');await click('faction-diplomacy');await shot('prisoner-exchange','外交交换俘虏的双方名单与批准');
 },
 async diplomacy(){
  const s=newCampaign(281,'guandu-200');await load(s);await click('faction-diplomacy');await shot('diplomacy','外交待处理与目标方针');await page.locator('.diplomatic-staff>summary').click();const o=diplomaticOfficerCandidates(s,'cao','commerce')[0];await page.locator('#diplomacy-city-commerce-button').click();await shot('diplomacy-cities','外交派出城市表');await page.locator('[data-assignment-choice="'+o.location+'"]').check();await click('assignment-picker-confirm');await page.locator('#diplomacy-officer-commerce-button').click();await shot('diplomacy-officers','外交执行人表');await page.locator('[data-assignment-choice="'+o.unit.id+'"]').check();await click('assignment-picker-confirm');await shot('diplomacy-appoint','先选出发城市再选使臣');await page.locator('.diplomatic-budget-settings>summary').click();await shot('diplomacy-budget','外交预算与保存','[data-action="diplomacy-budget"]');
  const pending=newCampaign(281,'guandu-200');fundCities(pending,9000);lordCity(pending,'cao').grain=2000;pending.grain=Math.floor(pending.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));const {p}=proposeDiplomatic(pending,{goal:'buyGrain',direction:'commerce'});untilDiplomatic(pending,()=>p.status==='pending');await load(pending,'实际谈判至待批准的购粮演示存档');await click('faction-diplomacy');await shot('diplomacy-proposal','双方给予内容与批准交涉否决');await page.locator(`[data-diplomatic-proposal="${p.id}"] .diplomatic-clause-details summary`).click();await shot('diplomacy-terms','完整条款与实际履约条件');await page.locator('[data-diplomatic-proposal="'+p.id+'"] [data-action="diplomacy-approve"]').click();const signed=await save(),final=signed.campaign.diplomacy.proposals.find(q=>q.id===p.id);assert.equal(final.approvals.cao.version,final.version);
  untilDiplomatic(signed,()=>final.status!=='pending');assert.equal(final.status,'signed');await load(signed,'玩家批准后按共同外交日结实际签署与履约的演示，不提前交付物资');await click('faction-diplomacy');await page.locator('.diplomatic-contracts>summary').click();await page.locator(`[data-diplomatic-proposal="${p.id}"] .diplomatic-clause-details>summary`).click();await shot('diplomacy-approved','实际批准后签署与履约',`[data-diplomatic-proposal="${p.id}"]`);
  const t=newCampaign(7);for(const id of ['brightArmor','artOfWar'])Object.assign(treasureRecord(t,id),{state:'treasury',cityId:null,factionId:'cao',holderId:null});await load(t,'有两件真实登记宝物的演示存档');await click('treasure-open');await shot('treasures','势力国库与已授予宝物');await page.locator('[data-action="treasure-select"][data-id="brightArmor"]').click();const receiver=t.cities.find(c=>c.id==='chenliu').units[0].id;await chooseAssignment(page,'#treasure-recipient',receiver);await shot('treasure-grant','立即授予并装备');await click('treasure-confirm');await shot('treasure-equipped','已装备宝物与收回国库入口');
 },
 async technology(){
  const s=newCampaign(1),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,100000);c.domestic.techs=['militaryRegistry'];
  const u=s.campaign.idle.find(o=>o.location===c.id).unit;assert.equal(assignDomestic(s,c.id,'technology',u.id),null);
  await load(s,'已委任一名技术负责人，查看进阶科技真实设施与人员条件的隔离演示');
  await page.locator('.faction-navigation [data-kind="city"]').click();await page.locator('.city-directory-item[data-id="xuchang"]').click();if(await a('map-object-close').isVisible())await click('map-object-close');await page.locator('[data-action="map-quick-manage"][data-id="xuchang"]').click();
  await page.locator('[data-city-disclosure="xuchang:technology"]>summary').click();
  const node=page.locator('[data-technology="militarySupply"]');await node.locator('summary').click();
  assert.match(await node.innerText(),/本城技术负责人≥2人（当前1人）/);assert.match(await node.innerText(),/降低25%/);
  await shot('technology-details','进阶科技的效果、复合设施及真实人员条件','[data-technology="militarySupply"]');
  await page.setViewportSize({width:390,height:844});await shot('technology-details-mobile','手机查看进阶科技效果与缺少条件','[data-technology="militarySupply"]');
 },
 async bandits(){
  const b=newCampaign(521200,'guandu-200'),camp=b.campaign.bandits.camps.find(c=>c.nodeId==='junction:chenliu:xuchang');
  assert.equal(dispatchScout(b,'xuchang',scoutCandidates(b,'xuchang')[0].unit.id,camp.nodeId),null);advanceScouting(b);updateVision(b);
  assert.ok(b.campaign.bandits.observations.cao?.[camp.id]);await load(b,'斥候实际执行后发现贼寨的隔离演示存档');
  await page.locator(`[data-action="bandit-open"][data-camp="${camp.id}"]`).press('Enter');
  await page.locator('.modal-body [data-art-portrait] img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
  await shot('bandit','贼寨情报、随机武将通用头像与选择派出城');
  await page.locator(`[data-bandit-target="${camp.nodeId}"][data-town="xuchang"]`).click();await shot('bandit-expedition','讨伐沿用出征选队流程');
 },
 async proposals(){
  const s=newCampaign(7);fundCities(s,40000);const c=s.cities.find(c=>c.id==='xuchang'),people=s.campaign.idle.filter(o=>o.location===c.id);for(const [key,def]of Object.entries(ACTIONS))if(['technology','commerce'].includes(def.direction)&&!['research','build_commerce'].includes(key))c.domestic.cooldowns[key]=10000;assignDomestic(s,c.id,'technology',people[0].unit.id);assignDomestic(s,c.id,'commerce',people[1].unit.id);
  c.budget.goldReserve=c.gold;await load(s,'本城付费事务与明确保留预算冲突的机制演示');await click('campaign-begin');await page.locator('.domestic-alert-list,.domestic-proposal').first().waitFor();await dismiss();await page.locator('.domestic-proposal').first().waitFor();await shot('proposals','资源冲突、人员、费用与耗时');await page.setViewportSize({width:844,height:390});await shot('proposals-landscape','横屏资源冲突操作');await page.setViewportSize({width:1440,height:900});
  await page.locator('.domestic-proposal [data-action="campaign-info-detail"]').first().click();await page.locator('[data-city-budget-key="goldReserve"]').fill('0');await click('city-budget-save');await page.locator('#modal-panel-root [data-action="close"]').last().click();await page.locator('.domestic-proposal').first().waitFor();await click('domestic-proposal-approve-page');await shot('proposals-approved','调整预算后按原案开办');await click('close');await click('faction-domestic');await shot('affairs','人员事务费用时间与城市审批');await page.locator('[data-action="domestic-governor-approval"][data-city="xuchang"]').click();await shot('proposals-policy','按城委托太守审批');
  await groups.bandits();
 },
 async officerEditor(){
  await load(null,'武将编辑与自建人物的隔离演示');await click('officer-editor');
  const edit=x=>page.locator(`[data-officer-edit-action="${x}"]`),field=x=>page.locator(`[data-officer-edit-field="${x}"]`);
  await page.locator('[data-officer-search]').fill('曹操');await edit('load').click();await shot('officer-editor','武将查找、五项能力与人物资料');
  await edit('new').click();await field('name').fill('云台将军');await field('courtesy').fill('子衡');await field('force').fill('88');await field('charm').fill('93');await field('aptitude:spear').selectOption('3');await edit('save').click();await page.waitForFunction(()=>document.querySelector('[data-officer-save-status]')?.textContent==='已保存');await page.locator('[data-officer-filter]').selectOption('custom');await page.locator('[data-officer-search]').fill('');await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));await shot('officer-editor-custom','自建武将保存与导入导出');
  await page.setViewportSize({width:844,height:390});await shot('officer-editor-landscape','武将编辑器手机横屏');
 },
 async observer(){
  await load(null,'全 AI 观战的真实开局与切换观察势力演示');await click('strategy');await page.locator('[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();await page.locator('button[data-action="select-national-faction"][data-faction="cao"]').click();await click('national-control');
  assert.equal(await a('national-control').innerText(),'全 AI 观战');await shot('observer-faction','选定剧本后将玩家执掌切换为全 AI 观战');await click('launch-national');await page.locator('.national-world').waitFor();const before=await save();assert.equal(before.campaign.allAI,true);
  await click('observer-next');const after=await save();assert.equal(after.campaign.allAI,true);assert.notEqual(after.campaign.playerFaction,before.campaign.playerFaction);assert.equal(after.campaign.day,before.campaign.day);await shot('observer-map','全 AI 观战中切换观察势力');
 },
 async setup(){
  await load(null,'开局与编辑器空白浏览器');await shot('lobby','游戏主菜单');await click('strategy');await shot('scenarios','普通模式剧本');await page.locator('[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();await page.locator('button[data-action="select-national-faction"][data-faction="cao"]').click();await shot('faction','势力选择与开始');
  await load(null,'独立战役编辑演示');await click('campaign-lobby');await shot('custom','历史模板与自定义战役');await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();await shot('custom-army','自定义战役单军编制');await click('scenario-setup-cancel');await click('launch-custom');await shot('custom-review','自定义战役开战前核阅');await click('close');await click('battle-map-editor');await shot('map-editor','地图分类地形绘制与工具');await page.locator('[data-map-editor-field="name"]').fill('流程演示地图');await page.locator('[data-ground="forest"]').click();await page.locator('[data-map-cell="6:3"]').click();await page.locator('[data-map-editor-action="save"]').click();await page.waitForFunction(()=>document.querySelector('[data-map-save-status]')?.textContent==='已保存');await shot('map-library','已保存地图与导入导出');await page.locator('[data-map-editor-action="preview"]').click();await shot('map-preview','真实战场地图预览');
 },
 async civic(){
  const s=await load();await shot('map','天下地图与进行按钮');await city();await shot('city-menu','城市一级命令');
  await click('city-domestic');await shot('domestic','城市委任的六个方向与岗位');await a('domestic-direction-open').first().click();await shot('direction','方向岗位与当前负责人');await a('campaign-pick').filter({visible:true}).first().click();await shot('appointment','按能力与特性选择内政负责人');
  const choice=page.locator('[data-personnel-choice]:not(:disabled)').first();await choice.check();await shot('appointment-selected','选择后直接确认任命');await click('campaign-pick-confirm');await dismiss();
  await load();await command('governor');await page.locator('[data-personnel-choice]:not(:disabled)').first().check();await shot('governor','太守人选与确认');await click('campaign-command-cancel');
  await info('city','xuchang');await page.locator('[data-action="campaign-info-page"][data-page="收支预算"]').click();await shot('budget','城市钱粮预算');
  const original=await save(),gold=page.locator('[data-city-budget-key="goldReserve"]');await gold.fill('900');await gold.press('Tab');assert.deepEqual(await save(),original);await shot('budget-draft','保留金粮修改后显示未保存','[data-action="city-budget-save"]');
  const grain=page.locator('[data-city-budget-key="grainReserve"]');await grain.fill('1.5');await click('city-budget-save');assert.deepEqual(await save(),original);await grain.fill(String(original.cities.find(c=>c.id==='xuchang').budget.grainReserve));await click('city-budget-save');assert.equal((await save()).cities.find(c=>c.id==='xuchang').budget.goldReserve,900);await shot('budget-saved','点击保存预算后统一生效','[data-action="city-budget-save"]');
  await load();await click('faction-domestic');await shot('affairs','全势力优先级与补齐委任');await groups.personnel();
  await load();await page.locator('.faction-navigation [data-action="map-quick-open"][data-kind="city"]').click();await shot('city-directory','自辖城市与空闲人员');await load();await click('journal');await shot('journal','按类别查阅日志');
 },
 async assignment(){
  const s=newCampaign(7);for(const o of treasureOfficerRows(s))if(o.unit.treasureId==='brightArmor')delete o.unit.treasureId;Object.assign(treasureRecord(s,'brightArmor'),{state:'treasury',cityId:null,factionId:'cao',holderId:null});
  await load(s,'宝物授予表格选择');await click('treasure-open');await shot('treasures','势力国库与已授予宝物');await page.locator('[data-action="treasure-select"][data-id="brightArmor"]').click();await page.locator('#treasure-recipient').click();await shot('treasure-recipients','宝物接收武将表');
  const receiver=s.cities.find(c=>c.id==='chenliu').units[0].id;await page.locator('[data-assignment-choice="'+receiver+'"]').check();await click('assignment-picker-confirm');await shot('treasure-grant','立即授予并装备');await click('treasure-confirm');await shot('treasure-equipped','已装备宝物与收回国库入口');
 },
 async logistics(){
  const s=await load();await click('scout-open');await shot('scout-source','侦察先确定派出城市');await page.locator('#scout-city').click();await shot('scout-cities','侦察派出城市表');await page.locator('[data-assignment-choice="town-8"]').check();await click('assignment-picker-confirm');await page.locator('#scout-officer').click();await shot('scout-officers','侦察执行人表');await page.locator('[data-assignment-choice="'+scoutCandidates(s,'town-8')[0].unit.id+'"]').check();await click('assignment-picker-confirm');await chooseAssignment(page,'#scout-target','town-5');await shot('scout-route','侦察终点路线及视野期限');await page.setViewportSize({width:844,height:390});await shot('scout-landscape','手机横屏侦察与固定派遣按钮');await page.setViewportSize({width:1440,height:900});await click('scout-dispatch');await shot('scout-running','侦察任务与停止入口');
  const transport=newCampaign(203,'guandu-200'),carrier=treasureOfficerRows(transport).find(o=>o.unit.id==='person-195');assert.ok(carrier);await load(transport);await command('transfer',carrier.location);await page.locator('[data-personnel-choice="person-195"]').check();await shot('transfer-person','调任选择来源城执行人');await click('campaign-command-next');await chooseCommandTarget(page,'chenliu');await shot('transfer-empty','人员调任终点与物资');await page.locator('[data-transfer-cargo="grain"]').fill('47');await page.locator('[data-transfer-cargo="gold"]').fill('23');await shot('transport','运输物资与真实预计抵达');await page.locator('.transport-options summary').click();await shot('transport-options','接力运输选项');await chooseMapTarget(page,'[data-action="map-target-open"][data-kind="relay"]',carrier.location==='xuchang'?'luoyang':'xuchang');await shot('transport-relay','地图选择接力城后的预览');await click('campaign-command-next');await shot('transport-review','运输核阅与最终下令');await page.setViewportSize({width:844,height:390});await click('campaign-command-back');await shot('transport-landscape','横屏运输参数与常驻摘要');
 },
 async timing(){
  const busy=busyFixture();await load(busy.s,'有实际在办工程的演示存档');await city();await click('city-domestic');await page.locator('[data-action="domestic-direction-open"][data-direction="commerce"]').click();await a('campaign-pick').filter({visible:true}).first().click();await page.locator(`[data-personnel-choice="${busy.id}"]`).check();await click('campaign-pick-confirm');await shot('timing','冲突事务的立即或完成后执行');await page.locator('[data-action="campaign-order-choice"][data-choice="after"]').click();await shot('waiting','完成后执行的等待安排');
 },
 async formation(){
  await load();await command('draft');await shot('troop-list','城内部队管理与新增解散');await click('campaign-unit-new');await click('campaign-unit-choose');await shot('troop-officer','单队编制内选择主将');await page.setViewportSize({width:844,height:390});await shot('troop-officer-landscape','横屏比较主将能力适性任职与事务');await page.setViewportSize({width:1440,height:900});await page.locator('[data-personnel-choice]:not(:disabled)').first().click();await shot('troop-edit','兵种兵力与装备配置');await click('campaign-command-next');await shot('troop-configured','单队确认后返回部队列表');await click('campaign-command-next');await shot('troop-review','城内编制最终核阅');
  await load();await command('expedition');await page.locator('[data-command-army-unit]:not(:disabled)').first().check();await page.locator('[data-command-army-unit]:not(:disabled)').nth(1).check();await shot('expedition-select','出征选队与已选移除');await page.setViewportSize({width:844,height:390});await shot('expedition-landscape','横屏选队与对照');await page.setViewportSize({width:1440,height:900});await click('campaign-command-next');await shot('expedition-roles','军团长与军师任命');await click('campaign-command-next');await chooseCommandTarget(page,'chenliu');await shot('expedition-route','出征目标与路线预览');await click('campaign-command-next');await shot('expedition-review','出征最终费用与路线核阅');
 },
};

try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('server '+c)));});browser=await chromium.launch({channel:'msedge',headless:true});
 assert.ok(groups[group],'Unknown capture group '+group);await groups[group]();assert.deepEqual(errors,[]);console.log('PASS capture group '+group);
}catch(error){if(errors.length)console.error('Browser errors:',errors);if(page&&!page.isClosed()){await page.screenshot({path:`outputs/action-guide/${group}-failure.png`});await writeFile(`outputs/action-guide/${group}-failure.txt`,(await page.locator('body').innerText()).slice(0,16000));}throw error;}
finally{await context?.close();await browser?.close();server.kill();}
