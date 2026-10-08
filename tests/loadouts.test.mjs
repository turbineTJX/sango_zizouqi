import {currentBattle,readyCurrent,resumeCurrent} from './helpers/current-battle.mjs';
import {tacticPools,LEARNING_TROOPS} from '../tactic-learning.mjs';
import {SPECIAL_TACTICS,setStatus} from '../tactics.mjs';
import {appointTestCommanders} from './helpers/commanders.mjs';
import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, orderArmy, advanceTurn, startBattle, lockDeployment, stepBattle, issueCommand, validateSave, configureUnitTactics, STRATAGEMS } from '../engine.mjs';
import { TACTICS_BOOK, unitTactics, availableTactics, defaultTacticIds, configureTactics, hasStatus, readyTactic } from '../tactics.mjs';
function encounter(leader='cao',advisor='jia') {const state=newGame();appointTestCommanders(state,leader,advisor);orderArmy(state,'a1','guandu');advanceTurn(state);startBattle(state);return state;}
function scenario(type,id) {
  const state=encounter(),b=state.battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
  b.sides[0].units=[a];b.sides[1].units=[d];a.type=type;d.type='crossbow';
  Object.assign(a,{x:4,y:3,cooldown:999,intent:100});Object.assign(d,{x:6,y:3,cooldown:999,intent:80});
  const ids=[id,...availableTactics(a).map(s=>s.id).filter(key=>key!==id).slice(0,2)];learnFixtureTactics(a,ids);
  for(const s of unitTactics(a))a.skillReady[s.id]=s.id===id?0:999;
  for(const s of unitTactics(d))d.skillReady[s.id]=999;
  lockDeployment(b);return {state,b,a,d};
}
function complete(x) {const count=x.a.skillCasts;for(let i=0;i<12&&x.a.skillCasts===count;i++)stepBattle(x.b);assert.equal(x.a.skillCasts,count+1);}
function ally(x) {const u={...structuredClone(x.a),id:'ally',x:3,y:3,intent:0,hp:1500,battleDamage:x.a.maxHp-1500,cast:null,statuses:{}};u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));x.b.sides[0].units.push(u);return u;}

test('each troop has two fixed small actions and one large action; only listed owners have exclusives',()=>{for(const type of LEARNING_TROOPS){const p=tacticPools(type);assert.equal(p.low.length,2);assert.equal(p.high.length,1);}assert.equal(SPECIAL_TACTICS.jin,undefined);assert.ok(SPECIAL_TACTICS.cao);});
test('learned loadouts persist, ordering works and unlearned additions fail without mutation',()=>{
  const state=newGame(),u=state.armies[0].units[0],ids=unitTactics(u).map(s=>s.id),reversed=[...ids].reverse();
  assert.equal(configureUnitTactics(state,u.id,reversed),null);assert.deepEqual(u.tactics,reversed);
  for(const bad of [[...ids,...ids],['fire'],['terror'],['not-a-tactic']])assert.ok(configureUnitTactics(state,u.id,bad));
  const resumed=validateSave(structuredClone(state));orderArmy(resumed,'a1','guandu');advanceTurn(resumed);startBattle(resumed);
  const a=resumed.battle.sides[0].units[0];assert.deepEqual(a.tactics,reversed);
  lockDeployment(resumed.battle);assert.ok(configureUnitTactics(resumed,a.id,ids));
  const broken=structuredClone(resumed);broken.armies[0].units[0].tactics=['fire','doubt','ward'];assert.throws(()=>validateSave(broken));
  const x=scenario('spear','ward');x.a.skillReady={};x.d.x=5;assert.equal(readyTactic(x.b,x.a,1).skill.id,'ward');
});

test('force and intellect fixed actions use distinct authored power channels',()=>{for(const [id,type,attr]of [['repeat','crossbow','martialPower'],['tremor','siege','strategyPower']]){const x=currentBattle(id,type);x.target.x=6;x.rear.x=13;x.rear.y=7;assert.equal(TACTICS_BOOK[id].power.attribute,attr);readyCurrent(x,id);stepBattle(x.b);assert.equal(x.u.tacticCasts[id],1);assert.ok(x.target.hp<x.target.maxHp);resumeCurrent(x);}});
test('confusion and seal block an actual fixed tactic while seal still permits basic attacks',()=>{for(const status of ['confuse','seal']){const x=currentBattle('thrust','spear');setStatus(x.b,x.u,status,10);readyCurrent(x,'thrust');x.u.cooldown=0;stepBattle(x.b);assert.equal(x.u.tacticCasts.thrust||0,0);assert.equal(x.b.effects.some(e=>e.from===x.u.id&&!e.skill&&e.damage>0),status==='seal');}});
test('current rally restores actual intent and ward taunts a legal nearby enemy',()=>{const r=currentBattle('rally','archer');readyCurrent(r,'rally');stepBattle(r.b);assert.ok(r.ally.intent>0);resumeCurrent(r);let applied=false;for(let seed=1;seed<=30&&!applied;seed++){const w=currentBattle('ward','spear',{seed});readyCurrent(w,'ward');stepBattle(w.b);assert.equal(w.u.tacticCasts.ward,1);applied=w.b.sides[1].units.some(u=>u.statuses.taunt?.sourceId===w.u.id);resumeCurrent(w);}assert.ok(applied);});
test('current cavalry harassment suppresses the real target without granting retired lure',()=>{const x=currentBattle('harass','cavalry');x.target.intent=80;readyCurrent(x,'harass');stepBattle(x.b);assert.ok(x.target.intent<80);assert.ok(hasStatus(x.b,x.target,'disrupted'));assert.equal(x.u.tactics.includes('lure'),false);resumeCurrent(x);});
test('area dispel and speed preserve real tactic cooldowns and persist across current saves',()=>{
 const state=encounter('person-290','person-366'),b=state.battle;lockDeployment(b);const u=b.sides[0].units[0],skill=unitTactics(u)[0].id;
 setStatus(b,u,'confuse',20);setStatus(b,u,'burn',20,{amount:20,sourceId:b.sides[1].units[0].id});u.skillReady[skill]=20;
 b.commandProgress=12000;assert.equal(issueCommand(b,'cleanse',{x:u.x,y:u.y}),null);assert.equal(u.statuses.confuse,undefined);assert.equal(u.statuses.burn,undefined);assert.ok(hasStatus(b,u,'resolve'));assert.equal(u.skillReady[skill],20);
 b.commandProgress=12000;assert.equal(issueCommand(b,'swift',{x:u.x,y:u.y}),null);assert.equal(b.commandProgress,0);assert.ok(hasStatus(b,u,'rapidAdvance'));assert.equal(u.skillReady[skill],20);
 const copy=validateSave(structuredClone(syncFixtureLearning(state)));assert.deepEqual(copy.battle,b);
});
test('ordinary blockade delays replacement until its actual saved expiry',()=>{
 const state=encounter('person-264','jia'),b=state.battle;lockDeployment(b);
 b.commandProgress=12000;assert.equal(issueCommand(b,'blockade'),null);
 const dead=b.sides[1].units.find(u=>u.status==='active');dead.hp=0;dead.battleDamage=dead.initial;dead.status='defeated';stepBattle(b);
 assert.equal(b.sides[1].units.filter(u=>u.status==='active').length,5);const copy=validateSave(structuredClone(syncFixtureLearning(state)));
 while(b.tick<b.sides[1].blockadeUntil){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 assert.equal(b.sides[1].units.filter(u=>u.status==='active').length,6);
});
test('mixed-loadout simulation saves and resumes deterministically with all new status shapes',()=>{
  const state=encounter();
  for(const side of state.battle.sides)for(const u of side.units)learnFixtureTactics(u,defaultTacticIds(u,'intellect'));
  for(let i=0;i<35;i++)stepBattle(state.battle);
  const copy=validateSave(structuredClone(syncFixtureLearning(state)));
  for(let i=0;i<25;i++){stepBattle(state.battle);stepBattle(copy.battle);}
  assert.deepEqual(state.battle,copy.battle);
  while(!state.battle.result){stepBattle(state.battle);validateSave(structuredClone(syncFixtureLearning(state)));}
  assert.ok(state.battle.tick<=240);
});
