import {cityPersonnel} from './city-personnel.mjs';
import {canTrain,canRefill} from './domestic.mjs';
import {troopTypes} from './troop-equipment.mjs';
import {troopAptitude} from './tactic-learning.mjs';
import {MIN_UNIT_TROOPS,troopAllocationLimit} from './troop-allocation.mjs';
import {trainingCost} from './troop-training.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';

// Both controllers can muster actual residents, including governors and workers.
// Scouts must first be released; travelling and field officers are not residents.
export function siegeDefenseCandidates(s,cityId){
 return cityPersonnel(s,cityId).filter(o=>(!o.army||o.army.defense&&s.campaign.battles.some(r=>r.awaiting&&!r.settled&&r.kind==='siege'&&r.cityId===cityId&&r.battle.tick===0&&r.armyIds.includes(o.army.id)))&&!o.unit.scouting&&!o.unit.mission);
}

// Read-only default for the AI and the player's automatic muster button.
// Each target passes the same treasury, reserve, quota and wounded limits as manual muster.
export function siegeDefensePlan(s,cityId){
 const c=s.cities.find(c=>c.id===cityId),ids=[],types={},troops={};
 if(!c||s.finished)return {officerIds:ids,types,troops,gold:0,men:0};
 const rows=siegeDefenseCandidates(s,cityId),legal=troopTypes().filter(type=>canTrain(c,type));
 const prepared=new Set(rows.filter(o=>o.cityUnit||o.army).map(o=>o.unit.id));
 for(const o of rows)types[o.unit.id]=prepared.has(o.unit.id)?o.unit.type:[...legal].sort((a,b)=>troopAptitude(o.unit,b)-troopAptitude(o.unit,a)||trainingCost(a,1000,c)-trainingCost(b,1000,c)||a.localeCompare(b))[0];
 const candidates=rows.filter(o=>types[o.unit.id]).map(o=>({...o.unit,type:types[o.unit.id]})),selected=[];
 let initialCost=0,men=0;
 for(const {unit:u} of rankOfficerCandidates(s,candidates,{task:'defense',city:cityId,types})){
  if(ids.length>=10||!canRefill(c,u))continue;
  const fresh=!prepared.has(u.id),cost=fresh?trainingCost(u,u.troops,c):0;
  const limit=troopAllocationLimit(s,{...c,gold:c.gold-initialCost-cost},u,troops,selected);
  const target=Math.min(limit,Math.max(u.troops,ECONOMY_RULES.ai.cityTroopTarget));
  if(target<MIN_UNIT_TROOPS||target<=u.troops||cost>c.gold-initialCost)continue;
  ids.push(u.id);selected.push(u);troops[u.id]=target;initialCost+=cost;men+=target-u.troops;
 }
 return {officerIds:ids,types:Object.fromEntries(ids.map(id=>[id,types[id]])),troops,gold:initialCost+selected.reduce((n,u)=>n+trainingCost(u,troops[u.id]-u.troops,c),0),men};
}
