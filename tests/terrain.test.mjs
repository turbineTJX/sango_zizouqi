import {initializeTacticLearning} from '../tactic-learning.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,configureBattleTerrain,lockDeployment,validateSave,unitAttributes} from '../engine.mjs';
import {BATTLE_TERRAINS,terrainAt,canOccupy,unitTerrain} from '../battlefield.mjs';
import {TACTICS_BOOK,roleTacticIds,unitTactics} from '../tactics.mjs';
import {tacticTerrainEffect} from '../terrain-rules.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

function scene(terrain='land',type='archer',positions=[[4,2],[6,2]]){
  const state=createScenario('field',1729),b=state.battle;
  assert.equal(configureBattleTerrain(b,terrain),null);
  const u=b.sides[0].units[0],t=b.sides[1].units[0];
  b.sides[0].units=[u];b.sides[1].units=[t];
  for(const [i,v] of [u,t].entries()){
    Object.assign(v,{id:i?'target':type==='ship'?'person-246':type==='siege'?'shao':'cao',type:i?'archer':type,level:1,hp:3000,maxHp:3000,initial:3000,troops:3000,battleDamage:0,healed:0,statuses:{},intent:0,cooldown:999,commandBonus:0,deputyBonus:0,advisorBonus:0,x:positions[i][0],y:positions[i][1]});
    initializeTacticLearning(v,1729);
    v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));
  }
  lockDeployment(b);return {state,b,u,t};
}
function cast(terrain,id,type='archer',positions){
  const result=scene(terrain,type,positions);primeTactic(result.u,id);stepBattle(result.b);
  assert.equal(result.u.tacticCasts[id],1);
  if(TACTICS_BOOK[id].attackOrb){result.u.cooldown=0;stepBattle(result.b);}
  result.hits=result.b.effects.filter(e=>e.from===result.u.id&&e.damage>0);
  return result;
}

test('all presets have symmetric cells; ships never occupy forests, hills or marshes',()=>{
  for(const terrain of Object.keys(BATTLE_TERRAINS)){
    const b={terrain};
    for(let x=0;x<14;x++)for(let y=0;y<8;y++)assert.equal(terrainAt(b,x,y),terrainAt(b,13-x,7-y));
    if(terrain!=='river')assert.equal(canOccupy(b,{type:'ship'},4,2),false);
  }
  const b={terrain:'river'};
  assert.equal(unitTerrain(b,{type:'ship',x:6,y:3}),'water');
  assert.equal(unitTerrain(b,{type:'spear',x:6,y:3}),'bridge');
});

test('terrain changes only during deployment, resets both sides legally and preserves intent and seed',()=>{
  const state=createScenario('field'),b=state.battle,seed=b.seed;
  for(const terrain of Object.keys(BATTLE_TERRAINS)){
    assert.equal(configureBattleTerrain(b,terrain),null);
    const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
    assert.equal(new Set(active.map(u=>u.x+','+u.y)).size,active.length);
    assert.ok(active.every(u=>canOccupy(b,u,u.x,u.y)&&u.intent===0));
    assert.equal(b.seed,seed);validateSave(structuredClone(state));
  }
  const before=structuredClone(b);assert.ok(configureBattleTerrain(b,'lava'));assert.deepEqual(b,before);
  lockDeployment(b);assert.ok(configureBattleTerrain(b,'forest'));
  const river=createScenario('river').battle,original=structuredClone(river);
  assert.ok(configureBattleTerrain(river,'forest'));assert.deepEqual(river,original);
});

test('fire hits gain in forests, weaken in marshes, and do not alter intent or cooldown costs',()=>{
  const plain=cast('land','fire'),forest=cast('forest','fire'),marsh=cast('marsh','fire');
  assert.ok(Math.abs(forest.hits[0].damage-plain.hits[0].damage*(unitAttributes(plain.u,plain.b).attack+unitAttributes(plain.u,plain.b).martialPower*.35*1.3)/(unitAttributes(plain.u,plain.b).attack+unitAttributes(plain.u,plain.b).martialPower*.35))<=1);
  assert.ok(Math.abs(marsh.hits[0].damage-plain.hits[0].damage*(unitAttributes(plain.u,plain.b).attack+unitAttributes(plain.u,plain.b).martialPower*.35*.8)/(unitAttributes(plain.u,plain.b).attack+unitAttributes(plain.u,plain.b).martialPower*.35))<=1);
  assert.equal(forest.u.intent,plain.u.intent);assert.equal(forest.u.skillReady.fire,plain.u.skillReady.fire);
  assert.equal(forest.t.statuses.burn.baseAmount,plain.t.statuses.burn.baseAmount);
  assert.match(forest.hits[0].terrain,/林地：伤害 \+30%（仅附加威力）/);
});

test('area fire resolves each target terrain separately',()=>{
  const {b,u,t}=scene('forest'),other={...structuredClone(t),id:'target2',y:3};b.sides[1].units.push(other);
  primeTactic(u,'wildfire');stepBattle(b);
  const hits=b.effects.filter(e=>e.from===u.id&&e.damage>0);
  assert.equal(hits.length,2);
  assert.equal(hits.find(e=>e.to===t.id).terrainFactor,1.3);
  assert.equal(hits.find(e=>e.to===other.id).terrainFactor,undefined);
  assert.ok(Math.abs(hits[0].damage/hits[1].damage-1.3)<.25);
});

test('burn recalculates terrain after moving, without compounding its stored stack strength',()=>{
  const {b,u,t}=cast('forest','fire');
  u.cooldown=999;const base=t.statuses.burn.amount;
  t.y=3;stepBattle(b);
  assert.equal(b.effects.find(e=>e.to===t.id&&e.damageKind==='dot').damage,Math.round(base));
  t.y=2;stepBattle(b);
  assert.equal(b.effects.find(e=>e.to===t.id&&e.damageKind==='dot').damage,Math.round(base*1.3));
  assert.equal(t.statuses.burn.amount,base);
});

test('high ground boosts shooting, woodland shields ranged targets and neutral skills remain neutral',()=>{
  const plain=cast('land','repeat','crossbow'),hill=cast('hill','repeat','crossbow'),forest=cast('forest','repeat','crossbow');
  assert.equal(hill.hits.length,2);
  for(let i=0;i<2;i++){
    assert.ok(Math.abs(hill.hits[i].damage-plain.hits[i].damage*1.2)<=1);
    assert.ok(Math.abs(forest.hits[i].damage-plain.hits[i].damage*.8)<=1);
  }
  assert.equal(tacticTerrainEffect(hill.b,hill.u,TACTICS_BOOK.seal,hill.t).factor,1);
});

test('charge damage remembers the starting high ground and the worst traversed wetland',()=>{
  const positions=[[4,3],[7,3]],plain=cast('land','rush','cavalry',positions),hill=cast('hill','rush','cavalry',positions);
  assert.equal(terrainAt(hill.b,hill.u.x,hill.u.y),'land');
  assert.equal(hill.hits[0].terrainFactor,.85);
  assert.ok(Math.abs(hill.hits[0].damage-plain.hits[0].damage*.85)<=1);
  const wet=cast('marsh','rush','cavalry',[[3,3],[7,3]]);
  assert.equal(wet.hits[0].terrainFactor,.6);
});

test('ambush and fortifications change duration, while terrain slow is visible in derived movement',()=>{
  const ambush=cast('forest','ambush','crossbow');
  assert.equal(ambush.t.statuses.slow.until-ambush.b.tick-1,8);
  assert.equal(ambush.t.statuses.weaken.until-ambush.b.tick-1,8);
  const positions=[[4,2],[5,2]],plain=cast('land','phalanx','spear',positions),hill=cast('hill','phalanx','spear',positions),marsh=cast('marsh','phalanx','spear',positions);
  for(const [x,steps] of [[plain,8],[hill,10],[marsh,6]])assert.equal(x.u.statuses.phalanx.until-x.b.tick-1,steps);
  const cavalry=scene('forest','cavalry');
  assert.equal(unitAttributes(cavalry.u,cavalry.b).move,1.3);
  assert.ok(unitAttributes(cavalry.u,cavalry.b).breakdown.move.modifiers.some(m=>m.label==='林地行军'));
});

test('water tactics and fire distinguish a ship under the bridge from troops on it',()=>{
  const fire=scene('river','archer',[[4,2],[6,3]]);
  fire.t.type='ship';learnFixtureTactics(fire.t,roleTacticIds(fire.t,'guard'));fire.t.skillReady=Object.fromEntries(unitTactics(fire.t).map(s=>[s.id,999]));
  primeTactic(fire.u,'fire');stepBattle(fire.b);fire.u.cooldown=0;stepBattle(fire.b);
  assert.equal(fire.b.effects.find(e=>e.from===fire.u.id&&e.damage>0).terrainFactor,.6);
  const run=type=>{
    const x=scene('river','ship',[[4,3],[6,3]]);x.t.type=type;
    initializeTacticLearning(x.t,1729);x.t.skillReady=Object.fromEntries(unitTactics(x.t).map(s=>[s.id,999]));
    primeTactic(x.u,'undertow');stepBattle(x.b);return x;
  };
  const ship=run('ship'),land=run('archer');
  assert.equal(ship.b.effects.find(e=>e.damage>0).terrainFactor,1.25);
  assert.equal(land.b.effects.find(e=>e.damage>0).terrainFactor,.7);
  assert.equal(ship.t.statuses.slow.until-ship.b.tick-1,8);
  assert.equal(land.t.statuses.slow.until-land.b.tick-1,4);
});

test('famous fire tactics share terrain effects and all tactics explain their terrain rules',()=>{
  const skill=Object.values(TACTICS_BOOK).find(s=>s.special&&s.burn);
  const x=scene('forest');x.u.id=skill.id.replace('unique-','');
  primeTactic(x.u,skill.id);stepBattle(x.b);
  assert.equal(x.u.tacticCasts[skill.id],1);
  assert.equal(x.b.effects.find(e=>e.from===x.u.id&&e.damage>0).terrainFactor,1.3);
  assert.ok(Object.values(TACTICS_BOOK).every(s=>s.terrainDescription?.length));
});

test('all terrain saves resume deterministically to real battle completion and old rules are rejected',()=>{
  for(const terrain of Object.keys(BATTLE_TERRAINS)){
    const state=createScenario(terrain==='river'?'river':'terrain');
    assert.equal(configureBattleTerrain(state.battle,terrain),null);
    for(let i=0;i<25;i++)stepBattle(state.battle);
    const resumed=validateSave(JSON.parse(JSON.stringify(state)));
    while(!state.battle.result){stepBattle(state.battle);stepBattle(resumed.battle);}
    assert.deepEqual(state.battle,resumed.battle);validateSave(state);
    const invalid=structuredClone(resumed);invalid.battle.terrain='lava';assert.throws(()=>validateSave(invalid),/地形/);
  }
  const old=createScenario('field');old.rulesVersion=16;assert.throws(()=>validateSave(old),/重新开始/);
});
