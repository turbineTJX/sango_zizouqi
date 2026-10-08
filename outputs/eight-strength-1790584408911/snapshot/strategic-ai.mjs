import {mapNode,cityRoads} from './road-network.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {COMBAT,CAMPAIGN_TIME} from './combat-rules.mjs';
import {unitAttributes} from './unit-stats.mjs';
import {playerFaction} from './player-faction.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {cityForce,cityForces} from './city-units.mjs';
import {cityPersonnel,residentOfficer} from './city-personnel.mjs';
import {roadCost,movementPoints,roadDistance,threatenedTransportRoute} from './strategic-movement.mjs';
import {issueCommand,unitTactics} from './engine.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {canTrain,assignmentFor,pendingDomesticOrder,removeDomesticOrder,reservedMen,cityFoodReserve,recruitmentLimit,DIRECTIONS,ACTIONS} from './domestic.mjs';
import {nationalScenario} from './national-scenarios.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {requestFactionOrder} from './strategic-orders.mjs';
import {prepareCityUnits,recruitLocalUnits,findCampaignRoute,orderCampaignArmy,consolidateCityArmies,expeditionError,CAMPAIGN} from './strategic-campaign.mjs';
import {factionLord} from './talent-core.mjs';
import {activePlans,plannedOfficer,plannedGrain,plannedCargo,domesticIntentWeight} from './strategic-intent.mjs';

export const STRATEGIC_AI=Object.freeze({version:2,attackRatio:1.3,foodDays:5,planDays:40,consolidationDays:3});
const STYLES={cautious:{ratio:1.45,reserve:.65,patience:45},balanced:{ratio:1.3,reserve:.55,patience:40},bold:{ratio:1.2,reserve:.5,patience:30}};
const style=(s,f)=>STYLES[s.campaign.ai?.factions[f]?.style||'balanced'];
const town=mapNode;
const fighting=(s,id)=>s.campaign.battles.find(b=>!b.settled&&b.armyIds.includes(id));
const besieged=(s,id)=>s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===id);
const neighbors=(s,id)=>cityRoads(s).flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
const forces=s=>[...s.armies.filter(a=>!a.disbanded),...cityForces(s)];
const foodUse=units=>units.reduce((n,u)=>n+u.troops/100+u.wounded/200,0);
const busy=(s,id)=>!!pendingDomesticOrder(s,id)||plannedOfficer(s,id);
const ownArmy=(s,f,id)=>s.armies.find(a=>a.faction===f&&!a.disbanded&&a.units.some(u=>u.id===id));
export function initializeStrategicAI(s){
 const factions=nationalScenario(s.campaign.scenarioId).factions.filter(f=>f!==playerFaction(s));
 s.campaign.ai={version:STRATEGIC_AI.version,treasuries:Object.fromEntries(factions.map(f=>[f,s.gold])),lastPlanDay:0,lastEconomyTurn:0,nextPlanId:1,plans:[],cities:{},factions:Object.fromEntries(factions.map(f=>{const personality=OFFICER_BY_ID[factionLord(s,f)]?.personality;return [f,{style:personality===2?'cautious':personality===4?'bold':'balanced',lastReviewTurn:0,stance:'develop',nextOffensiveDay:1,reserveGold:500}];})),decisions:[]};
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
 let days=0;for(const to of path){days+=Math.ceil(roadCost(s,from,to,a.roadPolicy||'auto')/speed);from=to;}return days;
}
function arrivalDays(s,a,target){
 const from=a.travel?.to||a.location,path=findCampaignRoute(s,from,target,a.faction);
 if(!path)return Infinity;
 const remaining=a.travel?Math.ceil(roadCost(s,a.travel.from,a.travel.to,a.travel.road||'main')*(1-a.travel.progress/roadDistance(s,a.travel.from,a.travel.to))/Math.max(1,movementPoints(a))):0;
 return remaining+strategicTravelDays(s,a,path,from);
}
function record(s,id,kind,target,reason){
 const ai=s.campaign.ai,previous=ai.decisions.find(d=>d.armyId===id);
 if(previous?.kind===kind&&previous.target===target&&previous.reason===reason)return;
 const a=s.armies.find(a=>a.id===id),c=town(s,id.replace('city-force:',''));
 ai.decisions.unshift({day:s.campaign.day,armyId:id,faction:a?.faction||c?.owner,name:a?.name||c?.name||'军令',kind,target,reason});ai.decisions=ai.decisions.slice(0,80);
}
function cityDefense(s,c){const power=forces(s).filter(a=>a.faction===c.owner&&!a.travel&&(!a.route.length||fighting(s,a.id))&&a.location===c.id).reduce((n,a)=>n+strategicPower(s,a),0);return power+(power>0||c.garrison>0?c.gateHp/6:0);}
// Map armies and destinations are public in the current prototype. Isolate this
// observation boundary so future fog of war cannot leak enemy orders.
export function observeStrategicThreat(s,c){
 const rows=s.armies.filter(a=>a.faction!==c.owner&&!a.disbanded&&(a.target===c.id||a.travel?.to===c.id||fighting(s,a.id)?.cityId===c.id)).map(a=>{
  return {power:strategicPower(s,a),eta:arrivalDays(s,a,c.id)};});
 return {power:rows.reduce((n,x)=>n+x.power,0),eta:Math.min(Infinity,...rows.map(x=>x.eta)),nearby:forces(s).filter(a=>a.faction!==c.owner&&!a.travel&&neighbors(s,c.id).includes(a.location)).reduce((n,a)=>n+strategicPower(s,a),0)};
}
function reserveNeed(s,c){const t=observeStrategicThreat(s,c);return Math.max(0,t.power*1.1,t.nearby*style(s,c.owner).reserve)-c.gateHp/6;}
// Recheck the actual departure, including a previously queued order. A past
// planning snapshot must not authorize stripping a newly threatened city.
export function strategicDepartureError(s,q){
 const c=town(s,q.cityId);if(!c||!s.campaign.ai?.factions[q.faction])return null;
 const force=cityForce(c),remaining={...force,units:force.units.filter(u=>!q.officerIds.includes(u.id))};
 return strategicPower(s,remaining)<Math.max(0,reserveNeed(s,c))?'敌情变化后出兵城守备不足，保留部队并重新评估':null;
}
function availableUnits(s,c){
 const a=cityForce(c),ranked=rankOfficerCandidates(s,a.units.filter(u=>u.troops>0&&!busy(s,u.id)),{task:'expedition',city:c.id}).map(x=>x.unit);
 let left=strategicPower(s,a);const selected=[],need=Math.max(0,reserveNeed(s,c));
 for(const u of ranked){const power=strategicPower(s,{...a,units:[u]});if(left-power<need)continue;selected.push(u);left-=power;}
 return selected;
}
// Check physical presence before examining work. A home-city registration on an
// officer's away mission is not evidence that they can depart from that city.
export function expeditionTiming(s,cityId,officerIds,{arrivalDeadline=null,travelDays=0}={}){
 const c=town(s,cityId),people=officerIds.map(id=>residentOfficer(s,id));
 if(!c||!officerIds.length||people.some(o=>!o||o.location!==cityId||o.faction!==c.owner||o.unit.mission))return {error:'参战武将尚未实际驻扎本据点',choice:null};
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
 if(!units.length||target===c.id)return false;
 const leader=rankOfficerCandidates(s,units,{task:'role',role:'leader',city:c.id})[0].unit.id,advisor=rankOfficerCandidates(s,units,{task:'role',role:'advisor',city:c.id})[0].unit.id;
 const path=findCampaignRoute(s,c.id,target,c.owner);if(!path)return false;
 const travelDays=strategicTravelDays(s,{...cityForce(c),units,leader},path),timing=expeditionTiming(s,c.id,units.map(u=>u.id),{...timingOptions,travelDays});if(timing.error)return false;
 if(timingOptions.arrivalDeadline!==undefined&&travelDays>timingOptions.arrivalDeadline-s.campaign.day)return false;
 const result=requestFactionOrder(s,c.owner,{kind:'expedition',cityId:c.id,officerIds:units.map(u=>u.id),leader,advisor,deputy:null,target,policy:'auto',minSupply:kind==='reinforce'?Math.ceil(foodUse(units)*(travelDays+2)):units.length*900},timing.choice);
 if(result.error)return false;
 const a=ownArmy(s,c.owner,units[0].id);if(a)a.task={attack:'择敌出征',stage:'前线集结',reinforce:'增援守城'}[kind];
 record(s,a?.id||`city-force:${c.id}`,kind,target,reason+'；'+timing.reason);return true;
}
export function manageStrategicEconomy(s){
 const ai=s.campaign.ai;if(ai.lastEconomyTurn===s.turn)return;ai.lastEconomyTurn=s.turn;
 // Recruitment may use half the opening treasury. Keep the other half for
 // officer-led civil work, rather than spending every available coin first.
 const floors=Object.fromEntries(Object.keys(ai.factions).map(f=>[f,Math.max(ai.factions[f].reserveGold,Math.ceil(ai.treasuries[f]/2))]));
 for(const c of s.cities.filter(c=>Object.hasOwn(ai.treasuries,c.owner))){
  if(besieged(s,c.id))continue;
  const idle=s.campaign.idle.filter(o=>o.faction===c.owner&&o.location===c.id&&!o.destination&&!o.retreating&&!o.unit.mission&&!busy(s,o.unit.id)&&canTrain(c,o.unit.type));
  if(idle.length&&c.kind==='city'&&c.units.length<6&&ai.treasuries[c.owner]>=500&&c.manpower>1000&&c.grain>2500){
   const ids=rankOfficerCandidates(s,idle.map(o=>o.unit),{task:'draft',city:c.id}).slice(0,6-c.units.length).map(x=>x.unit.id);prepareCityUnits(s,c.id,ids,{scheduled:true,faction:c.owner});
  }
  const ids=rankOfficerCandidates(s,cityPersonnel(s,c.id).filter(o=>!o.unit.mission&&(o.cityUnit||o.army)&&canTrain(c,o.unit.type)).map(o=>o.unit),{task:'recruit',city:c.id}).map(x=>x.unit.id);
  if(ids.length)recruitLocalUnits(s,c,ids,{faction:c.owner,grainReserve:Math.max(2500,cityFoodReserve(s,c)+Math.ceil(recruitmentLimit(c)*ECONOMY_RULES.ai.recruitReserveDays/100))+plannedGrain(s,c.id),manpowerReserve:plannedCargo(s,c.id,'manpower'),goldReserve:floors[c.owner],cap:4500});
 }
}
function refreshCityIntents(s,faction){
 const ai=s.campaign.ai,p=activePlans(s).find(p=>p.faction===faction);
 for(const c of s.cities.filter(c=>c.owner===faction)){
  const threat=observeStrategicThreat(s,c),front=neighbors(s,c.id).some(id=>town(s,id).owner!==faction);
  const role=p?.phase==='consolidate'&&p.target===c.id?'recovery':threat.power>0?'front':p?.staging===c.id?'staging':cityPersonnel(s,c.id).length<2&&c.kind==='city'?'talent':front?'front':'rear';
  ai.cities[c.id]={faction,role,defenseNeed:Math.ceil(Math.max(0,reserveNeed(s,c))),grainNeed:Math.ceil(Math.max(2500,foodUse(c.units)*ECONOMY_RULES.ai.foodReserveDays,plannedGrain(s,c.id))),manpowerNeed:['front','staging','recovery'].includes(role)&&c.units.length?3000:0,updatedDay:s.campaign.day};
 }
}
function cancelPlan(s,p,reason){
 p.phase='cancelled';p.updatedDay=s.campaign.day;p.reason=reason;p.reserves={};
 for(const q of [...s.campaign.domestic.orders])if(q.faction===p.faction&&q.kind==='expedition'&&q.officerIds.some(id=>p.officerIds.includes(id)))removeDomesticOrder(s,q.id,reason);
 s.campaign.ai.factions[p.faction].nextOffensiveDay=s.campaign.day+5;
 record(s,`city-force:${p.staging}`,'hold',p.target,reason);
 for(const a of s.armies.filter(a=>a.faction===p.faction&&a.units.some(u=>p.officerIds.includes(u.id))&&!fighting(s,a.id)))retreatArmy(s,a,reason);
}
function retreatArmy(s,a,reason){
 if(a.task==='回城补给'&&a.route.length&&town(s,a.target)?.owner===a.faction)return;
 const from=a.travel?.from||a.location,homes=s.cities.filter(c=>c.owner===a.faction&&!besieged(s,c.id)).map(c=>({c,path:findCampaignRoute(s,from,c.id,a.faction)})).filter(x=>x.path&&x.c.grain>=Math.max(500,foodUse(a.units)*3)).map(x=>({...x,days:strategicTravelDays(s,a,x.path,from)})).sort((x,y)=>x.days-y.days||x.c.id.localeCompare(y.c.id));
 if(!homes.length){record(s,a.id,'hold',a.location,'没有可达粮仓，保持现有位置');return;}
 const home=homes[0];
 const error=orderCampaignArmy(s,a.id,home.c.id,'auto',{scheduled:true,faction:a.faction,reverse:!!a.travel});
 if(!error){a.task='回城补给';record(s,a.id,'retreat',home.c.id,reason);}
}
function emergencyOrders(s){
 const ai=s.campaign.ai;
 for(const a of [...s.armies].filter(a=>Object.hasOwn(ai.factions,a.faction)&&!a.disbanded)){
  const b=fighting(s,a.id);
  if(b){const side=b.battle.sides.findIndex(x=>x.faction===a.faction),own=b.battle.sides[side],foe=b.battle.sides[1-side],hp=x=>x.units.reduce((n,u)=>n+u.hp,0);
   if(b.battle.deploymentLocked&&!own.retreat&&(a.hunger>=2||hp(own)<own.units.reduce((n,u)=>n+u.initial,0)*.32&&hp(foe)>hp(own)*1.8)){issueCommand(b.battle,'retreat',null,side);record(s,a.id,'retreat',a.homeCity,'战损过重或断粮，保存残部');}continue;
  }
  if(a.hunger>=1||a.supply<foodUse(a.units)*2&&town(s,a.location)?.owner!==a.faction){
   const p=activePlans(s).find(p=>p.officerIds.some(id=>a.units.some(u=>u.id===id)));if(p)cancelPlan(s,p,'参战军团补给不足，取消进攻并回撤');else retreatArmy(s,a,'粮草不足，沿道路回城补给');
  }
 }
 for(const c of s.cities.filter(c=>Object.hasOwn(ai.factions,c.owner))){
  const threat=observeStrategicThreat(s,c);let need=threat.power-cityDefense(s,c);if(need<=0)continue;
  for(const q of [...s.campaign.domestic.orders].filter(q=>q.faction===c.owner&&q.kind==='expedition'&&q.target===c.id)){
   const from=town(s,q.cityId),units=q.officerIds.map(id=>from.units.find(u=>u.id===id));if(units.some(u=>!u))continue;
   const path=findCampaignRoute(s,from.id,c.id,c.owner);if(!path)continue;
   const a={...cityForce(from),units,leader:q.leader},days=strategicTravelDays(s,a,path),timing=expeditionTiming(s,from.id,q.officerIds,{arrivalDeadline:s.campaign.day+threat.eta,travelDays:days});
   if(!timing.error&&timing.choice==='now')commandUnits(s,from,units,c.id,'reinforce','救援时限收紧，重新核对出征时机',{arrivalDeadline:s.campaign.day+threat.eta});
   else if(!timing.error&&days+Math.max(0,...q.officerIds.map(id=>assignmentFor(s,id)?.action?.remaining||0))<=threat.eta)need-=strategicPower(s,a);
  }
  for(const a of s.armies.filter(a=>a.faction===c.owner&&a.target===c.id&&!fighting(s,a.id)))if(arrivalDays(s,a,c.id)<=threat.eta)need-=strategicPower(s,a);
  if(need<=0)continue;
  const p=activePlans(s).find(p=>p.faction===c.owner);if(p&&p.phase!=='consolidate')cancelPlan(s,p,`${c.name}守备告急，优先保境`);
  const sources=s.cities.filter(x=>x.owner===c.owner&&x.id!==c.id&&!besieged(s,x.id)).map(x=>({c:x,path:findCampaignRoute(s,x.id,c.id,c.owner)})).filter(x=>x.path).map(x=>({...x,units:availableUnits(s,x.c).slice(0,10)})).filter(x=>x.units.length).map(x=>({...x,days:strategicTravelDays(s,{...cityForce(x.c),units:x.units},x.path)})).filter(x=>x.days<=threat.eta).sort((a,b)=>a.days-b.days||a.c.id.localeCompare(b.c.id));
  for(const x of sources){if(need<=0)break;const a={...cityForce(x.c),units:x.units};if(x.c.grain<foodUse(x.units)*(x.days+2))continue;
   if(commandUnits(s,x.c,x.units,c.id,'reinforce','援军可及时抵达，优先救援',{arrivalDeadline:s.campaign.day+threat.eta}))need-=strategicPower(s,a);
  }
  record(s,`city-force:${c.id}`,'hold',c.id,need>0?'敌军逼近，守备仍有缺口':'守城并等待已派援军');
 }
}
function createPlan(s,faction){
 const ai=s.campaign.ai,policy=ai.factions[faction];if(activePlans(s).some(p=>p.faction===faction)||s.campaign.day<policy.nextOffensiveDay)return;
 const cities=s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id)),pool=new Map(cities.map(c=>[c.id,availableUnits(s,c)])),options=[];
 for(const staging of cities){
  if(observeStrategicThreat(s,staging).power>cityDefense(s,staging))continue;
  if(strategicPower(s,cityForce(staging))<Math.max(0,reserveNeed(s,staging)))continue;
  for(const id of neighbors(s,staging.id)){
   const target=town(s,id);if(target.owner===faction||besieged(s,id))continue;
   const groups=cities.map(c=>{const path=findCampaignRoute(s,c.id,staging.id,faction),units=pool.get(c.id).slice(0,10),a={...cityForce(c),units};return {c,units,path,days:path?strategicTravelDays(s,a,path):Infinity};}).filter(x=>x.units.length&&x.days<=10).sort((a,b)=>a.days-b.days||a.c.id.localeCompare(b.c.id));
   const selected=[];let power=0;const defense=cityDefense(s,target),required=defense*style(s,faction).ratio;
   const candidates=groups.flatMap(x=>x.units.map((u,index)=>({x,u,index}))).sort((a,b)=>Number(!!assignmentFor(s,a.u.id)?.action)-Number(!!assignmentFor(s,b.u.id)?.action)||a.x.days-b.x.days||a.index-b.index||a.u.id.localeCompare(b.u.id));
   for(const {x,u} of candidates){let group=selected.find(g=>g.c.id===x.c.id);if(!group){group={...x,units:[]};selected.push(group);}group.units.push(u);power=selected.reduce((n,g)=>n+strategicCapabilities(s,{...cityForce(g.c),units:g.units}).field,0);if(power>required)break;}
   if(!selected.length||power<=required)continue;
   const units=selected.flatMap(x=>x.units),a={...cityForce(staging),units},cap=strategicCapabilities(s,a),assaultDays=strategicTravelDays(s,a,[id]),siegeDays=defense===0?0:Math.max(2,Math.ceil(target.gateHp/Math.max(1,cap.siege)));
   const supplyDays=assaultDays*2+siegeDays+2,grain=units.length*900;
   if(foodUse(units)*supplyDays>grain||selected.some(x=>foodUse(x.units)*(x.days+2)>x.units.length*900))continue;
   const origins=selected.map(x=>({cityId:x.c.id,officerIds:x.units.map(u=>u.id),grain:x.units.length*900}));
   if(cities.reduce((n,c)=>n+Math.max(0,c.grain-2500-plannedGrain(s,c.id)),0)<grain)continue;
   const score=({city:110,gate:80,port:50}[target.kind]||50)+target.commerce*6+(target.grain>6000?15:0)-Math.max(...selected.map(x=>x.days))*5-assaultDays*4-defense/500-siegeDays*3;
   options.push({staging,target,origins,units,grain,score});
  }
 }
 options.sort((a,b)=>b.score-a.score||a.target.id.localeCompare(b.target.id)||a.staging.id.localeCompare(b.staging.id));
 const best=options[0];if(!best){policy.stance='develop';return;}
 const reserves={[best.staging.id]:best.grain};for(const g of best.origins)if(g.cityId!==best.staging.id)reserves[g.cityId]=(reserves[g.cityId]||0)+g.grain;
 const p={id:ai.nextPlanId++,faction,phase:'prepare',target:best.target.id,staging:best.staging.id,officerIds:best.units.map(u=>u.id),origins:best.origins,reserves,createdDay:s.campaign.day,updatedDay:s.campaign.day,deadline:s.campaign.day+style(s,faction).patience,reason:'集中兵力与粮草，完成集结后出征'};
 ai.plans.push(p);policy.stance='attack';record(s,`city-force:${p.staging}`,'stage',p.target,p.reason);
}
function progressPlan(s,p){
 const day=s.campaign.day,target=town(s,p.target),staging=town(s,p.staging);
 if(target.owner===p.faction){if(p.phase!=='consolidate'){p.phase='consolidate';p.updatedDay=day;p.reserves={};p.reason='目标已占领，恢复守备与粮道';}
  if(day-p.updatedDay>=STRATEGIC_AI.consolidationDays&&!besieged(s,target.id)&&target.grain>=Math.max(1000,foodUse(target.units)*3)&&cityDefense(s,target)>=observeStrategicThreat(s,target).power){p.phase='complete';p.updatedDay=day;s.campaign.ai.factions[p.faction].nextOffensiveDay=day+3;}return;
 }
 if(staging.owner!==p.faction||day>p.deadline){cancelPlan(s,p,staging.owner!==p.faction?'集结地失守，撤销作战计划':'筹备或交战超时，收回兵力');return;}
 const actors=p.officerIds.map(id=>{const o=residentOfficer(s,id),a=ownArmy(s,p.faction,id);return o?.faction===p.faction?o:a?{unit:a.units.find(u=>u.id===id),army:a,location:a.location,faction:p.faction}:null;}).filter(Boolean);
 if(actors.length!==p.officerIds.length){cancelPlan(s,p,'人员损失或离队，重新评估战力');return;}
 if(p.phase==='attack'){
  if(!actors.some(o=>o.army&&fighting(s,o.army.id))&&strategicCapabilities(s,{...cityForce(staging),units:actors.map(o=>o.unit)}).field<cityDefense(s,target)*1.05){cancelPlan(s,p,'敌军增援后优势消失，保存部队');return;}
  if(!actors.some(o=>o.army&&(o.army.route.length||o.army.travel||fighting(s,o.army.id))))cancelPlan(s,p,'进攻部队已撤回，结束本次计划');return;
 }
 if(strategicCapabilities(s,{...cityForce(staging),units:actors.map(o=>o.unit)}).field<cityDefense(s,target)*1.05){cancelPlan(s,p,'目标增援后优势消失，暂缓进攻');return;}
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
  const units=c.units.filter(u=>g.officerIds.includes(u.id)&&!u.mission&&!pendingDomesticOrder(s,u.id));if(!units.length)continue;
  if(!findCampaignRoute(s,c.id,p.staging,p.faction)){cancelPlan(s,p,'集结通道失去控制');return;}
  if(c.grain<g.grain)continue;
  if(commandUnits(s,c,units,p.staging,'stage','按势力计划赴前线集结')){dispatched=true;if(!c.units.some(u=>g.officerIds.includes(u.id)))delete p.reserves[c.id];}
 }
 if(dispatched&&p.phase==='prepare'){p.phase='assemble';p.updatedDay=day;}
 const ready=actors.every(o=>!o.army&&!o.unit.mission&&o.location===p.staging&&staging.units.includes(o.unit)&&!pendingDomesticOrder(s,o.unit.id));
 if(!ready||besieged(s,staging.id)){p.reason=besieged(s,staging.id)?'集结地遭围城，先守城':p.officerIds.some(id=>pendingDomesticOrder(s,id))?'等待参战武将完成事务后集结':'各城部队正在集结，等待全部到齐';return;}
 const units=actors.map(o=>o.unit),leave=strategicPower(s,{...cityForce(staging),units:cityForce(staging).units.filter(u=>!p.officerIds.includes(u.id))});
 if(leave<Math.max(0,reserveNeed(s,staging))){cancelPlan(s,p,'集结地守备不足，撤销进攻并释放人员');return;}
 if(staging.grain<plannedGrain(s,staging.id)){p.reason='集结地粮草不足，等待实际运输到达';return;}
 // Evaluate the whole assembled force before interrupting anybody or launching
 // a column, so a protected worker cannot cause a partial assault.
 const timing=expeditionTiming(s,staging.id,units.map(u=>u.id));
 if(timing.error||timing.choice==='after'){p.reason=timing.error||timing.reason;return;}
 if(s.armies.length+Math.ceil(units.length/10)>CAMPAIGN.maxArmies)return;
 for(let i=0;i<units.length;i+=10){const ids=units.slice(i,i+10).map(u=>u.id);if(expeditionError(s,{cityId:staging.id,officerIds:ids,leader:ids[0],advisor:ids[0],deputy:null,target:p.target,policy:'auto'},{scheduled:true,faction:p.faction}))return;}
 let sent=0;for(let i=0;i<units.length;i+=10)if(commandUnits(s,staging,units.slice(i,i+10),p.target,'attack','兵粮集结完成，按共同目标进攻'))sent++;
 if(sent){p.phase='attack';p.updatedDay=day;p.reserves={};p.reason='兵粮集结完成，诸军按共同目标进攻';}
}
export function safeStrategicTransportRoute(s,from,to,faction){
 const path=findCampaignRoute(s,from,to,faction);if(!path)return null;
 return threatenedTransportRoute(s,from,path,faction)?null:path;
}
function logistics(s,faction){
 const ai=s.campaign.ai,cities=s.cities.filter(c=>c.owner===faction&&!besieged(s,c.id));
 const inbound=(id,key)=>s.campaign.idle.filter(o=>o.faction===faction&&o.destination===id).reduce((n,o)=>n+(o.cargo?.[key]||0),0)+s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='transfer'&&q.target===id).reduce((n,q)=>n+(q.cargo?.[key]||0),0);
 const outbound=(id,key)=>s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='transfer'&&q.cityId===id).reduce((n,q)=>n+(q.cargo?.[key]||0),0);
 for(const c of cities){
  const intent=ai.cities[c.id],need={grain:Math.max(0,(intent?.grainNeed||2500)-c.grain-inbound(c.id,'grain')),manpower:Math.max(0,(intent?.manpowerNeed||0)-c.manpower+reservedMen(c)-inbound(c.id,'manpower'))};
  if(need.grain<300&&need.manpower<300)continue;
  const sources=cities.filter(x=>x.id!==c.id).map(x=>({c:x,path:safeStrategicTransportRoute(s,x.id,c.id,faction)})).filter(x=>x.path).sort((a,b)=>a.path.length-b.path.length||a.c.id.localeCompare(b.c.id));
  for(const x of sources){
   const units=cityPersonnel(s,x.c.id).filter(o=>!o.army&&!o.unit.troops&&!o.unit.wounded&&o.unit.id!==x.c.governor&&!busy(s,o.unit.id)).map(o=>o.unit);
   const cargo={grain:Math.floor(Math.max(0,Math.min(need.grain,x.c.grain-Math.max(3500,ai.cities[x.c.id]?.grainNeed||0)-outbound(x.c.id,'grain')))),manpower:Math.floor(Math.max(0,Math.min(need.manpower,x.c.manpower-reservedMen(x.c)-Math.max(2500,ai.cities[x.c.id]?.manpowerNeed||0)-outbound(x.c.id,'manpower'))))};
   if(cargo.grain<300&&cargo.manpower<300)continue;
   const u=rankOfficerCandidates(s,units,{task:'transfer',city:x.c.id,destination:c.id,cargo})[0]?.unit;if(!u)continue;
   const result=requestFactionOrder(s,faction,{kind:'transfer',cityId:x.c.id,officerIds:[u.id],target:c.id,cargo,safeOnly:true},'after');
   if(!result.error){record(s,`city-force:${x.c.id}`,'transport',c.id,`调运${cargo.grain}粮、${cargo.manpower}预备兵支援${c.name}，实际沿路运输`);break;}
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
   for(const o of cityPersonnel(s,from.id).filter(o=>!o.army&&!o.unit.troops&&!o.unit.wounded&&o.unit.id!==from.governor&&!busy(s,o.unit.id))){
    const preview={...s,cities:s.cities.map(x=>({...x,units:x.units.filter(u=>u.id!==o.unit.id)})),campaign:{...s.campaign,idle:[...s.campaign.idle.filter(x=>x.unit.id!==o.unit.id),{unit:o.unit,faction,location:c.id}]}};
    const ranked=directions.flatMap(direction=>rankOfficerCandidates(preview,[o.unit],{task:'domestic',city:c.id,direction}).map(x=>({...x,score:x.recommendation.score*domesticIntentWeight(s,c.id,direction)}))).sort((a,b)=>b.score-a.score);
    const best=ranked[0];if(!best?.recommendation.available)continue;
    const current=assignmentFor(s,o.unit.id),cost=current?rankOfficerCandidates(s,[o.unit],{task:'domestic',city:from.id,direction:current.direction})[0].recommendation.score:0;
    candidates.push({from,u:o.unit,score:best.score-cost*.5-path.length*5});
   }
  }
  candidates.sort((a,b)=>b.score-a.score||a.u.id.localeCompare(b.u.id));const best=candidates[0];if(!best||best.score<=0)continue;
  const result=requestFactionOrder(s,faction,{kind:'transfer',cityId:best.from.id,officerIds:[best.u.id],target:c.id,cargo:{grain:0,manpower:0},safeOnly:true},'after');if(!result.error)record(s,`city-force:${best.from.id}`,'transfer',c.id,`调任${best.u.name}补充当地内政人才`);
 }
}
export function planStrategicAI(s){
 const ai=s.campaign.ai;if(ai.lastPlanDay===s.campaign.day||s.finished)return;ai.lastPlanDay=s.campaign.day;
 consolidateCityArmies(s);emergencyOrders(s);
 for(const faction of Object.keys(ai.factions)){
  const policy=ai.factions[faction];refreshCityIntents(s,faction);
  for(const p of activePlans(s).filter(p=>p.faction===faction))progressPlan(s,p);
  const review=policy.lastReviewTurn!==s.turn;
  if(review){policy.lastReviewTurn=s.turn;policy.reserveGold=Math.max(500,Math.floor(ai.treasuries[faction]*.15));createPlan(s,faction);}
  refreshCityIntents(s,faction);logistics(s,faction);if(review)personnel(s,faction);
  for(const p of activePlans(s).filter(p=>p.faction===faction))progressPlan(s,p);
 }
 for(const [id,v] of Object.entries(ai.cities))if(town(s,id)?.owner!==v.faction)delete ai.cities[id];
 const closed=ai.plans.filter(p=>['complete','cancelled'].includes(p.phase));if(closed.length>20){const remove=new Set(closed.slice(0,closed.length-20).map(p=>p.id));ai.plans=ai.plans.filter(p=>!remove.has(p.id));}
}
export function validateStrategicAI(s){
 const ai=s.campaign.ai,fail=(ok,msg='战略AI存档无效')=>{if(!ok)throw new Error(msg);},int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const factions=nationalScenario(s.campaign.scenarioId).factions.filter(f=>f!==playerFaction(s));
 fail(ai?.version===STRATEGIC_AI.version&&ai.treasuries&&Object.keys(ai.treasuries).length===factions.length&&factions.every(f=>int(ai.treasuries[f])));
 fail(int(ai.lastPlanDay,s.campaign.day)&&int(ai.lastEconomyTurn,s.turn)&&Array.isArray(ai.decisions)&&ai.decisions.length<=80);
 fail(ai.factions&&Object.keys(ai.factions).length===factions.length&&factions.every(f=>{const p=ai.factions[f];return p&&Object.hasOwn(STYLES,p.style)&&int(p.lastReviewTurn,s.turn)&&['develop','attack'].includes(p.stance)&&int(p.nextOffensiveDay)&&int(p.reserveGold);}));
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
 fail(ai.decisions.every(d=>int(d.day,s.campaign.day)&&d.day>0&&typeof d.armyId==='string'&&/^(a\d+|city-force:[a-z0-9-]+)$/.test(d.armyId)&&['attack','reinforce','stage','hold','retreat','recover','transport','transfer'].includes(d.kind)&&(d.target===null||town(s,d.target))&&typeof d.reason==='string'&&d.reason.length<=120&&!/[<>]/.test(d.reason)));
}
