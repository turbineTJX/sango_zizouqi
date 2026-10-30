import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleTransitionReader} from '../battle-transition-events.mjs';
import {BattleTransitions,transitionFrame} from '../battle-transitions.mjs';
import {BattleAudioReader} from '../audio-events.mjs';
import {BattleArt} from '../art-battle.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';

const unit=(id,side=0,status='active')=>({id,name:id,side,status,x:side?12:1,y:3,hp:100,maxHp:100,type:'spear',statuses:{}});
const battle=()=>({id:'transitions',tick:1,deploymentLocked:true,effects:[],sides:[{units:[unit('own'),unit('reserve',0,'reserve')]},{units:[unit('enemy',1)]}]});

test('both factions distinguish actual defeat, retreat, departure and reserve entry without replay',()=>{
 for(const side of [0,1]){
  const b=battle(),reader=new BattleTransitionReader(),u=b.sides[side].units[0];
  assert.deepEqual(reader.read(b),[]);u.withdrawing=true;
  assert.deepEqual(reader.read(b).map(e=>e.kind),['retreat']);assert.deepEqual(reader.read(b),[]);
  u.status='withdrawn';b.tick++;
  assert.deepEqual(reader.read(b).map(e=>e.kind),['exit']);
  const reserve=unit('arrived',side,'reserve');b.sides[side].units.push(reserve);reader.read(b);
  reserve.status='active';assert.deepEqual(reader.read(b).map(e=>e.kind),['entry']);
  reserve.hp=0;reserve.status='defeated';assert.deepEqual(reader.read(b).map(e=>e.kind),['rout']);
  assert.deepEqual(reader.read(b),[]);assert.deepEqual(reader.read(structuredClone(b)),[]);
 }
});

test('hidden units, decoys, initial deployment and paused historical snapshots do not announce changes',()=>{
 const b=battle(),reader=new BattleTransitionReader(),enemy=b.sides[1].units[0];
 enemy.statuses.stealth={until:100};reader.read(b);enemy.withdrawing=true;
 assert.deepEqual(reader.read(b),[]);delete enemy.statuses.stealth;assert.deepEqual(reader.read(b),[]);
 enemy.isDecoy=true;enemy.hp=0;enemy.status='defeated';assert.deepEqual(reader.read(b),[]);
 b.sides[0].units[1].status='active';assert.deepEqual(reader.read(b,{silent:true}),[]);assert.deepEqual(reader.read(b),[]);
 b.tick=0;assert.deepEqual(reader.read(b),[]);
 const initial=battle();initial.deploymentLocked=false;reader.read(initial);initial.sides[0].units[1].status='active';
 assert.deepEqual(reader.read(initial),[]);initial.deploymentLocked=true;assert.deepEqual(reader.read(initial),[]);
 reader.read(null);assert.deepEqual(reader.read(b),[]);
});

test('defeat dust, falling body and sound start on the actual fatal hit, with a visible tail',()=>{
 const b=battle(),transitions=new BattleTransitions(),audio=new BattleAudioReader();transitions.update(b,[],0);audio.read(b);
 const u=b.sides[1].units[0];u.status='defeated';u.hp=0;b.tick++;
 const actions=[{start:100,duration:1000,events:[{to:u.id,defeated:true}]},{start:1200,duration:1000,events:[{to:u.id,damage:0}]}];
 const before=JSON.stringify(b);transitions.update(b,actions,100);
 const e=transitions.items[0];assert.equal(e.start,620);assert.equal(e.duration,1150);assert.ok(e.end>actions[0].start+actions[0].duration);
 assert.equal(transitions.forUnit(u.id,619),undefined);assert.equal(transitions.forUnit(u.id,620),e);
 assert.equal(audio.read(b)[0].transition,'rout');assert.deepEqual(audio.read(b),[]);
 transitions.update(b,actions,700);assert.equal(transitions.items.length,1);assert.equal(JSON.stringify(b),before);
});

test('entry and exit walk in opposite directions, reduced motion stays still and positions settle exactly',()=>{
 for(const side of [0,1])for(const kind of ['entry','exit']){
  const e={side,kind,start:100,duration:1000,end:1100};
  const first=transitionFrame(e,100),middle=transitionFrame(e,600),last=transitionFrame(e,1100);
  assert.ok(first.walking&&middle.walking);assert.ok(middle.opacity>0&&middle.opacity<=1);
  assert.equal(transitionFrame(e,600,{reduced:true}).offsetX,0);assert.equal(transitionFrame(e,600,{reduced:true}).walking,false);
  if(kind==='entry'){assert.equal(last.offsetX,0);assert.equal(last.opacity,1);assert.ok(Math.abs(first.offsetX)>.9);}
  else {assert.equal(first.offsetX,0);assert.equal(last.opacity,0);}
  const art=Object.create(BattleArt.prototype),u={id:'u',pos:{x:.5,y:.5}};
  Object.assign(art,{reduced:{matches:false},fx:{clock:600,transitions:{forUnit:()=>e},actions:[]}});
  const before=structuredClone(u);assert.equal(art.position(u).x,.5+middle.offsetX/14.5);assert.deepEqual(u,before);
 }
});

test('withdrawal and simultaneous support entries have distinct, bounded sound signals',()=>{
 const b=battle(),audio=new BattleAudioReader();audio.read(b);
 b.sides[0].retreat=true;
 assert.deepEqual(audio.read(b).map(c=>c.key),['retreat']);
 b.sides[0].units[0].status='withdrawn';assert.deepEqual(audio.read(b).map(c=>c.key),['withdraw']);
 b.sides[0].retreat=false;b.sides[0].units[1].status='active';b.sides[1].units.push(unit('new',1));
 const cues=audio.read(b);assert.equal(cues.filter(c=>c.key==='reinforcement').length,1);assert.ok(cues.length<=3);
});

test('observing real battles leaves simulation, save state and deterministic continuation unchanged',()=>{
 const state=createScenario('custom-battle',20261028),copy=structuredClone(state),reader=new BattleTransitionReader();
 reader.read(state.battle);lockDeployment(state.battle);lockDeployment(copy.battle);
 const heard=new Set();
 for(let i=0;i<600&&!state.battle.result;i++){
  stepBattle(state.battle);stepBattle(copy.battle);const before=JSON.stringify(state);
  for(const e of reader.read(state.battle))heard.add(e.kind);
  assert.deepEqual(reader.read(state.battle),[]);assert.equal(JSON.stringify(state),before);
 }
 assert.ok(heard.has('rout'));assert.deepEqual(state,copy);
});
