import {tacticHolder} from './helpers/current-battle.mjs';
import {remedy} from '../battle-status-rules.mjs';
import {syncFixtureLearning} from './helpers/learn-tactics.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave} from '../engine.mjs';
import {unitTactics,roleTacticIds,hasStatus,tauntTarget,pursuitTarget,TACTICS_BOOK,tacticTarget} from '../tactics.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

function scene(){
 const ids=[tacticHolder('ward','spear',[],true)];ids.push(tacticHolder('repeat','crossbow',ids,true));ids.push(['person-1','person-2','person-3'].find(id=>!ids.includes(id)));
 const entry=(id,type)=>({id,type,troops:3000,level:1,retreatAt:null});
 const state=createScenario('custom-battle',19,20,null,{seed:19,terrain:'land',ownTeam:[entry(ids[0],'spear'),entry(ids[2],'archer')],enemyTeam:[entry(ids[1],'crossbow')]}),b=state.battle;lockDeployment(b);
 const [tank,ally]=b.sides[0].units,[enemy]=b.sides[1].units;
 Object.assign(tank,{x:3,y:3});Object.assign(ally,{x:7,y:2});Object.assign(enemy,{x:8,y:3});
 for(const u of [tank,ally,enemy]){u.intent=0;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));u.statuses={phalanx:{until:999}};}
 delete enemy.statuses.phalanx;primeTactic(tank,'ward');return {state,b,tank,ally,enemy};
}
test('five-hex taunt forces an out-of-range ranged enemy to approach without shooting its nearby ally',()=>{
  const {b,tank,ally,enemy}=scene();enemy.cooldown=0;const hp=ally.hp;
  assert.equal(hexDistance(tank,enemy),5);stepBattle(b);
  assert.ok(hasStatus(b,enemy,'taunt'));assert.equal(ally.hp,hp);
  assert.equal(hexDistance(tank,enemy),4);assert.equal(enemy.skillCasts,0);
  stepBattle(b);assert.ok(b.effects.some(e=>e.from===enemy.id&&e.to===tank.id&&e.damage>0));
});
test('taunt cannot reach six hexes or override control protection',()=>{
  for(const variant of ['far','protected']){
    const {b,tank,enemy}=scene();if(variant==='far')enemy.x=9;else enemy.statuses.resolve={until:99};
    stepBattle(b);assert.equal(tank.tacticCasts.ward,undefined,variant);assert.ok(!hasStatus(b,enemy,'taunt'));
  }
});
test('current five-range repeat attacks the taunter instead of a closer ally',()=>{
 const {b,tank,ally,enemy}=scene();primeTactic(enemy,'repeat');const hp=ally.hp;stepBattle(b);assert.ok(hasStatus(b,enemy,'taunt'));assert.equal(enemy.tacticCasts.repeat,1);assert.equal(ally.hp,hp);assert.ok(b.effects.filter(e=>e.from===enemy.id&&e.damage>0).every(e=>e.to===tank.id));
});
test('calm removes a real taunt; its source dying or retreating immediately releases the target',()=>{
  const x=scene();stepBattle(x.b);remedy(x.b,x.enemy,'calm');
  assert.ok(!hasStatus(x.b,x.enemy,'taunt'));
  for(const kind of ['death','retreat','expiry']){
    const {b,tank,enemy}=scene();stepBattle(b);assert.equal(tauntTarget(b,enemy,4),tank);
    if(kind==='death'){tank.hp=0;tank.status='defeated';}else if(kind==='retreat')b.sides[tank.side].retreat=true;else enemy.statuses.taunt.until=b.tick;
    assert.equal(tauntTarget(b,enemy,4),null,kind);
  }
});
test('taunt never drags melee out through another active ZOC',()=>{
  const {b,tank,ally,enemy}=scene();Object.assign(ally,{type:'spear',x:7,y:3});enemy.type='cavalry';learnFixtureTactics(enemy,roleTacticIds(enemy,'assault'));enemy.skillReady=Object.fromEntries(unitTactics(enemy).map(s=>[s.id,999]));enemy.cooldown=0;
  stepBattle(b);assert.ok(hasStatus(b,enemy,'taunt'));assert.equal(tauntTarget(b,enemy,1),null);
  assert.ok(b.effects.some(e=>e.from===enemy.id&&e.to===ally.id&&e.damage>0));assert.equal(enemy.x,8);
});

function breach(seed=43){
 const ids=[tacticHolder('rush','cavalry',[],true)];ids.push(tacticHolder('ward','spear',ids,true));ids.push(tacticHolder('repeat','crossbow',ids,true));
 const entry=(id,type)=>({id,type,troops:3000,level:1,retreatAt:null});const state=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:[entry(ids[0],'cavalry')],enemyTeam:[entry(ids[1],'spear'),entry(ids[2],'crossbow')]}),b=state.battle;lockDeployment(b);
 const [charger]=b.sides[0].units,[front,rear]=b.sides[1].units;
 Object.assign(charger,{x:4,y:3,cooldown:0});Object.assign(front,{x:5,y:3,cooldown:999});Object.assign(rear,{x:7,y:3,cooldown:999});
 for(const u of [charger,front,rear]){u.intent=0;u.statuses={};u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 front.statuses.confuse={until:20};front.statuses.phalanx={until:99};rear.statuses.phalanx={until:99};primeTactic(charger,'rush');stepBattle(b);
 assert.equal(charger.tacticCasts.rush,1);assert.ok(hasStatus(b,charger,'pursuit'));return {b,charger,front,rear};
}
test('a real charge follows a withdrawing rear through the current disengagement cycle',()=>{
 const {b,charger,front,rear}=breach(),frontHp=front.hp,start={x:rear.x,y:rear.y};delete rear.statuses.phalanx;b.sides[rear.side].retreat=true;
 for(let i=0;i<8&&rear.x===start.x&&rear.y===start.y;i++)stepBattle(b);
 assert.ok(rear.x!==start.x||rear.y!==start.y);assert.equal(front.hp,frontHp);assert.ok(charger.x>front.x);assert.ok(hexDistance(charger,rear)<=2);
});
test('pursuit switches to another reachable rear after a kill but stops for fresh ZOC or expiry',()=>{
  const {b,charger,front,rear}=breach();const second={...structuredClone(rear),id:'second-rear',x:8,y:3};b.sides[1].units.push(second);
  rear.hp=0;rear.status='defeated';assert.equal(pursuitTarget(b,charger,[front,second]),second);
  delete front.statuses.confuse;Object.assign(front,{x:charger.x-1,y:charger.y});assert.equal(pursuitTarget(b,charger,[front,second]),null);
  front.statuses.confuse={until:99};charger.statuses.pursuit.until=b.tick;assert.equal(pursuitTarget(b,charger,[front,second]),null);
});

test('a real taunt redirects pursuit only on a successful roll and uses a legal route',()=>{
  let successes=0,failures=0;
  for(const seed of [43,44,45,46,47,48]){
    const {b,charger,front,rear}=breach(seed);
    delete front.statuses.confuse;Object.assign(front,{x:3,y:3});primeTactic(front,'ward');
    stepBattle(b);const check=b.effects.find(e=>e.from===front.id&&e.resolution?.effect==='taunt').resolution;
    assert.equal(hasStatus(b,charger,'taunt'),check.success);assert.ok(hasStatus(b,charger,'pursuit'));
    if(!check.success){failures++;assert.equal(tauntTarget(b,charger,1),null);continue;}
    successes++;const rearHp=rear.hp;charger.cooldown=0;stepBattle(b);
    assert.equal(rear.hp,rearHp);assert.equal(tauntTarget(b,charger,1),front);
    assert.ok(charger.action.includes(front.name));
  }
  assert.ok(successes>0&&failures>0);
});

test('a natural pursuit snapshot validates and resumes deterministically',()=>{
  const state=createScenario('breach',1),b=state.battle;lockDeployment(b);let snapshot=null;
  while(!b.result){stepBattle(b);if(snapshot)stepBattle(snapshot.battle);
    if(!snapshot&&b.sides.flatMap(s=>s.units).some(u=>hasStatus(b,u,'pursuit'))){
      snapshot=validateSave(structuredClone(syncFixtureLearning(state)));
      const broken=structuredClone(state),target=broken.battle.sides.flatMap(s=>s.units).find(u=>hasStatus(b,u,'pursuit'));
      target.statuses.pursuit.targetId=target.id;assert.throws(()=>validateSave(broken),/阵营/);
    }
  }
  assert.ok(snapshot);assert.deepEqual(snapshot.battle,b);
});
test('current saves validate taunt and pursuit references and resume the real battle deterministically',()=>{
  const {state,b}=scene();let snapshot=null;
  while(!b.result){stepBattle(b);if(snapshot)stepBattle(snapshot.battle);
    if(!snapshot&&b.sides.flatMap(s=>s.units).some(u=>hasStatus(b,u,'taunt'))){
      snapshot=validateSave(structuredClone(syncFixtureLearning(state)));
      const broken=structuredClone(state),target=broken.battle.sides.flatMap(s=>s.units).find(u=>hasStatus(b,u,'taunt'));
      target.statuses.taunt.sourceId=target.id;assert.throws(()=>validateSave(broken),/阵营/);
    }
  }
  assert.ok(snapshot);assert.deepEqual(snapshot.battle,b);
  const old=createScenario('field');old.rulesVersion=12;assert.throws(()=>validateSave(old),/重新开始/);
});
