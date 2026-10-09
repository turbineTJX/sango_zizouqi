import {STRATEGIC_SUPPORT_RULES as R} from './data/design/strategic-support-rules.mjs';
import {intelligenceWorld} from './strategic-vision.mjs';
import {isJunction} from './road-network.mjs';
import {findCampaignRoute,supplyConnection,campaignBattleSide} from './strategic-campaign.mjs';
import {strategicPower,strategicTravelDays,strategicCityBudget,strategicArrivalDays} from './strategic-ai.mjs';
import {cityForce} from './city-units.mjs';
import {factionsHostile} from './diplomacy-relations.mjs';
import {activePlans} from './strategic-intent.mjs';
import {removeDomesticOrder} from './domestic.mjs';
import {chosenRoad,roadCost} from './strategic-movement.mjs';
import {canEquip,equipmentTypes,equipmentCost} from './troop-equipment.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {CAMPAIGN_TIME} from './combat-rules.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';

const food=units=>units.reduce((n,u)=>n+u.troops/100+u.wounded/200,0);
const inBattle=(s,a)=>s.campaign.battles.some(r=>!r.settled&&r.armyIds.includes(a.id));
const key=q=>q.kind+':'+(q.battleId||q.target);
function supportUnits(s,c,path,view,availableUnits){
 const units=availableUnits(s,c).filter(u=>!u.mission&&!u.scouting&&u.wounded/Math.max(1,u.troops+u.wounded)<=ECONOMY_RULES.ai.offensive.maxWoundedShare).slice(0,10);
 if(!path.some((id,i)=>chosenRoad(view,i?path[i-1]:c.id,id)?.terrain==='water'))return units;
 const ship=equipmentTypes('ship').filter(id=>canEquip(c,id)).sort((a,b)=>TROOP_DESIGNS[a].goldPerThousand-TROOP_DESIGNS[b].goldPerThousand||a.localeCompare(b))[0];
 return units.filter(u=>u.equipment.ship||ship).map(u=>u.equipment.ship?u:{...u,equipment:{...u.equipment,ship}});
}
// Only observed enemies threaten a corridor. Foreign orders and future routes
// are never inputs, including when restoring a recently blocked supply line.
export function strategicSupportObjectives(s,faction){
 const view=intelligenceWorld(s,faction),objectives=new Map(),add=q=>{const old=objectives.get(key(q));if(!old||q.power>old.power)objectives.set(key(q),q);};
 for(const r of view.campaign.battles.filter(r=>!r.settled)){
  const a=s.armies.find(a=>a.faction===faction&&r.armyIds.includes(a.id));if(!a)continue;
  const side=campaignBattleSide(s,r,a),own=r.battle.sides[side];if(side<0||own.retreat)continue;
  const power=i=>r.battle.sides[i].units.filter(u=>u.hp>0&&['active','reserve'].includes(u.status)&&(u.arrivalTick||0)<=r.battle.tick&&u.arrivalConfirmed!==false).reduce((n,u)=>n+u.hp*(.7+u.leadership/200+u.force/500+u.intellect/800),0);
  const need=Math.max(0,power(1-side)*R.reinforceRatio-power(side));if(!need)continue;
  const remaining=Math.ceil((r.battle.maxTicks-r.battle.tick)/CAMPAIGN_TIME.stepsPerDay);if(remaining<=0)continue;
  add({kind:'reinforce',target:a.travel?.to||a.location,battleId:r.id,power:need,days:Math.min(R.maxTravelDays,remaining),priority:200,reason:'己方战场兵力不足，沿实际道路增援'});
 }
 const enemies=view.armies.filter(a=>!a.disbanded&&factionsHostile(s,a.faction,faction)&&a.units.some(u=>u.troops>0));
 if(!enemies.length)return [...objectives.values()].sort((a,b)=>b.priority-a.priority||b.power-a.power||key(a).localeCompare(key(b)));
 const corridors=[];
 // Remove only already observed hostile occupants to identify the corridor
 // whose connection needs protecting; city ownership and range remain known.
 const open={...view,armies:view.armies.filter(a=>!factionsHostile(s,a.faction,faction))};
 for(const a of view.armies.filter(a=>a.faction===faction&&!a.disbanded&&!(s.campaign.ai.supports||[]).some(q=>q.kind==='guard'&&q.officerIds.some(id=>a.units.some(u=>u.id===id))))){
  const link=supplyConnection(view,a)||supplyConnection(open,a);if(!link)continue;
  corridors.push(a.travel?[...link.path,a.travel.to]:link.path);
 }
 for(const o of s.campaign.idle.filter(o=>o.faction===faction&&o.destination&&o.journey&&(o.cargo?.gold||o.cargo?.grain||o.cargo?.manpower)))corridors.push([o.location,...o.journey.route]);
 for(const q of s.campaign.domestic.orders.filter(q=>q.faction===faction&&q.kind==='transfer'&&(q.cargo.gold||q.cargo.grain||q.cargo.manpower))){const path=q.route||findCampaignRoute(view,q.cityId,q.target,faction);if(path)corridors.push([q.cityId,...path]);}
 // A blocked road must be protected even before a safe truck can be dispatched.
 const cities=s.cities.filter(c=>c.owner===faction),budgets=new Map();
 for(const c of cities){const need=s.campaign.ai.cities[c.id];if(!need||c.grain>=need.grainNeed&&c.gold>=500&&c.manpower>=need.manpowerNeed)continue;
  const sources=cities.filter(x=>x.id!==c.id).map(x=>({c:x,path:findCampaignRoute(view,x.id,c.id,faction)})).filter(x=>x.path).sort((a,b)=>a.path.reduce((n,id,i)=>n+roadCost(view,i?a.path[i-1]:a.c.id,id),0)-b.path.reduce((n,id,i)=>n+roadCost(view,i?b.path[i-1]:b.c.id,id),0)||a.c.id.localeCompare(b.c.id));
  for(const x of sources){if(!budgets.has(x.c.id))budgets.set(x.c.id,strategicCityBudget(s,x.c));const b=budgets.get(x.c.id);if(x.c.grain-b.grainNeed>=R.minimumCargo.grain||x.c.gold-b.goldNeed>=1100||x.c.manpower>5500){corridors.push([x.c.id,...x.path]);break;}}
 }
 for(const path of corridors)for(let i=0;i<path.length;i++){
  const target=path[i];if(!isJunction(view,target))continue;
  const adjacent=[path[i-1],path[i+1]].filter(Boolean),foes=enemies.filter(a=>!a.travel&&a.location===target||a.travel&&(a.travel.to===target||[target,...adjacent].includes(a.travel.from)&&[target,...adjacent].includes(a.travel.to)));
  if(!foes.length)continue;
  const stationed=view.armies.filter(a=>a.faction===faction&&!a.travel&&a.location===target&&!inBattle(view,a)).reduce((n,a)=>n+strategicPower(view,a),0);
  const need=Math.max(0,foes.reduce((n,a)=>n+strategicPower(view,a),0)*R.guardRatio-stationed);
  add({kind:'guard',target,battleId:null,power:need,days:R.maxTravelDays,priority:100,reason:'可见敌军威胁实际粮路或运输通道，派兵护路'});
 }
 return [...objectives.values()].sort((a,b)=>b.priority-a.priority||b.power-a.power||key(a).localeCompare(key(b)));
}

export function planStrategicSupport(s,faction,{availableUnits,commandUnits,retreatArmy,cancelPlan},released=false){
 const ai=s.campaign.ai,day=s.campaign.day,objectives=strategicSupportObjectives(s,faction),byKey=new Map(objectives.map(q=>[key(q),q]));
 for(const q of [...ai.supports].filter(q=>q.faction===faction)){
  const armies=s.armies.filter(a=>a.faction===faction&&a.units.some(u=>q.officerIds.includes(u.id))),waiting=s.campaign.domestic.orders.filter(o=>o.kind==='expedition'&&o.faction===faction&&o.officerIds.some(id=>q.officerIds.includes(id)));
  const present=new Set([...armies.flatMap(a=>a.units.map(u=>u.id)),...waiting.flatMap(o=>o.officerIds)]);q.officerIds=q.officerIds.filter(id=>present.has(id));
  if(byKey.has(key(q)))q.lastNeededDay=day;
  const ended=q.kind==='reinforce'&&!s.campaign.battles.some(r=>r.id===q.battleId&&!r.settled),quiet=q.kind==='guard'&&day-q.lastNeededDay>=R.quietDays;
  if((!armies.length&&!waiting.length)||armies.length&&armies.every(a=>a.task==='回城补给'&&!inBattle(s,a))||ended||quiet||day>q.deadline){
   for(const o of waiting)removeDomesticOrder(s,o.id,'原增援或护路任务已结束');
   ai.supports=ai.supports.filter(x=>x!==q);
   for(const a of armies.filter(a=>!inBattle(s,a)))retreatArmy(s,a,'增援或护路任务结束，沿真实道路回城');
  }
 }
 for(const q of objectives){
  const existing=ai.supports.find(x=>x.faction===faction&&key(x)===key(q));
  if(!existing&&ai.supports.filter(x=>x.faction===faction).length>=R.maxMissions)continue;
  let need=q.power;const groups=[],view=intelligenceWorld(s,faction);
  const incoming=s.armies.filter(a=>a.faction===faction&&a.target===q.target&&!inBattle(s,a)&&(a.travel||a.location!==q.target));for(const a of incoming)if(strategicArrivalDays(view,a,q.target)<=q.days)need-=strategicPower(s,a);
  for(const o of s.campaign.domestic.orders.filter(o=>o.faction===faction&&o.kind==='expedition'&&o.target===q.target)){
   const c=s.cities.find(c=>c.id===o.cityId),units=o.officerIds.map(id=>c?.units.find(u=>u.id===id));if(units.some(u=>!u))continue;
   const path=o.route||findCampaignRoute(view,c.id,q.target,faction);if(!path)continue;
   const wait=Math.max(0,...o.officerIds.map(id=>s.campaign.domestic.assignments.find(a=>a.officerId===id)?.action?.remaining||0));
   if(wait+strategicTravelDays(s,{...cityForce(c),units,leader:o.leader},path)<=q.days)need-=strategicPower(s,{...cityForce(c),units});
  }
  if(need<=0)continue;
  const sources=s.cities.filter(c=>c.owner===faction&&c.id!==q.target&&!s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===c.id)).map(c=>({c,path:findCampaignRoute(view,c.id,q.target,faction)})).filter(x=>x.path).map(x=>({...x,units:supportUnits(s,x.c,x.path,view,availableUnits)})).filter(x=>x.units.length).map(x=>({...x,days:strategicTravelDays(s,{...cityForce(x.c),units:x.units},x.path)})).sort((a,b)=>a.days-b.days||a.c.id.localeCompare(b.c.id));
  for(const x of sources){
   if(x.days>q.days||x.path.some((id,i)=>chosenRoad(view,i?x.path[i-1]:x.c.id,id)?.terrain==='water')&&x.units.some(u=>!u.equipment.ship))continue;
   const units=[];for(const u of x.units){units.push(u);need-=strategicPower(s,{...cityForce(x.c),units:[u]});if(need<=0)break;}
   const budget=strategicCityBudget(s,x.c),equipmentGold=units.reduce((n,u)=>n+equipmentCost(u.equipment,x.c.units.find(o=>o.id===u.id).equipment,u.troops+u.wounded,x.c),0);
   if(x.c.gold-equipmentGold<budget.goldNeed||x.c.grain<units.length*900+budget.grainNeed||food(units)*(x.days*2+R.guardFoodDays)>units.length*900){need+=strategicPower(s,{...cityForce(x.c),units});continue;}
   groups.push({...x,units});if(need<=0)break;
  }
  if(need>0){const optional=activePlans(s).find(p=>p.faction===faction&&['prepare','assemble'].includes(p.phase));if(optional&&cancelPlan&&!released){cancelPlan(s,optional,'增援或粮路告急，释放尚未出发的可选进攻承诺');return planStrategicSupport(s,faction,{availableUnits,commandUnits,retreatArmy,cancelPlan},true);}continue;}
  const ids=[];for(const x of groups)if(commandUnits(s,x.c,x.units,q.target,q.kind,q.reason,{arrivalDeadline:day+q.days}))ids.push(...x.units.map(u=>u.id));
  if(ids.length){if(existing)existing.officerIds.push(...ids);else ai.supports.push({id:ai.nextSupportId++,faction,kind:q.kind,target:q.target,battleId:q.battleId,officerIds:ids,createdDay:day,lastNeededDay:day,deadline:day+R.missionDays});}
 }
}
