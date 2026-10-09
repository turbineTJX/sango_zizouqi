import {intelligenceWorld} from './strategic-vision.mjs';
import {isAIControlled} from './player-faction.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {activePlans} from './strategic-intent.mjs';
import {marchModes,armyStrategicTrait} from './strategic-traits.mjs';
import {roadCost,roadDistance,movementPoints,marchItinerary} from './strategic-movement.mjs';
import {canEditArmy,armyBattle,setArmyMarchMode,CAMPAIGN} from './strategic-campaign.mjs';
import {newMilitaryFlow,applyMilitaryFlow} from './army-management.mjs';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
// Measure lawful observations and our own orders. Policies receive only detached
// measurements, never the simulation, an opposing perspective or random state.
export function armyManagementFacts(s,faction){
 const view=intelligenceWorld(s,faction),protectedIds=new Set([
  ...activePlans(s).filter(p=>p.faction===faction).flatMap(p=>p.officerIds),
  ...(s.campaign.ai?.supports||[]).filter(p=>p.faction===faction&&!['complete','cancelled'].includes(p.phase)).flatMap(p=>p.officerIds||[])
 ]);
 const armies=view.armies.filter(a=>a.faction===faction&&!a.disbanded).map(a=>{
  const units=a.units.filter(u=>u.troops>0),free=!a.diplomaticWithdrawal&&!a.diplomaticTask&&!a.units.some(u=>protectedIds.has(u.id));
  const roles=Object.fromEntries(['leader','advisor'].map(role=>[role,rankOfficerCandidates(view,units,{task:'role',role,city:a.location})[0]?.unit.id||null]));
  const mode=a.marchMode||'normal',from=a.travel?.to||a.location,path=a.travel?a.route.slice(a.route[0]===from?1:0):a.route;
  const remaining=a.travel?roadCost(view,a.travel.from,a.travel.to,a.travel.road||'main')*(1-a.travel.progress/Math.max(1,roadDistance(view,a.travel.from,a.travel.to))):0;
  const journeyDays=speed=>(path.length?marchItinerary(view,from,path,speed,a.roadPolicy||'auto').days:0)+Math.ceil(Math.max(0,remaining)/Math.max(1,speed));
  const days=journeyDays(movementPoints({...a,marchMode:'normal'}));
  const forced=armyStrategicTrait(a,'forcedMarch')?.strategic,food=Math.ceil(a.units.reduce((n,u)=>n+u.troops/100+u.wounded/200,0));
  // The minimum eligible morale gives a conservative speed for the entire trip.
  // Require completion before the real daily morale cost ends forced marching.
  const forcedDays=forced?journeyDays(movementPoints({...a,marchMode:'forced',morale:forced.minimum})):days;
  const forcedAvailableDays=forced?Math.max(0,Math.floor((a.morale-forced.minimum)/forced.morale)+1):0;
  const home=view.cities.find(c=>c.id===a.location&&c.owner===faction),safe=path.every(id=>view.cities.find(c=>c.id===id)?.owner===faction||view.junctions.some(n=>n.id===id))&&!view.armies.some(e=>e.faction!==faction&&path.includes(e.location));
  return {id:a.id,location:a.location,unitIds:a.units.map(u=>u.id),liveIds:units.map(u=>u.id),roles,currentRoles:{leader:a.leader,advisor:a.advisor},
   editable:free&&canEditArmy(view,a,{scheduled:true}),mode,modes:marchModes(a).map(m=>m.id),moving:!!a.travel||a.route.length>0,
   modeEditable:!armyBattle(view,a.id)&&!a.diplomaticWithdrawal,home:!!home&&!a.travel,safe,
   days,forcedDays,forcedAvailableDays,food,supply:a.supply,capacity:a.fullSupplyCapacity||a.supplyCapacity,hunger:a.hunger,morale:a.morale,
   forcedMinimum:forced?.minimum||40,restUntil:a.marchRestUntil||0,lightCapacity:armyStrategicTrait(a,'lightMarch')?.strategic.capacity||.5};
 });
 return freeze(structuredClone({faction,day:s.campaign.day,maxUnits:CAMPAIGN.maxUnits,armies}));
}

export function chooseArmyManagement(facts){
 const available=facts.armies.filter(a=>a.editable&&a.mode==='normal').sort((a,b)=>a.id.localeCompare(b.id));
 for(const a of available){
  if(a.liveIds.length>facts.maxUnits)return {kind:'split',armyId:a.id,selected:a.liveIds.slice(facts.maxUnits,facts.maxUnits*2)};
  // Combine idle remnants only. Active plans, support commitments and diplomacy
  // retain their exact units; neither bonds nor unobserved enemies choose groups.
  const other=a.liveIds.length<=2&&available.find(b=>b.id!==a.id&&b.location===a.location&&b.unitIds.length+a.unitIds.length<=facts.maxUnits);
  if(other)return {kind:'merge',armyId:other.id,target:a.id};
  if(a.roles.leader&&a.roles.advisor&&(a.roles.leader!==a.currentRoles.leader||a.roles.advisor!==a.currentRoles.advisor))return {kind:'adjust',armyId:a.id,roles:a.roles};
 }
 return null;
}
export function chooseArmyMarchMode(facts,a){
 if(!a.modeEditable)return a.mode;
 // Baggage can only be exchanged at a friendly city. Restore it there when
 // the trip ends or its new route no longer meets the light-march condition.
 if(a.mode==='light')return a.home&&(!a.moving||!a.safe||!a.modes.includes('light')||a.food*(a.days+2)>Math.min(a.supply,a.capacity*a.lightCapacity))?'normal':'light';
 if(!a.moving||a.hunger||a.morale<a.forcedMinimum)return a.mode==='forced'?'normal':a.mode;
 // Light baggage is useful on a known friendly journey only when its real
 // reduced capacity still covers the trip and two days of food.
 if(a.mode==='normal'&&a.home&&a.safe&&a.modes.includes('light')&&a.food*(a.days+2)<=Math.min(a.supply,a.capacity*a.lightCapacity))return 'light';
 if(a.mode==='normal'&&a.modes.includes('forced')&&a.restUntil<=facts.day&&a.supply<a.food*(a.days+2)&&a.forcedDays<a.days&&a.forcedDays<=a.forcedAvailableDays&&a.supply>=a.food*(a.forcedDays+2))return 'forced';
 return a.mode;
}
export function manageArmyManagementAI(s){
 if(s.finished||!s.campaign.ai)return;
 for(const faction of Object.keys(s.campaign.ai.factions).filter(f=>isAIControlled(s,f))){
  let facts=armyManagementFacts(s,faction),choice=chooseArmyManagement(facts);
  if(choice){
   const p=newMilitaryFlow(s,choice.armyId,choice.kind);Object.assign(p,choice);
   if(choice.kind==='split'){const selected=facts.armies.find(a=>a.id===choice.armyId);p.roles={leader:choice.selected.includes(selected.roles.leader)?selected.roles.leader:choice.selected[0],advisor:choice.selected.includes(selected.roles.advisor)?selected.roles.advisor:choice.selected[0],};}
   else if(choice.kind==='adjust')p.roles={...p.roles,...choice.roles};
   applyMilitaryFlow(s,p,{faction,scheduled:true});
   facts=armyManagementFacts(s,faction);
  }
  for(const a of facts.armies){const mode=chooseArmyMarchMode(facts,a);if(mode!==a.mode)setArmyMarchMode(s,a.id,mode,{faction,scheduled:true});}
 }
}
