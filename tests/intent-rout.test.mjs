import test from 'node:test';
import assert from 'node:assert/strict';
import {currentBattle,resumeCurrent,tacticHolder} from './helpers/current-battle.mjs';
import {stepBattle,lockDeployment,validateSave} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {setStatus,unitTactics} from '../tactics.mjs';
import {INTENT_STATE} from '../combat-rules.mjs';

function routScene(side=0){
 const own=[['cao','spear'],['jia','crossbow'],['yu','crossbow']],enemy=[['shao','halberd'],['tian','archer']];
 const team=xs=>xs.map(([id,type])=>({id,type,troops:3000,level:1,retreatAt:null}));
 const state=createScenario('custom-battle',971001,null,null,{seed:971001,terrain:'land',ownTeam:team(side?enemy:own),enemyTeam:team(side?own:enemy)}),b=state.battle;lockDeployment(b);
 const [victim,near,far]=b.sides[side].units,[attacker,rear]=b.sides[1-side].units;
 for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.intent=50;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 Object.assign(victim,{x:5,y:3,hp:1,battleDamage:2999});Object.assign(near,{x:4,y:3});Object.assign(far,{x:0,y:0});Object.assign(attacker,{x:6,y:3,cooldown:0});Object.assign(rear,{x:13,y:7});
 return {state,b,victim,near,far,attacker,rear};
}

test('nonfatal direct hits retain reduced income while elapsed time never adds or subtracts intent',()=>{
 for(const shield of [false,true]){
  const x=currentBattle('fire','crossbow');x.target.intent=50;x.u.cooldown=0;x.rear.x=13;
  if(shield)setStatus(x.b,x.target,'shield',20,{amount:9999,source:'test'});
  stepBattle(x.b);assert.equal(x.target.intent,shield?50:52);
  x.u.cooldown=999;const before=x.target.intent;for(let i=0;i<12;i++)stepBattle(x.b);assert.equal(x.target.intent,before);
  resumeCurrent(x);
 }
});

test('a real defeat shocks only surviving field allies on either side, with stronger nearby loss',()=>{
 for(const side of [0,1]){
  const x=routScene(side);stepBattle(x.b);
  assert.equal(x.victim.status,'defeated');assert.equal(x.victim.intentRoutApplied,true);
  assert.equal(x.near.intent,50-INTENT_STATE.defeatLoss-INTENT_STATE.nearbyDefeatLoss);
  assert.equal(x.far.intent,50-INTENT_STATE.defeatLoss);
  assert.equal(x.rear.intent,50);assert.equal(x.b.effects.filter(e=>e.label==='友军溃败').length,2);
  x.attacker.cooldown=999;const saved=validateSave(structuredClone(x.state));
  for(let i=0;i<12;i++){stepBattle(x.b);stepBattle(saved.battle);assert.deepEqual(saved.battle,x.b);assert.ok(!x.b.effects.some(e=>e.label==='友军溃败'));}
  const invalid=structuredClone(x.state);invalid.battle.sides[side].units[0].intentRoutApplied='yes';assert.throws(()=>validateSave(invalid),/溃败战意/);
 }
});

test('ongoing damage can cause one defeat shock but never subtracts intent merely for injury',()=>{
 const x=routScene();x.attacker.cooldown=999;Object.assign(x.victim,{hp:2,battleDamage:2998});
 setStatus(x.b,x.victim,'burn',6,{amount:1,sourceId:x.attacker.id,sourceName:x.attacker.name,sourceSkillName:'测试灼烧'});
 stepBattle(x.b);assert.equal(x.victim.hp,1);assert.equal(x.victim.intent,50);assert.equal(x.near.intent,50);
 stepBattle(x.b);assert.equal(x.victim.status,'defeated');assert.equal(x.near.intent,20);assert.equal(x.far.intent,30);
 const saved=validateSave(structuredClone(x.state));for(let i=0;i<4;i++){stepBattle(x.b);stepBattle(saved.battle);}assert.deepEqual(saved.battle,x.b);
});

test('withdrawal and manually preexisting defeat never manufacture a new shock',()=>{
 for(const withdrawn of [false,true]){
  const x=routScene();x.attacker.cooldown=999;
  if(withdrawn)Object.assign(x.victim,{x:0,withdrawing:true});else Object.assign(x.victim,{status:'defeated',hp:0});
  stepBattle(x.b);assert.equal(x.near.intent,50);assert.equal(x.far.intent,50);assert.ok(!x.b.effects.some(e=>e.label==='友军溃败'));
  assert.equal(x.victim.intentRoutApplied,false);
 }
});

test('multiple real defeats in one legal cleave apply once each after its damage batch',()=>{
 const id=tacticHolder('cleave','halberd',['shao','yan','wen']),ids=['shao','yan','wen'];
 const entry=(id,type)=>({id,type,troops:3000,level:1,retreatAt:null});
 const state=createScenario('custom-battle',971002,null,null,{seed:971002,terrain:'land',ownTeam:[entry(id,'halberd')],enemyTeam:ids.map(id=>entry(id,'spear'))}),b=state.battle;lockDeployment(b);
 const u=b.sides[0].units[0],[a,d,far]=b.sides[1].units;
 for(const v of [u,a,d,far]){v.intent=50;v.cooldown=999;v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));}
 Object.assign(u,{x:4,y:3,intent:100});u.skillReady.cleave=0;
 Object.assign(a,{x:5,y:3,hp:1,battleDamage:2999});Object.assign(d,{x:4,y:2,hp:1,battleDamage:2999});Object.assign(far,{x:13,y:7});
 stepBattle(b);assert.equal(u.tacticCasts.cleave,1);assert.equal(a.status,'defeated');assert.equal(d.status,'defeated');assert.equal(far.intent,10);
 const events=b.effects.filter(e=>e.label==='友军溃败');assert.equal(events.length,2);assert.ok(b.effects.indexOf(events[0])>b.effects.findLastIndex(e=>e.label==='浴血横扫'));
 validateSave(structuredClone(state));
});
