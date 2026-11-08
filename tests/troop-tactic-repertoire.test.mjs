import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfficer,stepBattle,validateSave,lockDeployment} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {TROOP_DESIGNS} from '../data/design/troops.mjs';
import {TROOP_TACTIC_REPERTOIRES} from '../data/design/assignments.mjs';
import {emptyEquipment} from '../troop-equipment.mjs';
import {selectedTactics,learnedTacticIds} from '../tactic-learning.mjs';
import {TACTICS_BOOK,hasStatus,setStatus,statusPower,validLoadout,tacticTarget,supportPositionPreview,unitTactics} from '../tactics.mjs';
import {powerDuration,effectChance} from '../tactic-power.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {currentBattle,readyCurrent,resumeCurrent,tacticHolder} from './helpers/current-battle.mjs';

test('all twenty pools cover three powers, keep one siege or three other large choices, and have actual holders',()=>{
 const obtained=Object.fromEntries(Object.keys(TROOP_TACTIC_REPERTOIRES).map(type=>[type,new Set()]));
 for(const officer of OFFICER_CATALOG){
  const original=makeOfficer(officer.id,3000);
  for(const [type,pool] of Object.entries(TROOP_TACTIC_REPERTOIRES)){
   assert.equal(pool.small.length,3);assert.equal(pool.large.length,TROOP_DESIGNS[type].equipmentSlot==='siege'?1:3);
   const slot=TROOP_DESIGNS[type].equipmentSlot;
   const u={...original,type:slot==='ship'?'archer':slot?'halberd':type,...(slot?{formType:type,equipment:{...emptyEquipment(),[slot]:type}}:{})};
   const ids=learnedTacticIds(u),ordinary=ids.filter(id=>!TACTICS_BOOK[id].special);
   assert.ok(ordinary.length<=3&&ids.length<=4,officer.name+'/'+type);
   assert.ok(ordinary.filter(id=>TACTICS_BOOK[id].learningTier==='low').length<=2);
   assert.ok(ordinary.filter(id=>TACTICS_BOOK[id].learningTier==='high').length<=1);
   ordinary.forEach(id=>obtained[type].add(id));
   const unearned=[...pool.small,...pool.large].find(id=>!ids.includes(id));
   assert.ok(unearned);assert.equal(validLoadout(u,[...ids,unearned]),false);
  }
 }
 for(const [type,pool] of Object.entries(TROOP_TACTIC_REPERTOIRES))assert.deepEqual(obtained[type],new Set([...pool.small,...pool.large]),type);
});

test('base abilities and personality choose actual martial, strategy or support large actions',()=>{
 const u={type:'spear',aptitudes:{spear:3},force:95,intellect:25,leadership:80,politics:30,charm:40,personality:4};
 assert.equal(selectedTactics(u).high[0],'thrust');
 const scholar={...u,force:25,intellect:95,leadership:65,politics:60};
 assert.equal(selectedTactics(scholar).high[0],'doubt');
 const supporter={...scholar,politics:100,charm:99};
 assert.equal(selectedTactics(supporter).high[0],'relief');
 assert.ok(selectedTactics(scholar).low.includes('ward'));
 assert.ok(selectedTactics(supporter).low.includes('cleanse'));
 assert.ok(!selectedTactics(supporter).low.includes('phalanx'));
 const original=makeOfficer('cao',3000),before=selectedTactics(original,'spear');
 Object.assign(original,{hp:1,force:0,intellect:0,leadership:0,politics:0,charm:0,personality:4,level:10});
 assert.deepEqual(selectedTactics(original,'spear'),before,'battle changes cannot redraw the base repertoire');
});

for(const side of [0,1])test('ordinary magic immunity cleanses real ailments, retains hunger and validates its source on side '+side,()=>{
 const x=currentBattle('antiMagic','rattan',{side});
 setStatus(x.b,x.u,'armorBreak',20);setStatus(x.b,x.u,'burn',20,{sourceId:x.target.id,amount:0});setStatus(x.b,x.u,'hunger',20,{fraction:.2});
 readyCurrent(x,'antiMagic');const power=statusPower(x.u,TACTICS_BOOK.antiMagic,x.b);stepBattle(x.b);
 assert.equal(x.u.tacticCasts.antiMagic,1);assert.ok(hasStatus(x.b,x.u,'magicImmune'));
 assert.equal(hasStatus(x.b,x.u,'armorBreak'),false);assert.equal(hasStatus(x.b,x.u,'burn'),false);assert.ok(hasStatus(x.b,x.u,'hunger'));
 assert.equal(x.u.statuses.magicImmune.duration,powerDuration(3,power));
 assert.equal(setStatus(x.b,x.u,'weaken',20),false);
 // Hunger above isolates immunity semantics; persistence requires the real
 // campaign/event provenance, which is outside this ability fixture.
 delete x.u.statuses.hunger;
 const invalid=structuredClone(x.state),live=invalid.battle.sides[side].units[0];live.statuses.magicImmune.sourceTactic='ward';assert.throws(()=>validateSave(invalid),/御术/);
 resumeCurrent(x);
});

for(const [id,type,key] of [['bind','greatHalberd','root'],['disarm','tigerCavalry','disarm']])test(id+' uses the real strategy probability and control protection',()=>{
 const x=currentBattle(id,type);readyCurrent(x,id);const power=statusPower(x.u,TACTICS_BOOK[id],x.b),resistance=unitAttributes(x.target,x.b).discipline;
 stepBattle(x.b);assert.equal(x.u.tacticCasts[id],1);
 const roll=x.b.effects.find(e=>e.from===x.u.id&&e.resolution?.effect===key);assert.ok(roll);
 assert.equal(roll.resolution.chance,effectChance(power,resistance));assert.equal(hasStatus(x.b,x.target,key),roll.resolution.success);
 if(roll.resolution.success)assert.ok(hasStatus(x.b,x.target,'resolve'));
 resumeCurrent(x);
});

test('a normal strategy large action uses intellect for damage and keeps its locked area and casting delay',()=>{
 function cast(force,intellect){const x=currentBattle('wildfire','archer');Object.assign(x.u,{force,intellect});x.target.x=6;x.rear.x=13;
  for(const target of [x.target,x.rear])setStatus(x.b,target,'root',20);
  readyCurrent(x,'wildfire');stepBattle(x.b);assert.ok(x.u.tacticAim);while(x.u.tacticAim)stepBattle(x.b);
  return x.b.effects.filter(e=>e.from===x.u.id&&!e.ongoing&&e.to===x.target.id).reduce((sum,e)=>sum+(e.damage||0),0);
 }
 assert.ok(cast(10,100)>cast(100,10));assert.equal(cast(10,100),cast(100,100));
});

test('new ordinary protection uses the same positional targets as its read-only preview',()=>{
 const id=tacticHolder('bodyguard','baier'),others=OFFICER_CATALOG.filter(o=>o.id!==id).slice(0,3).map(o=>o.id),entry=(id,type='spear')=>({id,type,troops:3000,level:1});
 const state=createScenario('custom-battle',14703,20,null,{seed:14703,terrain:'land',ownTeam:[entry(id,'baier'),entry(others[0]),entry(others[1])],enemyTeam:[entry(others[2])]});
 const b=state.battle;lockDeployment(b);const [u,column,other]=b.sides[0].units;
 Object.assign(u,{x:4,y:3});Object.assign(column,{x:4,y:4});Object.assign(other,{x:5,y:3,hp:1500,battleDamage:1500});Object.assign(b.sides[1].units[0],{x:10,y:3});
 for(const v of b.sides.flatMap(s=>s.units)){v.cooldown=999;v.intent=0;v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));}
 const before=JSON.stringify(state),preview=supportPositionPreview(b,u).find(p=>p.skill.id==='bodyguard');assert.ok(preview);assert.equal(preview.eligible[0],column);assert.equal(tacticTarget(b,u,TACTICS_BOOK.bodyguard,1),column);assert.equal(JSON.stringify(state),before);
 const x={state,b,u};readyCurrent(x,'bodyguard');stepBattle(b);assert.ok(hasStatus(b,column,'guard'));assert.equal(hasStatus(b,other,'guard'),false);resumeCurrent(x);
});
