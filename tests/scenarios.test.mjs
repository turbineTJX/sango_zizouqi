import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, createScenario } from '../scenarios.mjs';
import { activeUnits, stepBattle, settleBattle, validateSave, issueCommand, deployUnit, resetDeployment, lockDeployment } from '../engine.mjs';
import { shieldAmount, absorbShield, openCell, routeTo } from '../tactics.mjs';
import { blockedTerrain } from '../battlefield.mjs';

for (const config of SCENARIOS) {
  test(`${config.id}: complete battle, reserves, save recovery and settlement`, () => {
    const state = createScenario(config.id);
    assert.equal(state.battle.sides[0].units.length, config.own);
    assert.equal(state.battle.sides[1].units.length, config.enemy);
    validateSave(structuredClone(state));
    for (let i=0;i<20;i++) stepBattle(state.battle);
    const resumed = validateSave(structuredClone(state));
    while (!state.battle.result) {
      stepBattle(state.battle); stepBattle(resumed.battle);
      for (const side of [0,1]) assert.ok(activeUnits(state.battle,side).length <= 6);
      const live = state.battle.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
      assert.equal(new Set(live.map(u=>`${u.x},${u.y}`)).size, live.length);
      for (const u of live) assert.ok((u.arrivalTick || 0) <= state.battle.tick);
      for (const u of live) assert.ok(!blockedTerrain(state.battle,u.x,u.y));
      validateSave(structuredClone(state));
    }
    assert.deepEqual(state.battle,resumed.battle);
    assert.ok(state.battle.tick <= config.limit);
    const report = settleBattle(state);
    for (const s of report.stats) assert.equal(s.initial,s.remaining+s.wounded+s.killed);
    validateSave(structuredClone(state));
    assert.equal(settleBattle(state),null);
  });
}

test('unarrived waves prevent early victory, arrive on schedule and obey blockade', () => {
  const state = createScenario('reinforcements'), b = state.battle;
  for (const u of activeUnits(b,1)) { u.hp=0; u.battleDamage=u.initial; u.status='defeated'; }
  for (let i=0;i<24;i++) stepBattle(b);
  assert.equal(b.result,null); assert.equal(activeUnits(b,1).length,0);
  b.commandProgress=12000;
  assert.equal(issueCommand(b,'blockade'),null);
  stepBattle(b);
  assert.equal(activeUnits(b,1).length,0);
  while (b.tick < b.sides[1].blockadeUntil) stepBattle(b);
  assert.equal(activeUnits(b,1).length,4);
  assert.ok(activeUnits(b,1).every(u=>u.wave===1));
  assert.equal(b.sides[1].units.filter(u=>u.wave===2&&u.status==='reserve').length,4);
});

test('sieges add an independent gate and shields only to defending starters', () => {
  for (const id of ['siege','defense']) {
    const state=createScenario(id,1,30), b=state.battle, gate=b.siege.gate;
    assert.equal(activeUnits(b,gate.side).length,6);
    assert.equal(gate.side===0 ? gate.x<7 : gate.x>=7,true);
    assert.equal(openCell(b,gate.x,gate.y),false);
    for (const side of [0,1]) for (const u of b.sides[side].units)
      assert.equal(shieldAmount(b,u),side===gate.side&&u.status==='active'?Math.round(u.initial*.3):0);
    const reserve=b.sides[gate.side].units.find(u=>u.status==='reserve');
    const starter=activeUnits(b,gate.side)[0];
    absorbShield(b,starter,starter.initial*.3);
    assert.equal(shieldAmount(b,starter),0);
    starter.hp=0;starter.battleDamage=starter.initial;starter.status='defeated';
    lockDeployment(b);
    if (reserve.arrivalTick) b.tick=reserve.arrivalTick;
    stepBattle(b);
    assert.equal(reserve.status,'active');assert.equal(shieldAmount(b,reserve),0);
    validateSave(structuredClone(state));
  }
});

test('gate takes ordinary attacks and its destruction ends battle immediately with defenders remaining', () => {
  const state=createScenario('siege'),b=state.battle,gate=b.siege.gate,attacker=b.sides[0].units[0];
  gate.hp=1; attacker.x=13;attacker.y=4;
  stepBattle(b);
  assert.equal(gate.hp,0);
  assert.deepEqual(b.result,{winner:0,reason:'城门失守'});
  assert.equal(b.sides[1].units.filter(u=>u.hp>0).length,12);
  assert.ok(b.effects.some(e=>e.to===gate.id&&e.damage===1));
  validateSave(structuredClone(state));
  const before=JSON.stringify(b);stepBattle(b);assert.equal(JSON.stringify(b),before);
  const r=settleBattle(state);assert.equal(r.gate.remaining,0);
  assert.equal(r.stats[1].initial,12*1800); // Buildings never inflate casualties.
  validateSave(structuredClone(state));
});

test('gate remains a target after all defenders fall, focus can select it, deployment cannot overlap it', () => {
  const state=createScenario('siege'),b=state.battle;
  for (const u of b.sides[1].units) {u.hp=0;u.battleDamage=u.initial;u.status='defeated';}
  stepBattle(b);assert.equal(b.result,null);
  b.commandProgress=12000;assert.equal(issueCommand(b,'focus','siege-gate'),null);
  while(!b.result)stepBattle(b);
  assert.equal(b.result.reason,'城门失守');
  const defense=createScenario('defense').battle,g=defense.siege.gate;
  assert.ok(deployUnit(defense,defense.sides[0].units[0].id,g.x,g.y));
  assert.equal(resetDeployment(defense),null);
  assert.ok(activeUnits(defense,0).every(u=>u.x!==g.x||u.y!==g.y));
  assert.equal(blockedTerrain(defense,g.x,g.y-1),false);
  const probe={x:g.x-1,y:g.y};
  assert.ok(routeTo(defense,probe,{x:g.x+2,y:g.y},8)?.every(p=>p.x!==g.x||p.y!==g.y));
});

test('siege retreat and daylight keep normal battle rules, malformed gates are rejected', () => {
  const state=createScenario('defense'),b=state.battle;
  lockDeployment(b);assert.equal(issueCommand(b,'retreat'),null);
  while(!b.result)stepBattle(b);
  assert.equal(b.result.winner,1);assert.equal(b.result.reason,'撤退');
  const daylight=createScenario('siege').battle;daylight.tick=daylight.maxTicks-1;
  for(const u of daylight.sides.flatMap(s=>s.units)){u.cooldown=999;u.intent=0;}
  stepBattle(daylight);assert.equal(daylight.result.winner,null);
  for(const mutate of [s=>s.battle.siege.gate.hp=-1,s=>s.battle.siege.gate.x=7,s=>s.testScenario.shieldPercent=101]){
    const s=createScenario('siege');mutate(s);assert.throws(()=>validateSave(s));
  }
});

test('fixture and seed validation rejects malformed test state', () => {
  assert.throws(()=>createScenario('missing'));
  for (const seed of [-1,1.5,NaN,2**32]) assert.throws(()=>createScenario('field',seed));
  for (const mutate of [
    s=>{s.testScenario.id='missing';},
    s=>{s.battle.maxTicks=99999;},
    s=>{s.battle.sides[1].units[6].arrivalTick=-1;},
    s=>{delete s.testScenario;},
  ]) {
    const s=createScenario('reinforcements'); mutate(s); assert.throws(()=>validateSave(s));
  }
});
