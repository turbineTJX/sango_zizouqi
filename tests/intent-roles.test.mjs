import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,makeOfficer,validateSave,issueCommand} from '../engine.mjs';
import {intentIncome,hasPassive,skillRoute} from '../passives.mjs';
import {configureTactics,unitTactics,roleTacticIds,setStatus} from '../tactics.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {world,fixture} from '../scripts/balance-v14-lib.mjs';

function duel(type='crossbow',id='tester',level=1){
 const b=createScenario(type==='ship'?'river':'field',751).battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
 b.sides[0].units=[a];b.sides[1].units=[d];
 for(const [u,name,x] of [[a,id,4],[d,'victim',5]]){
  Object.assign(u,{id:name,level:u===a?level:1,type,x,y:3,hp:3000,maxHp:3000,initial:3000,battleDamage:0,healed:0,intent:0,statuses:{},cooldown:999});
  configureTactics(u,roleTacticIds(u,'assault'));u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));
 }
 if(type==='siege')d.x=6;
 lockDeployment(b);return {b,a,d};
}

test('all eight troops use their actual basic and surviving-hit income, with no timed regeneration',()=>{
 const expected={spear:[6,7],halberd:[5,8],cavalry:[10,3],archer:[6,3],crossbow:[10,3],logistics:[10,4],siege:[11,2],ship:[8,5]};
 for(const [type,[attack,hit]]of Object.entries(expected)){
  const {b,a,d}=duel(type);a.cooldown=0;stepBattle(b);assert.equal(a.intent,attack,type);assert.equal(d.intent,hit,type);
  a.cooldown=999;for(let i=0;i<4;i++)stepBattle(b);assert.equal(a.intent,attack);assert.equal(d.intent,hit);
 }
});

test('interdict unlocks at eight and prevents the entire normal hit award, including endurance',()=>{
 for(const level of [7,8]){
  const {b,a,d}=duel('crossbow','liao',level);d.id='dun';d.level=3;d.type='spear';configureTactics(d,['thrust','phalanx','strike']);d.skillReady={thrust:999,phalanx:999,strike:999};
  a.cooldown=0;stepBattle(b);assert.equal(a.intent,12);assert.equal(d.intent,level===8?0:9);
  assert.equal(b.effects.find(e=>e.from===a.id).intentDenied,level===8?9:undefined);
  a.cooldown=999;d.cooldown=0;stepBattle(b);assert.equal(d.intent,level===8?6:15,'the target can generate intent through its own attack');
 }
});

test('stifle suppresses every victim once per damage tactic and does not suppress normal attacks',()=>{
 for(const level of [7,8]){
  const {b,a,d}=duel('crossbow','jia',level);primeTactic(a,'repeat');stepBattle(b);
  assert.equal(a.intent,40);assert.equal(d.intent,level===8?0:3);
  assert.equal(b.effects.filter(e=>e.intentDenied).length,level===8?1:0);
  a.cooldown=0;stepBattle(b);assert.equal(d.intent,level===8?3:6);
 }
 const {b,a,d}=duel('archer','jia',8),other={...structuredClone(d),id:'second',y:4};b.sides[1].units.push(other);
 primeTactic(a,'scatter');stepBattle(b);assert.equal(d.intent,0);assert.equal(other.intent,0);assert.equal(b.effects.filter(e=>e.intentDenied).length,2);
});

test('ordinary routes gain suppression and retain it after troop changes; named officers trade an existing node',()=>{
 const archer={...makeOfficer('person-46'),level:8},scholar={...makeOfficer('person-447'),level:8};
 assert.ok(hasPassive(archer,'interdict'));assert.ok(hasPassive(scholar,'stifle'));
 assert.deepEqual(skillRoute({...archer,type:'cavalry'}),skillRoute(archer));
 for(const id of ['liao','person-119'])assert.ok(hasPassive({...makeOfficer(id),level:8},'interdict'));
 for(const id of ['jia','person-226'])assert.ok(hasPassive({...makeOfficer(id),level:8},'stifle'));
 assert.deepEqual(intentIncome({...archer,type:'cavalry'}),{attack:12,hit:3});
});

test('denial neither drains stored intent nor blocks explicit support or fully shielded attacks',()=>{
 const {b,a,d}=duel('crossbow','liao',8);d.intent=19;a.cooldown=0;stepBattle(b);assert.equal(d.intent,19);
 a.cooldown=0;setStatus(b,d,'shield',10,{amount:1000,source:'test'});stepBattle(b);assert.equal(d.intent,19);assert.ok(!b.effects.some(e=>e.intentDenied));
 const s=createScenario('field'),battle=s.battle;lockDeployment(battle);battle.commandProgress=12000;
 const before=battle.sides[0].units.map(u=>u.intent);assert.equal(issueCommand(battle,'inspire'),null);
 battle.sides[0].units.forEach((u,i)=>assert.equal(u.intent,Math.min(100,before[i]+35)));
});

test('two dedicated suppressors can deny casting for the whole fight through real repeated attacks and harass',async()=>{
 const w=await world(),runs=[];
 for(const level of [7,8]){
  const attackers=['liao','person-119'].map(id=>({...w.makeOfficer(id),type:'cavalry',tactics:['harass','gallop','relay']}));
  const defender={...w.makeOfficer('gao'),type:'spear',tactics:['phalanx','ward','cleanse']};
  const b=fixture(w,attackers,[defender],'compact',8,211),target=b.sides[1].units[0];
  // Only the two attackers cross the level-eight interdict node; defender and stats stay fixed.
  b.sides[0].units.forEach(u=>u.level=level);w.lockDeployment(b);let maxIntent=0,denied=0;
  while(!b.result){w.stepBattle(b);maxIntent=Math.max(maxIntent,target.intent);denied+=b.effects.filter(e=>e.intentDenied).length;}
  runs.push({casts:target.skillCasts,maxIntent,denied,ticks:b.tick});
  assert.ok(b.sides[0].units.every(u=>u.tacticCasts.harass>=3),'repeated real suppressing tactics, not an injected lock');
 }
 assert.ok(runs[0].casts>=3);assert.equal(runs[1].casts,0);assert.ok(runs[1].ticks>=80);
 assert.ok(runs[1].maxIntent<35);assert.ok(runs[1].denied>=20);
});

test('current suppression routes and troop incomes survive deterministic battle continuation',()=>{
 const state=createScenario('officer-lab',834,0,['liao','jia','person-119','person-226','person-46','person-447']),b=state.battle;
 lockDeployment(b);let denied=0;for(let i=0;i<30;i++){
  stepBattle(b);denied+=b.effects.filter(e=>e.intentDenied).length;
  if(b.effects.some(e=>e.intentDenied)){
   validateSave(structuredClone(state));
   const bad=structuredClone(state);bad.battle.effects.find(e=>e.intentDenied).intentDenied=-1;
   assert.throws(()=>validateSave(bad),/战意压制/);
  }
 }
 assert.ok(denied>0);const resumed=validateSave(structuredClone(state));
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}assert.deepEqual(resumed.battle,b);
});
