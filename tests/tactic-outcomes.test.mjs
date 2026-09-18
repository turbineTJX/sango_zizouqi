import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave} from '../engine.mjs';
import {configureTactics,setStatus,shieldAmount} from '../tactics.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {outcomeLines} from '../tactic-outcomes.mjs';

function scene(type='crossbow'){
  const state=createScenario('field',71),b=state.battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
  b.sides[0].units=[a];b.sides[1].units=[d];
  Object.assign(a,{type,x:4,y:3,cooldown:999,intent:0});
  Object.assign(d,{x:5,y:3,cooldown:999,intent:0,skillReady:Object.fromEntries(d.tactics.map(id=>[id,999]))});
  lockDeployment(b);return {state,b,a,d};
}
test('multi-hit results equal actual casualties and shield absorption, with no double counting',()=>{
  const {b,a,d}=scene();setStatus(b,d,'shield',10,{amount:40,source:'test'});
  const hp=d.hp;primeTactic(a,'repeat');stepBattle(b);
  const events=b.effects.filter(e=>e.from===a.id&&!e.ongoing),rows=events.find(e=>e.outcome).outcome;
  const target=rows.find(t=>t.id===d.id);
  assert.equal(target.damage,hp-d.hp);assert.equal(target.absorbed,40);
  assert.equal(events.filter(e=>e.outcome).length,1);
  assert.match(outcomeLines(events).join(' '),/实际损兵 .*护盾吸收 40/);
});
test('remaining shield after a hit is not misreported as a newly granted shield',()=>{
  const {b,a,d}=scene();setStatus(b,d,'shield',10,{amount:2000,source:'test'});
  primeTactic(a,'repeat');stepBattle(b);
  const target=b.effects.find(e=>e.outcome).outcome.find(t=>t.id===d.id);
  assert.equal(target.damage,0);assert.ok(target.absorbed>0);assert.ok(shieldAmount(b,d)>0);
  assert.ok(!target.changes.some(s=>s.startsWith('护盾 ')));
});
test('mixed damage and control report actual duration; resisted control is not claimed',()=>{
  for(const protectedTarget of [false,true]){
    const {b,a,d}=scene('spear');
    if(protectedTarget)setStatus(b,d,'resolve',20);
    primeTactic(a,'doubt');const hp=d.hp;stepBattle(b);
    const target=b.effects.find(e=>e.outcome).outcome.find(t=>t.id===d.id);
    assert.equal(target.damage,hp-d.hp);
    const roll=b.effects.find(e=>e.resolution?.effect==='confuse').resolution;
    assert.equal(target.changes.some(t=>t.startsWith('混乱（')),roll.success);
    if(protectedTarget)assert.ok(target.changes.some(t=>t.startsWith('混乱免疫')));
    if(roll.success)assert.ok(target.changes.some(t=>t.includes(`（${d.statuses.confuse.until-b.tick-1}步）`)));
    else if(!protectedTarget)assert.ok(target.changes.some(t=>t.startsWith('混乱未成功')));
  }
});
test('healing results use wounded budget and show actual shield separately',()=>{
  const {b,a}=scene();a.hp-=400;a.battleDamage=400;
  primeTactic(a,'screen');const hp=a.hp;stepBattle(b);
  const target=b.effects.find(e=>e.outcome).outcome.find(t=>t.id===a.id);
  assert.equal(target.healing,a.hp-hp);assert.equal(target.healing,140);
  assert.ok(target.changes.some(t=>t.startsWith(`护盾 ${shieldAmount(b,a)}`)));
  assert.equal(target.damage,0);
});
test('current save preserves result records and deterministic continuation; malformed results are rejected',()=>{
  const state=createScenario('field',19),b=state.battle;lockDeployment(b);
  while(!b.effects.some(e=>e.outcome)&&!b.result)stepBattle(b);
  assert.ok(b.effects.some(e=>e.outcome));
  const resumed=validateSave(structuredClone(state));
  const bad=structuredClone(state);bad.battle.effects.find(e=>e.outcome).outcome[0].damage=-1;
  assert.throws(()=>validateSave(bad),/战法结算/);
  while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
  assert.deepEqual(resumed.battle,b);
});
