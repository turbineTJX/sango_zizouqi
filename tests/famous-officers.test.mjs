import {currentBattle,readyCurrent} from './helpers/current-battle.mjs';
import {officerTraits} from '../officer-traits.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {STRATAGEMS as AREA_DESIGNS} from '../stratagems.mjs';
import {appointBattleTestCommander} from './helpers/commanders.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMOUS_OFFICERS,famousPassiveId} from '../famous-officers.mjs';
import {makeOfficer,stepBattle,lockDeployment,validateSave,settleBattle,issueCommand,COMMAND_RESOURCE} from '../engine.mjs';
import {createScenario} from './helpers/scenarios.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS,availableTactics,unitTactics,tacticTarget,famousTargets,readyTactic,hasStatus,shieldAmount,setStatus} from '../tactics.mjs';
import {hasPassive,passiveDamageMultiplier,passiveAttributes,passiveList,moved} from '../passives.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {officerDetailMarkup} from '../officer-roster.mjs';

function fixture(id){const skill=SPECIAL_TACTICS[id];assert.ok(skill,id+' has a current exclusive');const x=currentBattle(skill,'spear'),{state,b,u,ally,target:d}=x,s=TACTICS_BOOK[skill];u.hp=2400;u.battleDamage=600;ally.hp=900;ally.battleDamage=2100;d.intent=100;readyCurrent(x,skill);return{state,b,u,d,ally,s};}

test('16 current owners carry their exclusive outside ordinary slots and expose actual descriptions',()=>{
 assert.equal(Object.keys(SPECIAL_TACTICS).length,16);
 assert.equal(Object.keys(SPECIAL_TACTICS).length,16);
 for(const id of Object.keys(SPECIAL_TACTICS)){
  const u=makeOfficer(id,3000,0,10),special=SPECIAL_TACTICS[id];
  assert.equal(unitTactics(u)[0].id,special);
  assert.ok(unitTactics(u).length>=1&&unitTactics(u).length<=4);
  assert.ok(availableTactics({...u,type:'archer'}).some(s=>s.id===special));
  assert.ok(!availableTactics({id:'ordinary',type:u.type}).some(s=>s.id===special));
  assert.ok(officerDetailMarkup(id).includes(TACTICS_BOOK[special].name));
 }
});

test('every exclusive tactic resolves through the real engine and enters only its own cooldown',()=>{
 for(const id of Object.keys(SPECIAL_TACTICS)){
  const {b,u,d,ally,s}=fixture(id);
  if(s.effect==='terror')d.x=6;
  if(s.effect==='protect')Object.assign(ally,{x:5,y:4});
  const before=d.hp;
  stepBattle(b);
  assert.equal(u.tacticCasts[s.id],1,id+' should cast');
  assert.equal(u.skillReady[s.id],b.tick+s.cooldown,id+' cooldown');
  assert.ok(b.effects.some(e=>e.from===id&&e.skillId===s.id)||b.effects.some(e=>e.from===id&&e.label===s.name),id+' visible event');
  if(s.mode==='attack')assert.ok(d.hp<before,id+' damage');
  if(s.mode==='support'&&s.shield)assert.ok(shieldAmount(b,ally)>0,id+' support');
  stepBattle(b);assert.equal(u.tacticCasts[s.id],1,id+' cannot repeat');
 }
});

test('area AI selects the larger cluster and includes the anchor despite enemy array order',()=>{
 const {b,u,d,s}=fixture('person-603');
 Object.assign(d,{x:5,y:0});Object.assign(b.sides[1].units[1],{x:13,y:7});
 const a={...structuredClone(d),id:'cluster-a',x:6,y:3},c={...structuredClone(d),id:'cluster-c',x:6,y:4};
 b.sides[1].units.push(a,c);
 const target=tacticTarget(b,u,s,3);assert.notEqual(target.id,d.id);
 const selected=famousTargets(b,u,s,target);assert.equal(selected[0],target);assert.equal(selected.length,2);
 assert.ok(selected.every(t=>t.id!==d.id));
 stepBattle(b);assert.equal(d.hp,3000);assert.ok(a.hp<3000&&c.hp<3000);
});

test('multi-hit and multi-target exclusive attacks do not charge the caster',()=>{
 for(const id of ['person-396','person-603']){
  const {b,u,d,s}=fixture(id);u.level=1;u.intent=s.threshold;
  b.sides[1].units.push({...structuredClone(d),id:'second-target',x:5,y:4});
  stepBattle(b);assert.equal(u.intent,s.threshold-s.intentCost);
 }
});

test('Liu Bei support waits for recoverable wounds instead of casting on an empty need',()=>{const x=fixture('person-636');x.u.hp=x.u.maxHp;x.u.battleDamage=0;x.ally.hp=x.ally.maxHp;x.ally.battleDamage=0;x.d.x=12;assert.equal(tacticTarget(x.b,x.u,x.s,3),null);x.ally.hp-=1000;x.ally.battleDamage=1000;assert.ok(tacticTarget(x.b,x.u,x.s,3));stepBattle(x.b);assert.equal(x.u.tacticCasts[x.s.id],1);assert.ok(hasStatus(x.b,x.ally,'regrowth'));});

test('exclusive control respects resolve and discipline; deaths do not acquire new statuses',()=>{
 const x=fixture('person-433');setStatus(x.b,x.d,'resolve',5);
 stepBattle(x.b);assert.ok(!hasStatus(x.b,x.d,'confuse'));assert.ok(x.d.hp<3000);
 let controlled=false;for(let seed=1;seed<=30&&!controlled;seed++){const y=fixture('liao');y.b.seed=seed;y.d.x=6;y.d.politics=100;stepBattle(y.b);assert.equal(y.u.tacticCasts.terror,1);if(hasStatus(y.b,y.d,'confuse')){controlled=true;assert.ok(y.d.statuses.confuse.until-y.b.tick<=3);}}assert.ok(controlled);
 const z=fixture('person-99');z.d.hp=1;stepBattle(z.b);
 assert.equal(z.d.hp,0);assert.ok(!z.d.statuses.armorBreak);
});

test('exclusive tactics and independent traits remain fixed across level and troop changes',()=>{for(const id of Object.keys(SPECIAL_TACTICS)){const a=makeOfficer(id,3000,0,1),b=makeOfficer(id,3000,0,10);assert.deepEqual(officerTraits(a),officerTraits(b));for(const type of ['spear','siege','ship'])assert.ok(availableTactics({...b,type}).some(t=>t.id===SPECIAL_TACTICS[id]));}});

test('Liu Bei support stays local and excludes reserves',()=>{const {b,u,ally,s}=fixture('person-636'),far={...structuredClone(ally),id:'far-ally',x:0,y:0},reserve={...structuredClone(ally),id:'reserve-ally',status:'reserve',arrivalTick:999};b.sides[0].units.push(far,reserve);const targets=famousTargets(b,u,s);assert.ok(targets.includes(ally));assert.ok(!targets.includes(far)&&!targets.includes(reserve));stepBattle(b);assert.ok(hasStatus(b,ally,'regrowth'));assert.equal(hasStatus(b,far,'regrowth'),false);assert.equal(hasStatus(b,reserve,'regrowth'),false);});

test('Liu Bei regrowth consumes only actual wounded and never revives defeated units',()=>{const {b,u,ally,s}=fixture('person-636');u.battleDamage=0;ally.battleDamage=0;assert.equal(tacticTarget(b,u,s,3),null);ally.battleDamage=100;const before=ally.hp;stepBattle(b);assert.equal(ally.hp,before);assert.ok(hasStatus(b,ally,'regrowth'));for(let i=0;i<12;i++)stepBattle(b);assert.ok(ally.healed<=35);assert.ok(ally.hp<=before+35);ally.hp=0;ally.status='defeated';assert.equal(tacticTarget(b,u,s,3),null);});

test('burn stacks retain the strongest snapshot, refresh duration, and cap at three',()=>{
 const {b,d}=fixture('person-246');
 setStatus(b,d,'burn',3,{amount:40,sourceId:'strong'});assert.equal(d.statuses.burn.stacks,1);
 setStatus(b,d,'burn',8,{amount:15,sourceId:'weak'});assert.equal(d.statuses.burn.amount,80);assert.equal(d.statuses.burn.sourceId,'strong');assert.equal(d.statuses.burn.until,b.tick+9);
 setStatus(b,d,'burn',5,{amount:45,sourceId:'stronger'});assert.equal(d.statuses.burn.sourceId,'stronger');assert.equal(d.statuses.burn.amount,135);setStatus(b,d,'burn',6,{amount:10,sourceId:'weak'});assert.equal(d.statuses.burn.amount,135);
 b.tick=d.statuses.burn.until;setStatus(b,d,'burn',3,{amount:15,sourceId:'weak'});assert.equal(d.statuses.burn.sourceId,'weak');
});

test('retired self-cost exclusives cannot be acquired by Huang Gai or Zhou Tai',()=>{for(const id of ['person-164','person-494']){const u=makeOfficer(id,3000,0,10);assert.equal(SPECIAL_TACTICS[id],undefined);assert.ok(unitTactics(u).every(s=>!s.selfCost));}});

test('new exclusive effects resume deterministically and settle with conserved troops for all 16 holders',()=>{
 const ids=Object.keys(SPECIAL_TACTICS);
 for(let i=0;i<ids.length;i+=6){
  const state=createScenario('officer-lab',81+i,20,ids.slice(i,i+6));
  lockDeployment(state.battle);for(let n=0;n<50&&!state.battle.result;n++)stepBattle(state.battle);
  const saved=validateSave(structuredClone(state));
  while(!state.battle.result){stepBattle(state.battle);stepBattle(saved.battle);}
  assert.deepEqual(saved.battle,state.battle);
  const report=settleBattle(state);validateSave(state);
  for(const side of report.stats)assert.equal(side.initial,side.remaining+side.killed+side.wounded);
 }
});

