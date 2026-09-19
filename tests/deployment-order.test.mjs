import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,makeOfficer,startBattle,fillSlots,activeUnits,lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {initializeTacticLearning} from '../tactic-learning.mjs';
import {rankEnemyReserves,planEnemyArmy} from '../battle-ai.mjs';
import {createScenario} from '../scenarios.mjs';
import {canOccupy} from '../battlefield.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';

const enemyIds=['shao','yan','wen','he','ju','tian','gao','jin','yuanxia'];
function encounter(entries,seed=710321){
  const s=newGame(seed),own=s.armies[0],enemy=s.armies[1];
  s.armies=[own,enemy];own.units=own.units.slice(0,6);
  enemy.units=entries.map(([type,troops=3000],i)=>{
    const u=makeOfficer(enemyIds[i],troops,i,5,seed);u.type=type;
    initializeTacticLearning(u,seed);return u;
  });
  enemy.leader=enemy.units[0].id;enemy.advisor=enemy.units[0].id;enemy.deputy=null;
  own.location=enemy.location='guandu';s.cities.find(c=>c.id==='guandu').garrison=0;
  s.pending={cityId:'guandu',attackerId:own.id,defenderIds:[enemy.id],origin:'xuchang',defenderFaction:'yuan'};
  startBattle(s,{deferEnemyDeployment:true});return s;
}
function deploy(s){fillSlots(s.battle,1);planEnemyArmy(s.battle);return s.battle;}

test('first six favor real troop strength over roster order without changing learned skills, player or RNG',()=>{
  const s=encounter([['spear',100],['archer',100],['cavalry',100],['spear'],['crossbow'],['cavalry'],['halberd'],['logistics'],['archer']]);
  const b=s.battle,own=structuredClone(b.sides[0]),seed=b.seed;
  const input=b.sides[1].units.map(u=>({id:u.id,tactics:[...u.tactics],learning:structuredClone(u.tacticLearning)}));
  deploy(s);
  assert.equal(activeUnits(b,1).length,6);
  assert.ok(activeUnits(b,1).every(u=>u.initial===3000));
  assert.deepEqual(b.sides[0],own);assert.equal(b.seed,seed);
  assert.deepEqual(b.sides[1].units.map(u=>({id:u.id,tactics:u.tactics,learning:u.tacticLearning})),input);
  const snapshot=structuredClone(b);fillSlots(b,1);assert.deepEqual(b,snapshot);
  validateSave(structuredClone(s));
});

test('same candidates prioritize a missing front line over another rear and react to visible cavalry',()=>{
  const s=encounter([['archer'],['crossbow'],['archer'],['crossbow'],['logistics'],['spear'],['crossbow']]),b=s.battle;
  const units=b.sides[1].units;
  // A reachable five-survivor composition with one replacement slot.
  for(const [i,u] of units.slice(0,5).entries())Object.assign(u,{status:'active',x:11,y:i});
  const picked=rankEnemyReserves(b,units.slice(5))[0];
  assert.equal(picked.type,'spear');
  fillSlots(b,1);assert.equal(picked.status,'active');assert.equal(units[6].status,'reserve');
  const duel=encounter([['spear'],['cavalry']]).battle;
  for(const u of duel.sides[0].units)u.type='cavalry';
  assert.equal(rankEnemyReserves(duel,duel.sides[1].units)[0].type,'spear');
});

test('learned support is useful beside a core but a tiny helper does not displace full-strength troops',()=>{
  const s=encounter([['spear'],['spear'],['crossbow'],['archer'],['cavalry'],['logistics'],['logistics',50]]),b=s.battle;
  const healer=b.sides[1].units[5];assert.equal(learnFixtureTactics(healer,['passage','supply']),null);
  for(const [i,u] of b.sides[1].units.slice(0,5).entries())Object.assign(u,{status:'active',x:11,y:i});
  const before=[...healer.tactics];fillSlots(b,1);
  assert.equal(healer.status,'active');assert.equal(b.sides[1].units[6].status,'reserve');
  assert.deepEqual(healer.tactics,before);
});

test('siege context is available when choosing starters and favors a viable siege reserve',()=>{
  const b=encounter([['siege'],['archer']]).battle;
  const engines=b.sides[1].units[0];
  b.siege={attackerSide:1,gate:{id:'siege-gate',type:'gate',side:0,x:1,y:4,hp:20000,maxHp:20000}};
  assert.equal(rankEnemyReserves(b,b.sides[1].units)[0],engines);
  for(const id of ['siege','defense']){
    const s=createScenario(id);validateSave(structuredClone(s));
    assert.ok(activeUnits(s.battle,1).every(u=>canOccupy(s.battle,u,u.x,u.y)));
  }
});

test('future arrivals, blockade and retreat never admit a stronger reserve early',()=>{
  const s=encounter([['spear',100],['crossbow'],['cavalry']]),b=s.battle,units=b.sides[1].units;
  units[1].arrivalTick=10;units[2].arrivalTick=20;
  deploy(s);assert.deepEqual(activeUnits(b,1).map(u=>u.id),[units[0].id]);
  b.tick=10;b.sides[1].blockadeUntil=11;fillSlots(b,1);assert.equal(units[1].status,'reserve');
  b.tick=11;fillSlots(b,1);assert.equal(units[1].status,'active');assert.equal(units[2].status,'reserve');
  b.tick=20;b.sides[1].retreat=true;fillSlots(b,1);assert.equal(units[2].status,'reserve');
  const waves=createScenario('reinforcements').battle;
  assert.ok(activeUnits(waves,1).every(u=>!u.wave));
  assert.ok(waves.sides[1].units.filter(u=>u.wave).every(u=>u.status==='reserve'));
});

test('unplaceable ships do not block land reserves; river deployment is legal and unique',()=>{
  const s=encounter([['ship'],['spear']]),b=s.battle;b.terrain='land';
  fillSlots(b,1);assert.equal(b.sides[1].units[0].status,'reserve');assert.equal(b.sides[1].units[1].status,'active');
  const river=createScenario('river').battle,all=river.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
  assert.ok(all.every(u=>canOccupy(river,u,u.x,u.y)));
  assert.equal(new Set(all.map(u=>`${u.x},${u.y}`)).size,all.length);
});

test('replacement choices and combat remain deterministic after save/resume, without changing initiative order',()=>{
  const s=encounter([['spear',500],['archer',600],['cavalry',700],['spear'],['crossbow'],['cavalry'],['halberd'],['logistics'],['archer']]),b=deploy(s);
  const order=b.sides.map(side=>side.units.map(u=>u.id));lockDeployment(b);
  for(let i=0;i<8&&!b.result;i++)stepBattle(b);
  const copy=validateSave(JSON.parse(JSON.stringify(s)));
  while(!b.result){stepBattle(b);stepBattle(copy.battle);assert.ok(activeUnits(b,1).length<=6);}
  assert.deepEqual(copy.battle,b);assert.deepEqual(b.sides.map(side=>side.units.map(u=>u.id)),order);
  assert.ok(b.sides[1].units.some(u=>u.initial<1000&&u.passiveState.reserveEntered),'actual reserves joined during combat');
});

test('player replacement order is preserved',()=>{
  const s=newGame(),own=s.armies[0],enemy=s.armies[1];
  own.units[0].troops=1;own.location=enemy.location='guandu';
  s.cities.find(c=>c.id==='guandu').garrison=0;
  s.pending={cityId:'guandu',attackerId:own.id,defenderIds:[enemy.id],origin:'xuchang',defenderFaction:'yuan'};
  startBattle(s);const b=s.battle;
  assert.ok(own.units.length>6);
  assert.deepEqual(activeUnits(b,0).map(u=>u.id),own.units.slice(0,6).map(u=>u.id));
  assert.ok(b.sides[0].units.slice(6).every(u=>u.status==='reserve'));
});
