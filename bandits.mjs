import {BANDIT_RULES as R} from './data/design/bandits.mjs';
import {banditCamps,banditCamp,banditRandom,knownBanditCamps} from './bandit-state.mjs';
import {mapNode} from './map-node-data.mjs';
import {cityForce} from './city-units.mjs';
import {armySupplyCapacity,foodConsumption} from './army-supply.mjs';
import {launchExpedition,findCampaignRoute} from './strategic-campaign.mjs';
import {strategicDepartureError,strategicCityBudget} from './strategic-ai.mjs';
import {marchItinerary} from './strategic-movement.mjs';
import {plannedOfficer} from './strategic-intent.mjs';
import {cityPersonnel} from './city-personnel.mjs';
import {cityReserve} from './talent-core.mjs';
import {assessCombatForce} from './strategic-combat-assessment.mjs';
import {intelligenceWorld} from './strategic-vision.mjs';
import {grainCapacity} from './domestic.mjs';
import {addCityGold} from './city-resources.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {welcomeBanditTalent} from './talent-lifecycle.mjs';

export function banditDefender(s,nodeId){
 const camp=banditCamps(s).find(c=>c.nodeId===nodeId&&c.clearedDay===null&&!c.battleId);
 if(!camp||!camp.units.some(u=>u.troops>0))return null;
 const units=structuredClone(camp.units),a={id:`a${s.nextId++}`,name:camp.name,faction:'neutral',location:nodeId,homeCity:nodeId,route:[],target:null,travel:null,task:'守寨',morale:70,tactic:'defensive',leader:units[0].id,advisor:[...units].sort((a,b)=>b.intellect-a.intellect)[0].id,units,supply:camp.grain,supplyCapacity:Math.max(camp.grain,armySupplyCapacity(units)),hunger:0,supplyIn:0,supplyLine:null,cooldownDay:0,stationary:true,detached:false,banditCampId:camp.id};
 s.armies.push(a);return a;
}
export function settleBanditBattle(s,r){
 const camp=banditCamp(s,r.banditCampId);if(!camp||!r.settled||!r.battle.result||camp.clearedDay!==null||r.report.banditResolved)return;
 r.report.banditResolved=true;
 const defender=s.armies.find(a=>a.banditCampId===camp.id),won=r.battle.result.winner===r.attackSide;
 camp.battleId=null;
 if(!won&&defender?.units.some(u=>u.troops>0)){
  camp.units=structuredClone(defender.units.filter(u=>u.troops>0));camp.grain=defender.supply;s.armies=s.armies.filter(a=>a!==defender);return;
 }
 camp.clearedDay=s.campaign.day;camp.winner=won?r.battle.sides[r.attackSide].faction:null;
 const survivors=s.armies.filter(a=>r.armyIds.includes(a.id)&&!a.banditCampId&&a.faction===camp.winner&&!a.disbanded).flatMap(a=>a.units.filter(u=>u.troops>0).map(u=>({a,u}))),carrier=survivors.sort((a,b)=>b.u.troops-a.u.troops||a.u.id.localeCompare(b.u.id))[0];
 const beforeGold=camp.gold,beforeGrain=defender?.supply??camp.grain;
 const receipt={battleId:r.id,beforeGold,beforeGrain,gold:carrier?beforeGold:0,grain:carrier?beforeGrain:0,lostGold:carrier?0:beforeGold,lostGrain:carrier?0:beforeGrain,talentId:null};
 if(carrier){
  carrier.u.spoilsGold=(carrier.u.spoilsGold||0)+receipt.gold;carrier.u.spoilsGrain=(carrier.u.spoilsGrain||0)+receipt.grain;
  const homes=s.cities.filter(c=>c.owner===camp.winner).map(c=>({c,route:findCampaignRoute(s,camp.nodeId,c.id,camp.winner)})).filter(x=>x.route).sort((a,b)=>a.route.length-b.route.length||a.c.id.localeCompare(b.c.id));
  const home=homes.find(x=>x.c.id===carrier.a.homeCity)||homes[0];
  if(home){
   if(camp.talentRoll<R.talentChance){const nearby=s.cities.filter(c=>s.roads.some(([a,b])=>a===camp.nodeId&&b===c.id||b===camp.nodeId&&a===c.id));const free=s.campaign.domestic.people.filter(p=>p.status==='FREE'&&!p.travel&&nearby.some(c=>c.id===p.cityId));const chosen=free[Math.floor(banditRandom(s)*free.length)];if(chosen&&welcomeBanditTalent(s,chosen.id,camp.winner,home.c.id,camp.name))receipt.talentId=chosen.id;}
   for(const a of new Set(survivors.map(x=>x.a))){const route=findCampaignRoute(s,a.location,home.c.id,a.faction);if(route){a.route=route;a.target=route.length?home.c.id:null;a.task='携获返城';}}
  }
  appendActivityNode(s,{sourceId:'bandit-loot:'+r.id,category:'battle',phase:'bandit-loot',faction:camp.winner,officerId:carrier.u.id,cityId:camp.nodeId,text:`攻破${camp.name}，缴获${receipt.gold}金、${receipt.grain}粮，随军带回城内。`,result:{banditLoot:receipt}});
 }
 camp.receipt=receipt;camp.gold=0;camp.grain=0;camp.units=[];r.report.banditLoot=structuredClone(receipt);s.armies=s.armies.filter(a=>a!==defender);
}
export function deliverBanditLoot(s){
 for(const c of s.cities){
  const units=[...c.units,...s.campaign.idle.filter(o=>o.faction===c.owner&&o.location===c.id&&!o.destination&&!o.retreating).map(o=>o.unit)];
  for(const u of units){const gold=u.spoilsGold||0,grain=Math.min(u.spoilsGrain||0,Math.max(0,grainCapacity(c)-c.grain));if(!gold&&!grain)continue;
   addCityGold(s,c,gold);c.grain+=grain;u.spoilsGold=0;u.spoilsGrain=(u.spoilsGrain||0)-grain;
   appendActivityNode(s,{sourceId:`bandit-delivery:${u.id}:${s.campaign.day}:${s.campaign.activity.nextSequence}`,category:'battle',phase:'bandit-delivery',faction:c.owner,officerId:u.id,cityId:c.id,text:`${u.name}带回讨贼战利品，${c.name}入库${gold}金、${grain}粮。`,result:{gold,grain}});
  }
 }
}
// The AI reads dated camp observations and its own real people/budget only.
// It proposes the same expedition command used by the player; no gifts or
// special battle outcome, and never reallocates an existing offensive plan.
export function planBanditExpedition(s,faction){
 const view=intelligenceWorld(s,faction),known=knownBanditCamps(view,faction).filter(c=>c.clearedDay===null);
 if(!known.length||s.armies.some(a=>a.faction===faction&&a.banditTarget))return null;
 const d=s.campaign.domestic,candidates=[];
 for(const c of s.cities.filter(c=>c.owner===faction)){
  if(s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===c.id)||c.gold<cityReserve(s,c))continue;
  const budget=strategicCityBudget(s,c);if(c.gold<budget.goldNeed)continue;
  const local=cityPersonnel(s,c.id),free=c.units.filter(u=>u.troops>0&&!u.mission&&!u.scouting&&c.governor!==u.id&&!plannedOfficer(s,u.id)&&!d.assignments.some(a=>a.officerId===u.id&&(a.action||['agriculture','commerce'].includes(a.direction)))&&!d.orders.some(q=>q.officerIds.includes(u.id))&&!s.campaign.diplomacy.assignments.some(a=>a.officerId===u.id)).sort((a,b)=>b.troops-a.troops||a.id.localeCompare(b.id));
  if(free.length<=R.aiReserveUnits||local.length<3)continue;
  for(const camp of known){
   const route=findCampaignRoute(view,c.id,camp.nodeId,faction);if(!route)continue;
   for(let count=1;count<=Math.min(R.aiMaximumUnits,free.length-R.aiReserveUnits);count++){
    const units=free.slice(0,count),a={...cityForce({...c,units}),units,leader:units[0].id,advisor:[...units].sort((a,b)=>b.intellect-a.intellect)[0].id},trip=marchItinerary(view,c.id,route,a,'auto'),defender={units:camp.units,leader:camp.units[0]?.id,advisor:camp.units[0]?.id,morale:70};
    if(!Number.isFinite(trip.days)||trip.days>R.aiMaximumDays||c.grain<armySupplyCapacity(units)+budget.grainNeed||armySupplyCapacity(units)<foodConsumption(units.reduce((n,u)=>n+u.troops,0),units.reduce((n,u)=>n+u.wounded,0))*(trip.days*2+10))continue;
    const attack=assessCombatForce(a,{opponents:camp.units}),defense=assessCombatForce(defender,{opponents:units});if(attack.power<defense.power*R.aiAdvantage)continue;
    candidates.push({camp,days:trip.days,q:{cityId:c.id,officerIds:units.map(u=>u.id),leader:a.leader,advisor:a.advisor,target:camp.nodeId,policy:'auto',route}});break;
   }
  }
 }
 candidates.sort((a,b)=>a.days-b.days||a.camp.id.localeCompare(b.camp.id));
 for(const p of candidates){if(strategicDepartureError(s,{...p.q,faction}))continue;const error=launchExpedition(s,p.q,{scheduled:true,faction});if(!error){const a=s.armies.at(-1);a.banditTarget=p.camp.id;return {armyId:a.id,campId:p.camp.id};}}
 return null;
}
