import {gateDurability} from './building-durability.mjs';
import {cityBudget} from './city-budget.mjs';
import {citySupplyBudgets,forecastArmySupply,cityFoodRequirement,localFoodUse} from './city-logistics.mjs';
import {economicStaffingError} from './economy.mjs';
import {personnelSpeed} from './personnel-movement.mjs';
import {troopTypes,equipmentTypes,canEquip,equipmentCost} from './troop-equipment.mjs';
import {cityIntelligence,visionEnabled,cityVisible,intelligenceWorld} from './strategic-vision.mjs';
import {planStrategicScouting,waitingForStrategicScout} from './strategic-scouting-ai.mjs';
import {scoutAssignment} from './scouting-state.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {trainingCost} from './troop-training.mjs';
import {changeCityTroop,equipCityUnit} from './strategic-campaign.mjs';
import {marchItinerary} from './strategic-movement.mjs';
import {mapNode,cityRoads,adjacentCityPath,isJunction} from './road-network.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {trainingRate} from './troop-training.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {COMBAT,CAMPAIGN_TIME} from './combat-rules.mjs';
import {unitAttributes} from './unit-stats.mjs';
import {playerFaction} from './player-faction.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {cityForce,cityForces} from './city-units.mjs';
import {cityPersonnel,residentOfficer} from './city-personnel.mjs';
import {chosenRoad,roadCost,movementPoints,roadDistance,threatenedTransportRoute} from './strategic-movement.mjs';
import {issueCommand,unitTactics} from './engine.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {canTrain,assignmentFor,pendingDomesticOrder,removeDomesticOrder,reservedMen,cityFoodReserve,recruitmentLimit,DIRECTIONS,ACTIONS} from './domestic.mjs';
import {nationalScenario} from './national-scenarios.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {requestFactionOrder} from './strategic-orders.mjs';
import {prepareCityUnits,disbandCityUnits,recruitLocalUnits,findCampaignRoute,orderCampaignArmy,consolidateCityArmies,expeditionError,campaignBattleSide,CAMPAIGN} from './strategic-campaign.mjs';
import {factionLord,cityReserve} from './talent-core.mjs';
import {activePlans,plannedOfficer,plannedGrain,plannedCargo,domesticIntentWeight} from './strategic-intent.mjs';
import {factionsHostile,diplomaticAssignment} from './diplomacy-relations.mjs';
import {beginUnitRetreat} from './battle-retreat.mjs';
import {planStrategicSupport} from './strategic-support-ai.mjs';
import {STRATEGIC_SUPPORT_RULES as SUPPORT} from './data/design/strategic-support-rules.mjs';
import {hasStrategicTrait,armyStrategicTrait} from './strategic-traits.mjs';

const OFFENSIVE=ECONOMY_RULES.ai.offensive;
export const STRATEGIC_AI=Object.freeze({version:4,attackRatio:1.3,foodDays:5,planDays:40});
const STYLES=OFFENSIVE.styles;
const style=(s,f)=>STYLES[s.campaign.ai?.factions[f]?.style||'balanced'];
const offensivePolicy=(s,f)=>OFFENSIVE.styles[s.campaign.ai?.factions[f]?.style||'balanced'];
const recovered=u=>u.wounded/Math.max(1,u.troops+u.wounded)<=OFFENSIVE.maxWoundedShare;
const homeFood=(s,c)=>Math.max(2500,cityFoodReserve(s,c,OFFENSIVE.homeFoodDays));
const town=mapNode;
const fighting=(s,id)=>s.campaign.battles.find(b=>!b.settled&&b.armyIds.includes(id));
const besieged=(s,id)=>s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===id);
const neighbors=(s,id)=>cityRoads(s).flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
const forces=s=>[...s.armies.filter(a=>!a.disbanded),...cityForces(s)];
const foodUse=units=>units.reduce((n,u)=>n+u.troops/100+u.wounded/200,0);
const busy=(s,id)=>!!scoutAssignment(s,id)||!!pendingDomesticOrder(s,id)||!!diplomaticAssignment(s,id)||plannedOfficer(s,id);
const ownArmy=(s,f,id)=>s.armies.find(a=>a.faction===f&&!a.disbanded&&a.units.some(u=>u.id===id));
function observedCity(s,c,faction){
 if(!visionEnabled(s)||c.owner===faction)return c;
 const known=town(intelligenceWorld(s,faction),c.id),i=cityIntelligence(s,c.id,faction);
 return i.data||{...known,grain:0,commerce:1,buildings:{walls:{[known.id]:{hp:MOVEMENT_RULES.vision.unknownGateHp,maxHp:MOVEMENT_RULES.vision.unknownGateHp}}}};
}
function perceivedForces(s,faction){return forces(intelligenceWorld(s,faction));}
const perceivedRoute=(s,from,to,faction)=>findCampaignRoute(intelligenceWorld(s,faction),from,to,faction);
export function factionStrategicProfile(s,faction){
 const id=factionLord(s,faction),lord=residentOfficer(s,id)?.unit||ownArmy(s,faction,id)?.units.find(u=>u.id===id)||OFFICER_BY_ID[id];
 const stat=key=>Math.max(0,Math.min(100,lord?.[key]??50));
 const disposition=[1,2].includes(lord?.personality)?'cautious':lord?.personality===4?'bold':'balanced';
 const judgment=stat('leadership')*OFFENSIVE.judgmentLeadershipWeight+stat('intellect')*(1-OFFENSIVE.judgmentLeadershipWeight);
 return {lordId:id,name:lord?.name||'君主',style:disposition,judgment,errorBound:(1-judgment/100)*OFFENSIVE.maxEstimateError,developmentWeight:.75+stat('politics')/100};
}
// A stable, bounded assessment error, not a combat bonus or a rerolled daily die.
// Own resources, legal routes and physical presence are always checked exactly.
export function estimateStrategicEnemy(s,faction,targetId,power){
 const profile=factionStrategicProfile(s,faction);let hash=2166136261;
 for(const char of `${profile.lordId}:${targetId}`)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return power*(1+(hash/4294967295*2-1)*profile.errorBound);
}
export function evaluateOffensive(s,{faction,staging,target,groups,assaultDays,siegeDays}){
 target=observedCity(s,target,faction);
 const view=intelligenceWorld(s,faction);
 const units=groups.flatMap(g=>g.units),a={...cityForce(staging),units},cap=strategicCapabilities(s,a),profile=factionStrategicProfile(s,faction);
 const assembly=Math.max(0,...groups.map(g=>g.days));
 const reinforcements=view.armies.filter(e=>e.faction===target.owner&&!fighting(view,e.id)&&e.travel?.to===target.id&&arrivalDays(view,e,target.id)<=assembly+assaultDays).reduce((n,e)=>n+strategicPower(view,e),0);
 const defense=estimateStrategicEnemy(s,faction,target.id,cityDefense(s,target,faction)+reinforcements),men=units.reduce((n,u)=>n+u.troops,0);
 const duration=assembly+assaultDays*2+siegeDays+2;
 const estimatedLosses=Math.ceil(men*Math.min(.8,defense/Math.max(1,cap.field)*OFFENSIVE.lossFactor));
 const consumedGrain=foodUse(units)*(assaultDays*2+siegeDays+2)+groups.reduce((n,g)=>n+foodUse(g.units)*g.days,0);
 const replacementGold=Math.ceil(groups.reduce((n,g)=>n+g.units.reduce((m,u)=>m+u.troops*trainingRate(u,g.c),0),0)*estimatedLosses/Math.max(1,men)),militaryGold=Math.ceil(men/1000*ECONOMY_RULES.maintenance.goldPerThousandTroops*duration/10),selected=new Set(units.map(u=>u.id));
 const manpower=groups.reduce((n,g)=>n+Math.max(0,g.c.manpower-reservedMen(g.c)),0);
 const localFunding=groups.every(g=>g.c.gold-strategicCityBudget(s,g.c).goldNeed>=(replacementGold+militaryGold)*g.units.reduce((n,u)=>n+u.troops,0)/Math.max(1,men));
 const workCost=units.reduce((n,u)=>{const job=assignmentFor(s,u.id);if(!job)return n;const ability=u[DIRECTION_STATS[job.direction]]||0;
  return n+ability*duration/OFFENSIVE.workPerPoint+(job.action?.cost||0)/OFFENSIVE.goldPerPoint;
 },0)*profile.developmentWeight;
 const counterByFaction={};
 for(const e of perceivedForces(s,faction).filter(e=>factionsHostile(s,e.faction,faction)&&e.location!==target.id&&neighbors(s,target.id).includes(e.travel?.to||e.location))){
  const power=strategicPower(view,e),available=e.cityForce?power*(1-style(s,faction).reserve):power;
  counterByFaction[e.faction]=(counterByFaction[e.faction]||0)+available;
 }
 // Independent enemy factions are not an imaginary coordinated coalition.
 const counter=Math.max(0,...Object.values(counterByFaction));
 const counterPower=estimateStrategicEnemy(s,faction,target.id,counter)*OFFENSIVE.counterattackWeight;
 const survivors=cap.field*(1-estimatedLosses/Math.max(1,men));
 // Removing a defending force next to our territory has value even when the
 // objective is a poor port. Empty territory does not earn this military value.
 const borderRelief=neighbors(s,target.id).some(id=>town(s,id).owner===faction)?Math.min(OFFENSIVE.securityValueCap,defense/OFFENSIVE.securityPowerPerPoint):0;
 const benefit=(OFFENSIVE.objectiveValues[target.kind]||50)+target.commerce*6+(target.grain>6000?15:0)+borderRelief;
 const cost=estimatedLosses/OFFENSIVE.lossPerPoint+consumedGrain/OFFENSIVE.grainPerPoint+(replacementGold+militaryGold)/OFFENSIVE.goldPerPoint+duration*OFFENSIVE.dayCost+workCost;
 const score=benefit-cost;
 let reason=null;
 if(cap.field<=defense*style(s,faction).ratio)reason='预计攻守优势不足';
 else if(foodUse(units)*(assaultDays*2+siegeDays+2)>units.length*900||groups.some(g=>foodUse(g.units)*(g.days+2)>g.units.length*900))reason='实际携粮不足以覆盖预计行军与攻城';
 else if(groups.some(g=>strategicPower(s,{...cityForce(g.c),units:g.c.units.filter(u=>!selected.has(u.id))})<Math.max(0,reserveNeed(s,g.c))))reason='出兵后本城守备不足';
 else if(groups.some(g=>economicStaffingError(s,g.c,g.units.map(u=>u.id))))reason='钱粮预算需要保留本城经济负责人，先安排替代人手';
 else if(manpower<estimatedLosses||!localFunding)reason='预计战损补兵超出可用预备兵或补兵金';
 else if(survivors<counterPower)reason='预计攻下后难以抵挡周边反攻';
 else if(score<offensivePolicy(s,faction).minimumValue)reason=workCost>benefit/2?'抽调内政人员代价高，优先发展':'目标收益不足以抵偿行军、战损与补给成本';
 return {accepted:!reason,reason:reason||`预计损失约${estimatedLosses}兵，兵粮可承担且占领后有守备余力`,score,benefit,cost,estimatedLosses,consumedGrain,replacementGold,militaryGold,workCost,counterPower,judgment:profile.judgment};
}
export function initializeStrategicAI(s){
 const factions=nationalScenario(s.campaign.scenarioId).factions.filter(f=>f!==playerFaction(s));
 s.campaign.ai={version:STRATEGIC_AI.version,lastPlanDay:0,lastEconomyTurn:0,nextPlanId:1,nextSupportId:1,plans:[],supports:[],cities:{},factions:Object.fromEntries(factions.map(f=>{const personality=OFFICER_BY_ID[factionLord(s,f)]?.personality;return [f,{style:personality===2?'cautious':personality===4?'bold':'balanced',lastReviewTurn:0,stance:'develop'}];})),decisions:[]};
}
export function strategicPower(s,a){
 const b=fighting(s,a.id),units=b?b.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id):a.units;
 return units.reduce((n,u)=>n+(u.hp??u.troops)*(.7+u.leadership/200+u.force/500+u.intellect/800),0)*(.7+a.morale/250)*(1-Math.min(.4,a.hunger*.1));
}
// Estimates affect choices only, never battle stats or learned tactics.
export function strategicCapabilities(s,a){
 const field=strategicPower(s,a),men=a.units.reduce((n,u)=>n+u.troops,0);
 const quality=men?a.units.reduce((n,u)=>n+u.troops*(.85+troopAptitude(u,u.type)*.04+Math.min(3,unitTactics(u).length)*.02),0)/men:1;
 // At most six units attack at once. Use basic gate damage per calendar day;
 // learned bursts and temporary buffs are not guaranteed sustained production.
 const siege=a.units.slice(0,6).reduce((n,u)=>{const p=unitAttributes(u);return n+p.siege*COMBAT.damageScale*CAMPAIGN_TIME.stepsPerDay/p.attackInterval;},0);
 return {field:field*quality,siege,foodPerDay:foodUse(a.units),speed:movementPoints(a)};
}
export function strategicTravelDays(s,a,path,from=a.location){
 const speed=movementPoints(a);if(!speed)return Infinity;
 const expanded=[];let at=from;
 for(const next of path){const leg=Number.isFinite(roadCost(s,at,next))?[next]:adjacentCityPath(s,at,next);if(!leg)return Infinity;expanded.push(...leg);at=next;}
 return marchItinerary(s,from,expanded,speed,a.roadPolicy||'auto').days;
}
export function strategicArrivalDays(s,a,target){
 const from=a.travel?.to||a.location,path=findCampaignRoute(s,from,target,a.faction);
 if(!path)return Infinity;
 const remaining=a.travel?Math.ceil(roadCost(s,a.travel.from,a.travel.to,a.travel.road||'main')*(1-a.travel.progress/roadDistance(s,a.travel.from,a.travel.to))/Math.max(1,movementPoints(a))):0;
 return remaining+strategicTravelDays(s,a,path,from);
}
const arrivalDays=strategicArrivalDays;
function record(s,id,kind,target,reason){
 const ai=s.campaign.ai,previous=ai.decisions.find(d=>d.armyId===id);
 if(previous?.kind===kind&&previous.target===target&&previous.reason===reason)return;
 const a=s.armies.find(a=>a.id===id),c=town(s,id.replace('city-force:',''));
 ai.decisions.unshift({day:s.campaign.day,armyId:id,faction:a?.faction||c?.owner,name:a?.name||c?.name||'军令',kind,target,reason});ai.decisions=ai.decisions.slice(0,80);
}
function cityDefense(s,c,faction=c.owner){
 if(visionEnabled(s)&&c.owner!==faction){const i=cityIntelligence(s,c.id,faction);if(!i.data)return MOVEMENT_RULES.vision.unknownDefense;c=i.data;}
 const view=intelligenceWorld(s,faction),local=cityForce(c),power=strategicPower(view,local)+view.armies.filter(a=>a.faction===c.owner&&!a.travel&&a.location===c.id).reduce((n,a)=>n+strategicPower(view,a),0)+(c.garrison||0);return power+(power>0?gateDurability(c).hp/6:0);
}
// Military assessments use observed positions; enemy orders remain private.
export function observeStrategicThreat(s,c){
 const view=intelligenceWorld(s,c.owner);
 const rows=view.armies.filter(a=>factionsHostile(s,a.faction,c.owner)&&(a.travel?.to===c.id||fighting(view,a.id)?.cityId===c.id)).map(a=>{
  return {power:strategicPower(view,a),eta:arrivalDays(view,a,c.id)};});
 return {power:rows.reduce((n,x)=>n+x.power,0),eta:Math.min(Infinity,...rows.map(x=>x.eta)),nearby:forces(view).filter(a=>factionsHostile(s,a.faction,c.owner)&&!a.travel&&neighbors(s,c.id).includes(a.location)).reduce((n,a)=>n+strategicPower(view,a),0)};
}
function reserveNeed(s,c){const t=observeStrategicThreat(s,c);return Math.max(0,t.power*1.1,t.nearby*style(s,c.owner).reserve)-gateDurability(c).hp/6;}
// Recheck the actual departure, including a previously queued order. A past
// planning snapshot must not authorize stripping a newly threatened city.
export function strategicDepartureError(s,q){
 const c=town(s,q.cityId);if(!c||!s.campaign.ai?.factions[q.faction])return null;
 if(town(s,q.target)&&observeStrategicThreat(s,town(s,q.target)).power===0){const staffing=economicStaffingError(s,c,q.officerIds);if(staffing)return staffing;}
 const force=cityForce(c),remaining={...force,units:force.units.filter(u=>!q.officerIds.includes(u.id))};
 return strategicPower(s,remaining)<Math.max(0,reserveNeed(s,c))?'敌情变化后出兵城守备不足，保留部队并重新评估':null;
}
function availableUnits(s,c){
 const a=cityForce(c),ranked=rankOfficerCandidates(s,a.units.filter(u=>u.troops>0&&!busy(s,u.id)),{task:'expedition',city:c.id}).map(x=>x.unit);
 let left=strategicPower(s,a);const selected=[],need=Math.max(0,reserveNeed(s,c));
 for(const u of ranked){if(economicStaffingError(s,c,[...selected.map(u=>u.id),u.id]))continue;const power=strategicPower(s,{...a,units:[u]});if(left-power<need)continue;selected.push(u);left-=power;}
 return selected;
}
// Check physical presence before examining work. A home-city registration on an
// officer's away mission is not evidence that they can depart from that city.
export function expeditionTiming(s,cityId,officerIds,{arrivalDeadline=null,travelDays=0}={}){
 const c=town(s,cityId),people=officerIds.map(id=>residentOfficer(s,id));
 if(!c||!officerIds.length||people.some(o=>!o||o.location!==cityId||o.faction!==c.owner||o.unit.mission))return {error:'参战武将尚未实际驻扎本据点',choice:null};
 if(people.some(o=>o.unit.scouting))return {error:'参战武将正在负责侦察工作',choice:null};
 const work=people.map(o=>({id:o.unit.id,action:assignmentFor(s,o.unit.id)?.action})).filter(x=>x.action);
 if(!work.length)return {choice:'now',reason:'参战武将均在据点且没有正在办理的事务'};
 const remaining=Math.max(...work.map(x=>x.action.remaining));
 if(arrivalDeadline!==null&&travelDays<=arrivalDeadline-s.campaign.day&&remaining+travelDays>arrivalDeadline-s.campaign.day)return {choice:'now',reason:'等待事务结束将错过救援时限，立即出征'};
 if(work.some(x=>(s.campaign.domestic.workHistory[x.id]||[]).some(h=>h.status==='interrupted'&&s.campaign.day-h.endedDay<10)))return {choice:'after',reason:'参战武将近一旬已有事务中断，本次等当前事务完成'};
 if(work.some(x=>x.action.remaining<=2))return {choice:'after',reason:'当前事务已近完成，短暂等待后出征'};
 if(work.some(x=>{const a=x.action,total=Math.max(1,ACTIONS[a.key]?.days||s.campaign.day-a.startedDay+a.remaining);return a.cost>=500&&a.remaining/total<=.3;}))return {choice:'after',reason:'高投入事务已完成大半，完成后再出征'};
 return {choice:'now',reason:'出征优先于尚需较长时间的内政事务，立即执行'};
}
function commandUnits(s,c,units,target,kind,reason,timingOptions={}){
 if(!units.length||target===c.id||kind!=='reinforce'&&economicStaffingError(s,c,units.map(u=>u.id)))return false;
 const leader=rankOfficerCandidates(s,units,{task:'role',role:'leader',city:c.id})[0].unit.id,advisor=rankOfficerCandidates(s,units,{task:'role',role:'advisor',city:c.id})[0].unit.id;
 const path=perceivedRoute(s,c.id,target,c.owner);if(!path)return false;
 const travelDays=strategicTravelDays(s,{...cityForce(c),units,leader},path),timing=expeditionTiming(s,c.id,units.map(u=>u.id),{...timingOptions,travelDays});if(timing.error)return false;
 if(timingOptions.arrivalDeadline!==undefined&&travelDays>timingOptions.arrivalDeadline-s.campaign.day)return false;
 const equipmentGold=units.reduce((n,u)=>n+equipmentCost(u.equipment,c.units.find(x=>x.id===u.id).equipment,u.troops+u.wounded,c),0);
 if(equipmentGold){if(c.gold-equipmentGold<strategicCityBudget(s,c).goldNeed)return false;for(const u of units)if(equipCityUnit(s,c.id,u.id,u.equipment,{scheduled:true,faction:c.owner}))return false;}
 const result=requestFactionOrder(s,c.owner,{kind:'expedition',cityId:c.id,officerIds:units.map(u=>u.id),leader,advisor,deputy:null,target,route:path,policy:'auto',minSupply:['reinforce','guard'].includes(kind)?Math.ceil(foodUse(units)*(travelDays+SUPPORT.guardFoodDays)):units.length*900},timing.choice);
 if(result.error)return false;
 const a=ownArmy(s,c.owner,units[0].id);if(a)a.task={attack:'择敌出征',stage:'前线集结',reinforce:'增援',guard:'保护粮路'}[kind];
 record(s,a?.id||`city-force:${c.id}`,kind,target,reason+'；'+timing.reason);return true;
}
export function strategicCityBudget(s,c,{supplies=citySupplyBudgets(s),supplyForecast=forecastArmySupply(s,{supplies})}={}){
 const budget=cityBudget(s,c,{supplies,supplyForecast});
 return {budget,goldNeed:Math.ceil(Math.max(cityReserve(s,c),budget.costs.gold+budget.reserve.gold)),grainNeed:Math.ceil(Math.max(2500,cityFoodReserve(s,c,ECONOMY_RULES.ai.foodReserveDays)+plannedGrain(s,c.id)+c.budget.grainReserve))};
}
export function manageStrategicEconomy(s){
 const ai=s.campaign.ai;if(ai.lastEconomyTurn===s.turn)return;ai.lastEconomyTurn=s.turn;
 // Recruitment may use half the opening treasury. Keep the other half for
 // officer-led civil work, rather than spending every available coin first.
 const supplies=citySupplyBudgets(s),supplyForecast=forecastArmySupply(s,{supplies}),budgets=new Map(s.cities.filter(c=>Object.hasOwn(ai.factions,c.owner)).map(c=>[c.id,strategicCityBudget(s,c,{supplies,supplyForecast})]));
 const floors=Object.fromEntries([...budgets].map(([id,b])=>[id,Math.max(b.goldNeed,Math.ceil(town(s,id).gold/2))]));
 for(const c of s.cities.filter(c=>Object.hasOwn(ai.factions,c.owner))){
  if(besieged(s,c.id)||budgets.get(c.id).budget.shortages.grain)continue;
  const plan=activePlans(s).find(p=>p.faction===c.owner&&p.staging===c.id),path=plan&&perceivedRoute(s,c.id,plan.target,c.owner);
  const needsShip=path?.some((id,i)=>chosenRoad(s,i?path[i-1]:c.id,id)?.terrain==='water');
  const needsSiege=!!plan&&cityDefense(s,town(s,plan.target),c.owner)>0;
  for(const u of c.units.filter(u=>u.troops>0&&!u.mission)){
   const family=TROOP_DESIGNS[u.type].family,preferred={spear:u.force>=u.intellect?'qingzhou':'baier',halberd:u.force>u.leadership?'greatHalberd':'rattan',cavalry:u.force>=u.intellect?'tigerCavalry':'whiteHorse',archer:u.force>=u.intellect?'longbow':'crossbow'}[family];
   const options=troopTypes().filter(id=>TROOP_DESIGNS[id].family===family&&TROOP_DESIGNS[id].tier===1&&canTrain(c,id)),target=options.includes(preferred)?preferred:options[0];
   if(TROOP_DESIGNS[u.type].tier===0&&target&&c.gold-trainingCost(target,u.troops+u.wounded,c)>=floors[c.id])changeCityTroop(s,c.id,u.id,target,{scheduled:true,faction:c.owner});
   const e=structuredClone(u.equipment);
   if(needsShip&&!e.ship)e.ship=equipmentTypes('ship').filter(id=>canEquip(c,id)).sort((a,b)=>TROOP_DESIGNS[b].tier-TROOP_DESIGNS[a].tier||TROOP_DESIGNS[a].goldPerThousand-TROOP_DESIGNS[b].goldPerThousand)[0]||null;
   if(needsSiege&&!e.siege&&!c.units.some(x=>x.equipment.siege))e.siege=equipmentTypes('siege').filter(id=>canEquip(c,id)).sort((a,b)=>TROOP_DESIGNS[b].tier-TROOP_DESIGNS[a].tier||TROOP_DESIGNS[a].goldPerThousand-TROOP_DESIGNS[b].goldPerThousand)[0]||null;
   if(c.gold-equipmentCost(e,u.equipment,u.troops+u.wounded,c)>=floors[c.id])equipCityUnit(s,c.id,u.id,e,{scheduled:true,faction:c.owner});
  }
  const idle=s.campaign.idle.filter(o=>o.faction===c.owner&&o.location===c.id&&!o.destination&&!o.retreating&&!o.unit.mission&&!o.unit.scouting&&!busy(s,o.unit.id)&&canTrain(c,o.unit.type));
  if(idle.length&&c.kind==='city'&&c.units.length<6&&c.gold>=500&&c.manpower>1000&&c.grain>2500){
   const ids=rankOfficerCandidates(s,idle.map(o=>o.unit),{task:'draft',city:c.id}).slice(0,6-c.units.length).map(x=>x.unit.id);prepareCityUnits(s,c.id,ids,{scheduled:true,faction:c.owner});
  }
  const ids=rankOfficerCandidates(s,cityPersonnel(s,c.id).filter(o=>!o.unit.mission&&!o.unit.scouting&&(o.cityUnit||o.army)&&canTrain(c,o.unit.type)).map(o=>o.unit),{task:'recruit',city:c.id}).map(x=>x.unit.id);
  if(ids.length)recruitLocalUnits(s,c,ids,{faction:c.owner,grainReserve:budgets.get(c.id).grainNeed,manpowerReserve:plannedCargo(s,c.id,'manpower'),goldReserve:floors[c.id],cap:ECONOMY_RULES.ai.cityTroopTarget});
 }
}
function refreshCityIntents(s,faction){
 const ai=s.campaign.ai,p=activePlans(s).find(p=>p.faction===faction);
 for(const c of s.cities.filter(c=>c.owner===faction)){
  const threat=observeStrategicThreat(s,c),front=neighbors(s,c.id).some(id=>observedCity(s,town(s,id),faction).owner!==faction);
  const role=p?.phase==='consolidate'&&p.target===c.id?'recovery':threat.power>0?'front':p?.staging===c.id?'staging':cityPersonnel(s,c.id).length<2&&c.kind==='city'?'talent':front?'front':'rear';
  ai.cities[c.id]={faction,role,defenseNeed:Math.ceil(Math.max(0,reserveNeed(s,c))),grainNeed:Math.ceil(Math.max(2500,cityFoodReserve(s,c,ECONOMY_RULES.ai.foodReserveDays)+c.budget.grainReserve+plannedGrain(s,c.id),homeFood(s,c)+plannedGrain(s,c.id))),manpowerNeed:['front','staging','recovery'].includes(role)&&c.units.length?3000:0,updatedDay:s.campaign.day};
 }
}
function cancelPlan(s,p,reason){
 p.phase='cancelled';p.updatedDay=s.campaign.day;p.reason=reason;p.reserves={};
 for(const q of [...s.campaign.domestic.orders])if(q.faction===p.faction&&q.kind==='expedition'&&q.officerIds.some(id=>p.officerIds.includes(id)))removeDomesticOrder(s,q.id,reason);
 const policy=s.campaign.ai.factions[p.faction];policy.stance='develop';
 record(s,`city-force:${p.staging}`,'hold',p.target,reason);
 for(const a of s.armies.filter(a=>a.faction===p.faction&&a.units.some(u=>p.officerIds.includes(u.id))&&!fighting(s,a.id)))retreatArmy(s,a,reason);
}
function retreatArmy(s,a,reason){
 if(a.task==='回城补给'&&a.route.length&&town(s,a.target)?.owner===a.faction)return;
 const from=a.travel?.from||a.location,homes=s.cities.filter(c=>c.owner===a.faction&&!besieged(s,c.id)).map(c=>({c,path:perceivedRoute(s,from,c.id,a.faction)})).filter(x=>x.path&&x.c.grain>=Math.max(500,cityFoodRequirement(s,x.c,ECONOMY_RULES.budget.criticalFoodDays,{supplies:citySupplyBudgets(s).filter(x=>x.army.id!==a.id)})+foodUse(a.units)*ECONOMY_RULES.budget.criticalFoodDays)).map(x=>({...x,days:strategicTravelDays(s,a,x.path,from)})).sort((x,y)=>x.days-y.days||x.c.id.localeCompare(y.c.id));
 if(!homes.length){record(s,a.id,'hold',a.location,'没有可达粮仓，保持现有位置');return;}
 const home=homes[0];
 const error=orderCampaignArmy(s,a.id,home.c.id,'auto',{scheduled:true,faction:a.faction,reverse:!!a.travel,...(home.path.length?{path:home.path}:{})});
 if(!error){a.task='回城补给';record(s,a.id,'retreat',home.c.id,reason);}
}
function emergencyOrders(s){
 const ai=s.campaign.ai,forecast=forecastArmySupply(s,{days:ECONOMY_RULES.ai.foodReserveDays,funded:true});
 for(const a of [...s.armies].filter(a=>Object.hasOwn(ai.factions,a.faction)&&!a.disbanded)){
  const b=fighting(s,a.id);
  if(b){const side=campaignBattleSide(s,b,a),own=b.battle.sides[side],foe=b.battle.sides[1-side],hp=x=>x.units.reduce((n,u)=>n+u.hp,0);
   if(b.battle.deploymentLocked&&!own.retreat&&(a.hunger>=2||forecast.armies.some(x=>x.army.id===a.id&&x.firstShortDay!==null&&x.firstShortDay<=ECONOMY_RULES.budget.criticalFoodDays)||hp(own)<own.units.reduce((n,u)=>n+u.initial,0)*.32&&hp(foe)>hp(own)*1.8)){if(own.faction===a.faction)issueCommand(b.battle,'retreat',null,side);else for(const u of own.units.filter(u=>u.armyId===a.id&&u.hp>0)){u.retreatAt=Math.ceil(u.hp);if(u.status==='active')beginUnitRetreat(b.battle,u);else if(u.status==='reserve'){u.status='withdrawn';u.action='援军撤离';}}record(s,a.id,'retreat',a.homeCity,'战损过重或断粮，保存本军残部');}continue;
  }
  if(a.diplomaticWithdrawal&&(a.travel||a.route.length||town(s,a.location)?.owner!==a.faction))continue;
  if(a.diplomaticTask&&a.hunger<1&&a.supply>=foodUse(a.units)*2)continue;
  const predicted=forecast.armies.find(x=>x.army.id===a.id),homes=s.cities.filter(c=>c.owner===a.faction&&!besieged(s,c.id)).map(c=>({c,path:perceivedRoute(s,a.travel?.from||a.location,c.id,a.faction)})).filter(x=>x.path&&x.c.grain>=foodUse(a.units)*3).map(x=>({...x,days:strategicTravelDays(s,a,x.path,a.travel?.from||a.location)}));
  const returnDays=Math.min(Infinity,...homes.map(x=>x.days)),risk=predicted?.firstShortDay!=null&&predicted.firstShortDay<=returnDays+ECONOMY_RULES.budget.criticalFoodDays;
  if(a.hunger>=1||risk||a.supply<foodUse(a.units)*2&&town(s,a.location)?.owner!==a.faction){
   const p=activePlans(s).find(p=>p.officerIds.some(id=>a.units.some(u=>u.id===id)));if(p)cancelPlan(s,p,'军团预计无法维持补给，取消进攻并提前回撤');else retreatArmy(s,a,'携粮或粮道预算不足，沿道路提前回城补给');
  }
 }
 for(const c of s.cities.filter(c=>Object.hasOwn(ai.factions,c.owner))){
  const threat=observeStrategicThreat(s,c);let need=threat.power-cityDefense(s,c);if(need<=0)continue;
  for(const q of [...s.campaign.domestic.orders].filter(q=>q.faction===c.owner&&q.kind==='expedition'&&q.target===c.id)){
   const from=town(s,q.cityId),units=q.officerIds.map(id=>from.units.find(u=>u.id===id));if(units.some(u=>!u))continue;
   const path=perceivedRoute(s,from.id,c.id,c.owner);if(!path)continue;
   const a={...cityForce(from),units,leader:q.leader},days=strategicTravelDays(s,a,path),timing=expeditionTiming(s,from.id,q.officerIds,{arrivalDeadline:s.campaign.day+threat.eta,travelDays:days});
   if(!timing.error&&timing.choice==='now')commandUnits(s,from,units,c.id,'reinforce','救援时限收紧，重新核对出征时机',{arrivalDeadline:s.campaign.day+threat.eta});
   else if(!timing.error&&days+Math.max(0,...q.officerIds.map(id=>assignmentFor(s,id)?.action?.remaining||0))<=threat.eta)need-=strategicPower(s,a);
  }
  for(const a of s.armies.filter(a=>a.faction===c.owner&&a.target===c.id&&!fighting(s,a.id)))if(arrivalDays(intelligenceWorld(s,c.owner),a,c.id)<=threat.eta)need-=strategicPower(s,a);
  if(need<=0)continue;
  const p=activePlans(s).find(p=>p.faction===c.owner);if(p&&p.phase!=='consolidate')cancelPlan(s,p,`${c.name}守备告急，优先保境`);
  const sources=s.cities.filter(x=>x.owner===c.owner&&x.id!==c.id&&!besieged(s,x.id)).map(x=>({c:x,path:perceivedRoute(s,x.id,c.id,c.owner)})).filter(x=>x.path).map(x=>({...x,units:availableUnits(s,x.c).slice(0,10)})).filter(x=>x.units.length).map(x=>({...x,days:strategicTravelDays(s,{...cityForce(x.c),units:x.units},x.path)})).filter(x=>x.days<=threat.eta).sort((a,b)=>a.days-b.days||a.c.id.localeCompare(b.c.id));
  for(const x of sources){if(need<=0)break;const a={...cityForce(x.c),units:x.units};if(x.c.grain<foodUse(x.units)*(x.days+2))continue;
   if(commandUnits(s,x.c,x.units,c.id,'reinforce','援军可及时抵达，优先救援',{arrivalDeadline:s.campaign.day+threat.eta}))need-=strategicPower(s,a);
  }
  record(s,`city-force:${c.id}`,'hold',c.id,need>0?'敌军逼近，守备仍有缺口':'守城并等待已派援军');
 }
}
function createPlan(s,faction){
 const ai=s.campaign.ai,policy=ai.factions[faction];if(activePlans(s).some(p=>p.faction===faction))return;
 const cities=s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id)),pool=new Map(cities.map(c=>[c.id,availableUnits(s,c).filter(recovered)])),options=[];
 for(const staging of cities){
  if(observeStrategicThreat(s,staging).power>cityDefense(s,staging))continue;
  if(strategicPower(s,cityForce(staging))<Math.max(0,reserveNeed(s,staging)))continue;
  for(const id of neighbors(s,staging.id)){
   const target=observedCity(s,town(s,id),faction);if(!factionsHostile(s,target.owner,faction)||(cityVisible(s,id,faction)&&besieged(s,id)))continue;
   if(waitingForStrategicScout(s,faction,id)){record(s,`city-force:${staging.id}`,'hold',id,'等待斥候取得目标情报后再评估出征');continue;}
   const groups=cities.map(c=>{const path=perceivedRoute(s,c.id,staging.id,faction),units=pool.get(c.id).slice(0,10),a={...cityForce(c),units};return {c,units,path,days:path?strategicTravelDays(s,a,path):Infinity};}).filter(x=>x.units.length&&x.days<=10).sort((a,b)=>a.days-b.days||a.c.id.localeCompare(b.c.id));
   const selected=[];let power=0;const defense=estimateStrategicEnemy(s,faction,target.id,cityDefense(s,target,faction)),required=defense*style(s,faction).ratio;
   const candidates=groups.flatMap(x=>x.units.map((u,index)=>({x,u,index}))).sort((a,b)=>Number(!!assignmentFor(s,a.u.id)?.action)-Number(!!assignmentFor(s,b.u.id)?.action)||a.x.days-b.x.days||a.index-b.index||a.u.id.localeCompare(b.u.id));
   for(const {x,u} of candidates){let group=selected.find(g=>g.c.id===x.c.id);if(!group){group={...x,units:[]};selected.push(group);}group.units.push(u);power=selected.reduce((n,g)=>n+strategicCapabilities(s,{...cityForce(g.c),units:g.units}).field,0);if(power>required)break;}
   if(!selected.length||power<=required)continue;
   const units=selected.flatMap(x=>x.units),a={...cityForce(staging),units},cap=strategicCapabilities(s,a),assaultDays=strategicTravelDays(s,a,[id]),siegeDays=defense===0?0:Math.max(2,Math.ceil(gateDurability(target).hp/Math.max(1,cap.siege)));
   const supplyDays=assaultDays*2+siegeDays+2,grain=units.length*900;
   if(foodUse(units)*supplyDays>grain||selected.some(x=>foodUse(x.units)*(x.days+2)>x.units.length*900))continue;
   const origins=selected.map(x=>({cityId:x.c.id,officerIds:x.units.map(u=>u.id),grain:x.units.length*900}));
   if(cities.reduce((n,c)=>n+Math.max(0,c.grain-homeFood(s,c)-plannedGrain(s,c.id)),0)<grain)continue;
   const evaluation=evaluateOffensive(s,{faction,staging,target,groups:selected,assaultDays,siegeDays});
   if(!evaluation.accepted){record(s,`city-force:${staging.id}`,'hold',target.id,evaluation.reason);continue;}
   options.push({staging,target,origins,units,grain,score:evaluation.score,reason:evaluation.reason});
  }
 }
 options.sort((a,b)=>b.score-a.score||a.target.id.localeCompare(b.target.id)||a.staging.id.localeCompare(b.staging.id));
 const best=options[0];if(!best){policy.stance='develop';return;}
 const reserves={[best.staging.id]:best.grain};for(const g of best.origins)if(g.cityId!==best.staging.id)reserves[g.cityId]=(reserves[g.cityId]||0)+g.grain;
 const p={id:ai.nextPlanId++,faction,phase:'prepare',target:best.target.id,staging:best.staging.id,officerIds:best.units.map(u=>u.id),origins:best.origins,reserves,createdDay:s.campaign.day,updatedDay:s.campaign.day,deadline:s.campaign.day+style(s,faction).patience,reason:best.reason};
 ai.plans.push(p);policy.stance='attack';record(s,`city-force:${p.staging}`,'stage',p.target,p.reason);
}
function progressPlan(s,p){
 const day=s.campaign.day,target=observedCity(s,town(s,p.target),p.faction),staging=town(s,p.staging);
 if(target.owner!==p.faction&&!factionsHostile(s,p.faction,target.owner)){cancelPlan(s,p,'外交约定已改变敌对关系，撤销未执行的进攻');return;}
 if(target.owner===p.faction){if(p.phase!=='consolidate'){p.phase='consolidate';p.updatedDay=day;p.reserves={};p.reason='目标已占领，恢复守备与粮道';}
  if(!besieged(s,target.id)&&target.grain>=homeFood(s,target)&&target.units.every(recovered)&&cityDefense(s,target)>=Math.max(0,reserveNeed(s,target))){p.phase='complete';p.updatedDay=day;s.campaign.ai.factions[p.faction].stance='develop';}return;
 }
 if(staging.owner!==p.faction||day>p.deadline){cancelPlan(s,p,staging.owner!==p.faction?'集结地失守，撤销作战计划':'筹备或交战超时，收回兵力');return;}
 const actors=p.officerIds.map(id=>{const o=residentOfficer(s,id),a=ownArmy(s,p.faction,id);return o?.faction===p.faction?o:a?{unit:a.units.find(u=>u.id===id),army:a,location:a.location,faction:p.faction}:null;}).filter(Boolean);
 if(actors.length!==p.officerIds.length){cancelPlan(s,p,'人员损失或离队，重新评估战力');return;}
 if(p.phase==='attack'){
  if(!actors.some(o=>o.army&&fighting(s,o.army.id))&&strategicCapabilities(s,{...cityForce(staging),units:actors.map(o=>o.unit)}).field<estimateStrategicEnemy(s,p.faction,target.id,cityDefense(s,target,p.faction))*1.05){cancelPlan(s,p,'敌军增援后优势消失，保存部队');return;}
  if(!actors.some(o=>o.army&&(o.army.route.length||o.army.travel||fighting(s,o.army.id))))cancelPlan(s,p,'进攻部队已撤回，结束本次计划');return;
 }
 if(actors.some(o=>!recovered(o.unit))){cancelPlan(s,p,'参战部队伤兵过多，先救治整补');return;}
 if(strategicCapabilities(s,{...cityForce(staging),units:actors.map(o=>o.unit)}).field<estimateStrategicEnemy(s,p.faction,target.id,cityDefense(s,target,p.faction))*1.05){cancelPlan(s,p,'目标增援后优势消失，暂缓进攻');return;}
 // Check every remaining source before dispatching any part of an assembly.
 for(const c of s.cities.filter(c=>c.owner===p.faction)){
  const ids=c.units.filter(u=>p.officerIds.includes(u.id)).map(u=>u.id);
  if(ids.length&&strategicDepartureError(s,{cityId:c.id,faction:p.faction,officerIds:ids})){
   cancelPlan(s,p,'出兵城守备需求提高，撤销集结并保留部队');return;
  }
 }
 let dispatched=false;
 for(const g of p.origins){
  const c=town(s,g.cityId);if(c.owner!==p.faction){cancelPlan(s,p,'出兵城失守，撤销未执行军令');return;}
  if(c.id===p.staging)continue;
  if(!c.units.some(u=>g.officerIds.includes(u.id)))delete p.reserves[c.id];
  const units=c.units.filter(u=>g.officerIds.includes(u.id)&&!u.mission&&!u.scouting&&!pendingDomesticOrder(s,u.id));if(!units.length)continue;
  if(!perceivedRoute(s,c.id,p.staging,p.faction)){cancelPlan(s,p,'集结通道失去控制');return;}
  if(c.grain<g.grain+homeFood(s,c))continue;
  if(commandUnits(s,c,units,p.staging,'stage','按势力计划赴前线集结')){dispatched=true;if(!c.units.some(u=>g.officerIds.includes(u.id)))delete p.reserves[c.id];}
 }
 if(dispatched&&p.phase==='prepare'){p.phase='assemble';p.updatedDay=day;}
 const ready=actors.every(o=>!o.army&&!o.unit.mission&&!o.unit.scouting&&o.location===p.staging&&staging.units.includes(o.unit)&&!pendingDomesticOrder(s,o.unit.id));
 if(!ready||besieged(s,staging.id)){p.reason=besieged(s,staging.id)?'集结地遭围城，先守城':p.officerIds.some(id=>pendingDomesticOrder(s,id))?'等待参战武将完成事务后集结':'各城部队正在集结，等待全部到齐';return;}
 const units=actors.map(o=>o.unit),leave=strategicPower(s,{...cityForce(staging),units:cityForce(staging).units.filter(u=>!p.officerIds.includes(u.id))});
 if(waitingForStrategicScout(s,p.faction,p.target)){p.reason='等待斥候更新目标情报后再决定进攻';return;}
 if(leave<Math.max(0,reserveNeed(s,staging))){cancelPlan(s,p,'集结地守备不足，撤销进攻并释放人员');return;}
 if(staging.grain<plannedGrain(s,staging.id)+homeFood(s,staging)){p.reason='保留本城口粮后出征粮草不足，等待实际运输到达';return;}
 // Evaluate the whole assembled force before interrupting anybody or launching
 // a column, so a protected worker cannot cause a partial assault.
 const timing=expeditionTiming(s,staging.id,units.map(u=>u.id));
 if(timing.error||timing.choice==='after'){p.reason=timing.error||timing.reason;return;}
 const cap=strategicCapabilities(s,{...cityForce(staging),units}),defense=cityDefense(s,target,p.faction);
 const assessment=evaluateOffensive(s,{faction:p.faction,staging,target,groups:[{c:staging,units,days:0}],assaultDays:strategicTravelDays(s,{...cityForce(staging),units},[target.id]),siegeDays:defense===0?0:Math.max(2,Math.ceil(gateDurability(target).hp/Math.max(1,cap.siege)))});
 if(!assessment.accepted){cancelPlan(s,p,assessment.reason);return;}
 if(s.armies.length+Math.ceil(units.length/10)>CAMPAIGN.maxArmies)return;
 for(let i=0;i<units.length;i+=10){const ids=units.slice(i,i+10).map(u=>u.id);if(expeditionError(s,{cityId:staging.id,officerIds:ids,leader:ids[0],advisor:ids[0],deputy:null,target:p.target,policy:'auto'},{scheduled:true,faction:p.faction}))return;}
 let sent=0;for(let i=0;i<units.length;i+=10)if(commandUnits(s,staging,units.slice(i,i+10),p.target,'attack',assessment.reason))sent++;
 if(sent){p.phase='attack';p.updatedDay=day;p.reserves={};p.reason=assessment.reason;}
}
export function safeStrategicTransportRoute(s,from,to,faction){
 const view=intelligenceWorld(s,faction),queue=[{id:from,path:[],cost:0}],seen=new Set();
 while(queue.length){queue.sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id));const at=queue.shift();if(seen.has(at.id))continue;seen.add(at.id);if(at.id===to)return at.path;
  for(const [a,b] of view.roads){const next=a===at.id?b:b===at.id?a:null;if(!next||seen.has(next)||threatenedTransportRoute(view,at.id,[next],faction))continue;queue.push({id:next,path:[...at.path,next],cost:at.cost+roadCost(view,at.id,next)});}
 }
 return null;
}
function logistics(s,faction){
 const ai=s.campaign.ai,cities=s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id));
 const priority=new Map(cities.map(c=>[c.id,cityBudget(s,c,{includeWork:false})]));
 cities.sort((a,b)=>Number(priority.get(b.id).shortages.grain>0||priority.get(b.id).shortages.gold>0)-Number(priority.get(a.id).shortages.grain>0||priority.get(a.id).shortages.gold>0)||(priority.get(a.id).daysSupply??Infinity)-(priority.get(b.id).daysSupply??Infinity)||a.gold-b.gold||a.id.localeCompare(b.id));
 const inbound=(id,key)=>s.campaign.idle.filter(o=>o.faction===faction&&(o.relayDestination||o.convoyCycle?.target||o.destination)===id).reduce((n,o)=>n+(key==='grain'&&o.convoyCycle?o.cargo.grain+o.convoyCycle.batch*(o.convoyCycle.remaining-(o.convoyCycle.leg==='out'?1:0)):o.cargo?.[key]||0),0)+s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='transfer'&&q.target===id).reduce((n,q)=>n+(q.cargo?.[key]||0)*(key==='grain'?q.cycles||1:1),0);
 const outbound=(id,key)=>s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='transfer'&&q.cityId===id).reduce((n,q)=>n+(q.cargo?.[key]||0),0);
 for(const c of cities){
  const intent=ai.cities[c.id],budget=strategicCityBudget(s,c),need={gold:Math.max(0,budget.goldNeed+500-c.gold-inbound(c.id,'gold')),grain:Math.max(0,(intent?.grainNeed||2500)-c.grain-inbound(c.id,'grain')),manpower:Math.max(0,(intent?.manpowerNeed||0)-c.manpower+reservedMen(c)-inbound(c.id,'manpower'))};
  if(need.gold<100&&need.grain<300&&need.manpower<300)continue;
  const sources=cities.filter(x=>x.id!==c.id).map(x=>({c:x,path:safeStrategicTransportRoute(s,x.id,c.id,faction)})).filter(x=>x.path).sort((a,b)=>a.path.reduce((n,id,i)=>n+roadCost(s,i?a.path[i-1]:a.c.id,id),0)-b.path.reduce((n,id,i)=>n+roadCost(s,i?b.path[i-1]:b.c.id,id),0)||a.c.id.localeCompare(b.c.id));
  for(const x of sources){
   const units=cityPersonnel(s,x.c.id).filter(o=>!o.army&&!o.unit.mission&&!o.unit.troops&&!o.unit.wounded&&o.unit.id!==x.c.governor&&!busy(s,o.unit.id)&&!economicStaffingError(s,x.c,[o.unit.id])).map(o=>o.unit),sourceBudget=strategicCityBudget(s,x.c);
   const cargo={gold:Math.floor(Math.max(0,Math.min(need.gold,x.c.gold-sourceBudget.goldNeed-1000))),grain:Math.floor(Math.max(0,Math.min(need.grain,x.c.grain-Math.max(3500,sourceBudget.grainNeed)))),manpower:Math.floor(Math.max(0,Math.min(need.manpower,x.c.manpower-reservedMen(x.c)-Math.max(2500,ai.cities[x.c.id]?.manpowerNeed||0)-outbound(x.c.id,'manpower'))))};
   if(cargo.gold<100&&cargo.grain<300&&cargo.manpower<300)continue;
   const pureGrain=cargo.grain>0&&!cargo.gold&&!cargo.manpower;
   const u=rankOfficerCandidates(s,units,{task:'transfer',city:x.c.id,destination:c.id,cargo}).sort((a,b)=>Number(pureGrain&&hasStrategicTrait(b.unit,'cycleCargo'))-Number(pureGrain&&hasStrategicTrait(a.unit,'cycleCargo'))||b.recommendation.score-a.recommendation.score||a.unit.id.localeCompare(b.unit.id))[0]?.unit;if(!u)continue;
   const cycles=pureGrain&&hasStrategicTrait(u,'cycleCargo')?Math.min(SUPPORT.maximumCycles,Math.floor(cargo.grain/SUPPORT.minimumCargo.grain),Math.floor(Math.max(0,x.c.grain-sourceBudget.grainNeed)/Math.max(SUPPORT.minimumCargo.grain,Math.ceil(cargo.grain/2)))):0;
   if(cycles>=2)cargo.grain=Math.max(SUPPORT.minimumCargo.grain,Math.ceil(cargo.grain/cycles));
   const relay=hasStrategicTrait(u,'relayCargo')?x.path.slice(0,-1).find(id=>s.cities.some(t=>t.id===id&&t.owner===faction))||null:null;
   const result=requestFactionOrder(s,faction,{kind:'transfer',cityId:x.c.id,officerIds:[u.id],target:c.id,cargo,route:x.path,relay,cycles:cycles>=2?cycles:0,safeOnly:true},'after');
   if(!result.error){record(s,`city-force:${x.c.id}`,'transport',c.id,`调运${cargo.gold}金、${cargo.grain}粮、${cargo.manpower}预备兵支援${c.name}，实际沿路运输`);break;}
  }
 }
 // Receive-grain commanders can meet a real city-to-city convoy at a safe
 // intermediate node. Handoff still happens only on actual co-location.
 for(const a of s.armies.filter(a=>a.faction===faction&&!a.disbanded&&!a.travel&&!fighting(s,a.id)&&isJunction(s,a.location)&&armyStrategicTrait(a,'receiveGrain')&&a.supply<Math.min(a.supplyCapacity,foodUse(a.units)*8))){
  if(s.campaign.idle.some(o=>o.faction===faction&&o.cargo?.grain&&[o.location,...(o.journey?.route||[])].includes(a.location))||s.campaign.domestic.orders.some(q=>q.faction===faction&&q.kind==='transfer'&&q.cargo.grain&&q.route?.includes(a.location)))continue;
  const choices=[];for(const from of cities){const first=safeStrategicTransportRoute(s,from.id,a.location,faction);if(!first)continue;for(const to of cities.filter(c=>c.id!==from.id)){const last=safeStrategicTransportRoute(s,a.location,to.id,faction);if(!last)continue;const path=[...first,...last];if(new Set([from.id,...path]).size!==path.length+1)continue;choices.push({from,to,path,cost:path.reduce((n,id,i)=>n+roadCost(s,i?path[i-1]:from.id,id),0)});}}
  choices.sort((x,y)=>x.cost-y.cost||x.from.id.localeCompare(y.from.id)||x.to.id.localeCompare(y.to.id));
  for(const x of choices){const b=strategicCityBudget(s,x.from),grain=Math.floor(Math.min(a.supplyCapacity-a.supply,Math.max(0,x.from.grain-b.grainNeed)));if(grain<SUPPORT.minimumCargo.grain)continue;
   const units=cityPersonnel(s,x.from.id).filter(o=>!o.army&&!o.unit.mission&&!o.unit.troops&&!o.unit.wounded&&o.unit.id!==x.from.governor&&!busy(s,o.unit.id)&&!economicStaffingError(s,x.from,[o.unit.id])).map(o=>o.unit),cargo={gold:0,grain,manpower:0},u=rankOfficerCandidates(s,units,{task:'transfer',city:x.from.id,destination:x.to.id,cargo})[0]?.unit;if(!u)continue;
   const result=requestFactionOrder(s,faction,{kind:'transfer',cityId:x.from.id,officerIds:[u.id],target:x.to.id,cargo,route:x.path,safeOnly:true},'after');if(!result.error){record(s,'city-force:'+x.from.id,'transport',x.to.id,'粮车沿实际道路经过驻军节点，抵达后由接粮军团交接');break;}
  }
 }
}
function personnel(s,faction){
 const cities=s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id));
 for(const c of cities.filter(c=>c.kind==='city')){
  if(cityPersonnel(s,c.id).length>=3||s.campaign.idle.some(o=>o.faction===faction&&o.destination===c.id)||s.campaign.domestic.orders.some(q=>q.faction===faction&&q.kind==='transfer'&&q.target===c.id))continue;
  const directions=Object.keys(DIRECTIONS).filter(d=>!s.campaign.domestic.assignments.some(a=>a.cityId===c.id&&a.direction===d));if(!directions.length)continue;
  const candidates=[];
  for(const from of cities.filter(x=>x.id!==c.id&&cityPersonnel(s,x.id).length>5)){
   const path=safeStrategicTransportRoute(s,from.id,c.id,faction);if(!path||path.length>5)continue;
   for(const o of cityPersonnel(s,from.id).filter(o=>!o.army&&!o.unit.troops&&!o.unit.wounded&&o.unit.id!==from.governor&&!busy(s,o.unit.id)&&!economicStaffingError(s,from,[o.unit.id]))){
    const preview={...s,cities:s.cities.map(x=>({...x,units:x.units.filter(u=>u.id!==o.unit.id)})),campaign:{...s.campaign,idle:[...s.campaign.idle.filter(x=>x.unit.id!==o.unit.id),{unit:o.unit,faction,location:c.id}]}};
    const ranked=directions.flatMap(direction=>rankOfficerCandidates(preview,[o.unit],{task:'domestic',city:c.id,direction}).map(x=>({...x,score:x.recommendation.score*domesticIntentWeight(s,c.id,direction)}))).sort((a,b)=>b.score-a.score);
    const best=ranked[0];if(!best?.recommendation.available)continue;
    const current=assignmentFor(s,o.unit.id),cost=current?rankOfficerCandidates(s,[o.unit],{task:'domestic',city:from.id,direction:current.direction})[0].recommendation.score:0;
    candidates.push({from,u:o.unit,score:best.score-cost*.5-path.length*5});
   }
  }
  candidates.sort((a,b)=>b.score-a.score||a.u.id.localeCompare(b.u.id));const best=candidates[0];if(!best||best.score<=0)continue;
  const result=requestFactionOrder(s,faction,{kind:'transfer',cityId:best.from.id,officerIds:[best.u.id],target:c.id,cargo:{gold:0,grain:0,manpower:0},route:safeStrategicTransportRoute(s,best.from.id,c.id,faction),safeOnly:true},'after');if(!result.error)record(s,`city-force:${best.from.id}`,'transfer',c.id,`调任${best.u.name}补充当地内政人才`);
 }
}
function relieveCityFood(s,faction){
 for(const c of s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id))){
  const use=localFoodUse(c),toHarvest=10-(s.campaign.day-1)%10;
  if(!use||c.grain>=use*ECONOMY_RULES.budget.criticalFoodDays||c.grain>=use*toHarvest)continue;
  // Only actual incoming grain with a safe, timely route can postpone relief.
  const inbound=s.campaign.idle.filter(o=>o.faction===faction&&o.destination===c.id&&o.cargo?.grain&&o.journey&&!o.journey.blocked).filter(o=>{
   let from=o.location,cost=-o.journey.progress;for(const to of o.journey.route){cost+=roadCost(s,from,to);from=to;}
   return Math.ceil(cost/personnelSpeed(o))<=Math.max(0,c.grain/use)&&safeStrategicTransportRoute(s,o.location,c.id,faction);
  }).reduce((n,o)=>n+o.cargo.grain,0);
  if(c.grain+inbound>=use*toHarvest)continue;
  const p=activePlans(s).find(p=>p.faction===faction&&p.phase!=='consolidate');if(p)cancelPlan(s,p,'本城口粮告急，取消可选进攻并保留粮草');
  const candidates=[...c.units].filter(u=>!u.mission&&!busy(s,u.id)).sort((a,b)=>strategicPower(s,{...cityForce(c),units:[a]})-strategicPower(s,{...cityForce(c),units:[b]})||a.id.localeCompare(b.id));
  for(const u of candidates){
   if(c.grain+inbound>=localFoodUse(c)*toHarvest)break;
   const remaining={...cityForce(c),units:c.units.filter(x=>x.id!==u.id)};
   if(strategicPower(s,remaining)<Math.max(0,reserveNeed(s,c)))continue;
   if(!disbandCityUnits(s,c.id,[u.id],{scheduled:true,faction}))record(s,'city-force:'+c.id,'recover',c.id,'口粮即将耗尽且无及时运输，部分驻军转回预备兵，保留守备与真实兵员');
  }
 }
}
export function planStrategicAI(s){
 const ai=s.campaign.ai;if(ai.lastPlanDay===s.campaign.day||s.finished)return;ai.lastPlanDay=s.campaign.day;
 consolidateCityArmies(s);emergencyOrders(s);
 for(const faction of Object.keys(ai.factions)){
  planStrategicScouting(s,faction);
  const policy=ai.factions[faction];policy.style=factionStrategicProfile(s,faction).style;refreshCityIntents(s,faction);
  planStrategicSupport(s,faction,{availableUnits,commandUnits,retreatArmy,cancelPlan});
  for(const p of activePlans(s).filter(p=>p.faction===faction))progressPlan(s,p);
  const review=policy.lastReviewTurn!==s.turn;
  if(review){policy.lastReviewTurn=s.turn;createPlan(s,faction);}
  refreshCityIntents(s,faction);logistics(s,faction);relieveCityFood(s,faction);refreshCityIntents(s,faction);if(review)personnel(s,faction);
  for(const p of activePlans(s).filter(p=>p.faction===faction))progressPlan(s,p);
 }
 for(const [id,v] of Object.entries(ai.cities))if(town(s,id)?.owner!==v.faction)delete ai.cities[id];
 const closed=ai.plans.filter(p=>['complete','cancelled'].includes(p.phase));if(closed.length>20){const remove=new Set(closed.slice(0,closed.length-20).map(p=>p.id));ai.plans=ai.plans.filter(p=>!remove.has(p.id));}
}
export function validateStrategicAI(s){
 const ai=s.campaign.ai,fail=(ok,msg='战略AI存档无效')=>{if(!ok)throw new Error(msg);},int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const factions=nationalScenario(s.campaign.scenarioId).factions.filter(f=>f!==playerFaction(s));
 fail(ai?.version===STRATEGIC_AI.version&&!Object.hasOwn(ai,'treasuries'));
 fail(int(ai.lastPlanDay,s.campaign.day)&&int(ai.lastEconomyTurn,s.turn)&&Array.isArray(ai.decisions)&&ai.decisions.length<=80);
 fail(ai.factions&&Object.keys(ai.factions).length===factions.length&&factions.every(f=>{const p=ai.factions[f];return p&&Object.hasOwn(STYLES,p.style)&&int(p.lastReviewTurn,s.turn)&&['develop','attack'].includes(p.stance)&&!Object.hasOwn(p,'nextOffensiveDay');}));
 fail(ai.cities&&Object.entries(ai.cities).every(([id,c])=>town(s,id)&&factions.includes(c.faction)&&['front','staging','rear','recovery','talent'].includes(c.role)&&int(c.defenseNeed)&&int(c.grainNeed)&&int(c.manpowerNeed)&&int(c.updatedDay,s.campaign.day)));
 fail(int(ai.nextPlanId)&&ai.nextPlanId>0&&Array.isArray(ai.plans)&&ai.plans.length<=20+factions.length);
 const ids=new Set(),claimed=new Set(),active=new Set();
 for(const p of ai.plans){
  fail(p&&int(p.id)&&p.id>0&&p.id<ai.nextPlanId&&!ids.has(p.id)&&factions.includes(p.faction));ids.add(p.id);
  fail(['prepare','assemble','attack','consolidate','complete','cancelled'].includes(p.phase)&&town(s,p.target)&&town(s,p.staging)&&p.target!==p.staging&&int(p.createdDay,s.campaign.day)&&p.createdDay>0&&int(p.updatedDay,s.campaign.day)&&p.updatedDay>=p.createdDay&&int(p.deadline)&&p.deadline>=p.createdDay&&typeof p.reason==='string'&&p.reason.length<=120&&!/[<>]/.test(p.reason));
  fail(Array.isArray(p.officerIds)&&p.officerIds.length>0&&p.officerIds.length<=Object.keys(OFFICER_BY_ID).length&&new Set(p.officerIds).size===p.officerIds.length&&p.officerIds.every(id=>OFFICER_BY_ID[id]));
  fail(Array.isArray(p.origins)&&p.origins.length>0&&p.origins.every(g=>town(s,g.cityId)&&int(g.grain)&&Array.isArray(g.officerIds)&&g.officerIds.length>0&&g.officerIds.length<=10&&g.officerIds.every(id=>p.officerIds.includes(id))));
  const originIds=p.origins.flatMap(g=>g.officerIds);fail(originIds.length===p.officerIds.length&&new Set(originIds).size===originIds.length);
  fail(p.reserves&&Object.entries(p.reserves).every(([id,n])=>town(s,id)&&int(n)));
  if(!['complete','cancelled'].includes(p.phase)){fail(!active.has(p.faction));active.add(p.faction);for(const id of p.officerIds){fail(!claimed.has(id));claimed.add(id);}}
 }
 const supportIds=new Set(),supportKeys=new Set();fail(int(ai.nextSupportId)&&ai.nextSupportId>0&&Array.isArray(ai.supports)&&ai.supports.length<=factions.length*SUPPORT.maxMissions);
 for(const p of ai.supports){const key=p.faction+':'+p.kind+':'+(p.battleId||p.target);fail(int(p.id)&&p.id>0&&p.id<ai.nextSupportId&&!supportIds.has(p.id)&&!supportKeys.has(key)&&factions.includes(p.faction)&&['guard','reinforce'].includes(p.kind)&&town(s,p.target)&&int(p.createdDay,s.campaign.day)&&p.createdDay>0&&int(p.lastNeededDay,s.campaign.day)&&p.lastNeededDay>=p.createdDay&&int(p.deadline)&&p.deadline>=p.createdDay&&(p.kind==='guard'?p.battleId===null&&isJunction(s,p.target):typeof p.battleId==='string'&&[...s.campaign.battles,...(s.campaign.archive||[])].some(r=>r.id===p.battleId)));
  supportKeys.add(key);
  supportIds.add(p.id);fail(ai.supports.filter(q=>q.faction===p.faction).length<=SUPPORT.maxMissions&&Array.isArray(p.officerIds)&&p.officerIds.length>0&&p.officerIds.length<=Object.keys(OFFICER_BY_ID).length&&new Set(p.officerIds).size===p.officerIds.length);
  for(const id of p.officerIds){fail(OFFICER_BY_ID[id]&&!claimed.has(id));claimed.add(id);}
 }
 fail(ai.decisions.every(d=>int(d.day,s.campaign.day)&&d.day>0&&typeof d.armyId==='string'&&/^(a\d+|city-force:[a-z0-9-]+)$/.test(d.armyId)&&['attack','reinforce','guard','stage','hold','retreat','recover','transport','transfer'].includes(d.kind)&&(d.target===null||town(s,d.target))&&typeof d.reason==='string'&&d.reason.length<=120&&!/[<>]/.test(d.reason)));
}
