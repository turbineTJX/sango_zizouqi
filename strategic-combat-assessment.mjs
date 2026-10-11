import {unitAttributes,TROOPS} from './unit-stats.mjs';
import {combatType} from './troop-equipment.mjs';
import {unitTactics} from './tactics.mjs';
import {tacticSlot,tacticUsesLeft} from './tactic-tempo.mjs';
import {powerFactor} from './tactic-power.mjs';
import {TROOP_INTENT} from './combat-rules.mjs';
import {armyFrontlineCapacity} from './army-trait-rules.mjs';
import {STRATEGIC_PLANNING_RULES as RULES} from './data/design/strategic-planning-rules.mjs';

const R=RULES.assessment,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Expected effect budgets, not casts. No targeting, movement, RNG, battle
// construction, deployment search or time stepping occurs in this module.
const direct=R.damageEffects,healing=R.healingEffects,protection=R.protectionEffects,disruption=R.controlEffects;

function tacticBudget(u,p,count,enemyCount){
 let physical=0,magical=0,heal=0,guard=0,control=0;const slots=new Map();
 for(const t of unitTactics(u)){
  const power=t.category==='intellect'?p.strategyPower:t.category==='politics'?p.supportPower:p.martialPower;
  const reach=clamp((u.intent||0)+(TROOP_INTENT[combatType(u)].attack/p.attackInterval+TROOP_INTENT[combatType(u)].hit*.2)*R.horizonSteps,0,100);
  const availability=t.passive?1:clamp(reach/Math.max(1,t.threshold),0,1)*Math.min(tacticUsesLeft(u,t),1+R.horizonSteps/Math.max(1,t.cooldown))*.7;
  let damage=(direct[t.effect]||0)*power,healingFraction=healing[t.effect]||0,shield=protection[t.effect]||0,disable=disruption[t.effect]||0;
  if(['cleave','scatter','bombard','broadside','undertow','wildfire'].includes(t.effect))damage*=Math.min(2,enemyCount)/2;
  if(t.attackOrb)damage=power*(t.effect==='curse'?1.2:1.05);
  if(t.effect==='famous'){
   const targets=Math.min(t.targets||1,t.mode==='attack'?enemyCount:Math.max(0,count-(t.excludeSelf?1:0)));
   damage=t.mode==='attack'?power*(t.scale||1)*(1+(targets-1)*.5):0;
   healingFraction=((t.heal||0)+(t.regrowthFraction||0)*(t.regrowthSteps||0))*targets;
   shield=(t.shield||0)+Object.values(t.buffs||{}).reduce((n,v)=>n+v*.03,0)*targets;
   disable=t.mode==='attack'&&t.steps?Math.min(.12,t.steps*.015):0;
  }
  if(count===1&&['protect','boarding','supply','rally','relay','nexus'].includes(t.effect)){damage=0;healingFraction=0;shield=0;}
  if(t.effect==='status'){disable=t.mode==='attack'?.05:0;shield=t.mode==='support'?.04:0;}
  if(t.effect==='remedy'||t.effect==='cleanse')shield=.025;
  if(['valor','emplace','nexus','supply','rally','relay','anchor'].includes(t.effect))damage+=p.attack*1.1;
  const effect={physical:t.category==='intellect'?0:damage*availability,magical:t.category==='intellect'?damage*availability:0,
   heal:healingFraction*powerFactor(power)*availability,guard:shield*availability,control:disable*powerFactor(power)*availability};
  // High-tier tactics share a stock/cooldown. Count the strongest option in
  // each real slot, rather than crediting every learned tactic independently.
  const key=tacticSlot(t),value=effect.physical/250+effect.magical/200+effect.heal+effect.guard+effect.control;
  if(!slots.has(key)||slots.get(key).value<value)slots.set(key,{...effect,value});
 }
 for(const e of slots.values()){physical+=e.physical;magical+=e.magical;heal+=e.heal;guard+=e.guard;control+=e.control;}
 return {physical:physical/R.horizonSteps,magical:magical/R.horizonSteps,
  sustain:Math.min(R.maxSustain,heal*.5+guard),control:Math.min(R.maxControl,control)};
}

function terrainFactor(type,terrain){
 const family=TROOPS[type].family;
 if(family==='cavalry')return terrain==='forest'?.9:terrain==='marsh'?.8:terrain==='hill'?.95:1;
 if(['archer','siege'].includes(family))return terrain==='hill'?1.07:terrain==='forest'?.95:1;
 return 1;
}
function counterFactor(type,opponents){
 const total=opponents.reduce((n,u)=>n+(u.hp??u.troops??0),0);if(!total)return 1;
 return opponents.reduce((n,u)=>{const t=TROOPS[combatType(u)],own=TROOPS[type];return n+(u.hp??u.troops??0)*(own.beats===t.family?1.28:t.beats===own.family?.84:1);},0)/total;
}

// Both sides use exactly this measurement. Inputs must already be the caller's
// own forces or dated observations; this function cannot inspect world state.
export function assessCombatForce(army,{opponents=[],terrain='land',tick=0}={}){
 const units=army.units.filter(u=>(u.hp??u.troops??0)>0),capacity=armyFrontlineCapacity({...army,leader:units.some(u=>u.id===army.leader)?army.leader:null});
 const leader=units.find(u=>u.id===army.leader),advisor=units.find(u=>u.id===army.advisor);
 const measured=units.map((u,i)=>({...u,hp:u.hp??u.troops,maxHp:u.maxHp??u.troops,side:0,status:i<capacity?'active':'reserve',x:-100,y:-100,
  commandBonus:u.commandBonus??(leader?.leadership||0)/1000,advisorBonus:u.advisorBonus??(advisor?.intellect||0)/1000}));
 // AI assessment deliberately excludes bonds, their entry benefits and combinations.
 // Actual combat still resolves them for both sides through the shared engine.
 const context={tick,sides:[{units:measured,commanders:[]},{units:[]}]};
 const opponentMen=opponents.reduce((n,u)=>n+(u.hp??u.troops??0),0);
 const intellectShare=opponentMen?opponents.reduce((n,u)=>n+(u.hp??u.troops??0)*Math.min(.25,unitTactics(u).filter(t=>t.category==='intellect'&&t.mode!=='support').length*.07),0)/opponentMen:.1;
 let men=0,output=0,durability=0,tacticOutput=0,sustain=0,control=0;
 const morale=.7+(army.morale??80)/250,hunger=1-Math.min(.4,(army.hunger||0)*.1);
 for(const u of measured){
  const p=unitAttributes(u,context,{ignoreBonds:true}),t=tacticBudget(u,p,Math.min(capacity,units.length),opponents.length?Math.min(6,opponents.length):6),type=combatType(u);
  const reserve=u.status==='reserve'?R.reserveShare:1;
  const basic=p.attack/p.attackInterval*100/250,skills=t.physical*100/250+t.magical*100/180;
  const offense=(basic+skills)*counterFactor(type,opponents)*terrainFactor(type,terrain)*(1+t.control);
  const hp=u.hp*(100+p.defense*(1-intellectShare)+p.discipline*intellectShare)/250*(1+t.sustain);
  men+=u.hp;output+=offense*reserve;durability+=hp*reserve;tacticOutput+=skills*reserve;sustain+=u.hp*t.sustain;control+=u.hp*t.control;
 }
 const power=Math.sqrt(Math.max(0,output*R.powerScale*durability))*morale*hunger;
 return {power,men,output,durability,tacticOutput,sustain:men?sustain/men:0,control:men?control/men:0,capacity,reserveUnits:Math.max(0,units.length-capacity)};
}

// Closed-form attrition approximation. It runs once, never updates soldiers or
// steps a battle. Near parity is inherently uncertain and still fails admission.
export function estimateCombatLossFraction(attackPower,defensePower){
 if(defensePower<=0)return 0;
 const ratio=defensePower/Math.max(1,attackPower);
 return Math.min(.8,1-Math.sqrt(Math.max(0,1-ratio*ratio)));
}
