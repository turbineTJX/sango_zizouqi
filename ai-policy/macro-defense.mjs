import {STRATEGIC_SUPPORT_RULES as SUPPORT} from '../data/design/strategic-support-rules.mjs';
import {intelligenceWorld} from '../strategic-vision.mjs';
import {factionsHostile} from '../diplomacy-relations.mjs';
import {cityRoads,isJunction} from '../road-network.mjs';
import {cityForce} from '../city-units.mjs';
import {siegeDefensePlan} from '../siege-defense.mjs';
import {cityGoldCommitment} from '../city-budget.mjs';
import {prepareDepartureUnits,findCampaignRoute} from '../strategic-campaign.mjs';
import {strategicPower,strategicTravelDays,plannedCombatForce,strategicCityBudget} from '../strategic-ai.mjs';
import {gateDurability} from '../building-durability.mjs';
import {activePlans} from '../strategic-intent.mjs';

const battleAt=(s,id)=>s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===id);
const fighting=(s,id)=>s.campaign.battles.some(b=>!b.settled&&b.armyIds.includes(id));
// Public roads and the visible current leg only. Never inspect a hostile target
// or its remaining route, and never forecast a battle or a city's fall date.
export function macroDefenseThreats(s,c,{prospectiveFaction=null}={}){
 const view=intelligenceWorld(s,c.owner),rows=[];
 for(const a of view.armies){
  if(a.disbanded||!a.units.some(u=>u.troops>0)||!factionsHostile(s,a.faction,c.owner)&&a.faction!==prospectiveFaction)continue;
  const battle=view.campaign.battles.find(b=>!b.settled&&b.armyIds.includes(a.id));
  if(battle){if(battle.cityId===c.id)rows.push({army:a,power:strategicPower(view,a),point:null});continue;}
  if(a.travel?.to===c.id){rows.push({army:a,power:strategicPower(view,a),point:isJunction(view,a.travel.from)?a.travel.from:null});continue;}
  const point=a.travel?.to||a.location;if(!isJunction(view,point))continue;
  const path=findCampaignRoute(view,c.id,point,c.owner);
  if(!path?.length||!path.every(id=>isJunction(view,id)))continue;
  if(a.travel&&(a.travel.from===c.id||path.includes(a.travel.from)))continue;
  rows.push({army:a,power:strategicPower(view,a),point});
 }
 return rows;
}
export function musterMacroDefense(s,faction){
 for(const c of s.cities.filter(c=>c.owner===faction&&!battleAt(s,c.id))){
  if(!macroDefenseThreats(s,c).length)continue;
  const reserved=cityGoldCommitment(s,c).total;
  const cash=Math.max(0,c.gold-reserved),proxy={...s,cities:s.cities.map(x=>x===c?{...c,gold:cash}:x)};
  const plan=siegeDefensePlan(proxy,c.id);
  if(!plan.officerIds.length)continue;
  const men=c.units.reduce((n,u)=>n+u.troops+u.wounded/2,0)+plan.men;
  if(c.grain<Math.ceil(men/100*10)+c.budget.grainReserve)continue;
  prepareDepartureUnits(s,c.id,plan.officerIds,plan.types,false,plan.troops,[],{},{scheduled:true,faction});
 }
}
// An outgoing guard may meet a visible threat at a road node. The remaining
// home roster must still cover every other approaching force.
export function interceptedPower(s,c,target){
 return isJunction(s,target)?macroDefenseThreats(s,c).filter(r=>r.point===target).reduce((n,r)=>n+r.power,0):0;
}
function localPower(s,c){
 return strategicPower(s,cityForce(c))+s.armies.filter(a=>a.faction===c.owner&&!a.travel&&a.location===c.id&&!a.disbanded).reduce((n,a)=>n+strategicPower(s,a),0);
}
export function reviewMacroDefense(s,faction,{availableUnits,commandUnits,cancelPlan,record}){
 musterMacroDefense(s,faction);
 const cities=s.cities.filter(c=>c.owner===faction).map(c=>({c,rows:macroDefenseThreats(s,c)})).filter(x=>x.rows.length).sort((a,b)=>b.rows.reduce((n,r)=>n+r.power,0)-a.rows.reduce((n,r)=>n+r.power,0)||a.c.id.localeCompare(b.c.id));
 for(const {c,rows} of cities){
  const enemy=rows.reduce((n,r)=>n+r.power,0),field=localPower(s,c),walls=field>0?gateDurability(c).hp/6:0;
  // Release only troops still in this threatened town. A distant active
  // offensive is not recalled to preserve strength or to supply imaginary aid.
  for(const p of activePlans(s).filter(p=>p.faction===faction&&['prepare','assemble'].includes(p.phase)&&p.officerIds.some(id=>c.units.some(u=>u.id===id))&&p.officerIds.every(id=>s.cities.some(from=>from.owner===faction&&from.units.some(u=>u.id===id)))))cancelPlan(s,p,`${c.name}本旬优先编兵防守`);
  let need=Math.max(0,enemy*1.1-field-walls);
  const incoming=s.armies.filter(a=>a.faction===faction&&a.target===c.id&&a.homeCity!==c.id&&!fighting(s,a.id));
  need-=incoming.reduce((n,a)=>n+strategicPower(s,a),0);
  const queued=s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='expedition'&&q.target===c.id&&q.cityId!==c.id);
  for(const q of queued){const from=s.cities.find(x=>x.id===q.cityId),units=from?.units.filter(u=>q.officerIds.includes(u.id));if(units?.length)need-=strategicPower(s,plannedCombatForce(s,from,units));}
  const neighbors=new Set(cityRoads(s).flatMap(([a,b])=>a===c.id?[b]:b===c.id?[a]:[]));
  const donors=s.cities.filter(from=>from.owner===faction&&from.id!==c.id&&neighbors.has(from.id)&&!battleAt(s,from.id)).map(from=>({from,path:findCampaignRoute(intelligenceWorld(s,faction),from.id,c.id,faction)})).filter(x=>x.path).map(x=>({...x,units:availableUnits(s,x.from).slice(0,10)})).filter(x=>x.units.length).map(x=>({...x,days:strategicTravelDays(s,plannedCombatForce(s,x.from,x.units),x.path)})).sort((a,b)=>a.days-b.days||a.from.id.localeCompare(b.from.id));
  for(const {from,units:options,days} of donors){
   if(need<=0)break;if(!Number.isFinite(days))continue;
   const units=[];for(const u of options){units.push(u);if(strategicPower(s,plannedCombatForce(s,from,units))>=need)break;}
   if(!units.length)continue;
   const budget=strategicCityBudget(s,from),food=Math.ceil(units.reduce((n,u)=>n+u.troops/100+u.wounded/200,0)*(days+4));
   if(from.grain<food+budget.grainNeed)continue;
   const power=strategicPower(s,plannedCombatForce(s,from,units));
   if(commandUnits(s,from,units,c.id,'reinforce','本旬按守备实力缺口调动邻城增援')){
    need-=power;
    const ai=s.campaign.ai,ids=units.map(u=>u.id),mission=ai.supports.find(q=>q.faction===faction&&q.kind==='city-relief'&&q.target===c.id);
    const deadline=s.campaign.day+Math.max(SUPPORT.missionDays,days+10);
    if(mission){mission.officerIds=[...new Set([...mission.officerIds,...ids])];mission.lastNeededDay=s.campaign.day;mission.deadline=Math.max(mission.deadline,deadline);}
    else ai.supports.push({id:ai.nextSupportId++,faction,kind:'city-relief',target:c.id,battleId:null,officerIds:ids,createdDay:s.campaign.day,lastNeededDay:s.campaign.day,deadline});
   }
  }
  const point=rows[0].point;
  if(!battleAt(s,c.id)&&point&&rows.every(r=>r.point===point)&&field>=enemy*1.15){
   const units=availableUnits(s,c,{defenseTarget:point}).slice(0,10);
   const mission=s.campaign.ai.supports.find(q=>q.faction===faction&&q.kind==='guard'&&q.target===point);
   if((mission||s.campaign.ai.supports.filter(q=>q.faction===faction&&q.kind!=='city-relief').length<SUPPORT.maxMissions)&&units.length&&strategicPower(s,plannedCombatForce(s,c,units))>=enemy*1.15&&commandUnits(s,c,units,point,'guard','本旬本城实力足以迎击，出击道路上的可见敌军')){
    const ids=units.map(u=>u.id),army=s.armies.find(a=>a.faction===faction&&a.units.some(u=>ids.includes(u.id)));if(army)army.task='出击';
    if(mission)mission.officerIds.push(...ids);else s.campaign.ai.supports.push({id:s.campaign.ai.nextSupportId++,faction,kind:'guard',target:point,battleId:null,officerIds:ids,createdDay:s.campaign.day,lastNeededDay:s.campaign.day,deadline:s.campaign.day+SUPPORT.missionDays});
    continue;
   }
  }
  record(s,`city-force:${c.id}`,'hold',c.id,need>0?'本旬守城，周边可用援军仍未补足实力差距':'本旬依城防守，按实力差距安排增援');
 }
}
