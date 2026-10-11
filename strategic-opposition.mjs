import {cityForce} from './city-units.mjs';
import {cityIntelligence,intelligenceWorld} from './strategic-vision.mjs';
import {gateDurability} from './building-durability.mjs';
import {trainingRate} from './troop-training.mjs';
import {canTrain,recruitmentLimit} from './domestic.mjs';
import {troopTypes} from './troop-equipment.mjs';
import {factionsHostile} from './diplomacy-relations.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {STRATEGIC_PLANNING_RULES as PLANNING} from './data/design/strategic-planning-rules.mjs';
import {MIN_UNIT_TROOPS} from './troop-allocation.mjs';

// A bounded prior for unobserved resident officers, not an inspection of their
// actual whereabouts, jobs or later orders. Only dated city observations enter.
export function estimatedEmergencyDefense(c){
 if(c.owner==='neutral'||!Number.isFinite(c.gold)||!Number.isFinite(c.manpower))return {men:0,power:0};
 const rates=troopTypes().filter(type=>canTrain(c,type)).map(type=>trainingRate(type,c)).filter(rate=>rate>0);
 if(!rates.length)return {men:0,power:0};
 const quota=Math.max(0,recruitmentLimit(c)-(c.drafted||0)-(c.domestic?.reserved||0));
 const men=Math.floor(Math.min(ECONOMY_RULES.ai.cityTroopTarget,quota,Math.max(0,c.manpower-(c.domestic?.reserved||0)),Math.max(0,c.gold)/Math.min(...rates)));
 return men<MIN_UNIT_TROOPS?{men:0,power:0}:{men,power:men*PLANNING.opposition.emergencyPowerPerMan};
}

export function observedCityDefense(view,c,power,{emergency=true}={}){
 if(c.gold===null)return {field:MOVEMENT_RULES.vision.unknownDefense,emergencyMen:0,emergencyPower:0,walls:0,total:MOVEMENT_RULES.vision.unknownDefense};
 const local=power(view,cityForce(c))+view.armies.filter(a=>a.faction===c.owner&&!a.travel&&a.location===c.id&&!a.disbanded).reduce((n,a)=>n+power(view,a),0)+(c.garrison||0);
 const muster=emergency?estimatedEmergencyDefense(c):{men:0,power:0};
 const walls=local+muster.power>0?gateDurability(c).hp/6:0;
 return {field:local,emergencyMen:muster.men,emergencyPower:muster.power,walls,total:local+muster.power+walls};
}

// A city can be relieved during the approach AND the ensuing battle. Observed
// approaching armies count in full; possible departures retain home defenders.
export function assessStrategicOpposition(s,{faction,target,approachDays,siegeDays,power,arrivalDays}){
 const view=intelligenceWorld(s,faction),c=view.cities.find(c=>c.id===target.id),rules=PLANNING.opposition;
 const local=observedCityDefense(view,c,power),window=approachDays+Math.min(rules.maxBattleDays,Math.max(rules.minimumBattleDays,siegeDays));
 const rows=[],contenders={};
 for(const a of [...view.armies.filter(a=>!a.disbanded),...view.cities.filter(c=>c.id!==target.id&&c.units.some(u=>u.troops>0)).map(cityForce)]){
  if(a.faction===faction||a.faction==='neutral'||!a.units.some(u=>u.troops>0))continue;
  if(!a.travel&&a.location===target.id)continue;
  if(view.campaign.battles.some(b=>!b.settled&&b.armyIds.includes(a.id)))continue;
  const defender=a.faction===c.owner,contesting=c.owner==='neutral'&&factionsHostile(s,a.faction,faction);
  if(!defender&&!contesting)continue;
  const eta=arrivalDays(view,a,target.id)+(a.cityForce?rules.cityResponseDays:0);
  const deadline=contesting?approachDays+rules.neutralContestDays:window;
  if(!Number.isFinite(eta)||eta>deadline)continue;
  const incoming=!!a.travel&&a.travel.to===target.id;
  const share=incoming?1:a.cityForce?rules.citySupportShare:rules.fieldSupportShare;
  const strength=power(view,a)*share;if(strength<=0)continue;
  const row={id:a.id,faction:a.faction,eta,power:strength,kind:incoming?'approaching':a.cityForce?'city':'field'};
  if(defender)rows.push(row);else (contenders[a.faction]??=[]).push(row);
 }
 const reinforcementPower=rows.reduce((n,r)=>n+r.power,0);
 const contest=Object.entries(contenders).map(([faction,rows])=>({faction,rows,power:rows.reduce((n,r)=>n+r.power,0)})).sort((a,b)=>b.power-a.power||a.faction.localeCompare(b.faction))[0];
 const contestingPower=contest?.power||0,wallPower=local.walls||((reinforcementPower+contestingPower)>0?gateDurability(c).hp/6:0);
 const intel=cityIntelligence(s,target.id,faction),age=intel.day===null?rules.maxStaleMargin:Math.min(rules.maxStaleMargin,Math.max(0,s.campaign.day-intel.day)*rules.staleMarginPerDay);
 const base=local.field+local.emergencyPower+wallPower+reinforcementPower+contestingPower;
 return {...local,walls:wallPower,reinforcementPower,contestingPower,reinforcements:rows,contenders:contest?.rows||[],window,staleMargin:age,total:base*(1+age)};
}
