import {RULES_VERSION} from '../combat-rules.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {COMBAT,activeUnits,battleStratagems,issueCommand,lockDeployment,stepBattle,unitAttributes,validateSave} from '../engine.mjs';
import {TACTICS_BOOK,configureTactics,hasStatus,readyTactic,unitTactics} from '../tactics.mjs';
import {hexDistance} from '../hex-grid.mjs';

function duel() {
  const state=createScenario('field',1),b=state.battle;
  const a=b.sides[0].units[0],d=b.sides[1].units[0];
  b.sides[0].units=[a];b.sides[1].units=[d];lockDeployment(b);
  Object.assign(a,{x:5,y:4,intent:0,cooldown:0});Object.assign(d,{x:6,y:4,intent:0,cooldown:999});
  for(const u of [a,d])u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));
  return {state,b,a,d};
}

test('intent cap permits every tactic but a capped enemy loses high-threshold access after demoralize',()=>{
  assert.equal(COMBAT.intentCap,100);
  assert.ok(Object.values(TACTICS_BOOK).every(s=>s.threshold<=COMBAT.intentCap));
  const {b,a,d}=duel();configureTactics(d,['strike','phalanx','press']);d.skillReady={};
  a.intent=d.intent=COMBAT.intentCap;b.commandProgress=12000;
  assert.equal(readyTactic(b,d,1).skill.id,'strike');
  assert.equal(issueCommand(b,'demoralize'),null);assert.equal(d.intent,55);
  assert.notEqual(readyTactic(b,d,1)?.skill.id,'strike');
  for(let i=0;i<4;i++) {b.commandProgress=12000;b.commandReady.inspire=0;assert.equal(issueCommand(b,'inspire'),null);assert.equal(a.intent,100);}
});

test('only the current rule version loads, and intent is validated without normalization',()=>{
  const state=createScenario('field');assert.deepEqual(validateSave(structuredClone(state)),state);
  for(const version of [undefined,3,4,5,6,7,RULES_VERSION+1]){const s=structuredClone(state);s.rulesVersion=version;assert.throws(()=>validateSave(s),/规则版本/);}
  for(const intent of [-1,1.5,101,160]){const s=structuredClone(state);s.battle.sides[0].units[0].intent=intent;assert.throws(()=>validateSave(s),/战意/);}
});

test('spearmen close the gap instead of immobilizing outside attack range',()=>{
  const {b,a,d}=duel();d.type='archer';d.x=7;
  configureTactics(a,['phalanx','thrust','strike']);a.skillReady={};a.intent=65;
  stepBattle(b);assert.equal(hasStatus(b,a,'phalanx'),false);assert.equal(hexDistance(a,d),1);
  stepBattle(b);assert.ok(hasStatus(b,a,'phalanx'));
});

test('ready basic attacks hit an adjacent target rather than chasing a distant counter',()=>{
  const {b,a,d}=duel(),far={...structuredClone(d),id:'far',type:'cavalry',x:7,hp:260};
  b.sides[1].units.push(far);stepBattle(b);
  assert.ok(b.effects.some(e=>e.from===a.id&&e.to===d.id&&e.damage>0));assert.equal(a.x,5);assert.equal(a.y,4);
});

test('full troop size affects actual damage and one surviving soldier no longer retains half power',()=>{
  function damage(hp){const {b,a,d}=duel();a.hp=a.maxHp=a.initial=hp;const before=d.hp;stepBattle(b);return before-d.hp;}
  assert.ok(damage(3000)>damage(1800));assert.ok(damage(1)<damage(3000)*.1);
  const {a,b}=duel();assert.equal(unitAttributes({...a,hp:0},b).strength,0);
});

test('low-threshold pressure builds shared stacks with real stat changes, capped at three and saved',()=>{
  for(const [id,type,key,stat] of [['press','spear','press','defense'],['harry','crossbow','harry','attack']]) {
    const state=createScenario('field',7),b=state.battle;
    const attackers=b.sides[0].units.filter(u=>['cao','chu','dun'].includes(u.id)),d=b.sides[1].units[0];
    b.sides[0].units=attackers;b.sides[1].units=[d];lockDeployment(b);
    Object.assign(d,{x:5,y:3,intent:0,cooldown:999});d.skillReady=Object.fromEntries(unitTactics(d).map(s=>[s.id,999]));
    attackers.forEach((u,i)=>{
      Object.assign(u,{type,x:[4,5,5][i],y:[3,2,4][i],intent:TACTICS_BOOK[id].threshold,cooldown:999});
      configureTactics(u,type==='spear'?[id,'thrust','strike']:[id,'repeat','seal']);
      u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,s.id===id?0:999]));
    });
    const before=unitAttributes(d,b)[stat];stepBattle(b);
    assert.equal(d.statuses[key].stacks,3);assert.ok(Math.abs(unitAttributes(d,b)[stat]/before-.88)<1e-9);
    assert.ok(attackers.every(u=>u.tacticCasts[id]===1),'20/25 intent must suffice');
    attackers[0].skillReady[id]=0;stepBattle(b);assert.equal(d.statuses[key].stacks,3);
    const restored=validateSave(structuredClone(state));assert.deepEqual(restored.battle,b);
    const broken=structuredClone(state);broken.battle.sides[1].units[0].statuses[key].stacks=4;assert.throws(()=>validateSave(broken));
    for(const u of attackers)u.skillReady[id]=999;
    b.tick=d.statuses[key].until-1;stepBattle(b);assert.equal(hasStatus(b,d,key),false);
  }
});

test('low-threshold stacks cleanse normally and never indefinitely block a higher priority tactic',()=>{
  const {b,a,d}=duel();configureTactics(a,['strike','phalanx','press']);a.skillReady={};a.intent=20;
  stepBattle(b);assert.equal(a.tacticCasts.press,1);
  a.intent=100;a.skillReady.press=0;stepBattle(b);assert.equal(a.tacticCasts.strike,1);
  // Give the existing advisor a cleanse command without changing battle resources.
  b.sides[0].commanders=[{id:'yu'}];a.statuses.press={until:99,stacks:3};a.statuses.harry={until:99,stacks:2};b.commandProgress=12000;
  assert.equal(issueCommand(b,'cleanse'),null);assert.equal(a.statuses.press,undefined);assert.equal(a.statuses.harry,undefined);
});

test('trial loadouts include early pressure and the advertised support commands are unlocked',()=>{
  for(const c of SCENARIOS)for(const u of createScenario(c.id).battle.sides.flatMap(s=>s.units)) {
    const skills=unitTactics(u);assert.ok(skills.some(s=>s.threshold<=25));assert.ok(skills.some(s=>s.threshold>=60));
  }
  assert.ok(battleStratagems(createScenario('outnumbered').battle).includes('heal'));
  for(const id of ['rotation','defense'])for(const command of ['heal','regenerate','relief'])assert.ok(battleStratagems(createScenario(id).battle).includes(command));
});

test('siege defenders hold their rear line before enemies approach',()=>{
  for(const id of ['siege','defense']) {
    const b=createScenario(id).battle,side=b.siege.gate.side;
    for(let i=0;i<3;i++){stepBattle(b);assert.ok(activeUnits(b,side).every(u=>side===0?u.x<=4:u.x>=9));}
  }
});
