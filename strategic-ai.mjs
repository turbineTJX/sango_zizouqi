import {planBanditExpedition} from './bandits.mjs';
import {gateDurability} from './building-durability.mjs';
import {armySupplyCapacity} from './army-supply.mjs';
import {cityBudget} from './city-budget.mjs';
import {citySupplyBudgets,forecastArmySupply,cityFoodRequirement,localFoodUse,withCitySupplyQueries} from './city-logistics.mjs';
import {economicStaffingError,cityNeedsAgriculture,cityNeedsCommerce} from './economy.mjs';
import {domesticStaffing} from './domestic-staffing.mjs';
import {personnelCityProfile,staffingDepartureError,personnelRoleScore} from './strategic-personnel.mjs';
import {personnelSpeed} from './personnel-movement.mjs';
import {troopTypes,equipmentTypes,canEquip,equipmentCost} from './troop-equipment.mjs';
import {cityIntelligence,cityObservation,visionEnabled,cityVisible,intelligenceWorld} from './strategic-vision.mjs';
import {planStrategicScouting,waitingForStrategicScout} from './strategic-scouting-ai.mjs';
import {scoutAssignment} from './scouting-state.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {trainingCost} from './troop-training.mjs';
import {changeCityTroop,equipCityUnit} from './strategic-campaign.mjs';
import {marchItinerary} from './strategic-movement.mjs';
import {mapNode,cityRoads,adjacentCityPath,isJunction} from './road-network.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {cityCaptureResources} from './city-resources.mjs';
import {trainingRate} from './troop-training.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {COMBAT,CAMPAIGN_TIME} from './combat-rules.mjs';
import {unitAttributes} from './unit-stats.mjs';
import {isAIControlled} from './player-faction.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {cityForce,cityForces} from './city-units.mjs';
import {cityPersonnel,residentOfficer} from './city-personnel.mjs';
import {chosenRoad,roadCost,movementPoints,roadDistance,threatenedTransportRoute,remainingMarchDays} from './strategic-movement.mjs';
import {issueCommand} from './engine.mjs';
import {canTrain,assignmentFor,pendingDomesticOrder,removeDomesticOrder,reservedMen,cityFoodReserve,recruitmentLimit,DIRECTIONS,ACTIONS} from './domestic.mjs';
import {nationalScenario} from './national-scenarios.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {requestFactionOrder} from './strategic-orders.mjs';
import {prepareCityUnits,disbandCityUnits,recruitLocalUnits,findCampaignRoute,orderCampaignArmy,consolidateCityArmies,expeditionError,campaignBattleSide,CAMPAIGN} from './strategic-campaign.mjs';
import {factionLord,cityReserve} from './talent-core.mjs';
import {withPlanningQueries} from './planning-queries.mjs';
import {activePlans,offensivePlans,plannedOfficer,plannedGrain,plannedCargo,domesticIntentWeight} from './strategic-intent.mjs';
import {factionsHostile,diplomaticAssignment,diplomaticProtection} from './diplomacy-relations.mjs';
import {declareDiplomaticWar} from './diplomacy.mjs';
import {beginUnitRetreat} from './battle-retreat.mjs';
import {planStrategicSupport} from './strategic-support-ai.mjs';
import {STRATEGIC_SUPPORT_RULES as SUPPORT} from './data/design/strategic-support-rules.mjs';
import {hasStrategicTrait,armyStrategicTrait} from './strategic-traits.mjs';
import {strategicContext,victoryContext,recoveryCityFacts} from './strategic-context.mjs';
import {assessRecoveryCapacity,recoveryAdvantageRequirement,continuationAdvantageRequirement,recoveryFailureReason,addRecoveryRequirements} from './strategic-recovery.mjs';
import {drawFactionTemperament,temperamentTolerance,temperamentAdvantage,validTemperament} from './strategic-temperament.mjs';
import {assessWarTempo} from './strategic-tempo.mjs';
import {planVictoryStrategy,emptyVictoryValue,victoryValueReason} from './strategic-victory.mjs';
import {newFactionStrategy,chooseFactionStrategy} from './strategic-policy.mjs';
import {captureTasks,updateCaptureTasks,validateCaptureTasks,validateFactionStrategy,validMilitaryEvidence} from './strategic-planner.mjs';
import {validMapRoute} from './strategic-movement.mjs';
import {STRATEGIC_PLANNING_RULES as PLANNING} from './data/design/strategic-planning-rules.mjs';
import {forecastStrategicPreparation} from './strategic-forecast.mjs';
import {runStrategicAlgorithm,strategicAlgorithmProfile} from './strategic-algorithms.mjs';
import {manageArmyManagementAI} from './strategic-management-ai.mjs';
import {staffingOfficer,progressStrategicStaffing,validateStrategicStaffing} from './strategic-staffing.mjs';
import {forecastRouteSupply,forecastCoordinatedSupply,withRouteSupplyQueries} from './strategic-route-supply.mjs';
import {foodConsumption} from './army-supply.mjs';
import {observedCityDefense,assessStrategicOpposition} from './strategic-opposition.mjs';
import {assessCombatForce,estimateCombatLossFraction} from './strategic-combat-assessment.mjs';
import {campaignBattleTerrain} from './strategic-campaign.mjs';

const OFFENSIVE=ECONOMY_RULES.ai.offensive;
export const STRATEGIC_AI=Object.freeze({version:17,attackRatio:1.7,foodDays:5,planDays:40});
const STYLES=OFFENSIVE.styles;
const minimumEnemyReserve=Math.min(...Object.values(STYLES).map(p=>p.reserve));
const style=(s,f)=>STYLES[s.campaign.ai?.factions[f]?.style||'balanced'];
const offensivePolicy=(s,f)=>OFFENSIVE.styles[s.campaign.ai?.factions[f]?.style||'balanced'];
const recovered=u=>u.wounded/Math.max(1,u.troops+u.wounded)<=OFFENSIVE.maxWoundedShare;
const homeFood=(s,c)=>Math.max(2500,cityFoodReserve(s,c,OFFENSIVE.homeFoodDays));
const town=mapNode;
const fighting=(s,id)=>s.campaign.battles.find(b=>!b.settled&&b.armyIds.includes(id));
const besieged=(s,id)=>s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===id);
const neighbors=(s,id)=>cityRoads(s).flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
const forces=s=>[...s.armies.filter(a=>!a.disbanded),...cityForces(s)];
const foodUse=units=>foodConsumption(units.reduce((n,u)=>n+u.troops,0),units.reduce((n,u)=>n+u.wounded,0));
const busy=(s,id,allowStaffing=false)=>!!scoutAssignment(s,id)||!!pendingDomesticOrder(s,id)||!!diplomaticAssignment(s,id)||plannedOfficer(s,id)||!allowStaffing&&staffingOfficer(s,id);
const ownArmy=(s,f,id)=>s.armies.find(a=>a.faction===f&&!a.disbanded&&a.units.some(u=>u.id===id));
function observedCity(s,c,faction){
 if(!visionEnabled(s)||c.owner===faction)return c;
 const i=cityIntelligence(s,c.id,faction);if(i.data)return i.data;
 const known=cityObservation(s,c.id,faction);
 return {...known,grain:0,commerce:1,buildings:{walls:{[known.id]:{hp:MOVEMENT_RULES.vision.unknownGateHp,maxHp:MOVEMENT_RULES.vision.unknownGateHp}}}};
}
function perceivedForces(s,faction){return forces(intelligenceWorld(s,faction));}
function observedOpponents(view,target,opposition){
 const ids=new Set([...opposition.reinforcements,...opposition.contenders].map(r=>r.id));
 return forces(view).filter(a=>a.location===target.id&&!a.travel||ids.has(a.id)).flatMap(a=>a.units);
}
function plannedCombatForce(s,c,units){
 const role=key=>rankOfficerCandidates(s,units,{task:'role',role:key,city:c.id})[0]?.unit.id;
 return {...cityForce(c),units,leader:role('leader'),advisor:role('advisor')};
}
const perceivedRoute=(s,from,to,faction)=>findCampaignRoute(intelligenceWorld(s,faction),from,to,faction);
export function factionStrategicProfile(s,faction){
 const id=factionLord(s,faction),lord=residentOfficer(s,id)?.unit||ownArmy(s,faction,id)?.units.find(u=>u.id===id)||OFFICER_BY_ID[id];
 const stat=key=>Math.max(0,Math.min(100,lord?.[key]??50));
 const disposition=[1,2].includes(lord?.personality)?'cautious':lord?.personality===4?'bold':'balanced';
 const judgment=stat('leadership')*OFFENSIVE.judgmentLeadershipWeight+stat('intellect')*(1-OFFENSIVE.judgmentLeadershipWeight);
 return {lordId:id,name:lord?.name||'君主',personality:[1,2,3,4].includes(lord?.personality)?lord.personality:3,leadership:stat('leadership'),intellect:stat('intellect'),politics:stat('politics'),style:disposition,judgment,errorBound:(1-judgment/100)*OFFENSIVE.maxEstimateError,developmentWeight:.75+stat('politics')/100};
}
// A stable, bounded assessment error, not a combat bonus or a rerolled daily die.
// Own resources, legal routes and physical presence are always checked exactly.
export function estimateStrategicEnemy(s,faction,targetId,power){
 const profile=factionStrategicProfile(s,faction);let hash=2166136261;
 for(const char of `${profile.lordId}:${targetId}`)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return power*(1+(hash/4294967295*2-1)*profile.errorBound);
}
// Game adapter: measure own resources and lawful observations once. Algorithms
// receive detached values; shared admission rules retain the final veto.
export function offensiveFacts(s,{faction,staging,target,groups,assaultDays,siegeDays,columns=null,victoryAssessment=null,context=null}){
 target=observedCity(s,target,faction);const view=intelligenceWorld(s,faction);
 const units=groups.flatMap(g=>g.units),force=plannedCombatForce(s,staging,units),terrain=campaignBattleTerrain(s,staging.id,target.id),profile=factionStrategicProfile(s,faction);
 let cap=strategicCapabilities(s,force,{terrain});
 const assembly=columns?0:Math.max(0,...groups.map(g=>g.days)),selected=new Set(units.map(u=>u.id));
 const opposition=assessStrategicOpposition(s,{faction,target,approachDays:assembly+assaultDays,siegeDays,power:(v,a)=>strategicPower(v,a,{opponents:units,terrain}),arrivalDays});
 cap=strategicCapabilities(s,force,{opponents:observedOpponents(view,target,opposition),terrain});
 siegeDays=opposition.total===0?0:Math.max(siegeDays,2,Math.ceil(gateDurability(target).hp/Math.max(1,cap.siege)));
 const defense=estimateStrategicEnemy(s,faction,target.id,opposition.total),counterByFaction={},reliefIds=new Set([...opposition.reinforcements,...opposition.contenders].map(r=>r.id));
 for(const e of perceivedForces(s,faction).filter(e=>!reliefIds.has(e.id)&&(e.faction===target.owner||factionsHostile(s,e.faction,faction))&&e.location!==target.id&&neighbors(s,target.id).includes(e.travel?.to||e.location))){
  if(arrivalDays(view,e,target.id)>assembly+assaultDays+siegeDays+PLANNING.assemblyDays)continue;
  const power=strategicPower(view,e),available=e.cityForce?power*(1-style(s,faction).reserve):power;
  counterByFaction[e.faction]=(counterByFaction[e.faction]||0)+available;
 }
 const sources=groups.map(g=>({cityId:g.c.id,men:g.units.reduce((n,u)=>n+u.troops,0),days:g.days,foodUse:foodUse(g.units),carry:armySupplyCapacity(g.units),
  manpower:g.c.manpower-reservedMen(g.c)-plannedCargo(s,g.c.id,'manpower'),gold:g.c.gold-strategicCityBudget(s,g.c).goldNeed,
  remainingPower:strategicPower(s,cityForce({...g.c,units:g.c.units.filter(u=>!selected.has(u.id))})),defenseNeed:Math.max(0,reserveNeed(s,g.c,observeStrategicThreat(s,g.c,{prospectiveFaction:target.owner}))),
  staffingError:economicStaffingError(s,g.c,g.units.map(u=>u.id))||null}));
 const intel=cityIntelligence(s,target.id,faction);
 const victoryValue=(victoryAssessment||planVictoryStrategy(victoryContext(s,faction,view),s.campaign.ai?.factions[faction]?.strategy.victory)).targets[target.id]||emptyVictoryValue();
 const supply=columns?forecastCoordinatedSupply(s,columns.map(c=>({army:c.force,path:c.route,days:c.days*2+siegeDays+2,delay:assaultDays-c.days}))):forecastRouteSupply(s,{...cityForce(staging),units},perceivedRoute(view,staging.id,target.id,faction),assaultDays*2+siegeDays+2,{attack:true});
 const sourceSupply=!!columns||groups.every(g=>forecastRouteSupply(s,{...cityForce(g.c),units:g.units},perceivedRoute(view,g.c.id,staging.id,faction),g.days+2).feasible);
 const ownContext=context||strategicContext(s,faction),duration=assembly+assaultDays*2+siegeDays+2;
 // A centrally assembled army actually returns to the staging depot. Assess
 // that same depot before gathering, rather than borrowing all source budgets.
 const recoveryGroups=columns?groups:[{c:staging,units}],arrivals=columns?[]:units.filter(u=>!staging.units.some(v=>v.id===u.id));
 const recoveryInputs={day:s.campaign.day,returnDays:duration,cities:recoveryGroups.map(g=>({...recoveryCityFacts(s,g.c,g.units,strategicCityBudget(s,g.c),ownContext),
  manpower:Math.max(0,g.c.manpower-reservedMen(g.c)-plannedCargo(s,g.c.id,'manpower')),
  trainingRate:g.units.reduce((n,u)=>n+u.troops*trainingRate(u,g.c),0)/Math.max(1,g.units.reduce((n,u)=>n+u.troops,0))}))};
 // Admission must retain the same departure load as daily execution. An
 // existing plan already reserves that load through cityBudget; a candidate
 // must subtract its prospective load once, without spending it or counting
 // an existing reservation a second time.
 for(const [i,g]of recoveryGroups.entries()){
  const carry=armySupplyCapacity(g.units),committed=activePlans(s).filter(p=>p.officerIds.some(id=>selected.has(id))).reduce((n,p)=>n+(p.reserves[g.c.id]||0),0);
  recoveryInputs.cities[i].grain=Math.max(0,recoveryInputs.cities[i].grain-Math.max(0,carry-committed));
 }
 if(arrivals.length)recoveryInputs.cities[0].dailyFood+=foodUse(arrivals);
 return {facts:{version:5,faction,day:s.campaign.day,target:{id:target.id,kind:target.kind,commerce:target.commerce,grain:target.grain},observedStockValue:observedTargetStockValue({known:!!intel.data,observedDay:intel.day},target,s.campaign.day),victoryValue,opposition,oppositionLossFactor:PLANNING.opposition.lossFactor,combatLossFraction:estimateCombatLossFraction(cap.field,defense),combatAssessment:cap.assessment,recoveryInputs,siegeDays,intelligence:{known:!!intel.data,visible:intel.visible,observedDay:intel.day},
  fieldPower:cap.field,defense,men:units.reduce((n,u)=>n+u.troops,0),foodUse:foodUse(units),carry:armySupplyCapacity(units),supply,sourcesSupplied:sourceSupply,
  duration,assaultSupplyDays:assaultDays*2+siegeDays+2,
  assemblyGrain:columns?0:groups.reduce((n,g)=>n+foodUse(g.units)*g.days,0),
  refillGoldWeight:recoveryGroups.reduce((n,g)=>n+g.units.reduce((m,u)=>m+u.troops*trainingRate(u,g.c),0),0),
  maintenanceGold:ECONOMY_RULES.maintenance.goldPerThousandTroops,
  counterEstimate:estimateStrategicEnemy(s,faction,target.id,Math.max(0,...Object.values(counterByFaction))),
  relieveBorder:neighbors(s,target.id).some(id=>cityObservation(s,id,faction)?.owner===faction),sources,
  work:units.flatMap(u=>{const job=assignmentFor(s,u.id),action=job?.action;return action&&!action.paused?[{ability:u[DIRECTION_STATS[job.direction]]||0,cost:action.cost||0,remaining:Math.max(0,Math.ceil(action.remaining))}]:[];})},profile};
}
export function evaluateOffensive(s,proposal){
 return withPlanningQueries(s,()=>offensiveEvaluation(s,proposal));
}
export function observedTargetStockValue(intelligence,target,day){
 const age=day-intelligence.observedDay;
 if(!intelligence.known||!Number.isFinite(age)||age<0||age>PLANNING.recovery.freshIntelligenceDays)return 0;
 const {retained}=cityCaptureResources(target),value=retained.gold+retained.grain*ECONOMY_RULES.value.grain;
 return Math.min(PLANNING.victory.maxObservedStockBonus,value*PLANNING.victory.observedStockShare/PLANNING.victory.observedStockGoldPerPoint);
}
function offensiveEvaluation(s,proposal){
 const {facts:f,profile}=offensiveFacts(s,proposal),algorithms=s.campaign.ai?.algorithms||PLANNING.algorithms;
 const prediction=runStrategicAlgorithm('battlePredictor',algorithms,{facts:f,profile,rules:OFFENSIVE});
 const recovery=assessRecoveryCapacity(f.recoveryInputs,prediction.estimatedLosses);
 const evaluation=runStrategicAlgorithm('offensiveEvaluator',algorithms,{facts:{...f,recovery},prediction,profile,rules:OFFENSIVE});
 const {estimatedLosses,consumedGrain,replacementGold,militaryGold,counterPower}=prediction;
 const {benefit,cost,workCost}=evaluation,policy=offensivePolicy(s,proposal.faction);
 const temperament=proposal.temperament===undefined?s.campaign.ai.factions[proposal.faction].temperament:proposal.temperament;
 const tolerance=temperamentTolerance(temperament,estimatedLosses/Math.max(1,f.men),recovery),score=evaluation.score+tolerance.valueBonus;
 const survivors=f.fieldPower*(1-estimatedLosses/Math.max(1,f.men)),requiredAdvantage=temperamentAdvantage(recoveryAdvantageRequirement(policy.ratio,recovery,f.intelligence,f.day),tolerance);
 let reason=null;
 if(f.fieldPower<=f.defense*requiredAdvantage)reason='预计攻守优势不足';
 else if(!f.supply.feasible||!f.sourcesSupplied)reason='实际携粮与安全粮道不足以覆盖预计行军与攻城';
 else if(f.sources.some(g=>g.remainingPower<g.defenseNeed))reason='出兵后本城守备不足';
 else if(f.sources.some(g=>g.staffingError))reason='钱粮预算需要保留本城经济负责人，先安排替代人手';
 else if(!recovery.feasible)reason=recoveryFailureReason(recovery);
 else if(f.sources.some(g=>g.gold<0||g.gold<militaryGold*g.men/Math.max(1,f.men)))reason='预计出征军费超出本城可用金';
 else if(survivors<counterPower)reason='预计攻下后难以抵挡周边反攻';
 else if(score<policy.minimumValue)reason=workCost>benefit/2?'抽调内政人员代价高，优先发展':'目标收益不足以抵偿行军、战损与补给成本';
 const advantage=f.defense>0?f.fieldPower/f.defense:null;
 return {accepted:!reason,reason:reason||`${tolerance.active?'君主本旬愿意承担有限战争风险；':''}${victoryValueReason(f.victoryValue)}；预计战损${estimatedLosses}兵，现有兵粮与回城后补兵能力可承担`,score,rawScore:evaluation.score,benefit,cost,estimatedLosses,consumedGrain,replacementGold,militaryGold,workCost,counterPower,judgment:profile.judgment,victoryValue:f.victoryValue,opposition:f.opposition,recovery,advantage,requiredAdvantage,supplyDays:f.assaultSupplyDays,
  military:{model:'static-v2-no-bonds',attackOutput:f.combatAssessment.output,attackDurability:f.combatAssessment.durability,attackPower:f.fieldPower,defensePower:f.defense,requiredAdvantage,estimatedLosses,emergencyMen:f.opposition.emergencyMen,reinforcementPower:f.opposition.reinforcementPower,contestingPower:f.opposition.contestingPower,staleMargin:f.opposition.staleMargin,observedDay:f.intelligence.observedDay,recovery,temperament:structuredClone(temperament??null)}};
}
export function initializeStrategicAI(s){
 const factions=nationalScenario(s.campaign.scenarioId).factions.filter(f=>isAIControlled(s,f));
 s.campaign.ai={version:STRATEGIC_AI.version,temperamentSeed:(s.seed^0x5e73b91d)>>>0,algorithms:strategicAlgorithmProfile(),lastPlanDay:0,lastEconomyTurn:0,nextPlanId:1,nextSupportId:1,plans:[],supports:[],staffing:[],cities:{},factions:Object.fromEntries(factions.map(f=>{const personality=OFFICER_BY_ID[factionLord(s,f)]?.personality;return [f,{style:personality===2?'cautious':personality===4?'bold':'balanced',lastReviewTurn:0,temperament:null,stance:'develop',strategy:newFactionStrategy(s.cities.length,s.cities.filter(c=>c.owner===f).length)}];})),decisions:[]};
}
export function strategicPower(s,a,options={}){
 const b=fighting(s,a.id),units=b?b.battle.sides.flatMap(x=>x.units).filter(u=>u.armyId===a.id):a.units;
 return assessCombatForce({...a,units},{...options,tick:b?.battle.tick||0}).power;
}
// Estimates affect choices only, never battle stats or learned tactics.
export function strategicCapabilities(s,a,options={}){
 const assessment=assessCombatForce(a,options),field=assessment.power;
 // At most six units attack at once. Use basic gate damage per calendar day;
 // learned bursts and temporary buffs are not guaranteed sustained production.
 const siege=a.units.slice(0,6).reduce((n,u)=>{const p=unitAttributes(u.equipment?.siege?{...u,formType:u.equipment.siege}:u,null,{ignoreBonds:true});return n+p.siege*COMBAT.damageScale*CAMPAIGN_TIME.stepsPerDay/p.attackInterval;},0);
 return {field,siege,assessment,foodPerDay:foodUse(a.units),speed:movementPoints(a)};
}
export function strategicTravelDays(s,a,path,from=a.location){
 const speed=movementPoints(a);if(!speed)return Infinity;
 const expanded=[];let at=from;
 for(const next of path){const leg=Number.isFinite(roadCost(s,at,next))?[next]:adjacentCityPath(s,at,next);if(!leg)return Infinity;expanded.push(...leg);at=next;}
 return marchItinerary(s,from,expanded,a,a.roadPolicy||'auto').days;
}
export function strategicArrivalDays(s,a,target){
 const from=a.travel?.to||a.location,path=findCampaignRoute(s,from,target,a.faction);
 if(!path)return Infinity;
 const remaining=remainingMarchDays(s,a);
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
 const view=intelligenceWorld(s,faction);return observedCityDefense(view,c,strategicPower,{emergency:c.owner!==faction}).total;
}
// Military assessments use observed positions; enemy orders remain private.
export function observeStrategicThreat(s,c,{prospectiveFaction=null}={}){
 const view=intelligenceWorld(s,c.owner);
 const hostile=f=>factionsHostile(s,f,c.owner)||f===prospectiveFaction;
 const rows=view.armies.filter(a=>hostile(a.faction)&&(a.travel?.to===c.id||fighting(view,a.id)?.cityId===c.id)).map(a=>{
  return {power:strategicPower(view,a),eta:arrivalDays(view,a,c.id)};});
 const nearby={};for(const a of forces(view).filter(a=>hostile(a.faction)&&!a.travel&&neighbors(s,c.id).includes(a.location))){
  // A road-network neighbor may be many weeks away through shared junctions.
  // Potential departures belong to the next review window. Actual incoming
  // armies above remain full threats regardless of their arrival date.
  if(arrivalDays(view,a,c.id)>PLANNING.assemblyDays)continue;
  // A city's entire garrison is not an expedition. Estimate the share which
  // could leave after keeping a reserve; observed field armies count in full.
  const power=strategicPower(view,a)*(a.cityForce?1-minimumEnemyReserve:1);nearby[a.faction]=(nearby[a.faction]||0)+power;
 }
 return {power:rows.reduce((n,x)=>n+x.power,0),eta:Math.min(Infinity,...rows.map(x=>x.eta)),nearby:Math.max(0,...Object.values(nearby))};
}
function reserveNeed(s,c,t=observeStrategicThreat(s,c)){
 const stationed=s.armies.filter(a=>a.faction===c.owner&&!a.disbanded&&!a.travel&&!a.route.length&&a.location===c.id&&!fighting(s,a.id)).reduce((n,a)=>n+strategicPower(s,a),0);
 return Math.max(0,t.power*1.1,t.nearby*style(s,c.owner).reserve)-gateDurability(c).hp/6-stationed;
}
// Recheck the actual departure, including a previously queued order. A past
// planning snapshot must not authorize stripping a newly threatened city.
export function strategicDepartureError(s,q){
 const c=town(s,q.cityId);if(!c||!s.campaign.ai?.factions[q.faction])return null;
 if(q.kind==='transfer'&&q.officerIds.some(id=>staffingOfficer(s,id))){const error=staffingDepartureError(s,c,q.officerIds);if(error)return error;}
 const target=q.target&&cityObservation(s,q.target,q.faction);
 if(target?.owner!==q.faction||observeStrategicThreat(s,target).power===0){const staffing=economicStaffingError(s,c,q.officerIds);if(staffing)return staffing;}
 const remaining=cityForce({...c,units:c.units.filter(u=>!q.officerIds.includes(u.id))});
 return strategicPower(s,remaining)<Math.max(0,reserveNeed(s,c))?'敌情变化后出兵城守备不足，保留部队并重新评估':null;
}
function availableUnits(s,c){
 const a=cityForce(c),ranked=rankOfficerCandidates(s,a.units.filter(u=>u.troops>0&&!busy(s,u.id)),{task:'expedition',city:c.id}).map(x=>x.unit);
 const selected=[],need=Math.max(0,reserveNeed(s,c));
 for(const u of ranked){
  const ids=new Set([...selected.map(v=>v.id),u.id]);if(economicStaffingError(s,c,[...ids]))continue;
 // Frontage and appointment stats make composition strength non-additive. Measure the
  // actual remaining roster instead of subtracting isolated unit ratings.
  if(strategicPower(s,cityForce({...c,units:a.units.filter(v=>!ids.has(v.id))}))<need)continue;
  selected.push(u);
 }
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
 const result=requestFactionOrder(s,c.owner,{kind:'expedition',cityId:c.id,officerIds:units.map(u=>u.id),leader,advisor,target,route:path,policy:'auto',minSupply:['reinforce','guard'].includes(kind)?Math.ceil(foodUse(units)*(travelDays+SUPPORT.guardFoodDays)):armySupplyCapacity(units)},timing.choice);
 if(result.error)return false;
 const a=ownArmy(s,c.owner,units[0].id);if(a)a.task={attack:'择敌出征',stage:'前线集结',reinforce:'增援',guard:'保护粮路'}[kind];
 record(s,a?.id||`city-force:${c.id}`,kind,target,reason+'；'+timing.reason);return true;
}
export function strategicCityBudget(s,c,options={}){
 return withCitySupplyQueries(s,()=>{
  const {supplies=citySupplyBudgets(s),supplyForecast=forecastArmySupply(s,{supplies})}=options;
  const budget=cityBudget(s,c,{supplies,supplyForecast,workPolicy:'essential'});
  return {budget,goldNeed:Math.ceil(Math.max(cityReserve(s,c),budget.costs.gold+budget.reserve.gold)),grainNeed:Math.ceil(Math.max(2500,cityFoodReserve(s,c,ECONOMY_RULES.ai.foodReserveDays)+plannedGrain(s,c.id)+c.budget.grainReserve))};
 });
}
export function manageStrategicEconomy(s){
 const ai=s.campaign.ai;if(ai.lastEconomyTurn===s.turn)return;ai.lastEconomyTurn=s.turn;
 // Recruitment may use half the opening treasury. Keep the other half for
 // officer-led civil work, rather than spending every available coin first.
 const supplies=citySupplyBudgets(s),supplyForecast=forecastArmySupply(s,{supplies}),budgets=withCitySupplyQueries(s,()=>new Map(s.cities.filter(c=>Object.hasOwn(ai.factions,c.owner)).map(c=>[c.id,strategicCityBudget(s,c,{supplies,supplyForecast})])));
 const floors=Object.fromEntries([...budgets].map(([id,b])=>[id,Math.max(b.goldNeed,Math.ceil(town(s,id).gold/2),ai.cities[id]?.goldNeed||0)]));
 for(const c of s.cities.filter(c=>Object.hasOwn(ai.factions,c.owner))){
  if(besieged(s,c.id)||budgets.get(c.id).budget.shortages.grain)continue;
  const plan=offensivePlans(s).find(p=>p.faction===c.owner&&p.staging===c.id),path=plan&&perceivedRoute(s,c.id,plan.target,c.owner);
  const view=intelligenceWorld(s,c.owner),front=neighbors(s,c.id).filter(id=>factionsHostile(s,town(view,id).owner,c.owner));
  const needsShip=path?.some((id,i)=>chosenRoad(s,i?path[i-1]:c.id,id)?.terrain==='water')||front.some(id=>adjacentCityPath(s,c.id,id)?.some((next,i,route)=>chosenRoad(s,i?route[i-1]:c.id,next)?.terrain==='water'));
  // Preparation cannot depend on already passing the siege/carry admission.
  const needsSiege=plan?cityDefense(s,town(s,plan.target),c.owner)>0:front.some(id=>cityDefense(s,town(view,id),c.owner)>0);
  const siegeCandidates=plan?c.units.filter(u=>plan.officerIds.includes(u.id)):availableUnits(s,c).filter(recovered);
  const siegeOfficer=siegeCandidates.some(u=>u.equipment.siege)?null:siegeCandidates[0]?.id;
  for(const u of c.units.filter(u=>u.troops>0&&!u.mission)){
   const family=TROOP_DESIGNS[u.type].family,preferred={spear:u.force>=u.intellect?'qingzhou':'baier',halberd:u.force>u.leadership?'greatHalberd':'rattan',cavalry:u.force>=u.intellect?'tigerCavalry':'whiteHorse',archer:u.force>=u.intellect?'longbow':'crossbow'}[family];
   const options=troopTypes().filter(id=>TROOP_DESIGNS[id].family===family&&TROOP_DESIGNS[id].tier===1&&canTrain(c,id)),target=options.includes(preferred)?preferred:options[0];
   if(TROOP_DESIGNS[u.type].tier===0&&target&&c.gold-trainingCost(target,u.troops+u.wounded,c)>=floors[c.id])changeCityTroop(s,c.id,u.id,target,{scheduled:true,faction:c.owner});
   const e=structuredClone(u.equipment);
   if(needsShip&&!e.ship)e.ship=equipmentTypes('ship').filter(id=>canEquip(c,id)).sort((a,b)=>TROOP_DESIGNS[b].tier-TROOP_DESIGNS[a].tier||TROOP_DESIGNS[a].goldPerThousand-TROOP_DESIGNS[b].goldPerThousand)[0]||null;
   if(needsSiege&&!e.siege&&u.id===siegeOfficer)e.siege=equipmentTypes('siege').filter(id=>canEquip(c,id)).sort((a,b)=>TROOP_DESIGNS[b].tier-TROOP_DESIGNS[a].tier||TROOP_DESIGNS[a].goldPerThousand-TROOP_DESIGNS[b].goldPerThousand)[0]||null;
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
 return withCitySupplyQueries(s,()=>refreshCityIntentFacts(s,faction));
}
function refreshCityIntentFacts(s,faction){
 const ai=s.campaign.ai,plans=offensivePlans(s).filter(p=>p.faction===faction),view=intelligenceWorld(s,faction);
 for(const c of s.cities.filter(c=>c.owner===faction)){
  const threat=observeStrategicThreat(view,c),front=neighbors(s,c.id).some(id=>town(view,id).owner!==faction);
  const role=threat.power>0?'front':activePlans(s).some(q=>q.faction===faction&&q.phase==='consolidate'&&q.target===c.id)?'recovery':plans.some(p=>p.staging===c.id)?'staging':cityPersonnel(s,c.id).length<2&&c.kind==='city'?'talent':front?'front':'rear';
  const demands=[ai.factions[faction].strategy.goal?.requirements.find(r=>r.cityId===c.id),...plans.map(p=>p.requirements.find(r=>r.cityId===c.id))].filter(Boolean);
  const required=Object.fromEntries(['gold','grain','manpower'].map(k=>[k,Math.max(0,...demands.map(r=>r[k]))]));
  ai.cities[c.id]={faction,role,defenseNeed:Math.ceil(Math.max(0,reserveNeed(s,c,threat))),goldNeed:required?.gold||0,grainNeed:Math.ceil(Math.max(required?.grain||0,2500,cityFoodReserve(s,c,ECONOMY_RULES.ai.foodReserveDays)+c.budget.grainReserve+plannedGrain(s,c.id),homeFood(s,c)+plannedGrain(s,c.id))),manpowerNeed:Math.max((required?.manpower||0)-reservedMen(c),['front','staging','recovery'].includes(role)&&c.units.length?3000:0),updatedDay:s.campaign.day};
 }
}
function cancelPlan(s,p,reason){
 const operational=p.phase!=='consolidate';
 p.phase='cancelled';p.updatedDay=s.campaign.day;p.reason=reason;p.reserves={};p.repairUntil=null;
 if(operational)for(const q of [...s.campaign.domestic.orders])if(q.faction===p.faction&&q.kind==='expedition'&&q.officerIds.some(id=>p.officerIds.includes(id)))removeDomesticOrder(s,q.id,reason);
 const policy=s.campaign.ai.factions[p.faction];if(!policy.strategy.goal?.planId||policy.strategy.goal.planId===p.id)policy.stance='develop';
 record(s,`city-force:${p.staging}`,'hold',p.target,reason);
 if(operational)for(const a of s.armies.filter(a=>a.faction===p.faction&&a.units.some(u=>p.officerIds.includes(u.id))&&!fighting(s,a.id)))retreatArmy(s,a,reason);
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
   const p=offensivePlans(s).find(p=>p.faction===a.faction&&p.officerIds.some(id=>a.units.some(u=>u.id===id)));if(p)cancelPlan(s,p,'军团预计无法维持补给，取消进攻并提前回撤');else retreatArmy(s,a,'携粮或粮道预算不足，沿道路提前回城补给');
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
  // A distant attack cannot rescue an unrelated city before the enemy arrives.
  // Release a plan only for its own source/staging defense or for committed
  // resident troops that can actually be sent within this rescue window.
  const p=offensivePlans(s).find(p=>p.faction===c.owner&&(p.staging===c.id||p.origins.some(g=>g.cityId===c.id)||s.cities.some(from=>{
   if(from.owner!==c.owner)return false;
   const units=from.units.filter(u=>p.officerIds.includes(u.id));if(!units.length)return false;
   const path=perceivedRoute(s,from.id,c.id,c.owner);
   return path&&strategicTravelDays(s,plannedCombatForce(s,from,units),path)<=threat.eta;
  })));
  if(p)cancelPlan(s,p,`${c.name}守备告急，优先保境`);
  const sources=s.cities.filter(x=>x.owner===c.owner&&x.id!==c.id&&!besieged(s,x.id)).map(x=>({c:x,path:perceivedRoute(s,x.id,c.id,c.owner)})).filter(x=>x.path).map(x=>({...x,units:availableUnits(s,x.c).slice(0,10)})).filter(x=>x.units.length).map(x=>({...x,days:strategicTravelDays(s,{...cityForce(x.c),units:x.units},x.path)})).filter(x=>x.days<=threat.eta).sort((a,b)=>a.days-b.days||a.c.id.localeCompare(b.c.id));
  for(const x of sources){if(need<=0)break;const a={...cityForce(x.c),units:x.units};if(x.c.grain<foodUse(x.units)*(x.days+2))continue;
   if(commandUnits(s,x.c,x.units,c.id,'reinforce','援军可及时抵达，优先救援',{arrivalDeadline:s.campaign.day+threat.eta}))need-=strategicPower(s,a);
  }
  record(s,`city-force:${c.id}`,'hold',c.id,need>0?'敌军逼近，守备仍有缺口':'守城并等待已派援军');
 }
}
export function strategicColumnTravelDays(s,force,path,from=force.location){
 return marchItinerary(s,from,path,force,force.roadPolicy||'auto').days;
}
function operationColumns(s,faction,target,groups,limit){
 const result=[];
 for(const g of groups){const route=perceivedRoute(s,g.c.id,target.id,faction);if(!route)return null;
  for(let i=0;i<g.units.length;i+=limit){const units=g.units.slice(i,i+limit),force=plannedCombatForce(s,g.c,units),days=strategicColumnTravelDays(s,force,route);
   if(!Number.isFinite(days))return null;result.push({cityId:g.c.id,officerIds:units.map(u=>u.id),route:[...route],days,force});
  }
 }return result;
}
function createPlan(s,faction){return withRouteSupplyQueries(s,()=>reviewPlan(s,faction));}
function reviewPlan(s,faction){
 const ai=s.campaign.ai,policy=ai.factions[faction],running=offensivePlans(s).filter(p=>p.faction===faction),existing=running[0];
 const context=strategicContext(s,faction),previous=policy.strategy,routeView=intelligenceWorld(s,faction);
 const victoryAssessment=planVictoryStrategy(context,previous.victory);
 const focus=victoryAssessment.victory.focus,focusOwner=focus&&cityObservation(s,focus.targetCity,faction)?.owner;
 if(focus&&!factionsHostile(s,faction,focusOwner))planStrategicScouting(s,faction,{prospectiveTarget:focus.targetCity});
 const cities=s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id)),pool=new Map(cities.map(c=>[c.id,availableUnits(s,c).filter(recovered)])),options=[],goals=[],admission=[];
 const tempo=assessWarTempo(context,pool),canPlan=!existing||running.length<tempo.operationLimit&&running.every(p=>p.phase==='attack')&&!context.critical;
 const candidateTolerance=temperamentTolerance(policy.temperament,0,{feasible:true});
 // Secondary fronts have independent home depots. Shared road capacity is
 // still measured against all actual armies by the normal supply forecast.
 const committedCities=new Set(running.flatMap(p=>[p.staging,...p.origins.map(g=>g.cityId)]));
 if(existing)for(const id of committedCities)pool.set(id,[]);
 const explain=(staging,target,stage,reason,units=[])=>admission.push({staging:staging.id,target:target.id,stage,reason,unitCount:units.length,troops:units.reduce((n,u)=>n+u.troops,0)});
 const reports=new Map(),defenses=new Map(),assemblyPairs=[];
 const observe=id=>{if(!reports.has(id))reports.set(id,observedCity(s,town(s,id),faction));return reports.get(id);};
 // Candidate comparison is read-only. Drop all observation and supply caches
 // before adopting the goal, reserving people, declaring war or issuing orders.
 withPlanningQueries(s,()=>{
 const pairs=cities.flatMap(staging=>neighbors(s,staging.id).map(id=>({staging,target:observe(id)})))
  .filter(x=>!committedCities.has(x.staging.id)&&!running.some(p=>p.target===x.target.id)&&x.target.owner!==faction&&!diplomaticProtection(s,faction,x.target.owner)&&!diplomaticProtection(s,x.target.owner,faction)&&!(cityVisible(s,x.target.id,faction)&&besieged(s,x.target.id)))
  .map(x=>{if(!defenses.has(x.target.id))defenses.set(x.target.id,cityDefense(s,x.target,faction));const path=adjacentCityPath(routeView,x.staging.id,x.target.id);return {...x,empty:defenses.get(x.target.id)===0,distance:path?path.reduce((n,id,i)=>n+roadCost(routeView,i?path[i-1]:x.staging.id,id),0):Infinity};})
  .sort((a,b)=>Number(b.target.id===previous.goal?.targetCity)-Number(a.target.id===previous.goal?.targetCity)||Number(b.empty)-Number(a.empty)||(victoryAssessment.targets[b.target.id]?.score||0)-(victoryAssessment.targets[a.target.id]?.score||0)||a.distance-b.distance||b.target.commerce-a.target.commerce||a.target.id.localeCompare(b.target.id)||a.staging.id.localeCompare(b.staging.id)).slice(0,PLANNING.pairLimit);
 if(canPlan)for(const {staging,target} of pairs){
  if(goals.length>=PLANNING.candidateLimit)break;
  if(observeStrategicThreat(s,staging).power>cityDefense(s,staging)){explain(staging,target,'guard','集结城已有来袭威胁，先保境');continue;}
  const defenseNeed=Math.max(0,reserveNeed(s,staging,observeStrategicThreat(s,staging,{prospectiveFaction:target.owner}))),localPower=strategicPower(s,cityForce(staging));
  if(localPower<defenseNeed){
   explain(staging,target,'guard','当前守备尚不足，先调运真实部队补齐守备');
   const donors=cities.filter(c=>c.id!==staging.id).map(c=>({c,units:pool.get(c.id).filter(u=>u.id!==c.governor).slice(0,10),path:safeStrategicTransportRoute(routeView,c.id,staging.id,faction)})).filter(g=>g.path&&g.units.length&&g.path.reduce((n,id,i)=>n+roadCost(s,i?g.path[i-1]:g.c.id,id),0)/personnelSpeed({unit:g.units[0],cargo:{gold:0,grain:0,manpower:0}})<=PLANNING.preparationTurns*10);
   const incoming=s.campaign.idle.filter(o=>o.faction===faction&&o.destination===staging.id&&!o.journey?.blocked&&o.unit.troops>0);
   const available=donors.reduce((n,g)=>n+strategicPower(s,{...cityForce(g.c),units:g.units}),0)+incoming.reduce((n,o)=>n+strategicPower(s,{...cityForce(staging),units:[o.unit]}),0);
   const targetPower=estimateStrategicEnemy(s,faction,target.id,cityDefense(s,target,faction));
   if(available>=defenseNeed-localPower+targetPower*temperamentAdvantage(style(s,faction).ratio,candidateTolerance)){
    const requirements=[{cityId:staging.id,gold:strategicCityBudget(s,staging).goldNeed,grain:Math.ceil(homeFood(s,staging)+localFoodUse(staging)*PLANNING.preparationTurns*10),manpower:0,defensePower:Math.ceil(defenseNeed)}];
    const forecast=forecastStrategicPreparation(context,requirements,ai.algorithms);if(forecast.feasible)forecast.reason='钱粮可准备，仍须部队实际到达并复核守备与出征资格';
    const victoryValue=victoryAssessment.targets[target.id]||emptyVictoryValue();
    if(forecast.feasible)goals.push({candidateId:'capture-garrison:'+staging.id+':'+target.id,kind:'capture',targetFaction:target.owner,targetCity:target.id,staging:staging.id,ready:false,score:OFFENSIVE.objectiveValues.city+victoryValue.score-PLANNING.preparationPenalty-targetPower/OFFENSIVE.securityPowerPerPoint,reason:'先经安全道路调运真实部队补齐集结地守备，再重新评估出征',requirements,forecast,victoryValue});
   }
   continue;
  }
   const groups=cities.map(c=>{const path=perceivedRoute(routeView,c.id,staging.id,faction),units=tempo.phase==='early'?pool.get(c.id).slice(0,10):pool.get(c.id),a={...cityForce(c),units};return {c,units,path,days:path?strategicTravelDays(s,a,path):Infinity};}).filter(x=>x.units.length&&x.days<=tempo.assemblyDays).sort((a,b)=>a.days-b.days||a.c.id.localeCompare(b.c.id));
   const selected=[];let power=0,variants=0;const defense=estimateStrategicEnemy(s,faction,target.id,cityDefense(s,target,faction)),required=defense*temperamentAdvantage(Math.max(PLANNING.recovery.minimumAdvantage,style(s,faction).ratio-PLANNING.recovery.maximumAdvantageRelief),candidateTolerance);
   const candidates=groups.flatMap(x=>x.units.map((u,index)=>({x,u,index}))).sort((a,b)=>Number(!!assignmentFor(s,a.u.id)?.action)-Number(!!assignmentFor(s,b.u.id)?.action)||a.x.days-b.x.days||a.index-b.index||a.u.id.localeCompare(b.u.id));
   for(const {x,u} of candidates){let group=selected.find(g=>g.c.id===x.c.id);if(!group){group={...x,units:[]};selected.push(group);}group.units.push(u);power=selected.reduce((n,g)=>n+strategicCapabilities(s,{...cityForce(g.c),units:g.units}).field,0);
   if(power<=required)continue;
   // Keep the complete middle/late force as an alternative. Three nearby
   // small variants must not hide the troops already gathered at the front.
   if(variants>=PLANNING.forceVariants&&!(tempo.phase!=='early'&&selected.flatMap(g=>g.units).length===candidates.length))continue;
   const units=selected.flatMap(x=>x.units),a={...cityForce(staging),units},cap=strategicCapabilities(s,a);
   const coordinated=tempo.phase==='joint'&&units.length>tempo.columnUnits,columns=coordinated?operationColumns(s,faction,target,selected,tempo.columnUnits):null;
   if(coordinated&&!columns)continue;
   const assaultDays=columns?Math.max(...columns.map(c=>c.days)):strategicTravelDays(s,a,[target.id]),siegeDays=defense===0?0:Math.max(2,Math.ceil(gateDurability(target).hp/Math.max(1,cap.siege)));
   if(!Number.isFinite(assaultDays))continue;
   const evaluation=evaluateOffensive(s,{faction,staging,target,groups:selected,assaultDays,siegeDays,columns,victoryAssessment,context});
   // Continue adding actual troops after a weak force fails admission. Such a
   // force must not exhaust the three genuinely viable composition alternatives.
   if(evaluation.reason==='预计攻守优势不足')continue;
   variants++;
   const supplyDays=evaluation.supplyDays,grain=armySupplyCapacity(units);
   const routeSupply=columns?forecastCoordinatedSupply(s,columns.map(c=>({army:c.force,path:c.route,days:c.days*2+siegeDays+2,delay:assaultDays-c.days}))):forecastRouteSupply(s,a,perceivedRoute(routeView,staging.id,target.id,faction),supplyDays,{attack:true});
   if(!routeSupply.feasible||!columns&&selected.some(x=>!forecastRouteSupply(s,{...cityForce(x.c),units:x.units},x.path,x.days+2).feasible)){explain(staging,target,'carry','实际携粮与安全粮道不足以完成本次往返与攻城',units);assemblyPairs.push({staging,target});continue;}
   const origins=selected.map(x=>({cityId:x.c.id,officerIds:x.units.map(u=>u.id),grain:armySupplyCapacity(x.units)}));
   const waiting=waitingForStrategicScout(s,faction,target.id);
   const men=units.reduce((n,u)=>n+u.troops,0),requirements=selected.map(g=>({cityId:g.c.id,
     gold:Math.ceil(strategicCityBudget(s,g.c).goldNeed+evaluation.militaryGold*g.units.reduce((n,u)=>n+u.troops,0)/Math.max(1,men)),
     grain:Math.ceil(homeFood(s,g.c)+(columns?armySupplyCapacity(g.units):g.c.id===staging.id?grain:armySupplyCapacity(g.units))),manpower:reservedMen(g.c)}));
   if(!requirements.some(r=>r.cityId===staging.id)&&!columns)requirements.push({cityId:staging.id,gold:strategicCityBudget(s,staging).goldNeed,grain:Math.ceil(homeFood(s,staging)+grain),manpower:0});
   addRecoveryRequirements(requirements,evaluation.recovery,id=>town(s,id));
   for(const supply of routeSupply.sourceRequirements){const c=town(s,supply.cityId),r=requirements.find(r=>r.cityId===c.id);if(r)r.grain+=supply.grain;else requirements.push({cityId:c.id,gold:strategicCityBudget(s,c).goldNeed,grain:Math.ceil(homeFood(s,c)+supply.grain),manpower:0});}
   const forecast=forecastStrategicPreparation(context,requirements,ai.algorithms),funded=requirements.every(r=>{const c=town(s,r.cityId);return ['gold','grain','manpower'].every(k=>c[k]>=r[k]);});
   const preparable=evaluation.accepted||recoverableBudget(evaluation)&&evaluation.score>=offensivePolicy(s,faction).minimumValue;
   const ready=evaluation.accepted&&funded&&!waiting;
   const reason=waiting?'等待斥候取得目标情报后再评估出征':!funded&&preparable?forecast.reason:evaluation.reason;
   explain(staging,target,ready?'ready':waiting?'scout':preparable?'budget':'value',reason,units);
   if(preparable&&forecast.feasible){
    const report=cityIntelligence(s,target.id,faction),age=report.day===null?PLANNING.maximumUncertainty:Math.min(PLANNING.maximumUncertainty,Math.max(0,s.campaign.day-report.day-3)*PLANNING.uncertaintyPerDay);
    const candidateId=['capture',staging.id,target.id,units.map(u=>u.id).join(',')].join(':');
    goals.push({candidateId,kind:'capture',targetFaction:target.owner,targetCity:target.id,staging:staging.id,ready,score:evaluation.score-offensivePolicy(s,faction).minimumValue-age,reason,requirements,forecast,forces:{unitCount:units.length,troops:men},offensiveEvaluation:evaluation,victoryValue:evaluation.victoryValue});
   }
   if(!ready)record(s,`city-force:${staging.id}`,'hold',target.id,reason);
   // A real supply preparation may reserve officers before arrival. Daily
   // execution still requires actual stock and the shared departure checks.
   if(!evaluation.accepted||waiting||!funded&&!forecast.feasible)continue;
   options.push({candidateId:['capture',staging.id,target.id,units.map(u=>u.id).join(',')].join(':'),staging,target,origins,columns,units:[...units],grain,score:evaluation.score,reason:evaluation.reason,military:evaluation.military,requirements,ready,executionDays:Math.ceil((columns?0:Math.max(0,...selected.map(g=>g.days)))+evaluation.supplyDays-assaultDays-2+PLANNING.tempo.executionBufferDays)});
  }
  if(variants===0){explain(staging,target,'force','当前合法可用编组不足以满足预计攻守优势',selected.flatMap(g=>g.units));assemblyPairs.push({staging,target});}
 }
 // A failed expedition is not a reason to leave the same soldiers spread
 // across rear depots forever. Prepare a forward concentration through real
 // personnel transfers, then reconsider combat only after actual arrival.
 if(canPlan&&tempo.phase!=='early'&&!context.critical&&!goals.some(g=>g.ready)){
  const seen=new Set();let prepared=0;
  for(const pair of assemblyPairs){const key=pair.staging.id+':'+pair.target.id;if(seen.has(key))continue;seen.add(key);
   if(goals.some(g=>g.staging===pair.staging.id&&g.targetCity===pair.target.id))continue;
   const candidate=captureAssemblyCandidate(s,faction,pair,pool,cities,context,victoryAssessment,candidateTolerance);
   if(candidate){goals.push(candidate);if(++prepared>=PLANNING.forceVariants)break;}
  }
 }
 });
 policy.strategy=chooseFactionStrategy(context,factionStrategicProfile(s,faction),previous,goals,{activePlan:existing,force:previous.critical!==context.critical,algorithms:ai.algorithms,admission,temperament:policy.temperament});
 if(existing&&!canPlan)return;
 options.sort((a,b)=>b.score-a.score||a.target.id.localeCompare(b.target.id)||a.staging.id.localeCompare(b.staging.id));
 const goal=existing?chooseFactionStrategy(context,factionStrategicProfile(s,faction),{...previous,goal:null,trace:[]},goals.filter(g=>g.ready),{force:true,algorithms:ai.algorithms,admission,temperament:policy.temperament}).goal:policy.strategy.goal;
 const best=goal?.kind==='capture'&&options.find(o=>o.candidateId===goal.candidateId&&(!existing||o.ready));if(!best){policy.stance=existing?'attack':'develop';return;}
 if(!factionsHostile(s,faction,best.target.owner)){
  const error=declareDiplomaticWar(s,faction,best.target.owner,{approved:true});
  if(error){if(!existing){goal.status='cancelled';goal.reason=error;goal.requirements=[];policy.stance='develop';}return;}
 }
 const reserves=best.columns?{}:{[best.staging.id]:best.grain};for(const g of best.origins)if(best.columns||g.cityId!==best.staging.id)reserves[g.cityId]=(reserves[g.cityId]||0)+g.grain;
 const report=cityIntelligence(s,best.target.id,faction);
 const p={id:ai.nextPlanId++,faction,phase:'prepare',target:best.target.id,staging:best.staging.id,officerIds:best.units.map(u=>u.id),origins:best.origins,reserves,requirements:structuredClone(best.requirements),columnUnits:tempo.columnUnits,columns:best.columns?.map(({cityId,officerIds,route,days})=>({cityId,officerIds,route,days,departureDay:null}))||null,repairUntil:null,military:structuredClone(best.military),createdDay:s.campaign.day,updatedDay:s.campaign.day,deadline:s.campaign.day+Math.max(style(s,faction).patience,best.executionDays),reason:best.reason,tasks:captureTasks(s.campaign.day),intelligence:{day:report.day,visible:report.visible}};
 ai.plans.push(p);if(!existing){policy.strategy.goal.planId=p.id;policy.strategy.goal.status='running';}policy.stance='attack';record(s,`city-force:${p.staging}`,'stage',p.target,p.reason);
}
function captureAssemblyCandidate(s,faction,{staging,target},pool,cities,context,victoryAssessment,tolerance){
 const local=pool.get(staging.id),view=intelligenceWorld(s,faction),path=perceivedRoute(view,staging.id,target.id,faction);
 if(!path)return null;
 const incoming=s.campaign.idle.filter(o=>o.faction===faction&&o.destination===staging.id&&!o.journey?.blocked&&o.unit.troops>0).map(o=>o.unit);
 const queued=s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='transfer'&&q.target===staging.id).flatMap(q=>town(s,q.cityId)?.units.filter(u=>q.officerIds.includes(u.id))||[]);
 const prospects=[...local,...incoming,...queued],ids=new Set(prospects.map(u=>u.id));
 const donors=cities.filter(c=>c.id!==staging.id).flatMap(c=>{const units=pool.get(c.id).filter(u=>u.id!==c.governor&&!ids.has(u.id)),route=units.length&&safeStrategicTransportRoute(view,c.id,staging.id,faction);if(!route)return [];
  const cost=route.reduce((n,id,i)=>n+roadCost(view,i?route[i-1]:c.id,id),0);
  return units.map(u=>({u,days:Math.ceil(cost/personnelSpeed({unit:u,destination:staging.id,cargo:{gold:0,grain:0,manpower:0}}))})).filter(x=>x.days+(assignmentFor(s,x.u.id)?.action?.remaining||0)<=PLANNING.preparationTurns*10);
 }).sort((a,b)=>a.days-b.days||a.u.id.localeCompare(b.u.id));
 const sample=plannedCombatForce(s,staging,prospects.length?prospects:donors.slice(0,1).map(d=>d.u)),approachDays=strategicTravelDays(s,sample,path);
 if(!Number.isFinite(approachDays))return null;
 const opposition=assessStrategicOpposition(s,{faction,target,approachDays,siegeDays:PLANNING.opposition.minimumBattleDays,power:strategicPower,arrivalDays});
 const required=estimateStrategicEnemy(s,faction,target.id,opposition.total)*temperamentAdvantage(style(s,faction).ratio,tolerance);
 const strength=units=>strategicCapabilities(s,plannedCombatForce(s,staging,units)).field;
 if(strength(local)>required)return null;
 for(const donor of donors){if(strength(prospects)>required)break;prospects.push(donor.u);}
 if(strength(prospects)<=required||prospects.length===local.length)return null;
 const force=plannedCombatForce(s,staging,prospects),days=strategicTravelDays(s,force,path),cap=strategicCapabilities(s,force),siegeDays=required?Math.max(2,Math.ceil(gateDurability(target).hp/Math.max(1,cap.siege))):0;
 if(!forecastRouteSupply(s,force,path,days*2+siegeDays+2,{attack:true}).feasible)return null;
 const arrivals=prospects.filter(u=>!staging.units.some(v=>v.id===u.id)),budget=strategicCityBudget(s,staging);
 const requirements=[{cityId:staging.id,gold:budget.goldNeed,grain:Math.ceil(homeFood(s,staging)+foodUse(arrivals)*PLANNING.preparationTurns*10+armySupplyCapacity(prospects)),manpower:0,
  defensePower:Math.ceil(strategicPower(s,cityForce({...staging,units:[...staging.units,...arrivals]})))}];
 const forecast=forecastStrategicPreparation(context,requirements,s.campaign.ai.algorithms);if(!forecast.feasible)return null;
 const victoryValue=victoryAssessment.targets[target.id]||emptyVictoryValue();
 return {candidateId:'capture-assembly:'+staging.id+':'+target.id,kind:'capture',targetFaction:target.owner,targetCity:target.id,staging:staging.id,ready:false,
  score:OFFENSIVE.objectiveValues.city+victoryValue.score-PLANNING.preparationPenalty-days*OFFENSIVE.dayCost,
  reason:'先经安全道路将真实现役集中到前沿，实际到达后重新核对出征、守备与补给',requirements,forecast,victoryValue};
}
function releaseSourceCarry(s,p,c){
 delete p.reserves[c.id];const goal=s.campaign.ai.factions[p.faction].strategy.goal;
 const r=goal?.planId===p.id&&goal.requirements.find(r=>r.cityId===c.id);if(r)r.grain=Math.ceil(homeFood(s,c));
 const demand=p.requirements.find(r=>r.cityId===c.id);if(demand)demand.grain=Math.ceil(homeFood(s,c));
}
function prepareGarrison(s,faction){
 const g=s.campaign.ai.factions[faction].strategy.goal;
 const demands=[...(g?.kind==='capture'&&g.status==='preparing'?g.requirements:[]),...offensivePlans(s).filter(p=>p.faction===faction&&p.repairUntil!==null).flatMap(p=>p.requirements)];
 for(const r of demands.filter(r=>r.defensePower))prepareCityGarrison(s,faction,r);
}
function prepareCityGarrison(s,faction,r){
 const c=town(s,r.cityId);if(!c||c.owner!==faction||besieged(s,c.id))return;
 const queued=s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='transfer'&&q.target===c.id).flatMap(q=>town(s,q.cityId)?.units.filter(u=>q.officerIds.includes(u.id))||[]);
 const incoming=s.campaign.idle.filter(o=>o.faction===faction&&o.destination===c.id&&!o.journey?.blocked).map(o=>o.unit);
 if(strategicPower(s,cityForce({...c,units:[...c.units,...incoming,...queued]}))>=Math.max(r.defensePower,reserveNeed(s,c)))return;
 const view=intelligenceWorld(s,faction),donors=s.cities.filter(x=>x.owner===faction&&x.id!==c.id&&!besieged(s,x.id)).map(from=>({from,units:availableUnits(s,from).filter(recovered).filter(u=>u.id!==from.governor),path:safeStrategicTransportRoute(view,from.id,c.id,faction)})).filter(x=>x.units.length&&x.path).sort((a,b)=>a.path.length-b.path.length||a.from.id.localeCompare(b.from.id));
 for(const {from,units,path}of donors){const u=units[0],days=Math.ceil(path.reduce((n,id,i)=>n+roadCost(s,i?path[i-1]:from.id,id),0)/personnelSpeed({unit:u,destination:c.id,cargo:{gold:0,grain:0,manpower:0}}));if(days>PLANNING.preparationTurns*10)continue;
  const timing=expeditionTiming(s,from.id,[u.id],{travelDays:days});if(timing.error||timing.choice==='after'&&(assignmentFor(s,u.id)?.action?.remaining||0)+days>PLANNING.preparationTurns*10)continue;
  const result=requestFactionOrder(s,faction,{kind:'transfer',cityId:from.id,officerIds:[u.id],target:c.id,cargo:{gold:0,grain:0,manpower:0},route:path,safeOnly:true},timing.choice);
  if(!result.error){record(s,'city-force:'+from.id,'transfer',c.id,'按主攻准备调运现役部队补齐集结地守备，实际到达后重评');break;}
 }
}
function waitForPlanRepair(s,p,reason){
 if(p.repairUntil===null)p.repairUntil=Math.min(p.deadline,s.campaign.day+PLANNING.tempo.repairTurns*10);
 if(s.campaign.day>=p.repairUntil){cancelPlan(s,p,'准备缺口未能在期限内补齐：'+reason);return false;}
 p.reason=reason+'，保留目标并等待真实准备';return true;
}
function reinforcePreparingPlans(s,faction){
 for(const p of offensivePlans(s).filter(p=>p.faction===faction&&p.repairUntil!==null&&p.reason.startsWith('预计攻守优势不足')&&(!p.columns||p.columns.every(c=>c.departureDay===null)))){
  const staging=town(s,p.staging),target=observedCity(s,town(s,p.target),faction),actors=p.officerIds.map(id=>residentOfficer(s,id)?.unit||ownArmy(s,faction,id)?.units.find(u=>u.id===id)).filter(Boolean);
  if(actors.length!==p.officerIds.length)continue;
  const donors=s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id)).map(c=>({c,path:perceivedRoute(s,c.id,p.columns?p.target:p.staging,faction),units:availableUnits(s,c).filter(recovered)})).filter(g=>g.path).sort((a,b)=>a.path.length-b.path.length||a.c.id.localeCompare(b.c.id));
  let added=0;
  for(const donor of donors)for(const u of donor.units){
   if(added>=PLANNING.forceVariants||strategicCapabilities(s,plannedCombatForce(s,staging,actors)).field>=p.military.defensePower*p.military.requiredAdvantage)break;
   let g=p.origins.find(g=>g.cityId===donor.c.id);if(Math.ceil(p.createdDay/10)<=PLANNING.tempo.earlyLastTurn&&!p.columns&&g?.officerIds.length>=10)continue;
   if(strategicDepartureError(s,{cityId:donor.c.id,faction,officerIds:[...donor.c.units.filter(v=>p.officerIds.includes(v.id)).map(v=>v.id),u.id],target:p.target}))continue;
   if(!g){g={cityId:donor.c.id,officerIds:[],grain:0};p.origins.push(g);}g.officerIds.push(u.id);p.officerIds.push(u.id);actors.push(u);added++;
   const grain=armySupplyCapacity([u]);g.grain+=grain;p.reserves[donor.c.id]=(p.reserves[donor.c.id]||0)+grain;
   if(!p.columns&&donor.c.id!==p.staging)p.reserves[p.staging]=(p.reserves[p.staging]||0)+grain;
   for(const id of new Set([donor.c.id,...(!p.columns?[p.staging]:[])])){let r=p.requirements.find(r=>r.cityId===id);const c=town(s,id);if(!r){r={cityId:id,gold:strategicCityBudget(s,c).goldNeed,grain:0,manpower:0};p.requirements.push(r);}r.grain=Math.ceil(homeFood(s,c)+(p.reserves[id]||0));}
  }
  if(added&&p.columns){const groups=p.origins.map(g=>({c:town(s,g.cityId),units:actors.filter(u=>g.officerIds.includes(u.id))})),columns=operationColumns(s,faction,target,groups,p.columnUnits);if(columns)p.columns=columns.map(({cityId,officerIds,route,days})=>({cityId,officerIds,route,days,departureDay:null}));}
  if(added)p.reason='旬初为原目标补充真实现役部队，重新复核全部预算与守备';
 }
}
function keepRecoveryBudget(s,p,assessment,groups,returnDays){
 const context=strategicContext(s,p.faction);
 for(const g of groups){const c=g.c,b=strategicCityBudget(s,c),own=recoveryCityFacts(s,c,g.units,b,context),row=assessment.recovery.rows.find(r=>r.cityId===c.id);
  const sustainingGold=Math.max(0,own.recurringGold-own.income.gold)*Math.ceil((returnDays+PLANNING.recovery.horizonDays)/10),men=row?.men||0;
  const r=p.requirements.find(r=>r.cityId===c.id)||{cityId:c.id,gold:0,grain:0,manpower:0};
  r.gold=b.goldNeed+Math.min((row?.gold||0)+sustainingGold,Math.max(0,c.gold-b.goldNeed));r.manpower=reservedMen(c)+Math.min(men,Math.max(0,c.manpower-reservedMen(c)));
  r.grain=Math.ceil(Math.max(homeFood(s,c)+(p.reserves[c.id]||0),b.budget.reserve.grain+(row?.required.grain||0)));delete r.defensePower;if(!p.requirements.includes(r))p.requirements.push(r);
 }
 const goal=s.campaign.ai.factions[p.faction].strategy.goal;if(goal?.planId===p.id)goal.requirements=structuredClone(p.requirements);
}
function planDepartureBlocked(s,p,c,ids){
 const error=strategicDepartureError(s,{cityId:c.id,faction:p.faction,officerIds:ids,target:p.target});if(!error)return false;
 if(observeStrategicThreat(s,c).power>cityDefense(s,c)){cancelPlan(s,p,c.name+'已有真实来袭且守备不足，终止进攻');return true;}
 if(!economicStaffingError(s,c,ids)){
  const desired=Math.ceil(Math.max(0,reserveNeed(s,c))+strategicPower(s,plannedCombatForce(s,c,c.units.filter(u=>ids.includes(u.id)))));
  let r=p.requirements.find(r=>r.cityId===c.id);if(!r){r={cityId:c.id,gold:strategicCityBudget(s,c).goldNeed,grain:Math.ceil(homeFood(s,c)),manpower:0};p.requirements.push(r);}r.defensePower=desired;
 }
 waitForPlanRepair(s,p,error);return true;
}
function progressCoordinatedPlan(s,p,actors,staging,target){
 const day=s.campaign.day,launched=actors.some(o=>o.army),groups=p.origins.map(g=>({c:town(s,g.cityId),units:actors.filter(o=>g.officerIds.includes(o.unit.id)).map(o=>o.unit),days:0}));
 if(groups.some(g=>g.c.owner!==p.faction)){cancelPlan(s,p,'军团整补基地失守，撤销协同进攻');return;}
 if(launched&&!continueOperation(s,p,actors,staging,target))return;
 if(p.phase==='attack')return;
 if(p.repairUntil!==null&&day>=p.repairUntil){cancelPlan(s,p,'协同准备超时，释放人员与资源');return;}
 for(const g of groups){const pending=g.c.units.filter(u=>p.officerIds.includes(u.id));if(pending.length&&planDepartureBlocked(s,p,g.c,pending.map(u=>u.id))){if(launched&&p.phase!=='cancelled')cancelPlan(s,p,'协同发令后出兵条件变化，终止原接敌安排');return;}}
 const columns=operationColumns(s,p.faction,target,groups,p.columnUnits);
 if(!columns){cancelPlan(s,p,'协同路线失去控制，撤销未执行军令');return;}
 // Before the first departure, every real column must be supplied and able to
 // depart. Then save the common contact schedule; reloads never reset it.
 if(p.columns.every(c=>c.departureDay===null)){
  if(actors.some(o=>o.army||o.location!==p.origins.find(g=>g.officerIds.includes(o.unit.id)).cityId||!recovered(o.unit))){waitForPlanRepair(s,p,'参战部队尚未在本地整补就绪');return;}
  if(waitingForStrategicScout(s,p.faction,p.target)){p.reason='等待斥候更新目标情报后安排协同接敌';return;}
  for(const g of groups){const timing=expeditionTiming(s,g.c.id,g.units.map(u=>u.id));if(timing.error||timing.choice==='after'){p.reason=timing.error||timing.reason;return;}}
  const approach=Math.max(...columns.map(c=>c.days)),cap=strategicCapabilities(s,plannedCombatForce(s,staging,actors.map(o=>o.unit))),siegeDays=Math.max(2,Math.ceil(gateDurability(target).hp/Math.max(1,cap.siege)));
  const assessment=evaluateOffensive(s,{faction:p.faction,staging,target,groups,columns,assaultDays:approach,siegeDays,temperament:p.military.temperament});p.military=structuredClone(assessment.military);
  if(!assessment.accepted){handlePreparationFailure(s,p,assessment);return;}
  if(s.armies.length+columns.length>CAMPAIGN.maxArmies){p.reason='等待实际军团数量空额';return;}
  for(const c of columns){const home=town(s,c.cityId),ids=c.officerIds,q={cityId:c.cityId,officerIds:ids,leader:c.force.leader,advisor:c.force.advisor,target:p.target,route:c.route,policy:'auto'};
   const error=expeditionError(s,q,{scheduled:true,faction:p.faction});if(error){waitForPlanRepair(s,p,error);return;}
   if(home.grain<homeFood(s,home)+plannedGrain(s,home.id)){waitForPlanRepair(s,p,'本地出征口粮尚未实际到齐');return;}
  }
  p.columns=columns.map(({cityId,officerIds,route,days})=>({cityId,officerIds,route,days,departureDay:day+approach-days}));p.phase='assemble';p.updatedDay=day;p.repairUntil=null;
  keepRecoveryBudget(s,p,assessment,groups,assessment.supplyDays);
 }
 for(const column of p.columns){
  if(column.officerIds.every(id=>ownArmy(s,p.faction,id)))continue;
  if(day<column.departureDay)continue;
  const c=town(s,column.cityId),units=column.officerIds.map(id=>c.units.find(u=>u.id===id));
  if(units.some(u=>!u)){cancelPlan(s,p,'协同军团人员离开原出发地');return;}
  const path=perceivedRoute(s,c.id,p.target,p.faction),force=plannedCombatForce(s,c,units);
  if(!path||JSON.stringify(path)!==JSON.stringify(column.route)||day+strategicColumnTravelDays(s,force,path)>p.updatedDay+Math.max(...p.columns.map(c=>c.days))+PLANNING.tempo.contactWindowDays){cancelPlan(s,p,'协同路线或速度变化，无法在约定窗口接敌');return;}
  const timing=expeditionTiming(s,c.id,column.officerIds);if(timing.error||timing.choice==='after'){cancelPlan(s,p,'协同出发条件变化，无法按约接敌');return;}
  const grainBefore=c.grain;
  if(c.grain<homeFood(s,c)+plannedGrain(s,c.id)||!commandUnits(s,c,units,p.target,'attack','按保存的接敌时间从本地基地协同出征')){cancelPlan(s,p,'协同出发的实际粮草或共同军令复核失败');return;}
  const remaining=c.units.filter(u=>p.officerIds.includes(u.id));if(remaining.length)p.reserves[c.id]=armySupplyCapacity(remaining);else delete p.reserves[c.id];
  const r=p.requirements.find(r=>r.cityId===c.id);if(r)r.grain=Math.ceil(Math.max(homeFood(s,c)+(p.reserves[c.id]||0),r.grain-(grainBefore-c.grain)));
 }
 if(p.officerIds.every(id=>ownArmy(s,p.faction,id))){if(p.phase!=='attack')p.updatedDay=day;p.phase='attack';p.repairUntil=null;p.reason='各军团已从真实基地出发，按约定窗口协同接敌';}
 else p.reason='远路军团先行，近路军团按保存时间出发';
}
function recoverableBudget(assessment){
 return assessment.reason==='预计出征军费超出本城可用金'||!assessment.recovery.feasible&&assessment.recovery.rows.every(r=>r.repairable)&&assessment.reason===recoveryFailureReason(assessment.recovery);
}
function handlePreparationFailure(s,p,assessment){
 const recoverable=recoverableBudget(assessment)||assessment.reason==='预计攻守优势不足'&&assessment.military.attackPower>=assessment.military.defensePower*Math.max(PLANNING.tempo.minimumContinuationAdvantage,assessment.requiredAdvantage-PLANNING.tempo.continuationMargin);
 if(recoverable){
  addRecoveryRequirements(p.requirements,assessment.recovery,id=>town(s,id));
  if(assessment.reason==='预计出征军费超出本城可用金'){
   const total=assessment.recovery.rows.reduce((n,r)=>n+r.men,0);
   for(const row of assessment.recovery.rows){const r=p.requirements.find(r=>r.cityId===row.cityId),share=total?row.men/total:1/assessment.recovery.rows.length;r.gold=Math.max(r.gold,Math.ceil(strategicCityBudget(s,town(s,row.cityId)).goldNeed+assessment.militaryGold*share));}
  }
  waitForPlanRepair(s,p,assessment.reason);return;
 }
 cancelPlan(s,p,assessment.reason);
}
function continueOperation(s,p,actors,staging,target){
 const day=s.campaign.day,engaged=actors.some(o=>o.army&&fighting(s,o.army.id));
 if(!engaged){
  const armies=[...new Set(actors.map(o=>o.army).filter(Boolean))],unitForce={...plannedCombatForce(s,staging,actors.map(o=>o.unit)),morale:Math.min(80,...armies.map(a=>a.morale)),hunger:Math.max(staging.hunger||0,...armies.map(a=>a.hunger||0))};
  const view=intelligenceWorld(s,p.faction),terrain=campaignBattleTerrain(s,staging.id,target.id);let cap=strategicCapabilities(s,unitForce,{terrain});
  const approach=Math.max(0,...actors.map(o=>{if(o.army)return arrivalDays(view,o.army,p.target);const c=p.columns?.find(c=>c.officerIds.includes(o.unit.id));return c?Math.max(0,c.departureDay-day)+c.days:strategicTravelDays(s,unitForce,[p.target]);}));
  const gateDays=Math.max(2,Math.ceil(gateDurability(target).hp/Math.max(1,cap.siege))),opposition=assessStrategicOpposition(s,{faction:p.faction,target,approachDays:approach,siegeDays:gateDays,power:(v,a)=>strategicPower(v,a,{opponents:unitForce.units,terrain}),arrivalDays});
  // Admission and daily review must agree: an observed undefended city is
  // occupied on arrival. Its intact gate cannot invent a months-long siege.
  const siegeDays=opposition.total===0?0:gateDays;
  cap=strategicCapabilities(s,unitForce,{opponents:observedOpponents(view,target,opposition),terrain});
  const defense=estimateStrategicEnemy(s,p.faction,target.id,opposition.total),losses=Math.ceil(unitForce.units.reduce((n,u)=>n+u.troops,0)*estimateCombatLossFraction(cap.field,defense)),context=strategicContext(s,p.faction);
  const homeIds=[...new Set(actors.map(o=>o.army?.homeCity||o.location))];
  const cities=homeIds.map(id=>{const c=town(s,id),units=actors.filter(o=>(o.army?.homeCity||o.location)===id).map(o=>o.unit);if(c?.owner!==p.faction||!units.length)return null;return {...recoveryCityFacts(s,c,units,strategicCityBudget(s,c),context),trainingRate:units.reduce((n,u)=>n+u.troops*trainingRate(u,c),0)/Math.max(1,units.reduce((n,u)=>n+u.troops,0))};}).filter(Boolean);
  if(!cities.length){cancelPlan(s,p,'实际返城补兵基地已失守，保存部队');return false;}
  const returnDays=Math.max(0,...homeIds.map(id=>{const units=actors.filter(o=>(o.army?.homeCity||o.location)===id).map(o=>o.unit),path=perceivedRoute(s,target.id,id,p.faction);return path?(p.columns?strategicColumnTravelDays:strategicTravelDays)(s,{...unitForce,units},path,target.id):Infinity;}));
  const recovery=assessRecoveryCapacity({day,returnDays:approach+siegeDays+returnDays+2,cities},losses),intel=cityIntelligence(s,target.id,p.faction);
  const temperament=p.military.temperament,tolerance=temperamentTolerance(temperament,losses/Math.max(1,unitForce.units.reduce((n,u)=>n+u.troops,0)),recovery);
  const required=temperamentAdvantage(continuationAdvantageRequirement(offensivePolicy(s,p.faction).ratio,recovery,{known:!!intel.data,observedDay:intel.day},day),tolerance);
  p.military={model:'static-v2-no-bonds',attackOutput:cap.assessment.output,attackDurability:cap.assessment.durability,attackPower:cap.field,defensePower:defense,requiredAdvantage:required,estimatedLosses:losses,emergencyMen:opposition.emergencyMen,reinforcementPower:opposition.reinforcementPower,contestingPower:opposition.contestingPower,staleMargin:opposition.staleMargin,observedDay:intel.day,recovery,temperament:structuredClone(temperament)};
  if(cap.field<defense*required){cancelPlan(s,p,'新情报显示敌军动员或增援后优势不足，保存部队');return false;}
  if(!recovery.feasible){cancelPlan(s,p,recoveryFailureReason(recovery)+'，保存部队');return false;}
 }
 if(!actors.some(o=>o.army&&(o.army.route.length||o.army.travel||fighting(s,o.army.id)))){cancelPlan(s,p,'进攻部队已撤回，结束本次计划');return false;}
 return true;
}
function progressPlan(s,p){
 const day=s.campaign.day,target=observedCity(s,town(s,p.target),p.faction),staging=town(s,p.staging);
 if(p.phase==='consolidate'&&target.owner!==p.faction){cancelPlan(s,p,'原占领城市失守，结束当地巩固');return;}
 if(target.owner!==p.faction&&!factionsHostile(s,p.faction,target.owner)){cancelPlan(s,p,'外交约定已改变敌对关系，撤销未执行的进攻');return;}
 if(target.owner===p.faction){if(p.phase!=='consolidate'){p.phase='consolidate';p.updatedDay=day;p.reserves={};p.repairUntil=null;p.reason='目标已占领，恢复守备与粮道';}
  if(!besieged(s,target.id)&&target.grain>=homeFood(s,target)&&target.units.every(recovered)&&cityDefense(s,target)>=Math.max(0,reserveNeed(s,target))){p.phase='complete';p.updatedDay=day;if(s.campaign.ai.factions[p.faction].strategy.goal?.planId===p.id)s.campaign.ai.factions[p.faction].stance='develop';}return;
 }
 if(staging.owner!==p.faction||day>p.deadline){cancelPlan(s,p,staging.owner!==p.faction?'集结地失守，撤销作战计划':'筹备或交战超时，收回兵力');return;}
 const actors=p.officerIds.map(id=>{const o=residentOfficer(s,id),a=ownArmy(s,p.faction,id);return o?.faction===p.faction?o:a?{unit:a.units.find(u=>u.id===id),army:a,location:a.location,faction:p.faction}:null;}).filter(Boolean);
 if(actors.length!==p.officerIds.length){cancelPlan(s,p,'人员损失或离队，重新评估战力');return;}
 if(p.columns){progressCoordinatedPlan(s,p,actors,staging,target);return;}
 if(p.phase==='attack'){continueOperation(s,p,actors,staging,target);return;}
 if(p.repairUntil!==null&&day>=p.repairUntil){cancelPlan(s,p,'准备缺口未能在期限内补齐');return;}
 if(actors.some(o=>!recovered(o.unit))){waitForPlanRepair(s,p,'参战部队伤兵过多，先救治整补');return;}
 if(p.phase!=='attack'&&strategicCapabilities(s,plannedCombatForce(s,staging,actors.map(o=>o.unit))).field<estimateStrategicEnemy(s,p.faction,target.id,cityDefense(s,target,p.faction))*1.05){cancelPlan(s,p,'目标增援后优势消失，暂缓进攻');return;}
 // Check every remaining source before dispatching any part of an assembly.
 for(const c of s.cities.filter(c=>c.owner===p.faction)){
  const ids=c.units.filter(u=>p.officerIds.includes(u.id)).map(u=>u.id);
  if(ids.length&&planDepartureBlocked(s,p,c,ids))return;
 }
 let dispatched=false;
 for(const g of p.origins){
  const c=town(s,g.cityId);if(c.owner!==p.faction){cancelPlan(s,p,'出兵城失守，撤销未执行军令');return;}
  if(c.id===p.staging)continue;
  if(!c.units.some(u=>g.officerIds.includes(u.id)))releaseSourceCarry(s,p,c);
  const units=c.units.filter(u=>g.officerIds.includes(u.id)&&!u.mission&&!u.scouting&&!pendingDomesticOrder(s,u.id));if(!units.length)continue;
  if(!perceivedRoute(s,c.id,p.staging,p.faction)){cancelPlan(s,p,'集结通道失去控制');return;}
  if(c.grain<g.grain+homeFood(s,c))continue;
  if(commandUnits(s,c,units,p.staging,'stage','按势力计划赴前线集结')){dispatched=true;if(!c.units.some(u=>g.officerIds.includes(u.id)))releaseSourceCarry(s,p,c);}
 }
 if(dispatched){p.repairUntil=null;if(p.phase==='prepare'){p.phase='assemble';p.updatedDay=day;}}
 const ready=actors.every(o=>!o.army&&!o.unit.mission&&!o.unit.scouting&&o.location===p.staging&&staging.units.includes(o.unit)&&!pendingDomesticOrder(s,o.unit.id));
 if(!ready||besieged(s,staging.id)){p.reason=besieged(s,staging.id)?'集结地遭围城，先守城':p.officerIds.some(id=>pendingDomesticOrder(s,id))?'等待参战武将完成事务后集结':'各城部队正在集结，等待全部到齐';return;}
 const units=actors.map(o=>o.unit),leave=strategicPower(s,cityForce({...staging,units:staging.units.filter(u=>!p.officerIds.includes(u.id))}));
 if(waitingForStrategicScout(s,p.faction,p.target)){p.reason='等待斥候更新目标情报后再决定进攻';return;}
 if(leave<Math.max(0,reserveNeed(s,staging))){planDepartureBlocked(s,p,staging,units.map(u=>u.id));return;}
 if(staging.grain<plannedGrain(s,staging.id)+homeFood(s,staging)){p.reason='保留本城口粮后出征粮草不足，等待实际运输到达';return;}
 // Evaluate the whole assembled force before interrupting anybody or launching
 // a column, so a protected worker cannot cause a partial assault.
 const timing=expeditionTiming(s,staging.id,units.map(u=>u.id));
 if(timing.error||timing.choice==='after'){p.reason=timing.error||timing.reason;return;}
 const cap=strategicCapabilities(s,{...cityForce(staging),units}),defense=cityDefense(s,target,p.faction);
 const assaultDays=strategicTravelDays(s,{...cityForce(staging),units},[target.id]);
 if(!Number.isFinite(assaultDays)){cancelPlan(s,p,'当前军团缺少船只或路线已无法通行');return;}
 const assessment=evaluateOffensive(s,{faction:p.faction,staging,target,groups:[{c:staging,units,days:0}],assaultDays,siegeDays:defense===0?0:Math.max(2,Math.ceil(gateDurability(target).hp/Math.max(1,cap.siege))),temperament:p.military.temperament});
 p.military=structuredClone(assessment.military);
 if(!assessment.accepted){handlePreparationFailure(s,p,assessment);return;}
 if(s.armies.length+Math.ceil(units.length/p.columnUnits)>CAMPAIGN.maxArmies)return;
 for(let i=0;i<units.length;i+=p.columnUnits){const ids=units.slice(i,i+p.columnUnits).map(u=>u.id);if(expeditionError(s,{cityId:staging.id,officerIds:ids,leader:ids[0],advisor:ids[0],target:p.target,policy:'auto'},{scheduled:true,faction:p.faction}))return;}
 let sent=0;for(let i=0;i<units.length;i+=p.columnUnits)if(commandUnits(s,staging,units.slice(i,i+p.columnUnits),p.target,'attack',assessment.reason))sent++;
 if(sent){p.phase='attack';p.updatedDay=day;p.reserves={};p.repairUntil=null;p.reason=assessment.reason;
  const b=strategicCityBudget(s,staging);
  const own=recoveryCityFacts(s,staging,units,b,strategicContext(s,p.faction)),returnDays=assessment.supplyDays;
  const sustainingGold=Math.max(0,own.recurringGold-own.income.gold)*Math.ceil((returnDays+PLANNING.recovery.horizonDays)/10);
  p.requirements=[{cityId:staging.id,gold:b.goldNeed+Math.min(assessment.replacementGold+sustainingGold,Math.max(0,staging.gold-b.goldNeed)),grain:Math.ceil(Math.max(homeFood(s,staging),b.budget.reserve.grain+(assessment.recovery.rows.find(r=>r.cityId===staging.id)?.required.grain||0))),manpower:reservedMen(staging)+Math.min(assessment.estimatedLosses,Math.max(0,staging.manpower-reservedMen(staging)))}];
  const g=s.campaign.ai.factions[p.faction].strategy.goal;if(g?.planId===p.id)g.requirements=structuredClone(p.requirements);
 }
}
export function safeStrategicTransportRoute(s,from,to,faction){
 const view=intelligenceWorld(s,faction),queue=[{id:from,path:[],cost:0}],seen=new Set();
 const neighbors=new Map();for(const [a,b]of view.roads){if(!neighbors.has(a))neighbors.set(a,[]);if(!neighbors.has(b))neighbors.set(b,[]);neighbors.get(a).push(b);neighbors.get(b).push(a);}
 while(queue.length){let best=0;for(let i=1;i<queue.length;i++)if(queue[i].cost<queue[best].cost||queue[i].cost===queue[best].cost&&queue[i].id.localeCompare(queue[best].id)<0)best=i;
  const [at]=queue.splice(best,1);if(seen.has(at.id))continue;seen.add(at.id);if(at.id===to)return at.path;
  for(const next of neighbors.get(at.id)||[]){if(seen.has(next)||threatenedTransportRoute(view,at.id,[next],faction))continue;queue.push({id:next,path:[...at.path,next],cost:at.cost+roadCost(view,at.id,next)});}
 }
 return null;
}
function logistics(s,faction){
 const ai=s.campaign.ai,cities=s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id));
 const priority=withCitySupplyQueries(s,()=>new Map(cities.map(c=>[c.id,cityBudget(s,c,{includeWork:false})])));
 cities.sort((a,b)=>Number(priority.get(b.id).shortages.grain>0||priority.get(b.id).shortages.gold>0)-Number(priority.get(a.id).shortages.grain>0||priority.get(a.id).shortages.gold>0)||(priority.get(a.id).daysSupply??Infinity)-(priority.get(b.id).daysSupply??Infinity)||a.gold-b.gold||a.id.localeCompare(b.id));
 const inbound=(id,key)=>s.campaign.idle.filter(o=>o.faction===faction&&(o.relayDestination||o.convoyCycle?.target||o.destination)===id).reduce((n,o)=>n+(key==='grain'&&o.convoyCycle?o.cargo.grain+o.convoyCycle.batch*(o.convoyCycle.remaining-(o.convoyCycle.leg==='out'?1:0)):o.cargo?.[key]||0),0)+s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='transfer'&&q.target===id).reduce((n,q)=>n+(q.cargo?.[key]||0)*(key==='grain'?q.cycles||1:1),0);
 const outbound=(id,key)=>s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='transfer'&&q.cityId===id).reduce((n,q)=>n+(q.cargo?.[key]||0),0);
 let funds=null;
 const budgetFor=c=>{
  funds??=withCitySupplyQueries(s,()=>new Map(cities.map(x=>[x.id,strategicCityBudget(s,x)])));
  return funds.get(c.id);
 };
 for(const c of cities){
  const intent=ai.cities[c.id],budget=budgetFor(c),need={gold:Math.max(0,Math.max(budget.goldNeed+500,intent?.goldNeed||0)-c.gold-inbound(c.id,'gold')),grain:Math.max(0,(intent?.grainNeed||2500)-c.grain-inbound(c.id,'grain')),manpower:Math.max(0,(intent?.manpowerNeed||0)-c.manpower+reservedMen(c)-inbound(c.id,'manpower'))};
  const emergency=need.grain>0&&(c.hunger>0||budget.budget.daysSupply!==null&&budget.budget.daysSupply<ECONOMY_RULES.budget.criticalFoodDays);
  if(need.gold<100&&need.grain<300&&need.manpower<300)continue;
  const routeView=intelligenceWorld(s,faction);
  // A road search is useful only when the source can actually load a courier.
  // Recompute for each destination after previous deliveries were ordered.
  // Share read-only depot forecasts within this scan; release the scope before
  // ranking or dispatch can appoint a courier, spend stock or queue an order.
  const sources=withCitySupplyQueries(s,()=>cities.filter(x=>x.id!==c.id).flatMap(x=>{
   const units=cityPersonnel(s,x.id).filter(o=>!o.army&&!o.unit.mission&&!o.unit.troops&&!o.unit.wounded&&o.unit.id!==x.governor&&!busy(s,o.unit.id,emergency)&&!economicStaffingError(s,x,[o.unit.id])).map(o=>o.unit);if(!units.length)return [];
   const sourceBudget=budgetFor(x),cargo={gold:Math.floor(Math.max(0,Math.min(need.gold,x.gold-Math.max(sourceBudget.goldNeed,ai.cities[x.id]?.goldNeed||0)-1000))),grain:Math.floor(Math.max(0,Math.min(need.grain,x.grain-Math.max(3500,sourceBudget.grainNeed,ai.cities[x.id]?.grainNeed||0)))),manpower:Math.floor(Math.max(0,Math.min(need.manpower,x.manpower-reservedMen(x)-Math.max(2500,ai.cities[x.id]?.manpowerNeed||0)-outbound(x.id,'manpower'))))};
   if(cargo.gold<100&&cargo.grain<300&&cargo.manpower<300)return [];
   const path=safeStrategicTransportRoute(routeView,x.id,c.id,faction);return path?[{c:x,path,units,sourceBudget,cargo}]:[];
  }).sort((a,b)=>a.path.reduce((n,id,i)=>n+roadCost(s,i?a.path[i-1]:a.c.id,id),0)-b.path.reduce((n,id,i)=>n+roadCost(s,i?b.path[i-1]:b.c.id,id),0)||a.c.id.localeCompare(b.c.id)));
  for(const x of sources){
   const {units,sourceBudget,cargo}=x;
   const pureGrain=cargo.grain>0&&!cargo.gold&&!cargo.manpower;
   const u=rankOfficerCandidates(s,units,{task:'transfer',city:x.c.id,destination:c.id,cargo}).sort((a,b)=>Number(staffingOfficer(s,a.unit.id))-Number(staffingOfficer(s,b.unit.id))||Number(pureGrain&&hasStrategicTrait(b.unit,'cycleCargo'))-Number(pureGrain&&hasStrategicTrait(a.unit,'cycleCargo'))||b.recommendation.score-a.recommendation.score||a.unit.id.localeCompare(b.unit.id))[0]?.unit;if(!u)continue;
   const cycles=pureGrain&&hasStrategicTrait(u,'cycleCargo')?Math.min(SUPPORT.maximumCycles,Math.floor(cargo.grain/SUPPORT.minimumCargo.grain),Math.floor(Math.max(0,x.c.grain-sourceBudget.grainNeed)/Math.max(SUPPORT.minimumCargo.grain,Math.ceil(cargo.grain/2)))):0;
   if(cycles>=2)cargo.grain=Math.max(SUPPORT.minimumCargo.grain,Math.ceil(cargo.grain/cycles));
   const relay=hasStrategicTrait(u,'relayCargo')?x.path.slice(0,-1).find(id=>s.cities.some(t=>t.id===id&&t.owner===faction))||null:null;
   const staffing=staffingOfficer(s,u.id);
   // Discard every budget before the shared handler can change staff, stock
   // or commitments, including a rejected request with partial preparation.
   funds=null;
   const result=requestFactionOrder(s,faction,{kind:'transfer',cityId:x.c.id,officerIds:[u.id],target:c.id,cargo,route:x.path,relay,cycles:cycles>=2?cycles:0,safeOnly:true},emergency?'now':'after');
   if(!result.error){if(staffing)ai.staffing=ai.staffing.filter(p=>p.officerId!==u.id);record(s,`city-force:${x.c.id}`,'transport',c.id,`${staffing?'口粮救急优先于原调任任务；':''}调运${cargo.gold}金、${cargo.grain}粮、${cargo.manpower}预备兵支援${c.name}，实际沿路运输`);break;}
  }
 }
 funds=null;
 // Receive-grain commanders can meet a real city-to-city convoy at a safe
 // intermediate node. Handoff still happens only on actual co-location.
 for(const a of s.armies.filter(a=>a.faction===faction&&!a.disbanded&&!a.travel&&!fighting(s,a.id)&&isJunction(s,a.location)&&armyStrategicTrait(a,'receiveGrain')&&a.supply<Math.min(a.supplyCapacity,foodUse(a.units)*8))){
  if(s.campaign.idle.some(o=>o.faction===faction&&o.cargo?.grain&&[o.location,...(o.journey?.route||[])].includes(a.location))||s.campaign.domestic.orders.some(q=>q.faction===faction&&q.kind==='transfer'&&q.cargo.grain&&q.route?.includes(a.location)))continue;
  const routeView=intelligenceWorld(s,faction);
  const choices=[];for(const from of cities){const first=safeStrategicTransportRoute(routeView,from.id,a.location,faction);if(!first)continue;for(const to of cities.filter(c=>c.id!==from.id)){const last=safeStrategicTransportRoute(routeView,a.location,to.id,faction);if(!last)continue;const path=[...first,...last];if(new Set([from.id,...path]).size!==path.length+1)continue;choices.push({from,to,path,cost:path.reduce((n,id,i)=>n+roadCost(s,i?path[i-1]:from.id,id),0)});}}
  choices.sort((x,y)=>x.cost-y.cost||x.from.id.localeCompare(y.from.id)||x.to.id.localeCompare(y.to.id));
  for(const x of choices){const b=strategicCityBudget(s,x.from),grain=Math.floor(Math.min(a.supplyCapacity-a.supply,Math.max(0,x.from.grain-b.grainNeed)));if(grain<SUPPORT.minimumCargo.grain)continue;
   const units=cityPersonnel(s,x.from.id).filter(o=>!o.army&&!o.unit.mission&&!o.unit.troops&&!o.unit.wounded&&o.unit.id!==x.from.governor&&!busy(s,o.unit.id)&&!economicStaffingError(s,x.from,[o.unit.id])).map(o=>o.unit),cargo={gold:0,grain,manpower:0},u=rankOfficerCandidates(s,units,{task:'transfer',city:x.from.id,destination:x.to.id,cargo})[0]?.unit;if(!u)continue;
   const result=requestFactionOrder(s,faction,{kind:'transfer',cityId:x.from.id,officerIds:[u.id],target:x.to.id,cargo,route:x.path,safeOnly:true},'after');if(!result.error){record(s,'city-force:'+x.from.id,'transport',x.to.id,'粮车沿实际道路经过驻军节点，抵达后由接粮军团交接');break;}
  }
 }
}
export function planStrategicPersonnel(s,faction){
 const cities=s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id));
 const roles=new Map(cities.map(c=>[c.id,personnelCityProfile(s,c).role]));
 const residents=c=>cityPersonnel(s,c.id).filter(o=>!o.unit.scouting&&!busy(s,o.unit.id));
 // Fill real vacancies in small and large cities, including cities that already
 // have three residents. Headcount alone is not evidence of useful employment.
 for(const c of [...cities].sort((a,b)=>residents(a).length-residents(b).length||a.id.localeCompare(b.id))){
  const personnelArrival=o=>!o.convoyCycle&&!['gold','grain','manpower'].some(k=>o.cargo?.[k]>0);
  if(s.campaign.ai.staffing.some(p=>p.faction===faction&&p.cityId===c.id)||s.campaign.idle.some(o=>o.faction===faction&&o.destination===c.id&&personnelArrival(o))||s.campaign.domestic.orders.some(q=>q.faction===faction&&q.kind==='transfer'&&q.target===c.id&&personnelArrival(q)))continue;
  const slots=new Map(Object.keys(DIRECTIONS).map(d=>[d,domesticStaffing(s,c.id,d)]));
  const directions=Object.keys(DIRECTIONS).filter(d=>slots.get(d).remaining&&slots.get(d).used<(['agriculture','commerce','military'].includes(d)?ECONOMY_RULES.ai.economicWorkersPerDirection:1));if(!directions.length)continue;
  const foodPriority=cityNeedsAgriculture(s,c),cashPriority=cityNeedsCommerce(s,c);
  const candidates=[];
  for(const from of cities.filter(x=>x.id!==c.id&&residents(x).length>residents(c).length+1)){
   const path=safeStrategicTransportRoute(s,from.id,c.id,faction);if(!path)continue;
   const distance=path.reduce((n,id,i)=>n+roadCost(s,i?path[i-1]:from.id,id),0);
   const fromProfile=personnelCityProfile(s,from);
   for(const o of residents(from).filter(o=>!o.army&&!o.unit.wounded&&o.unit.id!==from.governor&&!economicStaffingError(s,from,[o.unit.id]))){
    if(staffingDepartureError(s,from,[o.unit.id],fromProfile))continue;
    const current=assignmentFor(s,o.unit.id);
    if(current&&(current.action||current.proposal||rankOfficerCandidates(s,[o.unit],{task:'domestic',city:from.id,direction:current.direction})[0].recommendation.available))continue;
    const days=Math.ceil(distance/personnelSpeed({unit:o.unit,destination:c.id,cargo:{gold:0,grain:0,manpower:0}}));if(days>PLANNING.preparationTurns*10)continue;
    if(o.unit.troops+o.unit.wounded>0&&(c.grain<homeFood(s,c)+foodUse([o.unit])*OFFENSIVE.homeFoodDays||strategicDepartureError(s,{faction,cityId:from.id,target:c.id,officerIds:[o.unit.id]})))continue;
    const preview={...s,cities:s.cities.map(x=>({...x,units:x.units.filter(u=>u.id!==o.unit.id)})),campaign:{...s.campaign,idle:[...s.campaign.idle.filter(x=>x.unit.id!==o.unit.id),{unit:o.unit,faction,location:c.id}]}};
    const ranked=withPlanningQueries(preview,()=>directions.flatMap(direction=>rankOfficerCandidates(preview,[o.unit],{task:'domestic',city:c.id,direction}).filter(x=>x.recommendation.available).map(x=>({...x,direction,used:slots.get(direction).used,urgent:direction==='agriculture'&&foodPriority||direction==='commerce'&&cashPriority,score:x.recommendation.score*domesticIntentWeight(s,c.id,direction)})))).sort((a,b)=>Number(b.urgent)-Number(a.urgent)||a.used-b.used||b.score-a.score||a.direction.localeCompare(b.direction));
    const best=ranked[0];if(!best)continue;
    candidates.push({from,u:o.unit,path,direction:best.direction,urgent:best.urgent,used:best.used,score:personnelRoleScore(s,o.unit,from,best.score,roles.get(from.id),roles.get(c.id))-days*5});
   }
  }
  candidates.sort((a,b)=>Number(b.urgent)-Number(a.urgent)||a.used-b.used||b.score-a.score||a.u.id.localeCompare(b.u.id));const best=candidates.find(x=>x.score>0);if(!best)continue;
  const result=requestFactionOrder(s,faction,{kind:'transfer',cityId:best.from.id,officerIds:[best.u.id],target:c.id,cargo:{gold:0,grain:0,manpower:0},route:best.path,safeOnly:true},'after');
  if(!result.error){s.campaign.ai.staffing.push({faction,officerId:best.u.id,cityId:c.id,direction:best.direction,createdDay:s.campaign.day,arrivedDay:null,phase:'travel'});record(s,`city-force:${best.from.id}`,'transfer',c.id,`调任${best.u.name}补充当地${DIRECTIONS[best.direction]}人手，${roles.get(c.id)==='front'?'兼顾前线军事适性与留守':'优先后方内政适性'}，实际到达后委任`);}
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
function quietMilitaryTurns(s,faction){
 let lastTurn=1;
 for(const b of s.campaign.battles){
  if(!b.battle?.sides.some(side=>side.faction===faction)&&!b.report?.stats.some(side=>side.faction===faction))continue;
  const day=b.settled?b.endedDay:s.campaign.day;
  lastTurn=Math.max(lastTurn,Math.floor((day-1)/10)+1);
 }
 return Math.max(0,s.turn-lastTurn);
}
export function planStrategicAI(s){
 if(s.campaign.ai.lastPlanDay===s.campaign.day||s.finished)return;
 progressStrategicStaffing(s);
 manageArmyManagementAI(s);
 const ai=s.campaign.ai;ai.lastPlanDay=s.campaign.day;
 consolidateCityArmies(s);emergencyOrders(s);
 for(const faction of Object.keys(ai.factions)){
  planStrategicScouting(s,faction);
  const policy=ai.factions[faction];policy.style=factionStrategicProfile(s,faction).style;refreshCityIntents(s,faction);
  planStrategicSupport(s,faction,{availableUnits,commandUnits,retreatArmy,cancelPlan});
  for(const p of activePlans(s).filter(p=>p.faction===faction))progressPlan(s,p);
  // Refresh the full strategic input and select objectives once per ten-day
  // turn. Daily execution still checks real supply, contacts and existing orders.
  const review=policy.lastReviewTurn!==s.turn;
  if(review){policy.lastReviewTurn=s.turn;drawFactionTemperament(ai,faction,s.turn,factionStrategicProfile(s,faction),quietMilitaryTurns(s,faction));reinforcePreparingPlans(s,faction);createPlan(s,faction);}prepareGarrison(s,faction);
  refreshCityIntents(s,faction);logistics(s,faction);relieveCityFood(s,faction);refreshCityIntents(s,faction);if(review){planBanditExpedition(s,faction);planStrategicPersonnel(s,faction);}
  for(const p of activePlans(s).filter(p=>p.faction===faction))progressPlan(s,p);
  for(const p of ai.plans.filter(p=>p.faction===faction))updateCaptureTasks(s,p,{waitingForScout:waitingForStrategicScout,homeFood});
  const goal=policy.strategy.goal,p=ai.plans.find(p=>p.id===goal?.planId);
  if(goal?.kind==='capture'&&p){goal.status=p.phase==='complete'?'complete':p.phase==='cancelled'?'cancelled':'running';goal.reason=p.reason;goal.military=structuredClone(p.military);goal.requirements=['complete','cancelled'].includes(goal.status)?[]:structuredClone(p.requirements);}
 }
 for(const [id,v] of Object.entries(ai.cities))if(town(s,id)?.owner!==v.faction)delete ai.cities[id];
 const closed=ai.plans.filter(p=>['complete','cancelled'].includes(p.phase));if(closed.length>20){const remove=new Set(closed.slice(0,closed.length-20).map(p=>p.id));ai.plans=ai.plans.filter(p=>!remove.has(p.id));}
}
export function validateStrategicAI(s){
 const ai=s.campaign.ai,fail=(ok,msg='战略AI存档无效')=>{if(!ok)throw new Error(msg);},int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const factions=nationalScenario(s.campaign.scenarioId).factions.filter(f=>isAIControlled(s,f));
 fail(ai?.version===STRATEGIC_AI.version,'战略AI存档版本不兼容，请重新开始');fail(!Object.hasOwn(ai,'treasuries'));
 fail(ai.algorithms&&typeof ai.algorithms==='object');
 strategicAlgorithmProfile(ai.algorithms);
 fail(int(ai.temperamentSeed,0xffffffff)&&int(ai.lastPlanDay,s.campaign.day)&&int(ai.lastEconomyTurn,s.turn)&&Array.isArray(ai.decisions)&&ai.decisions.length<=80);
 fail(ai.factions&&Object.keys(ai.factions).length===factions.length&&factions.every(f=>{const p=ai.factions[f];return p&&Object.hasOwn(STYLES,p.style)&&int(p.lastReviewTurn,s.turn)&&validTemperament(p.temperament,s.turn,id=>!!OFFICER_BY_ID[id])&&(p.lastReviewTurn===0?p.temperament===null:p.temperament?.turn===p.lastReviewTurn)&&['develop','attack'].includes(p.stance)&&!Object.hasOwn(p,'nextOffensiveDay');}));
 validateStrategicStaffing(s,fail);
 for(const f of factions)validateFactionStrategy(ai.factions[f].strategy,s,f,fail);
 fail(ai.cities&&Object.entries(ai.cities).every(([id,c])=>town(s,id)&&factions.includes(c.faction)&&['front','staging','rear','recovery','talent'].includes(c.role)&&int(c.defenseNeed)&&int(c.goldNeed)&&int(c.grainNeed)&&int(c.manpowerNeed)&&int(c.updatedDay,s.campaign.day)));
 fail(int(ai.nextPlanId)&&ai.nextPlanId>0&&Array.isArray(ai.plans)&&ai.plans.length<=20+factions.length*PLANNING.tempo.maxOperations+s.cities.length);
 const ids=new Set(),claimed=new Set(ai.staffing.map(p=>p.officerId)),active=new Set(),consolidating=new Set();
 for(const p of ai.plans){
  fail(p&&int(p.id)&&p.id>0&&p.id<ai.nextPlanId&&!ids.has(p.id)&&factions.includes(p.faction));ids.add(p.id);
  fail(['prepare','assemble','attack','consolidate','complete','cancelled'].includes(p.phase)&&town(s,p.target)&&town(s,p.staging)&&p.target!==p.staging&&int(p.createdDay,s.campaign.day)&&p.createdDay>0&&int(p.updatedDay,s.campaign.day)&&p.updatedDay>=p.createdDay&&int(p.deadline)&&p.deadline>=p.createdDay&&typeof p.reason==='string'&&p.reason.length<=120&&!/[<>]/.test(p.reason));
  fail(Array.isArray(p.officerIds)&&p.officerIds.length>0&&p.officerIds.length<=Object.keys(OFFICER_BY_ID).length&&new Set(p.officerIds).size===p.officerIds.length&&p.officerIds.every(id=>OFFICER_BY_ID[id]));
  fail(Array.isArray(p.origins)&&p.origins.length>0&&p.origins.every(g=>town(s,g.cityId)&&int(g.grain)&&Array.isArray(g.officerIds)&&g.officerIds.length>0&&g.officerIds.length<=(p.columns||Math.ceil(p.createdDay/10)>PLANNING.tempo.earlyLastTurn?p.officerIds.length:10)&&g.officerIds.every(id=>p.officerIds.includes(id))));
  const originIds=p.origins.flatMap(g=>g.officerIds);fail(originIds.length===p.officerIds.length&&new Set(originIds).size===originIds.length);
  fail(p.repairUntil===null||int(p.repairUntil)&&p.repairUntil>=p.createdDay&&p.repairUntil<=p.deadline);
  fail(validMilitaryEvidence(p.military,s.campaign.day,id=>!!town(s,id))&&p.military.temperament!==null);
  fail(p.columns===null||Array.isArray(p.columns)&&p.columns.length>1&&p.columnUnits===PLANNING.tempo.columnUnits&&p.columns.every(c=>town(s,c.cityId)&&Array.isArray(c.officerIds)&&c.officerIds.length>0&&c.officerIds.length<=p.columnUnits&&c.officerIds.every(id=>p.origins.some(g=>g.cityId===c.cityId&&g.officerIds.includes(id)))&&int(c.days)&&c.days>0&&validMapRoute(s,c.cityId,p.target,c.route)&& (c.departureDay===null||int(c.departureDay)&&c.departureDay>=p.createdDay&&c.departureDay<=p.deadline)));
  if(p.columns){const columnIds=p.columns.flatMap(c=>c.officerIds);fail(columnIds.length===p.officerIds.length&&new Set(columnIds).size===columnIds.length&&p.columns.every(c=>(c.departureDay===null)===(p.columns[0].departureDay===null)));}
  fail(p.reserves&&Object.entries(p.reserves).every(([id,n])=>town(s,id)&&int(n)));
  fail([10,PLANNING.tempo.columnUnits].includes(p.columnUnits)&&Array.isArray(p.requirements)&&new Set(p.requirements.map(r=>r.cityId)).size===p.requirements.length&&p.requirements.every(r=>town(s,r.cityId)&&['gold','grain','manpower'].every(k=>int(r[k]))&&(r.defensePower===undefined||int(r.defensePower)&&r.defensePower>0)));
  validateCaptureTasks(p,s.campaign.day,fail);
  if(p.phase==='consolidate'){const key=p.faction+':'+p.target;fail(!consolidating.has(key));consolidating.add(key);}
  if(!['complete','cancelled','consolidate'].includes(p.phase)){const key=p.faction+':'+p.target;fail(!active.has(key)&&offensivePlans(s).filter(q=>q.faction===p.faction).length<=PLANNING.tempo.maxOperations);active.add(key);for(const id of p.officerIds){fail(!claimed.has(id));claimed.add(id);}}
 }
 const supportIds=new Set(),supportKeys=new Set();fail(int(ai.nextSupportId)&&ai.nextSupportId>0&&Array.isArray(ai.supports)&&ai.supports.length<=factions.length*SUPPORT.maxMissions);
 for(const p of ai.supports){const key=p.faction+':'+p.kind+':'+(p.battleId||p.target);fail(int(p.id)&&p.id>0&&p.id<ai.nextSupportId&&!supportIds.has(p.id)&&!supportKeys.has(key)&&factions.includes(p.faction)&&['guard','reinforce'].includes(p.kind)&&town(s,p.target)&&int(p.createdDay,s.campaign.day)&&p.createdDay>0&&int(p.lastNeededDay,s.campaign.day)&&p.lastNeededDay>=p.createdDay&&int(p.deadline)&&p.deadline>=p.createdDay&&(p.kind==='guard'?p.battleId===null&&isJunction(s,p.target):typeof p.battleId==='string'&&[...s.campaign.battles,...(s.campaign.archive||[])].some(r=>r.id===p.battleId)));
  supportKeys.add(key);
  supportIds.add(p.id);fail(ai.supports.filter(q=>q.faction===p.faction).length<=SUPPORT.maxMissions&&Array.isArray(p.officerIds)&&p.officerIds.length>0&&p.officerIds.length<=Object.keys(OFFICER_BY_ID).length&&new Set(p.officerIds).size===p.officerIds.length);
  for(const id of p.officerIds){fail(OFFICER_BY_ID[id]&&!claimed.has(id));claimed.add(id);}
 }
 fail(ai.decisions.every(d=>int(d.day,s.campaign.day)&&d.day>0&&typeof d.armyId==='string'&&/^(a\d+|city-force:[a-z0-9-]+)$/.test(d.armyId)&&['attack','reinforce','guard','stage','hold','retreat','recover','transport','transfer'].includes(d.kind)&&(d.target===null||town(s,d.target))&&typeof d.reason==='string'&&d.reason.length<=120&&!/[<>]/.test(d.reason)));
}
