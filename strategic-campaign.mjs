import {preparePostbattleAppointments,pendingArmyAppointments,confirmPostbattleAppointments} from './postbattle-appointments.mjs';
import {planArrivalAppointmentsAI,appointBattleRoles} from './battle-appointments.mjs';
export {pendingArmyAppointments,confirmPostbattleAppointments} from './postbattle-appointments.mjs';
import {initializeScouting,advanceScouting,validateScouting,reconcileScouting} from './scouting.mjs';
import {initializeTreasures,finishTreasureTurn,treasureCaptureCandidates,settleBattleTreasures,manageTreasuresAI,validateTreasures} from './treasures.mjs';
import {canEquip,validEquipment,equipmentCost,emptyEquipment} from './troop-equipment.mjs';
import {initializeVision,updateVision,validateVision,battleVisible} from './strategic-vision.mjs';
import {initializeTacticLearning} from './tactic-learning.mjs';
import {hasStrategicTrait} from './strategic-traits.mjs';
import {foodConsumption,hungerPenalty,citySupplyCapacity,allocateSupply} from './army-supply.mjs';
import {plannedGrain} from './strategic-intent.mjs';
import {armyStrategicTrait,marchModes,validMarch} from './strategic-traits.mjs';
import {armyFrontlineCapacity} from './army-trait-rules.mjs';
import {settleArmyAppointments,validArmyAppointmentChanges,ARMY_ROLES} from './army-appointments.mjs';
import {canRallyAt} from './army-rally.mjs';
import {initializeRetreatDestinations,dispatchWithdrawn,nearestRetreat,diplomaticRetreat} from './strategic-retreat.mjs';
import {validMapRoute} from "./strategic-movement.mjs";
import {mapNode,mapNodes,isJunction,junctionBlocked,roadSegment,edgeKey} from './road-network.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {cityRecurringIncome,sustainableRecruitment,cityBaseIncome} from './economy.mjs';
import {buildingLimit,canExpandBuilding,availableConstructionSites,constructionSiteAvailable,localBuildingLevel} from './metropolitan-areas.mjs';
import {cityMaintenance} from './economy.mjs';
export {cityMaintenance} from './economy.mjs';
import {trainingCost,trainingRate,affordableTraining} from './troop-training.mjs';
import {allocateUnitTroops} from './troop-allocation.mjs';
import {siegeDefenseCandidates,siegeDefensePlan} from './siege-defense.mjs';
import {playerFaction,isAIControlled,isPlayerControlled} from './player-faction.mjs';
import {missionOfficer,validateOfficerMission} from './officer-missions.mjs';
import {resolveOfficerLoss,removeOfficer,sendOfficerHome,roadEdgeForArmy,updateCaptives,displaceCityOfficers} from './officer-fates.mjs';
import {startPersonnelJourney,advancePersonnel,validatePersonnelJourney} from './personnel-movement.mjs';
import {cityForces,cityForce,preparedUnits,canFormArmyAt} from './city-units.mjs';
import {armyWaitingOrder,resolveStrategicOrders,validateStrategicOrders} from './strategic-orders.mjs';
import {roadDistance,campaignRoads,chosenRoad,roadCost,movementPoints,roadPoint} from './strategic-movement.mjs';
import {residentOfficer} from './city-personnel.mjs';
import {initializeStrategicAI,manageStrategicEconomy,planStrategicAI,validateStrategicAI} from './strategic-ai.mjs';
import {nationalScenario,nationalWorld,nationalRoster} from './national-scenarios.mjs';
import {FACTIONS} from './engine.mjs';
import {newGame, makeOfficer, startBattle, combatUnit, stepBattle, planBattleCouncilAI, lockDeployment, issueCommand, battleStratagems, STRATAGEMS, armyCommanders, armyTroops, validateSave, battleWounded, log} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {chooseEnemyCommand,planEnemyArmy} from './battle-ai.mjs';
import {PROGRESSION, battleMerit, battleMeritResult, meritChangeText} from './progression.mjs';
import {settleOfficerMerit,settleMeritCapacity} from './campaign-merit.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {setStatus, defaultTacticIds} from './tactics.mjs';
import {CAMPAIGN_TIME} from './combat-rules.mjs';
import {domesticEffects,passiveList} from './passives.mjs';
import {BUILDINGS,TECHS,grainCapacity,cityFoodReserve,recruitmentLimit,initializeDomestic,beginDomesticTurn,finishDomesticDay,generateDomesticOpportunities,reconcileDomestic,cancelDomestic,assignmentFor,canTrain,canRefill,reservedMen,effect,siegeOpening,validateDomestic,completeBattleBuildingWork,pendingDomesticProposals} from './domestic.mjs';
export {assignDomestic,assignmentFor,cityMilitary} from './domestic.mjs';
import {refreshTalentDemand,addCityGold} from './talent-core.mjs';
import {noteTalentCityCapture,talentArrived} from './talent-lifecycle.mjs';
import {initializeOfficerActivities,recordOfficerActivities,validateOfficerActivities} from './officer-activity.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {beginHarvestTurn,finishHarvestTurn} from './harvest-summary.mjs';
import {initializeDiplomacy,advanceDiplomacy,planDiplomaticAI,validateDiplomacy,declareDiplomaticWar} from './diplomacy.mjs';
import {factionsHostile,diplomaticProtection,diplomaticPassage,diplomaticAssignment} from './diplomacy-relations.mjs';

// A day consists of a fixed number of real combat steps, never wall-clock time.
export const CAMPAIGN = Object.freeze({version:56, daysPerTurn:10, ...CAMPAIGN_TIME, maxUnits:10, maxArmies:200, supplyRange:180});
import {gateDurability,buildingWorkMode,buildingWorkQuote,beginBuildingWork,buildingDurability,restoreBuilding,campaignBattleBuildings,writeBattleBuildingDamage,validateBattleBuildingSources} from './building-durability.mjs';
import {updateCityBudgetAlerts,validateCityBudget} from './city-budget.mjs';
import {initializeCityResources,syncResourceTotals} from './city-resources.mjs';
import {PROJECTS} from './domestic-designs.mjs';
export {PROJECTS};
const copy=x=>structuredClone(x);
const city=mapNode;
const army=(s,id)=>s.armies.find(a=>a.id===id);
const round=n=>Math.round(n*1000)/1000;
export const calendar=s=>({day:s.campaign.day,turn:Math.floor((s.campaign.day-1)/10)+1,dayInTurn:(s.campaign.day-1)%10+1});
export const battleRecord=(s,id)=>s.campaign.battles.find(r=>r.id===id);
export const activeBattles=s=>s.campaign.battles.filter(r=>!r.settled);
export const isPlanning=s=>s.campaign.phase==='planning'&&!s.finished;
export const armyBattle=(s,id)=>activeBattles(s).find(r=>r.armyIds.includes(id));
export const canEditArmy=(s,a,{scheduled=false}={})=>!!a&&!s.finished&&!a.disbanded&&!a.diplomaticTask&&!armyWaitingOrder(s,a.id)&&(scheduled||!s.campaign.allAI&&isPlanning(s))&&!a.travel&&!a.route.length&&!armyBattle(s,a.id)&&!activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===a.location)&&canRallyAt(s,a.location,a.faction);
export const roadLength=roadDistance;
const sameEdge=(t,a,b,road='main')=>t&&(t.road||'main')===road&&(t.from===a&&t.to===b||t.from===b&&t.to===a);
export function armyPosition(s,a){
  const t=a.travel;if(!t)return {x:city(s,a.location).x,y:city(s,a.location).y};
  const from=city(s,t.from),to=city(s,t.to),p=t.progress/roadLength(s,t.from,t.to);
  return roadPoint(from,to,p,t.road||'main');
}
export function liveSoldiers(s,a){
  const r=armyBattle(s,a.id);
  return r?r.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id&&!u.retreatDispatched).reduce((n,u)=>n+u.hp,0):armyTroops(a);
}
export {hungerPenalty} from './army-supply.mjs';
export const armyActionPoints=movementPoints;
export function dailyConsumption(s,a){
  const r=armyBattle(s,a.id),units=r?r.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id&&!u.retreatDispatched):null;
  const wounded=a.units.reduce((n,u)=>n+u.wounded,0)+(units?units.reduce((n,u)=>n+battleWounded(u),0):0);
  return foodConsumption(liveSoldiers(s,a),wounded);
}
export function newCampaign(seed=521200,scenarioId=null,faction='cao',{allAI=false}={}){
  if(typeof allAI!=='boolean'||allAI&&!scenarioId)throw new Error('全 AI 观战须选择天下剧本');
  const s=newGame(seed);s.cities.forEach(c=>{c.units=[];c.hunger=0;});
  s.campaign={version:CAMPAIGN.version,playerFaction:faction,allAI,day:1,phase:'planning',dayPrepared:false,stepInDay:0,battles:[],focusId:null,resumeId:null,idle:[],personnelEvents:[],turnReports:[],lastNotice:'先安排内政、派遣斥候，查明周边敌情再决定出征。'};
  if(scenarioId){if(!nationalScenario(scenarioId)?.factions.includes(faction))throw new Error('剧本势力无效');return initializeNationalCampaign(s,scenarioId);}
  s.cities.forEach(c=>Object.assign(c,{grain:8000,manpower:6500,order:80,farm:1,commerce:1,barracks:1,walls:1,granary:1,governor:null,project:null,reliefTurn:0,drafted:0}));
  s.armies.forEach(a=>{
    Object.assign(a,{supply:1800,supplyCapacity:2400,hunger:0,travel:null,supplyLine:null,supplyIn:0,cooldownDay:0,homeCity:a.location});
    a.units.forEach(u=>u.homeCity=a.location);
  });
  // Two columns on each side make marching, meeting and supporting observable.
  splitCampaignArmy(s,'a1',['yuanxia','jin']);
  const own=s.armies.at(-1);own.name='陈留援军';own.location='chenliu';own.homeCity='chenliu';own.units.forEach(u=>u.homeCity='chenliu');
  const enemy=s.armies.find(a=>a.id==='a2');
  const reserves=enemy.units.splice(4);const eid=`a${s.nextId++}`;
  s.armies.push({...copy(enemy),id:eid,name:'河北后军',location:'baima',homeCity:'baima',units:reserves,leader:reserves[0].id,advisor:reserves[1].id,supply:600,supplyCapacity:800});
  enemy.supply=1200;enemy.supplyCapacity=1600;normalize(enemy);
  for(const [name,home,faction] of [['荀彧','xuchang','cao'],['程昱','xuchang','cao'],['满宠','chenliu','cao'],['陈群','chenliu','cao'],['审配','ye','yuan']]){
    const source=Object.values(OFFICER_BY_ID).find(u=>u.name===name);if(!source)continue;
    if(s.armies.some(a=>a.units.some(u=>u.id===source.id)))continue;
    s.campaign.idle.push({unit:{...makeOfficer(source.id,0,0,1,seed),homeCity:home},faction,location:home,destination:null,remainingDays:0});
  }
  initializeCityResources(s,s.gold);s.armies.forEach(a=>a.detached=false);materializeGarrisons(s);consolidateCityArmies(s);initializeDomestic(s);
  s.logs=[];log(s,'城内部队独立编制，出征时组建最多十队的军团，战场同时上阵六队。','event');syncResources(s);initializeDiplomacy(s);initializeScouting(s);initializeOfficerActivities(s);initializeTreasures(s);manageTreasuresAI(s);initializeVision(s);updateCityBudgetAlerts(s);return s;
}
function initializeNationalCampaign(s,scenarioId){
  const spec=nationalScenario(scenarioId);Object.assign(s,nationalWorld(scenarioId));
  s.cities.forEach(c=>{c.units=[];c.hunger=0;});s.campaign.scenarioId=scenarioId;s.campaign.archive=[];s.armies=[];s.nextId=3;s.gold=scenarioId==='guandu-200'?9000:6000;
  for(const c of s.cities)Object.assign(c,{grain:c.kind==='city'?16000:7000,manpower:c.kind==='city'?9000:3000,order:80,farm:1,commerce:1,barracks:1,walls:c.kind==='gate'?2:1,granary:1,governor:null,project:null,reliefTurn:0,drafted:0});
  initializeCityResources(s,s.gold);
  const roster=nationalRoster(scenarioId,s.cities),assigned=new Map(s.cities.map(c=>[c.id,[]]));
  if(spec.rosterDistribution==='reference')for(const o of roster)assigned.get(o.cityId).push(o);
  // Every force staffs its towns before using its remaining officers as reserves.
  else for(const faction of new Set(roster.map(o=>o.faction))){
    const pool=roster.filter(o=>o.faction===faction).sort((a,b)=>Number(OFFICER_BY_ID[b.id].sourceId===FACTIONS[faction]?.leaderSourceId)-Number(OFFICER_BY_ID[a.id].sourceId===FACTIONS[faction]?.leaderSourceId)),towns=s.cities.filter(c=>c.owner===faction).sort((a,b)=>Number(b.id===spec.capital)-Number(a.id===spec.capital)||Number(b.kind==='city')-Number(a.kind==='city')||a.sourceId-b.sourceId);
    for(const c of towns){const count=c.kind==='city'?6:1;for(let i=0;i<count&&pool.length;i++){let at=pool.findIndex(o=>o.cityId===c.id);if(at<0)at=0;assigned.get(c.id).push(pool.splice(at,1)[0]);}}
    for(const o of pool)assigned.get(o.cityId).push(o);
  }
  for(const c of s.cities){
    const entries=assigned.get(c.id).sort((a,b)=>Number(OFFICER_BY_ID[b.id].sourceId===FACTIONS[c.owner]?.leaderSourceId)-Number(OFFICER_BY_ID[a.id].sourceId===FACTIONS[c.owner]?.leaderSourceId)),admin=entries.length>=3?[...entries].sort((a,b)=>OFFICER_BY_ID[b.id].politics-OFFICER_BY_ID[a.id].politics).find(o=>o.id!=='cao'&&OFFICER_BY_ID[o.id].sourceId!==FACTIONS[c.owner]?.leaderSourceId):null;
    const combat=entries.filter(o=>o!==admin).slice(0,c.kind==='city'?Math.min(6,Math.max(1,entries.length-3)):2),combatIds=new Set(combat.map(o=>o.id));
    for(const o of entries.filter(o=>!combatIds.has(o.id)))s.campaign.idle.push({unit:{...makeOfficer(o.id,0,0,3,s.seed),homeCity:c.id},faction:c.owner,location:c.id,destination:null,remainingDays:0});
    if(admin)c.governor=admin.id;
    if(!combat.length)continue;
    const units=combat.map((o,i)=>({...makeOfficer(o.id,c.kind==='city'?2500:1800,i,3,s.seed),homeCity:c.id}));
    const leader=units.find(u=>u.id==='cao'||OFFICER_BY_ID[u.id].sourceId===FACTIONS[c.owner]?.leaderSourceId)||units[0];
    s.armies.push({id:`a${s.nextId++}`,name:`${c.name}初始兵员`,faction:c.owner,location:c.id,homeCity:c.id,route:[],target:null,travel:null,task:'驻守',morale:80,tactic:'balanced',leader:leader.id,advisor:[...units].sort((a,b)=>b.intellect-a.intellect)[0].id,units,supply:units.length*600,supplyCapacity:units.length*900,hunger:0,supplyIn:0,supplyLine:null,cooldownDay:0,stationary:c.kind!=='city',detached:false});
  }
  consolidateCityArmies(s);initializeDomestic(s);initializeStrategicAI(s);s.logs=[];s.campaign.lastNotice=s.campaign.allAI?`${spec.name} · 全 AI 观战。所有势力由 AI 办理内政、侦察、外交和军事行动。`:`${spec.name} · 执掌${FACTIONS[playerFaction(s)].name}势力。先安排内政、派遣斥候，查明周边敌情再决定出征。`;log(s,`${spec.era}，${spec.name}。统一全部 ${s.cities.length} 座城市，成就霸业。`,'event');syncResources(s);initializeDiplomacy(s);initializeScouting(s);initializeOfficerActivities(s);initializeTreasures(s);manageTreasuresAI(s);initializeVision(s);updateCityBudgetAlerts(s);return s;
}
function materializeGarrisons(s){
  const used=new Set([...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)]),pool=Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id));let index=0;
  for(const c of s.cities){let remaining=c.garrison;if(!remaining)continue;const units=[];
    while(remaining>0){const u={...makeOfficer(pool[index++],0,0,1,s.seed),homeCity:c.id,type:'spear',first:units.length<6,cityGuard:true};u.tactics=defaultTacticIds(u);u.troops=Math.min(remaining,troopCapacity(u));remaining-=u.troops;units.push(u);}
    s.armies.push({id:`a${s.nextId++}`,name:`${c.name}守备军`,faction:c.owner,location:c.id,homeCity:c.id,route:[],target:null,travel:null,task:'驻守',morale:70,tactic:'defensive',leader:units[0].id,advisor:units[0].id,units,supply:units.length*300,supplyCapacity:units.length*600,hunger:0,supplyIn:0,supplyLine:null,cooldownDay:0,stationary:true});c.garrison=0;
  }
}
function mergeLocal(s,a,b){b.units.forEach(u=>u.first=false);a.units.push(...b.units);a.supply=round(a.supply+b.supply);a.supplyCapacity+=b.supplyCapacity;a.hunger=Math.max(a.hunger,b.hunger);a.stationary=!!a.stationary&&!!b.stationary;s.armies=s.armies.filter(x=>x!==b);normalize(a);}
export function consolidateCityArmies(s){
 for(const a of [...s.armies]){const c=city(s,a.location);if(pendingArmyAppointments(s).some(p=>p.armyId===a.id)||a.diplomaticTask||a.travel||a.route.length||armyBattle(s,a.id)||a.disbanded||armyWaitingOrder(s,a.id)||c?.owner!==a.faction)continue;
  c.units.push(...a.units);c.grain=Math.min(grainCapacity(c),round(c.grain+a.supply));s.armies=s.armies.filter(x=>x!==a);
 }
 if(s.campaign.activity)settleMeritCapacity(s);
}
export function setObserverFaction(s,faction){
 if(!s.campaign.allAI||!nationalScenario(s.campaign.scenarioId)?.factions.includes(faction))return '请选择本剧本的观战势力';
 s.campaign.playerFaction=faction;syncResources(s);return null;
}
export function prepareCityUnits(s,cityId,ids,{scheduled=false,faction=playerFaction(s)}={}){
 const c=city(s,cityId);if(!scheduled&&!isPlanning(s)||s.finished||c?.owner!==faction||activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===cityId))return '只能在筹划阶段于未被围城的己方据点编制';
 const chosen=ids.map(id=>s.campaign.idle.find(o=>o.unit.id===id&&o.location===cityId&&!o.destination&&!o.retreating&&!o.unit.mission&&!o.unit.scouting&&o.faction===c.owner));
 if(!chosen.length||new Set(ids).size!==ids.length||chosen.some(o=>!o||!canTrain(c,o.unit.type)))return '请选择本城未编制且兵种已解锁的武将';
 const cost=chosen.reduce((n,o)=>n+trainingCost(o.unit,o.unit.troops,c),0);if(c.gold<cost)return '编制费用不足';addCityGold(s,c,-cost);
 c.units.push(...chosen.map(o=>o.unit));s.campaign.idle=s.campaign.idle.filter(o=>!chosen.includes(o));return null;
}
export function changeCityTroop(s,cityId,id,type,{scheduled=false,faction=playerFaction(s)}={}){const c=city(s,cityId),u=c?.units.find(u=>u.id===id);if(!u||u.mission||!scheduled&&!isPlanning(s)||c.owner!==faction||activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===cityId))return '当前不能改编';if(u.type===type)return null;if(!canTrain(c,type))return '本城未掌握该兵种';const cost=trainingCost(type,u.troops+u.wounded,c);if(c.gold<cost)return '改编费用不足';addCityGold(s,c,-cost);u.type=type;initializeTacticLearning(u,s.seed);return null;}
export function equipCityUnit(s,cityId,id,e,{scheduled=false,faction=playerFaction(s)}={}){
 const c=city(s,cityId),u=c?.units.find(u=>u.id===id);
 if(!u||u.mission||!scheduled&&!isPlanning(s)||c.owner!==faction||activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===cityId))return '只能在实际驻扎的己方城市配备装备';
 if(!validEquipment(e)||['siege','ship'].some(slot=>e[slot]&&e[slot]!==u.equipment[slot]&&!canEquip(c,e[slot])))return '本城未掌握装备技术或不具备水域';
 const cost=equipmentCost(e,u.equipment,u.troops+u.wounded,c);if(c.gold<cost)return '装备费用不足';addCityGold(s,c,-cost);u.equipment=structuredClone(e);return null;
}
export function recruitCityUnits(s,cityId,ids){
 const c=city(s,cityId);if(!isPlanning(s)||c?.owner!==playerFaction(s)||activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===cityId))return '当前不能整补城内部队';
 return recruitLocalUnits(s,c,ids);
}
// Both controllers use the same quota, treasury, residency and wounded checks.
export function recruitLocalUnits(s,c,ids,{faction=playerFaction(s),grainReserve=0,manpowerReserve=0,goldReserve=0,cap=Infinity}={}){
 if(s.finished||!c||c.owner!==faction||activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===c.id))return '当前不能整补';
 const units=ids.map(id=>residentOfficer(s,id)).filter(o=>o?.location===c.id&&o.faction===faction&&!o.unit.mission&&canRefill(c,o.unit)).map(o=>o.unit);
 if(new Set(ids).size!==ids.length||units.length!==ids.length)return '整补部队已不在本城或兵种未解锁';
 const need=u=>Math.max(0,Math.min(troopCapacity(u),cap)-u.troops-u.wounded);
 const supportLimit=grainReserve>0?Math.min(sustainableRecruitment(s,c),Math.floor(Math.max(0,c.grain-grainReserve)/(ECONOMY_RULES.ai.recruitReserveDays/100))):Infinity;
 const amount=Math.floor(Math.min(units.reduce((n,u)=>n+need(u),0),c.manpower-reservedMen(c)-manpowerReserve,recruitmentLimit(c)-c.drafted-reservedMen(c),supportLimit));
 if(amount<=0)return '兵员已足，或本旬征募额度、资金、兵源及补给安排不足';
 let left=amount,cash=Math.max(0,c.gold-goldReserve),spent=0;const plan=[];for(const u of [...units].sort((a,b)=>a.troops-b.troops||a.id.localeCompare(b.id))){const n=Math.min(left,need(u),affordableTraining(u,cash,c));const cost=trainingCost(u,n,c);plan.push({u,n});left-=n;cash-=cost;spent+=cost;}
 const actual=amount-left;if(!actual)return '编制费用不足';for(const {u,n} of plan)u.troops+=n;
 c.manpower-=actual;c.drafted+=actual;addCityGold(s,c,-spent);refreshTalentDemand(s,true);syncResources(s);return null;
}
export function disbandCityUnits(s,cityId,ids,{scheduled=false,faction=playerFaction(s)}={}){
 const c=city(s,cityId);
 if(!scheduled&&!isPlanning(s)||s.finished||c?.owner!==faction||activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===cityId))return '当前不能解散驻城部队';
 const units=ids.map(id=>c.units.find(u=>u.id===id));
 if(new Set(ids).size!==ids.length||units.some(u=>!u||u.mission))return '只能解散实际驻城的部队';
 if(s.campaign.domestic.orders.some(q=>q.kind==='expedition'&&q.officerIds.some(id=>ids.includes(id))))return '部队已编入等待出征命令，请先取消该命令';
 for(const u of units){c.manpower+=u.troops+u.wounded;u.troops=0;u.wounded=0;s.campaign.idle.push({unit:u,faction:c.owner,location:c.id,destination:null,remainingDays:0});}
 c.units=c.units.filter(u=>!ids.includes(u.id));syncResources(s);return null;
}
export function prepareDepartureUnits(s,cityId,ids,types={},reinforce=false,troops={},disbandIds=[],equipment={},options={}){
 const next=copy(s),error=prepareDepartureUnitsInPlace(next,cityId,ids,types,reinforce,troops,disbandIds,equipment,options);if(error)return error;return prepareDepartureUnitsInPlace(s,cityId,ids,types,reinforce,troops,disbandIds,equipment,options);
}
function prepareDepartureUnitsInPlace(s,cityId,ids,types={},reinforce=false,troops={},disbandIds=[],equipment={},options={}){
 const c=city(s,cityId);if(!c)return '据点不存在';
 const eligible=new Set(siegeDefenseCandidates(s,cityId).map(o=>o.unit.id));
 if(new Set(ids).size!==ids.length||ids.some(id=>!eligible.has(id)))return '请选择实际在城且未外出、未负责侦察的武将';
 if(disbandIds.some(id=>ids.includes(id)))return '解散部队不能同时编制或出征';
 if(disbandIds.length){const error=disbandCityUnits(s,cityId,disbandIds,options);if(error)return error;}
 if(!ids.length&&disbandIds.length)return null;
 const fresh=ids.filter(id=>!c.units.some(u=>u.id===id));
 for(const id of fresh){const o=s.campaign.idle.find(o=>o.unit.id===id&&o.location===cityId&&!o.destination&&!o.retreating&&o.faction===c.owner);if(o&&types[id]&&canTrain(c,types[id])){o.unit.type=types[id];initializeTacticLearning(o.unit,s.seed);}}
 let error=fresh.length?prepareCityUnits(s,cityId,fresh,options):null;if(error)return error;
 for(const id of ids){if(types[id]){error=changeCityTroop(s,cityId,id,types[id],options);if(error)return error;}}
 for(const id of ids)if(equipment[id]){const error=equipCityUnit(s,c.id,id,equipment[id],options);if(error)return error;}
 error=allocateUnitTroops(s,c,ids,troops);if(error)return error;
 if(reinforce){error=options.scheduled?recruitLocalUnits(s,c,ids,options):recruitCityUnits(s,cityId,ids);if(error)return error;}
 return ids.every(id=>c.units.some(u=>u.id===id&&u.troops>0))?null:'所选部队尚无兵员，请整补或调整选择';
}
export function prepareSiegeUnits(s,battleId,ids,types={},reinforce=false,troops={},disbandIds=[],equipment={}, {faction=playerFaction(s)}={}){
 const next=copy(s),r=battleRecord(next,battleId),c=r&&city(next,r.cityId);
 if(!r||r.kind!=='siege'||!r.awaiting||r.settled||r.battle.tick>0||c.owner!==faction)return {error:'只能在己方守城战开始前编制'};
 const attacker=next.armies.find(a=>a.id===r.armyIds[0]),defenders=r.armyIds.slice(1).map(id=>next.armies.find(a=>a.id===id)).filter(Boolean);
 for(const a of defenders.filter(a=>a.defense)){c.units.push(...a.units);c.grain+=a.supply;}
 next.armies=next.armies.filter(a=>!defenders.some(d=>d.defense&&d.id===a.id));next.campaign.battles=next.campaign.battles.filter(b=>b.id!==r.id);
 const error=prepareDepartureUnitsInPlace(next,c.id,ids,types,reinforce,troops,disbandIds,equipment,{scheduled:true,faction});if(error)return {error};
 const rebuilt=makeEncounter(next,attacker,defenders.filter(a=>!a.defense),c.id,'siege',r.point);rebuilt.id=r.id;rebuilt.battle.id=r.id;
 syncResources(next);return {state:next,gold:city(s,c.id).gold-c.gold,grain:city(s,c.id).grain-c.grain,men:city(s,c.id).manpower-c.manpower};
}
export function prepareAutoSiegeDefense(s,battleId){
 const r=battleRecord(s,battleId),plan=r&&siegeDefensePlan(s,r.cityId);
 if(!plan?.officerIds.length)return {error:'本城暂无可用人员、金或预备兵，不能自动编制'};
 return prepareSiegeUnits(s,battleId,plan.officerIds,plan.types,false,plan.troops);
}
export function expeditionError(s,q,{scheduled=false,faction=playerFaction(s)}={}){
 const c=city(s,q.cityId),ids=q.officerIds,units=ids?.map(id=>c?.units.find(u=>u.id===id));
 if((!scheduled&&!isPlanning(s))||s.finished||!canFormArmyAt(s,c?.id,faction))return '当前不能从此城出征';
 if(!units?.length||units.length>10||new Set(ids).size!==ids.length||units.some(u=>!u||u.troops<=0||u.mission||u.scouting))return '请选择本城一至十支有兵力的部队';
 if(Object.hasOwn(q,'deputy')||!ids.includes(q.leader)||!ids.includes(q.advisor))return '请从出征部队中任命军团长和军师';
 if(s.armies.length>=CAMPAIGN.maxArmies)return '军团数量已达上限';
 if(diplomaticProtection(s,faction,city(s,q.target)?.owner)&&!diplomaticPassage(s,faction,q.target))return '存在外交保护条约，须先批准解约或借道';
 const guest={id:`a${s.nextId}`,units},owner=city(s,q.target)?.owner;if(owner&&owner!==faction&&owner!=='neutral'&&!factionsHostile(s,faction,owner)&&diplomaticPassage(s,faction,q.target,'military',null,guest)&&!diplomaticPassage(s,faction,q.target,'station',null,guest))return '仅有军事通行许可，停驻对方城市须批准驻军协议';
 if(q.route!==undefined&&!validMapRoute(s,c.id,q.target,q.route,faction===playerFaction(s)?null:faction))return '所选道路不连续或已失效';
 if(!city(s,q.target)||q.target===c.id||!['auto','main'].includes(q.policy)||!findCampaignRoute(s,c.id,q.target,faction===playerFaction(s)?null:faction,q.policy))return '请选择其它可达据点';
 return null;
}
export function launchExpedition(s,q,{scheduled=false,faction=playerFaction(s)}={}){
 const error=expeditionError(s,q,{scheduled,faction});if(error)return error;
 const targetOwner=city(s,q.target).owner;if(targetOwner!==faction&&!factionsHostile(s,faction,targetOwner)&&!diplomaticPassage(s,faction,q.target)){const error=declareDiplomaticWar(s,faction,targetOwner,{approved:true});if(error)return error;}
 const c=city(s,q.cityId),units=q.officerIds.map(id=>c.units.find(u=>u.id===id)),supply=Math.min(c.grain,units.length*900);
 const a={...cityForce(c),id:`a${s.nextId++}`,name:units.find(u=>u.id===q.leader).name+'军',units,leader:q.leader,advisor:q.advisor,supply,supplyCapacity:units.length*900,route:q.route?[...q.route]:findCampaignRoute(s,c.id,q.target,faction===playerFaction(s)?null:faction,q.policy),target:q.target,roadPolicy:q.policy,stationary:false,task:'出征'};delete a.cityForce;
 units.forEach((u,i)=>u.first=i<armyFrontlineCapacity(a));c.units=c.units.filter(u=>!q.officerIds.includes(u.id));c.grain=round(c.grain-supply);s.armies.push(a);reconcileDomestic(s);syncResources(s);return null;
}

function syncResources(s){syncResourceTotals(s);s.turn=calendar(s).turn;}
export function findCampaignRoute(s,from,to,faction=null,policy='auto'){
  // Selecting an adjacent field junction means taking its connecting trail.
  if(roadSegment(s,from,to)?.trail)return [to];
  const dist=new Map([[from,0]]),paths=new Map([[from,[]]]),todo=new Set(mapNodes(s).map(c=>c.id));
  const neighbors=new Map();for(const [a,b]of s.roads){if(!neighbors.has(a))neighbors.set(a,[]);if(!neighbors.has(b))neighbors.set(b,[]);neighbors.get(a).push(b);neighbors.get(b).push(a);}
  while(todo.size){let current=null,best=Infinity;for(const id of todo){const cost=dist.get(id)??Infinity;if(current===null||cost<best||cost===best&&id.localeCompare(current)<0){current=id;best=cost;}}
    if(!dist.has(current))return null;todo.delete(current);if(current===to)return paths.get(current);
    if(current!==from&&faction&&!isJunction(s,current)&&city(s,current).owner!==faction&&!diplomaticPassage(s,faction,current))continue;
    for(const next of neighbors.get(current)||[]){if(!todo.has(next))continue;
      const d=dist.get(current)+roadCost(s,current,next,policy);if(d<(dist.get(next)??Infinity)){dist.set(next,d);paths.set(next,[...paths.get(current),next]);}}
  }return null;
}
export function orderCampaignArmy(s,id,target,policy='auto',{scheduled=false,faction=playerFaction(s),reverse=false,path}={}){
  const a=army(s,id);if(!scheduled&&!isPlanning(s)||s.finished||!a||a.faction!==faction||!city(s,target))return '只能在战略筹划阶段下达军令';
  if(a.diplomaticTask&&!scheduled)return '军团正在履行已批准的外交任务，须先批准调整或结束合作';
  if(armyBattle(s,id))return '军团正在交战，请在战场下达撤退或派遣其他军团支援';
  if(diplomaticProtection(s,faction,city(s,target)?.owner)&&!diplomaticPassage(s,faction,target))return '存在外交保护条约，须先批准解约或借道';
  const owner=city(s,target)?.owner;if(owner&&owner!==faction&&owner!=='neutral'&&!factionsHostile(s,faction,owner)&&diplomaticPassage(s,faction,target,'military',null,a)&&!diplomaticPassage(s,faction,target,'station',null,a))return '仅有军事通行许可，停驻对方城市须批准驻军协议';
  if(target!==a.location&&a.units.filter(u=>u.troops>0).length>CAMPAIGN.maxUnits)return '出征军团最多10队，请减少出征部队';
  if(!armyTroops(a))return '请先征募兵员';
  if(!['auto','main'].includes(policy))return '道路选择无效';
  const from=(reverse?a.travel?.from:a.travel?.to)||a.location,route=path!==undefined?(validMapRoute(s,from,target,path,faction===playerFaction(s)?null:faction)?[...path]:null):findCampaignRoute(s,from,target,faction===playerFaction(s)?null:faction,policy);
  if(!route)return '道路不通';
  if(city(s,target).owner!==faction&&!factionsHostile(s,faction,city(s,target).owner)&&!diplomaticPassage(s,faction,target)){const error=declareDiplomaticWar(s,faction,city(s,target).owner,{approved:true});if(error)return error;}
  delete a.diplomaticWithdrawal;
  if(reverse&&a.travel){const t=a.travel;a.location=t.to;a.travel={...t,from:t.to,to:t.from,progress:Math.max(0,roadLength(s,t.from,t.to)-t.progress)};}
  a.roadPolicy=policy;
  a.route=a.travel?[a.travel.to,...route]:route;a.target=a.route.length?target:null;a.task=a.route.length?'行军':'驻守';if(a.route.length){a.detached=false;a.stationary=false;}reconcileDomestic(s);return null;
}
export function splitCampaignArmy(s,id,ids,{faction=playerFaction(s),scheduled=false}={}){
 if((army(s,id)?.marchMode||'normal')!=='normal')return '请先恢复常行再拆分军团';
  const a=army(s,id);if(!canEditArmy(s,a,{scheduled})||a.faction!==faction)return '须在筹划阶段于安全节点拆分驻守军团';
  if(s.armies.length>=CAMPAIGN.maxArmies)return '军团数量已达上限';
  const chosen=a.units.filter(u=>ids.includes(u.id));
  if(chosen.filter(u=>u.troops>0).length>CAMPAIGN.maxUnits)return '出征军团最多10队，请减少所选部队';
  if(!chosen.length||chosen.length===a.units.length||!chosen.some(u=>u.troops)||!a.units.some(u=>!ids.includes(u.id)&&u.troops))return '两支军团都需保留有兵力的部队';
  const ratio=chosen.length/a.units.length,capacity=Math.floor(a.supplyCapacity*ratio),supply=Math.floor(a.supply*ratio);
  const b={...copy(a),id:`a${s.nextId++}`,name:`${chosen[0].name}军`,units:chosen,leader:chosen[0].id,advisor:[...chosen].sort((x,y)=>y.intellect-x.intellect)[0].id,supplyCapacity:capacity,supply,route:[],target:null,detached:true,stationary:false};
  a.units=a.units.filter(u=>!ids.includes(u.id));a.supplyCapacity-=capacity;a.supply=round(a.supply-supply);normalize(a);normalize(b);s.armies.push(b);return null;
}
function normalize(a){for(const key of ['leader','advisor'])if(!a.units.some(u=>u.id===a[key]))a[key]=a.units[0].id;let n=0;for(const u of a.units)if(u.first)u.first=++n<=armyFrontlineCapacity(a);if(!a.units.some(u=>u.first))a.units.slice(0,armyFrontlineCapacity(a)).forEach(u=>u.first=true);}
export function mergeCampaignArmies(s,into,from,{faction=playerFaction(s),scheduled=false}={}){
 if([army(s,into),army(s,from)].some(a=>(a?.marchMode||'normal')!=='normal'))return '请先恢复常行再合并军团';
  const a=army(s,into),b=army(s,from);if(!canEditArmy(s,a,{scheduled})||!canEditArmy(s,b,{scheduled})||a===b||a.location!==b.location||a.faction!==faction||b.faction!==faction)return '须选择同一安全节点驻守的己方军团';
  if(b.units.some(u=>a.units.some(x=>x.id===u.id)))return '不能合并重复武将';
  if([...a.units,...b.units].filter(u=>u.troops>0).length>CAMPAIGN.maxUnits)return '合并后最多十队';
  mergeLocal(s,a,b);a.detached=false;return null;
}
export const createCampaignArmy=prepareCityUnits;

export function transferOfficer(s,id,destination,{scheduled=false,cargo={gold:0,grain:0,manpower:0},relay=null,cycles=0,route:plannedRoute,checkOnly=false,faction=playerFaction(s)}={}){
  const resident=residentOfficer(s,id),c=city(s,destination),from=resident&&city(s,resident.location);
  if(!scheduled&&!isPlanning(s)||s.finished||!resident||resident.army||resident.faction!==faction||c?.owner!==faction)return '只能调任在城武将到友城';
  if(s.cities.some(c=>c.governor===id))return '请先解除太守任命';
  if(destination===from.id)return '请选择其它友城';
  if(activeBattles(s).some(r=>r.kind==='siege'&&[from.id,destination].includes(r.cityId)))return '围城期间不能调任或运输';
  cargo={gold:0,...cargo};
  if(!cargo||!['gold','grain','manpower'].every(k=>Number.isSafeInteger(cargo[k])&&cargo[k]>=0))return '携带物资须为非负整数';
  if(cargo.gold>from.gold||cargo.grain>from.grain||cargo.manpower>from.manpower-reservedMen(from))return '本城可用金、粮草或预备兵不足';
  const route=plannedRoute||findCampaignRoute(s,from.id,destination,faction);if(!route)return '调任道路不通';
  if(plannedRoute&&!validMapRoute(s,from.id,destination,plannedRoute,faction,'trade'))return '运输道路不连续或已失效';
  if(relay&&(!hasStrategicTrait(resident.unit,'relayCargo')||![from.id,destination].every(id=>id!==relay)||city(s,relay)?.owner!==faction||!(cargo.gold+cargo.grain+cargo.manpower)||!findCampaignRoute(s,from.id,relay,faction)||!findCampaignRoute(s,relay,destination,faction)))return '接力据点、转漕资格或道路无效';
  if(cycles&&(!hasStrategicTrait(resident.unit,'cycleCargo')||!Number.isInteger(cycles)||cycles<2||cycles>5||cargo.grain<=0||cargo.gold||cargo.manpower||resident.unit.troops||resident.unit.wounded))return '往返运输仅限无部队武将携带粮草，次数为2至5';
  if(relay&&plannedRoute&&!plannedRoute.includes(relay))return '所选运输道路未经过中转据点';
  if(resident.unit.scouting)return '该武将正在负责侦察，请先停止侦察';
  if(checkOnly)return null;
  cancelDomestic(s,id,'调任其他城池');
  let o=s.campaign.idle.find(o=>o.unit.id===id);
  if(!o){from.units=from.units.filter(u=>u.id!==id);o={unit:resident.unit,faction:resident.faction,location:from.id};s.campaign.idle.push(o);}
  addCityGold(s,from,-cargo.gold);from.grain-=cargo.grain;from.manpower-=cargo.manpower;o.cargo={...cargo};o.destination=relay||destination;o.unit.homeCity=destination;if(relay)o.relayDestination=destination;if(cycles)o.convoyCycle={source:from.id,target:destination,batch:cargo.grain,remaining:cycles,leg:'out'};
  if(relay&&plannedRoute){const index=plannedRoute.indexOf(relay);o.relayRoute=plannedRoute.slice(index+1);startPersonnelJourney(s,o,plannedRoute.slice(0,index+1));}else startPersonnelJourney(s,o,plannedRoute);
  if(cycles&&plannedRoute)o.convoyCycle.route=[from.id,...plannedRoute];syncResources(s);return null;
}
export function recruitCampaign(s,id,ids=null,{faction=playerFaction(s),scheduled=false,...budget}={}){
  const a=army(s,id);if(!canEditArmy(s,a,{scheduled})||a.faction!==faction||!canFormArmyAt(s,a.location,a.faction))return '只能在筹划阶段于友城整补';
  const c=city(s,a.location);return recruitLocalUnits(s,c,a.units.filter(u=>(!ids||ids.includes(u.id))&&canRefill(c,u)).map(u=>u.id),{...budget,faction});
}
export function commissionProject(s,cityId,key){
  const c=city(s,cityId),p=PROJECTS[key];if(!isPlanning(s)||c?.owner!==playerFaction(s)||!p)return '只能在筹划阶段安排己方内政';
  const cost=projectCost(s,c,key);
  if(BUILDINGS[key].technology&&!c.domestic.techs.includes(BUILDINGS[key].technology)&&!availableConstructionSites(s,c,p.field).some(x=>buildingWorkMode(c,key,x.node.id)!=='build'))return '先研究'+TECHS[BUILDINGS[key].technology].name;
  if(c.project)return '该城已有建设任务';const siteId=availableConstructionSites(s,c,p.field).find(x=>!BUILDINGS[key].technology||c.domestic.techs.includes(BUILDINGS[key].technology)||buildingWorkMode(c,key,x.node.id)!=='build')?.node.id;if(!siteId)return '设施已达本城或建设地点上限';
  if(activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===cityId))return '围城期间无法开工';
  const quote=buildingWorkQuote(c,key,siteId,cost,p.turns*10);if(c.gold<quote.cost)return '本城金不足';addCityGold(s,c,-quote.cost);beginBuildingWork(c,key,siteId,quote);return null;
}
export function relieveCity(s,cityId){
  return '城市民心已停用，请通过人才委任安抚本城武将';
}
export function changeCampaignTroop(s,armyId,unitId,type,{faction=playerFaction(s),scheduled=false}={}){const a=army(s,armyId),u=a?.units.find(u=>u.id===unitId);if(!u||!canEditArmy(s,a,{scheduled})||a.faction!==faction)return '只能在己方城池筹划时改编';if(u.type===type)return null;if(!canFormArmyAt(s,a.location,a.faction))return '改换兵种须返回己方城池';if(!canTrain(city(s,a.location),type))return '本城未掌握该兵种技术或不具备水域条件';const cost=trainingCost(type,u.troops+u.wounded,city(s,a.location));if(city(s,a.location).gold<cost)return '改编费用不足';addCityGold(s,city(s,a.location),-cost);u.type=type;initializeTacticLearning(u,s.seed);return null;}
export function appointGovernor(s,cityId,id,{faction=playerFaction(s),scheduled=false}={}){
  const c=city(s,cityId);if(s.finished||!scheduled&&(s.campaign.allAI||!isPlanning(s))||c?.owner!==faction)return '只能在筹划阶段任命';
  const officer=id?residentOfficer(s,id):null;
  if(id&&(!officer||officer.location!==cityId||officer.faction!==faction))return '太守必须仍在本城';
  if(officer?.unit.scouting)return '该武将正在负责侦察，请先停止侦察';
  if(id&&s.campaign.domestic.orders.some(q=>q.officerIds.includes(id)))return '该武将已有待执行命令';
  if(id)s.campaign.diplomacy.assignments=s.campaign.diplomacy.assignments.filter(a=>a.officerId!==id);
  c.governor=id||null;return null;
}
export const cityGovernor=(s,c)=>{const o=residentOfficer(s,c.governor);return o&&o.location===c.id&&o.faction===c.owner?o:undefined;};
export const governorSkillList=(s,c)=>{const governor=cityGovernor(s,c);return governor?passiveList(governor.unit).filter(p=>p.effects&&p.unlocked):[];};
export const projectCost=(s,c,key)=>Math.ceil(PROJECTS[key].cost*(1-(domesticEffects(cityGovernor(s,c)?.unit).projectDiscount||0)));
export const reliefAmount=(s,c)=>15+(domesticEffects(cityGovernor(s,c)?.unit).relief||0);
export function cityIncome(s,c){
 return cityRecurringIncome(s,c);
}
// Shared by the actual turn settlement and controlled economic audits.
export function settleCityEconomy(s,c,{income=cityIncome(s,c)}={}){
 const upkeep=cityMaintenance(s,c),paidGold=Math.min(c.gold+income.gold,upkeep.gold);
 addCityGold(s,c,income.gold-paidGold);
 c.grain=Math.min(grainCapacity(c),c.grain+income.grain);
 c.manpower=Math.min(ECONOMY_RULES.capacity.manpowerMax,c.manpower+income.manpower);
 return {income,upkeep,paidGold,gold:income.gold-paidGold,grain:income.grain,manpower:income.manpower};
}
function advanceCommissionedProjects(s){
 for(const c of s.cities){const besieged=activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===c.id);
    if(!besieged&&c.project&&!c.project.domestic&&constructionSiteAvailable(s,c,c.project.siteId)&&(c.project.mode==='repair'||canExpandBuilding(s,c,c.project.key,c.project.siteId))){const record=buildingDurability(c,c.project.key,c.project.siteId);c.project.remaining=Math.max(c.project.remaining,(record.maxHp-record.hp)/c.project.hpPerDay/10);restoreBuilding(c,c.project.key,c.project.siteId,c.project.hpPerDay);c.project.remaining=Math.max(.01,(record.maxHp-record.hp)/c.project.hpPerDay/10);if(record.hp>=record.maxHp){const p=PROJECTS[c.project.key],siteId=c.project.siteId,level=localBuildingLevel(c,p.field,siteId),before=cityBaseIncome(s,c);if(c.project.mode==='build'){c[p.field]++;if(siteId!==c.id)c.domestic.buildingSites[p.field].push(siteId);}const after=cityBaseIncome(s,c),text=`${c.name}完成${p.name}`;appendActivityNode(s,{sourceId:`project:${c.id}:${s.campaign.day}:${p.field}`,category:'domestic',phase:'complete',faction:c.owner,cityId:c.id,siteId,key:'build_'+p.field,text,result:{reward:{kind:'building',mode:c.project.mode,beforeHp:c.project.startedHp,afterHp:record.hp,maxHp:record.maxHp,buildingKey:p.field,siteId,beforeLevel:level,afterLevel:localBuildingLevel(c,p.field,siteId),incomeDelta:Object.fromEntries(['gold','grain','manpower'].map(k=>[k,after[k]-before[k]]))}}});c.project=null;}}
 }
}
function finishTurn(s){
  finishTreasureTurn(s);
  const summary=s.campaign.activity.nodes.filter(n=>n.sourceId.startsWith('project:')&&n.faction===playerFaction(s)&&n.day>=s.campaign.day-9&&n.day<=s.campaign.day).map(n=>n.text),harvestCities=[];
  for(const c of s.cities){
    const besieged=activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===c.id);

    c.drafted=0;
    const before={grain:c.grain,manpower:c.manpower};
    const result=settleCityEconomy(s,c,besieged?{income:{gold:0,grain:0,manpower:0}}:{}),income=result.income;
    if(c.owner===playerFaction(s))harvestCities.push({id:c.id,name:c.name,credited:{gold:income.gold,grain:c.grain-before.grain,manpower:c.manpower-before.manpower}});
    if(c.owner===playerFaction(s))summary.push(`${c.name}：产出${income.gold}金、${income.grain}粮、${income.manpower}预备兵；军费${result.paidGold}金${result.paidGold<result.upkeep.gold?'（军费未足额支付）':''}`);
    if(besieged)continue;
    const governor=cityGovernor(s,c);
    if(governor&&c.owner===playerFaction(s)){const amount=s.campaign.activity.nodes.filter(n=>n.sourceId.startsWith(`merit:governor:${c.id}:`)&&n.officerId===governor.unit.id&&n.day>s.campaign.day-10).reduce((n,x)=>n+x.result.growth.gained,0);if(amount)summary.push(`${governor.unit.name}本旬治政功绩 +${amount}`);}
  }
  s.campaign.turnReports.unshift({turn:s.turn,items:summary});s.campaign.turnReports=s.campaign.turnReports.slice(0,12);
  finishHarvestTurn(s,harvestCities);
}
function blocked(s,from,to,faction,road){return s.armies.some(a=>factionsHostile(s,a.faction,faction)&&liveSoldiers(s,a)>0&&sameEdge(a.travel,from,to,road));}
export function supplyConnection(s,a){
  const encounter=armyBattle(s,a.id);
  const siegeEndpoint=!a.travel&&encounter?.kind==='siege'&&encounter.cityId===a.location&&campaignBattleSide(s,encounter,a)===encounter.attackSide?a.location:null;
  let best=null;
  // Each depot search sees the same roads, permissions and hostile occupation.
  // These local query caches expire on return; stock, movement and battles are
  // always measured again on the next call, including actual daily settlement.
  const neighbors=new Map(),variants=new Map(),allowed=new Map(),blockedNodes=new Map();
  for(const [x,y]of s.roads){if(!neighbors.has(x))neighbors.set(x,[]);if(!neighbors.has(y))neighbors.set(y,[]);neighbors.get(x).push(y);neighbors.get(y).push(x);}
  const nodeBlocked=id=>{if(!blockedNodes.has(id))blockedNodes.set(id,junctionBlocked(s,id,a.faction));return blockedNodes.get(id);};
  const canPass=id=>{if(!allowed.has(id))allowed.set(id,isJunction(s,id)||city(s,id).owner===a.faction||id===siegeEndpoint||!!diplomaticPassage(s,a.faction,id,'military',null,a));return allowed.get(id);};
  const roads=(from,to)=>{const key=edgeKey(from,to);if(!variants.has(key))variants.set(key,campaignRoads(s,from,to).filter(r=>!blocked(s,from,to,a.faction,r.id)));return variants.get(key);};
  for(const source of s.cities.filter(c=>c.owner===a.faction&&c.grain>0)){
    // Dijkstra over controlled depots; hostile road occupation cuts the connection.
    const queue=[{id:source.id,distance:0,path:[source.id],roads:[]}],seen=new Set();
    while(queue.length){let minimum=0;for(let i=1;i<queue.length;i++)if(queue[i].distance<queue[minimum].distance||queue[i].distance===queue[minimum].distance&&queue[i].id.localeCompare(queue[minimum].id)<0)minimum=i;
      const [p]=queue.splice(minimum,1);if(seen.has(p.id))continue;seen.add(p.id);
      if(p.distance>CAMPAIGN.supplyRange)continue;
      if(nodeBlocked(p.id))continue;
      if(p.id===a.location){const distance=p.distance+(a.travel?a.travel.progress/roadLength(s,a.travel.from,a.travel.to)*roadCost(s,a.travel.from,a.travel.to,a.travel.road||'main'):0);if(distance<=CAMPAIGN.supplyRange){const rate=Math.max(30,Math.floor((240+source.granary*120)/(1+distance/90)));if(!best||rate>best.rate||rate===best.rate&&source.id<best.source)best={source:source.id,path:p.path,roads:p.roads,distance:round(distance),rate};}break;}
      // The attacking camp is a delivery endpoint outside the hostile city,
      // never a controlled depot through which other supply routes may pass.
      for(const next of neighbors.get(p.id)||[]){if(seen.has(next)||!canPass(next))continue;for(const road of roads(p.id,next))queue.push({id:next,distance:p.distance+road.cost,path:[...p.path,next],roads:[...p.roads,road.id]});}
    }
  }
  if(a.travel){const t=a.travel;
    if(s.armies.some(e=>factionsHostile(s,e.faction,a.faction)&&sameEdge(e.travel,t.from,t.to,t.road||'main')&&liveSoldiers(s,e)>0&&((e.travel.from===t.from?e.travel.progress:roadLength(s,t.from,t.to)-e.travel.progress)<t.progress-.01)))return null;
  }
  return best;
}
function desert(u,amount){u.hp-=amount;u.battleDamage+=amount;u.battleDeserted=(u.battleDeserted||0)+amount;if(!u.hp){u.status='defeated';u.action='断粮解散';}}
function disband(s,a){
  const r=armyBattle(s,a.id);
  const returning=[];
  if(r)for(const u of r.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id&&!u.retreatDispatched))desert(u,u.hp);
  for(const unit of a.units){const home=s.cities.find(c=>c.id===unit.homeCity&&c.owner===a.faction)||s.cities.find(c=>c.owner===a.faction);returning.push({unit:{...copy(unit),troops:0,wounded:0,homeCity:home?.id||a.location},faction:a.faction,location:a.location,destination:home?.id||null,remainingDays:home?Math.max(1,Math.ceil(Math.hypot(city(s,a.location).x-home.x,city(s,a.location).y-home.y)/70)):0});}
  for(const o of returning)if(o.destination)startPersonnelJourney(s,o);
  if(r){a.disbanded=true;a.returningOfficers=returning;a.units.forEach(u=>{u.troops=0;u.wounded=0;});}else {s.campaign.idle.push(...returning);s.armies=s.armies.filter(x=>x!==a);}
  log(s,`第 ${s.campaign.day} 天：${a.name}缺粮五日，部队解散，武将返城。`,'war');
}
export function dailySupply(s){
 for(const c of s.cities){if(!c.units.length)continue;const need=foodConsumption(c.units.reduce((n,u)=>n+u.troops,0),c.units.reduce((n,u)=>n+u.wounded,0)),paid=Math.min(c.grain,need);c.grain=round(c.grain-paid);c.hunger=round(Math.max(0,Math.min(5,c.hunger+(need&&paid<need?1-paid/need:-1))));
  if(c.hunger>=5){s.campaign.idle.push(...c.units.map(unit=>({unit:{...unit,troops:0,wounded:0},faction:c.owner,location:c.id,destination:null,remainingDays:0})));c.units=[];continue;}
  if(c.hunger>=3)for(const u of c.units)u.troops=Math.floor(u.troops*.9);
  if(c.hunger===0)for(const u of c.units){const n=Math.min(u.wounded,18+c.barracks*6+c.clinic*6);u.wounded-=n;u.troops+=n;}
 }
  const budgets=new Map(s.cities.map(c=>[c.id,citySupplyCapacity(c)])),edges=new Map();
  for(const a of [...s.armies].filter(a=>!a.disbanded).sort((a,b)=>a.supply/Math.max(1,dailyConsumption(s,a))-b.supply/Math.max(1,dailyConsumption(s,b))||a.id.localeCompare(b.id))){
    const need=dailyConsumption(s,a),link=supplyConnection(s,a);a.supplyLine=link;a.supplyIn=0;
    if(link){const source=city(s,link.source),amount=allocateSupply(a,link,source.grain,budgets,edges);
      a.supply=round(a.supply+amount);source.grain=round(source.grain-amount);a.supplyIn=round(amount);
    }
    const paid=Math.min(need,a.supply);a.supply=round(a.supply-paid);a.hunger=round(Math.max(0,Math.min(5,a.hunger+(need&&paid<need?1-paid/need:-1))));
    if(a.hunger>=5){disband(s,a);continue;}
    const r=armyBattle(s,a.id);if(r){for(const u of r.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id&&!u.retreatDispatched)){u.supplyPenalty=hungerPenalty(a);if(a.hunger>=3)desert(u,Math.ceil(u.hp*.1));}}
    else if(a.hunger>=3){for(const u of a.units)u.troops=Math.floor(u.troops*.9);}
    if(!r&&!a.travel&&!a.route.length&&city(s,a.location).owner===a.faction&&a.hunger===0){if(s.campaign.scenarioId)a.morale=Math.min(80,a.morale+2);for(const u of a.units){const n=Math.min(u.wounded,18+city(s,a.location).barracks*6+city(s,a.location).clinic*6);u.wounded-=n;u.troops+=n;}}
  }
  syncResources(s);
}
function enemyOrders(s){
  if(s.campaign.scenarioId){manageStrategicEconomy(s);planStrategicAI(s);return;}
  for(const a of [...s.armies,...cityForces(s)].filter(a=>a.faction!==playerFaction(s)&&a.faction!=='neutral'&&!a.disbanded)){
    if(a.diplomaticTask||a.stationary||a.cooldownDay>s.campaign.day||a.units.filter(u=>u.troops>0).length>10||a.route.length||armyBattle(s,a.id)||!armyTroops(a))continue;
    const targets=s.cities.filter(c=>factionsHostile(s,a.faction,c.owner)&&(s.campaign.scenarioId?c.owner!==a.faction:c.owner===playerFaction(s))).map(c=>({c,route:findCampaignRoute(s,a.travel?.to||a.location,c.id,a.faction)})).filter(x=>x.route);
    targets.sort((x,y)=>x.route.length-y.route.length||x.c.id.localeCompare(y.c.id));
    if(targets[0]){if(a.cityForce){const c=city(s,a.location);a.units=c.units.slice(0,10);c.units=c.units.slice(10);a.id=`a${s.nextId++}`;a.name=a.units[0].name+'军';a.supplyCapacity=a.units.length*900;a.supply=Math.min(c.grain,a.supplyCapacity);c.grain-=a.supply;delete a.cityForce;normalize(a);s.armies.push(a);}a.route=a.travel?[a.travel.to,...targets[0].route]:targets[0].route;a.target=targets[0].c.id;a.task='出征';}
  }
}
export function beginExecution(s){
  if(!isPlanning(s))return '当前不在战略筹划阶段';
  beginHarvestTurn(s);
  for(const a of s.armies)if(a.detached&&!a.route.length)a.detached=false;
  consolidateCityArmies(s);generateDomesticOpportunities(s);
  // Allocate the new turn's military commitments before starting new civil work.
  if(s.campaign.scenarioId){manageStrategicEconomy(s);planStrategicAI(s);}
  planDiplomaticAI(s);
  beginDomesticTurn(s);enemyOrders(s);reconcileDomestic(s);s.campaign.phase='executing';updateCityBudgetAlerts(s);recordOfficerActivities(s);
  const resume=battleRecord(s,s.campaign.resumeId);if(resume&&!resume.settled){s.campaign.focusId=resume.id;s.battle=resume.battle;resume.control='manual';}
  s.campaign.lastNotice=s.campaign.allAI?`第 ${s.campaign.day} 天：各势力由 AI 办理本旬军政，观战继续。`:`第 ${s.campaign.day} 天：诸军奉令，开始执行本旬命令。`;syncResources(s);return null;
}
function terrainFor(s,from,to){if(s.campaign.scenarioId){const places=[city(s,from),city(s,to)];if(places.some(c=>c?.kind==='port'))return 'river';if(places.some(c=>c?.kind==='gate'))return 'hill';if(places.some(c=>['南中','巴蜀'].includes(c?.province)))return 'forest';return 'land';}if([from,to].includes('baima'))return 'river';if([from,to].includes('jinyang'))return 'hill';if([from,to].includes('wan'))return 'forest';if([from,to].includes('runan'))return 'marsh';return 'land';}
// Coalition membership comes from a signed, specific military task. Original
// factions remain on strategic armies; the combat engine still has two sides.
function supportsFaction(s,a,faction,enemy){const task=a.diplomaticTask;return !!task&&task.recipient===faction&&task.enemy===enemy&&task.untilDay>=s.campaign.day&&s.campaign.diplomacy.contracts.some(p=>p.id===task.contractId&&p.status==='signed')&&!factionsHostile(s,a.faction,faction);}
export function campaignBattleSide(s,r,a){const joined=r.battle.sides.findIndex(x=>x.units.some(u=>u.armyId===a.id));if(joined>=0)return joined;const exact=r.battle.sides.findIndex(x=>x.faction===a.faction);if(exact>=0)return exact;return r.battle.sides.findIndex((x,i)=>supportsFaction(s,a,x.faction,r.battle.sides[1-i].faction)||r.armies.some(ally=>r.battle.sides[i].units.some(u=>u.armyId===ally.id)&&supportsFaction(s,ally,a.faction,r.battle.sides[1-i].faction)));}
function makeEncounter(s,attacker,defenders,cityId,kind,point){
  const previous=armyBattle(s,attacker.id);if(previous)return previous;
  const defendingFaction=kind==='siege'?city(s,cityId).owner:defenders[0]?.faction;
  defenders=defenders.filter(a=>a.faction===defendingFaction||supportsFaction(s,a,defendingFaction,attacker.faction));
  const proxy=newGame(s.seed+s.nextId*997);if(s.campaign.scenarioId)Object.assign(proxy,nationalWorld(s.campaign.scenarioId));proxy.campaign={playerFaction:s.campaign.allAI?attacker.faction:playerFaction(s)};proxy.relationshipScores=copy(s.relationshipScores);proxy.relationshipTypes=copy(s.relationshipTypes);
  if(kind==='siege'&&city(s,cityId).units.some(u=>!u.mission&&u.troops>0)){const c=city(s,cityId),guard={...cityForce({...c,units:c.units.filter(u=>!u.mission&&u.troops>0)}),id:`a${s.nextId++}`,name:c.name+'守城军',defense:true};delete guard.cityForce;guard.units.forEach((u,i)=>u.first=i<armyFrontlineCapacity(guard));c.grain=round(c.grain-guard.supply);c.units=c.units.filter(u=>!guard.units.includes(u));s.armies.push(guard);defenders.push(guard);}
  if(kind==='siege')for(const u of defenders.flatMap(a=>a.units).filter(u=>u.troops>0&&!u.mission)){
    const appointment=assignmentFor(s,u.id);cancelDomestic(s,u.id,'参加守城');
    if(appointment){appointment.action=null;appointment.waiting='守城结束后继续任职';s.campaign.domestic.assignments.push(appointment);}
  }
  const members=[attacker,...defenders],human=s.campaign.allAI?null:playerFaction(s),humanDefends=defenders.some(a=>a.faction===human)||kind==='siege'&&city(s,cityId).owner===human,attackSide=s.campaign.allAI||attacker.faction===human||!humanDefends&&supportsFaction(s,attacker,human,defendingFaction)?0:1;
  const attackFaction=s.campaign.allAI?attacker.faction:attackSide===0?human:attacker.faction,defenseFaction=humanDefends?human:defendingFaction;
  proxy.armies=members.map(a=>({...copy(a),faction:a===attacker?attackFaction:defenseFaction,location:cityId,route:[],target:null}));
  const c=city(proxy,cityId),real=city(s,cityId);if(isJunction(proxy,cityId))Object.assign(c,{garrison:0,units:[]});c.owner=kind==='siege'?real.owner:attacker.faction;c.garrison=kind==='siege'?real.garrison:0;
  proxy.pending={attackerId:attacker.id,defenderIds:defenders.map(a=>a.id),cityId,origin:attacker.location,defenderFaction:defenseFaction||real.owner};
  startBattle(proxy,{deferEnemyDeployment:true});const b=proxy.battle,id=`campaign-battle-${s.nextId++}`;b.id=id;b.reinforcementCouncil=null;
  b.maxTicks=CAMPAIGN.stepsPerDay*CAMPAIGN.maxBattleDays;
  if(!b.sides[0].units.length&&attacker.faction!==playerFaction(s)&&real.owner!==playerFaction(s)&&kind==='siege'){
    // Engine's garrison side defaults to enemy for non-player factions.
    const guards=b.sides[1].units.filter(u=>u.armyId.startsWith('city:'));b.sides[1].units=b.sides[1].units.filter(u=>!guards.includes(u));
    b.sides[0].units=guards.map(u=>({...u,side:0,status:'reserve',x:-1,y:-1}));
  }
  b.sides[attackSide].faction=attackFaction;b.sides[1-attackSide].faction=defenseFaction||real.owner;
  b.terrain=members.some(a=>a.units.some(u=>u.troops>0&&u.type==='ship'))?'river':terrainFor(s,attacker.travel?.from||attacker.location,attacker.travel?.to||cityId);
  // Rebuild legal positions after selecting the map-derived terrain.
  for(const side of b.sides)for(const u of side.units){u.status='reserve';u.x=-1;u.y=-1;u.supplyPenalty=hungerPenalty(members.find(a=>a.id===u.armyId)||{hunger:0});}
  if(kind==='siege'){
    const side=1-attackSide;b.siege={attackerSide:attackSide,gate:{id:'siege-gate',name:'城门',type:'gate',side,x:side===0?1:12,y:4,hp:gateDurability(real).hp,maxHp:gateDurability(real).maxHp,source:{cityId:real.id,siteId:real.id,key:'walls'},initialHp:gateDurability(real).hp}};
  }
  b.buildingSiteId=kind==='siege'||isJunction(s,cityId)&&!attacker.travel?cityId:null;
  if(b.buildingSiteId)b.buildings=campaignBattleBuildings(s,cityId,1-attackSide,b.sides.map(side=>side.faction));
  initializeBattleSlots(b,{aiSides:b.sides.map((side,i)=>isAIControlled(s,side.faction)?i:null).filter(i=>i!==null)});
  if(kind==='siege')b.domesticOpening={...siegeOpening(real,s.campaign.day),applied:false,side:1-attackSide};
  const r={id,name:kind==='siege'?`${real.name}攻守战`:isJunction(s,cityId)&&!attacker.travel?`${real.name}${real.kind==='port'?'港口战':real.kind==='gate'?'关卡战':'遭遇战'}`:`${city(s,attacker.travel?.from||attacker.location).name}道遭遇战`,cityId,kind,point:copy(point),attackSide,armyIds:members.map(a=>a.id),armies:copy(members),startedDay:s.campaign.day,endedDay:null,control:'auto',awaiting:members.some(a=>isPlayerControlled(s,a.faction))||isPlayerControlled(s,real.owner)&&kind==='siege',settled:false,battle:b,templates:{},snapshots:[],report:null};
  members.forEach(a=>{a.task='交战';a.route=[];a.target=null;});
  s.campaign.battles.push(r);initializeRetreatDestinations(s,r);captureDay(s,r);if(!r.awaiting)lockDeployment(b,{validateCount:false});
  log(s,`第 ${s.campaign.day} 天：${needsSiegeDefense(r)?`${real.name}敌军抵城，等待编制守军或放弃守城。`:`${r.name}爆发。`}`,'war');return r;
}
// Reuse the engine's legal terrain/slot placement without advancing time or intent.
import {fillSlots} from './engine.mjs';
function initializeBattleSlots(b,{aiSides=[1]}={}){for(const side of [0,1])if(aiSides.includes(side))planBattleCouncilAI(b,side);else fillSlots(b,side,{ai:false});}
function joinBattle(s,r,a){
  if(r.battle.sides.flatMap(x=>x.units).some(u=>u.status==='withdrawn'&&a.units.some(v=>v.id===u.id))){a.route=[];a.target=null;a.task='已撤离本场，外围待命';return;}
  if(r.armyIds.includes(a.id)||r.settled)return;
  const side=campaignBattleSide(s,r,a);if(side<0)return;
  const leader=a.units.find(u=>u.id===a.leader&&u.troops>0),advisor=a.units.find(u=>u.id===a.advisor&&u.troops>0);
  r.armies.push(copy(a));r.armyIds.push(a.id);r.battle.context[side===r.attackSide?'attackingIds':'defenderIds'].push(a.id);
  r.battle.sides[side].commanders.push(...armyCommanders(a));r.battle.sides[side].organizationCommanders.push(...armyCommanders(a));
  for(const source of a.units.filter(u=>u.troops>0))r.battle.sides[side].units.push({...combatUnit(source,a.id,side,a.morale),commandBonus:(leader?.leadership||0)/1000,advisorBonus:(advisor?.intellect||0)/1000,supplyPenalty:hungerPenalty(a),arrivalTick:r.battle.tick,wave:r.armyIds.length});
  if(isAIControlled(s,a.faction)||side===0&&r.control==='auto'){planArrivalAppointmentsAI(r.battle,side);syncEncounterAppointments(s,r);}
  a.route=[];a.target=null;a.task='交战';log(s,`第 ${s.campaign.day} 天：${a.name}抵达${r.name}，进入预备序列。`,'war');
  if(r.battle.deploymentLocked&&isPlayerControlled(s,r.battle.sides[side].faction)&&!r.battle.sides[side].retreat){
    r.battle.reinforcementCouncil='pending';
    s.campaign.lastNotice=`${a.name}抵达${r.name}，可进入军议调整后备。`;
  }
}
function moveArmies(s){
  const movements=[];
  for(const a of s.armies){if(a.disbanded||armyBattle(s,a.id)||!a.route.length||a.cooldownDay>s.campaign.day||!armyTroops(a))continue;
    const next=a.travel?.to||a.route[0],owner=city(s,next)?.owner,withdrawal=a.diplomaticWithdrawal?.route.includes(next);
    if(owner&&owner!==a.faction&&owner!=='neutral'&&!factionsHostile(s,a.faction,owner)&&!withdrawal&&!diplomaticPassage(s,a.faction,next,'military',null,a)){a.task='等待军事通行许可';continue;}
    if(!a.travel)a.travel={from:a.location,to:a.route[0],progress:0,road:chosenRoad(s,a.location,a.route[0],a.roadPolicy).id};
    const t=a.travel,ground=chosenRoad(s,t.from,t.to,t.road||'main').terrain;if(ground==='water'&&a.units.some(u=>u.troops>0&&!u.equipment.ship)){a.task='缺少船只，等待整备';continue;}t.terrain=ground;const length=roadLength(s,t.from,t.to),before=t.progress;t.progress=Math.min(length,round(t.progress+armyActionPoints(a)*length/roadCost(s,t.from,t.to,t.road||'main')));movements.push({a,before,after:t.progress,length});
    if(t.progress>before&&a.marchMode==='forced'){const rule=armyStrategicTrait(a,'forcedMarch')?.strategic;if(rule&&a.morale>=rule.minimum&&a.hunger===0)a.morale=Math.max(0,a.morale-rule.morale);if(!rule||a.morale<(rule?.minimum||40)||a.hunger>0){a.marchMode='normal';a.marchRestUntil=s.campaign.day+(rule?.recovery||2);}}
  }
  // Swept intervals catch head-on crossings even if neither ends at a city.
  for(let i=0;i<movements.length;i++)for(let j=i+1;j<movements.length;j++){
    const x=movements[i],y=movements[j];if(!factionsHostile(s,x.a.faction,y.a.faction)||armyBattle(s,x.a.id)||armyBattle(s,y.a.id)||!sameEdge(y.a.travel,x.a.travel.from,x.a.travel.to,x.a.travel.road||'main'))continue;
    const same=x.a.travel.from===y.a.travel.from,y0=same?y.before:x.length-y.before,y1=same?y.after:x.length-y.after;
    if((x.before-y0)*(x.after-y1)>0)continue;
    const denom=(x.after-x.before)-(y1-y0),time=denom?Math.max(0,Math.min(1,(y0-x.before)/denom)):0;
    const p=round(x.before+(x.after-x.before)*time);x.a.travel.progress=p;y.a.travel.progress=same?p:x.length-p;
    makeEncounter(s,x.a,[y.a],x.a.travel.to,'field',armyPosition(s,x.a));
  }
  for(const m of movements){const a=m.a;if(armyBattle(s,a.id))continue;
    // An army reaches an ongoing battle along the same road, rather than joining remotely.
    const r=activeBattles(s).find(r=>r.armyIds.some(id=>{const target=army(s,id);if(!target?.travel||!sameEdge(target.travel,a.travel.from,a.travel.to,a.travel.road||'main'))return false;const p=target.travel.from===a.travel.from?target.travel.progress:m.length-target.travel.progress;return p>=m.before-.01&&p<=m.after+.01;}));
    if(r&&campaignBattleSide(s,r,a)>=0){const target=r.armyIds.map(id=>army(s,id)).find(x=>sameEdge(x?.travel,a.travel.from,a.travel.to,a.travel.road||'main'));a.travel.progress=target.travel.from===a.travel.from?target.travel.progress:m.length-target.travel.progress;joinBattle(s,r,a);continue;}
    // Stationary armies may be waiting in the middle of a road after combat.
    const defender=s.armies.find(e=>factionsHostile(s,e.faction,a.faction)&&!e.disbanded&&!armyBattle(s,e.id)&&e.cooldownDay<=s.campaign.day&&sameEdge(e.travel,a.travel.from,a.travel.to,a.travel.road||'main')&&liveSoldiers(s,e)>0&&(()=>{const p=e.travel.from===a.travel.from?e.travel.progress:m.length-e.travel.progress;return p>=m.before-.01&&p<=m.after+.01;})());
    if(defender){a.travel.progress=defender.travel.from===a.travel.from?defender.travel.progress:m.length-defender.travel.progress;makeEncounter(s,a,[defender],a.travel.to,'field',armyPosition(s,a));continue;}
    if(a.travel.progress<m.length)continue;
    const destination=a.travel.to,existing=activeBattles(s).find(r=>r.cityId===destination&&(r.kind==='siege'||isJunction(s,destination)&&r.kind==='field'&&r.armies.every(a=>!a.travel)));
    if(existing&&campaignBattleSide(s,existing,a)<0){a.travel.progress=Math.max(0,m.length-.01);a.task=isJunction(s,destination)?'路口交战，外围待命':'围城外待命';continue;}
    a.location=destination;a.travel=null;a.route.shift();
    if(existing&&campaignBattleSide(s,existing,a)>=0){joinBattle(s,existing,a);continue;}
    const defenders=s.armies.filter(e=>e!==a&&!e.travel&&e.location===destination&&factionsHostile(s,e.faction,a.faction)&&!armyBattle(s,e.id)&&armyTroops(e)>0);
    const c=city(s,destination);
    if(isJunction(s,destination)){
      if(defenders.length){makeEncounter(s,a,defenders,destination,'field',armyPosition(s,a));continue;}
      if(!a.route.length){a.target=null;a.task=({gate:'关卡驻守',port:'港口驻守'}[c.kind]||'路口驻守');}
      continue;
    }
    // Give both controllers a real muster opportunity before declaring a city empty.
    if(factionsHostile(s,c.owner,a.faction)){
      const plan=siegeDefensePlan(s,c.id);
      if(plan.officerIds.length&&isAIControlled(s,c.owner)){
        const error=prepareDepartureUnits(s,c.id,plan.officerIds,plan.types,false,plan.troops,[],{},{scheduled:true,faction:c.owner});
        if(!error)log(s,`第 ${s.campaign.day} 天：${c.name}临时编制守军，调用${plan.men}预备兵、支用${plan.gold}金。`,'war');
      }else if(plan.officerIds.length&&isPlayerControlled(s,c.owner)&&!defenders.length&&!c.garrison&&!c.units.some(u=>!u.mission&&u.troops>0)){
        makeEncounter(s,a,defenders,destination,'siege',armyPosition(s,a));continue;
      }
    }
    // Walls alone cannot defend a city after the muster opportunity.
    if(defenders.length||factionsHostile(s,c.owner,a.faction)&&(c.garrison>0||c.units.some(u=>!u.mission&&u.troops>0))){makeEncounter(s,a,defenders,destination,factionsHostile(s,c.owner,a.faction)?'siege':'field',armyPosition(s,a));continue;}
    if(factionsHostile(s,c.owner,a.faction))occupyEmptyCity(s,c,a);
    if(c.owner===a.faction&&armyStrategicTrait(a,'resupplyStop')){const amount=Math.max(0,Math.min(a.supplyCapacity-a.supply,c.grain-cityFoodReserve(s,c)-plannedGrain(s,c.id)));a.supply+=amount;c.grain-=amount;}
    if(!a.route.length){a.target=null;a.task='驻守';delete a.diplomaticWithdrawal;}
  }
}
function occupyEmptyCity(s,c,a){
 const previous=c.owner,eventId=`occupation:${a.id}:${c.id}:${s.campaign.day}`;
 c.owner=a.faction;recordOccupation(s,c,previous,eventId,[a]);noteTalentCityCapture(s,previous,c.owner,eventId);displaceCityOfficers(s,c.id,previous,eventId);c.governor=null;reconcileDomestic(s);
}
export function needsSiegeDefense(r){
 return !!r&&r.kind==='siege'&&r.awaiting&&!r.settled&&r.battle.tick===0&&!r.battle.sides[1-r.attackSide].units.some(u=>u.hp>0);
}
export function relinquishSiegeDefense(s,id){
 const r=battleRecord(s,id),c=r&&city(s,r.cityId),a=r&&army(s,r.armyIds[0]);
 if(!needsSiegeDefense(r)||c?.owner!==playerFaction(s)||s.campaign.allAI||!a)return '只能放弃尚未编制守军的己方守城军议';
 s.campaign.battles=s.campaign.battles.filter(b=>b.id!==id);
 for(const record of Object.values(s.campaign.vision.factions))record.battles=record.battles.filter(b=>b!==id);
 occupyEmptyCity(s,c,a);a.route=[];a.target=null;a.task='驻守';
 if(s.campaign.focusId===id){s.campaign.focusId=null;s.battle=null;}if(s.campaign.resumeId===id)s.campaign.resumeId=null;
 reconcileScouting(s);syncResources(s);updateVision(s);recordOfficerActivities(s);
 log(s,`第 ${s.campaign.day} 天：${c.name}放弃编制守军，敌军直接占领。`,'war');return null;
}
function returnArmy(s,a,r,lost){
  a.cooldownDay=s.campaign.day+2;a.route=[];a.target=null;a.task=lost?'撤退':'整队';
  if(!lost)return;
  delete a.defense;
  const best=nearestRetreat(s,a.faction,a.location,roadEdgeForArmy(s,a));
  if(best){
   const {path}=best;a.location=path.location;a.route=path.route;a.target=a.route.length?best.id:null;
   a.travel=path.route.length&&path.progress>0?{from:path.location,to:path.route[0],road:'main',progress:roadLength(s,path.location,path.route[0])*path.progress/roadCost(s,path.location,path.route[0])}:null;
  }

}
function splitRetreatingArmy(s,a){
  if(a.units.filter(u=>u.troops>0).length<=10||!a.route.length&&!a.travel)return;
  const live=a.units.filter(u=>u.troops>0),followers=a.units.filter(u=>u.troops===0);
  const groups=[];for(let i=0;i<live.length;i+=10)groups.push(live.slice(i,i+10));
  const leaderGroup=groups.findIndex(units=>units.some(u=>u.id===a.leader));if(leaderGroup>0)groups.unshift(groups.splice(leaderGroup,1)[0]);
  groups[0].push(...followers);
  const total=a.units.length,capacity=a.supplyCapacity,supply=a.supply;let usedCapacity=0,usedSupply=0;
  groups.forEach((units,i)=>{const last=i===groups.length-1,partCapacity=last?capacity-usedCapacity:Math.floor(capacity*units.length/total),partSupply=last?supply-usedSupply:Math.floor(supply*units.length/total),group=i?{...copy(a),id:`a${s.nextId++}`,name:`${units[0].name}撤退军`}:a;
    group.units=units;group.supplyCapacity=partCapacity;if(group.marchMode==='light')group.fullSupplyCapacity=partCapacity*2;group.supply=partSupply;usedCapacity+=partCapacity;usedSupply=round(usedSupply+partSupply);normalize(group);if(i)s.armies.push(group);
  });
}
function recordOccupation(s,c,previous,eventId,armies){
 for(const faction of new Set([previous,c.owner]))if(faction&&faction!=='neutral'){
  const members=armies.filter(a=>a.faction===faction),officerId=OFFICER_BY_ID[members[0]?.leader]?members[0].leader:null;
  appendActivityNode(s,{sourceId:`occupation:${eventId}:${faction}`,category:'occupation',phase:faction===c.owner?'captured':'lost',faction,officerId,officerIds:members.flatMap(a=>a.units.filter(u=>OFFICER_BY_ID[u.id]).map(u=>u.id)),cityId:c.id,text:`${c.name}${faction===c.owner?'已由本方占领':'失守'}，归属由${FACTIONS[previous]?.name||'中立'}变为${FACTIONS[c.owner]?.name||c.owner}。`,result:{previous,owner:c.owner}});
 }
}
function settleEncounter(s,r){
  if(r.settled||!r.battle.result)return;
  const treasureCandidates=treasureCaptureCandidates(s,r.battle);
  dispatchWithdrawn(s,r);
  const b=r.battle,stats=b.sides.map(side=>({faction:side.faction,initial:0,remaining:0,wounded:0,killed:0,escaped:0})),growth=[];
  for(let side=0;side<2;side++)for(const u of b.sides[side].units){const st=stats[side],wounded=battleWounded(u),escaped=u.battleDeserted||0;st.initial+=u.initial;st.remaining+=u.hp;st.wounded+=wounded;st.escaped+=escaped;st.killed+=u.initial-u.hp-wounded-escaped;
    if(u.retreatDispatched){
      const source=[...s.armies.flatMap(a=>a.units),...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit),...s.campaign.domestic.people.map(p=>p.unit)].find(v=>v?.id===u.id);
      if(source&&(u.participated||battleMerit(u,false).score>0)){const merit=battleMeritResult(u,b),g=settleOfficerMerit(s,source,{sourceId:`battle:${r.id}`,amount:merit.net,faction:b.sides[side].faction,cityId:r.cityId,category:'battle',reason:'战果结算'});growth.push({id:u.id,side,name:u.name,...merit,...g});}continue;
    }
    const a=army(s,u.armyId),source=a?.units.find(x=>x.id===u.id);if(u.retreatDispatched||!source||a.disbanded)continue;
    source.troops=u.hp;source.wounded+=wounded;
    if(u.participated||battleMerit(u,false).score>0){const merit=battleMeritResult(u,b),g=settleOfficerMerit(s,source,{sourceId:`battle:${r.id}`,amount:merit.net,faction:b.sides[side].faction,cityId:r.cityId,category:'battle',reason:'战果结算'});growth.push({id:u.id,side,name:u.name,...merit,...g});}
  }
  const buildingChanges=writeBattleBuildingDamage(s,b);
  completeBattleBuildingWork(s,[...new Set([...(b.siege?.gate?[b.siege.gate]:[]),...b.buildings].map(a=>a.source?.cityId).filter(Boolean))]);
  if(r.kind==='siege'){
    const c=city(s,r.cityId);
    c.garrison=b.sides.flatMap(x=>x.units).filter(u=>u.armyId===`city:${c.id}`).reduce((n,u)=>n+u.hp,0);
    if(b.result.winner===r.attackSide){const previous=c.owner;c.owner=r.armies[0].faction;recordOccupation(s,c,previous,r.id,r.armies);noteTalentCityCapture(s,previous,c.owner,r.id);displaceCityOfficers(s,c.id,previous,r.id);c.garrison=0;c.governor=null;reconcileDomestic(s);refreshTalentDemand(s);}
  }
  for(const id of r.armyIds){const a=army(s,id);if(!a||a.disbanded)continue;const side=campaignBattleSide(s,r,a);const lost=b.result.winner!==side&&(b.result.winner!==null||side===r.attackSide);if(!r.diplomaticCeasefire)a.morale=Math.max(25,Math.min(100,a.morale+(lost?-18:8)));returnArmy(s,a,r,lost);}
  r.settled=true;r.awaiting=false;r.endedDay=s.campaign.day;r.report={winner:b.result.winner,reason:b.result.reason,stats,growth,buildings:buildingChanges};
  for(let side=0;side<2;side++)for(const faction of new Set([b.sides[side].faction,...r.armies.filter(a=>b.sides[side].units.some(u=>u.armyId===a.id)).map(a=>a.faction)])){
   const units=b.sides[side].units.filter(u=>(r.armies.find(a=>a.id===u.armyId)?.faction||b.sides[side].faction)===faction),leader=r.armies.find(a=>a.faction===faction)?.leader||units.find(u=>!u.cityGuard)?.id||null;
   if(!units.length)continue;const st={faction,initial:0,remaining:0,wounded:0,killed:0,escaped:0};for(const u of units){const wounded=battleWounded(u),escaped=u.battleDeserted||0;st.initial+=u.initial;st.remaining+=u.hp;st.wounded+=wounded;st.escaped+=escaped;st.killed+=u.initial-u.hp-wounded-escaped;}
   appendActivityNode(s,{sourceId:`battle:${r.id}:${faction}`,category:'battle',phase:'settled',faction,officerId:OFFICER_BY_ID[leader]?leader:null,officerIds:units.filter(u=>OFFICER_BY_ID[u.id]).map(u=>u.id),cityId:r.cityId,text:`${r.name}结束：${b.result.winner===null?'双方收兵':b.result.winner===side?'本方获胜':'本方败退'}（${b.result.reason}）。本方余兵${st.remaining}，伤兵${st.wounded}，阵亡${st.killed}。`,result:{battleId:r.id,winner:b.result.winner===null?null:b.sides[b.result.winner].faction,stats:st}});
  }
  if(!r.diplomaticCeasefire)for(let side=0;side<2;side++)for(const u of b.sides[side].units){if(u.status!=='defeated'||u.hp>0)continue;const a=army(s,u.armyId),source=a?.units.find(x=>x.id===u.id);if(u.retreatDispatched||!source||a.disbanded)continue;resolveOfficerLoss(s,{unit:source,faction:a.faction,location:a.location,enemy:b.result.winner!==null&&b.result.winner!==side?b.sides[b.result.winner].faction:null,eventId:r.id+':'+u.id,edge:roadEdgeForArmy(s,a),reason:'部队全歼',survivingArmy:a});}
  // Previously escaped followers did not fight again, so do not roll their fate
  // a second time. If their escort is now gone, they leave from its actual position.
  for(const a of s.armies.filter(a=>r.armyIds.includes(a.id)&&!a.disbanded&&!armyTroops(a))){
   for(const u of [...a.units]){removeOfficer(s,u.id);sendOfficerHome(s,u,a.faction,a.location,{edge:roadEdgeForArmy(s,a),reason:'军团失去作战部队，脱身返城'});}
  }
  s.armies=s.armies.filter(a=>a.units.length||a.disbanded);
  r.report.appointments=[];
  for(const a of [...s.armies].filter(a=>r.armyIds.includes(a.id)&&!a.disbanded))splitRetreatingArmy(s,a);
  for(const a of s.armies.filter(a=>a.disbanded&&r.armyIds.includes(a.id)))s.campaign.idle.push(...(a.returningOfficers||[]));
  s.armies=s.armies.filter(a=>!a.disbanded||!r.armyIds.includes(a.id));if(b.result.winner!==null&&b.sides[b.result.winner].faction===playerFaction(s)){s.victories++;s.fame+=30;}
  if(s.campaign.focusId===r.id){s.campaign.focusId=null;s.battle=null;}
  if(battleVisible(s,r))s.campaign.lastNotice=`${r.name}结束：${b.result.reason}。战果已回写，军团就地整队或沿路撤退。`;
  log(s,`第 ${s.campaign.day} 天：${s.campaign.lastNotice}`,'war');
  if(b.result.winner!==null&&b.sides[b.result.winner].faction===playerFaction(s)){const c=city(s,r.cityId);if(c.kind!=='junction'&&c.owner===playerFaction(s)&&b.sides[1-b.result.winner].units.some(u=>['siege','crossbow'].includes(u.type)))c.domestic.opportunities.push({kind:'capture',expires:s.campaign.day+30,amount:0,saved:0});}
  r.report.treasures=r.diplomaticCeasefire?[]:settleBattleTreasures(s,r,treasureCandidates);
  preparePostbattleAppointments(s,b,r.armyIds,r.armies);consolidateCityArmies(s);reconcileDomestic(s);syncResources(s);
}
export function settleDiplomaticCeasefire(s,a,b){
 for(const r of activeBattles(s).filter(r=>r.armies.some(x=>x.faction===a&&r.armies.some(y=>y.faction===b&&campaignBattleSide(s,r,x)!==campaignBattleSide(s,r,y))))){r.diplomaticCeasefire=true;r.battle.result={winner:null,reason:'停战退兵'};settleEncounter(s,r);}
 for(const x of s.armies.filter(x=>[a,b].includes(x.faction)&&!armyBattle(s,x.id))){const owner=city(s,x.target||x.location)?.owner;if(owner!==a&&owner!==b||owner===x.faction)continue;const best=diplomaticRetreat(s,x.faction,x.location,roadEdgeForArmy(s,x),[a,b]);if(best){x.location=best.path.location;x.route=best.path.route;x.target=x.route.length?best.id:null;x.travel=best.path.progress>0&&x.route.length?{from:x.location,to:x.route[0],road:'main',progress:roadLength(s,x.location,x.route[0])*best.path.progress/roadCost(s,x.location,x.route[0])}:null;x.task='停战退兵';x.diplomaticWithdrawal={from:a,to:b,route:[...x.route]};}}
}
function captureDay(s,r){
  for(const u of r.battle.sides.flatMap(x=>x.units))if(!r.templates[u.id])r.templates[u.id]=copy(u);
  const data=copy(r.battle);
  data.sides.forEach(side=>side.units=side.units.map(u=>Object.fromEntries(Object.entries(u).filter(([key,value])=>key==='id'||JSON.stringify(value)!==JSON.stringify(r.templates[u.id][key])))));
  const snapshot={day:s.campaign.day,tick:r.battle.tick,data};
  const index=r.snapshots.findIndex(x=>x.day===snapshot.day);if(index>=0)r.snapshots[index]=snapshot;else r.snapshots.push(snapshot);
}
function archiveCampaignBattles(s){
  if(!s.campaign.scenarioId)return;
  const c=s.campaign,completed=c.battles.filter(r=>r.settled).sort((a,b)=>b.endedDay-a.endedDay||b.startedDay-a.startedDay),old=completed.slice(20);
  if(!old.length)return;
  const ids=new Set(old.map(r=>r.id));
  c.archive.push(...old.map(r=>({id:r.id,name:r.name,startedDay:r.startedDay,endedDay:r.endedDay,reason:r.report.reason,winner:r.report.winner===null?null:r.battle.sides[r.report.winner].faction})));
  c.archive.sort((a,b)=>b.endedDay-a.endedDay||a.id.localeCompare(b.id));c.archive=c.archive.slice(0,100);
  c.battles=c.battles.filter(r=>!ids.has(r.id));if(ids.has(c.resumeId))c.resumeId=null;
}
export function readDailySnapshot(r,day){const snapshot=r.snapshots.find(x=>x.day===day);if(!snapshot)return null;const b=copy(snapshot.data);b.sides.forEach(side=>side.units=side.units.map(u=>({...copy(r.templates[u.id]),...u})));return b;}
export function chooseEncounter(s,id,manual){
  if(s.campaign.allAI&&manual)return '全 AI 观战由 AI 指挥，请查看战役回放';
  const r=battleRecord(s,id);if(!r||r.settled||!r.awaiting)return '该遭遇已处理';
  if(needsSiegeDefense(r))return '本城尚无守军，请先编制守城部队，或选择放弃守城';
  r.awaiting=false;r.control=manual?'manual':'auto';
  if(manual){delegateCurrent(s);s.campaign.focusId=id;s.campaign.resumeId=id;s.battle=r.battle;}
  else {planBattleCouncilAI(r.battle,0);lockDeployment(r.battle,{validateCount:false});}
  return null;
}
function syncEncounterAppointments(s,r){
 for(const side of r.battle.sides)for(const event of side.appointmentEvents){const a=army(s,event.armyId);if(!a)continue;
  for(const role of ARMY_ROLES){const c=side.commanders.find(c=>c.armyId===a.id&&c.role===role);if(c&&a.units.some(u=>u.id===c.id))a[role]=c.id;}
 }
}
export function appointEncounterRoles(s,armyId,roles,side=0){
 const r=activeBattles(s).find(r=>r.armyIds.includes(armyId));if(!r)return '本军团没有进行中的战场';
 const error=appointBattleRoles(r.battle,armyId,roles,side);if(error)return error;
 syncEncounterAppointments(s,r);updateVision(s);return null;
}
function delegateCurrent(s){const r=battleRecord(s,s.campaign.focusId);if(r&&!r.settled){r.control='auto';if(r.battle.reinforcementCouncil==='open')r.battle.reinforcementCouncil=null;lockDeployment(r.battle,{validateCount:false});}s.campaign.focusId=null;s.battle=null;}
export function viewCampaignMap(s){delegateCurrent(s);s.campaign.resumeId=null;}
export function takeOverBattle(s,id){
  if(s.campaign.allAI)return '全 AI 观战由 AI 指挥，请查看战役回放';
  const r=battleRecord(s,id);if(!r||r.settled)return '战役已经结束，只能查看快照';
  if(!battleVisible(s,r))return '该战场不在当前视野内';
  if(isPlanning(s))return '请先完成本旬战略操作并点击进行';
  if(r.awaiting)return chooseEncounter(s,id,true);
  const reinforcement=!!r.battle.reinforcementCouncil;
  delegateCurrent(s);r.control='manual';s.campaign.focusId=id;s.campaign.resumeId=id;s.battle=r.battle;
  if(reinforcement)r.battle.reinforcementCouncil='open';return null;
}
function prepareDay(s){
  const c=s.campaign;if(c.dayPrepared)return;
  updateCityBudgetAlerts(s);recordOfficerActivities(s);advanceDiplomacy(s);updateCaptives(s);dailySupply(s);updateVision(s);if(c.scenarioId)planStrategicAI(s);
  const before=s.armies.filter(a=>!a.disbanded&&liveSoldiers(s,a)>0).map(a=>({id:a.id,faction:a.faction,location:a.location,travel:a.travel?{...a.travel}:null,route:[...a.route],roadPolicy:a.roadPolicy,speed:armyActionPoints(a)}));
  moveArmies(s);
  const traffic=before.map(old=>{const a=army(s,old.id),t=old.travel||((a?.travel||a?.location!==old.location)&&old.route.length?{from:old.location,to:old.route[0],progress:0,road:chosenRoad(s,old.location,old.route[0],old.roadPolicy).id}:null);if(!t)return {faction:old.faction,location:old.location};const length=roadLength(s,t.from,t.to),p0=t.progress/length,p1=a?.travel?a.travel.progress/length:a?.location===t.to?1:p0;return {faction:old.faction,location:old.location,edge:{from:t.from,to:t.to,road:t.road||'main',p0,p1,until:p1>p0?Math.min(1,(p1-p0)*roadCost(s,t.from,t.to,t.road)/old.speed):1}};});
  for(const o of [...c.idle])if(o.destination&&!o.retreating&&advancePersonnel(s,o,traffic))talentArrived(s,o.unit.id);
  consolidateCityArmies(s);reconcileDomestic(s);reconcileScouting(s);manageTreasuresAI(s);syncResources(s);c.dayPrepared=true;recordOfficerActivities(s);updateVision(s);
  for(const r of activeBattles(s))captureDay(s,r);
}
export function advanceCampaignStep(s){
  if(s.campaign.allAI&&isPlanning(s))beginExecution(s);
  if(pendingArmyAppointments(s).length)return {paused:true,appointments:true};
  const c=s.campaign;if(c.phase!=='executing'||s.finished)return {paused:true};
  if(pendingDomesticProposals(s).length)return {paused:true,proposals:true};
  prepareDay(s);
  if(activeBattles(s).some(r=>r.awaiting))return {encounter:true};
  if(activeBattles(s).some(r=>r.battle.reinforcementCouncil))return {reinforcement:true};
  if(activeBattles(s).some(r=>r.control==='manual'&&!r.battle.deploymentLocked))return {deployment:true};
  for(const r of activeBattles(s)){
    if(r.battle.domesticOpening?.applied&&!r.openingConsumed){const c=city(s,r.cityId);for(const key of ['intent','shield'])if(c.domestic.preparation[key]?.actionId===r.battle.domesticOpening[key+'Id'])c.domestic.preparation[key]=null;r.openingConsumed=true;}
    const aiSides=r.battle.sides.map((side,i)=>isAIControlled(s,side.faction)||i===0&&r.control==='auto'?i:null).filter(i=>i!==null);
    stepBattle(r.battle,{aiSides,pauseForReinforcements:!s.campaign.allAI});syncEncounterAppointments(s,r);dispatchWithdrawn(s,r);if(r.battle.result)settleEncounter(s,r);
  }
  reconcileScouting(s);
  for(const o of [...c.idle])if(o.retreating&&advancePersonnel(s,o,[],1/CAMPAIGN.stepsPerDay))talentArrived(s,o.unit.id);
  if(activeBattles(s).length||c.idle.some(o=>o.retreating))recordOfficerActivities(s,{all:false});c.stepInDay++;
  if(c.stepInDay<CAMPAIGN.stepsPerDay){updateVision(s);return {stepped:true};}
  c.stepInDay=0;c.dayPrepared=false;
  finishDomesticDay(s);advanceCommissionedProjects(s);advanceScouting(s);resolveStrategicOrders(s);
  for(const town of s.cities){const governor=cityGovernor(s,town);if(!governor||activeBattles(s).some(r=>r.kind==='siege'&&r.cityId===town.id))continue;const daily=Math.round((PROGRESSION.governorMinimum+(PROGRESSION.governor-PROGRESSION.governorMinimum)*governor.unit.politics/100)/10);settleOfficerMerit(s,governor.unit,{sourceId:`governor:${town.id}:${c.day}`,amount:daily,faction:town.owner,cityId:town.id,category:'domestic',reason:'实际在城治政'});}
  settleMeritCapacity(s);const boundary=c.day%10===0;if(boundary)finishTurn(s);
  recordOfficerActivities(s);updateVision(s);c.day++;syncResources(s);updateCityBudgetAlerts(s);recordOfficerActivities(s);
  for(const r of c.battles.filter(r=>!r.settled||r.endedDay===c.day-1))captureDay(s,r);
  archiveCampaignBattles(s);
  updateVision(s);
  const focused=battleRecord(s,c.focusId);if(focused&&!battleVisible(s,focused)){delegateCurrent(s);c.resumeId=null;}
  if(s.campaign.allAI){const winner=s.cities[0]?.owner;if(winner&&winner!=='neutral'&&s.cities.every(c=>c.owner===winner))s.finished='victory';}
  else if(s.cities.every(c=>c.owner===playerFaction(s)))s.finished='victory';else if(!s.cities.some(c=>c.owner===playerFaction(s)))s.finished='defeat';
  if(boundary){c.phase='planning';c.resumeId=c.focusId;c.focusId=null;s.battle=null;c.lastNotice=c.allAI?`第 ${c.day} 天：新旬由 AI 自动安排，可暂停查看。`:`第 ${c.day} 天：新旬筹划。所有战场暂停，请处理内政与军令后点击进行。`;}
  return {dayEnded:true,planning:boundary&&!s.campaign.allAI,finished:s.finished};
}
export function advanceCampaignDay(s){const day=s.campaign.day;for(let i=0;i<CAMPAIGN.stepsPerDay+1&&s.campaign.day===day;i++){const result=advanceCampaignStep(s);if(result.paused||result.encounter||result.deployment||result.reinforcement)return result;}return {dayEnded:true};}
export function serializeCampaign(s){return JSON.stringify({...s,battle:null});}

export function validateCampaign(value){
  const fail=(ok,message='战略存档数据无效')=>{if(!ok)throw new Error(message);};
  const num=(x,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(x)&&x>=0&&x<=max;
  const integer=(x,max)=>Number.isSafeInteger(x)&&num(x,max);
  const c=value?.campaign;fail(c?.scenarioId===undefined||!!nationalScenario(c.scenarioId),'天下剧本无效');fail(c?.version===CAMPAIGN.version,'战略存档版本不兼容，请重新开始');
  fail(typeof c.allAI==='boolean'&&(!c.allAI||!!c.scenarioId),'全 AI 观战状态无效');
  fail(!c.allAI||value.finished===null||value.finished==='victory'&&value.cities[0]?.owner!=='neutral'&&value.cities.every(t=>t.owner===value.cities[0].owner),'全 AI 观战结束状态无效');
  fail(!c.allAI||c.battles.every(r=>r.control==='auto'&&!r.awaiting&&!r.battle.reinforcementCouncil)&&c.focusId===null&&c.resumeId===null,'全 AI 观战不能接管战场');
  fail(value.testScenario===undefined&&value.pending===null&&value.report===null,'战略存档状态不一致');
  fail(typeof c.playerFaction==='string'&&(c.scenarioId?nationalScenario(c.scenarioId).factions.includes(c.playerFaction):c.playerFaction==='cao'),'玩家势力无效');
  if(c.scenarioId){const allowed=new Set([...nationalScenario(c.scenarioId).factions,'neutral']);fail(value.cities?.every(x=>allowed.has(x.owner))&&value.armies?.every(a=>allowed.has(a.faction))&&c.idle?.every(o=>allowed.has(o.faction)),'剧本势力不匹配');}
  fail(integer(c.day)&&c.day>=1&&['planning','executing'].includes(c.phase)&&typeof c.dayPrepared==='boolean'&&integer(c.stepInDay,CAMPAIGN.stepsPerDay-1));
  fail(c.phase!=='planning'||(c.day-1)%10===0&&!c.dayPrepared&&c.stepInDay===0,'战略筹划日期无效');
  fail(c.dayPrepared||c.stepInDay===0);fail(value.turn===Math.floor((c.day-1)/10)+1,'旬与日期不一致');
  fail(Array.isArray(c.battles)&&c.battles.length<=1000&&Array.isArray(c.idle)&&c.idle.length<=Object.keys(OFFICER_BY_ID).length&&Array.isArray(c.turnReports)&&c.turnReports.length<=12);
  if(c.scenarioId)fail(Array.isArray(c.archive)&&c.archive.length<=100&&new Set(c.archive.map(r=>r.id)).size===c.archive.length&&c.archive.every(r=>typeof r.id==='string'&&typeof r.name==='string'&&r.name.length<100&&!/[<>]/.test(r.name)&&integer(r.startedDay,c.day)&&r.startedDay>0&&integer(r.endedDay,c.day)&&r.endedDay>=r.startedDay&&['撤退','击溃','久战收兵','城门失守','停战退兵'].includes(r.reason)&&(r.winner===null||Object.hasOwn(FACTIONS,r.winner))&&!c.battles.some(b=>b.id===r.id)),'归档战报无效');
  fail(Array.isArray(c.personnelEvents)&&c.personnelEvents.length<=100&&c.personnelEvents.every(e=>typeof e.id==='string'&&integer(e.day,c.day)&&OFFICER_BY_ID[e.officerId]&&typeof e.type==='string'&&typeof e.text==='string'),'人员动向记录无效');
  fail(typeof c.lastNotice==='string'&&c.lastNotice.length<1000&&c.turnReports.every(r=>integer(r.turn)&&Array.isArray(r.items)&&r.items.length<=value.cities.length*3&&r.items.every(x=>typeof x==='string'&&x.length<1000)));
  fail(value.armies.every(a=>validMarch(a,c.day)),'行军方式存档无效');
  // Core officer, map and combat validation remains shared with the real engine.
  fail(value.cities.every(c=>Array.isArray(c.units)&&c.units.length<=Object.keys(OFFICER_BY_ID).length&&num(c.hunger,5)),'城内部队数据无效');
  const envelope={...value,battle:null,pending:null,report:null,armies:value.armies?.map(a=>({...a,supply:Math.ceil(a.supply)}))};validateSave(envelope,{strategic:true});
  const officerIds=new Set(),ids=new Set(value.armies.map(a=>a.id));
  const checkOfficer=u=>{validateOfficerMission(value,u);fail(city(value,u.homeCity),'武将归属地无效');fail(!officerIds.has(u.id),'武将重复');officerIds.add(u.id);};
  for(const a of value.armies){fail(!Object.hasOwn(a,'deputy')&&ARMY_ROLES.every(role=>a.units.some(u=>u.id===a[role])||a[role]===null&&(!!armyBattle(value,a.id)||pendingArmyAppointments(value).some(p=>p.armyId===a.id))),'军团任职无效');fail(a.retreatGroup===undefined||typeof a.retreatGroup==='string'&&a.retreatGroup.length<=100,'撤退编组无效');fail(a.cityForce===undefined&&(a.defense===undefined||a.defense===true&&activeBattles(value).some(r=>r.kind==='siege'&&r.cityId===a.location&&r.armyIds.includes(a.id)))&&(a.defense||a.units.filter(u=>u.troops>0).length<=10),'军团须为实际出征或临时守城编组');fail(a.roadPolicy===undefined||['auto','main'].includes(a.roadPolicy),'道路选择无效');fail((!a.travel&&!a.route.length||a.units.filter(u=>u.troops>0).length<=10)&&a.units.filter(u=>u.first).length<=armyFrontlineCapacity(armyBattle(value,a.id)?.armies.find(original=>original.id===a.id)||a)&&integer(a.supply)&&integer(a.supplyCapacity)&&a.supply<=a.supplyCapacity&&num(a.hunger,5)&&integer(a.supplyIn)&&integer(a.cooldownDay)&&city(value,a.homeCity),'军团编制或粮草无效');a.units.forEach(checkOfficer);
    if(a.travel){const t=a.travel;fail(campaignRoads(value,t.from,t.to).some(r=>r.id===(t.road||'main'))&&t.from===a.location&&num(t.progress,roadLength(value,t.from,t.to)),'行军位置无效');}
    if(a.route.length){let from=a.location;for(const to of a.route){fail(value.roads.some(([x,y])=>x===from&&y===to||x===to&&y===from),'军令路线无效');from=to;}fail(!a.travel||a.route[0]===a.travel.to,'行军路线与位置不一致');}
    if(a.supplyLine)fail(city(value,a.supplyLine.source)&&Array.isArray(a.supplyLine.path)&&a.supplyLine.path.every(id=>city(value,id))&&num(a.supplyLine.distance)&&num(a.supplyLine.rate),'粮道无效');
  }
  for(const u of preparedUnits(value)){checkOfficer(u);const proxy=newGame();proxy.armies=[{...proxy.armies[0],units:[u],leader:u.id,advisor:u.id,}];validateSave(proxy);}
  for(const o of c.idle){validatePersonnelJourney(value,o);checkOfficer(o.unit);fail(Object.hasOwn(FACTIONS,o.faction)&&city(value,o.location)&&integer(o.remainingDays)&&(o.retreating?o.remainingDays>0&&(!o.destination||city(value,o.destination)):!o.destination?o.remainingDays===0:city(value,o.destination)&&o.remainingDays>0),'武将调任状态无效');
    const proxy=newGame();proxy.armies=[{...proxy.armies[0],units:[o.unit],leader:o.unit.id,advisor:o.unit.id,}];validateSave(proxy);
  }
  for(const town of value.cities){validateCityBudget(town,fail);for(const key of ['gold','grain','manpower'])fail(integer(town[key]),'城池资源须为非负整数');fail(num(town.order),'城池治安无效');fail(town.order<=100&&town.grain<=10000+town.granary*10000&&gateDurability(town).hp<=gateDurability(town).maxHp);
    for(const key of ['farm','commerce','barracks','walls','granary'])fail(integer(town[key],buildingLimit(value,town,key))&&town[key]>=1,'设施等级无效');
    fail(integer(town.drafted)&&integer(town.reliefTurn));
    fail(!town.project||(Object.hasOwn(PROJECTS,town.project.key)||town.project.key==='watchtower'&&town.project.mode==='repair')&&num(town.project.remaining,50)&&town.project.remaining>0,'建设队列无效');
    fail(town.governor===null||cityGovernor(value,town)||missionOfficer(value,town.governor)?.location===town.id,'太守任命无效');
  }
  const battleIds=new Set(),engaged=new Set();
  function checkBattle(r,b){const base=newGame();if(c.scenarioId){Object.assign(base,nationalWorld(c.scenarioId));base.campaign={scenarioId:c.scenarioId,playerFaction:c.playerFaction};}base.armies=copy(r.armies).map(a=>({...a,faction:b.sides.find(side=>side.units.some(u=>u.armyId===a.id))?.faction||a.faction,supply:Math.ceil(a.supply),route:[],target:null}));base.relationshipScores=copy(b.relationshipScores);base.relationshipTypes=copy(b.relationshipTypes);base.pendingAppointments=[];base.battle=copy(b);validateSave(base,{strategic:true});for(const u of b.sides.flatMap(x=>x.units))fail(u.supplyPenalty===undefined||[0,.1,.2,.35].includes(u.supplyPenalty),'缺粮效果无效');}
  for(const r of c.battles){fail(r&&typeof r.id==='string'&&!battleIds.has(r.id)&&typeof r.name==='string'&&r.name.length<100&&['field','siege'].includes(r.kind)&&city(value,r.cityId)&&num(r.point?.x,1024)&&num(r.point?.y,1024));battleIds.add(r.id);
    fail(integer(r.startedDay,c.day)&&r.startedDay>=1&&typeof r.settled==='boolean'&&typeof r.awaiting==='boolean'&&['auto','manual'].includes(r.control)&&[0,1].includes(r.attackSide));
    fail(Array.isArray(r.armyIds)&&new Set(r.armyIds).size===r.armyIds.length&&Array.isArray(r.armies)&&r.armies.length===r.armyIds.length&&r.armies.every(a=>r.armyIds.includes(a.id)));
    fail(r.settled?integer(r.endedDay,c.day)&&r.endedDay>=r.startedDay&&!!r.battle.result:r.endedDay===null);
    fail(r.settled||r.battle.tick===(c.day-r.startedDay)*CAMPAIGN.stepsPerDay+c.stepInDay,'战场日期与世界日期不一致');
    fail(r.control!=='manual'||r.settled||c.focusId===r.id||c.phase==='planning'&&c.resumeId===r.id,'亲自指挥状态不一致');
    if(r.settled)fail(validArmyAppointmentChanges(r.report?.appointments,r.armies,{units:r.battle.sides.flatMap(side=>side.units),originals:r.armies}),'战后任命记录无效');
    if(r.settled)fail(r.report&&r.report.winner===r.battle.result.winner&&r.report.reason===r.battle.result.reason&&Array.isArray(r.report.stats)&&r.report.stats.length===2&&r.report.stats.every(x=>Object.hasOwn(FACTIONS,x.faction)&&['initial','remaining','wounded','killed','escaped'].every(k=>integer(x[k]))&&x.initial===x.remaining+x.wounded+x.killed+x.escaped)&&Array.isArray(r.report.growth),'战果记录无效');
    if(!r.settled)for(const id of r.armyIds){fail((ids.has(id)||r.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===id).every(u=>u.retreatDispatched))&&!engaged.has(id),'军团重复参战或丢失');engaged.add(id);}
    fail(r.battle.id===r.id&&r.battle.cityId===r.cityId&&Array.isArray(r.snapshots)&&r.snapshots.length<=c.day+1&&r.templates&&typeof r.templates==='object');checkBattle(r,r.battle);validateBattleBuildingSources(value,r,fail);
    let day=0;for(const snap of r.snapshots){fail(integer(snap.day,c.day)&&snap.day>day&&snap.day>=r.startedDay&&snap.tick===snap.data?.tick,'每日快照日期无效');day=snap.day;checkBattle(r,readDailySnapshot(r,snap.day));}
    fail(!r.awaiting||r.battle.tick===0&&!r.battle.deploymentLocked,'已开战不能重新配置');
    fail([null,'pending','open'].includes(r.battle.reinforcementCouncil),'援军军议状态无效');
    fail(!r.battle.reinforcementCouncil||!r.settled&&!r.awaiting&&r.battle.deploymentLocked&&r.battle.sides[0].faction===playerFaction(value)&&r.battle.sides[0].units.some(u=>u.arrivalTick!==undefined),'援军军议状态无效');
    fail(r.battle.reinforcementCouncil!=='open'||r.control==='manual'&&c.focusId===r.id,'援军军议接管状态无效');
  }
  fail(c.focusId===null||battleIds.has(c.focusId)&&!battleRecord(value,c.focusId).settled&&battleRecord(value,c.focusId).control==='manual'&&c.phase==='executing','接管状态无效');
  fail(c.resumeId===null||battleIds.has(c.resumeId));
  fail(value.gold===value.cities.filter(c=>c.owner===playerFaction(value)).reduce((n,c)=>n+c.gold,0),'金库汇总不一致');
  fail(value.grain===Math.floor(value.cities.filter(c=>c.owner===playerFaction(value)).reduce((n,c)=>n+c.grain,0)),'粮仓汇总不一致');
  validateTreasures(value,fail);validateDomestic(value);validateDiplomacy(value);validateStrategicOrders(value);validateOfficerActivities(value);validateVision(value);validateScouting(value);if(c.scenarioId)validateStrategicAI(value);value.battle=c.focusId?battleRecord(value,c.focusId).battle:null;value.pending=null;value.report=null;return value;
}

export function setArmyMarchMode(s,id,mode,{faction=playerFaction(s),scheduled=false}={}){
 const a=army(s,id);if(!scheduled&&(s.campaign.allAI||!isPlanning(s))||s.finished||!a||a.faction!==faction||armyBattle(s,id)||a.disbanded)return '须在筹划阶段选择未交战的己方军团';
 if(!marchModes(a).some(m=>m.id===mode))return '军团长不具备这种行军能力';
 const old=a.marchMode||'normal';if(old===mode)return null;
 const c=city(s,a.location),home=!a.travel&&c&&c.kind!=='junction'&&c.owner===faction;
 if((mode==='light'||old==='light')&&!home)return '轻装切换须在己方据点办理辎重交接';
 const rule=armyStrategicTrait(a,'forcedMarch')?.strategic;
 const light=armyStrategicTrait(a,'lightMarch')?.strategic.capacity||.5;
 if(mode==='forced'&&(a.hunger>0||a.morale<(rule?.minimum||40)||(a.marchRestUntil||0)>s.campaign.day))return '急行须无缺粮、士气至少40且已完成休整';
 if(mode==='light'&&a.supply>Math.floor(a.supplyCapacity*light)&&c.grain+(a.supply-Math.floor(a.supplyCapacity*light))>grainCapacity(c))return '本城粮仓不足以接收卸下的辎重';
 if(old==='light'){a.supplyCapacity=a.fullSupplyCapacity;delete a.fullSupplyCapacity;}
 if(mode==='light'){a.fullSupplyCapacity=a.supplyCapacity;a.supplyCapacity=Math.floor(a.supplyCapacity*light);const returned=Math.max(0,a.supply-a.supplyCapacity);a.supply-=returned;c.grain+=returned;}
 a.marchMode=mode;a.marchRestUntil=old==='forced'?s.campaign.day+(rule?.recovery||2):(a.marchRestUntil||0);syncResources(s);return null;
}
