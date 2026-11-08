import test from 'node:test';
import assert from 'node:assert/strict';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';
import {BOND_ASSIGNMENTS as A} from '../data/design/bond-assignments.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,fillSlots} from '../engine.mjs';
import {sideBonds,grantBondEntries} from '../bonds.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {unitTactics,setStatus,hasStatus} from '../tactics.mjs';
import {remedy} from '../battle-status-rules.mjs';
import {bondLineup} from './helpers/bond-lineups.mjs';
import {bondReference} from '../bond-reference.mjs';
import {inspectionStatuses} from '../status-display.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';
const id=name=>Object.values(O).find(o=>o.name===name).id;
const debuffs=['bondCrusher','bondDisciplineBreak','bondEnfeeble'];
function scene(key,{side=0,count=6,type='archer',foe='刘禅',foeType='archer',foes=null,ownNames=null,troops=4000,sourceTroops=troops,reinforcements=[],beforeLock=()=>{}}={}){
 const own=(ownNames||bondLineup(key).slice(0,count)).map((name,i)=>({id:id(name),type,troops:i===0?sourceTroops:troops,level:10}));
 const enemy=(foes||[foe,'刘璋','韩玄','刘度']).map(name=>({id:id(name),type:foeType,troops,level:10}));
 const state=createScenario('custom-battle',6501,20,null,{seed:6501,terrain:'land',ownTeam:side?enemy:own,enemyTeam:side?own:enemy,reinforcements}),b=state.battle;
 for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.cooldown=999;u.retreatAt=null;u.statuses.root={until:999};u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 const us=b.sides[side].units,es=b.sides[1-side].units,u=us[0],target=es[0];
 beforeLock({b,u,target,us,es});const seed=b.seed;lockDeployment(b);
 us.filter(u=>u.status==='active').forEach((v,i)=>Object.assign(v,{x:i?0:4,y:i?i-1:3}));es.filter(u=>u.status==='active').forEach((v,i)=>Object.assign(v,{x:i?13:foeType==='spear'?5:6,y:i?i-1:3}));
 return {state,b,u,target,us,es,side,seed};
}
const step=b=>stepBattle(b,{aiSides:[],pauseForReinforcements:false});
const equivalent=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const withdraw=u=>Object.assign(u,{status:'withdrawn',x:-1,y:-1});
const roundTrip=state=>validateSave(JSON.parse(JSON.stringify(state)));

test('new common rosters remain bounded and opening debuffs have a long, finite deterministic window',()=>{
 assert.deepEqual(validateDesignTables(),[]);
 for(const key of ['bondMartial','bondDisciplineBreak','bondEnfeeble']){
  const holders=Object.values(A).filter(a=>a[key]);assert.equal(holders.length,20);assert.ok(holders.every(a=>Object.keys(a).length<=2&&Object.values(a).reduce((n,v)=>n+v,0)<=6));
  for(const side of [0,1])for(const [i,count] of [1,3,6].entries())assert.equal(sideBonds(scene(key,{side,count}).b,side)[key].tier,i+1);
  assert.match(JSON.stringify(bondReference(key)),key==='bondMartial'?/激活期间常驻/:/首次满足条件.*180战斗回合/);
 }
 for(const field of ['onceDebuff','debuffSteps','statusKey','values']){const bad=structuredClone(DESIGN_TABLES);bad.bonds.bondEnfeeble[field]=null;assert.ok(validateDesignTables(bad).length);}
});

test('opening debuffs affect every actual enemy before any attack on both sides and at every tier, without RNG or intent cost',()=>{
 for(const side of [0,1])for(const key of debuffs)for(const [i,count] of [1,3,6].entries()){
  const x=scene(key,{side,count}),d=D[key];assert.equal(x.b.tick,0);assert.equal(x.b.seed,x.seed);assert.ok(x.us.every(u=>u.intent===0));
  for(const target of x.es){const s=target.statuses[d.statusKey];assert.ok(s);assert.equal(s.fraction,d.values[i]);assert.equal(s.until,d.debuffSteps+1);assert.equal(s.castTick,0);assert.equal(target.hp,target.initial);
   const attributes=unitAttributes(target,x.b),plain=unitAttributes({...target,statuses:{}},x.b);
   for(const stat of key==='bondCrusher'?['defense']:key==='bondDisciplineBreak'?['discipline']:['martialPower','strategyPower'])equivalent(attributes[stat],plain[stat]*(1-d.values[i]));
   const ai=unitAttributes(target,x.b,{ignoreBonds:true});for(const stat of ['defense','discipline','martialPower','strategyPower'])equivalent(ai[stat],plain[stat]);
   assert.match(inspectionStatuses(x.b,target).find(s=>s.key===d.statusKey).description,/满足条件时一次施加/);
  }
  assert.doesNotThrow(()=>roundTrip(x.state));
 }
});

test('Martial is a constant live-tier bonus and improves a real carried martial cast; opening discipline loss improves strategy damage',()=>{
 for(const side of [0,1])for(const [i,count] of [1,3,6].entries()){
  const x=scene('bondMartial',{side,count}),plain=unitAttributes(x.u);for(let tick=0;tick<40;tick++)step(x.b);
  equivalent(unitAttributes(x.u,x.b).martialPower,plain.martialPower*(1+D.bondMartial.values[i]));equivalent(unitAttributes(x.u,x.b).strategyPower,plain.strategyPower);withdraw(x.u);equivalent(unitAttributes(x.u,x.b).martialPower,plain.martialPower);
 }
 for(const key of ['bondMartial','bondDisciplineBreak']){
  const x=scene(key,key==='bondMartial'?{type:'halberd',foeType:'spear'}:{}),skill=unitTactics(x.u).find(s=>s.id===(key==='bondMartial'?'cleave':'wildfire'));assert.ok(skill);
  x.u.intent=skill.threshold;x.u.skillReady[skill.id]=0;const baseline=structuredClone(x.state),caster=baseline.battle.sides[0].units[0],target=baseline.battle.sides[1].units[0];
  if(key==='bondMartial')delete caster.bondGrowth.levels[key];else delete target.statuses.disciplineDown;
  const damage=[0,0];for(let t=0;t<4;t++)for(const [i,b] of [x.b,baseline.battle].entries()){step(b);damage[i]+=b.effects.filter(e=>e.from===x.u.id&&e.to===x.target.id&&e.skill&&!e.ongoing).reduce((n,e)=>n+e.damage,0);}
  assert.ok(damage[0]>damage[1]&&damage[1]>0,`${key}: ${damage}`);assert.equal(x.u.tacticCasts[skill.id],1);assert.doesNotThrow(()=>roundTrip(x.state));
 }
});

test('opening expiry survives withdrawal, does not follow live tiers, resumes exactly, and ends after 180 complete rounds',()=>{
 for(const side of [0,1])for(const key of debuffs){
  const x=scene(key,{side}),d=D[key];withdraw(x.u);for(let t=0;t<178;t++)step(x.b);
  assert.ok(hasStatus(x.b,x.target,d.statusKey));assert.equal(x.target.statuses[d.statusKey].fraction,d.values[2]);const copy=roundTrip(x.state);
  for(let t=0;t<2;t++){step(x.b);step(copy.battle);}assert.equal(x.b.tick,180);assert.ok(hasStatus(x.b,x.target,d.statusKey));
  step(x.b);step(copy.battle);assert.equal(x.b.tick,181);assert.ok(!hasStatus(x.b,x.target,d.statusKey));assert.deepEqual(x.state,copy);assert.doesNotThrow(()=>roundTrip(x.state));
 }
});

test('cleansing removes the opening effect permanently and basic attacks or repeated entry grants cannot renew it',()=>{
 for(const key of debuffs){const x=scene(key),status=D[key].statusKey;assert.ok(remedy(x.b,x.target,'rally').includes(status));
  grantBondEntries(x.b);assert.ok(!hasStatus(x.b,x.target,status));x.u.cooldown=0;step(x.b);assert.ok(!hasStatus(x.b,x.target,status));assert.equal(x.target.intent>0,true);assert.doesNotThrow(()=>roundTrip(x.state));
 }
});

test('opening debuffs use shared immunity, ignore shields, and never retry a target after its immunity ends',()=>{
 for(const key of debuffs){
  for(const protection of ['magicImmune','stasis']){
   const x=scene(key,{beforeLock:({b,target})=>setStatus(b,target,protection,3)});assert.ok(!hasStatus(x.b,x.target,D[key].statusKey));for(let t=0;t<6;t++)step(x.b);grantBondEntries(x.b);assert.ok(!hasStatus(x.b,x.target,D[key].statusKey));assert.doesNotThrow(()=>roundTrip(x.state));
  }
  const shielded=scene(key,{beforeLock:({b,target})=>setStatus(b,target,'shield',6,{amount:4000,source:'fixture',label:'护盾'})});assert.ok(hasStatus(shielded.b,shielded.target,D[key].statusKey));
 }
});

test('new entrants never inherit an already cast negative bond, either during its window or after expiry',()=>{
 for(const key of debuffs){
  const x=scene(key,{troops:3000,foes:['刘禅','刘璋','韩玄','刘度','孔伷','张鲁','刘虞','刘焉']}),d=D[key],reserves=x.es.filter(u=>u.status==='reserve');assert.equal(reserves.length,2);
  assert.ok(!hasStatus(x.b,reserves[0],d.statusKey));for(let t=0;t<30;t++)step(x.b);withdraw(x.es.find(u=>u.status==='active'));fillSlots(x.b,1,{ai:false});
  assert.equal(reserves[0].status,'active');assert.ok(!hasStatus(x.b,reserves[0],d.statusKey));assert.equal(reserves[0].bondEntry.tick,30);assert.doesNotThrow(()=>roundTrip(x.state));
  while(x.b.tick<181&&!x.b.result)step(x.b);assert.equal(x.b.tick,181);withdraw(x.es.find(u=>u.status==='active'));fillSlots(x.b,1,{ai:false});assert.equal(reserves[1].status,'active');assert.ok(!hasStatus(x.b,reserves[1],d.statusKey));assert.doesNotThrow(()=>roundTrip(x.state));
 }
});

test('short stronger applications retain independent expiry over a weaker opening effect',()=>{
 for(const key of debuffs){const x=scene(key),status=D[key].statusKey,long=x.target.statuses[status].fraction;
  setStatus(x.b,x.target,status,2,{sourceId:x.u.id,sourceName:x.u.name,sourceSkillName:'短时战法',fraction:.4});assert.equal(x.target.statuses[status].fraction,.4);assert.equal(x.target.statuses[status].until,3);
  const copy=roundTrip(x.state);for(let t=0;t<4;t++){step(x.b);step(copy.battle);}assert.deepEqual(x.state,copy);assert.equal(x.target.statuses[status].fraction,long);assert.equal(x.target.statuses[status].until,181);
 }
});

test('a negative bond first completed later affects all enemies present at that moment, including earlier reinforcements, once',()=>{
 const x=scene('bondEnfeeble',{troops:3000,ownNames:['何晏','刘备'],foes:['刘禅','刘璋','韩玄','刘度','孔伷','张鲁','刘虞','刘焉'],reinforcements:[{side:0,name:'补入部队',tick:30,team:[{id:id('高柔'),type:'archer',level:10,troops:3000}]}]});
 assert.equal(x.b.sides[0].bondDebuffCasts.length,0);assert.ok(x.es.every(u=>!hasStatus(x.b,u,'powerDown')));
 for(let tick=0;tick<10;tick++)step(x.b);
 const earlier=x.es.find(u=>u.status==='reserve');withdraw(x.es.find(u=>u.status==='active'));fillSlots(x.b,1,{ai:false});assert.equal(earlier.status,'active');assert.ok(!hasStatus(x.b,earlier,'powerDown'));
 for(let t=0;t<50&&x.b.tick<31;t++)step(x.b);assert.equal(x.b.tick,31,JSON.stringify({tick:x.b.tick,result:x.b.result,council:x.b.reinforcementCouncil}));const cast=x.b.sides[0].bondDebuffCasts.find(e=>e.id==='bondEnfeeble');assert.equal(cast.castTick,31);assert.equal(cast.until,212);assert.equal(cast.tier,1);
 assert.ok(x.es.filter(u=>u.status==='active').every(u=>hasStatus(x.b,u,'powerDown')));assert.ok(hasStatus(x.b,earlier,'powerDown'));
 const later=x.es.find(u=>u.status==='reserve');withdraw(x.es.find(u=>u.status==='active'));fillSlots(x.b,1,{ai:false});assert.equal(later.status,'active');assert.ok(!hasStatus(x.b,later,'powerDown'));grantBondEntries(x.b);assert.equal(x.b.sides[0].bondDebuffCasts.filter(e=>e.id==='bondEnfeeble').length,1);assert.doesNotThrow(()=>roundTrip(x.state));
});

test('positive bonds update with current participants while an already cast negative bond keeps its original tier and deadline',()=>{
 for(const key of ['bondMartial','bondEnfeeble']){
  const names=bondLineup(key),x=scene(key,{ownNames:names.slice(0,1),reinforcements:[{side:0,name:'补入部队',tick:30,team:names.slice(1).map(name=>({id:id(name),type:'archer',level:10,troops:4000}))}]});
  assert.equal(sideBonds(x.b,0)[key].tier,1);const plain=unitAttributes(x.u).martialPower;
  if(key==='bondMartial')equivalent(unitAttributes(x.u,x.b).martialPower,plain*1.08);
  for(let tick=0;tick<31;tick++)step(x.b);assert.equal(sideBonds(x.b,0)[key].tier,3);
  if(key==='bondMartial'){equivalent(unitAttributes(x.u,x.b).martialPower,plain*1.2);withdraw(x.us[1]);assert.equal(sideBonds(x.b,0)[key].tier,2);equivalent(unitAttributes(x.u,x.b).martialPower,plain*1.14);}
  else{assert.equal(x.target.statuses.powerDown.fraction,.08);assert.equal(x.target.statuses.powerDown.until,181);assert.equal(x.b.sides[0].bondDebuffCasts.find(e=>e.id===key).tier,1);}
  assert.doesNotThrow(()=>roundTrip(x.state));
 }
});

test('opening records, targets, status strength and expiry cannot be forged in a save',()=>{
 for(const key of debuffs){const x=scene(key),status=D[key].statusKey;
  for(const mutate of [s=>s.until--,s=>s.fraction=.9,s=>s.sourceId=x.target.id,s=>s.bondDebuffTier=4]){const bad=structuredClone(x.state),s=bad.battle.sides[1].units[0].statuses[status];mutate(s);if(s.sources)mutate(s.sources[0]);assert.throws(()=>validateSave(bad),/状态|羁绊/);}
  for(const mutate of [e=>e.until++,e=>e.tier=0,e=>e.sourceId=x.target.id,e=>e.targets.pop()]){const bad=structuredClone(x.state),e=bad.battle.sides[0].bondDebuffCasts.find(e=>e.id===key);mutate(e);assert.throws(()=>validateSave(bad),/羁绊/);}
 }
});

test('opening Enfeeble covers the naturally earned first martial and strategy casts without requiring a hit',()=>{
 for(const [foe,foeType,tactic] of [['孙策','spear','thrust'],['周瑜','archer','wildfire']]){
  const x=scene('bondEnfeeble',{foe,foeType,sourceTroops:6000}),skill=unitTactics(x.target).find(s=>s.id===tactic);assert.ok(skill,'must be actually carried');for(let delay=0;delay<20;delay++)step(x.b);x.target.cooldown=0;x.target.skillReady[skill.id]=0;let cast=null;
  for(let t=0;t<115&&!cast&&!x.b.result;t++){const expected=unitAttributes(x.target,x.b)[skill.category==='force'?'martialPower':'strategyPower'];const before=x.b.tick;step(x.b);cast=x.b.effects.find(e=>e.from===x.target.id&&e.castPower!==undefined&&e.label===skill.name);if(cast){assert.ok(before>10);assert.ok(x.b.tick<=180);assert.ok(hasStatus(x.b,x.target,'powerDown'));equivalent(cast.castPower,expected);}}
  assert.ok(cast,`${foe} must release ${skill.name}: ${JSON.stringify({tick:x.b.tick,intent:x.target.intent,hp:x.u.hp,action:x.target.action,result:x.b.result,casts:x.target.tacticCasts})}`);assert.equal(x.target.tacticCasts[tactic],1);assert.equal(x.u.passiveState.shots,0);assert.doesNotThrow(()=>roundTrip(x.state));
 }
});
