import test from 'node:test';
import assert from 'node:assert/strict';
import { unitTactics } from '../tactics.mjs';
import { newGame, findRoute, orderArmy, advanceTurn, startBattle, stepBattle, activeUnits, issueCommand, settleBattle, armyTroops, recruit, splitArmy, mergeArmies, validateSave, COMBAT, skillVisual, skillThreshold, deployUnit, resetDeployment, lockDeployment, isDeploying, STRATAGEMS } from '../engine.mjs';

function encounter(seed = 521200) {
  const s = newGame(seed);
  assert.equal(orderArmy(s, 'a1', 'guandu'), null);
  assert.equal(advanceTurn(s), null);
  assert.ok(s.pending);
  assert.equal(startBattle(s), null);
  lockDeployment(s.battle);
  return s;
}
function finish(s) {
  while (!s.battle.result) {
    stepBattle(s.battle);
    for (const side of [0, 1]) assert.ok(activeUnits(s.battle, side).length <= 6);
    const active = s.battle.sides.flatMap(side => side.units).filter(u => u.status === 'active');
    assert.equal(new Set(active.map(u => `${u.x},${u.y}`)).size, active.length, 'No two active units occupy the same cell');
  }
  return s.battle.result;
}
test('campaign starts with 9 cities, 8 player officers, 6 starters and 2 reserves', () => {
  const s = newGame();
  assert.equal(s.cities.length, 9); assert.equal(s.armies[0].units.length, 8);
  assert.equal(s.armies[0].units.filter(u => u.first).length, 6);
  assert.equal(armyTroops(s.armies[0]), 24000);
});
test('roads, marching, encounter, and turn lock form a connected loop', () => {
  const s = newGame();
  assert.deepEqual(findRoute(s, 'xuchang', 'ye'), ['guandu', 'ye']);
  assert.equal(orderArmy(s, 'a1', 'ye'), null); advanceTurn(s);
  assert.equal(s.pending.cityId, 'guandu'); assert.equal(s.pending.origin, 'xuchang');
  assert.equal(s.armies[0].location, 'guandu');
  const turn = s.turn; assert.ok(advanceTurn(s)); assert.equal(s.turn, turn);
});
test('AI battle terminates automatically with capacity, occupancy and troop conservation', () => {
  const s = encounter(); finish(s);
  const b = s.battle;
  assert.ok(b.tick <= 240);
  const expected = b.sides.flatMap(side => side.units).filter(u => u.armyId === 'a1').reduce((n, u) => n + u.hp, 0);
  const report = settleBattle(s);
  assert.equal(armyTroops(s.armies.find(a => a.id === 'a1')), expected);
  for (const stats of report.stats) assert.equal(stats.initial, stats.remaining + stats.wounded + stats.killed);
  const snapshot = JSON.stringify(s); assert.equal(settleBattle(s), null); assert.equal(JSON.stringify(s), snapshot);
  assert.ok(advanceTurn(s)); s.report = null; assert.equal(advanceTurn(s), null);
});
test('identical seeds and serialized battle recovery produce identical outcomes', () => {
  const a = encounter(3), b = encounter(3);
  for (let i = 0; i < 12; i++) { stepBattle(a.battle); stepBattle(b.battle); }
  const resumed = validateSave(JSON.parse(JSON.stringify(a)));
  finish(a); finish(b); finish(resumed);
  assert.deepEqual(a.battle, b.battle); assert.deepEqual(a.battle, resumed.battle);
});
test('fresh reserves replace destroyed units without exceeding 6', () => {
  const s = encounter(), b = s.battle;
  const removed = activeUnits(b, 0)[0]; removed.hp = 0; removed.status = 'defeated';
  const waiting = b.sides[0].units.find(u => u.status === 'reserve');
  stepBattle(b); assert.equal(waiting.status, 'active'); assert.equal(activeUnits(b, 0).length, 6);
});
test('reserve order only rotates a wounded frontline, costs points and preserves survivors', () => {
  const s = encounter(), b = s.battle;b.commandProgress=12000;
  assert.ok(issueCommand(b, 'reserve')); assert.equal(b.commandProgress, 12000);
  const weak = activeUnits(b, 0)[0]; weak.hp = 1000;
  assert.equal(issueCommand(b, 'reserve'), null);
  assert.equal(weak.status, 'withdrawn'); assert.equal(weak.hp, 1000);
  assert.equal(activeUnits(b, 0).length, 6); assert.equal(b.commandProgress, 0);
  assert.ok(issueCommand(b, 'reserve'), 'The same order cannot be repeated during its cooldown');
});
test('focus selects only a living enemy and does not spend points on invalid targets', () => {
  const s = encounter(), b = s.battle;b.commandProgress=12000;
  assert.ok(issueCommand(b, 'focus', 'cao')); assert.equal(b.commandProgress, 12000);
  assert.equal(issueCommand(b, 'focus', activeUnits(b, 1)[0].id), null);
  assert.equal(b.commandProgress, 0); assert.ok(b.sides[0].focus);
});
test('retreat terminates and sends the attacker back without taking the city', () => {
  const s = encounter(); assert.equal(issueCommand(s.battle, 'retreat'), null);
  finish(s); assert.equal(s.battle.result.winner, 1); settleBattle(s);
  assert.equal(s.armies.find(a => a.id === 'a1').location, 'xuchang');
  assert.equal(s.cities.find(c => c.id === 'guandu').owner, 'yuan');
  assert.equal(s.report.reason, '撤退');
});
test('split and merge conserve officers, soldiers, wounded and supply', () => {
  const s = newGame(), initial = armyTroops(s.armies[0]), supply = s.armies[0].supply;
  assert.ok(splitArmy(s, 'a1', []));
  assert.equal(splitArmy(s, 'a1', ['yuanxia', 'jin']), null);
  const created = s.armies.at(-1); assert.equal(created.faction, 'cao');
  assert.equal(armyTroops(s.armies[0]) + armyTroops(created), initial);
  assert.equal(s.armies[0].supply + created.supply, supply);
  assert.equal(mergeArmies(s, 'a1', created.id), null);
  assert.equal(armyTroops(s.armies[0]), initial); assert.equal(s.armies[0].units.length, 8); assert.equal(s.armies[0].supply, supply);
});
test('friendly recruitment and wounded recovery cannot duplicate soldiers', () => {
  const s = newGame(), u = s.armies[0].units[0]; u.troops = 1000; u.wounded = 800;
  const gold = s.gold; assert.equal(recruit(s, 'a1'), null);
  assert.equal(u.troops, 2200); assert.equal(u.wounded, 800); assert.equal(s.gold, gold - 300);
  advanceTurn(s); assert.equal(u.troops, 2380); assert.equal(u.wounded, 620);
  assert.ok(recruit(s, 'a1'));
});
test('enemy launches an attack and city garrison participates in defense', () => {
  const s = newGame(); for (let i = 0; i < 4; i++) advanceTurn(s);
  assert.ok(s.pending); assert.equal(s.pending.attackerId, 'a2'); startBattle(s);
  assert.ok(s.battle.sides[0].units.some(u => u.armyId === 'city:xuchang'));
  finish(s); settleBattle(s); assert.ok(s.report);
});
test('garrison alone can defend a city when player army is elsewhere', () => {
  const s = newGame(); s.armies[0].location = 'chenliu';
  for (let i = 0; i < 4; i++) advanceTurn(s);
  assert.ok(s.pending); startBattle(s); finish(s); settleBattle(s);
  assert.ok(s.report); assert.ok(s.armies.find(a => a.id === 'a1'));
});
test('multiple same-side armies share the same six battlefield slots', () => {
  const s = newGame(); splitArmy(s, 'a1', ['yuanxia', 'jin']);
  const helper = s.armies.at(-1); helper.location = 'guandu';
  orderArmy(s, 'a1', 'guandu'); advanceTurn(s); startBattle(s);
  assert.ok(s.battle.sides[0].units.some(u => u.armyId === helper.id));
  assert.equal(activeUnits(s.battle, 0).length, 6); finish(s);
});
test('invalid saves are rejected before replacing game state', () => {
  assert.throws(() => validateSave({ version: 9 }));
  const s = newGame(); s.armies[0].units[0].troops = -1; assert.throws(() => validateSave(s));
  const duplicate = newGame(); duplicate.armies[0].units.push(duplicate.armies[0].units[0]); assert.throws(() => validateSave(duplicate));
});
test('different seeds finish without deadlocks or overlapping units', () => {
  for (const seed of [1, 17, 521, 2000, 9801, 14450]) { const s = encounter(seed); finish(s); settleBattle(s); }
});
test('save validation accepts the encounter, defense, report and army split lifecycle', () => {
  const s = newGame(); splitArmy(s, 'a1', ['jin']); validateSave(JSON.parse(JSON.stringify(s)));
  for (let i = 0; i < 4; i++) advanceTurn(s);
  validateSave(JSON.parse(JSON.stringify(s))); startBattle(s);
  validateSave(JSON.parse(JSON.stringify(s))); finish(s);
  validateSave(JSON.parse(JSON.stringify(s))); settleBattle(s);
  validateSave(JSON.parse(JSON.stringify(s)));
});
test('malformed battle, pending encounter, map, and report data fail closed', () => {
  const badCity = newGame(); badCity.cities[0].x = '<script>'; assert.throws(() => validateSave(badCity));
  const badName = newGame(); badName.armies[0].units[0].name = '<img src=x>'; assert.throws(() => validateSave(badName));
  const badBattle = encounter(); badBattle.battle.sides[0].units[0].hp = NaN; assert.throws(() => validateSave(badBattle));
  const badPending = newGame(); badPending.pending = {}; assert.throws(() => validateSave(badPending));
  const badReport = newGame(); badReport.report = {}; assert.throws(() => validateSave(badReport));
});
test('left and right formations deploy on opposite flanks', () => {
  const s = newGame(); s.armies[0].units[0].formation = 'left'; s.armies[0].units[1].formation = 'right';
  orderArmy(s, 'a1', 'guandu'); advanceTurn(s); startBattle(s);
  assert.equal(s.battle.sides[0].units[0].y, 0); assert.equal(s.battle.sides[0].units[1].y, 7);
  validateSave(JSON.parse(JSON.stringify(s)));
});
test('daylight limit ends a stalemate in a draw without capturing the city', () => {
  const s = encounter(); s.battle.tick = 239; stepBattle(s.battle);
  assert.deepEqual(s.battle.result, { winner: null, reason: '久战收兵' });
  settleBattle(s); assert.equal(s.cities.find(c => c.id === 'guandu').owner, 'yuan');
  assert.equal(s.armies.find(a => a.id === 'a1').location, 'xuchang');
});
test('capturing the final city completes the scenario', () => {
  const s = encounter(); s.cities.forEach(c => { if (c.id !== 'guandu') c.owner = 'cao'; });
  // Isolate final-city settlement from combat balance.
  s.battle.sides[1].units.forEach(u=>{u.hp=1;});
  finish(s); settleBattle(s); assert.equal(s.finished, 'victory'); assert.ok(advanceTurn(s));
  validateSave(JSON.parse(JSON.stringify(s)));
});
test('losing the final friendly city ends the scenario', () => {
  const s = newGame(); s.cities.forEach(c => { if (c.id !== 'xuchang') c.owner = 'yuan'; });
  s.cities.find(c => c.id === 'xuchang').garrison = 1;
  s.armies[0].units.forEach(u => { u.troops = 1; });
  for (let i = 0; i < 4; i++) advanceTurn(s);
  startBattle(s); finish(s); settleBattle(s);
  assert.equal(s.finished, 'defeat'); assert.ok(advanceTurn(s));
  validateSave(JSON.parse(JSON.stringify(s)));
});

test('source-stat Guandu fights stay within the 240-step daylight limit and allow repeated completed skills', () => {
  for (const seed of [1, 17, 521200]) {
    const s = encounter(seed); finish(s);
    const seconds = s.battle.tick * COMBAT.stepMs / 1000;
    // Six-neighbor movement changes engagement geometry; keep a bounded pacing budget.
    assert.ok(seconds >= 55 && seconds <= 240 * .7, `Expected a readable battle, got ${seconds}s`);
    const own = s.battle.sides[0].units;
    assert.ok(own.slice(0,6).every(u => u.skillCasts >= 1), 'Starting officers can finish a skill; unused reserves must not gain intent');
    assert.ok(own.filter(u => u.skillCasts >= 2).length >= 5, 'Sustained combat provides a second casting opportunity');
  }
});
test('a ready skill resolves damage and enters cooldown in the same step', () => {
  const s=duel(),b=s.battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
  a.intent=100;a.cooldown=99;const hp=d.hp;
  stepBattle(b);
  assert.equal(a.cast,null);assert.equal(a.skillCasts,1);assert.ok(d.hp<hp);
  assert.equal(a.skillReady.thrust,b.tick+unitTactics(a)[0].cooldown);
  assert.ok(b.effects.some(e=>e.from===a.id&&e.skill&&e.phase==='impact'));
  assert.ok(b.effects.every(e=>e.phase!=='cast'));
});
test('saving after immediate skills resumes identically without duplicating a hit', () => {
  const s=encounter();for(let i=0;i<40;i++)stepBattle(s.battle);
  const resumed=validateSave(JSON.parse(JSON.stringify(s)));
  for(let i=0;i<10;i++){stepBattle(s.battle);stepBattle(resumed.battle);}
  assert.deepEqual(resumed.battle,s.battle);
});
test('pending casts from the removed windup format are rejected',()=>{
  const s=duel(),a=s.battle.sides[0].units[0],d=s.battle.sides[1].units[0];
  a.cast={skillId:'thrust',targetId:d.id,remaining:2};
  assert.throws(()=>validateSave(s),/待施放/);
});
test('a defeated unit cannot use a ready skill',()=>{
  const s=encounter(),b=s.battle,a=b.sides[0].units[0];a.intent=100;a.hp=0;a.status='defeated';
  for(let i=0;i<4;i++){stepBattle(b);assert.ok(!b.effects.some(e=>e.from===a.id));}
  assert.equal(a.skillCasts,0);
});
test('retreat stops subsequent friendly skills immediately',()=>{
  const s=encounter(),b=s.battle;for(let i=0;i<35;i++)stepBattle(b);
  const counts=b.sides[0].units.map(u=>u.skillCasts);
  assert.equal(issueCommand(b,'retreat'),null);finish(s);
  assert.deepEqual(b.sides[0].units.map(u=>u.skillCasts),counts);
});
test('skill events carry enough data to show effects after the victim leaves the board', () => {
  const s = encounter(); let impacts = 0;
  while (!s.battle.result) {
    stepBattle(s.battle);
    for (const e of s.battle.effects.filter(e => e.skill && e.phase === 'impact')) {
      assert.ok(['charge', 'fire', 'shockwave', 'banner', 'volley', 'slash'].includes(e.visual));
      assert.ok(Number.isInteger(e.fromX) && Number.isInteger(e.fromY));
      assert.ok(e.name && e.label); impacts++;
    }
  }
  assert.ok(impacts >= 15);
  assert.notEqual(skillVisual({id:'jia',type:'archer'}), skillVisual({id:'liao',type:'cavalry'}));
});

function duel() {
  const s = encounter();
  s.battle.sides.forEach((side,index)=>{
    side.units = [side.units[0]];
    Object.assign(side.units[0],{x:4+index,y:3,intent:0,cooldown:index ? 99 : 0});
    side.units[0].tactics=['thrust','phalanx','strike'];
  });
  return s;
}
test('intent grows from actual attacks and surviving hits, never elapsed time', () => {
  const s=duel(),b=s.battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
  stepBattle(b); assert.equal(a.intent,6); assert.equal(d.intent,7);
  a.cooldown=99;d.cooldown=99;
  for(let i=0;i<10;i++)stepBattle(b);
  assert.equal(a.intent,6); assert.equal(d.intent,7);
});
test('a ready tactic casts without spending intent, regardless of morale or attack cooldown', () => {
  const s=duel(),b=s.battle,a=b.sides[0].units[0];
  a.intent=skillThreshold(a)+17;a.morale=0;a.cooldown=99;a.skillCooldown=999;
  stepBattle(b);
  assert.equal(a.cast,null);assert.equal(a.tacticCasts.thrust,1);assert.equal(a.intent,skillThreshold(a)+17);
});
test('no valid target preserves intent and leaving range cannot duplicate an instant hit', () => {
  const s=duel(),b=s.battle,a=b.sides[0].units[0],d=b.sides[1].units[0];
  a.intent=skillThreshold(a);a.x=0;d.x=13;
  stepBattle(b);assert.equal(a.cast,null);assert.equal(a.intent,skillThreshold(a));
  a.x=4;d.x=5;stepBattle(b);assert.equal(a.skillCasts,1);
  d.x=13;
  stepBattle(b);
  assert.equal(a.cast,null);assert.equal(a.intent,skillThreshold(a));assert.equal(a.skillCasts,1);
});
test('each skill has its own threshold, and intent below threshold cannot cast', () => {
  const s=duel(),b=s.battle,a=b.sides[0].units[0];
  assert.deepEqual(unitTactics(a).map(s=>s.threshold),[25,65,75]);
  assert.equal(unitTactics({id:'jia',type:'crossbow'})[2].threshold,100);
  a.intent=skillThreshold(a)-1;a.cooldown=99;stepBattle(b);assert.equal(a.cast,null);
});
test('deployment can move, swap, reset and persist without advancing time', () => {
  const s=newGame();orderArmy(s,'a1','guandu');advanceTurn(s);startBattle(s);const b=s.battle;
  assert.equal(isDeploying(b),true);assert.ok(issueCommand(b,'assault'));
  const [a,d]=activeUnits(b,0),oldD={x:d.x,y:d.y};
  assert.equal(deployUnit(b,a.id,0,0),null);assert.equal(a.x,0);assert.equal(a.y,0);
  assert.equal(deployUnit(b,a.id,d.x,d.y),null);assert.equal(d.x,0);assert.equal(d.y,0);assert.equal(a.x,oldD.x);
  const saved=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(isDeploying(saved.battle),true);assert.equal(saved.battle.tick,0);
  assert.ok(deployUnit(b,a.id,5,0));assert.ok(deployUnit(b,b.sides[1].units[0].id,0,0));
  assert.equal(resetDeployment(b),null);assert.equal(activeUnits(b,0).length,6);
  assert.equal(lockDeployment(b),null);assert.ok(deployUnit(b,a.id,0,0));
});
test('paused stratagem consumes a full gauge, preserves time and includes reserves', () => {
  const s=encounter(),b=s.battle;b.commandProgress=12000;
  assert.equal(issueCommand(b,'inspire'),null);
  assert.equal(b.tick,0);assert.equal(b.commandProgress,0);
  assert.ok(b.sides[0].units.every(u=>u.intent===35));
  assert.ok(issueCommand(b,'inspire'));assert.ok(issueCommand(b,'fortify'));
  validateSave(JSON.parse(JSON.stringify(s)));
});
test('attack and defense stratagems change actual damage and stop at expiration', () => {
  function hit(command, expired=false){
    const s=duel(),b=s.battle;
    b.sides[1].units[0].cooldown=0;
    if(command){b.commandProgress=12000;if(command==='disrupt')b.sides[0].commanders.push({id:'tian',name:'田丰',role:'advisor',armyId:'a2'});assert.equal(issueCommand(b,command),null);}
    if(expired)b.tick=STRATAGEMS[command].duration;
    stepBattle(b);return b.effects;
  }
  const base=hit(),attack=hit('assault'),defense=hit('fortify'),disrupt=hit('disrupt');
  const own=e=>e.find(e=>e.side===0).damage,enemy=e=>e.find(e=>e.side===1).damage;
  assert.ok(own(attack)>own(base));assert.ok(enemy(defense)<enemy(base));
  assert.ok(own(disrupt)>own(base));assert.ok(enemy(disrupt)<enemy(base));
  // Compare an expired buff to an equally advanced control, with matching initiative.
  const s=duel();s.battle.sides[1].units[0].cooldown=0;s.battle.tick=18;stepBattle(s.battle);
  assert.equal(own(hit('assault',true)),own(s.battle.effects));
});
test('missing deployment and command state is rejected instead of reconstructed', () => {
  for(const field of ['deploymentLocked','commandReady','commandSerial']){
    const s=encounter();stepBattle(s.battle);delete s.battle[field];
    assert.throws(()=>validateSave(s));
  }
});
