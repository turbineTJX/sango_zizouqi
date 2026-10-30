// Real UI captures for the maintained action guide. Isolated browser contexts
// and labelled demonstration saves never touch a player's browser profile.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,validateCampaign} from '../strategic-campaign.mjs';
import {assignDomestic,ACTIONS,setDomesticAutoApprove} from '../domestic.mjs';
import {scoutCandidates,scoutTargets,dispatchScout,advanceScouting} from '../scouting.mjs';
import {updateVision} from '../strategic-vision.mjs';
import {COMMAND_RESOURCE} from '../engine.mjs';
import {pendingActivityReports,acknowledgeActivityReports} from '../activity-nodes.mjs';
import {chooseCommandTarget,chooseMapTarget} from './map-target-ui-helpers.mjs';
import {fieldFromCity,approachDestination} from '../tests/helpers/field-campaign.mjs';
import {busyFixture} from '../tests/helpers/domestic-orders.mjs';
import {siegeMobilizationFixture} from '../tests/helpers/siege-mobilization.mjs';
import {treasureRecord} from '../treasures.mjs';
import {lordCity,diplomaticOfficerCandidates,assignDiplomat} from '../diplomacy.mjs';
import {proposeDiplomatic,untilDiplomatic} from '../tests/helpers/diplomacy-campaign.mjs';
import {fundCities} from '../tests/resource-fixtures.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,settleBattle,openReinforcementCouncil,validateSave} from '../engine.mjs';
import {resolveOfficerLoss,fateRoll,updateCaptives,ransomCost} from '../officer-fates.mjs';
import {endingCampaign} from '../tests/helpers/ending-campaign.mjs';
import {pendingArmyAppointments} from '../postbattle-appointments.mjs';
import {recommendArmyAppointments} from '../army-appointments.mjs';

const group=process.argv[2]||'civic',port=4383,origin=`http://127.0.0.1:${port}`,out='docs/images/player-actions';
await mkdir(out,{recursive:true});await mkdir('outputs/action-guide',{recursive:true});
const manifestPath=`${out}/captures.json`,manifest=JSON.parse(await readFile(manifestPath,'utf8').catch(()=>'{}'));
const files=['app.js','military-flow.mjs','city-budget.mjs','page-guides.mjs','strategic-command.mjs','battle-council.mjs','strategic.css'];
const hash=createHash('sha256');for(const f of files)hash.update(f).update(await readFile(f));const sourceHash=hash.digest('hex');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'on'},windowsHide:true,stdio:'pipe'});
let browser,page,context,sample='',errors=[];
const a=id=>page.locator(`[data-action="${id}"]`);
const click=async id=>{const modal=page.locator('#overlay-root [data-action="'+id+'"]').filter({visible:true});await (await modal.count()?modal.first():a(id).filter({visible:true}).first()).click();};
const save=()=>page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')));
async function dismiss(){for(let i=0;i<4;i++){if(await page.getByRole('heading',{name:'战略奏报',exact:true}).isVisible())await page.locator('.modal-header [data-action="close"]').last().click();else break;}}
async function load(s=newCampaign(203,'guandu-200'),label='官渡剧本演示开局',battle=false,keepReports=false){
 await context?.close();sample=label;context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',acceptDownloads:true});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 if(s?.campaign&&!keepReports)acknowledgeActivityReports(s,pendingActivityReports(s).map(n=>n.id));
 const key=battle?'sango-historical-battle-v1':'sango-sovereign-v2',raw=s?(s.campaign?serializeCampaign(s):JSON.stringify(s)):null;
 await context.addInitScript(({raw,key})=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-audio-v1',JSON.stringify({muted:true}));if(raw&&!sessionStorage.getItem('action-guide-seeded')){localStorage.setItem(key,raw);sessionStorage.setItem('action-guide-seeded','1');}},{raw,key});
 await page.goto(origin+(s?battle?'/#historical-battle':'/#strategy':'/'));await page.locator(s?battle?'.arena-stage,[data-action="retry-scenario"]':'.national-world,.strategy-world,.campaign-ending':'[data-action="strategy"]').first().waitFor();if(!keepReports)await dismiss();return s;
}
async function shot(id,title,selector=null){
 if(selector)await page.locator(selector).first().scrollIntoViewIfNeeded();
 await page.evaluate(()=>document.fonts.ready);await page.mouse.move(2,2);await page.waitForTimeout(250);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'horizontal page overflow: '+id);
 await page.screenshot({path:`${out}/${id}.webp`,type:'webp',quality:88,animations:'disabled'});
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
async function military(kind){await page.locator('.faction-navigation [data-action="map-quick-open"][data-kind="army"]').click();await page.locator('[data-action="map-quick-select"][data-kind="army"]').first().click();await page.locator('[data-action="map-quick-manage"][data-kind="army"]').click();await click('army');await page.locator(`[data-action="military-purpose"][data-kind="${kind}"]`).click();}

const groups={
 async configuration(){
  await load();await click('campaign-info');await page.locator('[data-action="info-menu-scope"][data-scope="all"]').click();await shot('intelligence-menu','按势力范围和对象类别查询');await page.locator('[data-action="info-menu-list"][data-kind="city"]').click();await shot('intelligence-directory','据点当前视野与带日期情报');
  await load(null,'自定义战役配置演示');await click('campaign-lobby');await page.locator('.custom-battle').evaluate(el=>el.scrollIntoView({block:'start'}));await shot('custom-editor','自定义战役的地图场景与军团入口');await click('custom-reinforcement-add');await shot('custom-reinforcements','援军的阵营到达条件与军团编制','.custom-reinforcements');
 },
 async disband(){
  await load();await command('draft');await a('campaign-unit-disband').first().click();await shot('troop-disband','待解散部队与实际返还兵员');await click('campaign-command-next');await shot('troop-disband-review','解散军令最终核阅');
 },
 async refinements(){
  const s=newCampaign(203,'guandu-200'),worker=s.campaign.idle.find(o=>o.location==='xuchang');assert.equal(assignDomestic(s,'xuchang','commerce',worker.unit.id),null);await load(s,'已实际委任负责人的操作演示');await city();await click('city-domestic');await page.locator('[data-action="domestic-direction-open"][data-direction="commerce"]').click();await shot('direction-assigned','现任负责人及解除入口');
  await load();await command('governor');await page.locator('[data-personnel-choice]:not(:disabled)').first().check();await click('campaign-pick-confirm');await page.locator('.faction-navigation [data-action="map-quick-open"][data-kind="city"]').click();await page.locator('[data-action="map-quick-select"][data-kind="city"][data-id="xuchang"]').click();await page.locator('[data-action="map-quick-manage"][data-kind="city"]').click();await page.locator('.city-affairs[data-city-disclosure="xuchang:offices"]>summary').click();await shot('governor-assigned','现任太守与解除任命','[data-action="campaign-clear-governor"]');
  const d=newCampaign(281,'guandu-200'),o=diplomaticOfficerCandidates(d,'cao','commerce')[0];assert.ok(assignDiplomat(d,o.unit.id,'commerce',{choice:'now'}).applied);await load(d,'已实际委任外交负责人的操作演示');await click('faction-diplomacy');await page.locator('.diplomatic-staff>summary').click();await shot('diplomat-assigned','已委任使臣与召回入口','[data-action="diplomacy-dismiss"]');
  const b=generateBattle(defaultCustomBattle());lockDeployment(b.battle);b.battle.commandProgress=COMMAND_RESOURCE.capacity;await load(b,'充能已满的全军军略机制演示',true);await click('choose-stratagem');await shot('stratagem-army','无需选点的全军军略与基础撤退军令');await page.locator('[data-command="cao-wuchao"]').click();await shot('stratagem-army-result','全军型军略点击后直接生效');
  await load(null,'独立战役单军编组操作演示');await click('campaign-lobby');await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();await click('scenario-setup-next');await shot('custom-select','从编好的部队中选队');await click('scenario-setup-next');await shot('custom-roles','独立战役军团任命');await click('scenario-setup-next');await shot('custom-army-review','单军编组核阅确认');
 },
 async reports(){
  const {s}=busyFixture();await load(s,'实际内政逐日推进形成的旬报演示',false,true);await shot('reports','战略奏报与查看事项');await dismiss();await page.locator('.harvest-strip>summary').click();await shot('harvest','旬收获与城仓净变化','.harvest-strip');
  const b=generateBattle(defaultCustomBattle());lockDeployment(b.battle);for(let i=0;i<3000&&!b.battle.result;i++)stepBattle(b.battle,{aiSides:[0,1]});assert.ok(b.battle.result);settleBattle(b);await load(b,'默认独立战役经共同战斗处理器完整结算的演示',true);await shot('standalone-report','独立战役结果与重试选项');
 },
 async prisonerExchange(){
  const s=newCampaign(15,'guandu-200');fundCities(s,100000);for(const [from,to]of [['cao','yuan'],['yuan','cao']]){const prison=s.cities.find(c=>c.owner===to&&c.units.length).id,unit=s.cities.filter(c=>c.owner===from).flatMap(c=>c.units).find(u=>!['cao','shao'].includes(u.id));let eventId;for(let i=0;i<10000;i++){const key='guide-swap:'+from+':'+i,v=fateRoll(s,key);if(v>=.02&&v<.35){eventId=key;break;}}assert.equal(resolveOfficerLoss(s,{unit,faction:from,enemy:to,location:prison,eventId}),'CAPTIVE');}const {p}=proposeDiplomatic(s,{goal:'prisoners',direction:'negotiation',other:'yuan'});untilDiplomatic(s,()=>p.status==='pending');await load(s,'双方固定合法被俘人员，经真实谈判形成的交换方案演示');await click('faction-diplomacy');await shot('prisoner-exchange','外交交换俘虏的双方名单与批准');
 },
 async extras(){
  await load();await city();await click('map-city-inspect');await shot('city-interior','近看城内建筑与施工');await page.locator('[data-scene-city="xuchang"] [data-city-building]').first().press('Enter');await shot('building-detail','建筑等级状态与负责人');
  await load();await page.locator('.faction-navigation [data-action="faction-directory"][data-kind="officer"]').click();await shot('talent','人才工作与人员动态');
  const s=newCampaign(203,'guandu-200'),army=fieldFromCity(s,'xuchang');army.leader='yuanxia';await load(s,'实际军团长持有急行特性的演示');await page.locator('.faction-navigation [data-action="map-quick-open"][data-kind="army"]').click();await page.locator('[data-action="map-quick-select"][data-kind="army"]').first().click();await page.locator('[data-action="map-quick-manage"][data-kind="army"]').click();await shot('army-menu','军团管理与行军方式入口');await click('march-mode-open');await shot('march-mode','行军方式速度代价与确认');
  await load();await command('transfer','luoyang');await page.locator('[data-personnel-choice="person-195"]').check();await click('campaign-command-next');await chooseCommandTarget(page,'chenliu');await page.locator('[data-transfer-cargo="grain"]').fill('47');await page.locator('.transport-options summary').click();await page.locator('[data-transfer-cycles]').selectOption('3');await shot('transport-cycles','具备往返运粮特性时选择批次');
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
  const s=generateBattle(d);await load(s,'独立战役八队布阵演示',true);await shot('battlefield','战前战场与双方部队');await click('show-council');await shot('council','首发后备与出阵顺序');await page.locator('.council-appointments>summary').click();await shot('battle-appointments','按实际军团任命指挥','.council-appointments');await page.locator('.retreat-council>summary').click();await page.locator('[data-retreat-batch]').fill('600');await page.locator('[data-retreat-all]').check();await shot('retreat-settings','单队和批量自动撤离人数','.retreat-council');await click('retreat-batch-apply');await shot('battle-intent','开战前意图与重置阵型','#battle-intent');
  await a('reserve-entry-select').first().click();await shot('reserve-position','为真实后备选择入场位置');await page.keyboard.press('Escape');
  await page.locator('.unit-nameplate.side-0[data-inspect]').first().click();await shot('battle-unit','部队实际属性与战法');await click('deployment-select');await page.locator('[data-deploy-x="0"][data-deploy-y="0"]').click();await shot('deployment-preview','站位修改先预览再确认');await click('deployment-cancel');
  const area=defaultCustomBattle();area.ownTeam=['person-246','person-668'].map(id=>({id,type:'spear',troops:3000,level:5}));area.enemyTeam=['shao','wen','yan'].map(id=>({id,type:'spear',troops:3000,level:5}));area.ownTeamRoles={leader:'person-246',advisor:'person-668'};const magic=generateBattle(area);lockDeployment(magic.battle);magic.battle.commandProgress=COMMAND_RESOURCE.capacity;
  await load(magic,'充能已满的范围军略机制演示',true);await click('choose-stratagem');await shot('stratagem-list','可用军略的来源充能与次数');await page.locator('[data-command="zhou-redcliffs"]').click();await page.locator('.unit-nameplate.side-1[data-inspect]').first().click();await shot('stratagem-area','军略范围落点旋转与实际目标');await page.setViewportSize({width:844,height:390});await shot('stratagem-landscape','横屏范围军略与施放按钮');await page.setViewportSize({width:1440,height:900});await page.locator('[data-area-action="cancel"]').click();await click('choose-stratagem');assert.ok(await page.locator('[data-command="zhou-redcliffs"]').isEnabled());await page.locator('[data-command="zhou-redcliffs"]').click();await page.locator('.unit-nameplate.side-1[data-inspect]').first().click();await page.locator('[data-area-action="confirm"]').click();await shot('stratagem-result','确认后执行军略并扣除资源');
  const waveDraft=defaultCustomBattle();waveDraft.ownTeam=['cao','jia','liao'].map(id=>({id,type:'spear',troops:3000,level:5}));waveDraft.ownTeamRoles={leader:'cao',advisor:'jia'};waveDraft.reinforcements=[{side:0,name:'支援军',tick:5,team:[{id:'person-255',type:'spear',troops:3000,level:5}],roles:{leader:'person-255',advisor:'person-255'}}];const wave=generateBattle(waveDraft);lockDeployment(wave.battle);for(let i=0;i<8&&!wave.battle.reinforcementCouncil;i++)stepBattle(wave.battle,{aiSides:[]});assert.equal(openReinforcementCouncil(wave.battle),null);await load(wave,'按真实到达时刻进入军议的援军演示',true);await click('show-council');await shot('reinforcement','援军已抵达进入军议');await page.locator('.council-appointments>summary').click();await shot('reinforcement-roles','援军与原军各自的合法指挥人选','.council-appointments');
 },
 async postbattle(){
  const s=newCampaign(1),approaching=fieldFromCity(s,'xuchang',{target:'guandu'});approachDestination(s,approaching,.1);fieldFromCity(s,'guandu',{target:'xuchang'});beginExecution(s);for(let i=0;i<30&&!activeBattles(s).length;i++)advanceCampaignDay(s);const r=activeBattles(s)[0];chooseEncounter(s,r.id,true);lockDeployment(r.battle);for(const u of r.battle.sides.flatMap(v=>v.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}const army=s.armies.find(a=>a.id===r.armyIds.find(id=>s.armies.find(a=>a.id===id)?.faction==='cao')),leader=r.battle.sides[0].units.find(u=>u.id===army.leader);Object.assign(leader,{x:0,y:0,retreatAt:leader.hp});advanceCampaignStep(s);for(const u of r.battle.sides[1].units){u.battleDamage+=u.hp;u.hp=0;u.status='defeated';}advanceCampaignStep(s);assert.ok(pendingArmyAppointments(s).length);
  await load(s,'控制伤亡以触发缺职的战后任命机制演示，非自然战果');await shot('postbattle-roles','战后军团缺职时暂停补任');await click('close');assert.ok(await a('postbattle-appointments-confirm').isVisible());const roles=recommendArmyAppointments(army);for(const role of ['leader','advisor']){const sel=page.locator(`[data-postbattle-appointment-role="${role}"][data-army-id="${army.id}"]`);if(!await sel.isDisabled())await sel.selectOption(roles[role]);}await click('postbattle-appointments-confirm');await click('campaign-battles');await shot('battle-history','战场战史与战报入口');await a('campaign-replay').first().click();await shot('battle-report','实际伤亡人员与任命变化');
 },
 async captive(){
  for(const ransom of [true,false]){const s=newCampaign(15);fundCities(s,100000);const home=s.cities.find(c=>c.id===(ransom?'xuchang':'guandu')),unit=home.units.find(u=>u.id!==home.governor)||home.units[0];let eventId;for(let i=0;i<10000;i++){const key='guide-capture:'+i,roll=fateRoll(s,key);if(roll>=.02&&roll<.35){eventId=key;break;}}assert.equal(resolveOfficerLoss(s,{unit,faction:ransom?'cao':'yuan',location:ransom?'guandu':'xuchang',enemy:ransom?'yuan':'cao',eventId}),'CAPTIVE');for(let i=0;i<300&&s.campaign.domestic.people.find(p=>p.id===unit.id)?.custody;i++)updateCaptives(s);await load(s,'固定合法被俘结果的'+(ransom?'赎回':'释放')+'机制演示');await info('officer',unit.id,'all');await shot(ransom?'captive':'prisoner',ransom?'己方被俘武将与赎金':'关押敌方武将与释放入口','[data-info-section="custody"]');const before=await save(),action=ransom?'personnel-ransom':'personnel-release';await click(action);await shot(ransom?'ransom-confirm':'release-confirm',ransom?'确认赎金与返城后果':'释放俘虏前确认对象与后果');await click('close');assert.deepEqual(await save(),before);assert.equal(await a('campaign-confirm-action').count(),0);assert.equal(await page.locator('#detail-source-root .info-directory').count(),1);await click(action);await click('campaign-confirm-action');assert.ok(!(await save()).campaign.domestic.people.some(p=>p.id===unit.id&&p.status==='CAPTIVE'));assert.equal(await a('campaign-confirm-action').count(),0);assert.equal(await page.locator('#detail-source-root .info-directory').count(),ransom?1:0);assert.equal(await page.locator('.info-directory').count(),1);await shot(ransom?'ransom-result':'release-result',ransom?'赎回后沿路返城':'释放后返回更新的名册');}
 },
 async system(){
  await load();await click('settings');await shot('settings','声音表现与存档设置');await click('save');await shot('save-create','命名并新建手动存档');await page.locator('#archive-name').fill('官渡 · 流程演示');await click('archive-create');await page.locator('.archive-card h3').filter({hasText:'官渡 · 流程演示'}).waitFor();await shot('saves','自动档手动档与读取');await a('archive-overwrite').first().click();await shot('save-overwrite','覆盖指定存档前核对名称');await click('archive-cancel');await a('archive-delete').first().click();await shot('save-delete','删除存档前确认');await click('archive-cancel');await click('close');await click('settings');await shot('save-transfer','导入导出当前进度','[data-action="export"]');const download=page.waitForEvent('download');await click('export');await(await download).saveAs('outputs/action-guide/export.json');await page.locator('#import-file').setInputFiles('outputs/action-guide/export.json');await dismiss();await page.keyboard.press('F1');await shot('guide','按需查看当前页面指引');await page.keyboard.press('Escape');
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
 async diplomacy(){
  const s=newCampaign(281,'guandu-200');await load(s);await click('faction-diplomacy');await shot('diplomacy','外交待处理与目标方针');await page.locator('.diplomatic-staff>summary').click();const o=diplomaticOfficerCandidates(s,'cao','commerce')[0];await page.locator('#diplomacy-city-commerce').selectOption(o.location);await page.locator('#diplomacy-officer-commerce').selectOption(o.unit.id);await shot('diplomacy-appoint','先选出发城市再选使臣');await page.locator('.diplomatic-budget-settings>summary').click();await shot('diplomacy-budget','外交预算与保存','[data-action="diplomacy-budget"]');
  const pending=newCampaign(281,'guandu-200');fundCities(pending,9000);lordCity(pending,'cao').grain=2000;pending.grain=Math.floor(pending.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));const {p}=proposeDiplomatic(pending,{goal:'buyGrain',direction:'commerce'});untilDiplomatic(pending,()=>p.status==='pending');await load(pending,'实际谈判至待批准的购粮演示存档');await click('faction-diplomacy');await shot('diplomacy-proposal','双方给予内容与批准交涉否决');await page.locator(`[data-diplomatic-proposal="${p.id}"] .diplomatic-clause-details summary`).click();await shot('diplomacy-terms','完整条款与实际履约条件');await a('diplomacy-approve').click();await shot('diplomacy-approved','已批准仍待签署履约');
  const t=newCampaign(7);for(const id of ['brightArmor','artOfWar'])Object.assign(treasureRecord(t,id),{state:'city',cityId:'xuchang',holderId:null});await load(t,'有两件真实登记宝物的演示存档');await click('treasure-open');await shot('treasures','宝物收藏与可用操作');await page.locator('[data-action="treasure-select"][data-id="brightArmor"]').click();const receiver=t.cities.find(c=>c.id==='chenliu').units[0].id;await page.locator('[data-treasure-recipient]').selectOption(receiver);await page.locator('[data-treasure-equip]').check();await shot('treasure-grant','跨城立即授予及同时装备');await click('treasure-confirm');await shot('treasure-equipped','已装备宝物的卸下与收回入口');
 },
 async proposals(){
  const s=newCampaign(7);fundCities(s,40000);const c=s.cities.find(c=>c.id==='xuchang'),people=s.campaign.idle.filter(o=>o.location===c.id);for(const [key,def]of Object.entries(ACTIONS))if(['technology','commerce'].includes(def.direction)&&!['research','build_commerce'].includes(key))c.domestic.cooldowns[key]=10000;assignDomestic(s,c.id,'technology',people[0].unit.id);assignDomestic(s,c.id,'commerce',people[1].unit.id);
  await load(s,'本城已有负责人并形成付费提案的演示存档');await click('campaign-begin');await page.locator('.domestic-proposal').first().waitFor();await shot('proposals','提案费用时间与同意暂缓');await page.setViewportSize({width:844,height:390});await shot('proposals-landscape','横屏提案操作');await page.setViewportSize({width:1440,height:900});await click('domestic-auto-approve');await shot('proposals-policy','后续自动同意与本页审批分开');await click('domestic-auto-approve');await click('domestic-proposal-approve-page');await shot('proposals-approved','本页已处理的提案状态');
  const b=newCampaign(521200,'guandu-200'),camp=b.campaign.bandits.camps.find(c=>c.nodeId==='junction:chenliu:xuchang');assert.equal(dispatchScout(b,'xuchang',scoutCandidates(b,'xuchang')[0].unit.id,camp.nodeId),null);updateVision(b);await load(b,'已通过真实侦察发现贼寨的演示存档');await page.locator(`[data-action="bandit-open"][data-camp="${camp.id}"]`).press('Enter');await shot('bandit','贼寨情报与选择派出城');await page.locator(`[data-bandit-target="${camp.nodeId}"][data-town="xuchang"]`).click();await shot('bandit-expedition','讨伐沿用出征选队流程');
 },
 async setup(){
  await load(null,'开局与编辑器空白浏览器');await shot('lobby','游戏模式选择');await click('strategy');await shot('scenarios','普通模式剧本');await page.locator('[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();await page.locator('button[data-action="select-national-faction"][data-faction="cao"]').click();await shot('faction','势力选择与开始');
  await load(null,'独立战役编辑演示');await click('campaign-lobby');await shot('custom','历史模板与自定义战役');await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();await shot('custom-army','自定义战役单军编制');await click('scenario-setup-cancel');await click('launch-custom');await shot('custom-review','自定义战役开战前核阅');await click('close');await click('battle-map-editor');await shot('map-editor','地图分类地形绘制与工具');await page.locator('[data-map-editor-field="name"]').fill('流程演示地图');await page.locator('[data-ground="forest"]').click();await page.locator('[data-map-cell="6:3"]').click();await page.locator('[data-map-editor-action="save"]').click();await page.waitForFunction(()=>document.querySelector('[data-map-save-status]')?.textContent==='已保存');await shot('map-library','已保存地图与导入导出');await page.locator('[data-map-editor-action="preview"]').click();await shot('map-preview','真实战场地图预览');
 },
 async civic(){
  const s=await load();await shot('map','天下地图与进行按钮');await city();await shot('city-menu','城市一级命令');
  await click('city-domestic');await shot('domestic','城市内政方向与岗位');await a('domestic-direction-open').first().click();await shot('direction','方向岗位与当前负责人');await a('campaign-pick').filter({visible:true}).first().click();await shot('appointment','按能力与特性选择内政负责人');
  const choice=page.locator('[data-personnel-choice]:not(:disabled)').first();await choice.check();await shot('appointment-selected','选择后直接确认任命');await click('campaign-pick-confirm');await dismiss();
  await load();await command('governor');await page.locator('[data-personnel-choice]:not(:disabled)').first().check();await shot('governor','太守人选与确认');await click('campaign-command-cancel');
  await info('city','xuchang');await page.locator('[data-action="campaign-info-page"][data-page="收支预算"]').click();await shot('budget','城市钱粮预算');
  const original=await save(),gold=page.locator('[data-city-budget-key="goldReserve"]');await gold.fill('900');await gold.press('Tab');assert.deepEqual(await save(),original);await shot('budget-draft','保留金粮修改后显示未保存','[data-action="city-budget-save"]');
  const grain=page.locator('[data-city-budget-key="grainReserve"]');await grain.fill('1.5');await click('city-budget-save');assert.deepEqual(await save(),original);await grain.fill(String(original.cities.find(c=>c.id==='xuchang').budget.grainReserve));await click('city-budget-save');assert.equal((await save()).cities.find(c=>c.id==='xuchang').budget.goldReserve,900);await shot('budget-saved','点击保存预算后统一生效','[data-action="city-budget-save"]');
  await load();await click('faction-domestic');await shot('affairs','全势力优先级与补齐委任');await load();await info('officer');await shot('personnel','人物名册筛选与查询');await a('campaign-info-detail').filter({visible:true}).first().click();await shot('officer','武将详情与当前状态');
  await load();await page.locator('.faction-navigation [data-action="map-quick-open"][data-kind="city"]').click();await shot('city-directory','自辖城市与空闲人员');await load();await click('journal');await shot('journal','按类别查阅日志');
 },
 async logistics(){
  const s=await load();await click('scout-open');await shot('scout-source','侦察先确定派出城市');await page.locator('#scout-city').selectOption('town-8');await page.locator('#scout-officer').selectOption(scoutCandidates(s,'town-8')[0].unit.id);await page.locator('#scout-target').selectOption('town-5');await shot('scout-route','侦察终点路线及视野期限');await page.setViewportSize({width:844,height:390});await shot('scout-landscape','手机横屏侦察与固定派遣按钮');await page.setViewportSize({width:1440,height:900});await click('scout-dispatch');await shot('scout-running','侦察任务与停止入口');
  await load();await command('transfer','luoyang');await page.locator('[data-personnel-choice="person-195"]').check();await shot('transfer-person','调任选择来源城执行人');await click('campaign-command-next');await chooseCommandTarget(page,'chenliu');await shot('transfer-empty','人员调任终点与物资');await page.locator('[data-transfer-cargo="grain"]').fill('47');await page.locator('[data-transfer-cargo="gold"]').fill('23');await shot('transport','运输物资与真实预计抵达');await page.locator('.transport-options summary').click();await shot('transport-options','接力运输选项');await chooseMapTarget(page,'[data-action="map-target-open"][data-kind="relay"]','xuchang');await shot('transport-relay','地图选择接力城后的预览');await click('campaign-command-next');await shot('transport-review','运输核阅与最终下令');await page.setViewportSize({width:844,height:390});await click('campaign-command-back');await shot('transport-landscape','横屏运输参数与常驻摘要');
 },
 async timing(){
  const busy=busyFixture();await load(busy.s,'有实际在办工程的演示存档');await city();await click('city-domestic');await page.locator('[data-action="domestic-direction-open"][data-direction="commerce"]').click();await a('campaign-pick').filter({visible:true}).first().click();await page.locator(`[data-personnel-choice="${busy.id}"]`).check();await click('campaign-pick-confirm');await shot('timing','冲突事务的立即或完成后执行');await page.locator('[data-action="campaign-order-choice"][data-choice="after"]').click();await shot('waiting','完成后执行的等待安排');
 },
 async formation(){
  await load();await command('draft');await shot('troop-list','城内部队管理与新增解散');await click('campaign-unit-new');await click('campaign-unit-choose');await shot('troop-officer','单队编制内选择主将');await page.locator('[data-personnel-choice]:not(:disabled)').first().click();await shot('troop-edit','兵种兵力与装备配置');await click('campaign-command-next');await shot('troop-configured','单队确认后返回部队列表');await click('campaign-command-next');await shot('troop-review','城内编制最终核阅');
  await load();await command('expedition');await page.locator('[data-command-army-unit]:not(:disabled)').first().check();await page.locator('[data-command-army-unit]:not(:disabled)').nth(1).check();await shot('expedition-select','出征选队与已选移除');await page.setViewportSize({width:844,height:390});await shot('expedition-landscape','横屏选队与对照');await page.setViewportSize({width:1440,height:900});await click('campaign-command-next');await shot('expedition-roles','军团长与军师任命');await click('campaign-command-next');await chooseCommandTarget(page,'chenliu');await shot('expedition-route','出征目标与路线预览');await click('campaign-command-next');await shot('expedition-review','出征最终费用与路线核阅');
 },
};

try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('server '+c)));});browser=await chromium.launch({channel:'msedge',headless:true});
 assert.ok(groups[group],'Unknown capture group '+group);await groups[group]();assert.deepEqual(errors,[]);console.log('PASS capture group '+group);
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:`outputs/action-guide/${group}-failure.png`});await writeFile(`outputs/action-guide/${group}-failure.txt`,(await page.locator('body').innerText()).slice(0,16000));}throw error;}
finally{await context?.close();await browser?.close();server.kill();}
