import {tacticHolder} from './helpers/current-battle.mjs';
import {learnedTacticIds} from '../tactic-learning.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave,issueCommand,COMMAND_RESOURCE} from '../engine.mjs';
import {unitTactics,routeTo,hasStatus,NEGATIVE_STATUSES} from '../tactics.mjs';
import {holdsLine,interceptorsAt,zocCells} from '../engagement.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {syncFixtureLearning} from './helpers/learn-tactics.mjs';

function scene(skill='harass'){
 const type=skill==='mirage'?'crossbow':'cavalry',supportId=tacticHolder(skill,type),chargerId=tacticHolder('gallop','cavalry',[supportId]);
 const entry=(id,type)=>({id,type,troops:3000,level:1,retreatAt:null});
 const enemyId=tacticHolder('rally','archer',[supportId,chargerId]);
 const state=createScenario('custom-battle',1,20,null,{seed:1,terrain:'land',ownTeam:[entry(supportId,type),entry(chargerId,'cavalry')],enemyTeam:[entry('cao','spear'),entry(enemyId,'archer')],enemyTeamRoles:{leader:'cao',advisor:enemyId}});
 const b=state.battle;lockDeployment(b);const [support,charger]=b.sides[0].units,[front,rear]=b.sides[1].units;
 Object.assign(support,{x:3,y:3});Object.assign(charger,{x:4,y:3});Object.assign(front,{x:5,y:3});Object.assign(rear,{x:7,y:3});
 for(const u of [support,charger,front,rear]){u.cooldown=999;u.intent=0;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));u.statuses={phalanx:{until:999}};}
 return {state,b,support,charger,front,rear};
}

test('real gallop bypasses live ZOC without removing enemy coverage and expires',()=>{
  const {b,charger,front,rear}=scene();primeTactic(charger,'gallop');
  assert.equal(routeTo(b,charger,rear,3),null);stepBattle(b);
  assert.equal(charger.tacticCasts.gallop,1);assert.ok(hasStatus(b,charger,'phase'));
  assert.ok(holdsLine(b,front));assert.ok(zocCells(b).some(c=>c.counts[1]));
  assert.ok(routeTo(b,charger,rear,3)?.length);assert.equal(interceptorsAt(b,charger).length,0);
  b.tick=charger.statuses.phase.until;assert.ok(interceptorsAt(b,charger).length);
  assert.equal(routeTo(b,charger,rear,3),null);
});

test('real harass disables only its target ZOC, respects resolve, and permits deterministic saves',()=>{
  for(const protectedFront of [false,true]){
    const {state,b,support,charger,front}=scene();support.type='cavalry';primeTactic(support,'harass');
    if(protectedFront)front.statuses.resolve={until:999};
    stepBattle(b);assert.equal(support.tacticCasts.harass,1);
    assert.equal(hasStatus(b,front,'disrupted'),!protectedFront);
    assert.equal(holdsLine(b,front),protectedFront);
    syncFixtureLearning(state);
    const resumed=validateSave(structuredClone(state));
    for(let i=0;i<8;i++){stepBattle(b);stepBattle(resumed.battle);}
    assert.deepEqual(resumed.battle,b);
    assert.ok(holdsLine(b,front));assert.ok(interceptorsAt(b,charger).length);
  }
  assert.ok(NEGATIVE_STATUSES.includes('disrupted'));
});

test('overlapping interception remains after harass disables one owner',()=>{
  const {b,support,charger,front}=scene();support.type='cavalry';primeTactic(support,'harass');
  const second={...structuredClone(front),id:'second-front',x:5,y:4};b.sides[1].units.push(second);
  stepBattle(b);assert.equal(interceptorsAt(b,charger).length,1);
});

test('basic fire prefers a ranged enemy within range over a closer front',()=>{
  const {b,support,front,rear}=scene();Object.assign(support,{type:'archer',cooldown:0});
  stepBattle(b);
  assert.ok(b.effects.some(e=>e.from===support.id&&e.to===rear.id&&!e.skill&&e.damage>0));
  assert.ok(!b.effects.some(e=>e.from===support.id&&e.to===front.id&&!e.skill&&e.damage>0));
});

test('out-of-range rear does not displace an attackable front',()=>{
  const {b,support,front,rear}=scene();Object.assign(support,{type:'archer',cooldown:0});rear.x=10;
  stepBattle(b);assert.ok(b.effects.some(e=>e.from===support.id&&e.to===front.id&&!e.skill&&e.damage>0));
});

test('real Wei Wu command restores interception without waiting for disruption expiry',()=>{
 const {b,support,front,rear}=scene();primeTactic(support,'harass');stepBattle(b);assert.ok(hasStatus(b,front,'disrupted'));assert.ok(!holdsLine(b,front));
 b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'cao-wuchao',null,1),null);assert.equal(hasStatus(b,front,'disrupted'),false);assert.ok(holdsLine(b,front));
});

test('focus command overrides ranged priority and ordinary melee remains pinned',()=>{
  {
    const {b,support,front}=scene();Object.assign(support,{type:'archer',cooldown:0});
    Object.assign(b.sides[0],{focus:front.id,focusUntil:99});stepBattle(b);
    assert.ok(b.effects.some(e=>e.from===support.id&&e.to===front.id&&!e.skill&&e.damage>0));
  }
  {
    const {b,charger,front,rear}=scene();Object.assign(rear,{x:4,y:4});charger.cooldown=0;
    stepBattle(b);
    assert.ok(b.effects.some(e=>e.from===charger.id&&e.to===front.id&&!e.skill&&e.damage>0));
  }
});

test('nearby wounded front takes priority over a healthy ranged target',()=>{
 const {b,support,front}=scene();Object.assign(support,{type:'archer',cooldown:0});front.hp=Math.floor(front.maxHp*.1);
 stepBattle(b);assert.ok(b.effects.some(e=>e.from===support.id&&e.to===front.id&&!e.skill&&e.damage>0));
});

test('疑兵战法为残血部队额外避战两回合并保持确定性续战',()=>{
 const {state,b,support,charger,front}=scene('mirage');primeTactic(support,'mirage');charger.hp=Math.floor(charger.maxHp*.1);charger.battleDamage=charger.maxHp-charger.hp;
 stepBattle(b);assert.equal(support.tacticCasts.mirage,1);assert.ok(hasStatus(b,charger,'stasis'));assert.ok(!holdsLine(b,charger));
 charger.statuses.burn={until:20,amount:100,baseAmount:100,stacks:1,sourceId:front.id};const hp=charger.hp;
 for(const u of b.sides.flatMap(s=>s.units)){u.tactics=learnedTacticIds(u);u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,u.skillReady[id]??999]));}
 syncFixtureLearning(state);const resumed=validateSave(structuredClone(state));stepBattle(b);stepBattle(resumed.battle);assert.equal(charger.hp,hp);assert.deepEqual(resumed.battle,b);
 stepBattle(b);stepBattle(b);assert.ok(!hasStatus(b,charger,'stasis'));assert.ok(hasStatus(b,charger,'stasisLock'));assert.ok(charger.hp<hp);
});

test('疑兵战法不能绕过共用避战间隔',()=>{
 const {b,support,charger}=scene('mirage');primeTactic(support,'mirage');charger.hp=Math.floor(charger.maxHp*.1);charger.statuses.stasisLock={until:50};
 stepBattle(b);assert.equal(support.tacticCasts.mirage,1);assert.ok(hasStatus(b,charger,'decoy'));assert.ok(!hasStatus(b,charger,'stasis'));
});

test('enemy side uses the same finisher priority and excludes protected targets',()=>{
 for(const protectedTarget of [false,true]){
  const {b,support,charger,front,rear}=scene();Object.assign(rear,{type:'archer',x:6,y:3,cooldown:0});Object.assign(support,{type:'archer'});charger.hp=Math.floor(charger.maxHp*.1);
  if(protectedTarget)charger.statuses.stasis={until:10};
  stepBattle(b);assert.ok(b.effects.some(e=>e.from===rear.id&&e.to===(protectedTarget?support.id:charger.id)&&e.damage>0));
 }
});

