import {recordTreasureWork} from './treasures.mjs';
import {buildingDurability,gateDurability,initializeBuildingDurability,buildingWorkQuote,buildingWorkMode,beginBuildingWork,restoreBuilding,transferBuildingDurability,validateBuildingDurability,completeTechnologyBuilding} from './building-durability.mjs';
import {cityGoldCommitment} from './city-budget.mjs';
import {cityFoodRequirement,withCitySupplyQueries} from './city-logistics.mjs';
import {BASE_TROOPS,cityHasWater,canEquip} from './troop-equipment.mjs';
import {TECHS,canResearch,localTechnologies,technologyAllowed,cityTroopUnlocked,technologyIncomeBonus,technologyConstructionDiscount,technologyMilitaryMultiplier} from './city-technology.mjs';
export {TECHS};
import {appendActivityNode,importantActivityNode} from './activity-nodes.mjs';
import {recordOfficerActivities} from './officer-activity.mjs';
import {initializeDomesticIncidents,planDomesticIncidents,validateDomesticIncidents,incidentModifiers,effectiveDomesticChance,incidentSupport,incidentFor} from './domestic-incidents.mjs';
import {availableConstructionSites,chooseConstructionSite,constructionSiteAvailable,constructionSites,buildingSiteName,buildingLimit,canExpandBuilding,localBuildingLimit,localBuildingLevel} from './metropolitan-areas.mjs';
import {workProfile,workTraitIds,workChance,workFactor,workQuantity,workValue} from './work-traits.mjs';
import {strategicTraits,hasStrategicTrait,assignedTrait} from './strategic-traits.mjs';
import {mapNode,cityRoads,adjacentCityPath} from './road-network.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {economicWorkScale,reserveRecruitmentTarget,cityWorkRemaining,creditCityWork,sustainableRecruitment,cityBaseIncome} from './economy.mjs';
import {trainingRate} from './troop-training.mjs';
import {PROGRESSION,meritChangeText} from './progression.mjs';
import {settleOfficerMerit} from './campaign-merit.mjs';
import {initializeWorkMerit,creditWorkMerit,ordinaryWorkMerit,validWorkMerit} from './domestic-merit.mjs';
import {playerFaction,isPlayerControlled,isAIControlled} from './player-faction.mjs';
import {observedHostileArmies} from './strategic-context.mjs';
import {strategicDomesticPriority,strategicDemand} from './strategic-policy.mjs';
import {plannedOfficer,plannedGrain,plannedCargo} from './strategic-intent.mjs';
import {taskTraits,taskTraitBonus,WORK_TRAITS} from './officer-traits.mjs';
import {missionOfficer,beginOfficerMission,advanceOfficerMissions,returnOfficerMission,recallOfficerMission} from './officer-missions.mjs';
import {preparedUnits} from './city-units.mjs';
import {residentOfficer} from './city-personnel.mjs';
const isNationalCity=c=>!!c.kind;
import {log,TROOPS,FACTIONS,battleWounded} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {domesticEffects} from './passives.mjs';
import {relationshipInfo} from './relationships.mjs';
import {cityReserve,addCityGold,isLord,reassuranceCap,talentEligibility,talentKey,refreshTalentDemand} from './talent-core.mjs';
import {initializeTalent,unknownTalent,discoverTalent,talentCandidates,startTalentProject,completeTalentProject,finishTalentDay,resolveTalentOffers,prepareEnemyDomestic,refreshTalentProjects,validateTalent} from './talent-lifecycle.mjs';
import {domesticAbility,cooperationProfile,growCooperationRelationship} from './domestic-cooperation.mjs';

import {DIRECTIONS,BUILDINGS,ACTIONS} from './domestic-designs.mjs';
import {DOMESTIC_OUTCOME_RULES as OUTCOMES} from './data/design/domestic-actions.mjs';
export {DIRECTIONS,BUILDINGS,ACTIONS};
export const actionName=(c,key)=>ACTIONS[key].kind==='build'?(c.project?.key===ACTIONS[key].value&&c.project.mode==='repair'?'修复':c[ACTIONS[key].value]?'扩建':'新建')+BUILDINGS[ACTIONS[key].value].name:ACTIONS[key].name;
export const domesticPriority=(s,faction=playerFaction(s))=>s.campaign.domestic.priorities[faction]||[];
export function setDomesticPriority(s,priority,{faction=playerFaction(s),scheduled=false}={}){
 if(s.finished||!scheduled&&(s.campaign.allAI||s.campaign.phase!=='planning')||!s.campaign.domestic.priorities[faction])return '须在筹划阶段设置内政优先级';
 if(!Array.isArray(priority)||priority.length!==Object.keys(DIRECTIONS).length||new Set(priority).size!==priority.length||priority.some(d=>!DIRECTIONS[d]))return '每个内政方向须出现一次';
 s.campaign.domestic.priorities[faction]=[...priority];return null;
}
const town=mapNode;
const day=s=>s.campaign.day;
const turn=s=>Math.floor((day(s)-1)/10)+1;
export const besieged=(s,id)=>s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===id);
const engaged=(s,id)=>s.campaign.battles.some(r=>!r.settled&&r.armyIds.includes(id));
export const localArmies=(s,c)=>s.armies.filter(a=>a.location===c.id&&a.faction===c.owner&&!a.travel&&!a.route.length&&!engaged(s,a.id)&&!a.disbanded);
export const domesticOfficer=(s,id)=>residentOfficer(s,id)||missionOfficer(s,id);
export const assignmentFor=(s,id)=>s.campaign.domestic.assignments.find(a=>a.officerId===id);
export const grainCapacity=c=>ECONOMY_RULES.capacity.grainBase+c.granary*ECONOMY_RULES.capacity.grainPerGranary;
export const recruitmentLimit=c=>ECONOMY_RULES.capacity.recruitmentBase+c.barracks*ECONOMY_RULES.capacity.recruitmentPerBarracks;
// Recruiters reserve food for existing soldiers and the new recruits, on both sides.
export const cityFoodReserve=(s,c,days=ECONOMY_RULES.ai.recruitReserveDays)=>{
 const m=cityMilitary(s,c);return Math.max(Math.ceil((m.troops/100+m.wounded/200)*days),cityFoodRequirement(s,c,days));
};
// Food is a future-support constraint for autonomous replenishment, not a fee.
const recruitGrainBudget=(s,c,reserved=0)=>Math.max(0,Math.floor(Math.min(sustainableRecruitment(s,c)-reserved,(c.grain-cityFoodReserve(s,c)-plannedGrain(s,c.id)-reserved*ECONOMY_RULES.ai.recruitReserveDays/100)/(ECONOMY_RULES.ai.recruitReserveDays/100))));
export const reservedMen=c=>c.domestic.reserved;
export const effect=(c,key,t)=>c.domestic.effects.filter(e=>e.key===key&&e.untilTurn>=t).reduce((sum,e)=>sum+e.amount,0);
export const canRefill=(c,u)=>canTrain(c,u.type)&&['siege','ship'].every(slot=>!u.equipment?.[slot]||canEquip(c,u.equipment[slot]));
export const canTrain=(c,type)=>TROOPS[type]?.category==='troop'&&cityTroopUnlocked(c,type);
export function cityMilitary(s,c){
 let troops=c.units.reduce((n,u)=>n+u.troops,0),wounded=c.units.reduce((n,u)=>n+u.wounded,0),units=c.units.length;
 const battles=s.campaign.battles.filter(r=>!r.settled);
 for(const a of s.armies.filter(a=>a.location===c.id&&!a.travel&&a.faction===c.owner&&!a.disbanded)){
  const r=battles.find(r=>r.armyIds.includes(a.id));
  if(r&&!(r.kind==='siege'&&r.cityId===c.id&&r.battle.sides[1-r.attackSide].faction===a.faction))continue;
  for(const u of a.units){const live=r?.battle.sides.flatMap(x=>x.units).find(x=>x.armyId===a.id&&x.id===u.id);if(live?.retreatDispatched)continue;troops+=live?.hp??u.troops;wounded+=u.wounded+(live?battleWounded(live):0);units++;}
 }
 return {troops,wounded,units};
}
export function domesticRandom(s){const d=s.campaign.domestic;d.seed=(Math.imul(d.seed,1664525)+1013904223)>>>0;return d.seed/4294967296;}
export function initializeDomestic(s){
 s.campaign.domestic={version:20,autoApprove:false,priorities:Object.fromEntries([...new Set(s.cities.map(c=>c.owner))].filter(f=>f!=='neutral').map(f=>[f,Object.keys(DIRECTIONS)])),seed:(s.seed^0x51a9c72d)>>>0,nextId:1,assignments:[],events:[],orders:[],workHistory:{},people:[],loyalty:{},cooperation:{},cooperationGrowth:{},lastOpportunityTurn:0,lastFinishedDay:0};
 initializeDomesticIncidents(s);
 const occupied=new Set([...preparedUnits(s).map(u=>u.id),...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)]);
 for(const c of s.cities){
  Object.assign(c,{workshop:0,clinic:0,drill:0,hall:0,arrowTower:0,musicStage:0,aidCamp:0});
  c.domestic={owner:c.owner,techs:[],research:null,effects:[],opportunities:[],reserved:0,cooldowns:{},preparation:{intent:null,shield:null}};
  c.domestic.buildingSites=Object.fromEntries(Object.keys(BUILDINGS).map(key=>[key,[]]));
  c.domestic.production={turn:1,gold:0,grain:0,manpower:0};
  initializeBuildingDurability(c);

 }
 for(const id of occupied)s.campaign.domestic.loyalty[id]=85;
 initializeTalent(s);
}
function emit(s,a,phase,text,result={}){
 const d=s.campaign.domestic,e={id:d.nextId++,actionId:a?.action?.id??null,assignmentId:a?.id??null,cityId:a?.cityId??null,officerId:a?.officerId??null,faction:town(s,a?.cityId)?.domestic.owner??null,day:day(s),phase,text,result};
 if(a?.action&&a.officerId&&['cancel','complete','failure'].includes(phase)&&!(phase==='failure'&&ACTIONS[a.action.key].kind==='build')){
  const x=a.action,entry={actionId:x.id,cityId:a.cityId,siteId:x.siteId,key:x.key,targetId:x.targetId,startedDay:x.startedDay,endedDay:day(s),cost:x.cost,status:phase==='cancel'?'interrupted':phase==='complete'?'completed':'failed',text};
  const history=d.workHistory[a.officerId]||[];d.workHistory[a.officerId]=[entry,...history.filter(r=>r.actionId!==x.id)].slice(0,12);
 }
 e.important=!!importantActivityNode({category:'domestic',phase,key:a?.action?.key,result});e.read=false;
 appendActivityNode(s,{sourceId:'domestic:'+e.id,category:'domestic',phase,faction:e.faction,officerId:e.officerId,officerIds:a?.officerIds||[],cityId:e.cityId,siteId:a?.action?.siteId||result.siteId||e.cityId,key:a?.action?.key||null,text,result});
 d.events.unshift(e);d.events=d.events.slice(0,240);if(e.faction===playerFaction(s))log(s,`第${day(s)}天：${text}`,phase==='failure'?'event':'good');
}
const near=(s,c,id)=>id===c.id||cityRoads(s).some(([a,b])=>a===c.id&&b===id||b===c.id&&a===id);
const accessible=(s,c)=>!besieged(s,c.id)&&cityRoads(s).some(([a,b])=>{const n=a===c.id?b:b===c.id?a:null;return n&&town(s,n).owner===c.owner&&(()=>{let from=c.id;return adjacentCityPath(s,c.id,n).every(to=>{const clear=!s.armies.some(x=>x.faction!==c.owner&&x.units.some(u=>u.troops>0)&&(!x.travel&&x.location===to||x.travel&&[x.travel.from,x.travel.to].includes(from)&&[x.travel.from,x.travel.to].includes(to)));from=to;return clear;});})();});
const grainReserve=(s,c)=>Math.max(c.budget.grainReserve,assignedTrait(s,c,'reserveGrain','agriculture')?cityFoodReserve(s,c,20):0,1500,plannedGrain(s,c.id)+cityFoodReserve(s,c,ECONOMY_RULES.ai.foodReserveDays),Math.ceil(([...s.cities.filter(x=>x.owner===c.owner).flatMap(x=>x.units),...s.armies.filter(a=>a.faction===c.owner).flatMap(a=>a.units)].reduce((n,u)=>n+u.troops/100+u.wounded/200,0))*10));
function stats(s,c){const units=[...c.units,...localArmies(s,c).flatMap(a=>a.units)];return {units,need:units.filter(u=>canRefill(c,u)).reduce((n,u)=>n+Math.max(0,troopCapacity(u)-u.troops-u.wounded),0),wounded:units.reduce((n,u)=>n+u.wounded,0)};}
function foreignTargets(s,c){return s.campaign.idle.filter(o=>o.faction!==c.owner&&o.faction!=='neutral'&&!o.destination&&!o.retreating&&near(s,c,o.location)&&!s.cities.some(t=>t.governor===o.unit.id));}
function ownTargets(s,c){return [...c.units,...s.campaign.idle.filter(o=>o.faction===c.owner&&o.location===c.id&&!o.destination&&!o.retreating).map(o=>o.unit),...localArmies(s,c).flatMap(a=>a.units)];}
export function actionChance(s,c,u,def,target=null){
 const ability=domesticAbility(u,def),work=workProfile(workTraitIds(u),def,typeof target==='string'?target:null);
 let p=OUTCOMES.baseChance+ability*OUTCOMES.abilityFactor+taskTraitBonus(u,def,'chance')+workChance(work,def)-(def.risk||0)+(def.kind==='trial'?c.workshop*.035:0)+(['explore','hire'].includes(def.kind)?c.hall*.025:0);

 if(def.kind==='persuade')p-=((s.campaign.domestic.loyalty[target?.unit.id]??85)/100)*.25;
 if(['hire','persuade','reassure'].includes(def.kind)&&target){const id=target.unit?.id||target.id;if(id!==u.id&&!(def.kind==='hire'&&isLord(s,u.id,c.owner)))p+=(relationshipInfo(u.id,id,s.relationshipScores,s.relationshipTypes).score-50)*.003;}
 return Math.max(OUTCOMES.minChance,Math.min(OUTCOMES.maxChance,p));
}
export function buildCost(s,c,key,u){const g=residentOfficer(s,c.governor),discount=Math.max(domesticEffects(g?.location===c.id&&g?.faction===c.owner?g.unit:null).projectDiscount||0,domesticEffects(u).projectDiscount||0)+effect(c,'discount:'+BUILDINGS[key].direction,turn(s))+technologyConstructionDiscount(c);return Math.ceil(BUILDINGS[key].cost*(1-Math.min(.5,discount)));}
const pendingActions=(s,except=null)=>s.campaign.domestic.assignments.filter(a=>a!==except&&(a.action||a.proposal)).map(a=>a.action?a:{...a,action:{...a.proposal.pick,siteId:a.proposal.siteId,recipients:[]}});
const targetBusy=(s,id)=>pendingActions(s).some(a=>a.action.targetId===id&&['hire','persuade','reassure'].includes(ACTIONS[a.action.key].kind));
function technologyPriority(s,c,id){const t=TECHS[id];let score=t.tier===1?60:45;if(t.income.gold)score+=c.gold<3000?25:10;if(t.income.grain)score+=c.grain<cityFoodReserve(s,c,20)?35:15;if(t.income.manpower)score+=c.manpower<reserveRecruitmentTarget(s,c)?25:10;if(t.troopId&&c.units.some(u=>TROOPS[u.type].family===TROOPS[t.troopId].family))score+=20;if(t.militaryDiscount)score+=c.units.length*3;if(Object.values(BUILDINGS).some(b=>b.technology===id)&&observedHostileArmies(s,c.owner).some(a=>near(s,c,a.travel?.to||a.location)))score+=20;return score;}
const reservedForUnit=(s,c,id)=>pendingActions(s).filter(a=>a.cityId===c.id&&ACTIONS[a.action.key].kind==='recruit').reduce((sum,a)=>sum+(a.action.recipients.find(r=>r.id===id)?.amount||0),0);
export function actionCandidates(s,assignment,options={}){
 return withCitySupplyQueries(s,()=>domesticActionCandidates(s,assignment,options));
}
function domesticActionCandidates(s,assignment,{ignoreFunds=false,approving=false}={}){
 const c=town(s,assignment.cityId),o=domesticOfficer(s,assignment.officerId);if(!c||!o||o.unit.mission||o.location!==c.id||o.faction!==c.owner||besieged(s,c.id))return [];
 const committed=!ignoreFunds&&s.campaign.ai?.factions[c.owner]?cityGoldCommitment(s,c):null;
 const demand=!ignoreFunds&&isAIControlled(s,c.owner)?strategicDemand(s,c.id):null;
 const protectedGold=Math.max(cityReserve(s,c),committed?.total||0),warGold=demand?.kind==='capture'?demand.requirements.find(r=>r.cityId===c.id)?.gold||0:0;
 const d=s.campaign.domestic,st=stats(s,c),cash=ignoreFunds?Infinity:Math.min(c.gold-warGold,c.gold-protectedGold-(approving?0:d.assignments.filter(a=>a!==assignment&&a.cityId===c.id&&a.proposal).reduce((n,a)=>n+a.proposal.expenses.gold,0))),wealth=c.gold>4000,threat=observedHostileArmies(s,c.owner).some(a=>near(s,c,a.travel?.to||a.location));
 const foodShort=c.grain<plannedGrain(s,c.id)+cityFoodReserve(s,c,ECONOMY_RULES.ai.foodReserveDays);
 const pending=pendingActions(s,assignment),local=pending.filter(a=>a.cityId===c.id),constructionClaims=pending.filter(a=>['build','repair'].includes(ACTIONS[a.action.key].kind));
 const candidates=[];
 for(const [key,def]of Object.entries(ACTIONS)){
  if(def.direction!==assignment.direction||(c.domestic.cooldowns[key]||0)>day(s))continue;
  if(def.kind==='research'&&local.some(a=>ACTIONS[a.action.key].kind==='research'))continue;
  if(['effect','discount','prepare'].includes(def.kind)&&local.some(a=>ACTIONS[a.action.key].kind===def.kind&&ACTIONS[a.action.key].value===def.value))continue;
  if((def.opportunity||def.kind==='rescue')&&local.some(a=>{const other=ACTIONS[a.action.key];return (other.opportunity||other.kind==='rescue'&&other.value)===(def.opportunity||def.value);}))continue;
  let score=30,cost=def.cost,target=null,amount=0,recruitMode=null;
  if(def.opportunity&&!c.domestic.opportunities.some(e=>e.kind===def.opportunity&&e.expires>=day(s)))continue;
  // An expansion or rescue does not provide today's food. Keep enough actual
  // grain for its work and a normal partial-result extension before choosing it.
  if(def.direction==='agriculture'&&!['grain','trade'].includes(def.kind)&&c.grain<plannedGrain(s,c.id)+cityFoodReserve(s,c,Math.ceil(def.days*1.5)))continue;
  switch(def.kind){
   case 'build':{const field=def.value,claimed=constructionClaims,sites=availableConstructionSites(s,c,field).filter(x=>!claimed.some(a=>a.action.siteId===x.node.id)&&(!BUILDINGS[field].technology||c.domestic.techs.includes(BUILDINGS[field].technology)||buildingWorkMode(c,field,x.node.id)!=='build'));if(c.project||local.some(a=>['build','repair'].includes(ACTIONS[a.action.key].kind))||!sites.length)continue;const repairing=sites.find(x=>buildingWorkMode(c,field,x.node.id)!=='build');target=repairing?.node.id||null;cost=repairing?buildingWorkQuote(c,field,target,buildCost(s,c,field,o.unit),def.days).cost:buildCost(s,c,field,o.unit);score=repairing?95:(c[field]===0?62:wealth?46:12)-c[field]*3;
    if(!repairing&&['commerce','farm'].includes(field))score=82-c[field]*4;
    if(!repairing&&field==='barracks')score=64-c[field]*4;
    if(field==='granary')score+=c.grain>grainCapacity(c)*.8?35:0;if(field==='farm')score+=c.grain<grainReserve(s,c)?30:0;
    if(field==='clinic')score+=st.wounded>300?30:-15;if(field==='barracks')score+=c.manpower<reserveRecruitmentTarget(s,c)?18:0;
    if(['walls','drill'].includes(field))score+=threat?20:0;
    if(BUILDINGS[field].combat&&!repairing)score=(threat?82:38)-c[field]*5+(field==='aidCamp'&&st.wounded>300?15:0);
    if(!repairing&&field==='workshop'&&localTechnologies(c).every(t=>c.domestic.techs.includes(t)))continue;if(!repairing&&field==='hall'){if((!unknownTalent(s,c.id,c.owner).length&&!talentCandidates(s,c,'hire').length)||cash<cost+360)continue;score=20+(c.hall===0?10:0)-5*c.hall;}break;}
   case 'cash':if(!cityWorkRemaining(s,c,'gold'))continue;score=wealth?28:60;break;
   case 'effect':if(def.value==='gold'&&!c.commerce||def.value==='grain'&&!c.farm||c.domestic.effects.some(e=>e.key===def.value&&e.untilTurn>=turn(s)))continue;score=42;break;
   case 'discount':if(c.domestic.effects.some(e=>e.key==='discount:'+def.value&&e.untilTurn>=turn(s))||def.value==='commerce'&&c.commerce>=buildingLimit(s,c,'commerce'))continue;score=wealth?28:38;break;
   case 'trade':if(!accessible(s,c))continue;if(def.value==='sell'){amount=Math.min(1200,Math.floor(c.grain-grainReserve(s,c)));if(amount<300)continue;score=wealth?20:55;}else {amount=Math.min(1200,Math.floor(grainCapacity(c)-c.grain));if(amount<300||c.grain>=grainReserve(s,c)&&!(hasStrategicTrait(o.unit,'provision')&&c.grain-plannedGrain(s,c.id)<cityFoodReserve(s,c)))continue;score=80;}break;
   case 'grain':if(c.grain>=grainCapacity(c)*.9||!cityWorkRemaining(s,c,'grain'))continue;score=foodShort?120:c.grain<grainReserve(s,c)?75:26;break;
   case 'rescue':{const e=c.domestic.opportunities.find(e=>e.kind===def.value&&e.expires>=day(s));if(!e||e.saved>=1||e.amount<=0)continue;const savedGrain=e.amount*(1-e.saved);score=30+Math.min(50,Math.max(0,savedGrain*ECONOMY_RULES.value.grain-cost)/10);break;}
   case 'research':{
    const types=localTechnologies(c).filter(t=>canResearch(c,t));
    target=c.domestic.research?.type||types.sort((a,b)=>technologyPriority(s,c,b)-technologyPriority(s,c,a)||a.localeCompare(b))[0];
    if(!target)continue;cost=c.domestic.research?0:TECHS[target].cost;score=def.opportunity?75:key==='research'?58:50;break;}
   case 'recruit':{
    const reserve=ECONOMY_RULES.recruitment,target=reserveRecruitmentTarget(s,c),pending=local.filter(a=>a.action.recruitMode==='reserve').reduce((n,a)=>n+a.action.amount,0);
    if(c.manpower<target){
     recruitMode='reserve';amount=Math.floor(Math.min(def.reserveValue*economicWorkScale(domesticAbility(o.unit,def))*(1+technologyIncomeBonus(c,'manpower')),cityWorkRemaining(s,c,'manpower'),ECONOMY_RULES.capacity.manpowerMax-c.manpower-pending));
     if(amount<=0)continue;cost=reserve.reserveCost+(key==='urgent'?def.cost:0);score=60+(threat?20:0)+Math.max(0,1-c.manpower/target)*25;
    }else{
     recruitMode='replenish';const need=st.units.filter(u=>canRefill(c,u)).reduce((n,u)=>n+Math.max(0,troopCapacity(u)-u.troops-u.wounded-reservedForUnit(s,c,u.id)),0);
     amount=Math.floor(Math.min(def.value,need,c.manpower-c.domestic.reserved-plannedCargo(s,c.id,'manpower'),recruitmentLimit(c)-c.drafted-c.domestic.reserved,recruitGrainBudget(s,c,c.domestic.reserved)));if(amount<=0)continue;
     cost=Math.ceil(cost*technologyMilitaryMultiplier(c))+Math.ceil(recruitEquipment(s,c,amount)*(key==='urgent'?1.6:1)*(1-taskTraitBonus(o.unit,def,'recruitDiscount')));score=60+(threat?20:0);
    }
    // The fast, costly order is an emergency choice; ordinary source work
    // should not randomly pay its surcharge while the city is safe.
    if(key==='urgent')score+=threat?10:-25;
    break;}
   case 'heal':if(!c.clinic&&!taskTraits(o.unit,def).some(id=>WORK_TRAITS[id].clinicIndependent)||!st.wounded||c.grain<200)continue;score=65+Math.min(20,st.wounded/100);break;
   case 'repair':{if(c.project||local.some(a=>['build','repair'].includes(ACTIONS[a.action.key].kind))||constructionClaims.some(a=>a.action.siteId===c.id))continue;const tower=buildingDurability(c,'watchtower');target=gateDurability(c).hp<gateDurability(c).maxHp?'walls':tower.hp<tower.maxHp?'watchtower':null;if(!target)continue;score=100+(threat?20:0);break;}
   case 'prepare':if(def.value==='intent'&&!c.drill||!c.walls||c.domestic.preparation[def.value]?.until>=day(s))continue;score=threat?78:22;break;
   case 'explore':if(!unknownTalent(s,c.id,c.owner).length)continue;score=40;break;
   case 'hire':case 'persuade':{const candidate=talentCandidates(s,c,def.kind)[0];if(!candidate)continue;target=def.kind==='hire'?d.people.find(p=>p.id===candidate.id):foreignTargets(s,c).find(o=>o.unit.id===candidate.id);if(!target)continue;score=candidate.score;break;}
   case 'reassure':target=ownTargets(s,c).filter(u=>(d.loyalty[u.id]??85)<85&&reassuranceCap(s,u.id)-(d.loyalty[u.id]??85)>=6&&!targetBusy(s,u.id)&&s.campaign.talent.records[u.id]?.leaveAtDay===null).sort((a,b)=>(d.loyalty[a.id]??85)-(d.loyalty[b.id]??85)||a.id.localeCompare(b.id))[0];if(!target)continue;score=60+Math.max(0,85-(d.loyalty[target.id]??85));break;
  }
  if(cost>Math.max(0,cash))continue;
  if(o.unit.personality===2)score+=(def.kind==='build'?10:0)-(def.risk||0)*30;
  if(o.unit.personality===4)score+=(def.risk||0)*30+(def.kind==='cash'?8:0);
  score+=taskTraitBonus(o.unit,def,'quantity')*30+taskTraitBonus(o.unit,def,'chance')*100+taskTraitBonus(o.unit,def,'recruitDiscount')*30;
  if(def.kind==='grain'){const rule=strategicTraits(o.unit,'farmTroops')[0]?.strategic;if(rule)score*=1+rule.bonus*Math.min(1,farmTroops(s,c,o.unit).reduce((n,v)=>n+v.troops,0)/rule.requiredTroops);}
  if(['explore','hire','persuade'].includes(def.kind)){const rule=strategicTraits(o.unit,'referral')[0]?.strategic;if(rule){const n=d.people.filter(p=>p.status==='FREE'&&!p.travel&&!s.campaign.talent.knowledge[c.owner]?.[p.id]?.locationConfirmed&&p.id!==o.unit.id&&relationshipInfo(o.unit.id,p.id,s.relationshipScores,s.relationshipTypes).score>=rule.relation).length;score+=Math.min(n,rule.count)*8;}}
  const wp=workProfile(workTraitIds(o.unit),def,typeof target==='string'?target:null);
  const collaborators=d.assignments.filter(a=>a.cityId===c.id&&a.direction===def.direction&&a.officerId!==o.unit.id&&!pendingDomesticOrder(s,a.officerId)&&!plannedOfficer(s,a.officerId)).map(a=>domesticOfficer(s,a.officerId)?.unit).filter(u=>u&&!u.mission);
  const cooperation=Math.max(0,...collaborators.map(u=>{const p=cooperationProfile(s,o.unit,u,def);return p.chance*p.gain;}));
  const secondary=def.kind==='reassure'?ownTargets(s,c).filter(u=>u.id!==target?.id&&!targetBusy(s,u.id)&&(d.loyalty[u.id]??85)<Math.min(85,reassuranceCap(s,u.id))).length:0;
  score*=workValue(wp,{chance:actionChance(s,c,o.unit,def,target),cooperation,secondary});
  if(assignment.lastKey===key)score-=assignment.failures*12;
  if(!approving&&isAIControlled(s,c.owner))score*=Math.max(1,strategicDomesticPriority(s,c.id,def));
  candidates.push({key,cost,amount,recruitMode,targetId:typeof target==='string'?target:target?.unit?.id||target?.id||null,score,chance:actionChance(s,c,o.unit,def,target)});
 }
 return candidates.sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
}
function release(s,c,a){if(a.key&&ACTIONS[a.key].kind==='recruit'&&a.recruitMode==='replenish')c.domestic.reserved=Math.max(0,c.domestic.reserved-a.amount);}
export const pendingDomesticOrder=(s,id)=>s.campaign.domestic.orders.find(q=>q.officerIds.includes(id));
export function removeDomesticOrder(s,id,reason='玩家取消等待'){
 const d=s.campaign.domestic,q=d.orders.find(q=>q.id===id);if(!q)return;
 d.orders=d.orders.filter(x=>x!==q);emit(s,{cityId:q.cityId,officerIds:q.officerIds},'order-cancel',`待执行命令已取消：${reason}。`,{orderId:id});
}
export function cancelOrdersFor(s,officerIds,reason){for(const q of [...s.campaign.domestic.orders])if(q.officerIds.some(id=>officerIds.includes(id)))removeDomesticOrder(s,q.id,reason);}
export function recordDomesticOrder(s,q,phase,text){emit(s,{cityId:q.cityId,officerIds:q.officerIds},phase,text,{orderId:q.id});}
export function cancelDomestic(s,officerId,reason='接到新的命令'){
 const traveler=missionOfficer(s,officerId);if(traveler&&traveler.unit.mission.type!=='diplomacy')recallOfficerMission(s,traveler.unit);
 cancelOrdersFor(s,[officerId],reason);
 const d=s.campaign.domestic,a=d.assignments.find(a=>a.officerId===officerId);if(!a)return;
 const c=town(s,a.cityId),x=a.action;
 if(a.proposal){emit(s,a,'proposal-withdrawn',`${OFFICER_BY_ID[officerId].name}${reason}，所呈提案撤回，未支用钱粮。`,{proposalId:a.proposal.id,siteId:a.proposal.siteId});a.proposal=null;}
 if(x){release(s,c,x);if(['build','repair'].includes(ACTIONS[x.key].kind)&&c.project?.actionId===x.id){c.domestic.suspended=structuredClone(x);c.project.actionId=null;}
  const handoff=handoffWork(s,c,a);
  if(handoff){emit(s,a,'cancel',`事务由${domesticOfficer(s,handoff.officerId).unit.name}接续，原执行人结束办理，不退款或重复收费。`);d.assignments=d.assignments.filter(v=>v!==a);return;}
  const refund=ACTIONS[x.key].kind==='recruit'&&x.recruitMode==='replenish'?x.cost-x.baseCost:x.key==='buy'?300:0;c.owner===c.domestic.owner&&addCityGold(s,c,refund);
  emit(s,a,'cancel',`${domesticOfficer(s,officerId)?.unit.name||'执行人'}${reason}，${ACTIONS[x.key].name}中止${['build','research'].includes(ACTIONS[x.key].kind)?'，保留已完成进度':''}${refund?'，退回未使用费用'+refund+'金':''}。`,{spent:x.cost-refund,refund});}
 d.assignments=d.assignments.filter(x=>x!==a);
}
export function assignDomestic(s,cityId,direction,officerId,{scheduled=false,faction=playerFaction(s)}={}){
 const c=town(s,cityId);if(!scheduled&&s.campaign.phase!=='planning'||s.finished||c?.owner!==faction||!DIRECTIONS[direction])return '须在筹划阶段委任己方城市';
 if(!officerId)return '请选择要加入该方向的武将';
 const o=residentOfficer(s,officerId);if(!o||o.location!==cityId||o.faction!==c.owner)return '请选择仍在本城的武将';
 if(o.unit.scouting)return '该武将正在负责侦察，请先停止侦察';
 const existing=assignmentFor(s,officerId);if(existing?.cityId===cityId&&existing.direction===direction)return null;
 cancelDomestic(s,officerId);
 if(s.campaign.diplomacy)s.campaign.diplomacy.assignments=s.campaign.diplomacy.assignments.filter(a=>a.officerId!==officerId);
 const a={id:s.campaign.domestic.nextId++,cityId,direction,officerId,action:null,proposal:null,lastTurn:0,lastKey:null,failures:0,waiting:'下一旬执行时自主选择事务'};
 s.campaign.domestic.assignments.push(a);emit(s,a,'assignment',`${o.unit.name}持续负责${c.name}${DIRECTIONS[direction]}，直到收到新的命令。`);return null;
}
export function dismissDomestic(s,officerId,{scheduled=false,faction=playerFaction(s)}={}){
 const a=assignmentFor(s,officerId);if(!scheduled&&s.campaign.phase!=='planning'||s.finished||!a||town(s,a.cityId)?.owner!==faction)return '须在筹划阶段解除己方武将的委任';
 cancelDomestic(s,officerId,'解除委任');return null;
}
export const domesticConfidence=chance=>chance>=.85?'颇有把握':chance>=.7?'有望奏效':chance>=.5?'尚可一试':chance>=.3?'成事不易':'恐难奏功';
export const pendingDomesticProposals=s=>s.campaign.domestic.assignments.filter(a=>a.proposal&&isPlayerControlled(s,town(s,a.cityId)?.owner));
const proposalExpenses=pick=>({gold:pick.cost,grain:ACTIONS[pick.key].kind==='heal'?200:ACTIONS[pick.key].kind==='trade'&&ACTIONS[pick.key].value==='sell'?pick.amount:0,manpower:pick.recruitMode==='replenish'?pick.amount:0});
export function domesticProposalText(s,a){
 const p=a.proposal,c=town(s,a.cityId),u=domesticOfficer(s,a.officerId)?.unit,def=ACTIONS[p.pick.key],name=def.kind==='build'?(buildingWorkMode(c,def.value,p.siteId)==='repair'?'修缮':localBuildingLevel(c,def.value,p.siteId)?'扩建':'兴建')+BUILDINGS[def.value].name:def.kind==='research'?'研制「'+TECHS[p.pick.targetId].name+'」':def.name;
 const target=['hire','persuade','reassure'].includes(def.kind)?'（'+OFFICER_BY_ID[p.pick.targetId].name+'）':'';
 const expenses=Object.entries(p.expenses).filter(([,n])=>n>0).map(([key,n])=>n+({gold:'金',grain:'粮',manpower:'预备兵'})[key]).join('、');
 return `${u?.name||OFFICER_BY_ID[a.officerId].name}呈请：拟于${buildingSiteName(s,p.siteId)}${name}${target}，预计用度${expenses}，约需${p.days}日。臣度此事${domesticConfidence(p.pick.chance)}，恭候裁示。`;
}
export function decideDomesticProposal(s,id,approve){
 if(typeof approve!=='boolean')return '请选择准奏或暂缓';
 const a=pendingDomesticProposals(s).find(a=>a.proposal.id===id);if(!a||s.finished)return '此案已撤回或不属本方';
 const p=a.proposal,c=town(s,a.cityId),u=residentOfficer(s,a.officerId)?.unit;
 if(!approve){emit(s,a,'proposal-rejected',`${OFFICER_BY_ID[a.officerId].name}所呈${ACTIONS[p.pick.key].name}未获准奏，本旬暂缓，未支用钱粮。`,{proposalId:p.id,siteId:p.siteId});a.proposal=null;a.waiting='所呈事务未获准奏，下一旬再议';a.lastTurn=turn(s);recordOfficerActivities(s);return null;}
 if(!u||u.mission||u.scouting||pendingDomesticOrder(s,a.officerId)||plannedOfficer(s,a.officerId)||besieged(s,c.id))return '执行人或城中情势已变，此案暂不能开办';
 // Recheck the exact proposal, without its own unpaid target reservation.
 a.proposal=null;
 const candidate=actionCandidates(s,a,{approving:true}).find(x=>x.key===p.pick.key&&(ACTIONS[x.key].kind==='build'||x.targetId===p.pick.targetId)&&x.recruitMode===p.pick.recruitMode&&x.amount===p.pick.amount&&x.cost===p.pick.cost&&x.chance===p.pick.chance);
 const siteOk=ACTIONS[p.pick.key].kind!=='build'||availableConstructionSites(s,c,ACTIONS[p.pick.key].value).some(x=>x.node.id===p.siteId)&&!pendingActions(s).some(a=>['build','repair'].includes(ACTIONS[a.action.key].kind)&&a.action.siteId===p.siteId);
 if(!candidate||!siteOk){a.proposal=p;return '钱粮、目标或用度已变，请暂缓此案，待下旬重新拟议';}
 emit(s,a,'proposal-approved',`${u.name}所呈${ACTIONS[p.pick.key].name}获准，依原案开办。`,{proposalId:p.id,siteId:p.siteId});
 start(s,a,c,p.pick,{approved:true,siteId:p.siteId});recordOfficerActivities(s);return null;
}
export function setDomesticAutoApprove(s,enabled){
 if(s.finished||typeof enabled!=='boolean')return '当前不能更改准奏方式';
 s.campaign.domestic.autoApprove=enabled;
 if(enabled)for(const a of [...pendingDomesticProposals(s)]){const error=decideDomesticProposal(s,a.proposal.id,true);if(error){decideDomesticProposal(s,a.proposal.id,false);a.waiting=error;}}
 return null;
}
function start(s,a,c,pick,{approved=false,siteId:approvedSite=null}={}){
 const def=ACTIONS[pick.key],o=domesticOfficer(s,a.officerId);
 const sites=def.kind==='build'?availableConstructionSites(s,c,def.value).filter(x=>!pendingActions(s,a).some(a=>['build','repair'].includes(ACTIONS[a.action.key].kind)&&a.action.siteId===x.node.id)):[];
 const siteId=approvedSite||(def.kind==='build'?(pick.targetId|| (sites.length===1?sites[0].node.id:sites.length?chooseConstructionSite(s,c,def.value,domesticRandom(s)):null)):c.id);
 if(!siteId){a.waiting='都市圈暂无可用工地';return;}
 const quote=def.kind==='build'?buildingWorkQuote(c,def.value,siteId,buildCost(s,c,def.value,o.unit),def.days):null;
 const duration=quote?.days||(def.kind==='research'?TECHS[pick.targetId].days:def.days);
 pick={...pick,cost:quote?.cost??pick.cost};
 const expenses=proposalExpenses(pick);
 if(!approved&&isPlayerControlled(s,c.owner)&&!s.campaign.domestic.autoApprove&&Object.values(expenses).some(n=>n>0)){
  a.proposal={id:s.campaign.domestic.nextId++,pick:structuredClone(pick),siteId,days:duration,createdDay:day(s),expenses};a.waiting='已呈提案，恭候裁示';
  emit(s,a,'proposal',domesticProposalText(s,a),{proposalId:a.proposal.id,siteId});return;
 }
 const action={id:s.campaign.domestic.nextId++,key:pick.key,cost:pick.cost,amount:pick.amount,targetId:pick.targetId,chance:pick.chance,incidentId:null,traitIds:taskTraits(o.unit,def),unitCost:def.kind==='recruit'?(pick.key==='urgent'?.4:.25)*(1-taskTraitBonus(o.unit,def,'recruitDiscount')):0,farmDays:0,farmContribution:0,farmSource:null,farmRate:0,remaining:duration,startedDay:day(s),recipients:[],paused:false};
 if(def.kind==='recruit'){
  action.recruitMode=pick.recruitMode;action.militaryMultiplier=pick.recruitMode==='replenish'?technologyMilitaryMultiplier(c):1;action.baseCost=Math.ceil(def.cost*action.militaryMultiplier);if(pick.recruitMode==='reserve')action.unitCost=0;
  else {let left=pick.amount;for(const u of stats(s,c).units.filter(u=>canRefill(c,u)).sort((a,b)=>a.troops-b.troops||a.id.localeCompare(b.id))){const n=Math.min(left,Math.max(0,troopCapacity(u)-u.troops-u.wounded-reservedForUnit(s,c,u.id)));if(n>0)action.recipients.push({id:u.id,amount:n,type:u.type});left-=n;if(!left)break;}c.domestic.reserved+=pick.amount;}
 }
 if(def.kind==='heal')action.recipients=stats(s,c).units.filter(u=>u.wounded).map(u=>({id:u.id,amount:u.wounded}));
 if(def.kind==='research'){
  if(!c.domestic.research)c.domestic.research={type:pick.targetId,progress:0,spent:pick.cost,workedDays:0};
  action.researchRoll=domesticRandom(s);action.researchActual=0;
 }
 action.siteId=siteId;
 action.meritDays=duration;
 if(def.kind==='build'){beginBuildingWork(c,def.value,siteId,quote,{actionId:action.id,domestic:true});c.domestic.effects=c.domestic.effects.filter(e=>e.key!=='discount:'+def.direction);}
 if(def.kind==='repair'){action.buildingKey=pick.targetId;c.project={key:action.buildingKey,siteId,mode:'repair',hpPerDay:def.value/def.days,remaining:def.days/10,actionId:action.id,domestic:true};action.repairActual=0;action.repairCarry=0;action.repairRoll=domesticRandom(s);}
 if(['build','repair'].includes(def.kind)){const p=c.project,hp=buildingDurability(c,p.key,p.siteId).hp,required=Math.max(1,buildingDurability(c,p.key,p.siteId).maxHp-hp);initializeWorkMerit(p,{required,budget:required/p.hpPerDay*PROGRESSION.domestic/PROGRESSION.workDays});p.meritOriginHp??=hp;}
 if(def.kind==='research')initializeWorkMerit(c.domestic.research,{required:TECHS[pick.targetId].requiredProgress,budget:TECHS[pick.targetId].days*PROGRESSION.domestic/PROGRESSION.workDays,progress:c.domestic.research.progress});
 addCityGold(s,c,-pick.cost);a.action=action;a.waiting='';
 if(['hire','persuade'].includes(def.kind)){startTalentProject(s,a,c);const target=s.campaign.domestic.people.find(p=>p.id===pick.targetId),other=s.campaign.idle.find(o=>o.unit.id===pick.targetId);beginOfficerMission(s,a,o.unit,target?.cityId||other?.location);}
 emit(s,a,'start',`${o.unit.name}开始在${buildingSiteName(s,siteId)}${actionName(c,pick.key)}${pick.targetId?'（'+(TECHS[pick.targetId]?.name||OFFICER_BY_ID[pick.targetId]?.name||'')+'）':''}，本轮至多${duration}天，支出${pick.cost}金。`,{cost:pick.cost,chance:pick.chance,traits:action.traitIds,siteId});
}
export function beginDomesticTurn(s){
 reconcileDomestic(s);refreshTalentDemand(s);refreshTalentProjects(s);prepareEnemyDomestic(s);
 for(const a of [...s.campaign.domestic.assignments].sort((a,b)=>{const rank=x=>domesticPriority(s,town(s,x.cityId)?.owner).indexOf(x.direction);return rank(a)-rank(b)||a.id-b.id;})){
  const c=town(s,a.cityId);if(a.action||a.proposal||pendingDomesticOrder(s,a.officerId)||plannedOfficer(s,a.officerId)||a.lastTurn===turn(s))continue;a.lastTurn=turn(s);
  if(besieged(s,c.id)){a.waiting='围城期间暂停';continue;}
  if(c.domestic.suspended&&ACTIONS[c.domestic.suspended.key].direction===a.direction){a.action=c.domestic.suspended;const u=domesticOfficer(s,a.officerId).unit,def=ACTIONS[a.action.key];a.action.traitIds=taskTraits(u,def);a.action.chance=actionChance(s,c,u,def,a.action.targetId);if(a.action.incidentId!==null&&!s.campaign.domestic.incidents.events.find(r=>r.id===a.action.incidentId)?.officerIds.includes(a.officerId))a.action.incidentId=null;delete c.domestic.suspended;c.project.actionId=a.action.id;emit(s,a,'resume',`${c.name}${def.name}接续，保留原进度且不重复收费。`);continue;}
  const options=actionCandidates(s,a);if(!options.length){a.waiting='资源、条件不足或暂无值得执行的行动';continue;}
 const good=options.filter(x=>x.score>=options[0].score-14),floor=options[0].score-15;let draw=domesticRandom(s)*good.reduce((sum,x)=>sum+x.score-floor,0),pick=good.at(-1);for(const candidate of good){draw-=candidate.score-floor;if(draw<0){pick=candidate;break;}}start(s,a,c,pick);
 }
}
function addEffect(c,key,amount,t,extra=0){c.domestic.effects=c.domestic.effects.filter(e=>e.key!==key);c.domestic.effects.push({key,amount,untilTurn:t+2+extra});}
function completionAvailable(s,c,x){
 const def=ACTIONS[x.key],d=s.campaign.domestic;
 if(def.opportunity&&!c.domestic.opportunities.some(e=>e.kind===def.opportunity&&e.expires>=day(s)))return false;
 switch(def.kind){
  case 'build':return c.project?.actionId===x.id&&(c.project.mode==='repair'||canExpandBuilding(s,c,def.value,x.siteId))&&constructionSiteAvailable(s,c,x.siteId);
  case 'repair':return c.project?.actionId===x.id;
  case 'research':return c.domestic.research?.type===x.targetId&&!c.domestic.techs.includes(x.targetId);
    case 'hire':case 'persuade':return talentEligibility(s,x.targetId,c.owner,c.id,def.kind).ok;
  case 'reassure':return ownTargets(s,c).some(u=>u.id===x.targetId&&(d.loyalty[u.id]??85)<reassuranceCap(s,u.id));
  case 'explore':return unknownTalent(s,c.id,c.owner).length>0;
  case 'rescue':return c.domestic.opportunities.some(e=>e.kind===def.value&&e.expires>=day(s));
  case 'trade':return accessible(s,c);
  default:return true;
 }
}
function planCooperation(s){
 const used=new Set();
 const d=s.campaign.domestic,groups=new Map();
 for(const a of d.assignments){if(besieged(s,a.cityId)||missionOfficer(s,a.officerId)||pendingDomesticOrder(s,a.officerId)||plannedOfficer(s,a.officerId))continue;const key=a.cityId+':'+a.direction;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);}
 for(const [key,group]of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  if(d.cooperation[key]?.turn===turn(s))continue;
  const helpers=d.assignments.filter(a=>a.cityId===group[0].cityId&&!missionOfficer(s,a.officerId)&&!pendingDomesticOrder(s,a.officerId)&&!plannedOfficer(s,a.officerId)&&(hasStrategicTrait(domesticOfficer(s,a.officerId)?.unit,'crossCooperate')||group.some(g=>hasStrategicTrait(domesticOfficer(s,g.officerId)?.unit,'crossCooperate'))));
  const all=[...new Set([...group,...helpers])].filter(a=>!used.has(a.officerId));if(all.length<2)continue;
  group.sort((a,b)=>a.officerId.localeCompare(b.officerId));
  const actors=group.filter(a=>!used.has(a.officerId)&&a.action&&(['build','research'].includes(ACTIONS[a.action.key].kind)||a.action.remaining<=1)&&completionAvailable(s,town(s,a.cityId),a.action));
  if(!actors.length)continue;
  // Each eligible ordered pair has the same weight without allocating N² pairs.
  const pairs=actors.flatMap(a=>all.filter(h=>h!==a&&(h.direction===a.direction||hasStrategicTrait(domesticOfficer(s,h.officerId)?.unit,'crossCooperate')||hasStrategicTrait(domesticOfficer(s,a.officerId)?.unit,'crossCooperate'))).map(helper=>({a,helper})));if(!pairs.length)continue;const {a,helper}=pairs[Math.floor(domesticRandom(s)*pairs.length)];used.add(a.officerId);used.add(helper.officerId);
  const profile=cooperationProfile(s,domesticOfficer(s,a.officerId).unit,domesticOfficer(s,helper.officerId).unit,ACTIONS[a.action.key]),def=ACTIONS[a.action.key];
  d.cooperation[key]={turn:turn(s),day:day(s),cityId:a.cityId,direction:a.direction,actionId:a.action.id,actionKey:a.action.key,officerId:a.officerId,helperId:helper.officerId,...profile,success:domesticRandom(s)<profile.chance,mode:def.cooperation,before:0,after:0,actual:0,relationGain:0,applied:false};
 }
}
function cooperationFor(s,a){const r=s.campaign.domestic.cooperation[a.cityId+':'+a.direction];return r?.actionId===a.action.id&&r.day===day(s)&&!r.applied?r:null;}
function settleCooperation(s,a,c,r,before,after,metric,productive=after>before){
 if(!r)return;
 r.applied=true;r.before=before;r.after=after;r.actual=Math.max(0,Math.round((after-before)*10000)/10000);
 const actor=domesticOfficer(s,r.officerId)?.unit,helper=domesticOfficer(s,r.helperId)?.unit;
 if(r.success&&r.actual>0&&productive&&actor&&helper)r.relationGain=growCooperationRelationship(s,actor,helper,turn(s));
 const names=`${actor?.name||OFFICER_BY_ID[r.officerId].name}与${helper?.name||OFFICER_BY_ID[r.helperId].name}`;
 const effect=!r.success?'本次未触发协作':r.actual>0?`${metric}额外提高${Number(r.actual.toFixed(3))}${r.mode==='chance'?'个百分点':''}${!productive?'，本次未增加实际成果':''}`:'本次协作未增加实际成果（行动结果或可用上限限制）';
 emit(s,a,'cooperation',`${c.name}${DIRECTIONS[a.direction]}：${names}协作判定，${effect}${r.relationGain?'，双方关系+'+r.relationGain:''}。`,structuredClone(r));
}
const outcome=(roll,chance)=>roll<chance*OUTCOMES.criticalShare?OUTCOMES.criticalFactor:roll<chance?1:roll<Math.min(OUTCOMES.partialCeiling,chance+OUTCOMES.partialChance)?OUTCOMES.partialFactor:0;
export function researchDailyRate(s,c,a){
 const x=a?.action,u=a&&domesticOfficer(s,a.officerId)?.unit,def=ACTIONS[x?.key];if(!u||def?.kind!=='research'||!TECHS[x.targetId]||!completionAvailable(s,c,x))return 0;
 const work=workProfile(x.traitIds,def,x.targetId),factor=workFactor(outcome(x.researchRoll,effectiveDomesticChance(s,a)),work),quantity=x.traitIds.reduce((n,id)=>Math.max(n,WORK_TRAITS[id].quantity||0),0);
 return TECHS[x.targetId].requiredProgress/TECHS[x.targetId].days*(.75+domesticAbility(u,def)/200)*(1+c.workshop*.1)*def.value/100*factor*(1+quantity)*workQuantity(factor,work)*incidentModifiers(s,a).progress;
}
function advanceResearch(s,a,c){
 const x=a.action,r=c.domestic.research;if(r?.type!==x.targetId)return;
 const before=r.progress,coop=cooperationFor(s,a),rate=researchDailyRate(s,c,a),work=workProfile(x.traitIds,ACTIONS[x.key],x.targetId);
 const normal=Math.min(TECHS[r.type].requiredProgress-before,rate),extra=coop?.success&&coop.mode==='quantity'&&!coop.applied?1+coop.gain*(work.cooperationMultiplier||1):1;
 r.progress=Math.min(TECHS[r.type].requiredProgress,Math.round((before+normal*extra)*10000)/10000);r.workedDays++;
 x.researchActual=Math.round((x.researchActual+r.progress-before)*10000)/10000;
 if(coop&&!coop.applied)settleCooperation(s,a,c,coop,normal,r.progress-before,'研究进度');
 if(r.progress>=TECHS[r.type].requiredProgress)x.remaining=0;
}
function complete(s,a,c){
 const x=a.action,def=ACTIONS[x.key],o=domesticOfficer(s,a.officerId),coop=cooperationFor(s,a),valid=!o.unit.mission?.cancelled&&completionAvailable(s,c,x),baseChance=effectiveDomesticChance(s,a),incidentId=incidentFor(s,a)?.id??null,roll=def.kind==='research'?x.researchRoll:def.kind==='repair'?x.repairRoll:domesticRandom(s),baseFactor=valid?outcome(roll,baseChance):0;
 const chance=valid&&coop?.success&&coop.mode==='chance'&&baseChance>0?Math.min(OUTCOMES.maxChance,baseChance+coop.chanceGain):baseChance;
 // Preserve the proportions of unsuccessful outcomes when success probability rises.
 const adjustedRoll=chance>baseChance&&roll>=chance?baseChance+(roll-chance)*(1-baseChance)/(1-chance):roll;
 const rawFactor=!valid?0:chance>baseChance&&roll>=chance?outcome(adjustedRoll,baseChance):outcome(roll,chance);
 const factor=valid?Math.max(def.kind==='research'&&c.domestic.research.progress>=TECHS[x.targetId].requiredProgress?1:0,workFactor(rawFactor,workProfile(x.traitIds,def,x.targetId))):0;
 const work=workProfile(x.traitIds,def,x.targetId);
 let coopBefore=0,coopAfter=0,changed=false;
 const traitQuantity=x.traitIds.reduce((n,id)=>Math.max(n,WORK_TRAITS[id].quantity||0),0);
 const boost=(raw,cap=Infinity,round=Math.round)=>{raw*=(1+traitQuantity)*workQuantity(factor,work)*incidentModifiers(s,a).quantity;if(def.kind==='grain'&&x.farmDays)raw*=1+Math.min(.25,x.farmContribution/Math.max(1,def.days)*x.farmRate);const before=Math.max(0,Math.min(cap,round(raw))),after=Math.max(0,Math.min(cap,round(raw*(coop?.success&&coop.mode==='quantity'?1+coop.gain*(work.cooperationMultiplier||1):1))));coopBefore+=before;coopAfter+=after;return after;};
 let result=factor>=1?'成功':factor>0?'部分达成':'失败',details='',actual=0,refund=0,reward=null;
 if(!valid){details=['hire','persuade'].includes(def.kind)?completeTalentProject(s,a,c,0).details:'目标或执行条件已失效，没有新增成果';if(def.kind==='research'&&c.domestic.research?.type===x.targetId){actual=x.researchActual;details=`研究目标或机会已失效，本轮停止；累计已完成${Number(c.domestic.research.progress.toFixed(2))}%，保留实际进度与已付费用，下轮接续不重复收费`;}if(def.kind==='recruit'){release(s,c,x);if(x.recruitMode==='replenish')refund=x.cost-x.baseCost;}else if(x.key==='buy')refund=300;addCityGold(s,c,refund);}
 else switch(def.kind){
  case 'build':if(factor>=1){const before=cityBaseIncome(s,c),level=localBuildingLevel(c,def.value,x.siteId),mode=c.project.mode,beforeHp=c.project.startedHp;restoreBuilding(c,def.value,x.siteId,1);creditWorkMerit(s,a,c,c.project,buildingDurability(c,def.value,x.siteId).hp-c.project.meritOriginHp);if(mode==='build'){c[def.value]++;if(x.siteId!==c.id)c.domestic.buildingSites[def.value].push(x.siteId);}c.project=null;const after=cityBaseIncome(s,c);reward={kind:'building',mode,beforeHp,afterHp:buildingDurability(c,def.value,x.siteId).hp,maxHp:buildingDurability(c,def.value,x.siteId).maxHp,buildingKey:def.value,siteId:x.siteId,beforeLevel:level,afterLevel:localBuildingLevel(c,def.value,x.siteId),incomeDelta:Object.fromEntries(['gold','grain','manpower'].map(k=>[k,after[k]-before[k]]))};if(factor>1){refund=Math.floor(x.cost*(work.criticalRefund??.15));addCityGold(s,c,refund);}details=`${buildingSiteName(s,x.siteId)}的${BUILDINGS[def.value].name}${mode==='repair'?'已修复':'已建成'}，${c.name}设施合计${c[def.value]}级，实际花费${x.cost-refund}金${refund?'，节省'+refund+'金':''}`;}
   else {x.remaining=work.setbackDays??Math.ceil(def.days*ECONOMY_RULES.work.constructionSetbackShare);c.project.remaining=x.remaining/10;details=`工程受阻，保留进度，延长${x.remaining}天，不追加费用`; }break;
  case 'cash':{const raw=Math.round(def.value*factor*economicWorkScale(domesticAbility(o.unit,def))*(1+technologyIncomeBonus(c,'gold')));actual=creditCityWork(s,c,'gold',raw>x.cost?boost(raw,cityWorkRemaining(s,c,'gold')):raw);addCityGold(s,c,actual);details=`收入${actual}金，净${actual>=x.cost?'收益':'亏损'}${Math.abs(actual-x.cost)}金`;break;}
  case 'effect':if(factor)addEffect(c,def.value,boost(def.power*factor,1,n=>Math.round(n*10000)/10000),turn(s),work.duration||0);details=factor?`未来${3+(work.duration||0)}次旬末产出获得加成`:'未获得额外产出加成';break;
  case 'discount':if(factor)addEffect(c,'discount:'+def.value,boost(.2*factor+(work.discount||0),.5,n=>Math.round(n*10000)/10000),turn(s));details=factor?'获得有期限的一次性建设优惠':'未达成合作';break;
  case 'grain':actual=creditCityWork(s,c,'grain',boost(def.value*factor*economicWorkScale(domesticAbility(o.unit,def))*(1+technologyIncomeBonus(c,'grain')),Math.min(grainCapacity(c)-c.grain,cityWorkRemaining(s,c,'grain'))));c.grain+=actual;details=`额外入仓${actual}粮`;break;
  case 'trade':if(factor&&accessible(s,c)){if(def.value==='sell'){actual=Math.max(0,Math.min(x.amount,Math.floor(c.grain-grainReserve(s,c))));c.grain-=actual;const gold=Math.floor(actual*.18*(factor>1?1.1:1)*(1+(work.price||0))*incidentModifiers(s,a).quantity);addCityGold(s,c,gold);details=`售粮${actual}，收入${gold}金`;}else{actual=Math.max(0,Math.min(Math.floor(grainCapacity(c)-c.grain),Math.floor(x.amount*Math.min(1,factor*incidentModifiers(s,a).quantity))));c.grain+=actual;refund=Math.floor((x.cost-def.cost+300)*(1-actual/1200));addCityGold(s,c,refund);details=`购入${actual}粮，退还未成交货款${refund}金`;}}else {if(def.value==='buy'){refund=300;addCityGold(s,c,refund);}details='未成交，仅损失联络费用';}break;
  case 'rescue':{const e=c.domestic.opportunities.find(e=>e.kind===def.value);if(e&&factor){changed=Math.min(1,factor)>(e.saved||0);e.saved=Math.max(e.saved||0,Math.min(1,factor));details='减少本次灾情损失';}else details='未挽回额外损失';break;}
  case 'research':actual=x.researchActual;if(c.domestic.research?.type===x.targetId&&c.domestic.research.progress>=TECHS[x.targetId].requiredProgress){c.domestic.techs.push(x.targetId);completeTechnologyBuilding(c,x.targetId);c.domestic.research=null;changed=true;reward={kind:'technology',technologyId:x.targetId};details=`掌握${TECHS[x.targetId].name}：${TECHS[x.targetId].description}`;}else details=`${actual>0?'本轮研制有所进展，增加'+Number(actual.toFixed(2)):'本轮研制未成，未有进展'}，已完成${Number(c.domestic.research.progress.toFixed(2))}%，下轮接续不重复收费`;break;
    case 'recruit':{
   if(x.recruitMode==='reserve'){
    actual=creditCityWork(s,c,'manpower',boost(def.reserveValue*economicWorkScale(domesticAbility(o.unit,def))*factor*(1+technologyIncomeBonus(c,'manpower')),Math.min(ECONOMY_RULES.capacity.manpowerMax-c.manpower,cityWorkRemaining(s,c,'manpower')),Math.floor));
    c.manpower+=actual;details=`征集${actual}名预备兵；编制与整补另付金并消耗兵源`;break;
   }
   const units=stats(s,c).units,capacity=x.recipients.reduce((n,r)=>{const u=units.find(u=>u.id===r.id);return n+(!u||!canRefill(c,u)?0:Math.min(r.amount,Math.max(0,troopCapacity(u)-u.troops-u.wounded)));},0);
   let equipmentSpent=0;let remaining=boost(x.amount*Math.min(1,factor),Math.min(x.amount,capacity,c.manpower,Math.max(0,recruitmentLimit(c)-c.drafted),recruitGrainBudget(s,c)),Math.floor);
   for(const r of x.recipients){const u=units.find(u=>u.id===r.id);if(!u||u.type!==r.type||!canRefill(c,u))continue;const n=Math.min(remaining,r.amount,Math.max(0,troopCapacity(u)-u.troops-u.wounded));u.troops+=n;actual+=n;remaining-=n;equipmentSpent+=n*trainingRate(u)*x.unitCost/.25*x.militaryMultiplier;}
   c.manpower-=actual;c.drafted+=actual;refreshTalentDemand(s,true);release(s,c,x);refund=Math.max(0,x.cost-x.baseCost-Math.ceil(equipmentSpent));addCityGold(s,c,refund);details=`预备兵-${actual}，具体部队兵力+${actual}，退回未使用费用${refund}金`;break;}
  case 'heal':{
   const units=[...c.units,...localArmies(s,c).filter(a=>a.hunger===0).flatMap(a=>a.units)];
   const eligible=x.recipients.map(r=>({u:units.find(u=>u.id===r.id),r}));
   const capacity=eligible.reduce((n,{u,r})=>n+(u?Math.min(u.wounded,r.amount):0),0);
   const cap=hasStrategicTrait(o.unit,'healRemainder')?units.reduce((n,u)=>n+u.wounded,0):capacity;
   if(c.grain>=200&&cap>0){c.grain-=200;let left=boost(def.value*factor*economicWorkScale(domesticAbility(o.unit,def)),cap,Math.floor);
    for(const {u,r} of eligible){if(!u)continue;const n=Math.min(left,u.wounded,r.amount);u.wounded-=n;u.troops+=n;actual+=n;left-=n;}
    if(hasStrategicTrait(o.unit,'healRemainder'))for(const u of units.filter(u=>!x.recipients.some(r=>r.id===u.id)).sort((a,b)=>a.id.localeCompare(b.id))){const n=Math.min(left,u.wounded);u.wounded-=n;u.troops+=n;actual+=n;left-=n;}
   }details=`实际恢复${actual}名伤兵，全部回到原部队`;break;}
  case 'repair':actual=x.repairActual;c.project=null;details=`恢复建筑耐久${actual}，当前${buildingDurability(c,x.buildingKey).hp}/${buildingDurability(c,x.buildingKey).maxHp}`;break;
  case 'prepare':if(factor){const old=c.domestic.preparation[def.value],previous=old?.until>=day(s)?old.amount:0,raw=def.power*Math.min(1,factor),cap=Math.max(0,(def.value==='intent'?30-c.drill*3:.35-.13-c.walls*.02));const amount=boost(raw,Math.min(def.power*1.25,cap),n=>Math.round(n*10000)/10000);coopBefore=Math.max(previous,coopBefore);coopAfter=Math.max(previous,coopAfter);c.domestic.preparation[def.value]={amount:Math.max(previous,amount),until:day(s)+(work.durationDays||30),actionId:x.id};}details=factor?`取得${work.durationDays||30}天内下一场本城守城战的一次准备加成`:'准备未奏效';break;
  case 'explore':{const pool=unknownTalent(s,c.id,c.owner);if(factor&&pool.length){const p=pool[Math.floor(domesticRandom(s)*pool.length)];discoverTalent(s,p.id,c.owner);changed=true;details=`发现${OFFICER_BY_ID[p.id].name}，可查看求仕态度`;}else details='未发现新人';break;}
  case 'hire':case 'persuade':{const result=completeTalentProject(s,a,c,factor);actual=result.actual;changed=actual>0;details=result.details;break;}
  case 'reassure':{const d=s.campaign.domestic,u=ownTargets(s,c).find(u=>u.id===x.targetId);if(u){const d=s.campaign.domestic,g=residentOfficer(s,c.governor),bonus=Math.max(domesticEffects(g?.location===c.id&&g?.faction===c.owner?g.unit:null).relief||0,domesticEffects(o.unit).relief||0);actual=Math.max(0,Math.min(reassuranceCap(s,u.id)-(d.loyalty[u.id]??85),Math.floor((def.value+bonus)*factor*workQuantity(factor,work)*incidentModifiers(s,a).quantity)));d.loyalty[u.id]=(d.loyalty[u.id]??85)+actual;}const primary=actual;let others=0;if(primary>0&&factor>=1&&work.secondaryTargets){const targets=ownTargets(s,c).filter(v=>v.id!==x.targetId&&!targetBusy(s,v.id)&&(d.loyalty[v.id]??85)<85&&reassuranceCap(s,v.id)>(d.loyalty[v.id]??85)&&s.campaign.talent.records[v.id]?.leaveAtDay===null).sort((a,b)=>(d.loyalty[a.id]??85)-(d.loyalty[b.id]??85)||a.id.localeCompare(b.id)).slice(0,work.secondaryTargets);for(const v of targets){const n=Math.max(0,Math.min(reassuranceCap(s,v.id)-(d.loyalty[v.id]??85),Math.floor(primary*work.secondaryFraction)));d.loyalty[v.id]=(d.loyalty[v.id]??85)+n;others+=n;}}actual+=others;details=`原目标忠诚提高${primary}${others?'；其他本城目标合计提高'+others:''}`;break;}
 }
 if(coop&&!['research','repair'].includes(def.kind)){
  const metric=({cash:'金收入',grain:'入仓粮食',research:'研究进度',recruit:'征募人数',heal:'恢复人数',repair:'城防耐久',effect:'临时产出倍率',discount:'建设折扣',prepare:'守城准备'})[def.kind]||'成功把握';
  if(coop.mode==='chance'){changed||=actual>0||valid&&factor>=1&&['hire','persuade'].includes(def.kind);settleCooperation(s,a,c,coop,baseChance*100,chance*100,metric,changed&&factor>baseFactor);}
  else settleCooperation(s,a,c,coop,coopBefore,coopAfter,metric);
 }
 if(def.opportunity&&def.kind!=='build'){const i=c.domestic.opportunities.findIndex(e=>e.kind===def.opportunity);if(i>=0)c.domestic.opportunities.splice(i,1);}
 const productive=valid&&(actual>0||changed||coopAfter>0||def.kind==='build'&&factor>=1);
 const progressWork=['build','repair','research'].includes(def.kind),earned=progressWork?0:ordinaryWorkMerit(def,x,{actual,factor,productive,netCost:x.cost-refund,scale:economicWorkScale(domesticAbility(o.unit,def))});
 let penalty=0;
 if(valid&&def.kind==='build'&&factor<1){const m=c.project.merit;penalty=Math.min(PROGRESSION.failures.construction,PROGRESSION.failures.constructionMaximum-m.penalty);m.penalty+=penalty;}
 else if(valid&&(!productive&&factor===0||def.kind==='cash'&&actual<x.cost-refund))penalty=['hire','persuade'].includes(def.kind)?PROGRESSION.failures.talent:PROGRESSION.failures.domestic;
 // Co-operative extra output shares this reward; it is not another full reward.
 const helper=coop?.success&&coop.actual>0?domesticOfficer(s,coop.helperId):null,share=earned&&helper?.faction===c.owner?Math.floor(earned*Math.min(.25,coop.actual/Math.max(coop.after,coop.actual))):0;
 const growth=earned||penalty?settleOfficerMerit(s,o.unit,{sourceId:`domestic:${x.id}:${day(s)}`,amount:earned-share-penalty,faction:c.owner,cityId:c.id,category:'domestic',reason:def.name+'结算'}):null;
 if(penalty&&['hire','persuade'].includes(def.kind)){const p=s.campaign.talent.projects[talentKey(x.targetId,c.owner)];if(p)p.meritPenalty+=penalty;}
 if(share)settleOfficerMerit(s,helper.unit,{sourceId:`domestic-cooperation:${x.id}:${day(s)}`,amount:share,faction:c.owner,cityId:c.id,category:'domestic',reason:'协作增加实际成果'});
 if(growth)details+='；奖励'+(earned-share)+'，扣罚'+penalty+'；'+meritChangeText(growth)+(growth.unlocked.length?'，习得'+growth.unlocked.join('、'):'');
 if(valid&&factor>=1)referralAfterWork(s,c,o.unit,x);
 a.lastKey=x.key;a.failures=factor>=1?0:a.failures+1;
 const creditKey=valid?(def.kind==='cash'?'gold':def.kind==='grain'?'grain':def.kind==='recruit'&&x.recruitMode==='reserve'?'manpower':null):null;
 emit(s,a,factor>=1?'complete':'failure',`${o.unit.name}在${buildingSiteName(s,x.siteId)}${def.name}${result}：${details}。`,{result,incidentId,spent:x.cost-refund,actual,factor,traits:x.traitIds,changed,leveled:!!growth&&growth.after!==growth.before,growth,earned:earned-share,penalty,siteId:x.siteId,...(reward?{reward}:{}),...(creditKey?{resourceCredit:{gold:0,grain:0,manpower:0,[creditKey]:actual}}:{})});
 recordTreasureWork(s,{id:'work:'+x.id,key:x.key,officerId:a.officerId,faction:c.owner,cityId:c.id,siteId:x.siteId,factor,productive,finished:!(def.kind==='build'&&factor<1)});
 if(def.kind==='build'&&factor<1)return;
 c.domestic.cooldowns[x.key]=day(s)+(def.kind==='prepare'?10:1);a.action=null;a.waiting='本次行动结束，下一旬重新评估';
 if(valid&&!o.unit.mission&&!pendingDomesticOrder(s,a.officerId)&&!plannedOfficer(s,a.officerId)&&strategicTraits(o.unit,'chain').some(t=>t.kinds.includes(def.kind))){if(def.kind==='research'&&factor>=1)c.domestic.cooldowns[x.key]=day(s);const follow=actionCandidates(s,a).find(p=>def.kind==='reassure'?ACTIONS[p.key].kind==='reassure'&&p.targetId!==x.targetId:ACTIONS[p.key].kind==='research');if(follow&&factor>=1)start(s,a,c,follow);}
}
export function completeBattleBuildingWork(s,cityIds){
 for(const c of s.cities.filter(c=>cityIds.includes(c.id))){
  const p=c.project;if(!p||p.mode!=='build')continue;
  const durability=buildingDurability(c,p.key,p.siteId);if(durability.hp!==durability.maxHp)continue;
  const before=cityBaseIncome(s,c),level=localBuildingLevel(c,p.key,p.siteId),a=s.campaign.domestic.assignments.find(a=>a.action?.id===p.actionId);
  c[p.key]++;if(p.siteId!==c.id)c.domestic.buildingSites[p.key].push(p.siteId);
  const after=cityBaseIncome(s,c),reward={kind:'building',mode:'build',buildingKey:p.key,siteId:p.siteId,beforeLevel:level,afterLevel:localBuildingLevel(c,p.key,p.siteId),beforeHp:p.startedHp,afterHp:durability.hp,maxHp:durability.maxHp,incomeDelta:Object.fromEntries(['gold','grain','manpower'].map(k=>[k,after[k]-before[k]]))};
  emit(s,a||{cityId:c.id},'complete',`${buildingSiteName(s,p.siteId)}的${BUILDINGS[p.key].name}在战场修缮后达到完整耐久，工程完成。`,{siteId:p.siteId,reward});
  if(a){a.lastKey=a.action.key;a.action=null;a.waiting='工程已完成，下一旬重新评估';}
  delete c.domestic.suspended;c.project=null;
 }
}
export function reconcileDomestic(s){
 // Completed facilities in a captured small city remain there and change administrator.
 for(const c of s.cities)for(const [key,sites] of Object.entries(c.domestic.buildingSites)){
  c.domestic.buildingSites[key]=sites.filter(id=>{const host=s.cities.find(n=>n.id===id);if(!host||host.owner===c.owner)return true;
   transferBuildingDurability(c,host,key,id);c[key]=Math.max(0,c[key]-1);host[key]++;
   const lostGrain=Math.max(0,c.grain-grainCapacity(c));c.grain=Math.min(c.grain,grainCapacity(c));
   emit(s,{cityId:c.id},'event',`${host.name}的${BUILDINGS[key].name}随城池失守移交当地，${c.name}设施总等级减少1${lostGrain?'，仓储容量减少，损失'+lostGrain+'粮':''}。`,{siteId:id,building:key,lostGrain});return false;
  });
 }
 for(const c of s.cities)if(c.governor){const o=domesticOfficer(s,c.governor);if(!o||o.location!==c.id||o.faction!==c.owner)c.governor=null;}
 for(const c of s.cities)if(c.domestic.owner!==c.owner){
  for(const a of [...s.campaign.domestic.assignments].filter(a=>a.cityId===c.id))cancelDomestic(s,a.officerId,'因城池失守结束委任');
  c.domestic.owner=c.owner;c.domestic.preparation={intent:null,shield:null};c.domestic.reserved=0;c.domestic.effects=[];
 }
 for(const a of [...s.campaign.domestic.assignments]){const o=domesticOfficer(s,a.officerId),c=town(s,a.cityId);if(!o||o.location!==c.id||o.faction!==c.owner)cancelDomestic(s,a.officerId,'离开岗位');}
}
export function finishDomesticDay(s){
 if(s.campaign.domestic.lastFinishedDay===day(s))return;
 advanceOfficerMissions(s);reconcileDomestic(s);
 finishTalentDay(s,cancelDomestic);
 planDomesticIncidents(s,{available:completionAvailable,emit});planCooperation(s);
 for(const a of [...s.campaign.domestic.assignments]){if(!s.campaign.domestic.assignments.includes(a)||!a.action)continue;const c=town(s,a.cityId),x=a.action,u=domesticOfficer(s,a.officerId)?.unit,m=u?.mission;
  if(m){
   if(m.phase==='return'){if(m.route.length||m.location!==m.homeCity)continue;if(!m.workDone)complete(s,a,c);a.action=null;a.waiting='已返城，下一旬重新评估';delete u.mission;continue;}
   if(m.phase==='outbound'||m.phase==='work'&&s.campaign.day<m.workStartDay)continue;
  }
  const kind=ACTIONS[x.key].kind,siteBlocked=['build','repair'].includes(kind)&&!constructionSiteAvailable(s,c,x.siteId);
  if(kind==='build'){const a=buildingDurability(c,ACTIONS[x.key].value,x.siteId);x.remaining=Math.max(x.remaining,Math.ceil(Math.max(0,a.maxHp-a.hp-1)/c.project.hpPerDay));}
  if(besieged(s,c.id)||siteBlocked){if(!x.paused){x.paused=true;emit(s,a,'pause',`${buildingSiteName(s,x.siteId)}工地或道路受阻，${ACTIONS[x.key].name}暂停。`,{siteId:x.siteId});}continue;}
  if(x.paused){x.paused=false;emit(s,a,'resume',`${buildingSiteName(s,x.siteId)}恢复通行，继续${ACTIONS[x.key].name}。`,{siteId:x.siteId});}
  // Expired research sources cannot produce progress or merit. Settle before
  // advancing so a failed opportunity never leaves a complete, locked project.
  if(kind==='research'&&!completionAvailable(s,c,x)){complete(s,a,c);continue;}
  if(ACTIONS[x.key].kind==='grain'&&hasStrategicTrait(u,'farmTroops')){const troopUnits=farmTroops(s,c,u),rule=strategicTraits(u,'farmTroops')[0].strategic;x.farmSource=u.id;x.farmRate=rule.bonus;x.farmDays++;x.farmContribution+=Math.min(1,troopUnits.reduce((n,v)=>n+v.troops,0)/rule.requiredTroops);}
  const coop=cooperationFor(s,a),beforeRemaining=x.remaining,modifier=incidentModifiers(s,a),beforeHp=['build','repair'].includes(kind)?buildingDurability(c,c.project.key,c.project.siteId).hp:0,beforeResearch=c.domestic.research?.progress||0;
  if(kind==='build'){const normal=Math.min(x.remaining,modifier.progress),progress=Math.min(x.remaining,normal+(coop?.success?Math.min(10,x.remaining)*coop.gain:0));if(coop)settleCooperation(s,a,c,coop,normal,progress,'施工进度（天）');x.remaining=Math.max(0,Math.round((x.remaining-progress)*10000)/10000);}else x.remaining=Math.max(0,x.remaining-1);
  if(kind==='build')restoreBuilding(c,ACTIONS[x.key].value,x.siteId,c.project.hpPerDay*(beforeRemaining-x.remaining),{finish:false});
  if(kind==='repair'){const def=ACTIONS[x.key],work=workProfile(x.traitIds,def,x.targetId),factor=workFactor(outcome(x.repairRoll,effectiveDomesticChance(s,a)),work),quantity=x.traitIds.reduce((n,id)=>Math.max(n,WORK_TRAITS[id].quantity||0),0),record=buildingDurability(c,x.buildingKey),normal=Math.min(record.maxHp-record.hp,c.project.hpPerDay*factor*(1+quantity)*workQuantity(factor,work)*modifier.progress),extra=coop?.success&&!coop.applied?1+coop.gain*(work.cooperationMultiplier||1):1,raw=normal*extra+x.repairCarry,rounded=Math.round(raw),actual=restoreBuilding(c,x.buildingKey,c.id,rounded);x.repairCarry=actual<rounded?0:Math.round((raw-rounded)*10000)/10000;x.repairActual+=actual;if(coop&&!coop.applied)settleCooperation(s,a,c,coop,Math.round(normal),actual,'建筑耐久');if(record.hp===record.maxHp)x.remaining=0;}
  if(kind==='research')advanceResearch(s,a,c);
  if(['build','repair'].includes(kind)){const hp=buildingDurability(c,c.project.key,c.project.siteId).hp;creditWorkMerit(s,a,c,c.project,hp-c.project.meritOriginHp,coop?.success&&coop.actual>0?coop:incidentSupport(s,a,(hp-beforeHp)/modifier.progress,hp-beforeHp));}
  if(kind==='research'){const progress=c.domestic.research.progress-beforeResearch;creditWorkMerit(s,a,c,c.domestic.research,c.domestic.research.progress,coop?.success&&coop.actual>0?coop:incidentSupport(s,a,progress/modifier.progress,progress));}
  if(ACTIONS[x.key].kind==='build'&&c.project)c.project.remaining=Math.max(.01,x.remaining/10);
  if(x.remaining<=0){complete(s,a,c);if(m){returnOfficerMission(s,u);a.action=x;x.remaining=1;}}
 }
 for(const c of s.cities){
  for(const e of c.domestic.opportunities.filter(e=>e.expires===day(s))){if(['disaster','mold'].includes(e.kind)){const loss=Math.min(c.grain,Math.floor(e.amount*(1-(e.saved||0))));c.grain-=loss;emit(s,{cityId:c.id},'event',`${c.name}${e.kind==='mold'?'仓储霉变':'灾情'}结算，损失${loss}粮。`,{loss});}}
  c.domestic.opportunities=c.domestic.opportunities.filter(e=>e.expires>day(s));
 }
 for(const r of Object.values(s.campaign.domestic.cooperation))if(r.day===day(s)&&!r.applied)settleCooperation(s,{cityId:r.cityId,direction:r.direction,officerId:r.officerId,action:{id:r.actionId}},town(s,r.cityId),r,0,0,'行动成果');
 if(day(s)%10===0)resolveTalentOffers(s,cancelDomestic);
 s.campaign.domestic.lastFinishedDay=day(s);
}
export function generateDomesticOpportunities(s){
 const d=s.campaign.domestic;if(d.lastOpportunityTurn===turn(s))return;d.lastOpportunityTurn=turn(s);
 for(const c of s.cities){c.domestic.effects=c.domestic.effects.filter(e=>e.untilTurn>=turn(s));if(besieged(s,c.id)||c.domestic.opportunities.length>=3)continue;
  const r=domesticRandom(s);if(r>.28)continue;const kind=r<.1?'master':r<.18?'disaster':'mold';if(c.domestic.opportunities.some(e=>e.kind===kind))continue;
  c.domestic.opportunities.push({kind,expires:day(s)+19,amount:kind==='master'?0:Math.min(600,Math.floor(c.grain*.08)),saved:0});
  emit(s,{cityId:c.id},'event',`${c.name}${kind==='master'?'有名匠来访，可考虑聘请':kind==='disaster'?'出现田间灾情，可抢收保粮':'出现仓储霉变隐患，可整理仓储'}。`);
 }
}
export function siegeOpening(c,currentDay){return {intent:Math.min(30,c.drill*3+(c.domestic.preparation.intent?.until>=currentDay?c.domestic.preparation.intent.amount:0)),shield:Math.min(.35,.13+c.walls*.02+(c.domestic.preparation.shield?.until>=currentDay?c.domestic.preparation.shield.amount:0)),intentId:c.domestic.preparation.intent?.until>=currentDay?c.domestic.preparation.intent.actionId:null,shieldId:c.domestic.preparation.shield?.until>=currentDay?c.domestic.preparation.shield.actionId:null};}

export function validateDomestic(s){
 const fail=(ok,msg='内政存档无效')=>{if(!ok)throw new Error(msg);},int=(v,max=1e9)=>Number.isSafeInteger(v)&&v>=0&&v<=max,num=(v,max=1e9)=>Number.isFinite(v)&&v>=0&&v<=max;
 validateTalent(s);
 validateBuildingDurability(s,fail);validateDomesticIncidents(s,fail);
 const d=s.campaign.domestic;fail(d?.version===20&&typeof d.autoApprove==='boolean','内政存档版本不兼容，请重新开始');fail(d.priorities&&typeof d.priorities==='object'&&!Array.isArray(d.priorities)&&Object.keys(d.priorities).every(f=>FACTIONS[f])&&s.cities.filter(c=>c.owner!=='neutral').every(c=>Array.isArray(d.priorities[c.owner])),'内政势力优先级无效');for(const priority of Object.values(d.priorities))fail(Array.isArray(priority)&&priority.length===Object.keys(DIRECTIONS).length&&new Set(priority).size===priority.length&&priority.every(x=>DIRECTIONS[x]),'内政优先级无效');fail(int(d.seed,0xffffffff)&&int(d.nextId)&&int(d.lastOpportunityTurn,turn(s))&&d.lastFinishedDay===day(s)-1,'内政日期或随机状态无效');
 const map=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const occupiedSites=new Set();
 for(const c of s.cities){
  if(c.domestic.research)fail(validWorkMerit(c.domestic.research),'研究功绩记录无效');
  const sites=constructionSites(s,c),validSite=id=>typeof id==='string'&&sites.some(n=>n.id===id);
  fail(map(c.domestic?.buildingSites)&&Object.keys(c.domestic.buildingSites).length===Object.keys(BUILDINGS).length,'都市圈设施地点无效');
  for(const key of Object.keys(BUILDINGS)){const records=c.domestic.buildingSites[key];fail(Array.isArray(records)&&records.length<=c[key]&&records.every(id=>id!==c.id&&validSite(id))&&(key!=='walls'||records.length===0),'都市圈设施记录无效');
   for(const site of constructionSites(s,c)){
    const own=site.id===c.id?c[key]-records.length:records.filter(id=>id===site.id).length;
    fail(own<=localBuildingLimit(s,c,key,site.id),'所属设施超过地点上限');
    const local=s.cities.find(t=>t.id===site.id),limit=localBuildingLimit(s,local||c,key,site.id);
    fail(s.cities.reduce((n,source)=>n+(source.id===site.id?Math.max(0,source[key]-source.domestic.buildingSites[key].length):source.domestic.buildingSites[key].filter(id=>id===site.id).length),0)<=limit,'建设地点设施超过上限');}}
  if(c.project?.domestic){fail(validWorkMerit(c.project),'工程功绩记录无效');fail(validSite(c.project.siteId)&&!occupiedSites.has(c.project.siteId),'都市圈工地无效或重复');occupiedSites.add(c.project.siteId);}
  for(const x of [...d.assignments.filter(a=>a.cityId===c.id&&a.action).map(a=>a.action),...(c.domestic.suspended?[c.domestic.suspended]:[])]){
   fail(['build','repair'].includes(ACTIONS[x.key]?.kind)?validSite(x.siteId)&&x.siteId===c.project?.siteId:x.siteId===c.id,'事务地点与工地不符');
   if(ACTIONS[x.key]?.kind==='build'&&ACTIONS[x.key].value==='walls')fail(x.siteId===c.id,'城墙须建设在主城');
  }
 }
 fail(Array.isArray(d.assignments)&&d.assignments.length<=Object.keys(OFFICER_BY_ID).length&&Array.isArray(d.events)&&d.events.length<=240&&Array.isArray(d.people)&&d.people.length<=Object.keys(OFFICER_BY_ID).length&&map(d.loyalty)&&map(d.cooperation)&&map(d.cooperationGrowth)&&Array.isArray(d.orders)&&d.orders.length<=Object.keys(OFFICER_BY_ID).length&&map(d.workHistory));
 for(const [id,history]of Object.entries(d.workHistory)){fail(OFFICER_BY_ID[id]&&Array.isArray(history)&&history.length<=12);for(const x of history)fail(int(x.actionId)&&x.actionId<d.nextId&&town(s,x.cityId)&&ACTIONS[x.key]&&int(x.startedDay,day(s))&&int(x.endedDay,day(s))&&x.endedDay>=x.startedDay&&int(x.cost)&&['interrupted','completed','failed'].includes(x.status)&&typeof x.text==='string'&&x.text.length<1000&&(x.targetId===null||typeof x.targetId==='string'));}
 const people=new Set([...preparedUnits(s).map(u=>u.id),...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)]),actors=new Set(),ids=new Set(),constructionSlots=new Set(),researchSlots=new Set(),targetSlots=new Set(),effectSlots=new Set(),opportunitySlots=new Set();
 for(const [id,v]of Object.entries(d.loyalty))fail(Object.hasOwn(OFFICER_BY_ID,id)&&int(v,100),'武将忠诚无效');
 for(const p of d.people){fail(OFFICER_BY_ID[p.id]&&!people.has(p.id)&&town(s,p.cityId),'候选人物重复或无效');people.add(p.id);}
 function checkAction(x){const def=ACTIONS[x?.key];fail(Number.isFinite(x.meritDays)&&x.meritDays>0&&x.meritDays<=500,'事务功绩工期无效');fail(def&&int(x.id)&&!ids.has(x.id)&&x.id<d.nextId&&int(x.cost)&&int(x.amount)&&num(x.chance,1)&&num(x.remaining,['build','repair'].includes(def?.kind)?500:30)&&x.remaining>0&&int(x.startedDay,day(s))&&typeof x.paused==='boolean'&&int(x.farmDays,day(s))&&num(x.farmContribution,x.farmDays)&&num(x.farmRate,.25)&&(x.farmSource===null?x.farmDays===0:hasStrategicTrait({id:x.farmSource},'farmTroops'))&&Array.isArray(x.recipients),'内政行动无效');ids.add(x.id);fail(Array.isArray(x.traitIds)&&new Set(x.traitIds).size===x.traitIds.length&&x.traitIds.every(id=>(!WORK_TRAITS[id]?.work||WORK_TRAITS[id].work.actions.includes(def.id))&&WORK_TRAITS[id]?.kinds?.includes(def.kind)&&(!WORK_TRAITS[id].direction||WORK_TRAITS[id].direction===def.direction)&&(!WORK_TRAITS[id].value||WORK_TRAITS[id].value===def.value))&&num(x.unitCost,1),'内政特性快照无效');fail(x.targetId===null||typeof x.targetId==='string');const seen=new Set();for(const r of x.recipients){fail(OFFICER_BY_ID[r.id]&&!seen.has(r.id)&&int(r.amount));seen.add(r.id);}if(def.kind==='repair')fail(['walls','watchtower'].includes(x.buildingKey)&&num(x.repairRoll,1)&&int(x.repairActual)&&Number.isFinite(x.repairCarry)&&Math.abs(x.repairCarry)<=.5,'修复事务无效');if(def.kind==='research')fail(TECHS[x.targetId]&&num(x.researchRoll,1)&&num(x.researchActual,100),'研究事务无效');if(def.kind==='recruit')fail(num(x.militaryMultiplier,1)&&x.militaryMultiplier>=.9&&int(x.baseCost)&&x.baseCost===Math.ceil(def.cost*x.militaryMultiplier)&&['reserve','replenish'].includes(x.recruitMode)&&(x.recruitMode==='reserve'?x.recipients.length===0&&x.unitCost===0&&x.cost===ECONOMY_RULES.recruitment.reserveCost+(x.key==='urgent'?def.cost:0)&&x.amount<=Math.ceil(def.reserveValue*economicWorkScale(100)*1.25):x.recipients.every(r=>TROOPS[r.type])&&x.amount===x.recipients.reduce((n,r)=>n+r.amount,0)));}
 const claim=(set,key)=>{fail(!set.has(key),'内政行动重复占用目标或队列');set.add(key);};
 for(const a of d.assignments){const c=town(s,a.cityId),o=domesticOfficer(s,a.officerId);fail(c&&o&&o.location===c.id&&o.faction===c.owner&&DIRECTIONS[a.direction]&&!actors.has(a.officerId)&&int(a.id)&&!ids.has(a.id)&&a.id<d.nextId&&int(a.lastTurn,turn(s))&&int(a.failures)&&typeof a.waiting==='string'&&a.waiting.length<300);actors.add(a.officerId);ids.add(a.id);fail(a.lastKey===null||ACTIONS[a.lastKey]);if(a.action){const x=a.action,def=ACTIONS[x.key];checkAction(x);fail(JSON.stringify(x.traitIds)===JSON.stringify(taskTraits(o.unit,def))&&x.unitCost===(def.kind==='recruit'&&x.recruitMode==='replenish'?(x.key==='urgent'?.4:.25)*(1-taskTraitBonus(o.unit,def,'recruitDiscount')):0),'内政特性与执行人不符');fail(def.direction===a.direction);if(['build','repair'].includes(def.kind)){claim(constructionSlots,c.id);fail(c.project?.actionId===x.id&&c.project.key===(def.kind==='repair'?x.buildingKey:def.value));}if(['build','repair'].includes(def.kind))fail(validWorkMerit(c.project),'工程功绩记录无效');if(def.kind==='research'){fail(validWorkMerit(c.domestic.research),'研究功绩记录无效');claim(researchSlots,c.id);}if(['hire','persuade','reassure'].includes(def.kind))claim(targetSlots,def.kind==='reassure'?x.targetId:talentKey(x.targetId,c.owner));if(['effect','discount','prepare'].includes(def.kind))claim(effectSlots,c.id+':'+def.kind+':'+def.value);if(def.opportunity||def.kind==='rescue')claim(opportunitySlots,c.id+':'+(def.opportunity||def.value));}}
 for(const a of d.assignments){
  fail(a.proposal===null||a.proposal&&typeof a.proposal==='object','提案状态无效');if(!a.proposal)continue;
  const p=a.proposal,x=p.pick,c=town(s,a.cityId),def=ACTIONS[x?.key];
  fail(!a.action&&isPlayerControlled(s,c.owner)&&!d.autoApprove&&def?.direction===a.direction&&int(p.id)&&p.id<d.nextId&&!ids.has(p.id)&&int(p.createdDay,day(s))&&p.createdDay>0&&num(p.days,500)&&p.days>0&&typeof p.siteId==='string'&&constructionSites(s,c).some(n=>n.id===p.siteId),'内政提案无效');ids.add(p.id);
  fail(int(x.cost)&&int(x.amount)&&num(x.chance,OUTCOMES.maxChance)&&x.chance>=OUTCOMES.minChance&&Number.isFinite(x.score)&&(x.targetId===null||typeof x.targetId==='string')&&(def.kind==='recruit'?['reserve','replenish'].includes(x.recruitMode):x.recruitMode===null),'提案事务无效');
  fail(p.expenses&&Object.keys(p.expenses).sort().join(',')==='gold,grain,manpower'&&Object.keys(proposalExpenses(x)).every(k=>int(p.expenses[k])&&p.expenses[k]===proposalExpenses(x)[k])&&Object.values(p.expenses).some(n=>n>0),'提案用度无效');
  if(['build','repair'].includes(def.kind)){claim(constructionSlots,c.id);fail(!c.project&&!occupiedSites.has(p.siteId)&&constructionSites(s,c).some(n=>n.id===p.siteId),'提案工地重复或无效');occupiedSites.add(p.siteId);if(def.value==='walls')fail(p.siteId===c.id,'城墙须建设在主城');}
  else fail(p.siteId===c.id,'提案地点无效');
  if(def.kind==='research'){fail(TECHS[x.targetId]&&technologyAllowed(c,x.targetId)&&!c.domestic.research,'提案研究目标无效');claim(researchSlots,c.id);}
  if(['hire','persuade','reassure'].includes(def.kind)){fail(OFFICER_BY_ID[x.targetId],'提案人选无效');claim(targetSlots,def.kind==='reassure'?x.targetId:talentKey(x.targetId,c.owner));}
  if(def.kind==='repair')fail(['walls','watchtower'].includes(x.targetId),'提案修缮目标无效');
  if(['effect','discount','prepare'].includes(def.kind))claim(effectSlots,c.id+':'+def.kind+':'+def.value);
  if(def.opportunity||def.kind==='rescue')claim(opportunitySlots,c.id+':'+(def.opportunity||def.value));
 }
 fail(Object.keys(d.cooperation).length<=s.cities.length*6);
 for(const [key,r]of Object.entries(d.cooperation)){
  fail(r&&town(s,r.cityId)&&DIRECTIONS[r.direction]&&key===r.cityId+':'+r.direction&&int(r.turn,turn(s))&&r.turn>0&&int(r.day,day(s))&&r.day>0&&r.turn===Math.floor((r.day-1)/10)+1&&int(r.actionId)&&r.actionId<d.nextId&&ACTIONS[r.actionKey]?.direction===r.direction&&r.mode===ACTIONS[r.actionKey].cooperation,'协作记录无效');
  fail(OFFICER_BY_ID[r.officerId]&&OFFICER_BY_ID[r.helperId]&&r.officerId!==r.helperId&&num(r.chance,.65)&&r.chance>=.05&&num(r.gain,.25)&&r.gain>=.1&&num(r.chanceGain,.08)&&r.chanceGain>=.03&&int(r.relation,100)&&['未载','很合拍','合拍','一般','不太合拍','难合拍'].includes(r.affinity)&&typeof r.success==='boolean'&&typeof r.applied==='boolean'&&num(r.before)&&num(r.after)&&num(r.actual)&&Math.abs(r.actual-Math.max(0,r.after-r.before))<.00011&&int(r.relationGain,3),'协作数值无效');
  fail(r.success||r.actual===0&&r.relationGain===0);fail(!r.relationGain||r.applied&&r.actual>0);
 }
 for(const [key,t]of Object.entries(d.cooperationGrowth)){const pair=key.split('|');fail(pair.length===2&&pair[0]!==pair[1]&&pair.every(id=>OFFICER_BY_ID[id])&&[...pair].sort().join('|')===key&&int(t,turn(s))&&t>0,'协作关系成长记录无效');}
 for(const c of s.cities){const x=c.domestic;fail(x&&x.owner===c.owner&&Array.isArray(x.techs)&&new Set(x.techs).size===x.techs.length&&x.techs.every(t=>TECHS[t]&&technologyAllowed(c,t)&&TECHS[t].prerequisites.every(p=>x.techs.includes(p)))&&Array.isArray(x.effects)&&Array.isArray(x.opportunities)&&int(x.reserved)&&x.reserved<=c.manpower&&x.cooldowns&&x.preparation);for(const field of Object.keys(BUILDINGS))fail(int(c[field],buildingLimit(s,c,field)));
  fail(x.production&&Object.keys(x.production).sort().join(',')==='gold,grain,manpower,turn'&&int(x.production.turn,turn(s))&&x.production.turn>0&&['gold','grain','manpower'].every(key=>int(x.production[key],Math.ceil((ECONOMY_RULES.development.workValueBase+ECONOMY_RULES.development.metropolitanMax*ECONOMY_RULES.development.workValuePerLevel)/ECONOMY_RULES.value[key]*(1+technologyIncomeBonus(c,key))))),'内政产出额度无效');
  fail(!x.research||TECHS[x.research.type]&&!x.techs.includes(x.research.type)&&num(x.research.progress,TECHS[x.research.type].requiredProgress)&&x.research.progress<TECHS[x.research.type].requiredProgress&&technologyAllowed(c,x.research.type)&&TECHS[x.research.type].prerequisites.every(p=>x.techs.includes(p))&&int(x.research.spent)&&x.research.spent===TECHS[x.research.type].cost&&int(x.research.workedDays));
  const reserved=d.assignments.filter(a=>a.cityId===c.id&&a.action?.recruitMode==='replenish').reduce((n,a)=>n+a.action.amount,0);fail(x.reserved===reserved,'预备兵预留不一致');
  for(const e of x.effects)fail(['gold','grain',...Object.keys(DIRECTIONS).map(k=>'discount:'+k)].includes(e.key)&&num(e.amount,1)&&int(e.untilTurn));
  for(const e of x.opportunities)fail(['master','capture','disaster','mold'].includes(e.kind)&&int(e.expires)&&int(e.amount)&&num(e.saved,1));
  for(const v of Object.values(x.cooldowns))fail(int(v));
  for(const key of ['intent','shield']){const p=x.preparation[key];fail(p===null||num(p.amount,key==='intent'?15:.125)&&int(p.until)&&int(p.actionId));}
  if(x.suspended){checkAction(x.suspended);fail(['build','repair'].includes(ACTIONS[x.suspended.key].kind)&&c.project?.domestic&&c.project.actionId===null);}
  if(c.project?.domestic)fail(x.suspended||d.assignments.some(a=>a.cityId===c.id&&a.action?.id===c.project.actionId));
 }
 for(const e of d.events)fail(int(e.id)&&e.id<d.nextId&&int(e.day,day(s))&&typeof e.text==='string'&&e.text.length<1000&&['assignment','start','complete','failure','cancel','pause','resume','event','cooperation','order-wait','order-done','order-cancel','proposal','proposal-approved','proposal-rejected','proposal-withdrawn','incident'].includes(e.phase));
}

function recruitEquipment(s,c,amount){let left=amount,cost=0;for(const u of stats(s,c).units.filter(u=>canRefill(c,u)).sort((a,b)=>a.troops-b.troops||a.id.localeCompare(b.id))){const n=Math.min(left,Math.max(0,troopCapacity(u)-u.troops-u.wounded-reservedForUnit(s,c,u.id)));cost+=n*trainingRate(u,c);left-=n;if(!left)break;}return cost;}

function farmTroops(s,c,u){
 const busy=id=>id!==u.id&&(assignmentFor(s,id)?.action||pendingDomesticOrder(s,id)||plannedOfficer(s,id));
 if(besieged(s,c.id))return [];
 return c.units.filter(v=>v.troops>0&&!v.mission&&!busy(v.id)&&(u.id==='person-482'||v.id===u.id));
}
function handoffWork(s,c,old){
 const x=old.action,def=ACTIONS[x.key];if(c.owner!==c.domestic.owner||besieged(s,c.id)||!completionAvailable(s,c,x))return null;
 const next=s.campaign.domestic.assignments.filter(a=>a!==old&&a.cityId===c.id&&a.direction===old.direction&&!a.action&&!a.proposal&&!pendingDomesticOrder(s,a.officerId)&&!plannedOfficer(s,a.officerId)).sort((a,b)=>a.id-b.id).find(a=>{const o=domesticOfficer(s,a.officerId);return o&&!o.unit.mission&&o.faction===c.owner&&strategicTraits(o.unit,'handoff').some(t=>t.kinds.includes(def.kind));});
 if(!next)return null;const u=domesticOfficer(s,next.officerId).unit;if(x.incidentId!==null&&!s.campaign.domestic.incidents.events.find(r=>r.id===x.incidentId)?.officerIds.includes(next.officerId))x.incidentId=null;next.action=x;next.waiting='';x.traitIds=taskTraits(u,def);x.chance=actionChance(s,c,u,def,def.kind==='research'?x.targetId:def.kind==='hire'?s.campaign.domestic.people.find(p=>p.id===x.targetId):def.kind==='persuade'?foreignTargets(s,c).find(o=>o.unit.id===x.targetId):ownTargets(s,c).find(v=>v.id===x.targetId));
 if(['hire','persuade'].includes(def.kind)){const project=s.campaign.talent.projects[talentKey(x.targetId,c.owner)];if(project)project.executorId=u.id;const p=s.campaign.domestic.people.find(p=>p.id===x.targetId),other=s.campaign.idle.find(o=>o.unit.id===x.targetId);beginOfficerMission(s,next,u,p?.cityId||other?.location);}
 emit(s,next,'resume',u.name+'接续'+def.name+'，保留实际进度与已付费用。');return next;
}
function referralAfterWork(s,c,u,x){
 const traits=strategicTraits(u,'referral').filter(t=>t.kinds.includes(ACTIONS[x.key].kind));if(!traits.length)return;
 const count=Math.max(...traits.map(t=>t.strategic.count)),threshold=Math.min(...traits.map(t=>t.strategic.relation));const sources=[u.id];if(count>1&&x.targetId&&OFFICER_BY_ID[x.targetId])sources.push(x.targetId);
 for(let n=0;n<count;n++){const p=s.campaign.domestic.people.filter(p=>p.status==='FREE'&&!p.travel&&!s.campaign.talent.knowledge[c.owner]?.[p.id]?.locationConfirmed&&sources.some(id=>id!==p.id&&relationshipInfo(id,p.id,s.relationshipScores,s.relationshipTypes).score>=threshold)).sort((a,b)=>a.id.localeCompare(b.id))[0];if(!p)break;discoverTalent(s,p.id,c.owner);sources.push(p.id);}
}
