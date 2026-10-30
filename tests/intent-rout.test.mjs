import test from 'node:test';
import assert from 'node:assert/strict';
import {currentBattle,resumeCurrent,tacticHolder} from './helpers/current-battle.mjs';
import {stepBattle,lockDeployment,validateSave,reserveDeploymentUnit} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {setStatus,unitTactics} from '../tactics.mjs';
import {INTENT_STATE} from '../combat-rules.mjs';
import {deployBattleUnit} from '../battle-deployment.mjs';

function routScene(side=0,troops=[3000,3000,3000]){
 const own=[['cao','spear'],['jia','crossbow'],['yu','crossbow']],enemy=[['shao','halberd'],['tian','archer']];
 const team=xs=>xs.map(([id,type],i)=>({id,type,troops:xs===own?troops[i]:3000,level:1,retreatAt:null}));
 const state=createScenario('custom-battle',971001,null,null,{seed:971001,terrain:'land',ownTeam:team(side?enemy:own),enemyTeam:team(side?own:enemy)}),b=state.battle;lockDeployment(b);
 const [victim,near,far]=b.sides[side].units,[attacker,rear]=b.sides[1-side].units;
 for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.intent=50;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 Object.assign(victim,{x:5,y:3,hp:1,battleDamage:victim.initial-1});Object.assign(near,{x:4,y:3});Object.assign(far,{x:0,y:0});Object.assign(attacker,{x:6,y:3,cooldown:0});Object.assign(rear,{x:13,y:7});
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

test('rout losses use initial relative size with a quarter floor and full-loss ceiling on both sides',()=>{
 for(const side of [0,1])for(const [troops,nearLoss,farLoss]of [
  [[1000,4000,4000],10,7],[[2000,3500,3500],20,13],[[3000,3000,3000],30,20],
  [[5000,2000,2000],30,20],[[1000,5500,6500],8,5],
 ]){
  const x=routScene(side,troops);stepBattle(x.b);
  assert.equal(x.victim.status,'defeated');assert.equal(x.near.intent,50-nearLoss);assert.equal(x.far.intent,50-farLoss);
  assert.equal(x.victim.intentRoutApplied,true);assert.equal(x.rear.intent,50);
  x.attacker.cooldown=999;const copy=validateSave(structuredClone(x.state));
  for(let n=0;n<4;n++){stepBattle(x.b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,x.b);
  assert.equal(x.near.intent,50-nearLoss);assert.equal(x.far.intent,50-farLoss);
 }
});

test('consecutive small defeats retain fallen starters in the fixed initial average across save and resume',()=>{
 for(const side of [0,1]){
  const x=routScene(side,[1000,1000,6000]);x.attacker.cooldown=999;x.far.intent=80;
  const burn=u=>setStatus(x.b,u,'burn',6,{amount:10,sourceId:x.attacker.id,sourceName:x.attacker.name,sourceSkillName:'测试灼烧'});
  burn(x.victim);stepBattle(x.b);assert.equal(x.victim.status,'defeated');assert.equal(x.far.intent,72);
  const bad=structuredClone(x.state);bad.battle.sides[side].bondReserve.starters=bad.battle.sides[side].bondReserve.starters.filter(id=>id!==x.victim.id);assert.throws(()=>validateSave(bad));
  Object.assign(x.near,{hp:1,battleDamage:999});burn(x.near);
  const copy=validateSave(structuredClone(x.state));stepBattle(x.b);stepBattle(copy.battle);
  assert.equal(x.near.status,'defeated');assert.equal(x.far.intent,64);assert.deepEqual(copy.battle,x.b);
  assert.equal(x.b.effects.filter(e=>e.label==='友军溃败').length,1);validateSave(structuredClone(x.state));
 }
});

test('a real reserve uses the original starters average after a starter withdraws',()=>{
 for(const side of [0,1]){
  const team=xs=>xs.map(([id,troops])=>({id,type:'spear',troops,level:10,retreatAt:null}));
  const own=team([['cao',1000],['jia',3000],['yu',5000],['liao',1000]]),enemy=team([['shao',3000],['tian',3000]]);
  const state=createScenario('custom-battle',971003,null,null,{seed:971003,terrain:'land',ownTeam:side?enemy:own,enemyTeam:side?own:enemy}),b=state.battle,army=b.sides[side];
  const [victim,leaving,far,reserve]=army.units;
  assert.equal(reserveDeploymentUnit(b,reserve.id,null,side),null);lockDeployment(b);
  const starterIds=structuredClone(army.bondReserve.starters);
  for(const u of b.sides.flatMap(a=>a.units)){u.cooldown=999;u.intent=80;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));}
  Object.assign(leaving,{x:side?13:0,y:7,retreatAt:leaving.hp});
  for(let n=0;n<50&&!reserve.bondEntry;n++)stepBattle(b,{aiSides:[]});
  assert.equal(leaving.status,'withdrawn');assert.ok(reserve.bondEntry?.tick>0);assert.deepEqual(army.bondReserve.starters,starterIds);
  const attacker=b.sides[1-side].units[0];
  Object.assign(reserve,{x:5,y:3,hp:1,battleDamage:999});Object.assign(far,{x:0,y:0,intent:80});Object.assign(victim,{x:0,y:2});
  setStatus(b,reserve,'burn',6,{amount:10,sourceId:attacker.id,sourceName:attacker.name,sourceSkillName:'测试灼烧'});
  const copy=validateSave(structuredClone(state));stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});
  assert.equal(reserve.status,'defeated');assert.equal(far.intent,73);assert.deepEqual(copy.battle,b);
  const bad=structuredClone(state);bad.battle.sides[side].bondReserve.starters.push(reserve.id);assert.throws(()=>validateSave(bad));
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
 const state=createScenario('custom-battle',971002,null,null,{seed:971002,terrain:'land',ownTeam:[entry(id,'halberd')],enemyTeam:ids.map(id=>entry(id,'spear'))}),b=state.battle;
 // Keep this damage-batch fixture outside all opening formation cells.
 for(const side of [0,1])for(const [i,v]of b.sides[side].units.entries())assert.equal(deployBattleUnit(b,v.id,side?13:0,i,side),null);
 lockDeployment(b);
 const u=b.sides[0].units[0],[a,d,far]=b.sides[1].units;
 for(const v of [u,a,d,far]){v.intent=50;v.cooldown=999;v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));}
 Object.assign(u,{x:4,y:3,intent:100});u.skillReady.cleave=0;
 Object.assign(a,{x:5,y:3,hp:1,battleDamage:2999});Object.assign(d,{x:5,y:2,hp:1,battleDamage:2999});Object.assign(far,{x:13,y:7});
 stepBattle(b);assert.equal(u.tacticCasts.cleave,1);assert.ok(u.tacticAim);stepBattle(b);
 assert.equal(a.status,'defeated');assert.equal(d.status,'defeated');assert.equal(far.intent,10);
 const events=b.effects.filter(e=>e.label==='友军溃败');assert.equal(events.length,2);assert.ok(b.effects.indexOf(events[0])>b.effects.findLastIndex(e=>e.label==='浴血横扫'));
 validateSave(structuredClone(state));
});
